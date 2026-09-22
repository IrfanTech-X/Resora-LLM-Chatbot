import json
import os

from dotenv import load_dotenv
from flask import (
    Flask,
    Response,
    jsonify,
    render_template,
    request,
    stream_with_context,
)
from groq import Groq

import rag


# =========================================================
# Environment Configuration
# =========================================================

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError(
        "GROQ_API_KEY was not found in the .env file."
    )


# =========================================================
# Flask Application
# =========================================================

app = Flask(__name__)


# =========================================================
# Groq Client
# =========================================================

client = Groq(api_key=api_key)


# =========================================================
# RAG Startup Check (new feature)
# =========================================================
# Embeddings now come from Google's free Gemini Embedding API
# rather than a local model, so there's no heavy model to preload
# -- this is just a friendly startup warning if the key is missing,
# so it's obvious why document upload doesn't work instead of it
# failing silently later. Chat itself is unaffected either way.

if not os.getenv("GEMINI_API_KEY"):

    print(
        "Warning: GEMINI_API_KEY is not set. Document upload / RAG "
        "will not work until you add a free key from "
        "https://aistudio.google.com/apikey to your .env file. "
        "Chat still works normally without it."
    )


# =========================================================
# Model
# =========================================================

MODEL_NAME = "openai/gpt-oss-120b"



# =========================================================
# Model Selection (new feature)
# =========================================================
#
# Resora still always defaults to MODEL_NAME above -- this only
# adds the *option* to pick a different Groq model from the UI.
# If the /models list can't be fetched, or the chosen model turns
# out to be invalid, we fall back to MODEL_NAME automatically.

# Model IDs that exist on Groq but aren't chat/completions models
# (speech-to-text, text-to-speech, etc.). These are filtered out of
# the model picker since they can't be used with this chat feature.
NON_CHAT_MODEL_HINTS = (
    "whisper",
    "tts",
    "distil-whisper",
)

FALLBACK_MODELS = [
    {"id": MODEL_NAME, "owned_by": "groq"},
    {"id": "llama-3.3-70b-versatile", "owned_by": "meta"},
    {"id": "llama-3.1-8b-instant", "owned_by": "meta"},
]


def is_chat_model(model_id):
    lowered = model_id.lower()
    return not any(hint in lowered for hint in NON_CHAT_MODEL_HINTS)


# =========================================================
# Conversation Limits
# =========================================================

MAX_HISTORY_MESSAGES = 20

MAX_MESSAGE_LENGTH = 4000


# =========================================================
# Resora System Prompt
# =========================================================

SYSTEM_PROMPT = """
You are Resora, an AI research assistant designed to help
undergraduate students explore research topics and questions.

Your role is to help users understand research concepts,
develop research ideas, explore methodologies, and improve
their understanding of Natural Language Processing,
Machine Learning, Artificial Intelligence, and related fields.

For each user query:

1. Explain the topic clearly and accurately.
2. Identify important concepts related to the topic.
3. Suggest possible research directions when relevant.
4. Suggest suitable methodologies, datasets, models, or
   evaluation approaches when appropriate.
5. Mention important challenges or limitations.
6. Provide useful research keywords when relevant.

Use clear and understandable language suitable for university
students.

Structure responses using headings, paragraphs, bullet points,
or numbered lists when they improve readability.

Maintain continuity with the previous conversation when
answering follow-up questions. Resolve references such as
"it", "this", "that method", or "the dataset above" using
the conversation context when possible.

Do not fabricate:
- Research papers
- Authors
- Citations
- Datasets
- Statistics
- Experimental results
- Research findings

If the user asks for academic references, clearly explain that
generated information should be verified using reliable
academic sources.

Do not pretend that generated information is a verified
literature review.

Do not claim that you have searched academic databases unless
an actual search or retrieval tool has been used.

Your goal is to act as an intelligent research companion,
not as a replacement for original research papers.
"""


# =========================================================
# Home Route
# =========================================================

@app.route("/")
def home():
    """
    Render the Resora interface.
    """

    return render_template("index.html")


