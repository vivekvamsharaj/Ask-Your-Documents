"""
A small dependency-free recursive text splitter.

Tries to break on paragraph breaks first, then sentences, then words,
so chunks stay semantically coherent instead of cutting mid-sentence.
Adjacent chunks share a bit of overlap so context isn't lost at the seam.
"""
import re

_SEPARATORS = ["\n\n", "\n", ". ", " "]


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 150) -> list[str]:
    text = re.sub(r"[ \t]+", " ", text).strip()
    if not text:
        return []

    raw_chunks = _split(text, chunk_size, _SEPARATORS)
    raw_chunks = [c.strip() for c in raw_chunks if c.strip()]

    if overlap <= 0 or len(raw_chunks) <= 1:
        return raw_chunks

    overlapped = [raw_chunks[0]]
    for i in range(1, len(raw_chunks)):
        tail = raw_chunks[i - 1][-overlap:]
        overlapped.append((tail + " " + raw_chunks[i]).strip())
    return overlapped


def _split(text: str, chunk_size: int, separators: list[str]) -> list[str]:
    if len(text) <= chunk_size:
        return [text]

    if not separators:
        # Last resort: hard cut by character count.
        return [text[i:i + chunk_size] for i in range(0, len(text), chunk_size)]

    sep, rest = separators[0], separators[1:]
    parts = text.split(sep)
    chunks: list[str] = []
    current = ""

    for part in parts:
        candidate = (current + sep + part) if current else part
        if len(candidate) <= chunk_size:
            current = candidate
        else:
            if current:
                chunks.append(current)
            if len(part) > chunk_size:
                chunks.extend(_split(part, chunk_size, rest))
                current = ""
            else:
                current = part

    if current:
        chunks.append(current)
    return chunks
