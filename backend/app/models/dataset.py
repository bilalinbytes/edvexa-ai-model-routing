import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, Float, DateTime, JSON, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base

class BenchmarkDataset(Base):
    __tablename__ = "benchmark_datasets"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(150), nullable=False, index=True)
    description = Column(Text, nullable=True)
    version = Column(String(20), default="1.0.0", nullable=False)
    is_seeded = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    test_cases = relationship("TestCase", back_populates="dataset", cascade="all, delete-orphan", lazy="selectin")
    jobs = relationship("BenchmarkJob", back_populates="dataset", cascade="all, delete-orphan")


class TestCase(Base):
    __tablename__ = "test_cases"
    __test__ = False

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    dataset_id = Column(String(36), ForeignKey("benchmark_datasets.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(150), nullable=False)
    task_type = Column(String(50), nullable=False)  # exact_match, rule_check, json_validation, summarization, adversarial_failure
    prompt = Column(Text, nullable=False)
    expected_output = Column(Text, nullable=True)
    evaluator_type = Column(String(50), nullable=False)  # exact_match, rule_based, response_validity, text_similarity
    evaluator_config = Column(JSON, default=dict, nullable=False)
    required_capabilities = Column(JSON, default=list, nullable=False)
    weight = Column(Float, default=1.0, nullable=False)
    metadata_json = Column(JSON, default=dict, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    dataset = relationship("BenchmarkDataset", back_populates="test_cases")
