"""Initial schema for providers, datasets, test_cases, jobs, results, audits

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-10-14 21:30:00

"""
from alembic import op
import sqlalchemy as sa

revision = '001_initial_schema'
down_revision = None
branch_labels = None
depends_on = None

def upgrade() -> None:
    # Providers
    op.create_table(
        'providers',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('identifier', sa.String(length=100), nullable=False, unique=True),
        sa.Column('provider_type', sa.String(length=50), nullable=False),
        sa.Column('is_enabled', sa.Boolean(), nullable=False, default=True),
        sa.Column('is_mock', sa.Boolean(), nullable=False, default=True),
        sa.Column('capabilities', sa.JSON(), nullable=False),
        sa.Column('simulated_latency_ms', sa.Integer(), nullable=False, default=150),
        sa.Column('simulated_cost_per_1k_tokens', sa.Float(), nullable=False, default=0.001),
        sa.Column('simulated_failure_rate', sa.Float(), nullable=False, default=0.0),
        sa.Column('timeout_seconds', sa.Float(), nullable=False, default=10.0),
        sa.Column('max_retries', sa.Integer(), nullable=False, default=2),
        sa.Column('metadata_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_providers_identifier', 'providers', ['identifier'])

    # Benchmark Datasets
    op.create_table(
        'benchmark_datasets',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('version', sa.String(length=20), nullable=False, default='1.0.0'),
        sa.Column('is_seeded', sa.Boolean(), nullable=False, default=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_benchmark_datasets_name', 'benchmark_datasets', ['name'])

    # Test Cases
    op.create_table(
        'test_cases',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('dataset_id', sa.String(length=36), sa.ForeignKey('benchmark_datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(length=150), nullable=False),
        sa.Column('task_type', sa.String(length=50), nullable=False),
        sa.Column('prompt', sa.Text(), nullable=False),
        sa.Column('expected_output', sa.Text(), nullable=True),
        sa.Column('evaluator_type', sa.String(length=50), nullable=False),
        sa.Column('evaluator_config', sa.JSON(), nullable=False),
        sa.Column('required_capabilities', sa.JSON(), nullable=False),
        sa.Column('weight', sa.Float(), nullable=False, default=1.0),
        sa.Column('metadata_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_test_cases_dataset_id', 'test_cases', ['dataset_id'])

    # Benchmark Jobs
    op.create_table(
        'benchmark_jobs',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('dataset_id', sa.String(length=36), sa.ForeignKey('benchmark_datasets.id', ondelete='CASCADE'), nullable=False),
        sa.Column('status', sa.String(length=30), nullable=False, default='QUEUED'),
        sa.Column('selected_provider_ids', sa.JSON(), nullable=False),
        sa.Column('execution_config', sa.JSON(), nullable=False),
        sa.Column('total_cases', sa.Integer(), nullable=False, default=0),
        sa.Column('total_requests', sa.Integer(), nullable=False, default=0),
        sa.Column('completed_requests', sa.Integer(), nullable=False, default=0),
        sa.Column('successful_requests', sa.Integer(), nullable=False, default=0),
        sa.Column('failed_requests', sa.Integer(), nullable=False, default=0),
        sa.Column('worker_id', sa.String(length=100), nullable=True),
        sa.Column('claimed_at', sa.DateTime(), nullable=True),
        sa.Column('heartbeat_at', sa.DateTime(), nullable=True),
        sa.Column('started_at', sa.DateTime(), nullable=True),
        sa.Column('completed_at', sa.DateTime(), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_benchmark_jobs_dataset_id', 'benchmark_jobs', ['dataset_id'])
    op.create_index('ix_benchmark_jobs_status', 'benchmark_jobs', ['status'])

    # Benchmark Results
    op.create_table(
        'benchmark_results',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('job_id', sa.String(length=36), sa.ForeignKey('benchmark_jobs.id', ondelete='CASCADE'), nullable=False),
        sa.Column('provider_id', sa.String(length=36), sa.ForeignKey('providers.id', ondelete='CASCADE'), nullable=False),
        sa.Column('test_case_id', sa.String(length=36), sa.ForeignKey('test_cases.id', ondelete='CASCADE'), nullable=False),
        sa.Column('attempt', sa.Integer(), nullable=False, default=1),
        sa.Column('is_success', sa.Boolean(), nullable=False),
        sa.Column('response_content', sa.Text(), nullable=True),
        sa.Column('error_type', sa.String(length=100), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('retryable', sa.Boolean(), nullable=False, default=False),
        sa.Column('wall_clock_latency_ms', sa.Float(), nullable=False),
        sa.Column('simulated_latency_ms', sa.Float(), nullable=True),
        sa.Column('prompt_tokens', sa.Integer(), nullable=True),
        sa.Column('completion_tokens', sa.Integer(), nullable=True),
        sa.Column('total_tokens', sa.Integer(), nullable=True),
        sa.Column('estimated_cost_usd', sa.Float(), nullable=True),
        sa.Column('cost_provenance', sa.String(length=50), nullable=False, default='unknown'),
        sa.Column('evaluator_name', sa.String(length=100), nullable=False),
        sa.Column('evaluator_version', sa.String(length=20), nullable=False, default='1.0.0'),
        sa.Column('quality_score', sa.Float(), nullable=False, default=0.0),
        sa.Column('passed', sa.Boolean(), nullable=False, default=False),
        sa.Column('evaluation_reason', sa.Text(), nullable=False),
        sa.Column('metadata_json', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.UniqueConstraint('job_id', 'provider_id', 'test_case_id', 'attempt', name='uq_job_provider_case_attempt')
    )
    op.create_index('ix_benchmark_results_job_id', 'benchmark_results', ['job_id'])
    op.create_index('ix_benchmark_results_provider_id', 'benchmark_results', ['provider_id'])
    op.create_index('ix_benchmark_results_test_case_id', 'benchmark_results', ['test_case_id'])

    # Recommendation Audits
    op.create_table(
        'recommendation_audits',
        sa.Column('id', sa.String(length=36), primary_key=True),
        sa.Column('strategy', sa.String(length=50), nullable=False),
        sa.Column('constraints', sa.JSON(), nullable=False),
        sa.Column('weights', sa.JSON(), nullable=False),
        sa.Column('dataset_id', sa.String(length=36), nullable=True),
        sa.Column('benchmark_job_id', sa.String(length=36), nullable=True),
        sa.Column('winner_provider_id', sa.String(length=36), nullable=True),
        sa.Column('winner_provider_name', sa.String(length=100), nullable=True),
        sa.Column('is_successful', sa.Boolean(), nullable=False, default=True),
        sa.Column('explanation', sa.Text(), nullable=False),
        sa.Column('trade_offs', sa.Text(), nullable=False),
        sa.Column('candidates_evaluated', sa.JSON(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
    )
    op.create_index('ix_recommendation_audits_winner', 'recommendation_audits', ['winner_provider_id'])

def downgrade() -> None:
    op.drop_table('recommendation_audits')
    op.drop_table('benchmark_results')
    op.drop_table('benchmark_jobs')
    op.drop_table('test_cases')
    op.drop_table('benchmark_datasets')
    op.drop_table('providers')
