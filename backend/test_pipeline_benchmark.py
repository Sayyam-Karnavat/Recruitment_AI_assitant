import asyncio
import time
from llm_pipeline import screen_candidate_unified
from background_tasks import compute_proportional_recommendation

sample_resume = """
John Doe
Software Engineer
Email: john.doe@example.com | Phone: +1 555-0199 | Location: San Francisco, CA

PROFESSIONAL SUMMARY:
Full Stack Developer with 4 years of experience building scalable web applications using Python, FastAPI, React, TypeScript, and PostgreSQL.

EXPERIENCE:
Software Engineer | Acme Tech | Jan 2022 - Present
- Architected and built high-performance REST and GraphQL APIs serving 500k+ daily active users.
- Designed database schemas in PostgreSQL, implemented async connection pooling, and optimized query performance by 40%.
- Developed dynamic responsive UI components using React and TypeScript.

Junior Developer | CloudSolutions Inc. | June 2020 - Dec 2021
- Built automated data ingestion pipelines in Python.
- Maintained Docker containers and CI/CD pipelines in GitHub Actions.

EDUCATION:
B.S. in Computer Science | University of California, Berkeley | 2016 - 2020

SKILLS:
Python, FastAPI, TypeScript, React, PostgreSQL, Docker, Redis, Git, REST APIs

PROJECTS:
AI Resume Parser: Built an asynchronous document extraction and evaluation tool with OpenAI and FastAPI.
"""

sample_bill = """
CONSOLIDATED EDISON COMPANY OF NEW YORK
ELECTRIC & GAS UTILITY BILL
Account Number: 9874-2918-001
Service Address: 450 Lexington Ave, New York, NY
Billing Period: Aug 01, 2026 - Aug 31, 2026
Total Amount Due: $148.52
Payment Due Date: Sep 20, 2026

Summary of Charges:
Electricity Supply (kWh 420 @ $0.12): $50.40
Delivery Service Charge: $72.10
State & City Taxes: $26.02
Please pay by due date to avoid late payment fee of 1.5%.
"""

job_description = """
Job Title: Senior Full-Stack Python Engineer
Requirements:
- 3+ years of hands-on experience with Python and FastAPI or Django
- Strong proficiency in React, TypeScript, and modern frontend workflows
- Deep knowledge of PostgreSQL database design and query optimization
- Experience with Docker, background task workers, and distributed caching
"""

async def run_tests():
    print("\n--- 1. Testing Legitimate Resume with Unified Screening ---")
    start_t = time.time()
    res1 = await screen_candidate_unified(sample_resume, job_description)
    dur1 = time.time() - start_t
    print(f"Time Taken: {dur1:.2f}s")
    if res1:
        print(f"is_valid_resume: {res1.is_valid_resume}")
        print(f"Name: {res1.name}")
        print(f"Role: {res1.current_role}")
        print(f"Experience Years: {res1.total_experience_years}")
        print(f"Score: {res1.overall_score}")
        print(f"Recommendation (cutoff 50): {compute_proportional_recommendation(res1.overall_score, 50)}")
        print(f"Summary: {res1.summary}")
        print(f"Strengths: {res1.strengths}")
        print(f"Weaknesses: {res1.weaknesses}")
        print(f"Categories count: {len(res1.categories or [])}")
    else:
        print("Failed to get result for resume!")

    print("\n--- 2. Testing Utility Bill (Document Validation) ---")
    start_t = time.time()
    res2 = await screen_candidate_unified(sample_bill, job_description)
    dur2 = time.time() - start_t
    print(f"Time Taken: {dur2:.2f}s")
    if res2:
        print(f"is_valid_resume: {res2.is_valid_resume}")
        print(f"Rejection Reason: {res2.rejection_reason}")
    else:
        print("Failed to get result for bill!")

if __name__ == "__main__":
    asyncio.run(run_tests())
