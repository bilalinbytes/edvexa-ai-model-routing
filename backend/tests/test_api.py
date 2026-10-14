import pytest

def test_health_and_readiness(client):
    r_health = client.get("/api/v1/health")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "healthy"

    r_ready = client.get("/api/v1/ready")
    assert r_ready.status_code == 200
    assert r_ready.json()["status"] == "ready"

def test_provider_endpoints(client):
    # 1. Create a provider
    payload = {
        "name": "Custom Test LLM",
        "identifier": "custom-test-llm",
        "provider_type": "mock",
        "is_enabled": True,
        "is_mock": True,
        "capabilities": ["exact_match"],
        "simulated_latency_ms": 100,
        "simulated_cost_per_1k_tokens": 0.001
    }
    r_create = client.post("/api/v1/providers", json=payload)
    assert r_create.status_code == 201
    prov_id = r_create.json()["id"]

    # 2. Toggle provider
    r_toggle = client.post(f"/api/v1/providers/{prov_id}/toggle")
    assert r_toggle.status_code == 200
    assert r_toggle.json()["is_enabled"] is False

    # 3. List providers
    r_list = client.get("/api/v1/providers")
    assert r_list.status_code == 200
    assert any(p["id"] == prov_id for p in r_list.json())

def test_dataset_and_seed_endpoints(client):
    # 1. Trigger seed
    r_seed = client.post("/api/v1/datasets/seed")
    assert r_seed.status_code == 200
    assert r_seed.json()["status"] == "success"

    # 2. List datasets
    r_list = client.get("/api/v1/datasets")
    assert r_list.status_code == 200
    assert len(r_list.json()) >= 1
    ds_id = r_list.json()[0]["id"]

    # 3. Get single dataset with test cases
    r_single = client.get(f"/api/v1/datasets/{ds_id}")
    assert r_single.status_code == 200
    assert len(r_single.json()["test_cases"]) > 0

def test_dashboard_overview(client):
    r_dash = client.get("/api/v1/dashboard/overview")
    assert r_dash.status_code == 200
    data = r_dash.json()
    assert "total_benchmark_jobs" in data
    assert "provider_breakdown" in data
