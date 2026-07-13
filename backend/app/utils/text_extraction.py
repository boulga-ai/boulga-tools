import io

import docx
from pypdf import PdfReader

MAX_TEXT_LENGTH = 50_000


class ExtractionError(Exception):
    pass


def extract_text(filename: str, content: bytes) -> str:
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext == "pdf":
        try:
            reader = PdfReader(io.BytesIO(content))
            text = "\n".join(page.extract_text() or "" for page in reader.pages)
        except Exception as exc:
            raise ExtractionError("Impossible de lire ce PDF.") from exc
    elif ext == "docx":
        try:
            document = docx.Document(io.BytesIO(content))
            text = "\n".join(p.text for p in document.paragraphs)
        except Exception as exc:
            raise ExtractionError("Impossible de lire ce document Word.") from exc
    elif ext == "txt":
        try:
            text = content.decode("utf-8", errors="ignore")
        except Exception as exc:
            raise ExtractionError("Impossible de lire ce fichier texte.") from exc
    else:
        raise ExtractionError(f"Format de fichier non supporte : .{ext}")

    text = text.strip()
    if not text:
        raise ExtractionError("Aucun texte n'a pu etre extrait de ce fichier.")
    return text[:MAX_TEXT_LENGTH]
