import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.provider import ProviderConfig
from app.models.job import BenchmarkResult, BenchmarkJob
from app.models.recommendation import RecommendationAudit

logger = logging.getLogger(__name__)

class RecommendationConstraints(BaseModel):
    max_latency_ms: Optional[float] = None
    max_cost_per_query: Optional[float] = None
    min_quality_score: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    required_capabilities: List[str] = Field(default_factory=list)
    min_samples: int = Field(default=1, ge=1)

class RecommendationWeights(BaseModel):
    quality_weight: float = Field(default=0.5, ge=0.0, le=1.0)
    latency_weight: float = Field(default=0.25, ge=0.0, le=1.0)
    cost_weight: float = Field(default=0.25, ge=0.0, le=1.0)

class ProviderEvaluationCandidate(BaseModel):
    provider_id: str
    provider_name: str
    identifier: str
    is_mock: bool
    capabilities: List[str]
    sample_count: int
    success_rate: float
    avg_quality: float
    avg_latency_ms: float
    avg_cost_usd: Optional[float]
    has_known_cost: bool
    is_eligible: bool
    rejection_reasons: List[str] = Field(default_factory=list)
    composite_score: float = 0.0

class RecommendationResult(BaseModel):
    is_successful: bool
    winner_provider_id: Optional[str] = None
    winner_provider_name: Optional[str] = None
    strategy: str
    explanation: str
    trade_offs: str
    candidates_evaluated: List[ProviderEvaluationCandidate]
    audit_id: Optional[str] = None