# =========================================================
# Health Check
# =========================================================

@app.route("/health")
def health():
    """
    Health endpoint for Render monitoring.
    """

    return jsonify({
        "status": "online",
        "service": "Resora"
    }), 200


# =========================================================
# Models Route (new feature)
# =========================================================

@app.route("/models")
def list_models():
    """
    Return the list of Groq models available for chat, so the
    frontend can populate a model picker. Falls back to a small
    static list if the Groq API call fails for any reason.
    """

    try:

        response = client.models.list()

        models = [
            {
                "id": model.id,
                "owned_by": getattr(model, "owned_by", ""),
            }
            for model in response.data
            if is_chat_model(model.id)
        ]

        models.sort(key=lambda model: model["id"])

        if not models:
            models = FALLBACK_MODELS

    except Exception as error:

        print(f"Error fetching Groq models: {error}")

        models = FALLBACK_MODELS

    return jsonify({
        "models": models,
        "default": MODEL_NAME,
    }), 200


# =========================================================
# Document Upload Route (new feature - RAG)
# =========================================================

@app.route("/upload", methods=["POST"])
def upload_document():
    """
    Accept a document (PDF, DOCX, TXT, or MD), extract its text,
    chunk it, embed the chunks locally, and store them in an
    in-memory vector store scoped to the browser's session_id.
    """

    try:

        session_id = request.form.get("session_id", "").strip()

        if not session_id:
            return jsonify({
                "error": "Missing session id."
            }), 400

        if "file" not in request.files:
            return jsonify({
                "error": "No file was provided."
            }), 400

        file_storage = request.files["file"]

        try:
            summary = rag.process_upload(
                file_storage,
                session_id
            )

        except ValueError as validation_error:
            return jsonify({
                "error": str(validation_error)
            }), 400

        return jsonify({
            "success": True,
            "filename": summary["filename"],
            "chunks": summary["chunk_count"],
        }), 200

    except Exception as error:

        print(f"Document upload error: {error}")

        return jsonify({
            "error":
                "Something went wrong while processing "
                "the document."
        }), 500


# =========================================================
# Clear Document Route (new feature - RAG)
# =========================================================

@app.route("/documents/clear", methods=["POST"])
def clear_document():
    """
    Remove the uploaded document (and its vector store) for a
    given session, so future chat messages stop using it as
    context.
    """

    try:

        data = request.get_json() or {}

        session_id = data.get("session_id", "").strip()

        if not session_id:
            return jsonify({
                "error": "Missing session id."
            }), 400

        rag.clear_store(session_id)

        return jsonify({"success": True}), 200

    except Exception as error:

        print(f"Clear document error: {error}")

        return jsonify({
            "error": "Something went wrong while clearing the document."
        }), 500


# =========================================================
# Chat Route
# =========================================================

