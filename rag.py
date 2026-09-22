"""
Resora RAG Engine
=================

This module adds Retrieval-Augmented Generation (RAG) support to
Resora, completely separate from the existing chat logic in app.py.

Pipeline:

    1. extract_text()   -> pull raw text out of an uploaded file
    2. chunk_text()      -> split the text into overlapping chunks
    3. embed_texts()     -> turn chunks (and later, queries) into
                            vector embeddings via Google's free
                            Gemini Embedding API (gemini-embedding-001)
    4. VectorStore       -> an in-memory "vector database" that
                            stores chunk embeddings per session and
                            performs cosine-similarity search

Chat completions still go through Groq exactly as before -- this
module only calls Google's Gemini API, and only for embeddings.
That's a deliberate choice: Groq does not currently offer an
embeddings endpoint, and running a local embedding model (e.g. via
sentence-transformers/torch) is heavy enough that it doesn't fit
comfortably on free hosting tiers like Render's free plan. Calling
a hosted embeddings API instead keeps this server lightweight --
just HTTP requests, no multi-hundred-MB ML runtime in memory.

REQUIRED ENV VAR:
    GEMINI_API_KEY -- a free key from https://aistudio.google.com/apikey
    This is separate from GROQ_API_KEY and is only used here, for
    embeddings. Google's free tier is enough for personal/small-
    scale use; see https://ai.google.dev/gemini-api/docs/rate-limits
    if you outgrow it.

NOTE ON SCALE:
This uses a simple in-memory NumPy store, which is perfect for a
single-user / small-deployment app like Resora (one or a few
documents at a time, per browser session). If you outgrow this,
swap VectorStore's internals for FAISS, Chroma, Qdrant, etc. --
the rest of the app only talks to VectorStore's public methods,
so nothing else would need to change.
"""

import os
import re
import threading

import numpy as np
import requests


# =========================================================
# Configuration
# =========================================================

GEMINI_EMBEDDING_MODEL = os.getenv(
    "GEMINI_EMBEDDING_MODEL",
    "gemini-embedding-001"
)

# Matryoshka-truncated dimension. 768 keeps vectors small and fast
# while still being one of Google's recommended sizes.
GEMINI_EMBEDDING_DIMENSIONS = int(
    os.getenv("GEMINI_EMBEDDING_DIMENSIONS", "768")
)

GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models"

# Gemini's batchEmbedContents endpoint caps how many texts can go in
# one request; keep a safety margin under the documented limit.
EMBEDDING_BATCH_SIZE = 90

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "md"}

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15 MB

CHUNK_SIZE = 900      # characters per chunk
CHUNK_OVERLAP = 150   # characters shared between consecutive chunks

TOP_K = 4             # number of chunks retrieved per question
MIN_SIMILARITY = 0.20 # ignore retrieved chunks below this cosine score


# =========================================================
# Gemini Embedding API
# =========================================================

class EmbeddingError(RuntimeError):
    """Raised when the Gemini Embedding API can't be reached or fails."""


def _get_api_key():
    """
    Read GEMINI_API_KEY lazily (at call time, not import time) so it
    works regardless of when app.py's load_dotenv() runs relative to
    this module being imported.
    """

    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise EmbeddingError(
            "GEMINI_API_KEY is not set. The document upload / RAG "
            "feature needs a free Google AI Studio API key "
            "(https://aistudio.google.com/apikey) in your .env file. "
            "This is separate from GROQ_API_KEY -- Groq chat still "
            "works fine without it; only document upload needs it."
        )

    return api_key


