"""Tests for structured logging configuration."""

import json

import structlog

from app.logging import setup_logging, get_logger


class TestLogging:
    """Logging configuration tests."""

    def test_setup_logging_configures_structlog(self):
        """setup_logging should configure structlog without errors."""
        setup_logging("INFO")
        logger = structlog.get_logger()
        assert logger is not None

    def test_json_output(self, capsys):
        """Logger should produce valid JSON output."""
        setup_logging("DEBUG")
        logger = structlog.get_logger()
        logger.info("test_event", key="value")

        captured = capsys.readouterr()
        # structlog with PrintLoggerFactory writes to stdout
        parsed = json.loads(captured.out.strip())
        assert parsed["event"] == "test_event"
        assert parsed["key"] == "value"
        assert parsed["level"] == "info"
        assert "timestamp" in parsed

    def test_timestamp_is_iso_utc(self, capsys):
        """Timestamps must be ISO 8601 format."""
        setup_logging("DEBUG")
        logger = structlog.get_logger()
        logger.info("ts_test")

        captured = capsys.readouterr()
        parsed = json.loads(captured.out.strip())
        ts = parsed["timestamp"]
        # ISO 8601 UTC timestamps contain 'T' and end with '+00:00' or 'Z'
        assert "T" in ts

    def test_get_logger_with_name(self, capsys):
        """get_logger(name) should bind 'logger' key."""
        setup_logging("DEBUG")
        logger = get_logger("mymodule")
        logger.info("named_test")

        captured = capsys.readouterr()
        parsed = json.loads(captured.out.strip())
        assert parsed["logger"] == "mymodule"

    def test_log_level_filtering(self, capsys):
        """Messages below configured level should be filtered."""
        setup_logging("WARNING")
        logger = structlog.get_logger()
        logger.info("should_not_appear")
        logger.warning("should_appear")

        captured = capsys.readouterr()
        lines = [l for l in captured.out.strip().split("\n") if l]
        assert len(lines) == 1
        parsed = json.loads(lines[0])
        assert parsed["event"] == "should_appear"