@app.route("/chat", methods=["POST"])
def chat():
    """
    Receive conversation history and stream the new
    Resora response back to the browser.
    """

    try:

        # -------------------------------------------------
        # Read JSON request
        # -------------------------------------------------

        data = request.get_json()

        if not data:

            return jsonify({
                "error": "No request data was provided."
            }), 400


        # -------------------------------------------------
        # Get current message
        # -------------------------------------------------

        user_message = data.get(
            "message",
            ""
        ).strip()


        if not user_message:

            return jsonify({
                "error": "Please enter a research question."
            }), 400


        if len(user_message) > MAX_MESSAGE_LENGTH:

            return jsonify({
                "error":
                    "Your message is too long. "
                    "Please keep it under 4000 characters."
            }), 400


        # -------------------------------------------------
        # Get conversation history
        # -------------------------------------------------

        history = data.get(
            "history",
            []
        )


        # Ensure history is actually a list
        if not isinstance(history, list):

            history = []


        # -------------------------------------------------
        # Get selected model (new feature)
        # -------------------------------------------------
        # Defaults to MODEL_NAME whenever the field is missing,
        # blank, or not a string -- existing behavior is
        # unchanged unless the user actively picks another model.

        requested_model = data.get("model")

        if isinstance(requested_model, str) and requested_model.strip():
            selected_model = requested_model.strip()
        else:
            selected_model = MODEL_NAME


        # -------------------------------------------------
        # Get session id (new feature - RAG)
        # -------------------------------------------------

        session_id = data.get("session_id")

        if not isinstance(session_id, str):
            session_id = None


        # -------------------------------------------------
        # Build safe conversation history
        # -------------------------------------------------

        conversation = []


        for message in history:

            # Ignore malformed entries
            if not isinstance(message, dict):
                continue


            role = message.get("role")
            content = message.get("content")


            # Only accept user/assistant messages
            if role not in {
                "user",
                "assistant"
            }:
                continue


            # Only accept string content
            if not isinstance(
                content,
                str
            ):
                continue


            content = content.strip()


            if not content:
                continue


            # Protect against extremely large messages
            content = content[
                :MAX_MESSAGE_LENGTH
            ]


            conversation.append({

                "role": role,

                "content": content

            })


        # -------------------------------------------------
        # Keep only recent messages
        # -------------------------------------------------

        conversation = conversation[
            -MAX_HISTORY_MESSAGES:
        ]


        # -------------------------------------------------
        # Build complete messages list
        # -------------------------------------------------

        messages = [

            {
                "role": "system",
                "content": SYSTEM_PROMPT
            }

        ]


        messages.extend(
            conversation
        )


        # -------------------------------------------------
        # RAG: retrieve relevant document context (new feature)
        # -------------------------------------------------
        # If the user has uploaded a document for this session,
        # find the chunks most relevant to their question and
        # inject them as an extra system message. If there's no
        # document, or nothing relevant is found, this is skipped
        # entirely and behavior is identical to before.

        if session_id:

            try:

                context_block = rag.build_context_block(
                    session_id,
                    user_message
                )

                if context_block:

                    messages.append({
                        "role": "system",
                        "content": context_block
                    })

            except Exception as rag_error:

                print(f"RAG retrieval error: {rag_error}")


        messages.append({

            "role": "user",

            "content": user_message

        })


        # -------------------------------------------------
        # Streaming generator
        # -------------------------------------------------

        @stream_with_context
        def generate():

            try:

                # -----------------------------------------
                # Request streaming completion
                # -----------------------------------------

                stream = (
                    client
                    .chat
                    .completions
                    .create(

                        model=selected_model,

                        messages=messages,

                        temperature=0.3,

                        max_completion_tokens=2048,

                        stream=True

                    )
                )


                # -----------------------------------------
                # Forward generated chunks
                # -----------------------------------------

                for chunk in stream:

                    if not chunk.choices:
                        continue


                    delta = (
                        chunk
                        .choices[0]
                        .delta
                    )


                    content = (
                        delta.content
                    )


                    if content:

                        yield (
                            "data: "
                            +
                            json.dumps({
                                "content":
                                    content
                            })
                            +
                            "\n\n"
                        )


                # -----------------------------------------
                # Tell frontend stream is complete
                # -----------------------------------------

                yield (
                    "data: "
                    +
                    json.dumps({
                        "done": True
                    })
                    +
                    "\n\n"
                )


            except Exception as error:

                print(
                    f"Groq streaming error: {error}"
                )


                yield (
                    "data: "
                    +
                    json.dumps({
                        "error":
                            "Something went wrong "
                            "while generating the response."
                    })
                    +
                    "\n\n"
                )


        # -------------------------------------------------
        # Return SSE stream
        # -------------------------------------------------

        return Response(

            generate(),

            mimetype="text/event-stream",

            headers={
                "Cache-Control": "no-cache",
                "X-Accel-Buffering": "no",
                "Connection": "keep-alive",
            }

        )


    except Exception as error:

        print(
            f"Resora request error: {error}"
        )


        return jsonify({

            "error":
                "Something went wrong while "
                "processing your request."

        }), 500


# =========================================================
# Application Entry Point
# =========================================================

if __name__ == "__main__":

    app.run(
        debug=True
    )