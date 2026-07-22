# app/core/document_engine/palette.py
"""Palette curatee de couleurs d'accent choisissables par le user (cv/cover_letter
uniquement) — voir renderer.render(accent_override). Curatee plutot que libre : evite
qu'un choix de couleur rende un CV peu presentable (contraste faible, teinte criarde).
Doit rester synchronisee avec ACCENT_PALETTE (frontend/src/lib/accent-palette.ts)."""

ACCENT_PALETTE: dict[str, str] = {
    "bleu": "1565C0",
    "emeraude": "0E7C6B",
    "bordeaux": "7B2D26",
    "anthracite": "37474F",
    "marine": "0B1F3A",
    "aubergine": "5B3A5C",
    "ardoise": "45607A",
    "bronze": "8A6535",
}

ACCENT_PALETTE_HEX_VALUES = set(ACCENT_PALETTE.values())


def validate_accent_color(hex_value: str | None) -> str | None:
    """Renvoie hex_value s'il appartient a la palette curatee, sinon None (ignore
    silencieusement une valeur hors palette plutot que de lever une erreur — un
    choix de couleur n'est jamais critique)."""
    if hex_value and hex_value.upper().lstrip("#") in {v.upper() for v in ACCENT_PALETTE_HEX_VALUES}:
        return hex_value.lstrip("#")
    return None
