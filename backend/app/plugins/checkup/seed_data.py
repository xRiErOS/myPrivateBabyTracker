"""Seed data for U-Untersuchungen (U1-U9).

Based on German pediatric checkup schedule (Kinderuntersuchungsheft).
Age ranges in weeks.
"""

# (name, display_name, min_weeks, max_weeks, description)
CHECKUP_TYPES: list[tuple[str, str, int, int, str]] = [
    (
        "U1",
        "U1 — direkt nach Geburt",
        0,
        0,
        "Erste Untersuchung direkt nach der Geburt. APGAR-Score, Vitalzeichen.",
    ),
    (
        "U2",
        "U2 — 3. bis 10. Lebenstag",
        0,
        2,
        "Neugeborenen-Basisuntersuchung. Bluttest, Hoerscreening.",
    ),
    (
        "U3",
        "U3 — 4. bis 5. Lebenswoche",
        4,
        5,
        "Hueftgelenk-Ultraschall, Entwicklungskontrolle.",
    ),
    (
        "U4",
        "U4 — 3. bis 4. Lebensmonat",
        12,
        17,
        "Motorik, Reaktionen, Impfberatung.",
    ),
    (
        "U5",
        "U5 — 6. bis 7. Lebensmonat",
        26,
        30,
        "Sehvermoegen, Greifen, Brabbeln.",
    ),
    (
        "U6",
        "U6 — 10. bis 12. Lebensmonat",
        43,
        52,
        "Krabbeln, Hochziehen, Sprachentwicklung.",
    ),
    (
        "U7",
        "U7 — 21. bis 24. Lebensmonat",
        91,
        104,
        "Laufen, Sprechen, Sozialverhalten.",
    ),
    (
        "U7a",
        "U7a — 34. bis 36. Lebensmonat",
        147,
        156,
        "Sehtest, Sprachentwicklung, allergische Erkrankungen.",
    ),
    (
        "U8",
        "U8 — 46. bis 48. Lebensmonat",
        199,
        208,
        "Koordination, Sozialverhalten, Hoertest.",
    ),
    (
        "U9",
        "U9 — 60. bis 64. Lebensmonat",
        260,
        278,
        "Schulreife-Untersuchung, Motorik, Kognition.",
    ),
]
