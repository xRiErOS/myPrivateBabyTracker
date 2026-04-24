"""Health check endpoint — no auth required.

Returns app status, version, and loaded plugins (E4).
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.plugins.registry import plugin_registry

router = APIRouter(tags=["health"])


@router.get("/health")
async def health():
    """Health check: status, version, loaded plugins."""
    plugins = plugin_registry.get_all()
    return JSONResponse({
        "status": "ok",
        "version": "0.7.0",
        "plugins": [
            {"name": p.name, "version": p.version}
            for p in plugins
        ],
    })
