"""Fix Wonder Weeks leap definition week ranges.

Corrects storm_start_weeks, storm_end_weeks, and sun_start_weeks
for all 10 leaps based on official Wonder Weeks data
(thewonderweeks.com / "Oje, ich wachse!" 2026 edition).

Revision ID: n5o6p7q8r9s0
Revises: m4n5o6p7q8r9
Create Date: 2026-04-22
"""

from alembic import op


revision = "n5o6p7q8r9s0"
down_revision = "m4n5o6p7q8r9"
branch_labels = None
depends_on = None

# (leap_number, storm_start, storm_end, sun_start) — corrected values
CORRECTED_LEAPS = [
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

# Original (wrong) values for downgrade
ORIGINAL_LEAPS = [
    (1, 4.5, 5.0, 5.0),
    (2, 7.0, 8.0, 8.5),
    (3, 10.5, 11.5, 12.0),
    (4, 14.5, 19.0, 19.5),
    (5, 22.0, 26.0, 26.0),
    (6, 33.0, 37.0, 37.0),
    (7, 41.0, 46.0, 46.0),
    (8, 51.0, 55.0, 55.0),
    (9, 59.0, 64.0, 64.0),
    (10, 70.0, 76.0, 75.5),
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
    _update_leaps(ORIGINAL_LEAPS)
