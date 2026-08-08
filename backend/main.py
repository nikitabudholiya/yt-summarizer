import os
import re
from functools import lru_cache
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_groq import ChatGroq
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS
from langchain_core.prompts import PromptTemplate
from langchain_core.runnables import RunnableParallel, RunnablePassthrough, RunnableLambda
from langchain_core.output_parsers import StrOutputParser

# ── Config ──────────────────────────────────────────────────────────────────
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "YOUR_GROQ_API_KEY_HERE")
GROQ_MODEL   = "llama3-8b-8192"          # fast & free; swap to mixtral-8x7b-32768 for quality

app = FastAPI(title="YT Summarizer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Chrome extension uses chrome-extension:// origin
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── In-memory cache: video_id → FAISS vector store ──────────────────────────
_store_cache: dict[str, FAISS] = {}

# ── Helpers ──────────────────────────────────────────────────────────────────
def extract_video_id(url_or_id: str) -> str:
    """Accept a full YouTube URL or bare video ID and return just the ID."""
    patterns = [
        r"(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url_or_id)
        if m:
            return m.group(1)
    # Assume raw ID if 11 chars
    if re.fullmatch(r"[A-Za-z0-9_-]{11}", url_or_id):
        return url_or_id
    raise ValueError(f"Could not extract video ID from: {url_or_id}")


def get_transcript(video_id: str) -> str:
    """Fetch English transcript (auto-generated fallback included)."""
    try:
        segments = YouTubeTranscriptApi.get_transcript(video_id, languages=["en"])
    except NoTranscriptFound:
        # Try auto-generated captions in any language and translate
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        segments = transcript_list.find_transcript(
            ["en", "en-US", "en-GB"]
        ).fetch()
    return " ".join(s["text"] for s in segments)


@lru_cache(maxsize=1)
def get_embeddings():
    """Load embeddings model once (free, runs locally)."""
    return HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")


def build_vector_store(video_id: str) -> FAISS:
    if video_id in _store_cache:
        return _store_cache[video_id]
    transcript = get_transcript(video_id)
    splitter   = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    docs       = splitter.create_documents([transcript])
    store      = FAISS.from_documents(docs, get_embeddings())
    _store_cache[video_id] = store
    return store


def build_rag_chain(video_id: str):
    store     = build_vector_store(video_id)
    retriever = store.as_retriever(search_type="similarity", search_kwargs={"k": 5})
    llm       = ChatGroq(api_key=GROQ_API_KEY, model=GROQ_MODEL, temperature=0.2)

    prompt = PromptTemplate(
        template="""You are a helpful assistant that answers questions about YouTube videos.
Answer ONLY from the provided transcript context.
If the context is insufficient, say "I couldn't find that in the video."

Context:
{context}

Question: {question}

Answer:""",
        input_variables=["context", "question"],
    )

    def format_docs(docs):
        return "\n\n".join(d.page_content for d in docs)

    chain = (
        RunnableParallel({
            "context":  retriever | RunnableLambda(format_docs),
            "question": RunnablePassthrough(),
        })
        | prompt
        | llm
        | StrOutputParser()
    )
    return chain


# ── Request / Response models ────────────────────────────────────────────────
class VideoRequest(BaseModel):
    video_url: str
    groq_api_key: Optional[str] = None   # user can pass their own key at runtime


class AskRequest(BaseModel):
    video_url: str
    question: str
    groq_api_key: Optional[str] = None


# ── Routes ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/summarize")
def summarize(req: VideoRequest):
    if req.groq_api_key:
        os.environ["GROQ_API_KEY"] = req.groq_api_key

    try:
        video_id = extract_video_id(req.video_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        chain   = build_rag_chain(video_id)
        summary = chain.invoke("Please give me a comprehensive summary of this video. Cover the main topics, key insights, and important points discussed.")
        return {"video_id": video_id, "summary": summary}
    except (TranscriptsDisabled, NoTranscriptFound):
        raise HTTPException(status_code=404, detail="No captions available for this video.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/ask")
def ask(req: AskRequest):
    if req.groq_api_key:
        os.environ["GROQ_API_KEY"] = req.groq_api_key

    try:
        video_id = extract_video_id(req.video_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if not req.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty.")

    try:
        chain  = build_rag_chain(video_id)
        answer = chain.invoke(req.question)
        return {"video_id": video_id, "question": req.question, "answer": answer}
    except (TranscriptsDisabled, NoTranscriptFound):
        raise HTTPException(status_code=404, detail="No captions available for this video.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
