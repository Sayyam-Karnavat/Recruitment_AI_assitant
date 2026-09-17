import os
import time
from langchain_openai import AzureChatOpenAI
from schemas import FullCandidateScreeningResult
from config import settings
from langchain_core.prompts import ChatPromptTemplate

UNIFIED_SCREENING_PROMPT = ChatPromptTemplate.from_messages([
    ("system", "You are an expert AI recruiter. Evaluate the resume against the JD in a single structured pass.\nDate: September 2026"),
    ("human", "JD:\n{job_description}\n\nResume:\n{text}")
])

async def test_deployment(dep_name: str):
    print(f"\nTesting deployment: {dep_name}")
    t0 = time.time()
    try:
        llm = AzureChatOpenAI(
            azure_endpoint=settings.AZURE_OPENAI_ENDPOINT,
            api_key=settings.AZURE_OPENAI_API_KEY,
            api_version="2024-12-01-preview",
            azure_deployment=dep_name,
            temperature=0.0,
            max_retries=1,
            max_tokens=2048,
            request_timeout=15.0
        )
        chain = UNIFIED_SCREENING_PROMPT | llm.with_structured_output(FullCandidateScreeningResult)
        res = await chain.ainvoke({
            "job_description": "Senior Python Engineer",
            "text": "John Doe, Software Engineer, 4 years exp Python FastAPI React PostgreSQL"
        })
        t1 = time.time()
        print(f"[SUCCESS] [{dep_name}] Time: {t1 - t0:.2f}s | Score: {res.overall_score}, Name: {res.name}")
    except Exception as e:
        t1 = time.time()
        print(f"[FAILED] [{dep_name}] Time: {t1 - t0:.2f}s | Error: {e}")

import asyncio
async def main():
    await test_deployment("gpt-4o-mini")
    await test_deployment("gpt-4o")

if __name__ == "__main__":
    asyncio.run(main())
