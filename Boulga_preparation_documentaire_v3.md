# Boulga AI — Génération documentaire V3 (architecture propre)

## À LIRE AVANT TOUT — Claude Code, méthode de travail

Ce fichier redéfinit COMPLÈTEMENT la production de documents dans Boulga. Il
remplace toute approche documentaire précédente.

**Règles de méthode (valables pour CHAQUE prompt ci-dessous) :**
- Ne te presse pas. La qualité de l'architecture prime sur la vitesse.
- Avant de modifier du code existant, ANALYSE-le d'abord et comprends ce qui est
  déjà en place. Signale ce que tu vas remplacer ou supprimer.
- Signale explicitement tout changement sur les tables existantes ou le code
  existant (fichiers supprimés, endpoints retirés, colonnes migrées).
- À la fin de CHAQUE prompt, VÉRIFIE que l'approche est bien faite : relis ton
  code, teste le comportement, confirme que ça respecte le préambule. Ne conclus
  pas un prompt sans cette vérification.
- À la toute fin (après V3-7), produis un ÉTAT DES LIEUX complet (voir V3-8).

**Principe directeur : le LLM pilote tout, le code ne fait qu'afficher et
orchestrer.** Zéro logique métier hardcodée sur le contenu des documents, zéro
regex, zéro structure de plan imposée, rien ne bloque jamais la génération.

---

## Les 5 contraintes caduques à DÉMANTELER

L'implémentation actuelle porte 5 contraintes héritées qui s'opposent à cette
vision. Chaque prompt ci-dessous en démantèle une partie. Elles sont nommées ici
pour que tu saches précisément quoi remplacer :

1. **Schémas Pydantic rigides par type de document** (`CVContent`,
   `CoverLetterContent`, `ProDocContent`, `AcademicDocContent`) utilisés comme
   contrat de sortie du LLM. Champs figés (`experiences[]`, `skills[]`...), aucune
   liberté structurelle. → Remplacés par le vocabulaire de blocs (V3-1).

2. **Templates python-docx un-fichier-un-design** (`cv_modern.py`...) qui relisent
   les champs du schéma Content et réimplémentent chacun leur mise en page de zéro.
   Aucune couche partagée "type de bloc → style". → Remplacés par un renderer
   générique bloc→style (V3-5).

3. **Endpoints d'analyse one-shot sans historique** (`/cv/extract`,
   `/cover-letter/insights`, `/pro-doc/analyze`) : appels uniques texte→JSON, pas
   de tours qui s'accumulent. → Remplacés par un endpoint conversationnel à
   historique (V3-3).

4. **Pont Analyser→Générer via l'état React reconstruit** : "Générer" sérialise
   l'état local du formulaire, pas l'historique des échanges ni les décisions
   accepter/refuser. Le "générer direct" ne marche que via un `free_text` bricolé.
   → Remplacé par un contexte de travail unique transmis tel quel (V3-3, V3-4).

5. **Absence de format `messages` multi-tours** : `complete_json`/`_run_stream_tool`
   attendent une paire system+user courte reconstruite à chaque appel. → Refondus
   pour accepter un historique de tours variable (V3-2, V3-3).

---

## Points techniques tranchés (à ne pas re-débattre)

**Streaming d'un JSON de blocs.** Un JSON structuré ne se streame pas comme du
texte brut, et on veut garder l'effet "ça s'écrit sous les yeux". Décision
retenue : **streaming bloc par bloc, pas caractère par caractère.**
- Le LLM émet les blocs séquentiellement, un objet JSON complet par ligne (format
  JSONL / NDJSON) : `{"type":"heading",...}` puis `{"type":"paragraph",...}` etc.
- Le backend lit le flux ligne par ligne ; dès qu'une ligne est un bloc JSON
  complet et valide, il l'émet en événement SSE `block`.
- Le frontend ajoute chaque bloc au document au fur et à mesure → effet "le
  document se construit section par section", sans parseur de JSON partiel fragile.
- À la fin, le backend assemble tous les blocs en un Document JSON validé et le
  sauvegarde. Événement SSE `done` avec l'id du document.
- Si un bloc arrive mal formé : on l'ignore proprement (réparation douce), on ne
  casse jamais le flux.
On n'investit PAS dans un parseur de JSON partiel caractère par caractère.

