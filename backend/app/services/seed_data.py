from sqlalchemy.orm import Session
from app.models.provider import ProviderConfig
from app.models.dataset import BenchmarkDataset, TestCase
import logging

logger = logging.getLogger(__name__)

SEEDED_PROVIDERS = [
    {
        "name": "Mock Fast Llama 3.1 8B",
        "identifier": "mock-fast-llama",
        "provider_type": "mock",
        "is_enabled": True,
        "is_mock": True,
        "capabilities": ["exact_match", "summarization", "fast_response"],
        "simulated_latency_ms": 120,
        "simulated_cost_per_1k_tokens": 0.0002,
        "simulated_failure_rate": 0.0,
        "timeout_seconds": 10.0,
        "max_retries": 2,
        "metadata_json": {
            "tier": "fast_edge",
            "context_window": 8192,
            "architecture": "dense_transformer",
            "note": "Deterministic mock provider for high-speed, cost-effective inference."
        }
    },
    {
        "name": "Mock DeepSeek Reasoner R1",
        "identifier": "mock-deep-reasoner",
        "provider_type": "mock",
        "is_enabled": True,
        "is_mock": True,
        "capabilities": ["exact_match", "json", "reasoning", "summarization", "rule_check"],
        "simulated_latency_ms": 850,
        "simulated_cost_per_1k_tokens": 0.003,
        "simulated_failure_rate": 0.0,
        "timeout_seconds": 15.0,
        "max_retries": 2,
        "metadata_json": {
            "tier": "deep_reasoning",
            "context_window": 32768,
            "architecture": "mixture_of_experts",
            "note": "Deterministic mock provider for complex reasoning and schema conformity."
        }
    },
    {
        "name": "Mock Flaky Edge Mini",
        "identifier": "mock-flaky-edge",
        "provider_type": "mock",
        "is_enabled": True,
        "is_mock": True,
        "capabilities": ["exact_match", "fast_response"],
        "simulated_latency_ms": 160,
        "simulated_cost_per_1k_tokens": 0.00005,
        "simulated_failure_rate": 0.30,  # 30% simulated failure scenario
        "timeout_seconds": 5.0,
        "max_retries": 3,
        "metadata_json": {
            "tier": "ultra_budget",
            "context_window": 4096,
            "architecture": "quantized_edge",
            "note": "Deterministic budget provider with intermittent failure simulations for resilience testing."
        }
    }
]

