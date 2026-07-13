# Chaque template s'enregistre lui-meme (register_template) en etant importe ici.
from app.core.document_engine.templates import (  # noqa: F401
    academic_clean,
    academic_formal,
    cv_classic,
    cv_modern,
    letter_modern,
    letter_standard,
    pro_corporate,
    pro_minimal,
)
