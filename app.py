import os
import json

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
# Model Configuration
# =========================================================

MODEL_NAME = "openai/gpt-oss-120b"


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

Do not fabricate:
- Research papers
- Authors
- Citations
- Datasets
- Statistics
- Experimental results
- Research findings

If the user asks for academic references, clearly explain that
generated information should be verified using reliable academic
sources.

Do not pretend that generated information is a verified
literature review.

Do not claim that you have searched academic databases unless
an actual search/retrieval tool has been used.

Your goal is to act as an intelligent research companion,
not as a replacement for original research papers.
"""


# =========================================================
# Home Route
# =========================================================

@app.route("/")
def home():
    """
    Render the Resora chatbot interface.
    """

    return render_template("index.html")


# =========================================================
# Health Check
# =========================================================

@app.route("/health")
def health():
    """
    Health endpoint for deployment monitoring.
    """

    return jsonify({
        "status": "online",
        "service": "Resora"
    }), 200


# =========================================================
# Streaming Chat Route
# =========================================================

@app.route("/chat", methods=["POST"])
def chat():
    """
    Stream the LLM response from Groq to the browser
    using Server-Sent Events.
    """

    try:

        # -------------------------------------------------
        # Read request
        # -------------------------------------------------

        data = request.get_json()

        if not data:

            return jsonify({
                "error": "No request data was provided."
            }), 400


        # -------------------------------------------------
        # Extract user message
        # -------------------------------------------------

        user_message = data.get(
            "message",
            ""
        ).strip()


        # -------------------------------------------------
        # Validate message
        # -------------------------------------------------

        if not user_message:

            return jsonify({
                "error": "Please enter a research question."
            }), 400


        # -------------------------------------------------
        # Generate streaming response
        # -------------------------------------------------

        @stream_with_context
        def generate():

            try:

                # Request streaming completion from Groq
                stream = client.chat.completions.create(

                    model=MODEL_NAME,

                    messages=[
                        {
                            "role": "system",
                            "content": SYSTEM_PROMPT
                        },
                        {
                            "role": "user",
                            "content": user_message
                        }
                    ],

                    temperature=0.3,

                    max_completion_tokens=2048,

                    stream=True
                )


                # -----------------------------------------
                # Forward each generated chunk
                # -----------------------------------------

                for chunk in stream:

                    if not chunk.choices:
                        continue


                    delta = chunk.choices[0].delta


                    content = delta.content


                    if content:

                        # Send JSON-formatted SSE event
                        yield (
                            f"data: "
                            f"{json.dumps({'content': content})}"
                            f"\n\n"
                        )


                # -----------------------------------------
                # Tell frontend streaming is complete
                # -----------------------------------------

                yield (
                    f"data: "
                    f"{json.dumps({'done': True})}"
                    f"\n\n"
                )


            except Exception as error:

                print(
                    f"Groq streaming error: {error}"
                )


                # Send error event to browser
                yield (
                    f"data: "
                    f"{json.dumps({
                        'error':
                        'Something went wrong while '
                        'generating the response.'
                    })}"
                    f"\n\n"
                )


        # -------------------------------------------------
        # Return SSE response
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