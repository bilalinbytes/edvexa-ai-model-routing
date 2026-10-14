import asyncio
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks, Query
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.job import BenchmarkJob, BenchmarkResult
from app.models.provider import ProviderConfig
from app.models.dataset import BenchmarkDataset, TestCase
from app.schemas.job import (
    BenchmarkJobCreate, BenchmarkJobRead, BenchmarkJobDetailRead, BenchmarkResultRead
)
from app.schemas.overview import ComparisonMatrixItem
from app.services.benchmark_service import BenchmarkService

router = APIRouter(prefix="/benchmarks", tags=["Benchmarks"])

@router.get("", response_model=List[BenchmarkJobRead])
def list_benchmark_jobs(
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db)
):
    query = db.query(BenchmarkJob).order_by(BenchmarkJob.created_at.desc())
    if status_filter:
        query = query.filter(BenchmarkJob.status == status_filter.upper())
    jobs = query.all()

    results = []
    for j in jobs:
        read_j = BenchmarkJobRead.model_validate(j)
        read_j.dataset_name = j.dataset.name if j.dataset else "Unknown Dataset"
        results.append(read_j)
    return results

@router.post("", response_model=BenchmarkJobRead, status_code=status.HTTP_202_ACCEPTED)
async def create_and_run_benchmark(
    payload: BenchmarkJobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    try:
        job = BenchmarkService.create_job(
            db=db,
            dataset_id=payload.dataset_id,
            provider_ids=payload.provider_ids,
            execution_config=payload.execution_config
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # Trigger asynchronous background execution
    # In-process asyncio task guarantees reliable development execution without requiring external Redis
    background_tasks.add_task(BenchmarkService.execute_job, job.id)

    read_j = BenchmarkJobRead.model_validate(job)
    read_j.dataset_name = job.dataset.name if job.dataset else "Dataset"
    return read_j

@router.get("/{job_id}", response_model=BenchmarkJobRead)
def get_benchmark_job(job_id: str, db: Session = Depends(get_db)):
    job = db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark job not found")

    read_j = BenchmarkJobRead.model_validate(job)
    read_j.dataset_name = job.dataset.name if job.dataset else "Unknown"
    return read_j

@router.get("/{job_id}/results", response_model=List[BenchmarkResultRead])
def get_benchmark_results(
    job_id: str,
    provider_id: Optional[str] = Query(None),
    test_case_id: Optional[str] = Query(None),
    is_success: Optional[bool] = Query(None),
    db: Session = Depends(get_db)
):
    job = db.query(BenchmarkJob).filter(BenchmarkJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Benchmark job not found")

    query = db.query(BenchmarkResult).filter(BenchmarkResult.job_id == job_id)
    if provider_id:
        query = query.filter(BenchmarkResult.provider_id == provider_id)
    if test_case_id:
        query = query.filter(BenchmarkResult.test_case_id == test_case_id)
    if is_success is not None:
        query = query.filter(BenchmarkResult.is_success == is_success)

    results = query.order_by(BenchmarkResult.created_at.asc()).all()
    output = []
    for r in results:
        res_read = BenchmarkResultRead.model_validate(r)
        res_read.provider_name = r.provider.name if r.provider else "Unknown Provider"
        res_read.test_case_name = r.test_case.name if r.test_case else "Unknown Test Case"
        output.append(res_read)
    return output

@router.post("/{job_id}/retry", response_model=BenchmarkJobRead)
async def retry_benchmark_job(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    try:
        job = BenchmarkService.retry_job(db, job_id)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    background_tasks.add_task(BenchmarkService.execute_job, job.id)
    read_j = BenchmarkJobRead.model_validate(job)
    read_j.dataset_name = job.dataset.name if job.dataset else "Dataset"
    return read_j

@router.get("/compare/matrix", response_model=List[ComparisonMatrixItem])
def get_comparison_matrix(
    dataset_id: Optional[str] = Query(None),
    job_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    providers = db.query(ProviderConfig).all()
    matrix: List[ComparisonMatrixItem] = []

    for p in providers:
        query = db.query(BenchmarkResult).filter(BenchmarkResult.provider_id == p.id)
        if job_id:
            query = query.filter(BenchmarkResult.job_id == job_id)
        elif dataset_id:
            query = query.join(BenchmarkJob).filter(BenchmarkJob.dataset_id == dataset_id)

        results = query.all()
        total_samples = len(results)
        if total_samples == 0:
            continue

        success_results = [r for r in results if r.is_success]
        success_count = len(success_results)
        failure_count = total_samples - success_count
        success_rate = round(success_count / float(total_samples), 4)

        avg_quality = (
            sum(r.quality_score for r in success_results) / float(success_count)
            if success_count > 0 else 0.0
        )
        avg_wall_clock = (
            sum(r.wall_clock_latency_ms for r in success_results) / float(success_count)
            if success_count > 0 else 0.0
        )
        
        sim_lats = [r.simulated_latency_ms for r in success_results if r.simulated_latency_ms is not None]
        avg_sim_lat = (sum(sim_lats) / float(len(sim_lats))) if sim_lats else (float(p.simulated_latency_ms) if p.is_mock else None)

        valid_costs = [r.estimated_cost_usd for r in success_results if r.estimated_cost_usd is not None]
        avg_cost = (sum(valid_costs) / float(len(valid_costs))) if valid_costs else None
        cost_prov = "simulated" if p.is_mock else ("estimated" if valid_costs else "unknown")

        passed_count = sum(1 for r in success_results if r.passed)
        pass_rate = round(passed_count / float(success_count), 4) if success_count > 0 else 0.0

        matrix.append(ComparisonMatrixItem(
            provider_id=p.id,
            provider_name=p.name,
            identifier=p.identifier,
            is_mock=p.is_mock,
            total_samples=total_samples,
            success_count=success_count,
            failure_count=failure_count,
            success_rate=success_rate,
            avg_quality=round(avg_quality, 4),
            avg_wall_clock_latency_ms=round(avg_wall_clock, 2),
            avg_simulated_latency_ms=round(avg_sim_lat, 2) if avg_sim_lat is not None else None,
            avg_cost_usd=round(avg_cost, 6) if avg_cost is not None else None,
            cost_provenance=cost_prov,
            pass_rate=pass_rate
        ))

    return matrix
