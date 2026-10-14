import pytest
import asyncio
from app.services.benchmark_service import BenchmarkService
from app.services.seed_data import seed_database
from app.models.job import BenchmarkJob, BenchmarkResult
from app.models.provider import ProviderConfig
from app.models.dataset import BenchmarkDataset, TestCase

def test_atomic_job_claim(db_session):
    seed_database(db_session)
    dataset = db_session.query(BenchmarkDataset).first()
    providers = db_session.query(ProviderConfig).all()

    job = BenchmarkService.create_job(
        db=db_session,
        dataset_id=dataset.id,
        provider_ids=[p.id for p in providers]
    )
    assert job.status == "QUEUED"

    # Worker 1 claims job -> must succeed
    claimed_1 = BenchmarkService.claim_job(db_session, job.id, worker_id="worker-alpha")
    assert claimed_1 is True

    # Worker 2 attempts to claim same job -> must return False
    claimed_2 = BenchmarkService.claim_job(db_session, job.id, worker_id="worker-beta")
    assert claimed_2 is False

@pytest.mark.asyncio
async def test_job_execution_and_partial_failure_tolerance(db_session, session_factory):
    seed_database(db_session)
    dataset = db_session.query(BenchmarkDataset).first()
    providers = db_session.query(ProviderConfig).all()

    job = BenchmarkService.create_job(
        db=db_session,
        dataset_id=dataset.id,
        provider_ids=[p.id for p in providers]
    )

    # Execute job using test database session factory
    await BenchmarkService.execute_job(job.id, worker_id="test-worker", session_factory=session_factory)

    db_session.expire_all()
    updated_job = db_session.query(BenchmarkJob).filter(BenchmarkJob.id == job.id).first()
    assert updated_job.status in ("COMPLETED", "FAILED")
    assert updated_job.completed_requests > 0

    results = db_session.query(BenchmarkResult).filter(BenchmarkResult.job_id == job.id).all()
    assert len(results) > 0

    # Test retry preservation: retrying the job resets status to QUEUED
    # and keeps existing completed results
    BenchmarkService.retry_job(db_session, job.id)
    retried_job = db_session.query(BenchmarkJob).filter(BenchmarkJob.id == job.id).first()
    assert retried_job.status == "QUEUED"
    
    # Results are not deleted
    results_after_retry = db_session.query(BenchmarkResult).filter(BenchmarkResult.job_id == job.id).all()
    assert len(results_after_retry) == len(results)
