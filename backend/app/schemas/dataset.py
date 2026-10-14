from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class TestCaseBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    task_type: str = Field(default="exact_match")
    prompt: str = Field(..., min_length=1)
    expected_output: Optional[str] = None
    evaluator_type: str = Field(default="exact_match")
    evaluator_config: Dict[str, Any] = Field(default_factory=dict)
    required_capabilities: List[str] = Field(default_factory=list)
    weight: float = Field(default=1.0, ge=0.1, le=10.0)
    metadata_json: Dict[str, Any] = Field(default_factory=dict)

class TestCaseCreate(TestCaseBase):
    pass

class TestCaseUpdate(BaseModel):
    name: Optional[str] = None
    task_type: Optional[str] = None
    prompt: Optional[str] = None
    expected_output: Optional[str] = None
    evaluator_type: Optional[str] = None
    evaluator_config: Optional[Dict[str, Any]] = None
    required_capabilities: Optional[List[str]] = None
    weight: Optional[float] = None
    metadata_json: Optional[Dict[str, Any]] = None

class TestCaseRead(TestCaseBase):
    id: str
    dataset_id: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class DatasetBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=150)
    description: Optional[str] = None
    version: str = Field(default="1.0.0")

class DatasetCreate(DatasetBase):
    test_cases: Optional[List[TestCaseCreate]] = None

class DatasetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    version: Optional[str] = None

class DatasetRead(DatasetBase):
    id: str
    is_seeded: bool
    created_at: datetime
    updated_at: datetime
    test_case_count: int = 0

    model_config = ConfigDict(from_attributes=True)

class DatasetDetailRead(DatasetRead):
    test_cases: List[TestCaseRead] = Field(default_factory=list)
