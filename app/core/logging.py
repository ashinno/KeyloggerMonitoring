import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path
from typing import Optional


_logger: Optional[logging.Logger] = None


def setup_logging(logs_dir: Path) -> logging.Logger:
    logs_dir.mkdir(parents=True, exist_ok=True)
    logger = logging.getLogger("sentinel")
    logger.setLevel(logging.INFO)
    logger.propagate = False
    if not any(isinstance(h, TimedRotatingFileHandler) for h in logger.handlers):
        handler = TimedRotatingFileHandler(
            filename=str(logs_dir / "daily"), when="midnight", interval=1, backupCount=30, utc=False
        )
        handler.suffix = "%Y-%m-%d.log"
        def namer(name: str) -> str:
            p = Path(name)
            return str(logs_dir / p.name.replace("daily.", ""))
        handler.namer = namer  # type: ignore
        fmt = logging.Formatter("%(asctime)s %(levelname)s %(message)s", datefmt="%Y-%m-%dT%H:%M:%S%z")
        handler.setFormatter(fmt)
        logger.addHandler(handler)
    global _logger
    _logger = logger
    return logger


def get_logger() -> logging.Logger:
    global _logger
    if _logger is None:
        raise RuntimeError("Logger not initialized")
    return _logger