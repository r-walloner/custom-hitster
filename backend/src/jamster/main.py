"""Entry point for `fastapi dev` and `fastapi run` (see [tool.fastapi] in pyproject.toml)."""

import logging

from .config import Settings
from .web import create_app

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")

app = create_app(Settings())  # pyright: ignore[reportCallIssue]  (values come from the env)
