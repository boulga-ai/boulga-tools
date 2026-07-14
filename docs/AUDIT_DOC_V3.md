# Audit documentaire V3 — lecture seule

Audit du code réel produit pendant la refonte V3 (`Boulga_preparation_documentaire_v3.md`,
prompts V3-1 à V3-7). Aucune modification n'a été faite pendant cet audit — uniquement
lecture. Sources citées précisément (fichier + comportement observé), pas de suppositions.

---

## A. Le plan : objet rigide ou réponse naturelle du LLM ?

**Ce qui existe réellement.**

Dans `backend/app/core/llm/prompts/doc_engine.py`, `build_analyze_system_prompt()`
(lignes 44-62) impose deux règles liées au plan :

```
"- Tant que tu n'as pas propose de plan, ta reponse contient TOUJOURS au
moins une question ou une suggestion — jamais de cul-de-sac silencieux.\n"
...
"Ne remplis proposed_plan que si le user a explicitement demande le plan
dans son dernier message (sinon laisse-le a null) ; ..."
```

Le schéma JSON demandé au LLM contient `can_propose_plan: bool` — c'est le LLM
qui l'auto-évalue (« j'estime avoir assez de matière ») mais ce champ ne
CONDITIONNE rien côté code : il sert uniquement à afficher ou non le bouton
« Voir le plan » côté frontend (`DocumentWorkspace.tsx:311` —
`{analysis?.can_propose_plan && !plan && (<button onClick={() => handleAnalyze(true)}>Voir le plan</button>)}`).

La règle qui compte vraiment est la seconde : **le LLM n'est jamais autorisé à
remplir `proposed_plan` de sa propre initiative** — seulement quand
`request_plan=true` est explicitement envoyé, c'est-à-dire quand le user a
cliqué « Voir le plan » (`documents_engine.py` reçoit `request_plan` dans le
contexte, `doc_engine.py:129-131` transforme ça en instruction « Propose
maintenant un plan structuré »). Côté frontend, le plan n'est jamais un
écran séparé : `{plan && (<div>...cartes éditables...</div>)}` (ligne 327)
s'affiche dans le même flux, sous le dialogue.

**Lecture double possible.** Le fil de conversation qui a précédé cette refonte
contient la formulation exacte du user : *« le llm doit toujours avoir une
question... tant que le plan nest pas propose. le user peut cliquer sur voir
le plan ou bien il peut zapper et cliquer sur generer. le llm genere en intern
son plan et produit »*. Cette formulation dit explicitement que le plan
n'apparaît QUE sur demande — ce qui correspond exactement au code actuel. Mais
elle laisse ouverte la question : est-ce que le LLM devrait pouvoir *proposer
spontanément* un plan quand il juge en avoir assez, sans que le user ait à
cliquer ? Le code actuel répond non, catégoriquement.

**Le vrai problème trouvé** : la règle « toujours au moins une question ou une
suggestion tant que le plan n'est pas proposé » (indépendante de la précédente)
peut forcer le LLM à *inventer* une question ou suggestion même quand il n'en a
plus aucune de pertinente à poser — puisqu'il n'a pas le droit de dire « j'ai
tout ce qu'il faut, voulez-vous voir le plan ou générer ? » sans produire au
moins un élément factice. C'est une contrainte mécanique qui peut dégrader la
qualité du dialogue une fois que le user a déjà tout fourni.

**Verdict** : à clarifier sur le fond (le blocage du plan spontané correspond
à la dernière clarification du user, donc probablement voulu) — mais la
règle « toujours ≥1 question/suggestion » est une **sur-contrainte mécanique**
qui mérite d'être assouplie (le LLM devrait pouvoir dire explicitement « je
pense avoir assez d'informations » sans être forcé de fabriquer une question).

**Gravité** : moyen.

---

## B. Connexions inter-outils : injection automatique ou choix du user ?

**Ce qui existe réellement.**

1. **CV → Lettre.** `frontend/.../cv-writer/page.tsx` : `onStateChange={(state) => setLastCVBlocks(state.blocks.length > 0 ? state.blocks : null)}`
   — capture silencieuse en mémoire à chaque changement d'état, pas une action
   du user. Puis dans `cover-letter/page.tsx` (lignes 73-77) :
   ```
   useEffect(() => {
     if (lastCVBlocks) applyCVBlocks(lastCVBlocks);
   }, []);
   ```
   Au montage de la page Lettre, si un CV existe en mémoire, ses données sont
   **injectées automatiquement** dans le cadrage (nom, email, poste visé) et un
   texte est **ajouté automatiquement** au textarea — sans que le user voie une
   proposition ni clique quoi que ce soit. C'est une injection automatique, pas
   une proposition acceptable/refusable.

