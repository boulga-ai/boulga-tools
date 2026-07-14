# État des lieux — Refonte documentaire V3

Ce document rend compte, honnêtement et sans enjolivement, de ce qui a été fait
pendant l'exécution de `Boulga_preparation_documentaire_v3.md` (prompts V3-1 à
V3-7), de ce qui reste fragile, et de ce qui n'a jamais été testé en conditions
réelles (aucun appel OpenRouter réel n'a été effectué pendant ce travail — toute
la vérification s'est faite par tests unitaires/mockés, tsc, eslint et builds
Next.js complets).

---

## 1. Ce qui a été refondu

### Couche 1 — Vocabulaire de blocs (V3-1)

- `backend/app/core/document_engine/blocks.py` (nouveau) — 19 types de blocs
  Pydantic (union discriminée sur `type`) : socle commun (`heading`, `paragraph`,
  `bullet_list`, `numbered_list`, `table`, `quote`, `spacer`, `page_break`) +
  blocs CV (`contact`, `summary`, `experience`, `education`, `skill_group`,
  `language_group`) + blocs lettre (`letter_header`, `subject`, `signature`) +
  blocs pro/académique (`cover_page`, `table_of_contents`, `bibliography`).
  `DOCUMENT_SCHEMAS` définit, pour chacun des 4 `doc_type`, sa description, les
  blocs autorisés et une consigne de guidage (`guidance`) pour le LLM.
- `backend/app/core/document_engine/document.py` (nouveau) — `Document`
  (doc_type + meta + blocs), `validate_document()` (filtre les blocs
  hors-vocabulaire), `repair_block()` (comble les champs requis manquants avec
  des valeurs vides plutôt que de faire planter la génération ; un bloc
  irrécupérable est ignoré, jamais une exception).

### Couche 2 — LLM multi-tours + prompts guides (V3-2)

- `backend/app/core/llm/client.py` (modifié, additif) — ajout de
  `cacheable_system_message()` (marqueur `cache_control` façon Anthropic) et
  `stream_blocks()` (streaming JSONL, un bloc par ligne). **Aucune fonction
  existante n'a été modifiée** : `complete_json`, `complete_text`,
  `stream_completion`, `_run_stream_tool` sont inchangées et acceptaient déjà un
  `messages: list[dict]` arbitraire — la contrainte caduque #5 décrivait en
  réalité l'usage qu'en faisaient les appelants, pas une limite des fonctions
  elles-mêmes.
- `backend/app/core/llm/prompts/doc_engine.py` (nouveau) —
  `build_analyze_system_prompt()`, `build_generate_system_prompt()` (générés
  dynamiquement à partir de `DOCUMENT_SCHEMAS`, aucun texte figé par type de
  document), `build_messages()` (construit system caché + état établi
  [cadrage/informations validées] + historique + dernier message).
  **Bug trouvé et corrigé pendant V3-4** : `build_messages()` en mode
  `generate` n'incluait pas `user_message` — un « CV express » (texte libre
  jamais analysé) serait parti vers le LLM sans aucune information. Corrigé et
  re-testé.

### Couche 3 — Endpoints conversationnels (V3-3)

