from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""

    # OpenRouter
    OPENROUTER_API_KEY: str = ""

    # FedaPay (branche plus tard)
    FEDAPAY_PUBLIC_KEY: str = ""
    FEDAPAY_SECRET_KEY: str = ""
    FEDAPAY_WEBHOOK_SECRET: str = ""

    # App
    ENV: str = "dev"
    PORT: int = 8003
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:3002"
    ADMIN_EMAIL: str = "boulgacorporation@gmail.com"

    # Matrice LLM (JSON, surchargeable sans redeploiement)
    LLM_ROUTING_JSON: str = ""

    # Generation academique segmentee (documents longs — memoire, these) : au-dela de
    # ce nombre de sections dans le plan, /documents/academic/generate decoupe la
    # generation en plusieurs appels LLM successifs plutot qu'un seul appel monolithique.
    ACADEMIC_SEGMENT_THRESHOLD: int = 6
    ACADEMIC_SEGMENT_SIZE: int = 2

    # LibreOffice headless (conversion docx/office <-> pdf). "soffice" suffit quand le
    # binaire est sur le PATH (cas du conteneur Docker, qui l'installe via apt) ; sinon
    # chemin complet vers soffice.exe (ex: installation Windows locale non ajoutee au PATH).
    SOFFICE_BIN: str = "soffice"

    @property
    def allowed_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]


settings = Settings()
