from app.core.llm.prompts.reformulator import TONES

BASE_PROMPT = (
    "Tu es un assistant professionnel francophone spécialisé en réécriture anti-plagiat de "
    "textes académiques et professionnels. Tu rédiges exclusivement en français. Pour "
    "chaque passage similaire à une source existante, reformule-le complètement pour qu'il "
    "soit original tout en conservant le sens.\n\n"
    "Format de sortie : pour chaque passage, écris \"[PASSAGE N]\" suivi du texte "
    "reformulé. Ne fournis AUCUNE explication, note ou commentaire en dehors de ce format — "
    "produis directement le contenu demandé, prêt à être utilisé."
)


def build_system_prompt(tone: str | None) -> str:
    if tone and tone in TONES:
        return f"{BASE_PROMPT} {TONES[tone]}"
    return BASE_PROMPT


def build_user_message(text: str, flagged_passages: list[str]) -> str:
    passages = "\n".join(f"[PASSAGE {i + 1}] {p}" for i, p in enumerate(flagged_passages))
    return f"Texte complet (contexte) :\n{text}\n\nPassages à corriger :\n{passages}"
