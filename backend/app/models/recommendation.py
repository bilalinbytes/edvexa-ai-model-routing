import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, JSON, Text
from app.core.database import Base

class RecommendationAudit(Base):
    __tablename__ = "recommendation_audits"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    strategy = Column(String(50), nullable=False)  # lowest_cost, lowest_latency, highest_quality, balanced
    constraints = Column(JSON, default=dict, nullable=False)
    weights = Column(JSON, default=dict, nullable=False)
    
    dataset_id = Column(String(36), nullable=True, index=True)
    benchmark_job_id = Column(String(36), nullable=True, index=True)
    winner_provider_id = Column(String(36), nullable=True, index=True)
    winner_provider_name = Column(String(100), nullable=True)
    
    is_successful = Column(Boolean, default=True, nullable=False)
    explanation = Column(Text, nullable=False)
    trade_offs = Column(Text, nullable=False)
    candidates_evaluated = Column(JSON, default=list, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
