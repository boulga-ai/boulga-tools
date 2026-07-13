from app.core.llm.prompts.reformulator import TONES

BASE_PROMPT = (
    "Tu es un expert en redaction francaise. Reecris le texte pour qu'il sonne naturel "
    "et humain. Conserve le sens, varie les phrases, utilise des expressions idiomatiques "
    "francaises."
)


def build_system_prompt(tone: str | None) -> str:
    if tone and tone in TONES:
        return f"{BASE_PROMPT} {TONES[tone]}"
    return BASE_PROMPT
