"""Fix Wonder Weeks leap definitions — official thewonderweeks.com values.

Corrects storm_start_weeks, storm_end_weeks, and sun_start_weeks
for all 10 leaps based on thewonderweeks.com/leaps/leap-1/ to leap-10/.

Revision ID: o6p7q8r9s0t1
Revises: n5o6p7q8r9s0
Create Date: 2026-04-22
"""

from alembic import op


revision = "o6p7q8r9s0t1"
down_revision = "n5o6p7q8r9s0"
branch_labels = None
depends_on = None

# (leap_number, storm_start, storm_end, sun_start) — official thewonderweeks.com values
CORRECTED_LEAPS = [
    (1, 4.0, 6.0, 6.0),
    (2, 7.0, 10.0, 10.0),
    (3, 11.0, 11.5, 12.0),
    (4, 14.0, 20.0, 20.0),
    (5, 22.0, 26.0, 26.0),
    (6, 33.0, 38.0, 37.0),
    (7, 41.0, 47.0, 46.0),
    (8, 51.0, 55.0, 54.0),
    (9, 59.0, 65.0, 64.0),
    (10, 70.0, 76.0, 75.0),
]

# Previous (wrong) values from n5o6p7q8r9s0 migration
PREVIOUS_LEAPS = [
    (1, 4.5, 5.5, 5.5),
    (2, 7.5, 9.5, 9.5),
    (3, 11.5, 12.5, 12.5),
    (4, 14.5, 19.5, 19.5),
    (5, 22.5, 26.5, 26.5),
    (6, 33.5, 37.5, 37.5),
    (7, 41.5, 46.5, 46.5),
    (8, 50.5, 55.5, 55.5),
    (9, 59.5, 64.5, 64.5),
    (10, 70.5, 76.5, 76.5),
]


def _update_leaps(data: list[tuple]) -> None:
    for leap_number, storm_start, storm_end, sun_start in data:
        op.execute(
            f"UPDATE leap_definitions SET "
            f"storm_start_weeks = {storm_start}, "
            f"storm_end_weeks = {storm_end}, "
            f"sun_start_weeks = {sun_start} "
            f"WHERE leap_number = {leap_number}"
        )


def upgrade() -> None:
    _update_leaps(CORRECTED_LEAPS)


def downgrade() -> None:
    _update_leaps(PREVIOUS_LEAPS)
