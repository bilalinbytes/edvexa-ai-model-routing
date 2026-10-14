from typing import Dict, Type, Optional, Any
from app.evaluators.base import BaseEvaluator, EvaluationResult
from app.evaluators.implementations import (
    ExactMatchEvaluator,
    RuleBasedEvaluator,
    ResponseValidityEvaluator,
    TextSimilarityEvaluator
)

class EvaluatorRegistry:
    _evaluators: Dict[str, BaseEvaluator] = {
        "exact_match": ExactMatchEvaluator(),
        "rule_based": RuleBasedEvaluator(),
        "response_validity": ResponseValidityEvaluator(),
        "text_similarity": TextSimilarityEvaluator()
    }

    @classmethod
    def get(cls, evaluator_type: str) -> BaseEvaluator:
        if evaluator_type in cls._evaluators:
            return cls._evaluators[evaluator_type]
        # Match case-insensitively or return exact match as default
        lower_key = evaluator_type.lower()
        if lower_key in cls._evaluators:
            return cls._evaluators[lower_key]
        return cls._evaluators["response_validity"]

    @classmethod
    def evaluate(
        cls,
        evaluator_type: str,
        response_content: Optional[str],
        expected_output: Optional[str] = None,
        evaluator_config: Optional[Dict[str, Any]] = None,
        test_case_metadata: Optional[Dict[str, Any]] = None
    ) -> EvaluationResult:
        evaluator = cls.get(evaluator_type)
        try:
            return evaluator.evaluate(
                response_content=response_content,
                expected_output=expected_output,
                evaluator_config=evaluator_config,
                test_case_metadata=test_case_metadata
            )
        except Exception as e:
            # Absolute safety net: ensure an unhandled evaluation bug never crashes the benchmark run
            return EvaluationResult(
                evaluator_name=evaluator.name,
                evaluator_version=evaluator.version,
                quality_score=0.0,
                passed=False,
                reason=f"Evaluator execution exception: {str(e)[:100]}",
                metadata={"exception": str(e)}
            )
