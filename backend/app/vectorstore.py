"""
Local, on-disk vector store using Chroma. No server or account needed —
it persists to CHROMA_PERSIST_DIR as plain files on disk.
"""
import chromadb

from app.config import CHROMA_PERSIST_DIR

_client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)


def get_collection(name: str = "documents"):
    return _client.get_or_create_collection(name=name)


def add_chunks(collection, ids, embeddings, documents, metadatas):
    # Chroma's .add has a max batch size in some environments; chunk defensively.
    batch_size = 200
    for i in range(0, len(ids), batch_size):
        collection.add(
            ids=ids[i:i + batch_size],
            embeddings=embeddings[i:i + batch_size],
            documents=documents[i:i + batch_size],
            metadatas=metadatas[i:i + batch_size],
        )


def query(collection, embedding, top_k: int = 5, where: dict | None = None):
    return collection.query(
        query_embeddings=[embedding],
        n_results=top_k,
        where=where,
    )


def delete_by_source(collection, source: str):
    collection.delete(where={"source": source})


def list_sources(collection) -> list[dict]:
    data = collection.get(include=["metadatas"])
    counts: dict[str, int] = {}
    for meta in data.get("metadatas", []) or []:
        if meta and "source" in meta:
            counts[meta["source"]] = counts.get(meta["source"], 0) + 1
    return [{"source": s, "chunks": c} for s, c in sorted(counts.items())]
