import json

import httpx

from app.config import OLLAMA_BASE_URL, LLM_MODEL, TOP_K
from app.embeddings import embed_text
from app.vectorstore import query as vs_query

SYSTEM_PROMPT = (
    "You are a careful assistant that answers questions using ONLY the "
    "provided document excerpts. If the excerpts don't contain the answer, "
    "say plainly that the documents don't have enough information — do not "
    "guess. Keep answers concise and reference which document/page a fact "
    "comes from when it's useful."
)


async def _do_retrieval(collection, question: str, top_k: int, source_filter: str | None):
    q_embedding = await embed_text(question)
    where = {"source": source_filter} if source_filter else None
    results = vs_query(collection, q_embedding, top_k=top_k, where=where)

    docs = (results.get("documents") or [[]])[0]
    metadatas = (results.get("metadatas") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]

    sources = []
    for doc, meta, dist in zip(docs, metadatas, distances):
        sources.append({
            "source": meta.get("source"),
            "page": meta.get("page"),
            "snippet": doc[:300] + ("…" if len(doc) > 300 else ""),
            "relevance": round(1 - dist, 3) if dist is not None else None,
        })

    context_blocks = [
        f"[{meta.get('source', 'unknown')} · page {meta.get('page', '?')}]\n{doc}"
        for doc, meta in zip(docs, metadatas)
    ]
    return sources, context_blocks


def _build_prompt(question: str, context_blocks: list[str]) -> str:
    context = "\n\n---\n\n".join(context_blocks)
    return (
        f"Document excerpts:\n{context}\n\n"
        f"Question: {question}\n\n"
        "Answer the question using only the excerpts above."
    )


async def answer_question(
    collection, question: str, top_k: int | None = None, source_filter: str | None = None
) -> dict:
    top_k = top_k or TOP_K
    sources, context_blocks = await _do_retrieval(collection, question, top_k, source_filter)

    if not context_blocks:
        return {
            "answer": "I couldn't find anything relevant to that in the uploaded documents.",
            "sources": [],
        }

    prompt = _build_prompt(question, context_blocks)

    async with httpx.AsyncClient(timeout=180.0) as client:
        resp = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": LLM_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
            },
        )
        resp.raise_for_status()
        answer = resp.json()["message"]["content"]

    return {"answer": answer, "sources": sources}


async def stream_answer(
    collection, question: str, top_k: int | None = None, source_filter: str | None = None
):
    """Yields Server-Sent-Events: a 'sources' event, then 'token' events, then 'done'."""
    top_k = top_k or TOP_K
    sources, context_blocks = await _do_retrieval(collection, question, top_k, source_filter)

    yield f"data: {json.dumps({'type': 'sources', 'sources': sources})}\n\n"

    if not context_blocks:
        msg = "I couldn't find anything relevant to that in the uploaded documents."
        yield f"data: {json.dumps({'type': 'token', 'content': msg})}\n\n"
        yield f"data: {json.dumps({'type': 'done'})}\n\n"
        return

    prompt = _build_prompt(question, context_blocks)

    async with httpx.AsyncClient(timeout=None) as client:
        async with client.stream(
            "POST",
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": LLM_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": prompt},
                ],
                "stream": True,
            },
        ) as resp:
            async for line in resp.aiter_lines():
                if not line:
                    continue
                try:
                    chunk = json.loads(line)
                except json.JSONDecodeError:
                    continue
                content = chunk.get("message", {}).get("content", "")
                if content:
                    yield f"data: {json.dumps({'type': 'token', 'content': content})}\n\n"
                if chunk.get("done"):
                    yield f"data: {json.dumps({'type': 'done'})}\n\n"
