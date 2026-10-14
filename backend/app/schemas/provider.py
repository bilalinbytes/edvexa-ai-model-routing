from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class ProviderBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    identifier: str = Field(..., min_length=2, max_length=100)
    provider_type: str = Field(default="mock")
    is_enabled: bool = True
    is_mock: bool = True
    capabilities: List[str] = Field(default_factory=list)
    simulated_latency_ms: int = Field(default=150, ge=1)
    simulated_cost_per_1k_tokens: float = Field(default=0.001, ge=0.0)
    simulated_failure_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    timeout_seconds: float = Field(default=10.0, ge=0.5, le=120.0)
    max_retries: int = Field(default=2, ge=0, le=10)
    metadata_json: Dict[str, Any] = Field(default_factory=dict)

class ProviderCreate(ProviderBase):
    pass

class ProviderUpdate(BaseModel):
    name: Optional[str] = None
    provider_type: Optional[str] = None
    is_enabled: Optional[bool] = None
    capabilities: Optional[List[str]] = None
    simulated_latency_ms: Optional[int] = None
    simulated_cost_per_1k_tokens: Optional[float] = None
    simulated_failure_rate: Optional[float] = None
    timeout_seconds: Optional[float] = None
    max_retries: Optional[int] = None
    metadata_json: Optional[Dict[str, Any]] = None

class ProviderRead(ProviderBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
