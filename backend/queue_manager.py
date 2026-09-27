"""
Queue Manager: High-throughput task queue supporting Redis (Render/production)
and automatic resilient async in-memory queue fallback for zero-dependency local development.
"""

import asyncio
import json
import logging
from typing import Optional

from config import settings

logger = logging.getLogger("queue_manager")

# In-memory queue fallback
_memory_queue: asyncio.Queue = asyncio.Queue()
_worker_tasks: list[asyncio.Task] = []
_running = False
_redis_client = None
_redis_failed = False

QUEUE_KEY = "recruitment:resume_eval_queue"


async def get_redis():
    """Get or initialize Redis client if REDIS_URL is configured."""
    global _redis_client, _redis_failed
    if not settings.REDIS_URL or _redis_failed:
        return None

    if _redis_client is None:
        try:
            import redis.asyncio as aioredis
            
            ssl_kwargs = {}
            if settings.REDIS_URL.startswith("rediss://"):
                import ssl
                ssl_kwargs = {"ssl_cert_reqs": ssl.CERT_NONE}

            client = aioredis.from_url(
                settings.REDIS_URL,
                decode_responses=True,
                socket_timeout=5,
                socket_connect_timeout=5,
                **ssl_kwargs
            )
            await client.ping()
            _redis_client = client
            host_display = settings.REDIS_URL.split("@")[-1] if "@" in settings.REDIS_URL else "configured host"
            print(f"🟢 [Queue] Connected to Redis successfully ({host_display})")
            logger.info(f"Connected to Redis successfully ({host_display})")
        except Exception as e:
            print(f"⚠️ [Queue] Redis connection failed ({e}). Using in-memory fallback queue.")
            logger.warning(f"Could not connect to Redis ({e}). Falling back to in-memory async worker pool.")
            _redis_failed = True
            _redis_client = None
    return _redis_client


async def enqueue_batch_task(
    batch_id: str,
    candidate_ids: list[str],
    job_id: str,
    user_id: str,
    job_description: str,
    custom_prompt: Optional[str] = None
):
    """
    Enqueue a batch processing task.
    Pushes to Redis if available, else puts into in-memory queue.
    """
    task_payload = {
        "batch_id": batch_id,
        "candidate_ids": candidate_ids,
        "job_id": job_id,
        "user_id": user_id,
        "job_description": job_description,
        "custom_prompt": custom_prompt,
    }

    client = await get_redis()
    if client:
        try:
            await client.rpush(QUEUE_KEY, json.dumps(task_payload))
            print(f"📦 [Queue] Enqueued batch {batch_id} ({len(candidate_ids)} candidates) to UPSTASH REDIS.")
            logger.info(f"Task for batch {batch_id} enqueued to Redis ({len(candidate_ids)} candidates).")
            return
        except Exception as e:
            print(f"⚠️ [Queue] Redis enqueue failed ({e}), falling back to in-memory queue.")
            logger.warning(f"Redis enqueue failed ({e}), falling back to in-memory queue.")

    await _memory_queue.put(task_payload)
    print(f"📦 [Queue] Enqueued batch {batch_id} ({len(candidate_ids)} candidates) to IN-MEMORY QUEUE.")
    logger.info(f"Task for batch {batch_id} enqueued to in-memory queue ({len(candidate_ids)} candidates).")


async def _worker_loop(worker_id: int):
    """Background worker consuming tasks from Redis or memory queue."""
    from background_tasks import process_batch

    logger.info(f"Queue worker #{worker_id} started.")
    while _running:
        try:
            client = await get_redis()
            payload = None
            source_queue = "None"

            if client:
                try:
                    # Pop from Redis with 2s timeout
                    res = await client.blpop(QUEUE_KEY, timeout=2)
                    if res:
                        _, data = res
                        payload = json.loads(data)
                        source_queue = "Upstash Redis"
                except Exception as e:
                    logger.warning(f"Redis blpop error: {e}")
                    client = None

            if not payload:
                # Check in-memory queue with short timeout
                try:
                    payload = await asyncio.wait_for(_memory_queue.get(), timeout=1.0)
                    _memory_queue.task_done()
                    source_queue = "In-Memory Queue"
                except asyncio.TimeoutError:
                    continue

            if payload:
                print(f"⚙️ [Worker #{worker_id}] Dequeued batch {payload['batch_id']} ({len(payload.get('candidate_ids', []))} resumes) from {source_queue}.")
                logger.info(f"Worker #{worker_id} picked up batch {payload['batch_id']} from {source_queue}.")
                await process_batch(
                    batch_id=payload["batch_id"],
                    candidate_ids=payload["candidate_ids"],
                    job_id=payload["job_id"],
                    user_id=payload["user_id"],
                    job_description=payload["job_description"],
                    custom_prompt=payload.get("custom_prompt"),
                )

        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Worker #{worker_id} encountered error: {e}", exc_info=True)
            await asyncio.sleep(1)

    logger.info(f"Queue worker #{worker_id} stopped.")


async def start_queue_workers(num_workers: int = 3):
    """Start background worker tasks."""
    global _running, _worker_tasks
    if _running:
        return
    _running = True

    # Try connecting to Redis
    client = await get_redis()
    mode = "Upstash Redis" if client else "In-Memory Fallback Queue"
    print(f"🚀 [Queue] Background queue started with {num_workers} workers. Active mode: {mode}")

    for i in range(num_workers):
        task = asyncio.create_task(_worker_loop(i + 1))
        _worker_tasks.append(task)


async def stop_queue_workers():
    """Stop all background worker tasks."""
    global _running, _worker_tasks, _redis_client
    _running = False
    for task in _worker_tasks:
        task.cancel()
    if _worker_tasks:
        await asyncio.gather(*_worker_tasks, return_exceptions=True)
    _worker_tasks.clear()

    if _redis_client:
        try:
            await _redis_client.close()
        except Exception:
            pass
        _redis_client = None
    print("🛑 [Queue] Stopped all background queue workers.")
