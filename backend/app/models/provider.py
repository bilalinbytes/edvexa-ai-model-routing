import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, JSON, Text
from app.core.database import Base

class ProviderConfig(Base):
    __tablename__ = "providers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    identifier = Column(String(100), unique=True, nullable=False, index=True)
    provider_type = Column(String(50), nullable=False, default="mock")
    is_enabled = Column(Boolean, default=True, nullable=False)
    is_mock = Column(Boolean, default=True, nullable=False)
    capabilities = Column(JSON, default=list, nullable=False)  # List of capability tags
    simulated_latency_ms = Column(Integer, default=150, nullable=False)
    simulated_cost_per_1k_tokens = Column(Float, default=0.001, nullable=False)
    simulated_failure_rate = Column(Float, default=0.0, nullable=False)  # 0.0 to 1.0
    timeout_seconds = Column(Float, default=10.0, nullable=False)
    max_retries = Column(Integer, default=2, nullable=False)
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)