**Caching OpenRouter — gain réel mais NON uniforme.** Le caching du system prompt
n'est garanti que sur Claude (caching explicite par points de coupure). Sur Gemini
c'est implicite au-delà d'un seuil, sur Grok/DeepSeek c'est marginal ou absent.
Décision : on STRUCTURE le system prompt en tête (constant par doc_type) pour en
bénéficier quand le provider le permet, mais on ne compte PAS dessus comme une
garantie de coût uniforme. Ne pas présenter le caching comme un acquis partout.

**Tableaux et listes dans les documents.** Un rapport, un document pro, contiennent
naturellement des tableaux (en nombre raisonnable) et souvent des listes à puces.
Le prompt de génération doit explicitement inviter le LLM à utiliser les blocs
`table`, `bullet_list`, `numbered_list` quand le type de document et le contenu s'y
prêtent — sans en abuser (pas de tableau gratuit, pas de listes partout).

**Templates renforcés selon le palier d'abonnement.** Le rendu d'un même document
doit être plus riche selon le niveau d'abonnement (couleurs, typographie soignée,
éléments graphiques, mise en page premium). Un Océan a des templates plus aboutis
qu'un Goutte. Cette modulation vit dans la couche de rendu (V3-5).

---

## Architecture en 3 couches (à respecter partout)

1. **Vocabulaire de blocs** — chaque type de document a une structure JSON qui
   décrit les blocs disponibles, PAS des titres figés. Le LLM compose librement.
2. **Le LLM** — reçoit un prompt guide (rôle + vocabulaire + instructions). Il
   décide seul des questions, suggestions, et de la structure finale.
3. **Le renderer** — reçoit le JSON de blocs et applique le design du template
   (modulé par le palier). Le même JSON se rend dans n'importe quel template.

---

## Prompt V3-1 — Vocabulaire de blocs et schémas de documents

```
AVANT DE CODER : analyse les schémas Pydantic existants (CVContent,
CoverLetterContent, ProDocContent, AcademicDocContent) et repère partout où ils
sont utilisés (endpoints, renderer, frontend). Tu vas les remplacer par un
vocabulaire de blocs. Liste les fichiers impactés avant de commencer.

Crée app/core/document_engine/blocks.py avec un vocabulaire de blocs (modèles
Pydantic), chacun avec un champ "type" discriminant.

Socle commun (tous documents) :
- HeadingBlock { type:"heading", level:int(1-4), text, numbered?:bool }
- ParagraphBlock { type:"paragraph", text }
- BulletListBlock { type:"bullet_list", items:list[str] }
- NumberedListBlock { type:"numbered_list", items:list[str] }
- TableBlock { type:"table", headers:list[str], rows:list[list[str]], caption? }
- QuoteBlock { type:"quote", text }
- SpacerBlock { type:"spacer" }
- PageBreakBlock { type:"page_break" }

Blocs CV :
- ContactBlock, SummaryBlock, ExperienceBlock (position, company, start, end,
  achievements:list[str]), EducationBlock, SkillGroupBlock, LanguageBlock

Blocs lettre :
- LetterHeaderBlock (sender, recipient, place, date), SubjectBlock, SignatureBlock

Blocs pro/académique :
- CoverPageBlock (title, author?, institution?, supervisor?, date?, extra:dict —
  champs vides ignorés au rendu), TableOfContentsBlock, BibliographyBlock

Définis DOCUMENT_SCHEMAS = { doc_type: { description, blocks:[...],
guidance } } pour cv, cover_letter, pro_doc, academic. La "guidance" décrit la
nature du document ET rappelle les blocs typiques (ex pro_doc/academic :
"utilise des tableaux pour les données chiffrées et des listes à puces pour les
énumérations, sans en abuser").

Crée app/core/document_engine/document.py :
- Document = { doc_type, meta:dict, blocks:list[Block] } (union discriminée).
- validate_document(json) → valide les blocs pour ce doc_type.
- repair_block(raw) → répare un bloc légèrement mal formé, sinon le retourne None
  (à ignorer). Ne jamais planter la génération pour un bloc défectueux.

AUCUNE structure de plan imposée ici. On ne définit que le VOCABULAIRE.

VÉRIFICATION FIN DE PROMPT : confirme que les blocs couvrent tous les besoins des
4 types de documents (y compris tableaux et listes pour rapports/pro), et que la
validation/réparation ne casse jamais sur un bloc défectueux.
```