class RecommendationEngine:
    @staticmethod
    def evaluate_and_route(
        db: Session,
        strategy: str = "balanced",
        constraints: Optional[RecommendationConstraints] = None,
        weights: Optional[RecommendationWeights] = None,
        dataset_id: Optional[str] = None,
        benchmark_job_id: Optional[str] = None,
        persist_audit: bool = True
    ) -> RecommendationResult:
        constraints = constraints or RecommendationConstraints()
        weights = weights or RecommendationWeights()
        
        # Normalize weights if sum != 1.0
        w_sum = weights.quality_weight + weights.latency_weight + weights.cost_weight
        if w_sum <= 0:
            weights = RecommendationWeights(quality_weight=0.5, latency_weight=0.25, cost_weight=0.25)
            w_sum = 1.0
        norm_q_weight = weights.quality_weight / w_sum
        norm_l_weight = weights.latency_weight / w_sum
        norm_c_weight = weights.cost_weight / w_sum

        # 1. Fetch active providers
        providers = db.query(ProviderConfig).filter(ProviderConfig.is_enabled == True).all()
        if not providers:
            return RecommendationResult(
                is_successful=False,
                strategy=strategy,
                explanation="No active providers configured in the system.",
                trade_offs="Enable at least one model provider to generate recommendations.",
                candidates_evaluated=[]
            )

        # 2. Compute aggregate metrics from real persisted benchmark results
        candidates: List[ProviderEvaluationCandidate] = []

        for p in providers:
            query = db.query(BenchmarkResult).filter(BenchmarkResult.provider_id == p.id)
            if benchmark_job_id:
                query = query.filter(BenchmarkResult.job_id == benchmark_job_id)
            elif dataset_id:
                query = query.join(BenchmarkJob).filter(BenchmarkJob.dataset_id == dataset_id)

            results = query.all()
            total_obs = len(results)
            successful_results = [r for r in results if r.is_success]
            success_count = len(successful_results)
            success_rate = round(success_count / float(total_obs), 4) if total_obs > 0 else 0.0

            # Quality: average quality score of valid observations
            avg_quality = (
                sum(r.quality_score for r in successful_results) / float(success_count)
                if success_count > 0 else 0.0
            )

            # Latency: use simulated_latency_ms if mock, else wall_clock_latency_ms
            latencies = [
                (r.simulated_latency_ms if (p.is_mock and r.simulated_latency_ms is not None) else r.wall_clock_latency_ms)
                for r in successful_results
            ]
            avg_latency = sum(latencies) / float(len(latencies)) if latencies else float(p.simulated_latency_ms)

            # Cost: Strictly exclude missing/null costs - never fabricate zero
            valid_costs = [r.estimated_cost_usd for r in successful_results if r.estimated_cost_usd is not None]
            has_known_cost = len(valid_costs) > 0
            avg_cost = sum(valid_costs) / float(len(valid_costs)) if has_known_cost else None

            # Eligibility & constraint validation
            rejection_reasons = []
            
            # Capability check
            prov_caps = set(p.capabilities or [])
            for req_cap in constraints.required_capabilities:
                if req_cap not in prov_caps:
                    rejection_reasons.append(f"Missing required capability '{req_cap}'")

            # Sufficient observations check
            if success_count < constraints.min_samples:
                rejection_reasons.append(f"Insufficient valid data ({success_count} valid results < {constraints.min_samples} required)")

            # Min quality constraint
            if constraints.min_quality_score is not None:
                if avg_quality < constraints.min_quality_score:
                    rejection_reasons.append(f"Quality {avg_quality:.2f} is below minimum threshold {constraints.min_quality_score:.2f}")

            # Max latency constraint
            if constraints.max_latency_ms is not None:
                if avg_latency > constraints.max_latency_ms:
                    rejection_reasons.append(f"Latency {avg_latency:.1f}ms exceeds maximum threshold {constraints.max_latency_ms:.1f}ms")

            # Max cost constraint
            if constraints.max_cost_per_query is not None:
                if avg_cost is None:
                    rejection_reasons.append("Unknown cost metrics: cannot satisfy strict cost constraint")
                elif avg_cost > constraints.max_cost_per_query:
                    rejection_reasons.append(f"Cost ${avg_cost:.6f} exceeds maximum threshold ${constraints.max_cost_per_query:.6f}")

            # Strategy-specific requirements
            if strategy == "lowest_cost" and not has_known_cost:
                rejection_reasons.append("Missing cost data: cannot be considered for lowest_cost strategy without valid cost accounting")

            is_eligible = len(rejection_reasons) == 0

            candidates.append(ProviderEvaluationCandidate(
                provider_id=p.id,
                provider_name=p.name,
                identifier=p.identifier,
                is_mock=p.is_mock,
                capabilities=p.capabilities or [],
                sample_count=success_count,
                success_rate=success_rate,
                avg_quality=round(avg_quality, 4),
                avg_latency_ms=round(avg_latency, 2),
                avg_cost_usd=round(avg_cost, 6) if avg_cost is not None else None,
                has_known_cost=has_known_cost,
                is_eligible=is_eligible,
                rejection_reasons=rejection_reasons
            ))

        eligible_candidates = [c for c in candidates if c.is_eligible]

        if not eligible_candidates:
            explanation = "No providers satisfied the required capabilities and constraints."
            rejections_summary = "; ".join([f"{c.provider_name}: {', '.join(c.rejection_reasons)}" for c in candidates])
            result = RecommendationResult(
                is_successful=False,
                strategy=strategy,
                explanation=explanation,
                trade_offs=f"Constraint rejection audit: {rejections_summary}",
                candidates_evaluated=candidates
            )
            if persist_audit:
                RecommendationEngine._persist_audit_record(db, result, strategy, constraints, weights, dataset_id, benchmark_job_id)
            return result

        # 3. Score eligible candidates according to strategy
        min_lat = min(c.avg_latency_ms for c in eligible_candidates)
        max_lat = max(c.avg_latency_ms for c in eligible_candidates)
        
        known_costs = [c.avg_cost_usd for c in eligible_candidates if c.avg_cost_usd is not None]
        min_cost = min(known_costs) if known_costs else 0.0
        max_cost = max(known_costs) if known_costs else 1.0

        for c in eligible_candidates:
            # Latency score [0.0 - 1.0] where 1.0 is lowest latency
            if max_lat > min_lat:
                lat_score = 1.0 - ((c.avg_latency_ms - min_lat) / (max_lat - min_lat))
            else:
                lat_score = 1.0

            # Cost score [0.0 - 1.0] where 1.0 is lowest cost
            if c.avg_cost_usd is not None and max_cost > min_cost:
                cost_score = 1.0 - ((c.avg_cost_usd - min_cost) / (max_cost - min_cost))
            elif c.avg_cost_usd is not None:
                cost_score = 1.0
            else:
                cost_score = 0.0  # Penalize missing cost in balanced calculation

            # Quality score [0.0 - 1.0]
            qual_score = c.avg_quality

            if strategy == "highest_quality":
                c.composite_score = round(qual_score, 4)
            elif strategy == "lowest_latency":
                c.composite_score = round(lat_score, 4)
            elif strategy == "lowest_cost":
                c.composite_score = round(cost_score if c.avg_cost_usd is not None else -1.0, 4)
            else:  # balanced
                c.composite_score = round(
                    (norm_q_weight * qual_score) +
                    (norm_l_weight * lat_score) +
                    (norm_c_weight * cost_score),
                    4
                )

        # Sort descending by composite score, break ties deterministically by provider identifier
        eligible_candidates.sort(key=lambda x: (x.composite_score, x.avg_quality, -x.avg_latency_ms, x.identifier), reverse=True)
        winner = eligible_candidates[0]

        # 4. Generate Explainable Rationale and Trade-offs
        if strategy == "highest_quality":
            explanation = (
                f"Selected '{winner.provider_name}' as the highest quality model with an average quality score of {winner.avg_quality * 100:.1f}%. "
                f"Observed success rate: {winner.success_rate * 100:.1f}% across {winner.sample_count} benchmark samples."
            )
        elif strategy == "lowest_latency":
            explanation = (
                f"Selected '{winner.provider_name}' as the lowest latency model with {winner.avg_latency_ms:.1f}ms average response time. "
                f"Quality maintained at {winner.avg_quality * 100:.1f}%."
            )
        elif strategy == "lowest_cost":
            cost_str = f"${winner.avg_cost_usd:.6f}" if winner.avg_cost_usd is not None else "unknown"
            explanation = (
                f"Selected '{winner.provider_name}' for lowest cost routing at {cost_str} per query. "
                f"Delivers {winner.avg_quality * 100:.1f}% quality score with {winner.avg_latency_ms:.1f}ms latency."
            )
        else:  # balanced
            explanation = (
                f"Selected '{winner.provider_name}' with the highest composite Pareto efficiency score of {winner.composite_score:.3f} "
                f"under balanced weights (Quality: {norm_q_weight:.0%}, Latency: {norm_l_weight:.0%}, Cost: {norm_c_weight:.0%})."
            )

        # Trade-offs relative to runner-up if present
        if len(eligible_candidates) > 1:
            runner_up = eligible_candidates[1]
            trade_offs = (
                f"Compared to runner-up '{runner_up.provider_name}' (score {runner_up.composite_score:.3f}): "
                f"Quality diff: {(winner.avg_quality - runner_up.avg_quality) * 100:+.1f}%, "
                f"Latency diff: {winner.avg_latency_ms - runner_up.avg_latency_ms:+.1f}ms"
            )
            if winner.avg_cost_usd is not None and runner_up.avg_cost_usd is not None:
                cost_ratio = (winner.avg_cost_usd / runner_up.avg_cost_usd) if runner_up.avg_cost_usd > 0 else 1.0
                trade_offs += f", Cost ratio: {cost_ratio:.2f}x."
            else:
                trade_offs += "."
        else:
            trade_offs = "Only one eligible provider passed all configured constraints."

        result = RecommendationResult(
            is_successful=True,
            winner_provider_id=winner.provider_id,
            winner_provider_name=winner.provider_name,
            strategy=strategy,
            explanation=explanation,
            trade_offs=trade_offs,
            candidates_evaluated=candidates
        )

        if persist_audit:
            RecommendationEngine._persist_audit_record(db, result, strategy, constraints, weights, dataset_id, benchmark_job_id)

        return result

    @staticmethod
    def _persist_audit_record(
        db: Session,
        result: RecommendationResult,
        strategy: str,
        constraints: RecommendationConstraints,
        weights: RecommendationWeights,
        dataset_id: Optional[str],
        benchmark_job_id: Optional[str]
    ):
        audit = RecommendationAudit(
            strategy=strategy,
            constraints=constraints.model_dump(),
            weights=weights.model_dump(),
            dataset_id=dataset_id,
            benchmark_job_id=benchmark_job_id,
            winner_provider_id=result.winner_provider_id,
            winner_provider_name=result.winner_provider_name,
            is_successful=result.is_successful,
            explanation=result.explanation,
            trade_offs=result.trade_offs,
            candidates_evaluated=[c.model_dump() for c in result.candidates_evaluated]
        )
        db.add(audit)
        db.commit()
        db.refresh(audit)
        result.audit_id = audit.id
