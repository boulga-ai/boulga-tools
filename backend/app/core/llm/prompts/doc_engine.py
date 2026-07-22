"""Prompts guides du moteur documentaire generique (V3) : un system prompt par
doc_type et par mode (analyze/generate), construit dynamiquement a partir du
vocabulaire de blocs — jamais de plan ou de question hardcodee ici, uniquement des
instructions qui laissent le LLM decider."""

import json

from app.core.document_engine.blocks import BLOCK_REGISTRY, effective_schema
from app.core.llm.client import cacheable_system_message

_INTRO = (
    "Tu es un assistant professionnel francophone specialise en redaction de "
    "documents pour le contexte francophone ouest-africain. Tu rediges "
    "exclusivement en francais. N'utilise jamais d'emojis ni de symboles "
    "decoratifs (stickers) dans le contenu du document : un document professionnel "
    "reste sobre visuellement, du texte uniquement."
)

# CV et lettre de motivation tiennent en 1-2 pages : l'axe "profondeur" (essentiel/
# detaille/tres detaille), pense pour des documents longs (pro_doc/academic), n'a pas
# de sens ici — seule la richesse du template/palier (voir TEMPLATE_OVERRIDES,
# resolve_model "competence") module leur contenu.
_DOC_TYPES_WITHOUT_DEPTH = {"cv", "cover_letter"}


def _blocks_vocabulary_text(schema: dict) -> str:
    lines = []
    for block_name in schema["blocks"]:
        model_cls = BLOCK_REGISTRY[block_name]
        fields = ", ".join(model_cls.model_fields.keys())
        lines.append(f"- {block_name} : champs [{fields}]")
    return "\n".join(lines)


# Consigne d'intention, jamais un compte de mots impose — le LLM juge la longueur
# exacte. Reutilise l'echelle du Generateur de plan (PlannerDepth) plutot que d'en
# inventer une autre.
_DEPTH_GUIDANCE = {
    "essentiel": "Reste concis : va a l'essentiel, evite les developpements superflus.",
    "detaille": "Developpe raisonnablement chaque section, avec des exemples ou explications quand c'est utile.",
    "tres_detaille": "Developpe en profondeur, avec des sous-parties et des exemples concrets — un document approfondi.",
}


def _depth_instruction(depth: str) -> str:
    return _DEPTH_GUIDANCE.get(depth, _DEPTH_GUIDANCE["detaille"])


def build_analyze_system_prompt(doc_type: str, template: str | None = None) -> str:
    schema = effective_schema(doc_type, template)
    return (
        f"{_INTRO}\n\n"
        f"Nature du document : {schema['description']}\n\n"
        f"Blocs de contenu disponibles pour ce document :\n{_blocks_vocabulary_text(schema)}\n\n"
        f"{schema['guidance']}\n\n"
        "Ton role ICI est d'ANALYSER et d'ENRICHIR ce que le user a fourni, sans "
        "produire le document.\n"
        "A chaque analyse, comprends ce qui est deja etabli (cadrage, informations "
        "validees, historique des echanges), et reponds de la facon la plus utile a "
        "ce stade de la conversation. Tu as plusieurs formes de reponse a ta "
        "disposition, a combiner ou utiliser seules selon ce qui sert le mieux le "
        "user : poser une ou plusieurs questions ciblees, faire des suggestions "
        "concretes qu'il pourra accepter ou refuser, resumer ce que tu as compris, "
        "proposer une structure de document si tu juges en avoir assez de matiere, "
        "ou simplement indiquer que les informations te semblent suffisantes. "
        "Choisis librement la forme, le nombre et le moment — il n'y a pas de "
        "minimum impose. Reste actif dans le dialogue (jamais de reponse vide), "
        "sans fabriquer de question ou de suggestion superflue si tu n'en as pas "
        "de pertinente.\n\n"
        "REGLES :\n"
        "- Ne pose JAMAIS une question dont la reponse figure deja dans le cadrage, "
        "les informations validees ou l'historique.\n"
        "- Les suggestions sont specifiques a ce cas precis, jamais generiques ou "
        "interchangeables d'un user a l'autre.\n"
        "- Tu ne bloques jamais la suite : le user peut generer le document a tout "
        "moment, avec ou sans repondre a tes questions.\n\n"
        "Reponds UNIQUEMENT en JSON strictement valide, sans aucun texte avant ou "
        "apres, exactement sous cette forme :\n"
        '{"message": "...", "questions": [{"id": "...", "text": "...", '
        '"optional": true, "input_type": "text"}], "suggestions": [{"id": "...", '
        '"label": "...", "value": "...", "target": "...", "recommended": true}], '
        '"can_propose_plan": true, "proposed_plan": null}\n\n'
        "proposed_plan est une liste de {\"heading\": \"...\", \"summary\": \"...\"} "
        "decrivant chaque section prevue, coherente avec le vocabulaire de blocs "
        "ci-dessus. Remplis-le des que tu juges avoir assez de matiere pour "
        "proposer une structure utile — pas seulement si le user te le demande "
        "explicitement, meme si c'est evidemment aussi un signal fort — sinon "
        "laisse-le a null."
    )


