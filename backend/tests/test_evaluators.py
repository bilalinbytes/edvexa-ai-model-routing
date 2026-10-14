import pytest
from app.evaluators.registry import EvaluatorRegistry

def test_exact_match_evaluator_success():
    res = EvaluatorRegistry.evaluate(
        evaluator_type="exact_match",
        response_content="Paris",
        expected_output="paris",
        evaluator_config={"case_sensitive": False, "strip_whitespace": True}
    )
    assert res.passed is True
    assert res.quality_score == 1.0

def test_exact_match_evaluator_mismatch():
    res = EvaluatorRegistry.evaluate(
        evaluator_type="exact_match",
        response_content="London",
        expected_output="Paris",
        evaluator_config={"case_sensitive": False}
    )
    assert res.passed is False
    assert res.quality_score == 0.0

def test_exact_match_null_handling():
    res = EvaluatorRegistry.evaluate(
        evaluator_type="exact_match",
        response_content=None,
        expected_output="test"
    )
    assert res.passed is False
    assert res.quality_score == 0.0

def test_rule_based_regex_and_substring():
    res = EvaluatorRegistry.evaluate(
        evaluator_type="rule_based",
        response_content="Log: Status: ACTIVE. Code 200 returned.",
        evaluator_config={
            "regex": r"Status:\s*ACTIVE",
            "required_substrings": ["200"],
            "disallowed_substrings": ["ERROR"]
        }
    )
    assert res.passed is True
    assert res.quality_score == 1.0

def test_rule_based_json_validation():
    valid_json = '{"status": "ok", "summary": "test passed", "confidence": 0.95}'
    res = EvaluatorRegistry.evaluate(
        evaluator_type="rule_based",
        response_content=valid_json,
        evaluator_config={
            "require_json": True,
            "required_json_keys": ["status", "summary", "confidence"]
        }
    )
    assert res.passed is True
    assert res.quality_score == 1.0

def test_rule_based_json_missing_keys():
    bad_json = '{"status": "ok"}'
    res = EvaluatorRegistry.evaluate(
        evaluator_type="rule_based",
        response_content=bad_json,
        evaluator_config={
            "require_json": True,
            "required_json_keys": ["status", "summary", "confidence"]
        }
    )
    assert res.passed is False
    assert res.quality_score < 1.0

def test_response_validity():
    res = EvaluatorRegistry.evaluate(
        evaluator_type="response_validity",
        response_content="This is a valid model response of adequate length.",
        evaluator_config={"min_chars": 15}
    )
    assert res.passed is True
    assert res.quality_score == 1.0

def test_response_validity_too_short():
    res = EvaluatorRegistry.evaluate(
        evaluator_type="response_validity",
        response_content="ok",
        evaluator_config={"min_chars": 10}
    )
    assert res.passed is False
    assert res.quality_score < 1.0

def test_text_similarity():
    res = EvaluatorRegistry.evaluate(
        evaluator_type="text_similarity",
        response_content="Routing requests dynamically sends simpler tasks to smaller cheap models.",
        expected_output="Routing requests dynamically sends simpler tasks to smaller cheap models.",
        evaluator_config={"threshold": 0.50}
    )
    assert res.passed is True
    assert res.quality_score >= 0.9
