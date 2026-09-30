import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    # Environment: "local" or "production"
    APP_ENV: str = "production"

    # Database — in local env you can optionally override with LOCAL_DATABASE_URL
    DATABASE_URL: str
    LOCAL_DATABASE_URL: str = ""

    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_MINUTES: int = 1440
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4o"
    OPENAI_API_VERSION: str = "2024-12-01-preview"
    UPLOAD_DIR: str = "../uploads"
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    GOOGLE_CLIENT_ID: str = ""
    GITHUB_CLIENT_ID: str = ""
    GITHUB_CLIENT_SECRET: str = ""
    REDIS_URL: str = ""
    RAZORPAY_KEY_ID: str = ""
    RAZORPAY_KEY_SECRET: str = ""
    RAZORPAY_WEBHOOK_SECRET: str = ""
    # Subscription plan IDs — create these in Razorpay Dashboard → Subscriptions → Plans
    RAZORPAY_PLAN_STARTER: str = ""   # 100 credits/mo @ ₹69
    RAZORPAY_PLAN_GROWTH: str = ""    # 500 credits/mo @ ₹299
    RAZORPAY_PLAN_PRO: str = ""       # 2000 credits/mo @ ₹999
    # PAYG auto-topup: how many days a PAYG mandate order stays valid
    # Admin Portal Credentials
    ADMIN_USERNAME: str = "admin"
    ADMIN_PASSWORD: str = "SanyamAdmin@2026#Secure"

    FRONTEND_URL: str = ""

    # Production frontend / backend URLs
    PRODUCTION_FRONTEND_URL: str = "https://recruitment-ai-assitant-bvqcv4f6s-sanyam-karnavats-projects.vercel.app"
    PRODUCTION_BACKEND_URL: str = "https://recruitment-ai-assitant-2n4r.onrender.com"

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def is_local(self) -> bool:
        return self.APP_ENV.lower() == "local"

    @property
    def active_database_url(self) -> str:
        """Returns LOCAL_DATABASE_URL when running locally (if set), else DATABASE_URL."""
        if self.is_local and self.LOCAL_DATABASE_URL:
            return self.LOCAL_DATABASE_URL
        return self.DATABASE_URL

    @property
    def upload_path(self) -> Path:
        path = Path(self.UPLOAD_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path


settings = Settings()