2. **Bouton « Importer depuis mon CV ».** `cover-letter/page.tsx`, fonction
   `importFromCV()` (lignes ~30-50) : prend `lastCVBlocks` si présent, sinon
   appelle `GET /api/v1/documents/latest/cv` — **toujours le dernier CV**, sans
   aucun choix proposé au user s'il a généré plusieurs CV. Là encore, une fois
   les données récupérées, `applyCVBlocks()` les injecte directement (mêmes
   lignes que le point 1) — pas de carte « voici ce qu'on a trouvé, tu
   acceptes ? ».

3. **Générateur de plan → Document pro/académique.** `pro-doc-writer/page.tsx`
   (lignes 47-53) : si `pendingOutline` existe dans le store Zustand, il est
   converti (`outlineToPlan`) et injecté directement dans `initialState.plan`
   — le plan apparaît déjà rempli dans le dialogue, sans confirmation
   supplémentaire. Pour l'académique (`academic-writer/page.tsx`), c'est encore
   plus poussé : le plan est fusionné dans `work_state` et **persisté en base
   immédiatement**, avant même que le user ait vu la page. Dans les deux cas,
   ceci est déclenché par un clic explicite antérieur du user (« Utiliser ce
   plan → » sur la page Générateur de plan), donc il y a bien une intention
   affirmée en amont — mais l'atterrissage lui-même est automatique, sans
   second temps de confirmation.

**Verdict** : dans les trois cas, c'est une **injection automatique**, pas une
proposition acceptable/refusable — la grille d'audit distinguait explicitement
les deux. Pour le point 3 (Générateur de plan), l'automatisme est justifié par
un clic explicite préalable. Pour les points 1 et 2 (CV → Lettre), il n'y a
**aucune action explicite du user** qui déclenche l'injection — elle se produit
silencieusement à la navigation ou au clic sur un bouton qui ne prévient pas
qu'il va *écraser* le contenu déjà tapé dans le textarea (`applyCVBlocks`
utilise `appendText`, qui ajoute à la suite — donc ne perd rien, mais le
cadrage, lui, est bien écrasé via `mergeCadrage` sans avertissement).

**Gravité** : moyen pour CV→Lettre (automatisme non annoncé au user, même si
inoffensif techniquement) ; non-problème pour Générateur de plan (déclenché par
un choix explicite).

---

## C. Infos manquantes : invention de faits ?

**Ce qui existe réellement.** La consigne exacte, dans
`build_generate_system_prompt()` (`doc_engine.py:81-83`) :

```
"- Si une information manque, NE BLOQUE JAMAIS : laisse un champ vide ou
redige un contenu generique plausible plutot que d'inventer des faits
precis (chiffres, noms propres, dates)."
```

Ce n'est **pas binaire** : elle laisse deux issues possibles (champ vide OU
contenu générique plausible) et interdit uniquement l'invention de faits
**précis** (chiffres, noms propres, dates). Un résumé de motivation générique
("fort intérêt pour le secteur") reste autorisé même sans donnée précise ; une
fausse expérience chez une entreprise jamais mentionnée, un chiffre d'affaires
inventé, ou une date de diplôme fabriquée sont explicitement interdits.

**Verdict** : va bien. C'est un garde-fou éthique légitime (ne pas fabriquer de
faits vérifiables mensongers) qui laisse au LLM la marge de jugement voulue
(vide vs. plausible générique) plutôt que d'imposer un choix unique.

**Gravité** : non-problème.

---

## D. Le titre : info normale ou traitement spécial ?

**Ce qui existe réellement.** `documents_engine.py`, fonction `_infer_title()`
(lignes 66-77) — code, pas LLM :

```python
def _infer_title(doc_type, document, cadrage) -> str:
    for block in document.blocks:
        if block.type == "cover_page": return block.title
        if block.type == "contact": return f"CV - {block.full_name}" ...
        if block.type == "letter_header": return f"Lettre de motivation - {target}" ...
        if block.type == "heading" and block.level == 1: return block.text
    return cadrage.get("title") or cadrage.get("target_role") or f"Document {doc_type}"
```

