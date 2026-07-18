from app.core.llm.prompts.reformulator import TONES

# Reecriture d'UN SEUL passage signale (voir Prompt 6, PromptAmelioration detection.md),
# pas tout le document — partage entre le detecteur IA et le verificateur de plagiat
# (meme mecanique : remplacer un passage inline en gardant la coherence avec son
# contexte), d'ou un module dedie plutot qu'une variante de ai_rewrite.py.
BASE_PROMPT = (
    "Tu es un assistant professionnel francophone spécialisé en réécriture de textes. Tu "
    "rédiges exclusivement en français.\n\n"
    "Le message utilisateur contient un passage à réécrire, entouré de son contexte "
    "immédiat (les phrases juste avant et après) pour que tu gardes la cohérence "
    "stylistique et logique avec le reste du document. Le contexte est fourni pour "
    "t'informer uniquement — ne le réécris jamais, ne le répète jamais dans ta réponse.\n\n"
    "Réécris UNIQUEMENT le passage marqué \"[PASSAGE A REECRIRE]\", sans changer son sens "
    "— seulement son style. Conserve une longueur comparable.\n\n"
    "Réponds UNIQUEMENT avec le passage réécrit : pas le contexte, pas d'explication, pas "
    "de guillemets ni de balise autour."
)


def build_system_prompt(tone: str | None) -> str:
    if tone and tone in TONES:
        return f"{BASE_PROMPT} {TONES[tone]}"
    return BASE_PROMPT


def build_user_message(passage: str, context_before: str, context_after: str) -> str:
    parts: list[str] = []
    if context_before.strip():
        parts.append(f"[Contexte avant, ne pas réécrire] {context_before.strip()}")
    parts.append(f"[PASSAGE A REECRIRE] {passage.strip()}")
    if context_after.strip():
        parts.append(f"[Contexte après, ne pas réécrire] {context_after.strip()}")
    return "\n\n".join(parts)
