import tempfile
from pathlib import Path
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.core.file_converter.converter import (
    ConversionError,
    compress_pdf,
    convert,
    merge_pdfs,
    new_temp_filename,
    protect_pdf,
    split_pdf,
    unlock_pdf,
    validate_upload,
)
from app.dependencies import get_current_user
from app.utils.filenames import safe_filename_stem as _safe_stem
from app.utils.storage import create_signed_url, upload_file

router = APIRouter(prefix="/tools/converter", tags=["converter"])

TEMP_BUCKET = "temp"
SIGNED_URL_TTL = 24 * 60 * 60  # 24h


async def _read_and_validate(file: UploadFile) -> tuple[bytes, str]:
    content = await file.read()
    ext = validate_upload(file.filename or "fichier", file.content_type, len(content))
    return content, ext


def _publish(user_id: str, local_path: Path) -> dict:
    target_name = new_temp_filename(local_path.suffix.lstrip("."))
    storage_path = f"{user_id}/{target_name}"
    upload_file(TEMP_BUCKET, storage_path, local_path.read_bytes(), "application/octet-stream")
    # download_filename force le nom cote serveur (Content-Disposition) : l'attribut HTML
    # download="..." seul n'est pas fiable sur une URL cross-origin (Supabase Storage).
    url = create_signed_url(
        TEMP_BUCKET, storage_path, SIGNED_URL_TTL, download_filename=local_path.name
    )
    return {"url": url, "filename": local_path.name}


@router.post("/convert")
async def convert_file(
    file: UploadFile,
    output_format: str,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        content, ext = await _read_and_validate(file)
    except ConversionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        input_path = tmp_path / f"{_safe_stem(file.filename or 'document')}.{ext}"
        input_path.write_bytes(content)

        try:
            output_path = convert(input_path, output_format, tmp_path)
        except ConversionError as exc:
            raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))

        return _publish(user["user_id"], output_path)


@router.post("/compress")
async def compress_file(
    file: UploadFile,
    level: Literal["leger", "fort"] = "leger",
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        content, ext = await _read_and_validate(file)
    except ConversionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if ext != "pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Seul un fichier PDF peut etre compresse."
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        stem = _safe_stem(file.filename or "document")
        input_path = tmp_path / "input.pdf"
        input_path.write_bytes(content)
        output_path = tmp_path / f"{stem}.pdf"

        try:
            compress_pdf(input_path, output_path, level=level)
        except ConversionError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        result = _publish(user["user_id"], output_path)
        result["size_before"] = len(content)
        result["size_after"] = output_path.stat().st_size
        return result


@router.post("/merge")
async def merge_files(
    files: list[UploadFile],
    user: dict = Depends(get_current_user),
) -> dict:
    if len(files) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Au moins deux fichiers PDF sont necessaires pour une fusion.",
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        input_paths = []
        first_stem = None
        for i, file in enumerate(files):
            try:
                content, ext = await _read_and_validate(file)
            except ConversionError as exc:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
            if ext != "pdf":
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Seuls des fichiers PDF peuvent etre fusionnes.",
                )
            if first_stem is None:
                first_stem = _safe_stem(file.filename or "document")
            input_path = tmp_path / f"input_{i}.pdf"
            input_path.write_bytes(content)
            input_paths.append(input_path)

        output_path = tmp_path / f"{first_stem}-fusion.pdf"
        try:
            merge_pdfs(input_paths, output_path)
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Echec de la fusion : {exc}"
            )

        return _publish(user["user_id"], output_path)


@router.post("/protect")
async def protect_file(
    file: UploadFile,
    password: str,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        content, ext = await _read_and_validate(file)
    except ConversionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if ext != "pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Seul un fichier PDF peut etre protege."
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        stem = _safe_stem(file.filename or "document")
        input_path = tmp_path / "input.pdf"
        input_path.write_bytes(content)
        output_path = tmp_path / f"{stem}.pdf"

        try:
            protect_pdf(input_path, password, output_path)
        except ConversionError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        return _publish(user["user_id"], output_path)


@router.post("/unlock")
async def unlock_file(
    file: UploadFile,
    password: str,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        content, ext = await _read_and_validate(file)
    except ConversionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if ext != "pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Seul un fichier PDF peut etre deverrouille."
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        stem = _safe_stem(file.filename or "document")
        input_path = tmp_path / "input.pdf"
        input_path.write_bytes(content)
        output_path = tmp_path / f"{stem}.pdf"

        try:
            unlock_pdf(input_path, password, output_path)
        except ConversionError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        return _publish(user["user_id"], output_path)


@router.post("/split")
async def split_file(
    file: UploadFile,
    pages: str,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        content, ext = await _read_and_validate(file)
    except ConversionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    if ext != "pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Seul un fichier PDF peut etre separe."
        )

    with tempfile.TemporaryDirectory() as tmpdir:
        tmp_path = Path(tmpdir)
        stem = _safe_stem(file.filename or "document")
        input_path = tmp_path / "input.pdf"
        input_path.write_bytes(content)
        output_path = tmp_path / f"{stem}-extrait.pdf"

        try:
            split_pdf(input_path, pages, output_path)
        except ConversionError as exc:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

        return _publish(user["user_id"], output_path)