C'est une **heuristique mécanique codée**, pas une info que le LLM propose
comme une autre. Elle scanne les blocs dans l'ordre et prend le premier match
— le champ `cadrage.title` du user (le champ « Titre (optionnel) » du
formulaire Document pro, `pro-doc-writer/page.tsx:85`) **n'est utilisé qu'en
tout dernier recours**, si aucun bloc `cover_page`/`contact`/`letter_header`/
`heading niveau 1` n'existe. Or la consigne de structure (`guidance` dans
`DOCUMENT_SCHEMAS["pro_doc"]`) encourage justement un `cover_page` ou un
`heading` niveau 1 en tête de document — ce qui veut dire que dans la
majorité des cas, **le titre tapé par le user dans le champ cadrage est
silencieusement ignoré** au profit de ce que le LLM a écrit dans son bloc
`cover_page.title` ou son premier `heading`.

Ce titre n'est ni affiché comme modifiable (`DocumentWorkspace.tsx:376` —
`<h3>{docTitle || "Résultat"}</h3>`, du texte brut, aucun `<Input>`), ni
renvoyé/éditable au moment du téléchargement (`RenderRequest` ne prend que
`{template, format}` — pas de titre).

**Verdict** : bride un choix du user sans le prévenir. Le user tape un titre,
croit qu'il sera utilisé, et il peut être remplacé par ce que le LLM a écrit
sans aucune indication du décalage — et il n'a ensuite aucun moyen de le
corriger avant téléchargement.

**Gravité** : moyen (n'affecte que le libellé affiché/stocké, pas le contenu
du document lui-même, mais casse une attente raisonnable du user).

---

## E. Règles mécaniques dans les prompts système

Liste exhaustive des règles trouvées dans `doc_engine.py`
(`build_analyze_system_prompt` et `build_generate_system_prompt`) :

| Règle (citation) | Nature | Verdict |
|---|---|---|
| « Tant que tu n'as pas proposé de plan, ta réponse contient TOUJOURS au moins une question ou une suggestion » | Mécanique, binaire | Sur-restriction — voir §A |
| « Ne remplis `proposed_plan` que si le user a explicitement demandé le plan » | Mécanique, binaire | À clarifier — voir §A |
| « Ne pose JAMAIS une question dont la réponse figure déjà dans le cadrage/infos validées/historique » | Garde-fou qualité | Va bien — évite la redondance, ne restreint pas le jugement |
| « Les suggestions sont spécifiques à ce cas précis, jamais génériques » | Intention, pas mécanique | Va bien |
| « Tu ne bloques jamais la suite » | Garde-fou central du produit | Va bien — c'est le principe fondateur, pas une restriction |
| « NE BLOQUE JAMAIS : champ vide ou contenu générique plausible plutôt que d'inventer des faits précis » | Garde-fou éthique nuancé | Va bien — voir §C |
| « Aucun méta-commentaire, aucune explication en dehors des blocs » | Contrainte de format technique | Va bien — nécessaire au parsing JSONL |
| « ÉMETS TA SORTIE EN JSONL STRICT... une ligne par bloc » | Contrainte de format technique | Va bien — nécessaire au streaming |

Aucune règle du type « exactement N questions », « toujours 3 suggestions »,
etc. n'a été trouvée (contrairement aux anciens prompts V1/V2 qui imposaient
« Maximum 5 questions »). C'est un vrai progrès par rapport à l'avant-V3.

Les seules règles réellement mécaniques et potentiellement problématiques sont
les deux premières du tableau, déjà détaillées en §A.

---

## F. Contexte académique : résumé compact ou dégradation ?

**Ce qui existe réellement.** L'ancien mécanisme (V1/V2) de génération section
par section avec résumés compacts des sections précédentes
(`previous_summaries`, `context_answers`, endpoints `generate-section`,
`regenerate-section`, `validate-section`) a été **entièrement supprimé** en
V3-3 — confirmé par recherche exhaustive dans `backend/app` : aucune trace de
`previous_summaries`, `context_answers`, `section_id`, `generate-section` ou
d'un quelconque mécanisme de résumé.

Dans l'architecture V3 actuelle, l'académique passe par le **même** couple
`/analyze` + `/generate` générique que les 3 autres outils. Concrètement :
**le document académique complet — page de garde, sommaire, tous les
chapitres, bibliographie — est généré en un seul appel LLM**, streamé en
JSONL. Il n'y a donc plus de "contexte compact entre sections" au sens propre,
parce qu'il n'y a plus de génération par section du tout : tout est produit
d'un coup, dans une seule complétion.

