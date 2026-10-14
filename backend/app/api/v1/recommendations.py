from fastapi import APIRouter, Depends, Query, status
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.recommendation import RecommendationAudit
from app.schemas.recommendation import (
    RecommendationRequest,
    RecommendationResponse,
    RecommendationAuditRead
)
from app.services.recommendation_engine import RecommendationEngine

router = APIRouter(prefix="/recommendations", tags=["Intelligent Routing & Recommendations"])

@router.post("", response_model=RecommendationResponse, status_code=status.HTTP_200_OK)
def get_recommendation(payload: RecommendationRequest, db: Session = Depends(get_db)):
    result = RecommendationEngine.evaluate_and_route(
        db=db,
        strategy=payload.strategy,
        constraints=payload.constraints,
        weights=payload.weights,
        dataset_id=payload.dataset_id,
        benchmark_job_id=payload.benchmark_job_id,
        persist_audit=payload.persist_audit
    )
    return RecommendationResponse(
        is_successful=result.is_successful,
        winner_provider_id=result.winner_provider_id,
        winner_provider_name=result.winner_provider_name,
        strategy=result.strategy,
        explanation=result.explanation,
        trade_offs=result.trade_offs,
        candidates_evaluated=result.candidates_evaluated,
        audit_id=result.audit_id
    )

@router.get("/history", response_model=List[RecommendationAuditRead])
def get_recommendation_history(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    audits = (
        db.query(RecommendationAudit)
        .order_by(RecommendationAudit.created_at.desc())
        .limit(limit)
        .all()
    )
    return audits
