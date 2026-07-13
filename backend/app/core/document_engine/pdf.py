import subprocess
from pathlib import Path

from app.core.file_converter.converter import SOFFICE_BIN


class PdfConversionError(Exception):
    pass


def docx_to_pdf(docx_path: Path, output_dir: Path, timeout: int = 30) -> Path:
    try:
        result = subprocess.run(
            [SOFFICE_BIN, "--headless", "--convert-to", "pdf", "--outdir", str(output_dir), str(docx_path)],
            capture_output=True,
            timeout=timeout,
        )
    except FileNotFoundError as exc:
        raise PdfConversionError(
            "Le moteur de conversion (LibreOffice) est indisponible sur ce serveur."
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise PdfConversionError("La conversion PDF a pris trop de temps.") from exc

    if result.returncode != 0:
        raise PdfConversionError(
            f"Echec de la conversion PDF : {result.stderr.decode(errors='ignore')[:300]}"
        )

    output_path = output_dir / f"{docx_path.stem}.pdf"
    if not output_path.exists():
        raise PdfConversionError("La conversion PDF n'a produit aucun fichier.")
    return output_path
