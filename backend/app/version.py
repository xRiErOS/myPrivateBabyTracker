"""Single source of truth for the running application version.

Read by:
- app.api.health (health endpoint payload)
- app.main (startup log)
- app.services.changelog_service (auto-generated release notes for new versions)

Bumping the version: edit APP_VERSION here. Container restart will then trigger
the changelog auto-publish path (see services.changelog_service).
"""

APP_VERSION = "0.8.1"
