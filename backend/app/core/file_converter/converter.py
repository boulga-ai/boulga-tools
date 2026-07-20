import io
import subprocess
import uuid
from pathlib import Path
from typing import Literal

import pikepdf
from PIL import Image
from pypdf import PdfReader, PdfWriter
from pypdf.errors import PdfReadError, WrongPasswordError

from app.config import settings

MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 Mo

IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "bmp", "gif"}
DOCUMENT_EXTENSIONS = {"pdf", "docx", "doc", "odt", "txt"}
SPREADSHEET_EXTENSIONS = {"xlsx", "xls", "csv", "ods"}
PRESENTATION_EXTENSIONS = {"pptx", "ppt", "odp"}
OFFICE_EXTENSIONS = DOCUMENT_EXTENSIONS | SPREADSHEET_EXTENSIONS | PRESENTATION_EXTENSIONS

ALLOWED_MIME_BY_EXT: dict[str, set[str]] = {
    "pdf": {"application/pdf"},
    "docx": {"application/vnd.openxmlformats-officedocument.wordprocessingml.document"},
    "doc": {"application/msword"},
    "odt": {"application/vnd.oasis.opendocument.text"},
    "txt": {"text/plain"},
    "xlsx": {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"},
    "xls": {"application/vnd.ms-excel"},
    "csv": {"text/csv"},
    "ods": {"application/vnd.oasis.opendocument.spreadsheet"},
    "pptx": {"application/vnd.openxmlformats-officedocument.presentationml.presentation"},
    "ppt": {"application/vnd.ms-powerpoint"},
    "odp": {"application/vnd.oasis.opendocument.presentation"},
    "png": {"image/png"},
    "jpg": {"image/jpeg"},
    "jpeg": {"image/jpeg"},
    "webp": {"image/webp"},
    "bmp": {"image/bmp"},
    "gif": {"image/gif"},
}

class ConversionError(Exception):
    pass


def validate_upload(filename: str, content_type: str | None, size: int) -> str:
    """Verifie extension + type MIME + taille. Renvoie l'extension (sans point) si valide."""
    if size > MAX_FILE_SIZE_BYTES:
        raise ConversionError("Le fichier depasse la taille maximale autorisee (25 Mo).")

    ext = Path(filename).suffix.lower().lstrip(".")
    allowed_mimes = ALLOWED_MIME_BY_EXT.get(ext)
    if allowed_mimes is None:
        raise ConversionError(f"Format de fichier non supporte : .{ext}")

    if content_type and content_type not in allowed_mimes and content_type != "application/octet-stream":
        raise ConversionError("Le type de fichier ne correspond pas a son extension.")

    return ext


def _convert_via_libreoffice(input_path: Path, target_format: str, output_dir: Path) -> Path:
    # Profil utilisateur LibreOffice isole par conversion (sous-dossier du tempdir deja
    # propre a cette requete) : sans ca, des conversions concurrentes partagent le meme
    # profil par defaut et peuvent se bloquer mutuellement (verrou de profil LibreOffice).
    profile_dir = output_dir / ".lo-profile"
    profile_dir.mkdir(exist_ok=True)

    try:
        result = subprocess.run(
            [
                settings.SOFFICE_BIN,
                "--headless",
                f"-env:UserInstallation=file://{profile_dir.as_posix()}",
                "--convert-to",
                target_format,
                "--outdir",
                str(output_dir),
                str(input_path),
            ],
            capture_output=True,
            timeout=60,
        )
    except FileNotFoundError as exc:
        raise ConversionError(
            "Le moteur de conversion (LibreOffice) est indisponible sur ce serveur."
        ) from exc
    except subprocess.TimeoutExpired as exc:
        raise ConversionError("La conversion a pris trop de temps.") from exc

    if result.returncode != 0:
        raise ConversionError(
            f"Echec de la conversion : {result.stderr.decode(errors='ignore')[:300]}"
        )

    output_path = output_dir / f"{input_path.stem}.{target_format}"
    if not output_path.exists():
        raise ConversionError("La conversion n'a produit aucun fichier de sortie.")
    return output_path


def _convert_image(input_path: Path, target_format: str, output_dir: Path) -> Path:
    output_path = output_dir / f"{input_path.stem}.{target_format}"
    with Image.open(input_path) as img:
        if target_format in ("pdf", "jpg", "jpeg"):
            img = img.convert("RGB")
        save_format = "JPEG" if target_format in ("jpg", "jpeg") else target_format.upper()
        img.save(output_path, format=save_format)
    return output_path


def convert(input_path: Path, target_format: str, output_dir: Path) -> Path:
    """Convertit un fichier vers target_format (sans point). Renvoie le chemin du resultat."""
    target_format = target_format.lower().lstrip(".")
    source_ext = input_path.suffix.lower().lstrip(".")

    if source_ext in IMAGE_EXTENSIONS and target_format in IMAGE_EXTENSIONS | {"pdf"}:
        return _convert_image(input_path, target_format, output_dir)

    return _convert_via_libreoffice(input_path, target_format, output_dir)


def merge_pdfs(input_paths: list[Path], output_path: Path) -> Path:
    writer = PdfWriter()
    for path in input_paths:
        reader = PdfReader(str(path))
        for page in reader.pages:
            writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path


def _parse_page_ranges(pages_spec: str, page_count: int) -> list[int]:
    """'1,3,5-8' -> [0,2,4,5,6,7] (indices 0-based), valides et dans l'ordre, sans doublon."""
    indices: set[int] = set()
    for chunk in pages_spec.split(","):
        chunk = chunk.strip()
        if not chunk:
            continue
        if "-" in chunk:
            start_s, end_s = chunk.split("-", 1)
            start, end = int(start_s), int(end_s)
        else:
            start = end = int(chunk)
        if start < 1 or end > page_count or start > end:
            raise ConversionError(f"Plage de pages invalide : {chunk} (document de {page_count} pages).")
        indices.update(range(start - 1, end))
    if not indices:
        raise ConversionError("Aucune page valide specifiee.")
    return sorted(indices)


def split_pdf(input_path: Path, pages_spec: str, output_path: Path) -> Path:
    reader = PdfReader(str(input_path))
    indices = _parse_page_ranges(pages_spec, len(reader.pages))
    writer = PdfWriter()
    for i in indices:
        writer.add_page(reader.pages[i])
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path


def protect_pdf(input_path: Path, password: str, output_path: Path) -> Path:
    reader = PdfReader(str(input_path))
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(password)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path


def unlock_pdf(input_path: Path, password: str, output_path: Path) -> Path:
    try:
        reader = PdfReader(str(input_path), password=password)
    except WrongPasswordError as exc:
        raise ConversionError("Mot de passe incorrect.") from exc
    except PdfReadError as exc:
        raise ConversionError("Ce PDF n'est pas protege par mot de passe.") from exc

    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path


def organize_pdf(input_path: Path, operations: list[dict], output_path: Path) -> Path:
    """operations : liste ordonnee [{"page": int (index 0-based), "rotate": int (0/90/180/270)}].
    Determine a la fois l'ordre, les pages conservees (les autres sont supprimees) et leur rotation."""
    reader = PdfReader(str(input_path))
    page_count = len(reader.pages)
    if not operations:
        raise ConversionError("Aucune page a conserver.")

    writer = PdfWriter()
    for op in operations:
        index = op.get("page")
        if not isinstance(index, int) or index < 0 or index >= page_count:
            raise ConversionError(f"Page invalide : {index} (document de {page_count} pages).")
        page = reader.pages[index]
        rotate = op.get("rotate", 0)
        if rotate:
            page = page.rotate(rotate)
        writer.add_page(page)

    with open(output_path, "wb") as f:
        writer.write(f)
    return output_path


def _downsample_images(pdf: pikepdf.Pdf, max_width: int = 1500) -> None:
    for page in pdf.pages:
        resources = page.get("/Resources")
        if resources is None or "/XObject" not in resources:
            continue
        for xobj in resources["/XObject"].as_dict().values():
            if xobj.get("/Subtype") != pikepdf.Name("/Image"):
                continue
            try:
                pdf_image = pikepdf.PdfImage(xobj)
                if pdf_image.width <= max_width:
                    continue
                pil_image = pdf_image.as_pil_image().convert("RGB")
                ratio = max_width / pil_image.width
                new_size = (max_width, max(1, int(pil_image.height * ratio)))
                resized = pil_image.resize(new_size, Image.LANCZOS)
                buffer = io.BytesIO()
                resized.save(buffer, format="JPEG", quality=70)
                xobj.write(buffer.getvalue(), filter=pikepdf.Name("/DCTDecode"))
                xobj.ColorSpace = pikepdf.Name("/DeviceRGB")
                xobj.Width = new_size[0]
                xobj.Height = new_size[1]
                xobj.BitsPerComponent = 8
            except Exception:
                # Image non recompressible (colorspace exotique, masque, etc.) : on la
                # laisse telle quelle plutot que de faire echouer toute la compression.
                continue


def compress_pdf(input_path: Path, output_path: Path, level: Literal["leger", "fort"] = "leger") -> Path:
    try:
        pdf = pikepdf.open(input_path)
    except pikepdf.PasswordError as exc:
        raise ConversionError("Ce PDF est protege par mot de passe.") from exc
    except pikepdf.PdfError as exc:
        raise ConversionError("Le fichier PDF est corrompu ou illisible.") from exc

    try:
        if level == "fort":
            _downsample_images(pdf)
        pdf.save(
            output_path,
            compress_streams=True,
            object_stream_mode=pikepdf.ObjectStreamMode.generate,
        )
    finally:
        pdf.close()

    return output_path


def new_temp_filename(ext: str) -> str:
    return f"{uuid.uuid4()}.{ext.lstrip('.')}"
