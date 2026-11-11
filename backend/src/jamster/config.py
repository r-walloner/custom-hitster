from pathlib import Path
from typing import Literal

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Read from JAMSTER_* environment variables, or from .env in the repo root or backend/."""

    model_config = SettingsConfigDict(
        env_prefix="JAMSTER_",
        env_file=("../.env", ".env"),
        env_ignore_empty=True,
        extra="ignore",
    )

    spotify_client_id: str
    spotify_client_secret: str
    session_secret: str
    # Public URL in production. Unset, the Spotify callback follows the request's Host header,
    # which is what makes both the Vite dev server (:5173) and the local container (:8000) work.
    base_url: str | None = None
    data_dir: Path = Path("data")
    static_dir: Path | None = None  # built frontend; unset in development, where Vite serves it
    musicbrainz_contact: str = ""  # URL or email sent in the MusicBrainz User-Agent

    # Logging, see logs.py. INFO tells each game move by move; DEBUG adds every outside call.
    log_level: Literal["DEBUG", "INFO", "WARNING", "ERROR"] = "INFO"
    log_to: Literal["file", "stdout"] = "file"  # the container image sets stdout
    log_file: Path | None = None  # default: jamster.log in data_dir

    @field_validator("log_level", mode="before")
    @classmethod
    def _upper(cls, value: object) -> object:
        return value.upper() if isinstance(value, str) else value

    @field_validator("log_to", mode="before")
    @classmethod
    def _lower(cls, value: object) -> object:
        return value.lower() if isinstance(value, str) else value
