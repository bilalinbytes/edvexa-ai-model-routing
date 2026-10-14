from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from app.schemas.job import BenchmarkJobRead
from app.schemas.recommendation import RecommendationAuditRead

class ProviderOverview(BaseModel):
    id: str
    name: str
    identifier: str
    is_enabled: bool
    is_mock: bool
    capabilities: List[str]
    total_evaluations: int
    success_rate: float
    avg_quality_score: float
    avg_latency_ms: float
    avg_cost_usd: Optional[float] = None
    cost_provenance: str

class DashboardOverviewRead(BaseModel):
    total_benchmark_jobs: int
    total_evaluations: int
    successful_evaluations: int
    failed_evaluations: int
    overall_success_rate: float
    average_quality_score: float
    average_latency_ms: float
    total_estimated_cost_usd: Optional[float] = None
    active_providers_count: int
    total_providers_count: int
    datasets_count: int
    recent_jobs: List[BenchmarkJobRead]
    provider_breakdown: List[ProviderOverview]
    latest_recommendations: List[RecommendationAuditRead]
    has_benchmark_data: bool

class ComparisonMatrixItem(BaseModel):
    provider_id: str
    provider_name: str
    identifier: str
    is_mock: bool
    total_samples: int
    success_count: int
    failure_count: int
    success_rate: float
    avg_quality: float
    avg_wall_clock_latency_ms: float
    avg_simulated_latency_ms: Optional[float]
    avg_cost_usd: Optional[float]
    cost_provenance: str
    pass_rate: float
