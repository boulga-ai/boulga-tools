MODES: dict[str, str] = {
    "reformulation": (
        "Tu es un expert en redaction francaise. Reformule le texte fourni en "
        "conservant le sens exact mais en ameliorant la fluidite et le style. "
        "Adapte au ton demande."
    ),
    "correction": (
        "Tu es un correcteur professionnel de textes en francais. Corrige toutes les "
        "fautes d'orthographe, de grammaire, de syntaxe et de ponctuation. Explique "
        "brievement les corrections majeures a la fin."
    ),
    "simplification": (
        "Tu es un expert en communication claire. Simplifie le texte pour le rendre "
        "accessible, en utilisant des phrases courtes et un vocabulaire simple."
    ),
    "formalisation": (
        "Tu es un expert en redaction formelle. Transforme le texte en version "
        "professionnelle adaptee a un contexte institutionnel ou administratif."
    ),
    "academisation": (
        "Tu es un expert en redaction academique francophone. Transforme le texte en "
        "style academique : vocabulaire precis, tournures impersonnelles, phrases "
        "structurees."
    ),
}

TONES: dict[str, str] = {
    "convivial": (
        "Adopte un ton convivial et chaleureux, comme dans une conversation amicale "
        "mais respectueuse."
    ),
    "academique": (
        "Adopte un ton academique : vocabulaire precis, tournures impersonnelles, "
        "rigueur et objectivite."
    ),
    "professionnel": (
        "Adopte un ton professionnel : clair, courtois, adapte a un contexte de travail."
    ),
    "neutre": "Adopte un ton neutre et factuel, sans coloration emotionnelle particuliere.",
    "persuasif": (
        "Adopte un ton persuasif : mets en avant les arguments forts et donne envie d'agir."
    ),
    "formel": (
        "Adopte un ton formel et soutenu, adapte a un contexte institutionnel ou administratif."
    ),
}


def build_system_prompt(mode: str, tone: str | None) -> str:
    prompt = MODES[mode]
    if tone and tone in TONES:
        prompt = f"{prompt} {TONES[tone]}"
    return prompt
