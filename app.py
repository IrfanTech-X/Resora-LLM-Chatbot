import os

from dotenv import load_dotenv
from flask import Flask, jsonify, render_template, request
from groq import Groq


# Load environment variables from .env
load_dotenv()

# Get the Groq API key
api_key = os.getenv("GROQ_API_KEY")

if not api_key:
    raise ValueError("GROQ_API_KEY was not found in the .env file.")


# Initialize Flask
app = Flask(__name__)

# Initialize Groq client
client = Groq(api_key=api_key)


# Model used by Resora
MODEL_NAME = "openai/gpt-oss-120b"


# Research-oriented system prompt
SYSTEM_PROMPT = """
You are Resora, an AI research assistant designed to help
undergraduate students explore research topics and questions.

For each user query:

1. Explain the topic clearly and accurately.
2. Identify important concepts related to the topic.
3. Suggest possible research directions when relevant.
4. Suggest suitable methodologies, datasets, models, or
   evaluation approaches when appropriate.
5. Mention important challenges or limitations.
6. Provide useful research keywords.

Use clear and understandable language suitable for university students.

Do not fabricate research papers, authors, datasets, citations,
statistics, or experimental results.

When a claim may require verification, clearly indicate that
the user should verify it using reliable academic sources.

Do not pretend that generated information is a verified literature
review or a substitute for reading original research papers.
"""


@app.route("/")
def home():
    """Render the chatbot interface."""
    return render_template("index.html")


@app.route("/chat", methods=["POST"])
def chat():
    """Receive a user question and return an LLM-generated answer."""

    try:
        data = request.get_json()

        if not data:
            return jsonify({
                "error": "No JSON data was provided."
            }), 400

        user_message = data.get("message", "").strip()

        if not user_message:
            return jsonify({
                "error": "Please enter a research question."
            }), 400

        response = client.chat.completions.create(
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
            max_tokens=2048
        )

        assistant_message = response.choices[0].message.content

        return jsonify({
            "response": assistant_message
        })

    except Exception as error:
        print(f"Error: {error}")

        return jsonify({
            "error": "Something went wrong while generating the response."
        }), 500


if __name__ == "__main__":
    app.run(debug=True)