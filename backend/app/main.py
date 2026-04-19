"""FastAPI application factory."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded

from app.api.children import router as children_router
from app.api.errors import register_exception_handlers
from app.api.health import router as health_router
from app.config import get_settings
from app.database import init_db, dispose_engine
from app.logging import setup_logging, get_logger
from app.middleware.csrf import CSRFMiddleware
from app.middleware.rate_limit import limiter, rate_limit_exceeded_handler
from app.middleware.security import (
    HeaderStrippingMiddleware,
    RequestSizeLimitMiddleware,
    SecurityHeadersMiddleware,
)
from app.plugins import discover_plugins
from app.plugins.registry import plugin_registry

logger = get_logger("main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    settings = get_settings()

    # Initialize structured logging (JSON, UTC timestamps)
    setup_logging(settings.log_level)

    # Initialize async database engine with WAL mode
    init_db(settings.database_url)

    # Discover and register plugins (ADR-1: filesystem scan)
    plugins = discover_plugins()
    for plugin in plugins:
        plugin.register_routes(app)
        plugin.on_startup()
        logger.info(
            "plugin_loaded",
            name=plugin.name,
            version=plugin.version,
            display_name=plugin.display_name,
        )

    logger.info(
        "app_started",
        version="0.1.0",
        auth_mode=settings.auth_mode,
        environment=settings.environment,
        log_level=settings.log_level,
        plugins_loaded=[p.name for p in plugins],
    )

    yield

    # Shutdown hooks
    for plugin in plugin_registry.get_all():
        plugin.on_shutdown()
        logger.info("plugin_shutdown", name=plugin.name)

    await dispose_engine()
    logger.info("app_stopped")


def create_app(testing: bool = False) -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title="MyBaby",
        description="Self-hosted, plugin-based baby tracker",
        version="0.1.0",
        lifespan=lifespan,
        docs_url="/api/docs" if not testing else "/docs",
        openapi_url="/api/openapi.json" if not testing else "/openapi.json",
    )

    # --- Middleware chain (order matters: last added = first executed) ---
    # In Starlette, middleware added LAST wraps outermost → executes FIRST.
    # Desired execution order: HeaderStripping → CSRF → RateLimit → SecurityHeaders
    # Therefore we add in REVERSE order:

    # 5. CORS (innermost — only if origins configured)
    if settings.cors_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=settings.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # 4. Security headers
    app.add_middleware(SecurityHeadersMiddleware)

    # 3. Request size limit (K3)
    app.add_middleware(
        RequestSizeLimitMiddleware,
        max_size=settings.request_size_limit,
    )

    # 2. CSRF protection (K2)
    app.add_middleware(
        CSRFMiddleware,
        enabled=settings.csrf_enabled and not testing,
    )

    # 1. Header stripping (K1) — MUST be outermost = added LAST
    app.add_middleware(
        HeaderStrippingMiddleware,
        trusted_proxies=settings.auth_trusted_proxies,
    )

    # Rate limiting via slowapi
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

    # Custom exception handlers (NotFoundError, ValidationError, catch-all)
    register_exception_handlers(app)

    # --- Core routers ---
    # Health: no auth, mounted at /api/v1
    app.include_router(health_router, prefix="/api/v1")
    # Children: auth required, mounted at /api/v1
    app.include_router(children_router, prefix="/api/v1")

    return app


app = create_app()
