# Resora — LLM-Powered Research Chatbot

> A simple research-oriented chatbot powered by a Large Language Model (LLM) through the Groq API.

---

## 📌 Overview

**Resora** is an LLM-powered research assistant designed to help undergraduate students explore research topics, understand NLP and machine learning concepts, develop research ideas, and discuss possible research methodologies.

The system provides a simple web-based conversational interface where users can submit research questions and receive AI-generated responses.

Resora currently uses:

* **Python**
* **Flask**
* **Groq API**
* **OpenAI GPT-OSS-120B**
* **HTML**
* **CSS**
* **JavaScript**

The application also supports:

* Research-oriented prompting
* Multi-turn conversation
* Streaming LLM responses
* Markdown-formatted responses
* Responsive UI
* Environment-based API key management

---

# ✨ Features

### 🤖 LLM-Powered Responses

Resora uses the Groq API with:

```text
Model: openai/gpt-oss-120b
```

to generate research-oriented responses.

### 🔬 Research-Oriented Assistant

The system prompt instructs Resora to help with:

* Research topic exploration
* Research questions
* Research methodology
* NLP concepts
* Machine learning concepts
* Research directions
* Possible datasets
* Models and evaluation approaches
* Research challenges and limitations

### ⚡ Streaming Responses

Responses are streamed from the Groq API rather than waiting for the entire response to be generated.

The user therefore sees the response progressively, similar to modern AI assistants.

### 💬 Conversation History

Resora maintains conversation history in the browser during the current session.

This allows follow-up questions such as:

```text
User:
What is Bangla sentiment analysis?

Resora:
...

User:
What datasets can I use for it?

Resora:
...
```

### 📝 Markdown Support

LLM responses can contain:

* Headings
* Lists
* Numbered lists
* Bold text
* Code
* Blockquotes

Markdown is rendered in the chatbot interface using:

* `marked.js`
* `DOMPurify`

### 📱 Responsive Interface

The interface is designed to work on:

* Desktop
* Laptop
* Tablet
* Mobile devices

### 🔐 Secure API Key Handling

The Groq API key is stored in an environment variable rather than hardcoded in the source code.

The `.env` file is excluded from Git using `.gitignore`.

---

# 🏗️ Project Architecture

The current architecture is:

```text
                    USER
                      │
                      ▼
              ┌──────────────┐
              │  Web Browser  │
              │ HTML/CSS/JS   │
              └───────┬──────┘
                      │
                  POST /chat
                      │
                      ▼
              ┌──────────────┐
              │    Flask     │
              │   Backend    │
              └───────┬──────┘
                      │
               System Prompt
                      +
               Conversation
                      │
                      ▼
              ┌──────────────┐
              │   Groq API   │
              └───────┬──────┘
                      │
                      ▼
              ┌──────────────┐
              │ GPT-OSS-120B │
              └───────┬──────┘
                      │
                 Streaming
                      │
                      ▼
              ┌──────────────┐
              │    Flask     │
              │  SSE Stream  │
              └───────┬──────┘
                      │
                      ▼
              ┌──────────────┐
              │  Web Browser │
              │   Resora UI  │
              └──────────────┘
```

---

# 📂 Project Structure

```text
Resora-LLM-Chatbot/
│
├── app.py
├── requirements.txt
├── .env
├── .env.example
├── .gitignore
│
├── venv/
│
├── templates/
│   └── index.html
│
└── static/
    ├── style.css
    └── script.js
```

## File Description

| File / Folder          | Purpose                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `app.py`               | Flask server, Groq API integration, streaming endpoint, health endpoint            |
| `requirements.txt`     | Python dependencies                                                                |
| `.env`                 | Stores the actual Groq API key locally                                             |
| `.env.example`         | Example environment-variable file without a real secret                            |
| `.gitignore`           | Prevents secrets, virtual environment, and Python cache files from being committed |
| `venv/`                | Local Python virtual environment                                                   |
| `templates/index.html` | Main chatbot interface                                                             |
| `static/style.css`     | UI styling                                                                         |
| `static/script.js`     | Frontend logic, streaming, chat history, and UI interactions                       |

---

# 🧰 Prerequisites

Before running Resora, install the following:

### 1. Python

