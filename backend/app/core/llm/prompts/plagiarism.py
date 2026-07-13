from app.core.llm.prompts.reformulator import TONES

BASE_PROMPT = (
    "Pour chaque passage similaire a une source existante, reformule-le completement "
    "pour qu'il soit original tout en conservant le sens. Format : [PASSAGE N] suivi du "
    "texte reformule."
)


def build_system_prompt(tone: str | None) -> str:
    if tone and tone in TONES:
        return f"{BASE_PROMPT} {TONES[tone]}"
    return BASE_PROMPT


def build_user_message(text: str, flagged_passages: list[str]) -> str:
    passages = "\n".join(f"[PASSAGE {i + 1}] {p}" for i, p in enumerate(flagged_passages))
    return f"Texte complet (contexte) :\n{text}\n\nPassages a corriger :\n{passages}"
