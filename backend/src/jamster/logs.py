"""Logging for the whole process, built on the standard `logging` module.

Every module logs through `logging.getLogger(__name__)`; this file only decides where the records
go and from which level on. Configured by JAMSTER_LOG_LEVEL, JAMSTER_LOG_TO and JAMSTER_LOG_FILE.

Levels as used in Jamster:
  DEBUG    every Spotify and MusicBrainz call, refused requests, import progress
  INFO     the default: each game move by move (whose turn, which song, every placement,
           challenge and reveal), players coming and going, settings, logins, imports
  WARNING  something failed but the app carries on: playback, a lookup, an import
  ERROR    a bug: an exception nobody expected

Only Jamster's own records are kept below WARNING; the web server's request lines and other
libraries' chatter are left out.
"""

import logging
import logging.config
import sys
from typing import Any

from .config import Settings

FORMAT = "%(asctime)s %(levelname)-7s %(short_name)-8s %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"
MAX_FILE_BYTES = 10 * 1024 * 1024
FILE_BACKUPS = 5  # jamster.log.1 to .5, so at most 60 MB in all


class OnlyOursBelowWarning(logging.Filter):
    """Drops other libraries' records below WARNING, and names records without "jamster."."""

    def filter(self, record: logging.LogRecord) -> bool:
        ours = record.name == "jamster" or record.name.startswith("jamster.")
        record.short_name = record.name.removeprefix("jamster.")
        return ours or record.levelno >= logging.WARNING


def setup(settings: Settings) -> None:
    """Send every log record, the server's own included, to stdout or to a rotating file."""
    handler: dict[str, Any]
    if settings.log_to == "file":
        path = settings.log_file or settings.data_dir / "jamster.log"
        path.parent.mkdir(parents=True, exist_ok=True)
        print(f"Jamster logs to {path.resolve()}", file=sys.stderr)  # the console says nothing else
        handler = {
            "class": "logging.handlers.RotatingFileHandler",
            "filename": str(path),
            "maxBytes": MAX_FILE_BYTES,
            "backupCount": FILE_BACKUPS,
            "encoding": "utf-8",
        }
    else:
        handler = {"class": "logging.StreamHandler", "stream": sys.stdout}

    logging.config.dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {"plain": {"format": FORMAT, "datefmt": DATE_FORMAT}},
            "filters": {"ours": {"()": OnlyOursBelowWarning}},
            "handlers": {"main": {**handler, "formatter": "plain", "filters": ["ours"]}},
            "root": {"level": settings.log_level, "handlers": ["main"]},
            "loggers": {
                # Uvicorn installs its own handlers before the app is imported; route its
                # records through ours instead, so its errors land in the same place.
                name: {"handlers": [], "propagate": True}
                for name in ("uvicorn", "uvicorn.error", "uvicorn.access")
            },
        }
    )
