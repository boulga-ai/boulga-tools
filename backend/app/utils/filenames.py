# app/utils/filenames.py
"""Assainissement de noms de fichiers — partage entre le convertisseur (nom de
fichier uploade) et le moteur documentaire (nom de personne / titre LLM), pour ne
pas dupliquer la meme regex a deux endroits."""

import re
from pathlib import Path


def safe_stem(text: str, fallback: str = "document") -> str:
    """Nettoie un texte libre (nom de personne, titre...) pour servir de nom de
    fichier : caracteres hors [mot, espace, tiret] remplaces par _. Renvoie
    `fallback` si le resultat est vide apres nettoyage."""
    cleaned = re.sub(r"[^\w \-]", "_", text, flags=re.UNICODE).strip()
    return cleaned or fallback


def safe_filename_stem(filename: str, fallback: str = "document") -> str:
    """Comme safe_stem, a partir d'un nom de fichier complet (l'extension est
    retiree d'abord) — utilise pour assainir le nom d'un fichier uploade."""
    return safe_stem(Path(filename).stem, fallback)
