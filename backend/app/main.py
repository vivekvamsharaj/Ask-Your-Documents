import asyncio
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.chunker import chunk_text
from app.config import (
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    EMBED_CONCURRENCY,
    EMBEDDING_MODEL,
    LLM_MODEL,
    UPLOAD_DIR,
)
from app.embeddings import embed_text
from app.parser import parse_document
from app.rag import answer_question, stream_answer
from app.vectorstore import add_chunks, delete_by_source, get_collection, list_sources

app = FastAPI(title="Ask Your Documents API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
collection = get_collection()

ALLOWED_EXTENSIONS = {".pdf", ".txt", ".md", ".docx"}


class ChatRequest(BaseModel):
    question: str
    source: Optional[str] = None
    top_k: Optional[int] = None


@app.get("/health")
async def health():
    return {"status": "ok", "llm_model": LLM_MODEL, "embedding_model": EMBEDDING_MODEL}


@app.get("/documents")
async def get_documents():
    return {"documents": list_sources(collection)}


@app.delete("/documents/{source}")
async def remove_document(source: str):
    delete_by_source(collection, source)
    return {"status": "deleted", "source": source}


@app.post("/upload")
async def upload_document(file: UploadFile = File(...)):
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"Unsupported file type '{ext}'. Allowed: {sorted(ALLOWED_EXTENSIONS)}")

    file_path = Path(UPLOAD_DIR) / file.filename
    contents = await file.read()
    file_path.write_bytes(contents)

    try:
        pages = parse_document(str(file_path))
    except Exception as e:
        raise HTTPException(400, f"Failed to parse document: {e}")

    if not pages:
        raise HTTPException(400, "No extractable text found in this document.")

    all_chunks, metadatas, ids = [], [], []
    for page in pages:
        for chunk in chunk_text(page["text"], CHUNK_SIZE, CHUNK_OVERLAP):
            all_chunks.append(chunk)
            metadatas.append({"source": file.filename, "page": page["page"]})
            ids.append(str(uuid.uuid4()))

    if not all_chunks:
        raise HTTPException(400, "Document produced no usable text chunks.")

    sem = asyncio.Semaphore(EMBED_CONCURRENCY)

    async def embed_one(text: str):
        async with sem:
            return await embed_text(text)

    try:
        embeddings = await asyncio.gather(*(embed_one(c) for c in all_chunks))
    except RuntimeError as e:
        raise HTTPException(503, str(e))

    add_chunks(collection, ids, embeddings, all_chunks, metadatas)

    return {
        "filename": file.filename,
        "pages": len(pages),
        "chunks_indexed": len(all_chunks),
    }


@app.post("/chat")
async def chat(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty.")
    try:
        return await answer_question(collection, req.question, req.top_k, req.source)
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@app.post("/chat/stream")
async def chat_stream(req: ChatRequest):
    if not req.question.strip():
        raise HTTPException(400, "Question cannot be empty.")
    return StreamingResponse(
        stream_answer(collection, req.question, req.top_k, req.source),
        media_type="text/event-stream",
    )
