"""
LLM configuration with fallback models for Groq free-tier quota limits.
Uses multiple small non-thinking models under retry logic.
"""

from langchain_groq import ChatGroq
from schemas import DocumentClassifier, ExtractedResume, RankingResult
import os
import time
from dotenv import load_dotenv

load_dotenv()

# Models to try in order (valid non-thinking models on Groq as of 2025-2026)
FALLBACK_MODELS = [
    "llama-3.1-8b-instant",
    "llama-3.3-70b-versatile",
    "qwen3-32b",
    "qwen3.6-27b",
]

API_KEY = os.environ["GROQ_API_KEY"]


def get_llm(model_name: str) -> ChatGroq:
    """Create a ChatGroq instance for a given model."""
    return ChatGroq(
        model=model_name,
        api_key=API_KEY,
        temperature=0.1,
        max_retries=2,
    )


def invoke_with_fallback(chain_builder, input_data: dict):
    """
    Try invoking an LLM chain across multiple models.
    chain_builder: a callable that takes a ChatGroq instance and returns a runnable chain.
    input_data: the input dict to pass to chain.invoke().
    
    Handles rate limits by falling back to the next model.
    Handles connection errors with retry + wait.
    """
    last_error = None

    for model_name in FALLBACK_MODELS:
        # Try each model up to 2 attempts (to handle transient connection issues)
        for attempt in range(2):
            try:
                llm = get_llm(model_name)
                chain = chain_builder(llm)
                result = chain.invoke(input=input_data)
                return result
            except Exception as e:
                last_error = e
                error_str = str(e).lower()

                # Rate limit / quota exhausted → skip to next model immediately
                if any(kw in error_str for kw in ["rate_limit", "quota", "429", "resource_exhausted", "too many requests"]):
                    print(f"[LLM] Model '{model_name}' rate limited, trying next model...")
                    break  # break inner loop, go to next model

                # Connection error → wait and retry same model once, then move on
                if "connection" in error_str or "timeout" in error_str or "connect" in error_str:
                    if attempt == 0:
                        print(f"[LLM] Model '{model_name}' connection error, retrying in 3s...")
                        time.sleep(3)
                        continue  # retry same model
                    else:
                        print(f"[LLM] Model '{model_name}' connection failed twice, trying next model...")
                        break  # move to next model

                # Other errors → try next model
                print(f"[LLM] Model '{model_name}' failed: {e}, trying next model...")
                break

    raise RuntimeError(f"All models exhausted. Last error: {last_error}")


def get_classifier_chain(llm: ChatGroq):
    """Returns a chain for document classification."""
    return llm.with_structured_output(schema=DocumentClassifier)


def get_extractor_chain(llm: ChatGroq):
    """Returns a chain for resume data extraction."""
    return llm.with_structured_output(schema=ExtractedResume)


def get_ranking_chain(llm: ChatGroq):
    """Returns a chain for candidate ranking."""
    return llm.with_structured_output(schema=RankingResult)
