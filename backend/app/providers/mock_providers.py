import asyncio
import time
import json
import hashlib
from typing import Optional, Dict, Any
from app.providers.base import BaseProvider, ProviderResponse

class MockFastLlamaProvider(BaseProvider):
    """
    High throughput, low latency mock provider modeled after Llama 3.1 8B.
    Simulated latency: ~120ms
    Simulated cost: $0.0002 / 1k tokens
    Strengths: Fast execution, exact syntax match, simple summaries.
    Weaknesses: Less robust on deeply nested JSON schemas.
    """
    async def execute(
        self,
        prompt: str,
        task_type: str,
        test_case_id: str,
        expected_output: Optional[str] = None,
        evaluator_config: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ProviderResponse:
        t0 = time.perf_counter()
        # Fast non-blocking mock delay
        await asyncio.sleep(0.015)
        wall_clock = (time.perf_counter() - t0) * 1000.0

        eval_cfg = evaluator_config or {}

        # Check for simulated failure trigger
        if "[TRIGGER_FAIL]" in prompt or self.simulated_failure_rate > 0.8:
            return ProviderResponse(
                content=None,
                is_success=False,
                error_type="ProviderExecutionError",
                error_message="FastLlama mock service encountered a transient connection reset",
                retryable=True,
                wall_clock_latency_ms=round(wall_clock, 2),
                simulated_latency_ms=self.simulated_latency_ms,
                prompt_tokens=self.estimate_tokens(prompt),
                cost_provenance="simulated",
                raw_metadata={"model": self.identifier, "simulated": True}
            )

        # Deterministic response generation
        if task_type == "exact_match":
            content = expected_output.strip() if expected_output else "42"
        elif task_type == "json_validation":
            content = json.dumps({
                "status": "success",
                "summary": "Processed query quickly via FastLlama",
                "confidence": 0.88,
                "items": ["result_alpha", "result_beta"]
            })
        elif task_type == "rule_check":
            # Produce text conforming to expected rule checks
            content = "Status: ACTIVE. The query verified successfully with code 200."
        elif task_type == "summarization":
            content = "Summary: The provided text outlines core AI routing requirements with high speed and deterministic output."
        else:
            content = f"FastLlama deterministic response to: {prompt[:40]}..."

        prompt_toks = self.estimate_tokens(prompt)
        comp_toks = self.estimate_tokens(content)
        total_toks = prompt_toks + comp_toks
        est_cost = (total_toks / 1000.0) * self.simulated_cost_per_1k

        return ProviderResponse(
            content=content,
            is_success=True,
            wall_clock_latency_ms=round(wall_clock, 2),
            simulated_latency_ms=float(self.simulated_latency_ms),
            prompt_tokens=prompt_toks,
            completion_tokens=comp_toks,
            total_tokens=total_toks,
            estimated_cost_usd=round(est_cost, 6),
            cost_provenance="simulated",
            raw_metadata={"model": self.identifier, "simulated": True, "provider_tier": "fast_edge"}
        )


class MockDeepReasonerProvider(BaseProvider):
    """
    High reasoning capacity mock provider modeled after DeepSeek R1 / Claude 3.5 Sonnet.
    Simulated latency: ~850ms
    Simulated cost: $0.003 / 1k tokens
    Strengths: Perfect JSON schema fidelity, comprehensive explanations, exact answer accuracy.
    Weaknesses: Higher latency and higher token cost.
    """
    async def execute(
        self,
        prompt: str,
        task_type: str,
        test_case_id: str,
        expected_output: Optional[str] = None,
        evaluator_config: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ProviderResponse:
        t0 = time.perf_counter()
        await asyncio.sleep(0.025)
        wall_clock = (time.perf_counter() - t0) * 1000.0

        if "[TRIGGER_FATAL_FAIL]" in prompt:
            return ProviderResponse(
                content=None,
                is_success=False,
                error_type="AuthenticationError",
                error_message="Non-retryable mock quota rejection",
                retryable=False,
                wall_clock_latency_ms=round(wall_clock, 2),
                simulated_latency_ms=self.simulated_latency_ms,
                prompt_tokens=self.estimate_tokens(prompt),
                cost_provenance="simulated"
            )

        if task_type == "exact_match":
            content = expected_output.strip() if expected_output else "42"
        elif task_type == "json_validation":
            content = json.dumps({
                "status": "success",
                "summary": "Deep reasoning step-by-step synthesis complete.",
                "confidence": 0.99,
                "items": ["result_alpha", "result_beta", "result_gamma"],
                "reasoning_steps": [
                    "Parsed semantic input requirements",
                    "Validated output schema constraints",
                    "Synthesized validated JSON document"
                ]
            })
        elif task_type == "rule_check":
            content = "Status: ACTIVE. Strict compliance verified across all operational parameters with code 200."
        elif task_type == "summarization":
            content = "Deep Analysis Summary: The system implements an asynchronous multi-provider benchmark evaluation pipeline with strict metric provenance and explainable Pareto-optimal routing."
        else:
            content = f"DeepReasoner step-by-step verified response for task {task_type}: {prompt[:50]}."

        prompt_toks = self.estimate_tokens(prompt)
        comp_toks = self.estimate_tokens(content)
        total_toks = prompt_toks + comp_toks
        est_cost = (total_toks / 1000.0) * self.simulated_cost_per_1k

        return ProviderResponse(
            content=content,
            is_success=True,
            wall_clock_latency_ms=round(wall_clock, 2),
            simulated_latency_ms=float(self.simulated_latency_ms),
            prompt_tokens=prompt_toks,
            completion_tokens=comp_toks,
            total_tokens=total_toks,
            estimated_cost_usd=round(est_cost, 6),
            cost_provenance="simulated",
            raw_metadata={"model": self.identifier, "simulated": True, "reasoning_tokens": 140}
        )


class MockFlakyEdgeProvider(BaseProvider):
    """
    Budget mock provider with simulated intermittent failure rate (default 30%).
    Simulated latency: ~160ms
    Simulated cost: $0.00005 / 1k tokens (Ultra low cost)
    Strengths: Extremely cheap.
    Weaknesses: Transient timeouts, rate-limits, and partial failure rates.
    """
    async def execute(
        self,
        prompt: str,
        task_type: str,
        test_case_id: str,
        expected_output: Optional[str] = None,
        evaluator_config: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> ProviderResponse:
        t0 = time.perf_counter()
        await asyncio.sleep(0.01)
        wall_clock = (time.perf_counter() - t0) * 1000.0

        # Deterministic pseudorandom failure using MD5 hash of test_case_id + prompt
        # to ensure reproducibility in benchmarks and tests
        hash_val = int(hashlib.md5(f"{test_case_id}:{prompt}".encode()).hexdigest()[:4], 16)
        normalized_hash = (hash_val % 100) / 100.0
        
        failure_threshold = max(0.0, min(1.0, self.simulated_failure_rate))

        if normalized_hash < failure_threshold or "[TRIGGER_FAIL]" in prompt:
            return ProviderResponse(
                content=None,
                is_success=False,
                error_type="SimulatedTransientRateLimit",
                error_message="MockFlakyEdge simulated HTTP 429: Rate limit exceeded on cheap edge node",
                retryable=True,
                wall_clock_latency_ms=round(wall_clock, 2),
                simulated_latency_ms=self.simulated_latency_ms,
                prompt_tokens=self.estimate_tokens(prompt),
                completion_tokens=0,
                total_tokens=self.estimate_tokens(prompt),
                estimated_cost_usd=0.0,
                cost_provenance="simulated",
                raw_metadata={"model": self.identifier, "simulated_error": True}
            )

        # When it succeeds:
        if task_type == "exact_match":
            content = expected_output.strip() if expected_output else "42"
        elif task_type == "json_validation":
            content = json.dumps({"status": "success", "summary": "Edge output"})
        elif task_type == "rule_check":
            content = "Status: ACTIVE. Short check ok."
        elif task_type == "summarization":
            content = "Edge brief: Quick overview."
        else:
            content = f"Edge response: {prompt[:30]}"

        prompt_toks = self.estimate_tokens(prompt)
        comp_toks = self.estimate_tokens(content)
        total_toks = prompt_toks + comp_toks
        est_cost = (total_toks / 1000.0) * self.simulated_cost_per_1k

        return ProviderResponse(
            content=content,
            is_success=True,
            wall_clock_latency_ms=round(wall_clock, 2),
            simulated_latency_ms=float(self.simulated_latency_ms),
            prompt_tokens=prompt_toks,
            completion_tokens=comp_toks,
            total_tokens=total_toks,
            estimated_cost_usd=round(est_cost, 6),
            cost_provenance="simulated",
            raw_metadata={"model": self.identifier, "simulated": True, "tier": "budget"}
        )
