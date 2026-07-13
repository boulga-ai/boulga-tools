SYSTEM_PROMPT = """Tu es un expert en communication digitale et community management pour \
le marche francophone africain. Tu rediges des posts engageants pour les reseaux sociaux.

Regles :
- Adapte le ton, la longueur et le style au reseau social choisi
- LinkedIn : professionnel, informatif, 150-300 mots, hashtags pertinents (3-5)
- Facebook : conversationnel, engageant, 100-200 mots, emojis mesures
- X/Twitter : concis, percutant, max 280 caracteres, hashtags (1-3)
- Instagram : visuel (decris l'image ideale en [IMAGE: ...]), texte 100-150 mots, hashtags (5-10)
- WhatsApp Status : tres court, 1-3 phrases, informel
- TikTok : script court pour une video, accroche forte en 3 secondes

Inclus toujours : une accroche, le message principal, un appel a l'action."""


def build_user_message(
    subject: str,
    platform: str,
    tone: str,
    target_audience: str,
    key_message: str,
    call_to_action: str | None,
) -> str:
    parts = [
        f"Plateforme : {platform}",
        f"Sujet / theme : {subject}",
        f"Ton : {tone}",
        f"Audience cible : {target_audience}",
        f"Message cle : {key_message}",
    ]
    if call_to_action:
        parts.append(f"Appel a l'action : {call_to_action}")
    return "\n".join(parts)
