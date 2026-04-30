"""FastAPI application factory."""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
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
from app.services.changelog_service import ensure_release_note_for_current_version
from app.version import APP_VERSION

logger = get_logger("main")

# Resolve static files directory (frontend build output)
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"


def run_migrations() -> None:
    """Run Alembic migrations (upgrade head) at startup.

    Uses synchronous SQLite driver — Alembic does not support async.
    Only runs if alembic directory exists (i.e., in production container).
    """
    alembic_dir = Path(__file__).resolve().parent.parent / "alembic"
    alembic_ini = Path(__file__).resolve().parent.parent / "alembic.ini"

    if not alembic_dir.exists() or not alembic_ini.exists():
        logger.info("alembic_skip", reason="alembic directory not found")
        return

    try:
        from alembic import command
        from alembic.config import Config

        alembic_cfg = Config(str(alembic_ini))
        alembic_cfg.set_main_option("script_location", str(alembic_dir))

        # Override DB URL from settings
        settings = get_settings()
        alembic_cfg.set_main_option("sqlalchemy.url", settings.database_url)

        command.upgrade(alembic_cfg, "head")
        logger.info("alembic_migrated", target="head")
    except Exception as e:
        logger.error("alembic_migration_failed", error=str(e))
        raise


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown."""
    settings = get_settings()

    # Initialize structured logging (JSON, UTC timestamps, optional file rotation)
    setup_logging(
        settings.log_level,
        log_file=settings.log_file,
        max_bytes=settings.log_file_max_bytes,
        backup_count=settings.log_file_backups,
    )

    # Run Alembic migrations before DB engine init
    run_migrations()

    # Initialize async database engine with WAL mode
    init_db(settings.database_url)

    # Pfad 1 (Container-getriggert): Auto-Release-Note fuer aktuelle App-Version.
    # Idempotent — bestehende Eintraege werden nicht ueberschrieben.
    ensure_release_note_for_current_version()

    # Run plugin startup hooks (routes already mounted in create_app)
    for plugin in plugin_registry.get_all():
        plugin.on_startup()
        logger.info(
            "plugin_loaded",
            name=plugin.name,
            version=plugin.version,
            display_name=plugin.display_name,
        )

    logger.info(
        "app_started",
        version=APP_VERSION,
        auth_mode=settings.auth_mode,
        environment=settings.environment,
        log_level=settings.log_level,
        plugins_loaded=[p.name for p in plugin_registry.get_all()],
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
        version=APP_VERSION,
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
    app.add_middleware(
        SecurityHeadersMiddleware,
        preview_origin=settings.dashboard_preview_origin,
    )

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
    # Alerts: warning system (ADR-10)
    from app.api.alerts import router as alerts_router
    app.include_router(alerts_router, prefix="/api/v1")
    # Medication masters: predefined medication catalog
    from app.api.medication_masters import router as med_masters_router
    app.include_router(med_masters_router, prefix="/api/v1")
    # Tags: polymorphic tagging for all entries
    from app.api.tags import router as tags_router
    app.include_router(tags_router, prefix="/api/v1")
    # API Keys: machine-to-machine authentication
    from app.api.api_keys import router as api_keys_router
    app.include_router(api_keys_router, prefix="/api/v1")
    # Auth: login, logout, session management
    from app.api.auth import router as auth_router
    app.include_router(auth_router, prefix="/api/v1")
    # TOTP 2FA: setup, verify, disable
    from app.api.totp import router as totp_router
    app.include_router(totp_router, prefix="/api/v1")
    # WebAuthn (Passkeys): register, login, credential management
    from app.api.webauthn import router as webauthn_router
    app.include_router(webauthn_router, prefix="/api/v1")
    # User management (admin CRUD)
    from app.api.users import router as users_router
    app.include_router(users_router, prefix="/api/v1")
    # User preferences (per-user settings)
    from app.api.preferences import router as preferences_router
    app.include_router(preferences_router, prefix="/api/v1")
    # Changelog management (file-backed)
    from app.routers.changelog import router as changelog_router
    app.include_router(changelog_router, prefix="/api/v1")
    # Admin Log-Viewer (admin only)
    from app.api.admin_logs import router as admin_logs_router
    app.include_router(admin_logs_router, prefix="/api/v1")

    # --- Plugin routers (must be before SPA fallback) ---
    plugins = discover_plugins()
    for plugin in plugins:
        plugin.register_routes(app)

    # --- Static file serving (production: frontend build) ---
    # Note: Photo uploads are served via auth-protected proxy at /api/v1/milestones/photos/
    index_html = STATIC_DIR / "index.html"
    assets_dir = STATIC_DIR / "assets"
    # index.html darf nie gecached werden, sonst zeigen Browser nach Deploy
    # auf alte Vite-Asset-Hashes und werfen "Importing a module script failed".
    NO_CACHE_HEADERS = {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
    }
    if index_html.exists():
        # Mount static assets (JS, CSS, images) — Vite-Hashes garantieren Immutability
        if assets_dir.exists():
            app.mount(
                "/assets",
                StaticFiles(directory=assets_dir),
                name="assets",
            )

        # SPA fallback: non-API routes serve index.html
        @app.get("/{path:path}")
        async def spa_fallback(request: Request, path: str):
            """Serve index.html for all non-API routes (SPA routing)."""
            # Never intercept API routes — let them 404 naturally
            if path.startswith("api/"):
                from fastapi.responses import JSONResponse
                return JSONResponse({"detail": "Not Found"}, status_code=404)
            # Prevent path traversal
            file_path = (STATIC_DIR / path).resolve()
            if not str(file_path).startswith(str(STATIC_DIR.resolve())):
                return FileResponse(index_html, headers=NO_CACHE_HEADERS)
            # Try to serve the exact file first (favicon.ico, manifest.json, changelog.json …)
            if path and file_path.exists() and file_path.is_file():
                # JSON/HTML-Dateien im public/ ändern sich pro Deploy — nicht cachen
                if file_path.suffix in {".json", ".html"}:
                    return FileResponse(file_path, headers=NO_CACHE_HEADERS)
                return FileResponse(file_path)
            # Otherwise serve index.html for client-side routing
            return FileResponse(index_html, headers=NO_CACHE_HEADERS)

    return app


app = create_app()