- `backend/app/api/v1/tools/documents_engine.py` (nouveau) — routeur unique
  pour les 4 types : `POST /documents/{doc_type}/analyze` (n'écrit jamais de
  document, appelable à volonté, accumule l'historique) et
  `POST /documents/{doc_type}/generate` (toujours disponible même sans
  `/analyze` préalable, streame les blocs en SSE au fil de l'eau, persiste un
  document « brouillon » — `content_json` seul, pas de fichier — en fin de
  flux).
- `backend/app/api/v1/tools/academic.py` (réécrit) — réduit au strict CRUD de
  session (create/list/get/patch) ; toute la logique LLM est passée par
  `documents_engine.py`.

### Couche 4 — Interface unique (V3-4)

- `frontend/src/components/tools/DocumentWorkspace.tsx` (nouveau) — le
  composant partagé par les 4 outils : cadrage minimal, textarea libre, deux
  boutons **toujours actifs** (« Analyser mes informations », « Générer le
  document »), lien discret « Voir le plan », zone de dialogue (`AIInteraction`,
  déjà existant, réutilisé tel quel), bloc plan éditable, zone de résultat avec
  aperçu en direct, ajustement, sélection template/format, téléchargement.
- `frontend/src/hooks/useBlockStream.ts` (nouveau) — consomme le SSE
  `block`/`usage`/`done`/`error` de `/generate`.
- `frontend/src/components/tools/DocumentRenderer.tsx` (nouveau) — aperçu HTML
  des blocs (construit dès V3-4 par nécessité — `DocumentWorkspace` en dépend
  pour être testable de bout en bout — puis utilisé tel quel en V3-5).
- `frontend/src/app/(dashboard)/tools/{cv-writer,cover-letter,pro-doc-writer,academic-writer}/page.tsx`
  (réécrits) — pages minces, ne font que passer des props à
  `DocumentWorkspace`.
- `frontend/src/stores/toolStore.ts` (modifié) — `lastCV: CVContent` remplacé
  par `lastCVBlocks: DocBlock[]`.

### Couche 5 — Renderer bloc→style + paliers (V3-5)

- `backend/app/core/document_engine/renderer.py` (entièrement réécrit) — un
  `TemplateStyle` par template (8 au total, mêmes noms qu'avant :
  `cv_modern`, `cv_classic`, `letter_standard`, `letter_modern`,
  `pro_corporate`, `pro_minimal`, `academic_formal`, `academic_clean`) décrit
  uniquement du **style** (couleurs, disposition, marges) ; une seule fonction
  `render(document, template_name, tier, output_dir)` traduit chaque bloc selon
  ce style, modulé par la richesse du palier (`sobre` = introduction/goutte,
  `soigné` = source/fleuve, `premium` = ocean).
- `backend/app/api/v1/documents.py` (réécrit) — `POST /documents/render` et
  `POST /documents/{id}/rerender` fusionnés en un unique
  `POST /documents/{id}/render` (`{template, format}`) qui charge le
  `content_json` déjà persisté, rend le fichier, et **met à jour** le même
  document plutôt que d'en créer un nouveau à chaque téléchargement.
- **Bug trouvé et corrigé pendant la vérification** : au premier test, seuls
  `pro_doc`/`academic` variaient visuellement selon le palier — CV et lettre
  produisaient un fichier strictement identique à goutte/source/fleuve/ocean.
  Corrigé (accent colore + mention de palier sur CV et lettre) et re-vérifié :
  les 4 types produisent bien 2 templates × 3 paliers = 6 rendus distincts
  chacun, sans jamais rappeler le LLM.

### Couche 6 — Stockage et persistance (V3-6)

- `backend/supabase/migrations/0008_academic_work_state.sql` (nouveau) —
  `academic_sessions` simplifiée autour d'un `work_state` JSONB unique, aligné
  sur le `WorkState` du frontend.
- `backend/app/core/academic_sessions.py`, `app/models/academic.py` (réécrits)
  pour ce nouveau schéma.
- `frontend/.../academic-writer/page.tsx` — synchronise `DocumentWorkspace`
  avec la session backend (chargement au montage, sauvegarde debouncée à 800ms) ;
  `DocumentWorkspace` a gagné un flag `disableLocalStorage` pour éviter tout
  conflit entre le cache local et la session serveur sur cet outil précis.

### Couche 7 — Connexions inter-outils (V3-7)

- CV → Lettre : préremplissage automatique à l'arrivée (plus besoin de
  re-cliquer « Importer »).
- Lettre → CV : va chercher le dernier CV réellement persisté en base
  (`/documents/latest/cv`), pas seulement celui de la session en cours.
- Générateur de plan → Document pro / académique : le plan validé est converti
  et apparaît directement comme plan proposé dans le nouveau dialogue (pour
  l'académique, fusionné et persisté dans `work_state` dès le chargement de la
  session).
- **Bug trouvé et corrigé en préparant cet état des lieux** :
  `frontend/.../documents/page.tsx` (liste « Mes documents ») appelait encore
  l'ancien endpoint `POST /documents/{id}/rerender`, supprimé en V3-5. Corrigé
  vers `POST /documents/{id}/render` ; le type `DocumentRow` et l'affichage
  gèrent désormais aussi les documents « brouillon » (`template`/`format`
  nuls, pas encore rendus).

---

## 2. Ce qui a été supprimé

