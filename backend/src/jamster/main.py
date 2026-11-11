"""Entry point for `fastapi dev` and `fastapi run` (see [tool.fastapi] in pyproject.toml)."""

from . import logs
from .config import Settings
from .web import create_app

settings = Settings()  # pyright: ignore[reportCallIssue]  (values come from the env)
logs.setup(settings)
app = create_app(settings)
