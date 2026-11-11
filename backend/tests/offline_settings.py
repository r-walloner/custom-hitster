from pydantic_settings import SettingsConfigDict

from jamster.config import Settings


class OfflineSettings(Settings):
    """Settings that ignore .env, so a developer's local configuration never leaks into tests."""

    model_config = SettingsConfigDict({**Settings.model_config, "env_file": None})