Python **3.11 or another version compatible with the installed dependencies** is recommended.

Check your Python installation:

```powershell
python --version
```

Example:

```text
Python 3.11.8
```

If Python is not installed, download it from:

https://www.python.org/downloads/

During installation on Windows, make sure:

```text
Add Python to PATH
```

is enabled.

---

### 2. Git

Git is recommended for version control and GitHub deployment.

Check:

```powershell
git --version
```

Download:

https://git-scm.com/downloads

---

### 3. Groq Account

Resora requires a Groq API key.

Create an account and generate an API key from:

https://console.groq.com/

The current application uses:

```text
openai/gpt-oss-120b
```

as the LLM.

---

# 🚀 Installation and Setup

Follow these steps in order.

---

## Step 1 — Clone the Repository

If you are downloading the project from GitHub:

```powershell
git clone https://github.com/YOUR_USERNAME/Resora-LLM-Chatbot.git
```

Move into the project directory:

```powershell
cd Resora-LLM-Chatbot
```

---

## Step 2 — Create a Virtual Environment

Create a Python virtual environment:

```powershell
python -m venv venv
```

This creates:

```text
venv/
```

inside the project.

The virtual environment keeps Resora's Python dependencies isolated from other Python projects.

---

# 🪟 Windows PowerShell

Activate the virtual environment:

```powershell
venv\Scripts\Activate.ps1
```

After activation, the terminal should look similar to:

```text
(venv) PS E:\Resora-LLM-Chatbot>
```

The `(venv)` indicates that the virtual environment is active.

---

# 🪟 Windows Command Prompt

If using Command Prompt instead of PowerShell:

```cmd
venv\Scripts\activate
```

---

# 🐧 Linux / macOS

Use:

```bash
source venv/bin/activate
```

---

# ⚠️ PowerShell Execution Policy Issue

If PowerShell shows an error such as:

```text
running scripts is disabled on this system
```

you can activate the environment using Command Prompt:

```cmd
venv\Scripts\activate
```

Or change the PowerShell policy for the current user if appropriate:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then activate again:

```powershell
venv\Scripts\Activate.ps1
```

---

# Step 3 — Install Dependencies

Make sure the virtual environment is active.

Then run:

```powershell
pip install -r requirements.txt
```

This installs the dependencies required by Resora.

The main packages include:

```text
Flask
groq
python-dotenv
gunicorn
```

Additional packages required by those libraries may also be installed automatically.

---

# Step 4 — Verify Installation

You can check the installed packages:

```powershell
pip list
```

You can also verify individual packages:

```powershell
pip show flask
```

```powershell
pip show groq
```

```powershell
pip show python-dotenv
```

---

# 🔐 API Key Configuration

Resora requires a Groq API key.

## Step 5 — Create the `.env` File

Create a file called:

```text
.env
```

in the project root:

```text
Resora-LLM-Chatbot/
├── .env
├── app.py
└── ...
```

Add:

```env
GROQ_API_KEY=your_actual_groq_api_key
```

Replace:

```text
your_actual_groq_api_key
```

with the API key generated from Groq.

Example:

```env
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxx
```

Do not put quotes around the API key unless your environment specifically requires them.

---

# 🚨 NEVER COMMIT THE `.env` FILE

The `.env` file contains a secret API credential and must never be uploaded to a public repository.

The project `.gitignore` should contain:

```gitignore
venv/
.env
__pycache__/
*.pyc
```

Therefore:

```text
.env
```

will remain local.

---

# Step 6 — Configure `.env.example`

Create:

```text
.env.example
```

with:

```env
GROQ_API_KEY=your_groq_api_key_here
```

This file is safe to commit because it does not contain the real key.

A new developer can copy it:

```powershell
copy .env.example .env
```

and then replace the placeholder with their own Groq API key.

---

# ▶️ Running Resora Locally

Once the environment and API key are configured, run:

```powershell
python app.py
```

You should see something similar to:

```text
* Serving Flask app 'app'
* Debug mode: on
* Running on http://127.0.0.1:5000
```

Open the following URL in your browser:

```text
http://127.0.0.1:5000
```

Resora should now appear.

---

# 💬 Using Resora

You can either type a research question into the input field or select one of the example research prompts.

