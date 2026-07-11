import os

# Ollama runs locally — no API key needed, no data leaves the machine.
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Model used to embed chunks/questions into vectors. Pull with:
#   ollama pull nomic-embed-text
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-embed-text")

# Model used to generate answers. Pull with:
#   ollama pull qwen2.5
LLM_MODEL = os.getenv("LLM_MODEL", "qwen2.5")

CHROMA_PERSIST_DIR = os.getenv("CHROMA_PERSIST_DIR", "./chroma_db")
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "./uploads")

CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", "1000"))
CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", "150"))
TOP_K = int(os.getenv("TOP_K", "5"))

# How many chunks to embed concurrently against Ollama.
EMBED_CONCURRENCY = int(os.getenv("EMBED_CONCURRENCY", "4"))
