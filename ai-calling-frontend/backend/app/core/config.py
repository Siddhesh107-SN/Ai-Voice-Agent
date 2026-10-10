import os

class Settings:
    PROJECT_NAME: str = "TalkAor AI Voice Calling SaaS Platform API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # JWT & Auth
    SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "talkaor-super-secret-jwt-key-2026-production-ready")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Business Admin Access Code (Securely verified by backend)
    # Default code is TALKAOR-ADMIN-2026 if not set in environment
    BUSINESS_ADMIN_ACCESS_CODE: str = os.getenv("BUSINESS_ADMIN_ACCESS_CODE", "TALKAOR-ADMIN-2026")
    
    # Super Admin Access Token / Key for Swagger protection
    SWAGGER_SUPER_ADMIN_KEY: str = os.getenv("SWAGGER_SUPER_ADMIN_KEY", "talkaor-swagger-super-admin-key-2026")
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]
    
    # Database
    DB_PATH: str = os.getenv("TALKAOR_DB_PATH", os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "talkaor.db"))

settings = Settings()
