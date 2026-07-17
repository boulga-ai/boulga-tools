import io

import docx
from docx.oxml.ns import qn
from pypdf import PdfReader

MAX_TEXT_LENGTH = 50_000


class ExtractionError(Exception):
    pass


def _extract_docx_pages(content: bytes) -> tuple[list[str], bool]:
    """Decoupe un DOCX par coupures de page MANUELLES (Ctrl+Entree = <w:br type=page/>
    dans un run, ou la propriete de paragraphe page_break_before) quand elles existent —
    frontieres exactes. Sinon, replie sur des tranches d'environ 500 mots : une
    approximation, car le format DOCX ne stocke pas de pagination naturelle (calculee a
    l'affichage par un moteur de mise en page, absent ici). Renvoie (pages, exact)."""
    document = docx.Document(io.BytesIO(content))
    pages: list[str] = []
    current: list[str] = []
    found_manual_break = False

    for para in document.paragraphs:
        if para.paragraph_format.page_break_before and current:
            pages.append("\n".join(current))
            current = []
            found_manual_break = True

        current.append(para.text)

        has_inline_break = any(
            br.get(qn("w:type")) == "page"
            for run in para.runs
            for br in run._element.findall(qn("w:br"))
        )
        if has_inline_break:
            pages.append("\n".join(current))
            current = []
            found_manual_break = True

    if current:
        pages.append("\n".join(current))

    if found_manual_break:
        # Ne pas retirer les pages individuellement vides ici, meme raison que pour le
        # PDF (voir extract_pages) : la position dans la liste EST le numero de "Section"
        # affiche a l'utilisateur, une page blanche entre deux coupures manuelles doit
        # rester a sa place plutot que decaler les suivantes.
        return [p.strip() for p in pages], True

    full_text = "\n".join(pages).strip()
    words = full_text.split()
    chunk_size = 500
    chunks = [" ".join(words[i : i + chunk_size]) for i in range(0, len(words), chunk_size)]
    return (chunks or [full_text]), False


def extract_pages(filename: str, content: bytes) -> tuple[list[str], bool]:
    """Renvoie (pages, exact). 'exact' indique si les frontieres de page sont fiables
    (PDF, toujours ; DOCX seulement s'il contient des coupures de page manuelles) ou
    approximees (DOCX sans coupures manuelles, decoupe par tranches de mots ; TXT, une
    seule 'page' par definition)."""
    ext = filename.lower().rsplit(".", 1)[-1] if "." in filename else ""

    if ext == "pdf":
        try:
            reader = PdfReader(io.BytesIO(content))
            pages = [(page.extract_text() or "").strip() for page in reader.pages]
        except Exception as exc:
            raise ExtractionError("Impossible de lire ce PDF.") from exc
        exact = True
    elif ext == "docx":
        try:
            pages, exact = _extract_docx_pages(content)
        except Exception as exc:
            raise ExtractionError("Impossible de lire ce document Word.") from exc
    elif ext == "txt":
        try:
            text = content.decode("utf-8", errors="ignore").strip()
        except Exception as exc:
            raise ExtractionError("Impossible de lire ce fichier texte.") from exc
        pages = [text]
        exact = True
    else:
        raise ExtractionError(f"Format de fichier non supporte : .{ext}")

    if exact:
        # Ne PAS retirer les pages individuellement vides ici : leur position dans la
        # liste EST le numero de page (1-indexe) utilise partout en aval (page_scores,
        # et cote frontend le rendu pdf.js qui affiche les vraies pages du PDF). Une
        # page sans texte extractible (image seule, page blanche...) doit rester a sa
        # place comme page "trop courte" — la retirer decale tout ce qui suit d'un cran
        # et fait correspondre le score de la page N au texte reel de la page N+1.
        if not any(p.strip() for p in pages):
            raise ExtractionError("Aucun texte n'a pu etre extrait de ce fichier.")
    else:
        pages = [p for p in pages if p.strip()]
        if not pages:
            raise ExtractionError("Aucun texte n'a pu etre extrait de ce fichier.")

    # Filet de securite global, coherent avec l'ancienne limite extract_text : on
    # n'accumule pas indefiniment meme sur un document a des dizaines de pages denses.
    total = 0
    capped_pages: list[str] = []
    for p in pages:
        if total >= MAX_TEXT_LENGTH:
            break
        remaining = MAX_TEXT_LENGTH - total
        capped_pages.append(p[:remaining])
        total += len(p[:remaining])

    return capped_pages, exact


def extract_text(filename: str, content: bytes) -> str:
    """Texte brut joint (compat : utilise pour le plagiat, qui n'a pas besoin de
    frontieres de page)."""
    pages, _ = extract_pages(filename, content)
    return "\n\n".join(pages)[:MAX_TEXT_LENGTH]
