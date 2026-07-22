"""환경 설정. 리포지토리 루트의 .env를 읽는다."""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
CONFIG_DIR = BACKEND_ROOT / "config"
CACHE_DIR = BACKEND_ROOT / ".cache"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(REPO_ROOT / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    kis_app_key: str = ""
    kis_app_secret: str = ""
    kis_account_no: str = ""
    kis_env: str = "real"  # real | paper (paper는 별도 앱키 필요 — ADR-1)
    database_url: str = "postgresql://postgres:postgres@localhost:5432/stockdb"

    @property
    def kis_base_url(self) -> str:
        if self.kis_env == "paper":
            return "https://openapivts.koreainvestment.com:29443"
        return "https://openapi.koreainvestment.com:9443"


@lru_cache
def get_settings() -> Settings:
    return Settings()