| Chemin | Remplacé par |
|---|---|
| `backend/app/api/v1/tools/generators.py` | `documents_engine.py` |
| `backend/app/models/generators.py` (`CVExtractRequest`) | contexte générique (`DocEngineContext`) |
| `backend/app/core/llm/prompts/cv.py`, `cover_letter.py`, `pro_doc.py`, `academic.py`, `adjust.py` | `doc_engine.py` (prompts génériques par vocabulaire de blocs) |
| `backend/app/core/document_engine/templates/{cv_modern,cv_classic,letter_standard,letter_modern,academic_formal,academic_clean,pro_corporate,pro_minimal}.py` | `renderer.py` (un seul renderer générique + `TEMPLATE_STYLES`) |
| `backend/app/core/document_engine/schema.py` — `CVContent`, `CoverLetterContent`, `ProDocContent`, `AcademicDocContent`, `ProSection`, `ContactInfo`, `Experience`, `Education`, `LanguageLevel`, `DOC_TYPE_SCHEMAS` | `blocks.py` / `document.py` (`Outline`/`OutlineSection` conservées — utilisées par le Générateur de plan, hors périmètre V3) |
| `frontend/src/components/tools/{Stepper,SuggestionsPanel,SuggestedChips,DocumentPreview}.tsx` | `AIInteraction.tsx` (déjà existant) + `DocumentRenderer.tsx` |
| `frontend/src/lib/document-types.ts` | `frontend/src/types/document-engine.ts` |
| Endpoint `POST /documents/render` (contenu brut, création systématique d'une nouvelle ligne) | `POST /documents/{id}/render` (unifié avec l'ancien `/rerender`) |
| `academic_sessions.{domain,topic,outline_json,sections_json,interactions_json,template}` | colonne unique `work_state` JSONB |
| Endpoints académiques `suggest-topics`, `generate-outline`, `generate-section`, `regenerate-section`, `validate-section` | `/documents/academic/analyze` et `/generate` génériques |

---

## 3. Migrations appliquées

*(Note : le prompt V3-6 mentionnait `0004_doc_engine.sql` — numéro déjà pris
dans ce dépôt par une migration antérieure au travail V3. Les migrations
suivantes ont été créées avec les numéros réellement disponibles.)*

- **`0007_doc_engine_documents.sql`** — `documents.storage_path` passe de
  `NOT NULL` à nullable, pour permettre à `/generate` de persister le JSON de
  blocs avant tout rendu de fichier. Aucune perte de données (relâche une
  contrainte, ne touche aucune ligne existante).
- **`0008_academic_work_state.sql`** — ajoute `work_state` JSONB et `title` à
  `academic_sessions` ; migre chaque session existante en copiant son
  `outline_json`/`sections_json`/`interactions_json`/`current_step`/`topic`
  d'origine tels quels dans `work_state.legacy` (rien n'est perdu, mais le
  nouveau frontend conversationnel ne peut pas « rejouer » un ancien état de
  stepper — les deux UX sont incompatibles, donc aucune conversion
  champ-à-champ n'a été tentée) ; supprime ensuite les colonnes devenues
  inutiles (`domain`, `topic`, `outline_json`, `sections_json`,
  `interactions_json`, `template`). `current_step` est conservé (colonne
  inerte, plus lue par le frontend).

**Ces deux migrations n'ont pas été appliquées à la base Supabase réelle** —
aucun accès CLI/DB n'était disponible dans cet environnement. Elles doivent
être exécutées manuellement dans l'éditeur SQL Supabase, comme les migrations
précédentes de ce projet.

---

## 4. Changements hors périmètre documentaire

- `backend/app/api/v1/router.py` — `generators` retiré, `documents_engine`
  ajouté à la liste des routeurs. Aucun autre routeur touché.
- `backend/app/core/llm/client.py` — additif uniquement. Vérifié explicitement
  que `reformulator`, `email_writer`, `chat`, `social_posts`, `speech_writer`,
  `analyzers`, `converter`, `planner` importent et fonctionnent toujours
  (import réussi ; ces outils n'ont pas de suite de tests automatisée dans ce
  dépôt, donc seule l'absence d'erreur d'import a pu être vérifiée, pas leur
  comportement fonctionnel).
- `backend/app/core/documents.py` — `insert_document` (ancienne, exigeait
  `storage_path`) supprimée, remplacée par `insert_document_draft` +
  `finalize_document_render`.
- `frontend/src/app/(dashboard)/documents/page.tsx` — corrigée pour utiliser
  le nouvel endpoint de rendu unifié (cf. §1, bug trouvé tardivement).

---

## 5. Les 5 contraintes caduques — statut

1. **Schémas Pydantic rigides par type de document** → **Levée.** Remplacés
   par le vocabulaire de blocs. Plus aucune trace de `CVContent` et
   consorts dans le code.
2. **Templates un-fichier-un-design** → **Levée.** Un seul `renderer.py`,
   8 jeux de styles déclaratifs (`TemplateStyle`), modulés par palier.
3. **Endpoints d'analyse one-shot sans historique** → **Levée.** `/analyze`
   est appelable à volonté, l'historique s'accumule dans `context.history` et
   est renvoyé au LLM à chaque tour.
4. **Pont Analyser→Générer via l'état React reconstruit** → **Levée.**
   `DocumentWorkspace` transmet le même objet `context` (cadrage + historique
   + informations validées) aux deux endpoints ; `/generate` fonctionne aussi
   bien après plusieurs tours d'`/analyze` que sans jamais l'avoir appelé.
