"""
Run this from the same folder as app.py, inside your venv:

    python diagnose_rag.py

It walks through each step of the RAG pipeline in isolation and
tells you exactly which one fails, instead of one generic error.
"""

import sys
import traceback


def step(name, fn):
    print(f"\n--- {name} ---")
    try:
        result = fn()
        print(f"OK: {name}")
        return result
    except Exception:
        print(f"FAILED at: {name}")
        traceback.print_exc()
        sys.exit(1)


def check_imports():
    import numpy
    import pypdf
    import docx
    import sentence_transformers
    print("numpy:", numpy.__version__)
    print("pypdf:", pypdf.__version__)
    print("python-docx (docx) imported OK")
    print("sentence-transformers:", sentence_transformers.__version__)


def check_rag_engine_import():
    import rag
    return rag


def check_model_load(rag_engine):
    model = rag_engine.get_embedder()
    print("Embedding model loaded:", model)


def check_embedding(rag_engine):
    import numpy as np
    vectors = rag_engine.embed_texts(["hello world", "this is resora"])
    print("Embedding shape:", vectors.shape)
    print("dtype:", vectors.dtype)


def check_chunking(rag_engine):
    chunks = rag_engine.chunk_text("This is a test sentence. " * 50)
    print("Number of chunks:", len(chunks))


def check_full_pipeline(rag_engine):
    text = "Resora is an AI research assistant powered by Groq. " * 30
    chunks = rag_engine.chunk_text(text)
    embeddings = rag_engine.embed_texts(chunks)
    store = rag_engine.get_or_create_store("diagnostic-session")
    store.add_document("diagnostic.txt", chunks, embeddings)
    context = rag_engine.build_context_block(
        "diagnostic-session", "What is Resora?"
    )
    print("Context block generated:", bool(context))
    if context:
        print(context[:200], "...")


if __name__ == "__main__":
    step("Checking installed packages", check_imports)
    rag_engine = step("Importing rag_engine.py", check_rag_engine_import)
    step("Loading embedding model (downloads on first run)",
         lambda: check_model_load(rag_engine))
    step("Embedding sample text", lambda: check_embedding(rag_engine))
    step("Chunking sample text", lambda: check_chunking(rag_engine))
    step("Running full pipeline (chunk -> embed -> store -> retrieve)",
         lambda: check_full_pipeline(rag_engine))

    print("\nAll checks passed. The RAG pipeline works standalone.")
    print("If /upload in the browser still fails, the issue is likely")
    print("in how Flask is receiving the file (check app.py's terminal")
    print("output for 'Document upload error: ...').")