SEEDED_DATASET = {
    "name": "Edvexa Standard Benchmark Suite",
    "description": "Comprehensive evaluation benchmark covering arithmetic exact-match, strict JSON schema validation, regex rule compliance, response validity, and text similarity.",
    "version": "1.0.0",
    "is_seeded": True,
    "test_cases": [
        {
            "name": "Arithmetic Exact Match",
            "task_type": "exact_match",
            "prompt": "What is 17 multiplied by 4? Respond only with the number.",
            "expected_output": "68",
            "evaluator_type": "exact_match",
            "evaluator_config": {"strip_whitespace": True, "case_sensitive": False},
            "required_capabilities": ["exact_match"],
            "weight": 1.0,
            "metadata_json": {"category": "math"}
        },
        {
            "name": "Geography Exact Match",
            "task_type": "exact_match",
            "prompt": "What is the capital of Japan? Respond only with the city name.",
            "expected_output": "Tokyo",
            "evaluator_type": "exact_match",
            "evaluator_config": {"strip_whitespace": True, "case_sensitive": False},
            "required_capabilities": ["exact_match"],
            "weight": 1.0,
            "metadata_json": {"category": "factual"}
        },
        {
            "name": "JSON Schema & Key Validation",
            "task_type": "json_validation",
            "prompt": "Generate a JSON response containing 'status', 'summary', and 'confidence' fields.",
            "expected_output": None,
            "evaluator_type": "rule_based",
            "evaluator_config": {
                "require_json": True,
                "required_json_keys": ["status", "summary", "confidence"]
            },
            "required_capabilities": ["json"],
            "weight": 1.5,
            "metadata_json": {"category": "schema"}
        },
        {
            "name": "Rule Compliance - Log Status",
            "task_type": "rule_check",
            "prompt": "Produce a health check log stating Status: ACTIVE and confirming code 200.",
            "expected_output": None,
            "evaluator_type": "rule_based",
            "evaluator_config": {
                "regex": "Status:\\s*ACTIVE",
                "required_substrings": ["200"]
            },
            "required_capabilities": ["rule_check"],
            "weight": 1.0,
            "metadata_json": {"category": "compliance"}
        },
        {
            "name": "Response Completeness Check",
            "task_type": "response_validity",
            "prompt": "Describe in two sentences the importance of model benchmarking in production AI systems.",
            "expected_output": None,
            "evaluator_type": "response_validity",
            "evaluator_config": {"min_chars": 25},
            "required_capabilities": ["summarization"],
            "weight": 1.0,
            "metadata_json": {"category": "validity"}
        },
        {
            "name": "Semantic Concept Similarity",
            "task_type": "summarization",
            "prompt": "Explain the benefit of multi-model routing for LLM operations.",
            "expected_output": "The provided text outlines core AI routing requirements with high speed and deterministic output.",
            "evaluator_type": "text_similarity",
            "evaluator_config": {"threshold": 0.40},
            "required_capabilities": ["summarization"],
            "weight": 1.2,
            "metadata_json": {"category": "similarity"}
        },
        {
            "name": "Fault Tolerance Stress Scenario",
            "task_type": "adversarial_failure",
            "prompt": "Stress test query [TRIGGER_FAIL] evaluate retry resilience and error handling.",
            "expected_output": None,
            "evaluator_type": "response_validity",
            "evaluator_config": {"min_chars": 5},
            "required_capabilities": ["fast_response"],
            "weight": 0.5,
            "metadata_json": {"category": "stress_testing"}
        }
    ]
}

def seed_database(db: Session) -> dict:
    """Idempotently seed providers and standard dataset."""
    seeded_prov_count = 0
    for prov_data in SEEDED_PROVIDERS:
        existing = db.query(ProviderConfig).filter_by(identifier=prov_data["identifier"]).first()
        if not existing:
            prov = ProviderConfig(**prov_data)
            db.add(prov)
            seeded_prov_count += 1
        else:
            # Update attributes if needed
            for k, v in prov_data.items():
                setattr(existing, k, v)
    
    # Seed dataset
    dataset = db.query(BenchmarkDataset).filter_by(name=SEEDED_DATASET["name"]).first()
    seeded_case_count = 0
    if not dataset:
        dataset = BenchmarkDataset(
            name=SEEDED_DATASET["name"],
            description=SEEDED_DATASET["description"],
            version=SEEDED_DATASET["version"],
            is_seeded=True
        )
        db.add(dataset)
        db.flush()

        for case_data in SEEDED_DATASET["test_cases"]:
            tc = TestCase(dataset_id=dataset.id, **case_data)
            db.add(tc)
            seeded_case_count += 1
    else:
        # Check if test cases exist
        existing_cases = db.query(TestCase).filter_by(dataset_id=dataset.id).count()
        if existing_cases == 0:
            for case_data in SEEDED_DATASET["test_cases"]:
                tc = TestCase(dataset_id=dataset.id, **case_data)
                db.add(tc)
                seeded_case_count += 1

    db.commit()
    logger.info(f"Seed completed: {seeded_prov_count} new providers, {seeded_case_count} new test cases.")
    return {
        "status": "success",
        "message": f"Database successfully seeded. Providers: {len(SEEDED_PROVIDERS)}, Test cases: {len(SEEDED_DATASET['test_cases'])}",
        "dataset_id": dataset.id if dataset else None
    }
