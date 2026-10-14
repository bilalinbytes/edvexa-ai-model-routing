import pytest
import asyncio
from app.providers.registry import ProviderRegistry
from app.providers.mock_providers import (
    MockFastLlamaProvider,
    MockDeepReasonerProvider,
    MockFlakyEdgeProvider
)

@pytest.mark.asyncio
async def test_fast_llama_execution():
    prov = ProviderRegistry.get_provider({
        "identifier": "mock-fast-llama",
        "provider_type": "mock",
        "simulated_latency_ms": 120,
        "simulated_cost_per_1k_tokens": 0.0002
    })
    resp = await prov.execute(
        prompt="What is 10 + 10?",
        task_type="exact_match",
        test_case_id="tc_1",
        expected_output="20"
    )
    assert resp.is_success is True
    assert resp.content == "20"
    assert resp.simulated_latency_ms == 120.0
    assert resp.cost_provenance == "simulated"
    assert resp.estimated_cost_usd is not None

@pytest.mark.asyncio
async def test_deep_reasoner_execution():
    prov = ProviderRegistry.get_provider({
        "identifier": "mock-deep-reasoner",
        "provider_type": "mock",
        "simulated_latency_ms": 850,
        "simulated_cost_per_1k_tokens": 0.003
    })
    resp = await prov.execute(
        prompt="Synthesize JSON schema output",
        task_type="json_validation",
        test_case_id="tc_2"
    )
    assert resp.is_success is True
    assert "status" in resp.content
    assert resp.simulated_latency_ms == 850.0

@pytest.mark.asyncio
async def test_flaky_edge_simulated_failure():
    prov = ProviderRegistry.get_provider({
        "identifier": "mock-flaky-edge",
        "provider_type": "mock",
        "simulated_failure_rate": 1.0  # Force 100% failure for test
    })
    resp = await prov.execute(
        prompt="Test flaky node",
        task_type="exact_match",
        test_case_id="tc_3"
    )
    assert resp.is_success is False
    assert resp.retryable is True
    assert resp.error_type == "SimulatedTransientRateLimit"