Example:

```text
What is sentiment analysis in Bangla NLP?
```

Other examples:

```text
How can transformers be used for text classification?
```

```text
What are the major challenges in Bangla natural language processing?
```

```text
How should I design a research methodology for Bangla sentiment classification?
```

---

# ⚡ Streaming Responses

Resora uses the Groq streaming API.

The backend requests:

```python
stream=True
```

Instead of waiting for the entire response:

```text
Request
   ↓
Wait
   ↓
Complete response
   ↓
Display
```

Resora receives generated chunks progressively:

```text
Request
   ↓
Chunk 1
   ↓
Chunk 2
   ↓
Chunk 3
   ↓
Chunk 4
   ↓
...
```

The browser displays the response while it is being generated.

---

# 💬 Conversation History

Resora currently keeps the conversation history in the browser.

The JavaScript application stores messages in:

```javascript
let conversationHistory = [];
```

A conversation is therefore represented approximately as:

```text
[
    {
        "role": "user",
        "content": "What is NLP?"
    },
    {
        "role": "assistant",
        "content": "Natural Language Processing..."
    },
    {
        "role": "user",
        "content": "What are its applications?"
    }
]
```

The conversation is then sent to Flask with subsequent requests.

---

# 🔄 Starting a New Chat

Click:

```text
+ New chat
```

This clears the current conversation.

The browser-side history is reset:

```javascript
conversationHistory = [];
```

The welcome screen is displayed again.

---

# ❤️ Health Check

Resora provides a health endpoint:

```text
/health
```

Open:

```text
http://127.0.0.1:5000/health
```

A healthy application should return:

```json
{
    "status": "online",
    "service": "Resora"
}
```

This endpoint is useful for deployment platforms and monitoring.

---

# 🧪 Testing the Application

Before deploying, test the following:

### Basic question

```text
What is Natural Language Processing?
```

### Research question

```text
What are possible research directions in Bangla sentiment analysis?
```

### Follow-up question

```text
What datasets can I use for it?
```

### Methodology question

```text
Which evaluation metrics should I use?
```

### Markdown test

Ask:

```text
Explain transformer architecture with headings and bullet points.
```

The generated response should display formatted Markdown.

---

# 🛑 Stopping the Application

To stop the Flask server:

```text
Ctrl + C
```

You can then deactivate the virtual environment:

```powershell
deactivate
```

After deactivation, the `(venv)` prefix disappears.

---

# 🔁 Running the Project Again Later

Whenever you return to the project:

### 1. Open the project

```powershell
cd E:\Resora-LLM-Chatbot
```

### 2. Activate the virtual environment

```powershell
venv\Scripts\Activate.ps1
```

### 3. Run the application

```powershell
python app.py
```

### 4. Open the application

```text
http://127.0.0.1:5000
```

---

# 🆕 Setting Up the Project on Another Computer

If you clone Resora on another computer, you do **not** need to copy the existing `venv/` folder.

Instead:

```powershell
git clone https://github.com/YOUR_USERNAME/Resora-LLM-Chatbot.git
```

Enter the directory:

```powershell
cd Resora-LLM-Chatbot
```

Create a new environment:

```powershell
python -m venv venv
```

Activate it:

```powershell
venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Create `.env`:

```powershell
copy .env.example .env
```

Then edit `.env`:

```env
GROQ_API_KEY=your_actual_groq_api_key
```

Finally:

```powershell
python app.py
```

---

# 📦 Dependency Management

When adding a new Python package, activate the virtual environment first:

```powershell
venv\Scripts\Activate.ps1
```

Install the package:

```powershell
pip install package-name
```

Then update:

```powershell
pip freeze > requirements.txt
```

For example:

```powershell
pip install some-package
```

then:

```powershell
pip freeze > requirements.txt
```

Always commit the updated `requirements.txt` so another machine can reproduce the environment.

---

# 🐛 Troubleshooting

## Error: `GROQ_API_KEY was not found`

Possible causes:

* `.env` does not exist
* `.env` is in the wrong directory
* The variable is named incorrectly
* The virtual environment is not active

Make sure `.env` contains:

```env
GROQ_API_KEY=your_actual_groq_api_key
```

and is located beside `app.py`.

---

## Error: `ModuleNotFoundError`

Example:

```text
ModuleNotFoundError: No module named 'flask'
```

Make sure the virtual environment is active:

```powershell
venv\Scripts\Activate.ps1
```

Then:

```powershell
pip install -r requirements.txt
```

---

## Error: `model_not_found`

The project currently uses:

```text
openai/gpt-oss-120b
```

Check that this model is available to your Groq account.

You can list available models with:

```python
models = client.models.list()

