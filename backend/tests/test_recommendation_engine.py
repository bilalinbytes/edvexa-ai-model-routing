import pytest
from app.services.recommendation_engine import (
    RecommendationEngine,
    RecommendationConstraints,
    RecommendationWeights
)
from app.models.provider import ProviderConfig
from app.models.dataset import BenchmarkDataset, TestCase
from app.models.job import BenchmarkJob, BenchmarkResult

def test_recommendation_with_no_data(db_session):
    # Request recommendation for a job with zero benchmark results
    constraints = RecommendationConstraints(min_samples=1)
    res = RecommendationEngine.evaluate_and_route(
        db=db_session,
        strategy="balanced",
        constraints=constraints,
        benchmark_job_id="dummy-job-without-results",
        persist_audit=False
    )
    assert res.is_successful is False
    assert "Insufficient valid data" in res.trade_offs

def test_recommendation_strategies_and_constraints(db_session):
    # Create two providers:
    # Prov A: High quality (0.95), High latency (800ms), High cost ($0.005)
    # Prov B: Moderate quality (0.80), Low latency (100ms), Low cost ($0.0001)
    prov_a = ProviderConfig(
        name="Reasoner Ultra",
        identifier="prov-a-reasoner",
        provider_type="mock",
        is_mock=True,
        capabilities=["exact_match", "reasoning", "json"],
        simulated_latency_ms=800,
        simulated_cost_per_1k_tokens=0.005
    )
    prov_b = ProviderConfig(
        name="Edge Fast",
        identifier="prov-b-edge",
        provider_type="mock",
        is_mock=True,
        capabilities=["exact_match", "fast_response"],
        simulated_latency_ms=100,
        simulated_cost_per_1k_tokens=0.0001
    )
    db_session.add_all([prov_a, prov_b])
    db_session.commit()

    # Create dummy benchmark dataset and job
    ds = BenchmarkDataset(name="Test DS")
    db_session.add(ds)
    db_session.commit()

    tc = TestCase(dataset_id=ds.id, name="Case 1", task_type="exact_match", prompt="Test", evaluator_type="exact_match")
    db_session.add(tc)
    db_session.commit()

    job = BenchmarkJob(
        dataset_id=ds.id,
        status="COMPLETED",
        selected_provider_ids=[prov_a.id, prov_b.id]
    )
    db_session.add(job)
    db_session.commit()

    # Add mock results
    res_a = BenchmarkResult(
        job_id=job.id,
        provider_id=prov_a.id,
        test_case_id=tc.id,
        attempt=1,
        is_success=True,
        wall_clock_latency_ms=20.0,
        simulated_latency_ms=800.0,
        estimated_cost_usd=0.005,
        cost_provenance="simulated",
        evaluator_name="exact_match",
        quality_score=0.95,
        passed=True,
        evaluation_reason="Passed"
    )
    res_b = BenchmarkResult(
        job_id=job.id,
        provider_id=prov_b.id,
        test_case_id=tc.id,
        attempt=1,
        is_success=True,
        wall_clock_latency_ms=10.0,
        simulated_latency_ms=100.0,
        estimated_cost_usd=0.0001,
        cost_provenance="simulated",
        evaluator_name="exact_match",
        quality_score=0.80,
        passed=True,
        evaluation_reason="Passed"
    )
    db_session.add_all([res_a, res_b])
    db_session.commit()

    # 1. Test highest_quality strategy -> Prov A must win
    rec_q = RecommendationEngine.evaluate_and_route(
        db=db_session,
        strategy="highest_quality",
        benchmark_job_id=job.id
    )
    assert rec_q.is_successful is True
    assert rec_q.winner_provider_id == prov_a.id

    # 2. Test lowest_cost strategy -> Prov B must win
    rec_c = RecommendationEngine.evaluate_and_route(
        db=db_session,
        strategy="lowest_cost",
        benchmark_job_id=job.id
    )
    assert rec_c.is_successful is True
    assert rec_c.winner_provider_id == prov_b.id

    # 3. Test lowest_latency strategy -> Prov B must win
    rec_l = RecommendationEngine.evaluate_and_route(
        db=db_session,
        strategy="lowest_latency",
        benchmark_job_id=job.id
    )
    assert rec_l.is_successful is True
    assert rec_l.winner_provider_id == prov_b.id

    # 4. Test constraint rejection: requires capability "reasoning" -> Prov B rejected, Prov A wins
    rec_cap = RecommendationEngine.evaluate_and_route(
        db=db_session,
        strategy="lowest_cost",
        constraints=RecommendationConstraints(required_capabilities=["reasoning"]),
        benchmark_job_id=job.id
    )
    assert rec_cap.is_successful is True
    assert rec_cap.winner_provider_id == prov_a.id

    # 5. Test constraint rejection: max_latency_ms = 200ms -> Prov A rejected, Prov B wins
    rec_lat_limit = RecommendationEngine.evaluate_and_route(
        db=db_session,
        strategy="highest_quality",
        constraints=RecommendationConstraints(max_latency_ms=200.0),
        benchmark_job_id=job.id
    )
    assert rec_lat_limit.is_successful is True
    assert rec_lat_limit.winner_provider_id == prov_b.id
