annotated-types==0.8.0
anyio==4.14.2
blinker==1.9.0
certifi==2026.7.22
click==8.5.0
distro==1.9.0
Flask==3.1.3
groq==1.7.0
gunicorn==26.2.0
h11==0.16.0
httpcore==1.0.9
httpx==0.28.1
idna==3.19
itsdangerous==2.2.0
Jinja2==3.1.6
MarkupSafe==3.0.3
pydantic==2.13.4
pydantic_core==2.46.4
python-dotenv==1.2.3
sniffio==1.3.1
typing-inspection==0.4.4
typing_extensions==4.16.0
Werkzeug==3.1.8

# --- Added for document upload / RAG feature ---
# (embeddings call Google's free Gemini Embedding API, so no local
# ML runtime like torch is needed -- keeps this lightweight enough
# for free hosting tiers)
numpy>=1.26,<3
pypdf>=4.0.0
python-docx>=1.1.0
requests>=2.31.0
