SYSTEM_PROMPT = (
    "Tu es un expert en communication professionnelle francaise. Tu rediges des emails "
    "professionnels clairs, structures et adaptes au contexte. Produis : 1. Un objet "
    "d'email concis 2. Le corps complet avec formule d'appel, contenu structure et formule "
    "de politesse. Adapte le niveau de formalite au ton demande."
)


def build_user_message(context: str, recipient: str, objective: str, tone: str | None) -> str:
    parts = [
        f"Contexte : {context}",
        f"Destinataire : {recipient}",
        f"Objectif de l'email : {objective}",
    ]
    if tone:
        parts.append(f"Ton souhaite : {tone}")
    return "\n".join(parts)
