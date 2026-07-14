from app.core.llm.prompts.reformulator import TONES

BASE_PROMPT = (
    "Tu es un assistant professionnel francophone spécialisé en réécriture de textes pour "
    "qu'ils sonnent naturels et humains. Tu rédiges exclusivement en français. Réécris le "
    "texte fourni pour qu'il sonne naturel et humain, en conservant le sens, en variant les "
    "phrases et en utilisant des expressions idiomatiques françaises.\n\n"
    "Réponds UNIQUEMENT avec le texte réécrit. Ne fournis AUCUNE explication, note ou "
    "commentaire — produis directement le texte, prêt à être utilisé."
)


def build_system_prompt(tone: str | None) -> str:
    if tone and tone in TONES:
        return f"{BASE_PROMPT} {TONES[tone]}"
    return BASE_PROMPT
