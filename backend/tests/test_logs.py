import logging
from collections.abc import Iterator
from pathlib import Path

import pytest
from offline_settings import OfflineSettings

from jamster import logs
from jamster.config import Settings


@pytest.fixture(autouse=True)
def restore_logging() -> Iterator[None]:
    """logs.setup reconfigures the whole process; put back what pytest had."""
    root = logging.getLogger()
    handlers, level = root.handlers[:], root.level
    yield
    for handler in root.handlers:
        if handler not in handlers:
            handler.close()
    root.handlers, root.level = handlers, level


def settings(**values: object) -> Settings:
    base = {"spotify_client_id": "x", "spotify_client_secret": "x", "session_secret": "x"}
    return OfflineSettings.model_validate({**base, **values})


def test_logs_go_to_a_file_from_the_configured_level(tmp_path: Path):
    path = tmp_path / "logs" / "jamster.log"
    logs.setup(settings(log_to="file", log_file=path, log_level="warning"))

    logging.getLogger("jamster.rooms").info("hidden")
    logging.getLogger("jamster.rooms").warning("[ABCD] playing failed")
    logging.getLogger("uvicorn.error").error("port in use")

    text = path.read_text()
    assert "WARNING rooms    [ABCD] playing failed" in text
    assert "ERROR   uvicorn.error port in use" in text, "the server's errors land here too"
    assert "hidden" not in text


def test_info_is_the_default_and_only_our_own_records_are_kept(
    capsys: pytest.CaptureFixture[str],
):
    config = settings(log_to="STDOUT")
    assert config.log_level == "INFO"
    logs.setup(config)

    logging.getLogger("jamster.rooms").info("[ABCD] turn 2, Bob's turn")
    logging.getLogger("jamster.spotify").debug("PUT /me/player/play as bob: 204")
    logging.getLogger("uvicorn.access").info('"GET /api/me HTTP/1.1" 200')

    out = capsys.readouterr().out
    assert "INFO    rooms    [ABCD] turn 2, Bob's turn" in out
    assert "/me/player/play" not in out, "DEBUG is below the default"
    assert "/api/me" not in out, "request lines of the web server are left out"


def test_debug_shows_our_calls(capsys: pytest.CaptureFixture[str]):
    logs.setup(settings(log_to="stdout", log_level="debug"))

    logging.getLogger("jamster.spotify").debug("PUT /me/player/play as bob: 204")
    logging.getLogger("httpcore.connection").debug("noise")

    out = capsys.readouterr().out
    assert "DEBUG   spotify  PUT /me/player/play as bob: 204" in out
    assert "noise" not in out
