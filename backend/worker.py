import asyncio
import logging
import os
import sys
import uuid
import time
from sqlalchemy import or_

from app.core.config import settings
from app.core.database import SessionLocal, Base, engine
from app.models.job import BenchmarkJob
from app.services.benchmark_service import BenchmarkService

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [WORKER] [%(levelname)s]: %(message)s"
)
logger = logging.getLogger("edvexa-worker")

async def run_worker():
    worker_id = f"worker-daemon-{uuid.uuid4().hex[:6]}"
    logger.info(f"Starting Edvexa Benchmark Worker: {worker_id}")
    Base.metadata.create_all(bind=engine)

    redis_client = None
    if settings.USE_REDIS_QUEUE:
        try:
            import redis
            redis_client = redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)
            redis_client.ping()
            logger.info(f"Connected to Redis at {settings.REDIS_URL}")
        except Exception as e:
            logger.warning(f"Redis queue unavailable ({e}). Falling back to database polling worker queue.")
            redis_client = None

    while True:
        try:
            job_to_process = None

            if redis_client:
                # Pop from Redis queue
                item = redis_client.blpop("edvexa:benchmark_jobs", timeout=2)
                if item:
                    job_to_process = item[1]

            if not job_to_process:
                # Database polling queue fallback: Find QUEUED jobs
                with SessionLocal() as db:
                    queued_job = (
                        db.query(BenchmarkJob)
                        .filter(BenchmarkJob.status == "QUEUED")
                        .order_by(BenchmarkJob.created_at.asc())
                        .first()
                    )
                    if queued_job:
                        job_to_process = queued_job.id

            if job_to_process:
                logger.info(f"Worker {worker_id} picked up job {job_to_process}")
                await BenchmarkService.execute_job(job_to_process, worker_id=worker_id)
            else:
                await asyncio.sleep(1.0)

        except Exception as err:
            logger.error(f"Worker iteration exception: {err}", exc_info=True)
            await asyncio.sleep(2.0)

if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        logger.info("Worker stopped by user.")