Le commentaire dans `doc_engine.py:98-100` (*« l'historique lui-même est
renvoyé tel quel (contexte compact déjà appliqué en amont pour les sessions
longues, voir academic) »*) **décrit un mécanisme qui n'existe pas dans le
code**. Aucune fonction de résumé/compaction de l'historique n'a été
implémentée nulle part — ni côté backend, ni côté frontend
(`DocumentWorkspace.tsx` empile l'historique tel quel dans `history`, sans
jamais le tronquer ni le résumer, quel que soit `docType`).

**Verdict** : risque réel, déjà identifié dans `docs/ETAT_DES_LIEUX_V3.md` §6,
mais ce point-ci ajoute une précision : ce n'est pas seulement un risque
« pour les documents longs », c'est l'absence totale d'un mécanisme que le
code prétend (en commentaire) avoir mis en place. Le commentaire est trompeur
et devrait être corrigé, indépendamment de la question de fond (faut-il
réintroduire une génération par section pour l'académique long).

**Gravité** : critique pour la génération de documents académiques longs
(mémoire/thèse) — pas testé avec un vrai modèle, risque concret de troncature
ou d'échec sur un flux de sortie unique très long. Mineur pour le commentaire
trompeur en lui-même (documentation, pas comportement).

---

## G. Streaming, regex, hardcode

**Streaming JSONL.** Confirmé conforme au principe V3. `client.py:165-200`,
fonction `stream_blocks()` : accumule les deltas texte dans un buffer, découpe
sur `\n`, tente `json.loads()` ligne par ligne, ignore silencieusement les
lignes vides, les fences markdown (`` ``` ``) et les lignes mal formées, sans
jamais parser de JSON partiel caractère par caractère. Le flush final
(lignes 198-200) traite aussi le reliquat de buffer sans saut de ligne final.
Testé (mocké) avec un bloc scindé entre deux deltas, une ligne cassée et des
fences markdown — recomposé correctement.

**Regex.** Recherche exhaustive (`import re`, `re.match`, `re.search`,
`re.sub`, `re.compile`, `re.findall`) sur tout `backend/app` : **aucun
résultat**. Ni dans le moteur documentaire, ni ailleurs dans le backend touché
par cette refonte.

**Hardcode de questions/suggestions.** Recherche exhaustive dans
`frontend/src` : aucun tableau de questions ou suggestions écrit en dur.
`SuggestionsPanel.tsx` et `SuggestedChips.tsx` (qui contenaient ce genre de
logique dans les versions précédentes) ont été supprimés en V3-4. Les seules
listes « en dur » qui subsistent sont les **champs de cadrage factuels**
(`DOC_TYPES`, `TONES`, `TYPES`, `DOMAINS` dans les 4 pages outils) — ce sont
des champs de formulaire (type de document, ton, domaine d'étude), pas des
questions ou suggestions IA. C'est cohérent avec le principe : le cadrage
minimal reste un formulaire classique, seul le dialogue est piloté par le LLM.

**Verdict** : les trois principes V3 (streaming JSONL, zéro regex, zéro
question/suggestion hardcodée) sont bien respectés dans le code réel.

**Gravité** : non-problème.

---

## Synthèse

### À corriger, par ordre de priorité

1. **[Critique]** Académique long : aucun mécanisme de contexte compact
   n'existe réellement (le commentaire dans `doc_engine.py` qui prétend le
   contraire est trompeur et doit être corrigé). Décision de fond à prendre :
   accepter le risque d'une génération en un seul appel, ou réintroduire un
   découpage par section pour les documents académiques longs.
2. **[Moyen]** Le titre du document (`_infer_title`) peut silencieusement
   ignorer ce que le user a tapé dans le champ « Titre », sans le prévenir, et
   le user n'a aucun moyen de le voir/corriger avant téléchargement.
3. **[Moyen]** La règle « toujours au moins une question ou une suggestion
   tant que le plan n'est pas proposé » peut forcer le LLM à fabriquer des
   questions artificielles une fois que le user a déjà tout fourni.
4. **[Moyen]** CV → Lettre : l'injection des données du CV (cadrage + texte)
   se fait automatiquement à la navigation ou au clic sur « Importer », sans
   que le user soit informé qu'un remplissage automatique vient d'avoir lieu
   (contrairement au Générateur de plan, où l'automatisme suit un choix
   explicite du user sur la page précédente).
5. **[À clarifier avec le user, pas trancher seul]** L'interdiction faite au
   LLM de proposer spontanément un plan (`proposed_plan` uniquement si
   `request_plan=true`) correspond à la dernière clarification donnée pendant
   la conception de V3 — mais mérite d'être reconfirmée maintenant que le code
   existe, pour vérifier que c'est toujours le comportement voulu.

### Ce qui va déjà bien — à ne pas toucher

- La consigne anti-invention de faits (§C) : nuancée, ni trop permissive ni
  trop bridée, garde-fou éthique légitime.
- L'absence de contrainte de comptage rigide (« exactement N questions ») —
  progrès net par rapport aux prompts V1/V2.
- Le streaming JSONL bloc par bloc, robuste aux fences markdown et aux lignes
  cassées.
- L'absence totale de regex dans le moteur documentaire.
- L'absence totale de questions/suggestions hardcodées — tout passe par le
  LLM, seuls les champs de cadrage factuels restent des formulaires classiques
  (ce qui est le design voulu, pas un oubli).
- Le fait que « Générer » ne soit jamais bloqué, quel que soit l'état du
  dialogue (`disabled={isStreaming}` uniquement, jamais de condition sur les
  champs remplis).

---

## Corrections appliquées

Suite à `corrections_post_audiits.md`, 5 corrections exécutées et vérifiées
(tsc + eslint + `next build` propres, tests backend mockés à chaque étape).
Aucun commit n'a été fait — laissé à la main du user.

| # | Correction | Statut | Détail |
|---|---|---|---|
| 1 | Retirer les sur-contraintes du prompt d'analyse | **Fait** | La règle « toujours ≥1 question/suggestion » est remplacée par une description des formes de réponse disponibles (pas un minimum imposé). Le LLM peut désormais remplir `proposed_plan` spontanément, plus seulement sur demande explicite. Le frontend affichait déjà le plan sans condition — aucun changement frontend nécessaire. |
| 2 | Titre visible et modifiable après génération | **Fait** | Titre cliquable → input inline dans `DocumentWorkspace.tsx`, sauvegardé dans le work_state. `RenderRequest` et `finalize_document_render` acceptent un `title` optionnel qui met à jour le document en base sans écraser l'existant si absent. |
| 3 | CV → Lettre : proposition au lieu d'injection automatique | **Fait** | L'injection silencieuse au montage est supprimée, remplacée par un bandeau explicite (Utiliser / Non merci), dismissible de façon persistante (localStorage). Le bouton « Importer » gère maintenant 0/1/plusieurs CV — nouvel endpoint `GET /documents?tool=cv` et `GET /documents/{id}` pour charger un CV précis. |
| 4 | Académique long : génération segmentée | **Fait** | Au-delà de `settings.ACADEMIC_SEGMENT_THRESHOLD` sections (défaut 6, configurable), `/documents/academic/generate` découpe la génération en plusieurs appels LLM successifs (`ACADEMIC_SEGMENT_SIZE` sections par appel, défaut 2), chacun recevant le plan complet + un résumé des segments précédents (produit par le LLM via une ligne `SUMMARY:`, avec repli automatique si absente). Vérifié par mock : 10 sections → 5 appels séquentiels, résumés propagés, blocs assemblés dans l'ordre ; 4 sections → 1 seul appel ; CV/lettre/doc pro jamais segmentés. **Bug corrigé au passage** : le `plan` (édité par le user) n'était transmis nulle part au backend, ni en génération segmentée ni normale — corrigé pour les 4 types de documents, pas seulement l'académique. |
| 5 | Nettoyage et vérification finale | **Fait** | Commentaire trompeur de `doc_engine.py` mis à jour pour refléter le mécanisme réel (`build_segment_messages`). Repasse sur les 4 pages outils + `DocumentWorkspace.tsx` : aucun autre automatisme non documenté trouvé. Build frontend complet (tsc + eslint + `next build`) propre. Ce document mis à jour. |

**Ce qui n'a pas été touché, volontairement** : le point 5 de la synthèse
précédente (interdiction faite au LLM de proposer un plan spontanément) a été
tranché dans le sens de l'assouplissement par la Correction 1, conformément à
la règle méta de `corrections_post_audiits.md` (« on retire des contraintes,
on n'en ajoute pas ») — ce n'était donc plus « à clarifier » mais un problème
identifié à corriger, et il l'a été.