## Prompt V3-2 — Fonctions d'appel LLM multi-tours + prompts guides

```
AVANT DE CODER : analyse les fonctions LLM existantes (complete_json,
_run_stream_tool, le client OpenRouter). Elles attendent une paire system+user
courte. Tu vas les refondre pour accepter un historique de tours variable
(format messages). Liste ce qui les appelle avant de modifier.

=== Refonte des fonctions d'appel (contrainte caduque #5) ===

Dans app/core/llm/client.py :
- Refonds les fonctions d'appel pour accepter messages: list[{role, content}]
  (system + tours user/assistant) au lieu d'une paire courte.
- Ajoute un paramètre pour marquer le system prompt comme cacheable (cache
  explicite pour Claude via le mécanisme Anthropic ; pour les autres providers,
  simplement placer le system en tête — le caching implicite s'appliquera ou non
  selon le provider, sans garantie). Documente que le gain n'est PAS uniforme.
- Une fonction stream_blocks(messages, model) qui streame la sortie en JSONL :
  lit le flux, isole chaque ligne, et yield chaque bloc JSON complet dès qu'il
  est parsable. Réparation douce des blocs mal formés.
- Une fonction call_json(messages, model) pour les réponses JSON non streamées
  (l'analyse).

=== Prompts guides ===

Crée app/core/llm/prompts/doc_engine.py :

build_analyze_system_prompt(doc_type) — prompt système (placé en tête, cacheable) :
« Tu es un assistant expert francophone qui aide à produire un [doc_type].
Nature du document : [description]. Blocs de contenu disponibles : [blocs].
Ton rôle ICI est d'ANALYSER et d'ENRICHIR, sans produire le document.
À chaque analyse :
1. Comprends ce qui est fourni. 2. Identifie ce qui manque ou gagnerait à être
précisé vu la structure attendue. 3. Pose des questions ciblées ET/OU propose des
suggestions concrètes acceptables/refusables.
RÈGLES : tant que tu n'as pas proposé de plan, tu fournis TOUJOURS au moins une
question ou une suggestion (jamais de cul-de-sac). Jamais de question dont la
réponse est déjà connue. Suggestions spécifiques au cas. Tu ne bloques jamais.
Réponds UNIQUEMENT en JSON : { message, questions:[{id,text,optional,input_type}],
suggestions:[{id,label,value,target,recommended}], can_propose_plan:bool,
proposed_plan: null | [{heading, summary}] }.
Ne remplis proposed_plan que si l'utilisateur demande le plan. »

build_generate_system_prompt(doc_type) — prompt système (cacheable) :
« Tu rédiges un [doc_type] complet et professionnel en français. Nature :
[description]. Blocs disponibles avec leur JSON : [blocs détaillés].
Assemble ces blocs comme il convient. Tu décides librement de la structure :
nombre de titres, sous-titres, sections, listes, tableaux, selon le contenu.
Utilise les blocs spécialisés quand ils s'appliquent. Pour un rapport ou un
document pro, emploie des tableaux pour les données chiffrées et des listes à
puces pour les énumérations, sans en abuser.
RÈGLES : utilise toutes les infos validées. Si une info manque, NE BLOQUE PAS :
champ vide ou contenu générique plausible. Aucun méta-commentaire.
ÉMETS TA SORTIE EN JSONL : un objet bloc JSON complet par ligne, dans l'ordre du
document. Chaque bloc conforme au vocabulaire. »

build_messages(context, mode) : construit la liste messages (system cacheable +
historique des tours + dernier message user) pour "analyze" ou "generate".
Le contexte : doc_type, cadrage, history (tours), validated_info, plan éventuel.

VÉRIFICATION FIN DE PROMPT : teste que les fonctions acceptent un historique qui
grossit, que stream_blocks yield bien bloc par bloc, et que le mode génération
sort du JSONL parsable. Confirme que le comportement de caching est documenté
comme non uniforme.
```

## Prompt V3-3 — Endpoints conversationnels (analyze / generate)