for model in models.data:
    print(model.id)
```

---

## Error: Port already in use

If Flask reports that port `5000` is already being used, stop the other application using that port or change the Flask configuration.

For example:

```python
app.run(
    port=5001,
    debug=True
)
```

Then open:

```text
http://127.0.0.1:5001
```

---

## Error: `gunicorn: command not found`

If deploying to a Linux-based hosting platform and using:

```bash
gunicorn app:app
```

make sure Gunicorn exists in `requirements.txt`.

Install it locally:

```powershell
pip install gunicorn
```

Then update:

```powershell
pip freeze > requirements.txt
```

---

## Resora says it cannot connect to the server

First check that Flask is running:

```powershell
python app.py
```

Then verify:

```text
http://127.0.0.1:5000/health
```

If the health endpoint does not respond, the Flask server is not running correctly.

---

# 🔒 Security Guidelines

Never commit or expose:

```text
.env
API keys
Passwords
Tokens
Private credentials
```

Never write the API key directly in:

```python
app.py
```

Incorrect:

```python
client = Groq(
    api_key="gsk_xxxxxxxxx"
)
```

Correct:

```python
api_key = os.getenv("GROQ_API_KEY")

client = Groq(
    api_key=api_key
)
```

The `.env` file should remain outside GitHub.

---

# 🌐 Current Deployment

The original version of Resora can be run locally using Flask.

For deployment, the application can be hosted using a platform capable of running the Flask backend.

The project should keep API credentials in the hosting platform's environment-variable configuration rather than inside the source code.

---

# 🧠 Current LLM Configuration

```text
Provider:
Groq

Model:
openai/gpt-oss-120b

Framework:
Flask

Protocol:
HTTP + Server-Sent Events (SSE)

Streaming:
Enabled

Conversation History:
Browser-side

Database:
None
```

---

# ⚠️ Limitations

The current version has several limitations.

### No Persistent Conversation Storage

Conversation history is stored in browser memory and is lost when the page is refreshed or the session is cleared.

### No Research-Paper Retrieval

Resora does not automatically search academic databases.

Generated references should therefore be independently verified.

### LLM Hallucination

Like other generative AI systems, Resora may produce incorrect information.

Important academic claims should be checked against reliable sources and original research papers.

### API Dependency

The application requires a valid Groq API key and access to the selected model.

---

# 🔮 Future Improvements

Possible future versions of Resora may include:

* Persistent chat history
* Firebase authentication
* Firebase Firestore
* Research-paper search
* Retrieval-Augmented Generation (RAG)
* PDF upload and analysis
* Academic source retrieval
* Citation support
* Research-specific modes
* Saved research sessions
* Conversation management
* Voice interaction
* Advanced prompt management

---

# 🎓 Academic Purpose

This project was developed for:

```text
Course:
CSE 414 — Natural Language Processing

Institution:
Green University of Bangladesh

Semester:
Summer 2026

Project:
Simple Research Chatbot using an LLM
```

The project demonstrates practical use of:

* Natural Language Processing
* Large Language Models
* API integration
* Prompt engineering
* Web application development
* Streaming generation
* Conversational AI
* Secure environment-variable management

---

# 👨‍💻 Developer

**Irfan Ferdous Siam**

Computer Science & Engineering
Green University of Bangladesh

### Links

* GitHub: https://github.com/IrfanTech-X
* Portfolio: https://irfanferdous.netlify.app/
* LinkedIn: Add your current LinkedIn profile URL here

---

# 📄 License

This project was created for educational and academic purposes.

You may modify and extend the project for learning and research.

---

# ⭐ Acknowledgements

* Groq API
* OpenAI GPT-OSS-120B
* Flask
* Marked.js
* DOMPurify
* Python
* Green University of Bangladesh — CSE 414
