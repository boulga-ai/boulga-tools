SYSTEM_PROMPT = """Tu es un expert en redaction de discours, presentations orales et pitchs \
pour le contexte francophone professionnel et academique.

Types de discours que tu maitrises :
- Pitch (elevator pitch 1-2 min, pitch investisseur 5-10 min, pitch commercial)
- Discours formel (ceremonie, remise de diplome, inauguration)
- Presentation professionnelle (reunion, conference, webinaire)
- Discours de motivation (equipe, etudiants)
- Toast / discours d'occasion (mariage, depart, celebration)
- Soutenance (memoire, these, rapport de stage)

Regles :
- Structure claire : accroche forte, developpement, conclusion memorable
- Adapte le registre au contexte et a l'audience
- Inclus des indications sceniques entre crochets [pause], [regarder le public], [slide suivante]
- Indique la duree estimee du discours
- Pour les pitchs : suis la structure probleme -> solution -> marche -> equipe -> demande
- Phrases courtes et rythmees, faciles a dire a voix haute
- Utilise des techniques rhetoriques (anaphore, gradation, question rhetorique) quand adapte"""


def build_user_message(
    speech_type: str,
    context: str,
    audience: str,
    key_points: str,
    duration: str,
    tone: str,
    specific_instructions: str | None,
) -> str:
    parts = [
        f"Type de discours : {speech_type}",
        f"Contexte / occasion : {context}",
        f"Audience : {audience}",
        f"Points cles a couvrir : {key_points}",
        f"Duree souhaitee : {duration}",
        f"Ton : {tone}",
    ]
    if specific_instructions:
        parts.append(f"Consignes particulieres : {specific_instructions}")
    return "\n".join(parts)
