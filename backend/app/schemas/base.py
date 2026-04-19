"""Base schema with UTC datetime serialization.

All datetime fields are serialized with 'Z' suffix to indicate UTC,
ensuring browsers correctly interpret timestamps as UTC, not local time.
"""

from datetime import datetime, timezone
from typing import Annotated

from pydantic import PlainSerializer

UTCDatetime = Annotated[
    datetime,
    PlainSerializer(
        lambda v: v.strftime("%Y-%m-%dT%H:%M:%SZ") if v else None,
        return_type=str,
    ),
]
