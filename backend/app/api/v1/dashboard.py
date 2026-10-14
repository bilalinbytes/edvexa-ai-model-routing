from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.job import BenchmarkJob, BenchmarkResult
from app.models.provider import ProviderConfig
from app.models.dataset import BenchmarkDataset
from app.models.recommendation import RecommendationAudit
from app.schemas.overview import DashboardOverviewRead, ProviderOverview
from app.schemas.job import BenchmarkJobRead
from app.schemas.recommendation import RecommendationAuditRead

router = APIRouter(prefix="/dashboard", tags=["Dashboard & Metrics"])

@router.get("/overview", response_model=DashboardOverviewRead)
def get_dashboard_overview(db: Session = Depends(get_db)):
    total_jobs = db.query(BenchmarkJob).count()
    all_results = db.query(BenchmarkResult).all()
    total_evals = len(all_results)
    
    successful_results = [r for r in all_results if r.is_success]
    failed_results = [r for r in all_results if not r.is_success]
    
    success_count = len(successful_results)
    failed_count = len(failed_results)
    overall_success_rate = round(success_count / float(total_evals), 4) if total_evals > 0 else 0.0

    avg_quality = (
        sum(r.quality_score for r in successful_results) / float(success_count)
        if success_count > 0 else 0.0
    )
    
    latencies = [
        (r.simulated_latency_ms if r.simulated_latency_ms is not None else r.wall_clock_latency_ms)
        for r in successful_results
    ]
    avg_latency = (sum(latencies) / float(len(latencies))) if latencies else 0.0

    known_costs = [r.estimated_cost_usd for r in successful_results if r.estimated_cost_usd is not None]
    total_cost = sum(known_costs) if known_costs else None

    # Providers info
    all_providers = db.query(ProviderConfig).all()
    total_providers = len(all_providers)
    active_providers = sum(1 for p in all_providers if p.is_enabled)
    datasets_count = db.query(BenchmarkDataset).count()

    # Provider breakdown
    provider_breakdown = []
    for p in all_providers:
        p_results = [r for r in all_results if r.provider_id == p.id]
        p_success = [r for r in p_results if r.is_success]
        p_total = len(p_results)
        p_rate = round(len(p_success) / float(p_total), 4) if p_total > 0 else 0.0
        p_quality = (sum(r.quality_score for r in p_success) / float(len(p_success))) if p_success else 0.0
        
        p_lats = [(r.simulated_latency_ms if r.simulated_latency_ms is not None else r.wall_clock_latency_ms) for r in p_success]
        p_avg_lat = (sum(p_lats) / float(len(p_lats))) if p_lats else float(p.simulated_latency_ms)
        
        p_costs = [r.estimated_cost_usd for r in p_success if r.estimated_cost_usd is not None]
        p_avg_cost = (sum(p_costs) / float(len(p_costs))) if p_costs else None
        p_prov = "simulated" if p.is_mock else ("estimated" if p_costs else "unknown")

        provider_breakdown.append(ProviderOverview(
            id=p.id,
            name=p.name,
            identifier=p.identifier,
            is_enabled=p.is_enabled,
            is_mock=p.is_mock,
            capabilities=p.capabilities or [],
            total_evaluations=p_total,
            success_rate=p_rate,
            avg_quality_score=round(p_quality, 4),
            avg_latency_ms=round(p_avg_lat, 2),
            avg_cost_usd=round(p_avg_cost, 6) if p_avg_cost is not None else None,
            cost_provenance=p_prov
        ))

    # Recent jobs (limit 5)
    recent_jobs_db = db.query(BenchmarkJob).order_by(BenchmarkJob.created_at.desc()).limit(5).all()
    recent_jobs = []
    for j in recent_jobs_db:
        read_j = BenchmarkJobRead.model_validate(j)
        read_j.dataset_name = j.dataset.name if j.dataset else "Dataset"
        recent_jobs.append(read_j)

    # Latest recommendations (limit 5)
    recent_audits_db = db.query(RecommendationAudit).order_by(RecommendationAudit.created_at.desc()).limit(5).all()
    latest_recs = [RecommendationAuditRead.model_validate(a) for a in recent_audits_db]

    return DashboardOverviewRead(
        total_benchmark_jobs=total_jobs,
        total_evaluations=total_evals,
        successful_evaluations=success_count,
        failed_evaluations=failed_count,
        overall_success_rate=overall_success_rate,
        average_quality_score=round(avg_quality, 4),
        average_latency_ms=round(avg_latency, 2),
        total_estimated_cost_usd=round(total_cost, 6) if total_cost is not None else None,
        active_providers_count=active_providers,
        total_providers_count=total_providers,
        datasets_count=datasets_count,
        recent_jobs=recent_jobs,
        provider_breakdown=provider_breakdown,
        latest_recommendations=latest_recs,
        has_benchmark_data=(total_evals > 0)
    )