def build_generate_system_prompt(doc_type: str, depth: str = "detaille", template: str | None = None) -> str:
    schema = effective_schema(doc_type, template)
    depth_line = (
        "" if doc_type in _DOC_TYPES_WITHOUT_DEPTH else f"Niveau de detail attendu : {_depth_instruction(depth)}\n\n"
    )
    return (
        f"{_INTRO}\n\n"
        f"Nature du document : {schema['description']}\n\n"
        f"Blocs disponibles, avec leurs champs JSON exacts :\n{_blocks_vocabulary_text(schema)}\n\n"
        f"{schema['guidance']}\n\n"
        f"{depth_line}"
        "Tu rediges ce document COMPLET et professionnel en francais, en "
        "assemblant les blocs ci-dessus. Tu decides librement de la structure : "
        "nombre de titres, sous-titres, sections, listes, tableaux — selon le "
        "contenu et ce qui a ete etabli jusqu'ici. Prefere les blocs specialises "
        "a un paragraphe generique quand ils s'appliquent (ex : experience plutot "
        "qu'un paragraphe qui decrit un poste).\n\n"
        "REGLES STRICTES :\n"
        "- Utilise toutes les informations validees et le cadrage fournis.\n"
        "- Si une information manque, NE BLOQUE JAMAIS : laisse un champ vide ou "
        "redige un contenu generique plausible plutot que d'inventer des faits "
        "precis (chiffres, noms propres, dates).\n"
        "- Aucun meta-commentaire, aucune explication en dehors des blocs "
        "eux-memes.\n\n"
        "EMETS TA SORTIE EN JSONL STRICT : un objet JSON complet par ligne, "
        "chaque ligne correspondant a un bloc du vocabulaire ci-dessus, dans "
        "l'ordre du document. Pas de tableau JSON englobant, pas de texte "
        "avant/apres, pas de blocs de code markdown — uniquement les lignes JSONL, "
        "une par bloc."
    )


def build_segment_system_prompt(doc_type: str, depth: str = "detaille") -> str:
    """Variante du prompt de generation pour les documents longs (academique ou
    pro_doc), rediges par segments successifs (voir documents_engine.py) plutot
    qu'en un seul appel — pour eviter la troncature, le timeout, et le cout excessif
    d'un document de 40+ pages genere d'un coup."""
    schema = effective_schema(doc_type)
    return (
        f"{_INTRO}\n\n"
        f"Nature du document : {schema['description']}\n\n"
        f"Blocs disponibles, avec leurs champs JSON exacts :\n{_blocks_vocabulary_text(schema)}\n\n"
        f"{schema['guidance']}\n\n"
        f"Niveau de detail attendu : {_depth_instruction(depth)}\n\n"
        "Ce document est long : il est redige par segments successifs, chacun "
        "correspondant a un groupe de sections du plan. Tu recois le plan complet "
        "du document et un resume de ce qui a deja ete redige dans les segments "
        "precedents, pour garder la coherence (style, ce qui a deja ete dit, "
        "numerotation).\n\n"
        "REGLES STRICTES :\n"
        "- Redige UNIQUEMENT les sections demandees pour ce segment — pas les "
        "autres, meme si tu les vois dans le plan complet.\n"
        "- Utilise toutes les informations validees et le cadrage fournis.\n"
        "- Si une information manque, NE BLOQUE JAMAIS : laisse un champ vide ou "
        "redige un contenu generique plausible plutot que d'inventer des faits "
        "precis (chiffres, noms propres, dates).\n"
        "- Reste coherent avec ce qui a deja ete redige (resume fourni) : ne "
        "repete pas ce qui a deja ete dit, ne te contredis pas.\n\n"
        "EMETS TA SORTIE EN JSONL : un objet JSON complet par ligne pour chaque "
        "bloc de ce segment, dans l'ordre. Une fois tous les blocs du segment "
        "emis, termine par UNE DERNIERE LIGNE commencant par 'SUMMARY: ' suivie "
        "d'un resume de 2 a 3 phrases de ce que tu viens de rediger dans ce "
        "segment — ce resume sera transmis aux segments suivants pour garder le "
        "fil. Aucun texte hors des lignes JSONL et hors cette ligne SUMMARY finale."
    )