def _embed_batch(texts, task_type):
    """
    Call Gemini's batchEmbedContents for a single batch of texts
    (<= EMBEDDING_BATCH_SIZE) and return a list of raw embedding
    vectors (python lists of floats), in the same order as `texts`.
    """

    api_key = _get_api_key()

    url = f"{GEMINI_API_BASE}/{GEMINI_EMBEDDING_MODEL}:batchEmbedContents"

    payload = {
        "requests": [
            {
                "model": f"models/{GEMINI_EMBEDDING_MODEL}",
                "content": {"parts": [{"text": text}]},
                "taskType": task_type,
                "outputDimensionality": GEMINI_EMBEDDING_DIMENSIONS,
            }
            for text in texts
        ]
    }

    try:
        response = requests.post(
            url,
            params={"key": api_key},
            json=payload,
            timeout=30,
        )

    except requests.RequestException as request_error:
        raise EmbeddingError(
            f"Could not reach the Gemini Embedding API: {request_error}"
        )

    if response.status_code != 200:
        raise EmbeddingError(
            "Gemini embedding request failed "
            f"({response.status_code}): {response.text[:300]}"
        )

    data = response.json()

    embeddings = [
        item["values"]
        for item in data.get("embeddings", [])
    ]

    if len(embeddings) != len(texts):
        raise EmbeddingError(
            "Gemini returned an unexpected number of embeddings."
        )

    return embeddings


def embed_texts(texts, task_type="RETRIEVAL_DOCUMENT"):
    """
    Embed a list of strings via Google's Gemini Embedding API and
    return a normalized (unit-length) NumPy matrix, so a plain dot
    product between two rows equals their cosine similarity.

    task_type should be "RETRIEVAL_DOCUMENT" when embedding chunks
    to store, and "RETRIEVAL_QUERY" when embedding a user's question
    -- Gemini embeddings are asymmetric and tuned per task type,
    which noticeably improves retrieval quality over using the same
    type for both sides.
    """

    if not texts:
        return np.zeros((0, GEMINI_EMBEDDING_DIMENSIONS), dtype=np.float32)

    all_vectors = []

    for start in range(0, len(texts), EMBEDDING_BATCH_SIZE):
        batch = texts[start:start + EMBEDDING_BATCH_SIZE]
        all_vectors.extend(_embed_batch(batch, task_type))

    matrix = np.array(all_vectors, dtype=np.float32)

    norms = np.linalg.norm(matrix, axis=1, keepdims=True)

    # Guard against a stray all-zero vector causing a divide-by-zero.
    norms[norms == 0] = 1.0

    return matrix / norms


# =========================================================
# Text extraction
# =========================================================

def extract_text(file_stream, filename):
    """
    Pull plain text out of an uploaded file. Supports PDF, DOCX,
    TXT, and Markdown. Raises ValueError for anything else or if
    extraction fails.
    """

    ext = (
        filename.rsplit(".", 1)[-1].lower()
        if "." in filename
        else ""
    )

    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Unsupported file type: .{ext}. "
            "Allowed types are PDF, DOCX, TXT, and MD."
        )

    file_stream.seek(0)

    if ext == "pdf":
        text = _extract_pdf(file_stream)

    elif ext == "docx":
        text = _extract_docx(file_stream)

    else:  # txt / md
        raw = file_stream.read()
        text = raw.decode("utf-8", errors="ignore")

    text = text.strip()

    if not text:
        raise ValueError(
            "No readable text could be extracted from this file. "
            "It may be a scanned/image-only document."
        )

    return text


def _extract_pdf(file_stream):
    from pypdf import PdfReader

    reader = PdfReader(file_stream)

    pages = []

    for page in reader.pages:
        page_text = page.extract_text() or ""
        pages.append(page_text)

    return "\n".join(pages)


def _extract_docx(file_stream):
    import docx

    # python-docx needs a file-like object with .read(); a Flask
    # FileStorage stream already satisfies this, but wrap raw
    # bytes too so this also works for BytesIO input.
    document = docx.Document(file_stream)

    paragraphs = [p.text for p in document.paragraphs]

    return "\n".join(paragraphs)


# =========================================================
# Chunking
# =========================================================

