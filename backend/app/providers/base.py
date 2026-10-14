from abc import ABC, abstractmethod
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field
import time

class ProviderResponse(BaseModel):
    content: Optional[str] = None
    is_success: bool = True
    error_type: Optional[str] = None
    error_message: Optional[str] = None
    retryable: bool = False
    
    # Latency tracking
    wall_clock_latency_ms: float = 0.0  # Measured wall-clock time
    simulated_latency_ms: Optional[float] = None  # Transparently labeled simulated latency
    
    # Cost & token tracking (null if unknown)
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    total_tokens: Optional[int] = None
    estimated_cost_usd: Optional[float] = None
    cost_provenance: str = "unknown"  # "simulated", "estimated", "measured", "unknown"
    
    raw_metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseProvider(ABC):
    def __init__(self, config_dict: Dict[str, Any]):
        self.config = config_dict
        self.identifier = config_dict.get("identifier", "unknown")
        self.name = config_dict.get("name", "Unknown Provider")
        self.is_mock = config_dict.get("is_mock", True)
        self.capabilities: List[str] = config_dict.get("capabilities", [])
        self.simulated_latency_ms: int = config_dict.get("simulated_latency_ms", 150)
        self.simulated_cost_per_1k: float = config_dict.get("simulated_cost_per_1k_tokens", 0.001)
        self.simulated_failure_rate: float = config_dict.get("simulated_failure_rate", 0.0)
        self.timeout_seconds: float = config_dict.get("timeout_seconds", 10.0)

    @abstractmethod
    async def execute(
        self,
        prompt: str,
        task_type: str,
        test_case_id: str,
        expected_output: Optional[str] = None,
        evaluator_config: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ProviderResponse:
        """Execute a prompt against the model provider asynchronously."""
        pass

    def estimate_tokens(self, text: str) -> int:
        """Deterministic token approximation for mock models (1 token ~= 4 chars)."""
        if not text:
            return 0
        return max(1, len(text.strip().split()) * 4 // 3)