def build_segment_messages(
    context: dict,
    plan: list[dict],
    segment_sections: list[dict],
    previous_summaries: list[str],
) -> list[dict]:
    """Construit les messages pour un appel de segment (generation academique
    longue). context suit le meme format que pour build_messages (cadrage,
    validated_info...) ; plan est le plan complet (liste de {heading, summary}) ;
    segment_sections est le sous-ensemble a rediger dans cet appel ;
    previous_summaries accumule les resumes des segments deja generes."""
    doc_type = context["doc_type"]
    depth = context.get("depth") or "detaille"
    messages: list[dict] = [cacheable_system_message(build_segment_system_prompt(doc_type, depth))]

    cadrage = context.get("cadrage") or {}
    validated_info = context.get("validated_info") or {}
    state_text = "Contexte etabli jusqu'ici (a reutiliser, ne pas redemander) :\n"
    if cadrage:
        state_text += "Cadrage : " + json.dumps(cadrage, ensure_ascii=False) + "\n"
    if validated_info:
        state_text += "Informations validees : " + json.dumps(validated_info, ensure_ascii=False) + "\n"
    plan_text = "\n".join(
        f"- {p.get('heading', '')}" + (f" : {p['summary']}" if p.get("summary") else "") for p in plan
    )
    state_text += f"Plan complet du document :\n{plan_text}"
    messages.append({"role": "user", "content": state_text})
    messages.append({"role": "assistant", "content": "Compris, j'en tiens compte."})

    if previous_summaries:
        summaries_text = "Resume des sections deja redigees dans les segments precedents :\n" + "\n".join(
            f"- {s}" for s in previous_summaries
        )
        messages.append({"role": "user", "content": summaries_text})
        messages.append({"role": "assistant", "content": "Compris, je reste coherent avec ce qui precede."})

    sections_text = ", ".join(s.get("heading", "") for s in segment_sections)
    messages.append({"role": "user", "content": f"Redige maintenant les sections suivantes : {sections_text}."})

    return messages


def build_messages(context: dict, mode: str) -> list[dict]:
    """Construit la liste messages (system cacheable + etat etabli + historique des
    tours + dernier message) pour le mode 'analyze' ou 'generate'. Le contexte de
    travail (cadrage, informations validees, plan) est injecte en tete de
    conversation pour que le LLM ne le reconstruise pas depuis l'historique brut ;
    l'historique lui-meme est renvoye tel quel — aucun resume/compaction ici. Pour
    les documents longs (academique ou pro_doc), la generation passe par un
    mecanisme distinct et reellement implemente (build_segment_messages ci-dessus,
    appele depuis documents_engine.py quand le plan depasse
    settings.LONG_DOC_SEGMENT_THRESHOLD sections) : plusieurs appels successifs,
    chacun recevant un resume compact des segments deja rediges."""
    doc_type = context["doc_type"]
    depth = context.get("depth") or "detaille"
    template = context.get("template")
    system_text = (
        build_analyze_system_prompt(doc_type, template)
        if mode == "analyze"
        else build_generate_system_prompt(doc_type, depth, template)
    )
    messages: list[dict] = [cacheable_system_message(system_text)]

    cadrage = context.get("cadrage") or {}
    validated_info = context.get("validated_info") or {}
    plan = context.get("plan") or None
    if cadrage or validated_info or plan:
        state_text = "Contexte etabli jusqu'ici (a reutiliser, ne pas redemander) :\n"
        if cadrage:
            state_text += "Cadrage : " + json.dumps(cadrage, ensure_ascii=False) + "\n"
        if validated_info:
            state_text += "Informations validees : " + json.dumps(validated_info, ensure_ascii=False) + "\n"
        if plan:
            plan_text = "\n".join(
                f"- {p.get('heading', '')}" + (f" : {p['summary']}" if p.get("summary") else "")
                for p in plan
            )
            state_text += f"Plan valide par le user :\n{plan_text}"
        messages.append({"role": "user", "content": state_text.rstrip()})
        messages.append({"role": "assistant", "content": "Compris, j'en tiens compte."})

    for turn in context.get("history") or []:
        role = turn.get("role")
        content = turn.get("content", "")
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})

    user_message = (context.get("user_message") or "").strip()

    if mode == "analyze":
        if context.get("request_plan"):
            ask_plan = "Propose maintenant un plan structure pour ce document."
            user_message = f"{user_message}\n\n{ask_plan}" if user_message else ask_plan
        messages.append(
            {"role": "user", "content": user_message or "Analyse ce que j'ai fourni jusqu'ici."}
        )
    else:
        # Le texte libre (user_message) est souvent la SEULE source d'information quand
        # le user genere directement sans jamais appeler /analyze ("CV express") — il
        # doit toujours atteindre le LLM, pas seulement en mode analyze.
        if user_message:
            messages.append({"role": "user", "content": user_message})

        instruction = (context.get("adjust_instruction") or "").strip()
        if instruction:
            messages.append(
                {
                    "role": "user",
                    "content": (
                        f"Instruction d'ajustement : {instruction}\n\n"
                        "Regenere le document complet en tenant compte de cette instruction."
                    ),
                }
            )
        else:
            messages.append(
                {"role": "user", "content": "Genere le document complet maintenant, en JSONL, un bloc par ligne."}
            )

    return messages