```
AVANT DE CODER : repère et liste les endpoints one-shot existants (/cv/extract,
/cover-letter/insights, /pro-doc/analyze, /tools/generators/*). Tu vas les
remplacer par un routeur générique. Signale ceux que tu supprimes.

Crée app/api/v1/tools/documents_engine.py (routeur générique pour cv,
cover_letter, pro_doc, academic) :

POST /api/v1/documents/{doc_type}/analyze
- Reçoit { context } = { cadrage, history, validated_info, user_message,
  request_plan:bool }
- build_messages(context, "analyze") → call_json(messages, model)
- Renvoie le JSON d'analyse (message, questions, suggestions, plan éventuel)
- Log usage + consume quota (peu de mots). Appelable plusieurs fois : chaque
  appel ajoute un tour à history.

POST /api/v1/documents/{doc_type}/generate
- Reçoit { context } (même partiel — TOUJOURS appelable)
- build_messages(context, "generate") → stream_blocks(messages, model)
- Émet chaque bloc en SSE `block` au fil de l'eau (effet construction en direct)
- À la fin : assemble le Document, valide (repair douce), insère dans documents
  (content_json = JSON de blocs, tool = doc_type), émet SSE `done` avec l'id.
- NE REND PAS le fichier ici (rendu au téléchargement, V3-5).
- Log usage + consume quota.

POST /api/v1/documents/{doc_type}/generate accepte aussi une instruction
d'ajustement optionnelle (adjust_instruction) ajoutée au contexte pour régénérer.

Le routeur LLM route : cv, cover_letter → grok-4.3 / claude-sonnet-4.6 selon
palier ; pro_doc, academic → grok-4.5 / claude-sonnet-4.6. Gemini/DeepSeek en
alternative sur paliers bas.

Supprime les anciens endpoints de génération documentaire par formulaire.

VÉRIFICATION FIN DE PROMPT : teste /generate SANS jamais appeler /analyze (doit
marcher). Teste /analyze deux fois de suite (le 2e tour voit le 1er dans history).
Confirme que les blocs arrivent bien en SSE au fil de l'eau.
```

## Prompt V3-4 — Interface unique conversationnelle

```
AVANT DE CODER : repère le code frontend existant des 4 outils (stepper,
GuidedFlow, SmartForm, formulaires). Liste ce que tu supprimes. Tu remplaces tout
par une vue unique partagée.

Crée src/components/tools/DocumentWorkspace.tsx — layout 2 colonnes (desktop) /
empilé (mobile) :

COLONNE GAUCHE — dialogue & enrichissement :
- Zone de cadrage MINIMALE et FACULTATIVE, propre au doc_type (props). Ex CV :
  nom, email, téléphone, poste visé.
- Grand textarea principal (label + placeholder par doc_type via props).
- DEUX boutons, TOUJOURS actifs tous les deux :
  * « Analyser mes informations » (secondaire) → POST /analyze
  * « Générer le document » (primaire) → POST /generate
  Cliquables dans n'importe quel ordre, à tout moment.
- Zone de dialogue (composant AIInteraction) affichant la réponse de /analyze :
  * message IA (texte)
  * questions → champ inline + « Répondre » + « Passer » si optionnelle. La
    réponse rejoint validated_info et history.
  * suggestions → cartes cliquables : clic = accepter, croix = refuser. Accepté
    = carte verte légère. Rejoint validated_info + history.
  * proposed_plan si présent → cartes éditables + « Générer à partir de ce plan ».
- Bouton discret « Voir le plan » → /analyze avec request_plan=true.
- RÈGLE : tant qu'aucun plan n'est proposé, chaque analyse renvoie ≥ 1 question
  ou suggestion (garanti côté prompt). Jamais de cul-de-sac, jamais de blocage.

COLONNE DROITE — document :
- Avant : placeholder « Votre document apparaîtra ici. »
- Pendant /generate : les blocs s'ajoutent un par un via SSE `block` (effet
  construction en direct) rendus par DocumentRenderer (V3-5).
- Après : document complet + sélecteur template (2 designs, miniatures) +
  format (PDF/Word) + « Télécharger » (payant dès Goutte) + « Ajuster »
  (instruction → /generate) + boutons inter-outils selon doc_type.

ÉTAT & PERSISTANCE :
- work_state (cadrage, history, validated_info, plan, blocks) dans Zustand +
  localStorage (survit au refresh). Académique : persisté backend (V3-6).
- history = tours envoyés à OpenRouter. Pour l'académique long, résumer les
  sections déjà générées (contexte compact) ; pour CV/lettre, historique complet.

Crée AIInteraction.tsx (blocs interactifs : message, question, suggestion, plan)
si pas déjà présent, aligné sur ce comportement.

Crée les 4 pages minces qui n'font que passer les props à DocumentWorkspace :
cv-writer, cover-letter, pro-doc-writer, academic-writer (doc_type respectifs).
Supprime l'ancien code (stepper, GuidedFlow, SmartForm).

VÉRIFICATION FIN DE PROMPT : teste le CV express (taper une phrase → Générer
direct → document produit) et le CV guidé (Analyser → répondre/suggestions →
Voir le plan → Générer). Confirme qu'aucun bouton n'est jamais bloqué.
```

