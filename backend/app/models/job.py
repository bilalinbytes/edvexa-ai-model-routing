import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Integer, Float, DateTime, JSON, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.core.database import Base

class BenchmarkJob(Base):
    __tablename__ = "benchmark_jobs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("benchmark_datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(30), default="QUEUED", nullable=False, index=True)  # QUEUED, RUNNING, COMPLETED, FAILED
    selected_provider_ids = Column(JSON, default=list, nullable=False)
    execution_config = Column(JSON, default=dict, nullable=False)
    
    total_cases = Column(Integer, default=0, nullable=False)
    total_requests = Column(Integer, default=0, nullable=False)
    completed_requests = Column(Integer, default=0, nullable=False)
    successful_requests = Column(Integer, default=0, nullable=False)
    failed_requests = Column(Integer, default=0, nullable=False)
    
    # Locking & Claim Mechanism for Async Workers
    worker_id = Column(String(100), nullable=True, index=True)
    claimed_at = Column(DateTime, nullable=True)
    heartbeat_at = Column(DateTime, nullable=True)
    
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    dataset = relationship("BenchmarkDataset", back_populates="jobs")
    results = relationship("BenchmarkResult", back_populates="job", cascade="all, delete-orphan", lazy="selectin")


class BenchmarkResult(Base):
    __tablename__ = "benchmark_results"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_id = Column(String(36), ForeignKey("benchmark_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    provider_id = Column(String(36), ForeignKey("providers.id", ondelete="CASCADE"), nullable=False, index=True)
    test_case_id = Column(String(36), ForeignKey("test_cases.id", ondelete="CASCADE"), nullable=False, index=True)
    attempt = Column(Integer, default=1, nullable=False)
    
    # Execution outcome
    is_success = Column(Boolean, nullable=False)
    response_content = Column(Text, nullable=True)
    error_type = Column(String(100), nullable=True)
    error_message = Column(Text, nullable=True)
    retryable = Column(Boolean, default=False, nullable=False)
    
    # Latency accounting (Wall clock vs simulated)
    wall_clock_latency_ms = Column(Float, nullable=False)  # Real measured elapsed execution duration
    simulated_latency_ms = Column(Float, nullable=True)     # For deterministic mocks
    
    # Token usage & Cost accounting (Strictly null if unknown - no fake 0)
    prompt_tokens = Column(Integer, nullable=True)
    completion_tokens = Column(Integer, nullable=True)
    total_tokens = Column(Integer, nullable=True)
    estimated_cost_usd = Column(Float, nullable=True)
    cost_provenance = Column(String(50), default="unknown", nullable=False)  # measured, simulated, estimated, unknown
    
    # Evaluation Engine details
    evaluator_name = Column(String(100), nullable=False)
    evaluator_version = Column(String(20), default="1.0.0", nullable=False)
    quality_score = Column(Float, default=0.0, nullable=False)  # Normalized [0.0 - 1.0]
    passed = Column(Boolean, default=False, nullable=False)
    evaluation_reason = Column(Text, nullable=False)
    
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    __table_args__ = (
        UniqueConstraint("job_id", "provider_id", "test_case_id", "attempt", name="uq_job_provider_case_attempt"),
    )

    job = relationship("BenchmarkJob", back_populates="results")
    provider = relationship("ProviderConfig", lazy="joined")
    test_case = relationship("TestCase", lazy="joined")
