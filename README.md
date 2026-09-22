# Resora — LLM Research Assistant with RAG

> **An end-to-end AI research assistant combining LLMs, Retrieval-Augmented Generation (RAG), semantic embeddings, document retrieval, conversational memory, streaming responses, and cloud deployment.**

[![Python](https://img.shields.io/badge/Python-3.11+-blue?logo=python\&logoColor=white)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Backend-Flask-black?logo=flask)](https://flask.palletsprojects.com/)
[![Groq](https://img.shields.io/badge/LLM-Groq-orange)](https://groq.com/)
[![RAG](https://img.shields.io/badge/AI-RAG-purple)](#-retrieval-augmented-generation-rag)
[![Render](https://img.shields.io/badge/Deployed-Render-46E3B7)](https://render.com/)


---

# 📌 Overview

**Resora** is an AI-powered research assistant built with **Flask, Groq LLMs, Gemini Embeddings, and a custom lightweight RAG pipeline**.

The application supports two modes:

### General AI Conversation

Users can ask research, NLP, machine learning, AI, methodology, and general questions directly to the LLM.

### Document-Grounded Research

Users can upload a **PDF, DOCX, TXT, or Markdown document**, after which Resora:

1. Extracts the document text
2. Splits it into overlapping chunks
3. Generates semantic embeddings
4. Stores the vectors in memory
5. Embeds the user's question
6. Retrieves the most relevant document chunks
7. Injects the retrieved context into the LLM prompt
8. Generates a grounded answer through Groq

This turns Resora from a simple chatbot into a practical **Retrieval-Augmented Generation application**.

---

# 🚀 Key Features

| Feature                  | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| 🤖 LLM Chat              | Research-oriented conversational AI powered by Groq                      |
| 🔎 RAG                   | Retrieves relevant information from uploaded documents before generation |
| 🧠 Semantic Embeddings   | Uses Gemini Embeddings API for document and query vectors                |
| 📄 Document QA           | Supports PDF, DOCX, TXT, and Markdown                                    |
| ✂️ Text Chunking         | Splits documents into overlapping chunks for retrieval                   |
| 📐 Similarity Search     | Uses normalized NumPy vectors and cosine similarity                      |
| 💬 Conversation Memory   | Maintains recent multi-turn conversation context                         |
| ⚡ Streaming              | Streams generated responses to the browser using SSE                     |
| 🧩 Model Selection       | Allows the frontend to request available Groq chat models                |
| 🛡️ Secure Configuration | API keys are handled through environment variables                       |
| ☁️ Cloud Deployment      | Deployed as a Flask application on Render                                |
| 📱 Responsive UI         | ChatGPT-style interface across desktop and mobile                        |

---

# 🧠 Retrieval-Augmented Generation (RAG)

A normal LLM chatbot follows:

```text
User Question
      ↓
     LLM
      ↓
   Answer
```

The problem is that the LLM does not automatically know the contents of a document uploaded by the user.

Resora adds a retrieval layer:

```text
                 DOCUMENT INGESTION
                        │
                        ▼
             ┌─────────────────────┐
             │ PDF / DOCX / TXT / MD│
             └──────────┬──────────┘
                        ▼
                 Text Extraction
                        │
                        ▼
                   Text Chunking
                        │
                        ▼
              Gemini Embeddings API
                        │
                        ▼
               Document Embeddings
                        │
                        ▼
                 In-Memory Store
                        │
                        │
User Question ──────────┤
                        ▼
              Query Embedding
                        │
                        ▼
              Cosine Similarity
                        │
                        ▼
             Top Relevant Chunks
                        │
                        ▼
              Retrieved Context
                        │
                        ▼
                   Groq LLM
                        │
                        ▼
              Grounded Response
```

---

# 🔍 RAG Pipeline — Step by Step

## 1. Document Ingestion

When a user uploads a supported file, Resora extracts its textual content.

Supported formats:

```text
PDF
DOCX
TXT
Markdown (.md)
```

The current implementation limits uploaded files to **15 MB**.

---

## 2. Text Extraction

Resora uses file-specific extraction logic.

```text
PDF
 ↓
pypdf
 ↓
Plain text
```

```text
DOCX
 ↓
python-docx
 ↓
Plain text
```

```text
TXT / Markdown
 ↓
UTF-8 decoding
 ↓
Plain text
```

The extracted text is normalized before chunking.

---

## 3. Text Chunking

Large documents are divided into smaller overlapping pieces.

Current configuration:

```text
Chunk size:     900 characters
Chunk overlap:  150 characters
```

Conceptually:

```text
Document
   │
   ├── Chunk 1
   ├── Chunk 2
   ├── Chunk 3
   ├── ...
   └── Chunk N
```

The overlap helps preserve contextual information across chunk boundaries.

---

## 4. Semantic Embeddings

Each document chunk is converted into a numerical vector through the **Gemini Embeddings API**.

Current embedding model:

```text
gemini-embedding-001
```

The document side uses:

```text
RETRIEVAL_DOCUMENT
```

while user questions use:

```text
RETRIEVAL_QUERY
```

This separates document representation from query representation within the retrieval workflow.

The application uses a **768-dimensional output representation** to keep the in-memory vectors relatively compact.

---

## 5. In-Memory Vector Store

Instead of introducing a heavyweight external vector database, Resora currently uses a lightweight custom `VectorStore`.

The store maintains:

```text
Document filename
       +
Text chunks
       +
Embedding matrix
```

The embeddings are normalized before storage.

Because both vectors are unit-normalized, similarity can be calculated efficiently with a dot product:

```python
scores = self.embeddings @ query_embedding
```

which corresponds to cosine similarity for normalized vectors.

---

## 6. Query Embedding

When the user asks a question about the uploaded document:

```text
User Question
      ↓
Gemini Embeddings API
      ↓
Query Vector
```

The query vector is compared against the document chunk vectors.

---

## 7. Semantic Retrieval

Resora retrieves the highest-scoring chunks using cosine similarity.

Current retrieval configuration:

```text
Top-K:          4 chunks
Minimum score:  0.20
```

Conceptually:

```text
Question
   ↓
Vector
   ↓
Similarity Search
   ↓
┌─────────────────────────────┐
│ Chunk 7    0.82             │
│ Chunk 2    0.76             │
│ Chunk 11   0.71             │
│ Chunk 4    0.63             │
└─────────────────────────────┘
```

Only sufficiently relevant chunks are passed forward.

---

## 8. Context Grounding

The retrieved passages are formatted into a context block and injected into the LLM conversation.

The LLM therefore receives:

```text
System Instructions
        +
Conversation History
        +
Retrieved Document Context
        +
Current User Question
```

This allows the model to answer using information retrieved from the user's document.

---

## 9. LLM Generation

After retrieval, the final response is generated using the Groq API.

Current default model:

```text
openai/gpt-oss-120b
```

The RAG architecture therefore separates the two major AI responsibilities:

```text
Gemini
  ↓
Embedding & Retrieval

Groq
  ↓
Language Generation
```

This design also avoids loading a large local embedding model into the deployed Flask application.

---

# 🤖 General Chat vs RAG Chat

Resora preserves its original chatbot functionality.

### Without a document

```text
User
 ↓
Flask
 ↓
Conversation History + System Prompt
 ↓
Groq
 ↓
Streaming Response
 ↓
Browser
```

### With a document

```text
User Question
 ↓
Gemini Query Embedding
 ↓
Semantic Retrieval
 ↓
Relevant Document Context
 ↓
Groq LLM
 ↓
Streaming Response
 ↓
Browser
```

This means the RAG functionality is an additional capability rather than a replacement for the original chatbot.

---

# ⚡ Streaming Responses

Resora streams Groq's response rather than waiting for the complete answer.

The backend uses:

```python
stream=True
```

and sends generated content through **Server-Sent Events (SSE)**.

Simplified flow:

```text
Groq
 │
 ├── Token / Chunk 1
 ├── Token / Chunk 2
 ├── Token / Chunk 3
 ├── Token / Chunk 4
 └── ...
        ↓
 Flask SSE Stream
        ↓
 Browser
```

This creates a more responsive user experience similar to modern AI chat applications.

---

# 💬 Conversation Memory

The frontend maintains conversation history during the active browser session.

Example:

```text
User:
What is Bangla sentiment analysis?

Resora:
...

User:
What datasets are available?

Resora:
...
```

The previous messages are sent back to the Flask backend as conversation history.

The backend currently limits retained history to the latest:

```text
20 messages
```

and limits individual messages to:

```text
4000 characters
```

---

# 🧩 Model Selection

Resora also includes a model-selection endpoint:

```text
GET /models
```

The backend attempts to retrieve available models from Groq and filters out models that are not suitable for chat.

If the Groq model-list request fails, Resora falls back to a predefined model list.

The default model remains:

```text
openai/gpt-oss-120b
```

---

# 🏗️ System Architecture

```text
                         ┌──────────────────┐
                         │   Web Browser    │
                         │ HTML / CSS / JS  │
                         └────────┬─────────┘
                                  │
                         HTTP / SSE / Upload
                                  │
                                  ▼
                         ┌──────────────────┐
                         │  Flask Backend   │
                         │     app.py       │
                         └────────┬─────────┘
                                  │
                 ┌────────────────┼────────────────┐
                 │                │                │
                 ▼                ▼                ▼
            Chat Logic       RAG Engine       Model API
                 │             rag.py              │
                 │                │                 │
                 │                ▼                 │
                 │       Document Processing       │
                 │                │                 │
                 │                ▼                 │
                 │       Gemini Embeddings         │
                 │                │                 │
                 │                ▼                 │
                 │       NumPy Vector Store        │
                 │                │                 │
                 │                ▼                 │
                 │       Semantic Retrieval        │
                 │                │                 │
                 └────────────────┼─────────────────┘
                                  │
                                  ▼
                           ┌─────────────┐
                           │  Groq LLM   │
                           └──────┬──────┘
                                  │
                             SSE Stream
                                  │
                                  ▼
                         ┌──────────────────┐
                         │   Resora UI      │
                         └──────────────────┘
```

---

# 🛠️ Technology Stack

### Backend

* Python
* Flask
* Gunicorn

### AI / NLP

* Groq API
* OpenAI GPT-OSS-120B
* Gemini Embeddings API
* Retrieval-Augmented Generation
* Semantic embeddings
* Cosine similarity
* Prompt engineering

### Document Processing

* pypdf
* python-docx
* Plain-text / Markdown processing

### Numerical Processing

* NumPy

### Frontend

* HTML5
* CSS3
* JavaScript
* marked.js
* DOMPurify

### Deployment

* Render

### Development

* Git
* GitHub
* Python virtual environment
* Environment variables

---

# 📂 Project Structure

```text
Resora-LLM-Chatbot/
│
├── app.py
├── rag.py
├── requirements.txt
├── .env.example
├── .gitignore
├── README.md
│
├── templates/
│   └── index.html
│
└── static/
    ├── style.css
    └── script.js
```

### File Responsibilities

| File                   | Purpose                                                                        |
| ---------------------- | ------------------------------------------------------------------------------ |
| `app.py`               | Flask application, chat endpoint, streaming, model selection, document routes  |
| `rag.py`               | Complete RAG engine: extraction, chunking, embeddings, vector store, retrieval |
| `requirements.txt`     | Python dependencies                                                            |
| `.env.example`         | Environment-variable template                                                  |
| `.gitignore`           | Prevents secrets and local files from being committed                          |
| `templates/index.html` | Main Resora interface                                                          |
| `static/style.css`     | UI design and responsive styling                                               |
| `static/script.js`     | Chat interaction, streaming display, document upload, model selection          |

---

# 🔐 Environment Configuration

Resora requires two API credentials.

```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

### Groq

Used for:

```text
LLM inference
Chat completion
Streaming responses
```

### Gemini

Used for:

```text
Document embeddings
Query embeddings
```

The two APIs are intentionally separated.

---

# 🚨 Security

Never commit real API keys to GitHub.

Your local `.env` should contain:

```env
GROQ_API_KEY=your_actual_key
GEMINI_API_KEY=your_actual_key
```

while `.env.example` should contain only placeholders:

```env
GROQ_API_KEY=your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

Recommended `.gitignore`:

```gitignore
.env
venv/
__pycache__/
*.pyc
```

For cloud deployment, configure the secrets through the hosting provider's environment-variable system.

---

# 🚀 Local Installation

## 1. Clone the repository

```bash
git clone https://github.com/IrfanTech-X/Resora-LLM-Chatbot.git
cd Resora-LLM-Chatbot
```

---

## 2. Create a virtual environment

### Windows

```powershell
python -m venv venv
```

### Linux / macOS

```bash
python3 -m venv venv
```

---

## 3. Activate the environment

### Windows PowerShell

```powershell
venv\Scripts\Activate.ps1
```

### Windows CMD

```cmd
venv\Scripts\activate
```

### Linux / macOS

```bash
source venv/bin/activate
```

---

## 4. Install dependencies

```bash
pip install -r requirements.txt
```

---

## 5. Configure environment variables

Create:

```text
.env
```

in the project root.

Add:

```env
GROQ_API_KEY=your_groq_api_key
GEMINI_API_KEY=your_gemini_api_key
```

---

## 6. Run Resora

```bash
python app.py
```

Open:

```text
http://127.0.0.1:5000
```

---

# 📄 Using Document RAG

### Step 1

Open Resora.

### Step 2

Upload one of the supported document formats:

```text
PDF
DOCX
TXT
MD
```

### Step 3

Resora processes the document:

```text
Upload
 ↓
Extract
 ↓
Chunk
 ↓
Embed
 ↓
Store
```

### Step 4

Ask a question about the document.

Example:

```text
Summarize the main findings of this paper.
```

or:

```text
What methodology was used in the study?
```

or:

```text
What dataset did the authors use?
```

Resora performs semantic retrieval before generating the answer.

---

# 🧪 Example RAG Workflow

Suppose the user uploads:

```text
bangla_sentiment_analysis.pdf
```

and asks:

```text
What dataset did the researchers use?
```

Resora performs:

```text
bangla_sentiment_analysis.pdf
          ↓
     Text Extraction
          ↓
        Chunking
          ↓
   Gemini Embeddings
          ↓
    Document Vectors
          ↓
 User Question Embedding
          ↓
   Similarity Search
          ↓
  Top Relevant Chunks
          ↓
 Retrieved Context + Question
          ↓
       Groq LLM
          ↓
    Final Answer
```

The LLM therefore receives relevant information retrieved from the uploaded document rather than the entire document.

---

# 🩺 RAG Failure Handling

RAG errors are intentionally isolated from normal chat.

For example, if the Gemini embedding service is unavailable:

```text
Document RAG
     ↓
Embedding Error
     ↓
Handled Gracefully
```

while normal Groq chat can continue operating.

This prevents an embedding/API problem from unnecessarily taking down the complete chatbot.

---

# ☁️ Deployment

Resora is deployed as a Flask application on **Render**.

The deployment uses environment variables for API credentials:

```text
GROQ_API_KEY
GEMINI_API_KEY
```

The application does not require a large local embedding model to be downloaded during startup.

This keeps the deployed RAG architecture lightweight:

```text
Flask
 + 
Gemini Embeddings API
 +
NumPy retrieval
 +
Groq LLM
```

rather than loading a large local Transformer/PyTorch embedding model into the web service.

---

# 🧠 Why This Architecture?

A key design decision in Resora was separating **embedding generation** from **LLM generation**.

```text
Gemini
   │
   └── Embeddings

Groq
   │
   └── Text Generation
```

This provides several practical advantages:

* Avoids shipping a large local embedding model
* Reduces application memory requirements
* Simplifies deployment
* Keeps the RAG retrieval logic under application control
* Allows the LLM and embedding components to be changed independently

The project therefore demonstrates both **AI API integration** and **RAG pipeline engineering**, rather than only sending prompts to an LLM.

---

# 📊 Current RAG Configuration

```text
Embedding model:
gemini-embedding-001

Embedding output:
768 dimensions

Chunk size:
900 characters

Chunk overlap:
150 characters

Top-K retrieval:
4 chunks

Minimum similarity:
0.20

Vector storage:
In-memory NumPy matrix

Document limit:
15 MB
```

---

# 🎯 Engineering Concepts Demonstrated

Resora demonstrates practical implementation of:

### Generative AI

* Large Language Models
* Prompt Engineering
* LLM API integration
* Streaming generation

### RAG / Retrieval

* Document ingestion
* Text extraction
* Text chunking
* Semantic embeddings
* Query embeddings
* Vector representation
* Cosine similarity
* Top-K retrieval
* Context grounding

### Software Engineering

* Flask backend development
* REST-style endpoints
* Server-Sent Events
* Environment-based configuration
* Error handling
* Modular RAG architecture
* Session-scoped in-memory storage

### Deployment

* Cloud deployment
* Environment variables
* Lightweight AI architecture
* Production-oriented Flask serving

---

# 🔬 Research-Oriented Behavior

Resora's system prompt is designed specifically for undergraduate research assistance.

It can help users:

* Understand research concepts
* Explore research topics
* Develop research questions
* Discuss methodologies
* Explore datasets
* Compare ML/NLP approaches
* Identify potential research directions
* Understand challenges and limitations
* Generate useful research keywords

The system is also instructed not to fabricate research papers, authors, datasets, statistics, or experimental findings.

Generated academic information should still be verified against reliable sources.

---

# ⚠️ Limitations

The current implementation is intentionally lightweight and portfolio-oriented.

### In-Memory Vector Store

Documents are stored in server memory for the active session.

Therefore:

* Data is not permanently persisted
* Restarting the server clears the vector store
* Multiple server processes would not share the same store

For larger deployments, a persistent vector database can replace the current `VectorStore` implementation.

### No Authentication

The current version does not provide multi-user authentication or account management.

### No Persistent Chat Database

Conversation history is maintained for the active browser session rather than permanently stored in a database.

### Document Extraction Limitations

Image-only or scanned PDFs may not contain extractable text and may require OCR.

### LLM Limitations

Generated responses can still contain incorrect information. Important academic claims should be independently verified.

---

# 🔮 Future Improvements

Potential production-scale extensions include:

* Persistent vector database
* User authentication
* Per-user document collections
* Persistent conversation history
* Source citations for retrieved chunks
* Hybrid keyword + semantic search
* Retrieval reranking
* OCR for scanned documents
* Background document processing
* RAG evaluation metrics
* Retrieval quality evaluation
* Response faithfulness evaluation
* Monitoring and observability
* Research-paper retrieval from academic sources

---

# 🧪 Example Questions

### General AI

```text
What is Retrieval-Augmented Generation?
```

### NLP

```text
What are the major challenges in Bangla NLP?
```

### Machine Learning

```text
How should I evaluate a sentiment classification model?
```

### Research Methodology

```text
How can I design an experiment for Bangla sentiment analysis?
```

### Document RAG

Upload a research paper and ask:

```text
What methodology did the authors use?
```

```text
What dataset was used?
```

```text
Summarize the experimental results.
```

```text
What limitations did the researchers identify?
```

---

# 📚 Academic Context

Resora was developed as part of:

```text
Course:
CSE 414 — Natural Language Processing

Institution:
Green University of Bangladesh

Semester:
Summer 2026
```

The project originally started as a simple research chatbot and was extended with a document-grounded RAG architecture.

---

# 👨‍💻 Developer

## Irfan Ferdous Siam

Computer Science & Engineering
Green University of Bangladesh

**AI/ML • NLP • Generative AI • AI Automation**

### Connect

* GitHub: https://github.com/IrfanTech-X
* LinkedIn: https://linkedin.com/in/irfan-ferdous-siam
* Portfolio: https://irfanferdous.netlify.app/

---

# ⭐ Project Highlights

Resora demonstrates an end-to-end AI application rather than a basic chatbot wrapper.

```text
                   RESORA
                      │
        ┌─────────────┴─────────────┐
        │                           │
   General Chat                 Document RAG
        │                           │
        ▼                           ▼
    Groq LLM                 Text Extraction
                                    │
                                    ▼
                                Chunking
                                    │
                                    ▼
                           Gemini Embeddings
                                    │
                                    ▼
                             Vector Retrieval
                                    │
                                    ▼
                           Retrieved Context
                                    │
                    ┌───────────────┘
                    ▼
                 Groq LLM
                    │
                    ▼
              Grounded Answer
```

### The project demonstrates:

**LLM integration + RAG + semantic retrieval + embeddings + document processing + streaming + Flask + API integration + cloud deployment**

---

## 📄 License

This project was developed for educational, academic, and portfolio purposes.
