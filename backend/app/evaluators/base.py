from abc import ABC, abstractmethod
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class EvaluationResult(BaseModel):
    evaluator_name: str
    evaluator_version: str = "1.0.0"
    quality_score: float = Field(ge=0.0, le=1.0)  # Normalized to [0.0 - 1.0]
    passed: bool
    reason: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class BaseEvaluator(ABC):
    name: str = "base_evaluator"
    version: str = "1.0.0"

    @abstractmethod
    def evaluate(
        self,
        response_content: Optional[str],
        expected_output: Optional[str] = None,
        evaluator_config: Optional[Dict[str, Any]] = None,
        test_case_metadata: Optional[Dict[str, Any]] = None
    ) -> EvaluationResult:
        """
        Evaluate candidate model response against criteria.
        Guaranteed to never raise an unhandled exception.
        Always returns a normalized quality score between 0.0 and 1.0.
        """
        pass
