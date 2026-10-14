import re
import json
import difflib
from typing import Optional, Dict, Any, List
from app.evaluators.base import BaseEvaluator, EvaluationResult

class ExactMatchEvaluator(BaseEvaluator):
    name = "exact_match"
    version = "1.0.0"

    def evaluate(
        self,
        response_content: Optional[str],
        expected_output: Optional[str] = None,
        evaluator_config: Optional[Dict[str, Any]] = None,
        test_case_metadata: Optional[Dict[str, Any]] = None
    ) -> EvaluationResult:
        cfg = evaluator_config or {}
        case_sensitive = cfg.get("case_sensitive", False)
        strip_whitespace = cfg.get("strip_whitespace", True)

        if response_content is None:
            return EvaluationResult(
                evaluator_name=self.name,
                evaluator_version=self.version,
                quality_score=0.0,
                passed=False,
                reason="Candidate response is null or missing"
            )

        actual = response_content
        expected = expected_output or ""

        if strip_whitespace:
            actual = actual.strip()
            expected = expected.strip()

        if not case_sensitive:
            actual = actual.lower()
            expected = expected.lower()

        is_match = (actual == expected)
        score = 1.0 if is_match else 0.0
        reason = "Exact match confirmed" if is_match else f"Output mismatch. Expected: '{expected[:50]}', got: '{actual[:50]}'"

        return EvaluationResult(
            evaluator_name=self.name,
            evaluator_version=self.version,
            quality_score=score,
            passed=is_match,
            reason=reason,
            metadata={"case_sensitive": case_sensitive, "strip_whitespace": strip_whitespace}
        )


class RuleBasedEvaluator(BaseEvaluator):
    name = "rule_based"
    version = "1.0.0"

    def evaluate(
        self,
        response_content: Optional[str],
        expected_output: Optional[str] = None,
        evaluator_config: Optional[Dict[str, Any]] = None,
        test_case_metadata: Optional[Dict[str, Any]] = None
    ) -> EvaluationResult:
        if response_content is None or not response_content.strip():
            return EvaluationResult(
                evaluator_name=self.name,
                evaluator_version=self.version,
                quality_score=0.0,
                passed=False,
                reason="Response content is empty"
            )

        cfg = evaluator_config or {}
        rules_checked = 0
        rules_passed = 0
        failures = []

        # 1. Regex rule
        regex_pattern = cfg.get("regex")
        if regex_pattern:
            rules_checked += 1
            if re.search(regex_pattern, response_content, re.IGNORECASE if not cfg.get("case_sensitive") else 0):
                rules_passed += 1
            else:
                failures.append(f"Regex pattern '{regex_pattern}' not satisfied")

        # 2. Required substrings
        required_substrings: List[str] = cfg.get("required_substrings", [])
        for sub in required_substrings:
            rules_checked += 1
            if sub.lower() in response_content.lower():
                rules_passed += 1
            else:
                failures.append(f"Missing required substring '{sub}'")

        # 3. Disallowed substrings
        disallowed_substrings: List[str] = cfg.get("disallowed_substrings", [])
        for sub in disallowed_substrings:
            rules_checked += 1
            if sub.lower() not in response_content.lower():
                rules_passed += 1
            else:
                failures.append(f"Found disallowed substring '{sub}'")

        # 4. Length limits
        min_length = cfg.get("min_length")
        if min_length is not None:
            rules_checked += 1
            if len(response_content.strip()) >= min_length:
                rules_passed += 1
            else:
                failures.append(f"Length {len(response_content)} is below minimum {min_length}")

        max_length = cfg.get("max_length")
        if max_length is not None:
            rules_checked += 1
            if len(response_content.strip()) <= max_length:
                rules_passed += 1
            else:
                failures.append(f"Length {len(response_content)} exceeds maximum {max_length}")

        # 5. JSON schema/syntax validation
        if cfg.get("require_json", False):
            rules_checked += 1
            try:
                parsed = json.loads(response_content.strip())
                rules_passed += 1
                
                required_keys: List[str] = cfg.get("required_json_keys", [])
                for key in required_keys:
                    rules_checked += 1
                    if isinstance(parsed, dict) and key in parsed:
                        rules_passed += 1
                    else:
                        failures.append(f"JSON missing required key '{key}'")
            except Exception as e:
                failures.append(f"Invalid JSON syntax: {str(e)[:50]}")

        # Fallback if no specific rules configured
        if rules_checked == 0:
            score = 1.0 if len(response_content.strip()) > 0 else 0.0
            return EvaluationResult(
                evaluator_name=self.name,
                evaluator_version=self.version,
                quality_score=score,
                passed=score == 1.0,
                reason="Default non-empty rule passed" if score == 1.0 else "Empty response"
            )

        score = round(rules_passed / float(rules_checked), 4)
        passed = (rules_passed == rules_checked)
        reason = "All rule checks satisfied" if passed else f"Rule check failures: {'; '.join(failures)}"

        return EvaluationResult(
            evaluator_name=self.name,
            evaluator_version=self.version,
            quality_score=score,
            passed=passed,
            reason=reason,
            metadata={"rules_checked": rules_checked, "rules_passed": rules_passed, "failures": failures}
        )


