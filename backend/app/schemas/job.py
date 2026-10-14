from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class BenchmarkJobCreate(BaseModel):
    dataset_id: str
    provider_ids: List[str] = Field(..., min_length=1)
    execution_config: Dict[str, Any] = Field(default_factory=dict)

class BenchmarkResultRead(BaseModel):
    id: str
    job_id: str
    provider_id: str
    provider_name: Optional[str] = None
    test_case_id: str
    test_case_name: Optional[str] = None
    attempt: int
    is_success: bool
    response_content: Optional[str] = None
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    retryable: bool
    wall_clock_latency_ms: float
    simulated_latency_ms: Optional[float] = None
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    estimated_cost_usd: Optional[float] = None
    cost_provenance: str
    evaluator_name: str
    evaluator_version: str
    quality_score: float
    passed: bool
    evaluation_reason: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BenchmarkJobRead(BaseModel):
    id: str
    dataset_id: str
    dataset_name: Optional[str] = None
    status: str
    selected_provider_ids: List[str]
    execution_config: Dict[str, Any]
    total_cases: int
    total_requests: int
    completed_requests: int
    successful_requests: int
    failed_requests: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BenchmarkJobDetailRead(BenchmarkJobRead):
    results: List[BenchmarkResultRead] = Field(default_factory=list)