def chunk_text(text, chunk_size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """
    Split text into overlapping chunks so retrieval can find
    relevant passages without losing surrounding context at chunk
    boundaries. Whitespace is normalized first, and empty chunks
    are dropped.
    """

    normalized = re.sub(r"\s+", " ", text).strip()

    if not normalized:
        return []

    chunks = []

    start = 0

    text_length = len(normalized)

    while start < text_length:

        end = min(start + chunk_size, text_length)

        chunk = normalized[start:end].strip()

        if chunk:
            chunks.append(chunk)

        if end == text_length:
            break

        start = end - overlap

    return chunks


# =========================================================
# Vector Store (per browser session)
# =========================================================

class VectorStore:
    """
    A minimal in-memory vector database for one document (or a
    growing set of chunks). Backed by a NumPy matrix of normalized
    embeddings, searched with a cosine-similarity dot product.
    """

    def __init__(self):
        self.filename = None
        self.chunks = []
        self.embeddings = None  # np.ndarray, shape (n_chunks, dim)

    def add_document(self, filename, chunks, embeddings):
        self.filename = filename
        self.chunks = chunks
        self.embeddings = embeddings

    def is_empty(self):
        return self.embeddings is None or len(self.chunks) == 0

    def search(self, query_embedding, top_k=TOP_K, min_score=MIN_SIMILARITY):
        """
        Return the top_k most similar chunks to query_embedding as
        a list of (chunk_text, score) tuples, sorted by descending
        score, filtering out weak matches below min_score.
        """

        if self.is_empty():
            return []

        scores = self.embeddings @ query_embedding

        top_indices = np.argsort(-scores)[:top_k]

        results = [
            (self.chunks[i], float(scores[i]))
            for i in top_indices
            if scores[i] >= min_score
        ]

        return results


# =========================================================
# Session registry
# =========================================================
#
# One VectorStore per browser session (identified by a client-
# generated session_id). This lives only in server memory: it
# resets on restart and is not shared across multiple worker
# processes. That's fine for Resora's scale; swap in a real
# database-backed store if you deploy with multiple workers.

_session_stores = {}
_session_lock = threading.Lock()


def get_store(session_id):
    with _session_lock:
        return _session_stores.get(session_id)


def get_or_create_store(session_id):
    with _session_lock:
        store = _session_stores.get(session_id)

        if store is None:
            store = VectorStore()
            _session_stores[session_id] = store

        return store


def clear_store(session_id):
    with _session_lock:
        _session_stores.pop(session_id, None)


# =========================================================
# High-level helpers used by app.py
# =========================================================

def process_upload(file_storage, session_id):
    """
    Full pipeline for a single uploaded file: extract -> chunk ->
    embed -> store. Returns a small summary dict on success.
    Raises ValueError with a user-friendly message on failure.
    """

    filename = file_storage.filename

    if not filename:
        raise ValueError("No file was selected.")

    # Validate size
    file_storage.stream.seek(0, os.SEEK_END)
    size = file_storage.stream.tell()
    file_storage.stream.seek(0)

    if size > MAX_UPLOAD_BYTES:
        raise ValueError(
            "That file is too large. The limit is 15 MB."
        )

    text = extract_text(file_storage.stream, filename)

    chunks = chunk_text(text)

    if not chunks:
        raise ValueError(
            "The document did not contain enough text to process."
        )

    try:
        embeddings = embed_texts(chunks, task_type="RETRIEVAL_DOCUMENT")

    except EmbeddingError as embed_error:
        raise ValueError(str(embed_error))

    store = get_or_create_store(session_id)
    store.add_document(filename, chunks, embeddings)

    return {
        "filename": filename,
        "chunk_count": len(chunks),
    }


def build_context_block(session_id, user_message):
    """
    If the session has a non-empty document store, embed the
    user's question, retrieve the most relevant chunks, and return
    a formatted context string ready to inject into the LLM
    conversation. Returns None if there's nothing to retrieve
    (no document, empty store, no chunk clears the similarity
    threshold, or the embedding call itself fails -- a broken
    embeddings key should degrade the chat gracefully, not break it).
    """

    store = get_store(session_id)

    if store is None or store.is_empty():
        return None

    try:
        query_embedding = embed_texts(
            [user_message],
            task_type="RETRIEVAL_QUERY"
        )[0]

    except EmbeddingError as embed_error:
        print(f"RAG query embedding error: {embed_error}")
        return None

    results = store.search(query_embedding)

    if not results:
        return None

    excerpts = "\n\n---\n\n".join(chunk for chunk, _score in results)

    context_block = (
        f"The user has uploaded a document named \"{store.filename}\". "
        "The following excerpts were retrieved because they are "
        "likely relevant to the user's latest question. Use them to "
        "answer when they're helpful. If they don't contain the "
        "answer, say so honestly instead of guessing, and answer "
        "from general knowledge only if appropriate.\n\n"
        f"{excerpts}"
    )

    return context_block