class ResponseValidityEvaluator(BaseEvaluator):
    name = "response_validity"
    version = "1.0.0"

    def evaluate(
        self,
        response_content: Optional[str],
        expected_output: Optional[str] = None,
        evaluator_config: Optional[Dict[str, Any]] = None,
        test_case_metadata: Optional[Dict[str, Any]] = None
    ) -> EvaluationResult:
        if response_content is None:
            return EvaluationResult(
                evaluator_name=self.name,
                evaluator_version=self.version,
                quality_score=0.0,
                passed=False,
                reason="Response is completely null"
            )

        content = response_content.strip()
        if not content:
            return EvaluationResult(
                evaluator_name=self.name,
                evaluator_version=self.version,
                quality_score=0.0,
                passed=False,
                reason="Response contains zero non-whitespace characters"
            )

        cfg = evaluator_config or {}
        min_chars = cfg.get("min_chars", 5)
        
        # Check for obvious provider error dump
        error_indicators = ["error 500", "internal server error", "traceback (most recent call last)"]
        lower_content = content.lower()
        for ind in error_indicators:
            if ind in lower_content:
                return EvaluationResult(
                    evaluator_name=self.name,
                    evaluator_version=self.version,
                    quality_score=0.1,
                    passed=False,
                    reason=f"Response contains raw internal error text ('{ind}')"
                )

        if len(content) < min_chars:
            return EvaluationResult(
                evaluator_name=self.name,
                evaluator_version=self.version,
                quality_score=0.3,
                passed=False,
                reason=f"Response is too terse ({len(content)} chars < minimum {min_chars})"
            )

        return EvaluationResult(
            evaluator_name=self.name,
            evaluator_version=self.version,
            quality_score=1.0,
            passed=True,
            reason=f"Response verified valid and complete ({len(content)} characters)",
            metadata={"char_count": len(content)}
        )


class TextSimilarityEvaluator(BaseEvaluator):
    name = "text_similarity"
    version = "1.0.0"

    def evaluate(
        self,
        response_content: Optional[str],
        expected_output: Optional[str] = None,
        evaluator_config: Optional[Dict[str, Any]] = None,
        test_case_metadata: Optional[Dict[str, Any]] = None
    ) -> EvaluationResult:
        if response_content is None or not expected_output:
            return EvaluationResult(
                evaluator_name=self.name,
                evaluator_version=self.version,
                quality_score=0.0,
                passed=False,
                reason="Missing response or expected benchmark reference text"
            )

        cfg = evaluator_config or {}
        threshold = cfg.get("threshold", 0.70)

        # 1. SequenceMatcher ratio (character-level difflib)
        seq_ratio = difflib.SequenceMatcher(None, response_content.strip().lower(), expected_output.strip().lower()).ratio()

        # 2. Token Jaccard similarity (word-level overlap)
        tokens_actual = set(re.findall(r"\w+", response_content.lower()))
        tokens_expected = set(re.findall(r"\w+", expected_output.lower()))

        if not tokens_expected:
            jaccard = 1.0 if not tokens_actual else 0.0
        else:
            intersection = tokens_actual.intersection(tokens_expected)
            union = tokens_actual.union(tokens_expected)
            jaccard = len(intersection) / float(len(union)) if union else 0.0

        # Blended deterministic similarity score: 50% sequence + 50% token overlap
        blended_score = round(0.5 * seq_ratio + 0.5 * jaccard, 4)
        passed = (blended_score >= threshold)
        reason = f"Similarity score {blended_score:.2f} (SeqMatcher: {seq_ratio:.2f}, TokenJaccard: {jaccard:.2f}) {'meets' if passed else 'falls below'} threshold {threshold:.2f}"

        return EvaluationResult(
            evaluator_name=self.name,
            evaluator_version=self.version,
            quality_score=blended_score,
            passed=passed,
            reason=reason,
            metadata={"seq_ratio": round(seq_ratio, 4), "jaccard": round(jaccard, 4), "threshold": threshold}
        )
