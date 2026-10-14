from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.services.recommendation_engine import (
    RecommendationConstraints,
    RecommendationWeights,
    ProviderEvaluationCandidate
)

class RecommendationRequest(BaseModel):
    strategy: str = Field(default="balanced")  # lowest_cost, lowest_latency, highest_quality, balanced
    constraints: Optional[RecommendationConstraints] = None
    weights: Optional[RecommendationWeights] = None
    dataset_id: Optional[str] = None
    benchmark_job_id: Optional[str] = None
    persist_audit: bool = True

class RecommendationResponse(BaseModel):
    is_successful: bool
    winner_provider_id: Optional[str] = None
    winner_provider_name: Optional[str] = None
    strategy: str
    explanation: str
    trade_offs: str
    candidates_evaluated: List[ProviderEvaluationCandidate]
    audit_id: Optional[str] = None

class RecommendationAuditRead(BaseModel):
    id: str
    strategy: str
    constraints: Dict[str, Any]
    weights: Dict[str, Any]
    dataset_id: Optional[str] = None
    benchmark_job_id: Optional[str] = None
    winner_provider_id: Optional[str] = None
    winner_provider_name: Optional[str] = None
    is_successful: bool
    explanation: str
    trade_offs: str
    candidates_evaluated: List[Dict[str, Any]]
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
