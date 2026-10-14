import asyncio
import logging
import uuid
import time
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, update

from app.core.database import SessionLocal
from app.models.job import BenchmarkJob, BenchmarkResult
from app.models.dataset import BenchmarkDataset, TestCase
from app.models.provider import ProviderConfig
from app.providers.registry import ProviderRegistry
from app.evaluators.registry import EvaluatorRegistry

logger = logging.getLogger(__name__)

class BenchmarkService:
    @staticmethod
    def create_job(
        db: Session,
        dataset_id: str,
        provider_ids: List[str],
        execution_config: Optional[Dict[str, Any]] = None
    ) -> BenchmarkJob:
        dataset = db.query(BenchmarkDataset).filter(BenchmarkDataset.id == dataset_id).first()
        if not dataset:
            raise ValueError(f"Dataset '{dataset_id}' not found")

        providers = db.query(ProviderConfig).filter(
            ProviderConfig.id.in_(provider_ids),
            ProviderConfig.is_enabled == True
        ).all()
        if not providers:
            raise ValueError("No enabled providers found for specified provider IDs")

        cases = db.query(TestCase).filter(TestCase.dataset_id == dataset_id).all()
        if not cases:
            raise ValueError(f"Dataset '{dataset_id}' contains zero test cases")

        cfg = execution_config or {}
        job = BenchmarkJob(
            dataset_id=dataset_id,
            status="QUEUED",
            selected_provider_ids=[p.id for p in providers],
            execution_config=cfg,
            total_cases=len(cases),
            total_requests=len(cases) * len(providers),
            completed_requests=0,
            successful_requests=0,
            failed_requests=0
        )
        db.add(job)
        db.commit()
        db.refresh(job)
        return job

    @staticmethod
    def claim_job(db: Session, job_id: str, worker_id: str, stale_timeout_sec: int = 60) -> bool:
        """
        Atomically claim a job for processing.
        Prevents multiple workers from concurrently executing the same benchmark job.
        Recovers stale jobs stuck in RUNNING without a recent heartbeat.
        """
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        stale_cutoff = now - timedelta(seconds=stale_timeout_sec)

        # Atomic update with WHERE filter and synchronize_session=False
        stmt = (
            update(BenchmarkJob)
            .execution_options(synchronize_session=False)
            .where(
                and_(
                    BenchmarkJob.id == job_id,
                    or_(
                        BenchmarkJob.status == "QUEUED",
                        and_(
                            BenchmarkJob.status == "RUNNING",
                            BenchmarkJob.heartbeat_at < stale_cutoff
                        )
                    )
                )
            )
            .values(
                status="RUNNING",
                worker_id=worker_id,
                claimed_at=now,
                heartbeat_at=now,
                started_at=func_coalesce_started_at(BenchmarkJob.started_at, now)
            )
        )
        res = db.execute(stmt)
        db.commit()
        return res.rowcount > 0

    @staticmethod
    def update_heartbeat(db: Session, job_id: str):
        db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).update({
            "heartbeat_at": datetime.now(timezone.utc).replace(tzinfo=None)
        })
        db.commit()

    @staticmethod
    async def execute_job(job_id: str, worker_id: Optional[str] = None, session_factory=None):
        """
        Main execution loop for a benchmark job.
        Runs all test cases against selected providers with bounded retries and idempotency.
        """
        import app.core.database as db_mod
        get_session = session_factory or db_mod.SessionLocal
        worker_id = worker_id or f"worker-{uuid.uuid4().hex[:8]}"
        
        with get_session() as db:
            claimed = BenchmarkService.claim_job(db, job_id, worker_id)
            if not claimed:
                logger.warning(f"Worker {worker_id} could not claim job {job_id} (already active or finished).")
                return

            job = db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).first()
            if not job:
                return

            dataset_id = job.dataset_id
            selected_provider_ids = job.selected_provider_ids
            cfg = job.execution_config or {}
            max_retries_limit = cfg.get("max_retries", 3)
            
            providers = db.query(ProviderConfig).filter(ProviderConfig.id.in_(selected_provider_ids)).all()
            test_cases = db.query(TestCase).filter(TestCase.dataset_id == dataset_id).all()

        provider_map = {p.id: p for p in providers}

        total_completed = 0
        total_successful = 0
        total_failed = 0

        # Execute all combinations
        for case in test_cases:
            for prov_id in selected_provider_ids:
                prov_config = provider_map.get(prov_id)
                if not prov_config:
                    continue

                with get_session() as db:
                    # Check if already completed successfully in a previous run (Idempotent retry preservation)
                    existing_success = db.query(BenchmarkResult).filter(
                        BenchmarkResult.job_id == job_id,
                        BenchmarkResult.provider_id == prov_id,
                        BenchmarkResult.test_case_id == case.id,
                        BenchmarkResult.is_success == True
                    ).first()

                    if existing_success:
                        total_completed += 1
                        total_successful += 1
                        continue

                    # Count past failed attempts for this case
                    past_attempts = db.query(BenchmarkResult).filter(
                        BenchmarkResult.job_id == job_id,
                        BenchmarkResult.provider_id == prov_id,
                        BenchmarkResult.test_case_id == case.id
                    ).count()

                provider_instance = ProviderRegistry.get_provider({
                    "name": prov_config.name,
                    "identifier": prov_config.identifier,
                    "provider_type": prov_config.provider_type,
                    "is_mock": prov_config.is_mock,
                    "capabilities": prov_config.capabilities or [],
                    "simulated_latency_ms": prov_config.simulated_latency_ms,
                    "simulated_cost_per_1k_tokens": prov_config.simulated_cost_per_1k_tokens,
                    "simulated_failure_rate": prov_config.simulated_failure_rate,
                    "timeout_seconds": prov_config.timeout_seconds
                })

                # Bounded retry loop
                max_retries = min(prov_config.max_retries, max_retries_limit)
                case_succeeded = False
                current_attempt = past_attempts + 1

                for attempt in range(current_attempt, current_attempt + max_retries):
                    try:
                        # Enforce provider timeout
                        response = await asyncio.wait_for(
                            provider_instance.execute(
                                prompt=case.prompt,
                                task_type=case.task_type,
                                test_case_id=case.id,
                                expected_output=case.expected_output,
                                evaluator_config=case.evaluator_config,
                                metadata=case.metadata_json
                            ),
                            timeout=prov_config.timeout_seconds
                        )
                    except asyncio.TimeoutError:
                        response = None
                        error_type = "TimeoutError"
                        error_message = f"Execution exceeded provider timeout of {prov_config.timeout_seconds}s"
                        retryable = True
                    except Exception as exc:
                        response = None
                        error_type = type(exc).__name__
                        error_message = str(exc)
                        retryable = True

                    # Evaluate if response was received
                    if response and response.is_success:
                        eval_result = EvaluatorRegistry.evaluate(
                            evaluator_type=case.evaluator_type,
                            response_content=response.content,
                            expected_output=case.expected_output,
                            evaluator_config=case.evaluator_config,
                            test_case_metadata=case.metadata_json
                        )

                        result_record = BenchmarkResult(
                            job_id=job_id,
                            provider_id=prov_id,
                            test_case_id=case.id,
                            attempt=attempt,
                            is_success=True,
                            response_content=response.content,
                            error_type=None,
                            error_message=None,
                            retryable=False,
                            wall_clock_latency_ms=response.wall_clock_latency_ms,
                            simulated_latency_ms=response.simulated_latency_ms,
                            prompt_tokens=response.prompt_tokens,
                            completion_tokens=response.completion_tokens,
                            total_tokens=response.total_tokens,
                            estimated_cost_usd=response.estimated_cost_usd,
                            cost_provenance=response.cost_provenance,
                            evaluator_name=eval_result.evaluator_name,
                            evaluator_version=eval_result.evaluator_version,
                            quality_score=eval_result.quality_score,
                            passed=eval_result.passed,
                            evaluation_reason=eval_result.reason,
                            metadata_json=eval_result.metadata
                        )
                        case_succeeded = True
                    else:
                        # Record failure outcome
                        err_type = response.error_type if response else error_type
                        err_msg = response.error_message if response else error_message
                        is_retryable = response.retryable if response else retryable

                        result_record = BenchmarkResult(
                            job_id=job_id,
                            provider_id=prov_id,
                            test_case_id=case.id,
                            attempt=attempt,
                            is_success=False,
                            response_content=None,
                            error_type=err_type,
                            error_message=err_msg,
                            retryable=is_retryable,
                            wall_clock_latency_ms=response.wall_clock_latency_ms if response else 0.0,
                            simulated_latency_ms=response.simulated_latency_ms if response else None,
                            prompt_tokens=response.prompt_tokens if response else None,
                            completion_tokens=0,
                            total_tokens=response.prompt_tokens if response else None,
                            estimated_cost_usd=0.0 if (response and response.estimated_cost_usd is not None) else None,
                            cost_provenance="simulated" if prov_config.is_mock else "unknown",
                            evaluator_name=case.evaluator_type,
                            evaluator_version="1.0.0",
                            quality_score=0.0,
                            passed=False,
                            evaluation_reason=f"Provider failed: [{err_type}] {err_msg}",
                            metadata_json={"attempt": attempt}
                        )

                    # Persist single result idempotently
                    with get_session() as db:
                        try:
                            db.add(result_record)
                            db.commit()
                        except Exception as e:
                            db.rollback()
                            logger.error(f"Failed to persist benchmark result: {e}")

                    if case_succeeded:
                        total_successful += 1
                        break
                    elif not is_retryable:
                        # Non-retryable error: stop retrying this test case immediately
                        break
                    else:
                        # Bounded exponential backoff
                        backoff = 0.02 * (2 ** (attempt - current_attempt))
                        await asyncio.sleep(min(backoff, 0.5))

                total_completed += 1
                if not case_succeeded:
                    total_failed += 1

                # Update job progress in database
                with get_session() as db:
                    db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).update({
                        "completed_requests": total_completed,
                        "successful_requests": total_successful,
                        "failed_requests": total_failed,
                        "heartbeat_at": datetime.now(timezone.utc).replace(tzinfo=None)
                    })
                    db.commit()

        # Final state transition
        with get_session() as db:
            final_status = "COMPLETED" if total_successful > 0 or total_failed < len(test_cases) * len(selected_provider_ids) else "FAILED"
            db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).update({
                "status": final_status,
                "completed_at": datetime.now(timezone.utc).replace(tzinfo=None),
                "heartbeat_at": datetime.now(timezone.utc).replace(tzinfo=None)
            })
            db.commit()
            logger.info(f"Job {job_id} completed with status {final_status}. Success: {total_successful}, Failed: {total_failed}")

    @staticmethod
    def retry_job(db: Session, job_id: str) -> BenchmarkJob:
        """
        Allows retrying a failed or partially failed job without duplicating existing valid completed results.
        Resets status to QUEUED so a worker can claim and continue.
        """
        job = db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).first()
        if not job:
            raise ValueError(f"Job '{job_id}' not found")

        job.status = "QUEUED"
        job.worker_id = None
        job.claimed_at = None
        job.error_message = None
        db.commit()
        db.refresh(job)
        return job

def func_coalesce_started_at(col, default_val):
    from sqlalchemy import case
    return case((col.is_(None), default_val), else_=col)
