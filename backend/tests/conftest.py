import pytest
import os
import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

# Ensure backend root is on Python path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.database import Base, get_db
import app.core.database as database_module
from app.main import app
from app.services.seed_data import seed_database

@pytest.fixture(scope="session")
def test_engine(tmp_path_factory):
    db_file = tmp_path_factory.mktemp("test_data") / "test_suite.db"
    engine = create_engine(
        f"sqlite:///{db_file}",
        connect_args={"check_same_thread": False}
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()

@pytest.fixture(scope="session")
def session_factory(test_engine):
    factory = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    database_module.SessionLocal = factory
    return factory

@pytest.fixture
def db_session(session_factory):
    session = session_factory()
    try:
        yield session
    finally:
        session.close()

@pytest.fixture
def seeded_db(db_session):
    seed_database(db_session)
    return db_session

@pytest.fixture
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
