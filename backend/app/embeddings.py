"""
Thin async client around Ollama's /api/embeddings endpoint.
Everything here stays on localhost — no external API calls, no API keys.
"""
import httpx

from app.config import OLLAMA_BASE_URL, EMBEDDING_MODEL


async def embed_text(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=60.0) as client:
        try:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/embeddings",
                json={"model": EMBEDDING_MODEL, "prompt": text},
            )
            resp.raise_for_status()
        except httpx.ConnectError as e:
            raise RuntimeError(
                f"Could not reach Ollama at {OLLAMA_BASE_URL}. "
                "Is `ollama serve` running?"
            ) from e
        except httpx.HTTPStatusError as e:
            raise RuntimeError(
                f"Ollama embedding call failed ({e.response.status_code}). "
                f"Have you run `ollama pull {EMBEDDING_MODEL}`?"
            ) from e
        return resp.json()["embedding"]