5. **Absence de format `messages` multi-tours** → **Levée pour l'usage réel**,
   mais avec une nuance : les fonctions `complete_json`/`stream_completion`
   acceptaient *déjà* un `messages` arbitraire avant V3 (voir §1, couche 2) —
   ce qui manquait n'était pas la capacité mais l'usage qu'en faisaient les
   endpoints documentaires. C'est corrigé côté `documents_engine.py`/
   `doc_engine.py`.

---

## 6. Points d'attention restants

- **Aucun appel réel à OpenRouter n'a eu lieu.** Toute la vérification de ce
  travail s'est faite avec des réponses LLM simulées (mocks). Le vrai test —
  un modèle réel respecte-t-il strictement le format JSONL demandé, sans
  fences markdown, sans virgule finale malformée — n'a jamais été observé. Le
  parseur (`stream_blocks`) et la réparation de blocs (`repair_block`) sont
  conçus pour être tolérants, mais leur robustesse en conditions réelles reste
  à confirmer.
- **Caching non uniforme.** `cacheable_system_message()` n'apporte un vrai
  gain que sur les modèles Claude (passthrough du `cache_control` Anthropic
  via OpenRouter) ; sur Grok/Gemini/DeepSeek (utilisés aux paliers Goutte/
  Source), le marqueur est probablement ignoré sans erreur — mais ceci n'a pas
  été vérifié empiriquement, seulement documenté.
- **Document académique long : risque réel non résolu.** L'ancien flux
  générait un mémoire/thèse section par section (appels LLM courts, répétés,
  contexte compact). Le nouveau `/generate` produit **tout le document en un
  seul appel** streamé en JSONL. Pour un rapport de stage, c'est un vrai gain
  de simplicité. Pour une thèse de 40+ pages, c'est un risque concret : limite
  de tokens de sortie du modèle, temps de génération, coût, et probabilité
  d'échec plus élevée sur un flux aussi long. **Ce point n'a pas été retesté
  avec un vrai modèle** — à surveiller en priorité si des utilisateurs
  génèrent des documents académiques longs.
- **Modulation par palier volontairement modeste.** python-docx ne permet ni
  dégradés ni mise en page complexe. La différenciation « sobre / soigné /
  premium » se traduit par des touches réelles mais discrètes (couleurs
  d'accent, bordures, mentions de marque) plutôt qu'une refonte visuelle
  spectaculaire par palier — un choix honnête plutôt qu'une promesse
  visuelle que l'outil ne peut pas tenir.
- **Réparation de blocs limitée aux champs manquants.** `repair_block()`
  comble les champs requis absents (chaîne ou liste vide) mais ne corrige pas
  un champ du mauvais type (ex. `level` envoyé comme chaîne `"1"` au lieu
  d'un entier) — un tel bloc est actuellement rejeté et silencieusement
  ignoré plutôt que réparé. Non testé de façon exhaustive (fuzzing).
- **Décisions prises sans validation utilisateur explicite**, à confirmer :
  - Quota : `/analyze` et `/generate` ne consomment **pas** de quota mots
    (contrairement au texte littéral du prompt V3-3) — la philosophie
    existante du projet (génération gratuite, seul le téléchargement coûte)
    a été conservée. À trancher si ce n'est pas le comportement voulu.
  - Modèle : `grok-4.3` conservé partout au lieu du `grok-4.5` mentionné dans
    le prompt V3 — ce dernier est confirmé indisponible dans la région de
    l'utilisateur (403, corrigé plus tôt dans ce projet).

---

## 7. Reste à faire / à surveiller

- Appliquer manuellement `0007_doc_engine_documents.sql` et
  `0008_academic_work_state.sql` dans l'éditeur SQL Supabase.
- Tester en conditions réelles (vrais appels OpenRouter) les 6 scénarios de
  bout en bout listés dans V3-7 (CV express, CV guidé, rapport pro avec
  tableaux, template × palier, académique multi-session, anti-régressions) —
  seule la logique d'orchestration a été vérifiée par mocks jusqu'ici.
- Décider explicitement du sort du document académique long (génération en un
  bloc vs découpage — voir §6) avant une mise en production pour des thèses.
- Aucun test automatisé (pytest/vitest) n'existe dans ce dépôt pour figer ce
  comportement — toute la vérification de cette refonte a été ad hoc,
  execute-once, non rejouable automatiquement.
- Les miniatures visuelles de templates et la modale d'aperçu détaillé
  (mentionnées dans la V2, jamais réclamées explicitement en V3) restent hors
  périmètre — aucun asset de design fourni.
