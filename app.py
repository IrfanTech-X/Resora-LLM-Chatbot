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
# Model
# =========================================================

MODEL_NAME = "openai/gpt-oss-120b"


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

                        model=MODEL_NAME,

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