## Prompt V3-5 — Renderer bloc→style + templates modulés par palier

```
AVANT DE CODER : analyse les templates python-docx existants (un-fichier-un-design
qui relisent les schémas Content). Tu vas les remplacer par un renderer générique
bloc→style. Liste-les avant de refondre.

=== FRONTEND : aperçu ===
Crée src/components/tools/DocumentRenderer.tsx :
- Reçoit { blocks, template, tier } → aperçu HTML fidèle.
- Un rendu React par type de bloc (heading→h1/h2/h3, bullet_list→ul,
  experience→carte, contact→en-tête, table→table...).
- Le style s'adapte au template ET au palier (voir plus bas).
- Badge « Aperçu » ; le fichier final sera finalisé au téléchargement.
- Peut recevoir les blocs progressivement (SSE) et les ajouter un par un.

=== BACKEND : fichier ===
Dans app/core/document_engine/renderer.py :
- render(document, template_name, tier) → .docx via python-docx.
- Architecture bloc→style : une fonction de rendu PAR TYPE DE BLOC (socle commun
  partagé : heading, paragraph, bullet_list, numbered_list, table, quote...).
  Les blocs spécialisés (experience, contact, cover_page) ont leur rendu.
- Le TEMPLATE est un jeu de STYLES (polices, couleurs, marges, disposition)
  appliqué aux blocs — PAS une structure de contenu. Un même document se rend
  dans n'importe quel template.
- AUCUNE regex, AUCUN parsing texte : on lit les champs typés du JSON.
- pdf.py : .docx → .pdf via LibreOffice headless.

=== MODULATION PAR PALIER (nouveau) ===
Le rendu se renforce selon le palier d'abonnement (tier) :
- introduction/goutte : templates propres mais sobres (couleurs limitées,
  typographie standard).
- source/fleuve : plus soignés (accents de couleur charte, meilleure hiérarchie
  typographique, en-têtes/pieds de page).
- ocean : premium (mise en page la plus travaillée, éléments graphiques,
  variantes exclusives).
Implémente cette modulation comme une surcouche de style paramétrée par tier,
pas comme des fichiers dupliqués. Documente quels raffinements s'activent à
quel palier.

Endpoint POST /api/v1/documents/{id}/render :
- Reçoit { template, format }. Récupère le tier de l'utilisateur.
- Charge content_json, render(document, template, tier), convertit si PDF,
  upload dans bucket generated, décrémente quota téléchargement, URL signée 15min.
- Regénérer dans un autre template/format NE rappelle jamais le LLM.

Refonds les 8 templates (cv_modern, cv_classic, letter_standard, letter_modern,
academic_formal, academic_clean, pro_corporate, pro_minimal) comme jeux de styles
au-dessus du renderer générique, chacun modulé par palier.

VÉRIFICATION FIN DE PROMPT : rends un même JSON de blocs dans 2 templates et à
2 paliers différents → 4 rendus visuellement distincts, sans rappeler le LLM.
Vérifie qu'un rapport avec tableaux et listes se rend correctement.
```

## Prompt V3-6 — Stockage minimal et persistance

