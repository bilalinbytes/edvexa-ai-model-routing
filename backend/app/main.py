import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.v1.health import router as health_router
from app.api.v1.providers import router as providers_router
from app.api.v1.datasets import router as datasets_router
from app.api.v1.benchmarks import router as benchmarks_router
from app.api.v1.recommendations import router as recommendations_router
from app.api.v1.dashboard import router as dashboard_router
from app.services.seed_data import seed_database
from app.models.provider import ProviderConfig

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("edvexa")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure database schema is created on startup
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
    
    # Auto-seed initial providers and standard dataset if database is empty
    with SessionLocal() as db:
        prov_count = db.query(ProviderConfig).count()
        if prov_count == 0:
            logger.info("Seeding initial providers and benchmark dataset...")
            seed_database(db)
        else:
            logger.info(f"Database already contains {prov_count} provider records.")
            
    yield
    logger.info("Application shutting down.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Edvexa AI Model Evaluation & Intelligent Routing Platform API",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Exception handler for unhandled exceptions to return predictable JSON error
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error at {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred.", "error_type": type(exc).__name__}
    )

# Register API v1 routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(providers_router, prefix=settings.API_V1_STR)
app.include_router(datasets_router, prefix=settings.API_V1_STR)
app.include_router(benchmarks_router, prefix=settings.API_V1_STR)
app.include_router(recommendations_router, prefix=settings.API_V1_STR)
app.include_router(dashboard_router, prefix=settings.API_V1_STR)

@app.get("/")
def root():
    return {
        "message": "Welcome to Edvexa AI Model Evaluation and Intelligent Routing Platform API",
        "documentation": f"{settings.API_V1_STR}/docs",
        "health": f"{settings.API_V1_STR}/health"
    }