```
AVANT DE CODER : analyse la table academic_sessions actuelle et son usage
(current_step, doc_type, domain, topic, outline_json, sections_json). Signale ce
que tu migres.

CE QU'ON STOCKE :
1. Le JSON final de blocs (content_json, table documents) → regénération sans LLM.
2. Le fichier généré (bucket generated), via storage_path.

CE QU'ON NE PERSISTE PAS EN BASE (session seulement) :
- L'historique d'analyse pour CV/lettre/doc pro → Zustand + localStorage.

EXCEPTION — document académique (sessions longues, plusieurs jours) :
Migration supabase/migrations/0004_doc_engine.sql :
- Simplifie academic_sessions : id, user_id, doc_type, title, updated_at,
  + work_state JSONB (cadrage, history, validated_info, plan, blocks partiels).
- current_step n'est plus lu par le front (peut rester en colonne, non utilisé
  comme pilote d'UI).
- Migration SANS perte des données existantes (préserve ou migre outline_json/
  sections_json vers work_state si des sessions existent).

Vérifie que documents.content_json accepte le JSON de blocs générique pour les 4
types. Applique la migration.

VÉRIFICATION FIN DE PROMPT : crée une session académique, quitte, reviens →
work_state restauré, interface reconstruite (textarea, dialogue, blocs). Confirme
qu'aucune donnée existante n'est perdue.
```

## Prompt V3-7 — Connexions inter-outils et vérification de bout en bout

```
CONNEXIONS (via Zustand crossToolData, sans popup) :
- Après un CV : « Rédiger une lettre de motivation pour ce poste → » préremplit
  la lettre (poste + données du CV depuis content_json).
- Lettre : « Importer depuis mon CV » charge le dernier CV (documents, tool="cv").
- Générateur de plan → pro_doc/academic : le plan validé apparaît comme plan déjà
  proposé dans le dialogue de l'outil cible.

VÉRIFICATION DE BOUT EN BOUT (teste chaque scénario) :
1. CV express : « CV consultant junior BCG, cycle ingénieur » → Générer direct →
   CV complet, manques vides/plausibles, aucun blocage.
2. CV guidé : même départ → Analyser → questions + suggestions NON hardcodées →
   accepter/ignorer → Voir le plan → Générer → document riche.
3. Rapport pro : décrire un rapport d'activité → Générer → présence de tableaux
   et listes à puces là où c'est pertinent, sans excès.
4. Template × palier : basculer template et simuler 2 paliers → 4 rendus
   distincts, sans rappeler le LLM.
5. Académique : décrire un mémoire → analyser (plusieurs tours) → plan → générer →
   quitter → revenir → état restauré.
6. Anti-regressions : aucune question/suggestion hardcodée, aucune regex sur
   l'input ou la génération, JSONL streamé bloc par bloc, /generate jamais bloqué.

Corrige tout écart avant de conclure.
```

## Prompt V3-8 — État des lieux final

```
Ne code rien de neuf ici. Produis un ÉTAT DES LIEUX complet de la refonte
documentaire, dans un fichier docs/ETAT_DES_LIEUX_V3.md :

1. Ce qui a été REFONDU (fichiers créés/réécrits, par couche : blocks, prompts,
   endpoints, frontend, renderer).
2. Ce qui a été SUPPRIMÉ (schémas Content rigides, templates un-fichier-un-design,
   endpoints one-shot, stepper/GuidedFlow/SmartForm, etc.) avec les chemins.
3. Les MIGRATIONS appliquées (0004_doc_engine.sql et autres) et leur effet sur
   les données existantes.
4. Les CHANGEMENTS sur le code ou les tables existants non documentaires (si le
   client LLM refondu impacte d'autres outils, le signaler).
5. Les 5 contraintes caduques : pour chacune, confirmer qu'elle est levée, ou
   expliquer ce qui reste.
6. POINTS D'ATTENTION restants : caching non uniforme selon provider, robustesse
   du streaming JSONL, modulation par palier, cas limites de réparation de blocs.
7. Ce qui reste à faire ou à surveiller (dette éventuelle, tests manquants).

Sois honnête et précis. Ce document sert de référence pour la suite.
```

---

## Ordre d'exécution

1. V3-1 — Vocabulaire de blocs et schémas
2. V3-2 — Fonctions LLM multi-tours + prompts guides
3. V3-3 — Endpoints conversationnels (analyze / generate)
4. V3-4 — Interface unique conversationnelle
5. V3-5 — Renderer bloc→style + templates modulés par palier
6. V3-6 — Stockage minimal et persistance
7. V3-7 — Connexions et vérification de bout en bout
8. V3-8 — État des lieux final

Rappel permanent : **le LLM pilote, le code affiche. Aucune structure, question
ou suggestion hardcodée. Aucune regex. Streaming JSONL bloc par bloc. Rien ne
bloque la génération. Vérifie à la fin de chaque prompt. État des lieux à la fin.**

*Boulga AI — Puiser l'intelligence qu'il vous faut.*