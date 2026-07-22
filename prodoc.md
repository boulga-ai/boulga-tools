# Production documentaire — prompts pour Document pro / Document académique

Ce document contient les prompts à exécuter **dans l'ordre**, un par un, pour aligner
`pro-doc-writer`/`academic-writer` (les "gros documents" du moteur V3) sur le patron déjà en place
pour `cv-writer`/`cover-letter` (fil de documents, historique flottant, couleurs par carte), puis
pour fiabiliser et rendre visible la génération longue (segmentation, progression, sauvegarde
incrémentale).

## Comment utiliser ces prompts

1. Colle **un seul prompt à la fois**. Laisse Claude Code terminer, relis le diff, teste, puis
   passe au suivant.
2. Après chaque prompt, `git commit` avant d'enchaîner.
3. Ne saute pas d'étape : la Phase B (fiabilisation) suppose que la Phase A (contenant) est en
   place — sinon le travail de progression/affichage devrait être refait dans le fil de cartes une
   fois celui-ci construit.

## Rappel du diagnostic (voir échange précédent)

- `pro_doc`/`academic` utilisent encore un document unique par session (`resultPanel`), écrasé à
  chaque génération — pas de fil de plusieurs documents (`multiResult`) comme `cv`/`cover_letter`.
- Leur sélecteur de template n'apparaît qu'APRÈS génération (dans `resultPanel`), jamais en amont.
- Leurs "projets" existent déjà, mais côté base (`document_sessions`, sidebar fixe 256px) — pas le
  même popover flottant que `cv`/`cover_letter`.
- Le sommaire (`table_of_contents`) n'est qu'un texte statique dans l'aperçu web.
- Seul `academic` segmente la génération longue (plan > 6 sections) ; invisible pour l'utilisateur
  (aucune progression affichée) et non résilient (un échec en cours de route perd tout).
- `pro_doc` n'est jamais segmenté, quelle que soit la longueur demandée.

---

## PHASE A — Aligner pro_doc/academic sur le patron CV/Lettre (contenant)

### Prompt A1 — Sélecteur de template en amont, sans conditionner le contenu

```
Dans `DocumentWorkspace.tsx`, le choix du template pour un document (cv/cover_letter) apparaît
AVANT génération (leftPanel) uniquement quand `templateConditionsContent=true` — ce flag mélange
aujourd'hui deux choses distinctes : (a) où le sélecteur de template apparaît, (b) si changer de
template invalide le document déjà généré (vrai seulement quand le template conditionne le contenu
envoyé au LLM, jamais le cas pour pro_doc/academic).

Objectif : permettre à pro_doc/academic de choisir leur template AVANT génération (comme
cv/cover_letter), sans jamais invalider le document existant quand on le change (leur template
reste un habillage pur, cf. blocks.TEMPLATE_OVERRIDES qui n'a volontairement pas d'entrée pour
pro_doc/academic).

À faire :
- `frontend/src/components/tools/DocumentWorkspace.tsx` : ajoute une prop `templateUpfront?: boolean`
  (défaut false). Le sélecteur de template dans leftPanel s'affiche si
  `(templateConditionsContent || templateUpfront) && templates.length > 0` ; celui dans resultPanel
  s'affiche si `!templateConditionsContent && !templateUpfront && templates.length > 0`. L'effet qui
  invalide le document sur changement de template reste gaté uniquement sur
  `templateConditionsContent` (ne touche pas à cette partie).
- `frontend/src/app/(dashboard)/tools/pro-doc-writer/page.tsx` et `academic-writer/page.tsx` :
  passe `templateUpfront` à `<DocumentWorkspace>`.

Contrainte : ne touche pas au comportement de cv-writer/cover-letter (templateConditionsContent
reste leur seul flag, templateUpfront doit valoir false/absent pour eux — vérifie que le rendu ne
change pas pour ces deux outils). Vérifie avec `npx tsc --noEmit` et `npx eslint` sur les fichiers
touchés.
```

### Prompt A2 — Fil de documents (multiResult) + historique de sessions en popover flottant

```
pro_doc/academic doivent adopter le même "fil de documents" (multiResult) que cv/cover_letter :
plusieurs générations côte à côte dans un même projet (cartes format page, agrandir en modal,
couleurs accent/secondaire par carte) au lieu d'un document unique écrasé à chaque génération.

Différence importante avec cv/cover_letter : pro_doc/academic ont DÉJÀ un système de "projets"
côté backend (sessions persistées en base, table `document_sessions`, endpoints
`/api/v1/tools/generators/{tool}/sessions`, déjà utilisé par les deux pages pour lister/créer/
changer de session). Il ne faut PAS dupliquer un deuxième système d'historique local
(`archivedProjects`/localStorage, cf. handleNewDocument/openProject dans DocumentWorkspace.tsx) —
la session DB existante EST déjà le "projet". Le travail ici consiste à rhabiller son interaction
pour qu'elle ressemble à celle de cv/cover_letter (popover flottant, nom éditable), pas à la
remplacer par le mécanisme local.

À faire :

1. `frontend/src/components/tools/DocumentWorkspace.tsx` :
   - `multiResult=true` seul reste suffisant pour activer le fil de cartes (resultFeed) — aucun
     changement nécessaire ici, ce mécanisme est déjà générique.
   - Le bloc "nom de projet + historique popover + bouton Nouveau" dans leftPanel est déjà gaté sur
     `multiResult && newDocumentLabel` : si pro_doc/academic ne passent PAS `newDocumentLabel`, ce
     bloc interne (localStorage) ne s'affiche pas — les pages fournissent leur propre équivalent
     branché sur les sessions DB (étape 2). Ne change rien à ce composant pour cette partie.

2. `frontend/src/app/(dashboard)/tools/pro-doc-writer/page.tsx` (puis même traitement dans
   `academic-writer/page.tsx`) :
   - Supprime le `projectList` actuel (sidebar fixe 256px + Sheet mobile + bouton masquer) et ce
     qui s'y rattache (`projectListCollapsed`, imports `Sheet`/`SheetContent`/`SheetTitle`/
     `SheetTrigger`/`Menu`/`PanelLeftClose`/`PanelLeftOpen` si plus utilisés ailleurs) — remplace
     par une rangée compacte dans la barre d'en-tête existante (celle qui affiche déjà "Document
     professionnel") :
       - nom de la session, affiché/éditable au clic (même pattern que le nom de projet CV : Input
         en édition, icône Pencil au survol), `onBlur`/Enter → PATCH `{ title }` sur la session
         active.
       - un `Popover` (icône `History`, badge = nombre d'AUTRES sessions, chevron) listant
         `sessions.filter(s => s.id !== session?.id)` (nom + date relative déjà disponible via
         `relativeDate`) ; clic sur une entrée → `switchToSession(id)` puis ferme le popover.
       - un bouton "+ Nouveau document" → `createNewProject()` (déjà existant, inchangé).
     Même composition visuelle que le bloc équivalent de DocumentWorkspace (`Popover`/
     `PopoverTrigger`/`PopoverContent`, déjà utilisés ailleurs via `@/components/ui/popover`).
   - Passe à `<DocumentWorkspace>` : `multiResult`, `templateUpfront` (prompt précédent), PAS de
     `newDocumentLabel` (le bloc interne reste caché, cf. étape 1). Enrichis `initialState` avec
     `projectId: session.id` et `projectName: session.title ?? undefined` fusionnés dans
     `session?.work_state` — le `projectId`/`projectName` internes de DocumentWorkspace (utilisés
     pour l'auto-nommage, cf. handleGenerate) restent ainsi alignés sur la session sans aucun
     changement dans DocumentWorkspace.
   - Dans `persistState`, change `title: state.title || undefined` en
     `title: state.projectName || state.title || undefined` — la colonne `title` de la session doit
     refléter le nom STABLE du projet (auto-nommé ou renommé par le user), pas le titre du dernier
     document généré (qui change à chaque nouvelle carte).
   - Comme chaque changement de session force déjà un remount de `<DocumentWorkspace key={session?.id}>`,
     aucune logique de reset manuel n'est nécessaire (contrairement à CV, qui n'a pas cet ancrage
     côté page et doit réinitialiser son état interne à la main).

3. Répète exactement le même traitement dans `academic-writer/page.tsx`.

Contrainte : ne touche pas au mécanisme d'archivage local de cv-writer/cover-letter. Vérifie que
changer de session recharge bien SES documents (results), que "+ Nouveau document" crée une
session vide sans toucher aux autres, et que renommer la session met à jour son entrée dans le
popover (après le debounce de persistState). tsc + eslint clean sur tous les fichiers touchés.
```

### Prompt A3 — Sommaire cliquable dans l'aperçu

```
Le bloc `table_of_contents` (pro_doc/academic) n'affiche aujourd'hui qu'un texte statique dans
l'aperçu — `DocumentRenderer.tsx:281` : "[Sommaire — généré automatiquement au téléchargement]".
Une fois le fil de cartes en place (prompt A2), l'aperçu complet se consulte dans la modale
"Agrandir" de PageResultCard — un sommaire cliquable y a vraiment sa place (document
potentiellement long, scroll continu sinon).

À faire :
- `frontend/src/components/tools/DocumentRenderer.tsx` : calcule, à partir des blocs `heading` du
  document, une liste plate `{level, text, anchor}` (ancre stable, ex. `heading-${index}`). Donne à
  chaque heading rendu un `id={anchor}` correspondant. Remplace le rendu du bloc
  `table_of_contents` par une liste de liens (indentée par niveau) qui défilent vers l'ancre
  correspondante au clic (`scrollIntoView({behavior: "smooth", block: "start"})` ou simple
  `<a href="#anchor">`), au lieu du texte statique actuel.
- Vérifie que ça fonctionne dans la modale (conteneur scrollable, cf. PageResultCard.tsx) — dans la
  carte miniature recadrée (aperçu compact), le conteneur a déjà `pointer-events-none` : le
  sommaire y reste inerte, ce qui est attendu (seule la modale est un vrai mode consultation).

Contrainte : ne change rien au rendu DOCX (le sommaire du fichier téléchargé reste géré séparément
par le renderer python-docx). N'affecte que l'aperçu web. tsc + eslint clean.
```

### Prompt A4 — Nettoyage (optionnel, à valider avant d'exécuter)

```
Une fois A1-A3 en place, cv/cover_letter/pro_doc/academic passent TOUS par multiResult=true — le
chemin singulier (`resultPanel`, branche `!multiResult` dans DocumentWorkspace.tsx) devient mort
pour les 4 outils actuels.

Avant d'exécuter ce prompt : confirmer si on supprime ce chemin (simplification, moins de code à
maintenir) ou si on le garde dormant pour un futur outil qui n'aurait pas besoin d'un fil de
documents. Si suppression validée :
- Retire `resultPanel` et toute branche `!multiResult` devenue inatteignable dans
  `DocumentWorkspace.tsx` (documentId/docTitle/editingTitle singuliers, handleDownload singulier,
  etc. — vérifier ce qui devient réellement mort avant de retirer).

Contrainte : ne rien retirer qui serait encore utilisé par un chemin `!multiResult` actif ailleurs
dans le repo — grep les usages de `<DocumentWorkspace` avant de toucher à quoi que ce soit.
```

---

## PHASE B — Fiabiliser et rendre visible la génération longue

### Prompt B1 — Étendre la segmentation à pro_doc + rendre la progression visible

```
Aujourd'hui, seul `academic` bénéficie d'une génération découpée par segments (plan > 6 sections,
groupes de 2 — `settings.ACADEMIC_SEGMENT_THRESHOLD`/`ACADEMIC_SEGMENT_SIZE`,
`documents_engine.py:181`). `pro_doc` génère toujours en un seul appel LLM, quelle que soit la
longueur demandée (risque de troncature silencieuse sur un document "Très détaillé" long, sans
max_tokens explicite ni vérification de finish_reason). Côté UX, la segmentation existante est en
plus totalement invisible : aucun événement de progression n'existe (`useBlockStream.ts` n'écoute
que block/done/error), et `resultPanel` n'affiche même pas un simple "Génération en cours" pendant
que ça tourne.

À faire :

1. `backend/app/config.py` : renomme `ACADEMIC_SEGMENT_THRESHOLD`/`ACADEMIC_SEGMENT_SIZE` en
   `LONG_DOC_SEGMENT_THRESHOLD`/`LONG_DOC_SEGMENT_SIZE` (mêmes valeurs par défaut, 6 et 2) — le
   mécanisme n'est plus spécifique à l'académique. Mets à jour le commentaire.

2. `backend/app/api/v1/tools/documents_engine.py` :
   - `segmented = doc_type in ("academic", "pro_doc") and len(plan) > settings.LONG_DOC_SEGMENT_THRESHOLD`
     (au lieu de `doc_type == "academic"`).
   - Avant la boucle de segments, calcule `total_segments = len(_chunk_plan(plan, settings.LONG_DOC_SEGMENT_SIZE))`.
   - Pour chaque segment (index i à partir de 0) : yield un événement
     `{"event": "segment_start", "data": json.dumps({"index": i + 1, "total": total_segments, "headings": [s.get("heading", "") for s in segment_sections]})}`
     AVANT l'appel `stream_blocks` de ce segment, puis
     `{"event": "segment_done", "data": json.dumps({"index": i + 1, "total": total_segments})}`
     juste après (une fois le résumé du segment obtenu).
   - Le chemin non segmenté (cv, cover_letter, pro_doc/academic à plan court) ne change pas — ces
     événements ne concernent que la boucle segmentée.

3. `backend/app/core/llm/prompts/doc_engine.py` : `build_segment_system_prompt`/`build_segment_messages`
   ne changent pas de logique — relis juste les docstrings/commentaires qui présupposent
   "académique" et généralise leur formulation si besoin (sans changer le comportement).

4. `frontend/src/hooks/useBlockStream.ts` : ajoute un state `progress: {index: number; total: number} | null`
   (null par défaut, reset à null dans `start()`). Gère les nouveaux types d'événements SSE
   `segment_start`/`segment_done` en mettant à jour `progress`. Expose `progress` dans la valeur de
   retour du hook.

5. `frontend/src/components/tools/DocumentWorkspace.tsx` :
   - Récupère `progress` depuis `useBlockStream()`.
   - Dans `resultFeed`, le bloc `isStreaming` (carte en cours de génération) affiche, quand
     `progress` n'est pas null, "Rédaction en cours — section {progress.index}/{progress.total}"
     avec une barre de progression proportionnelle, au lieu du texte fixe "Génération en cours..."
     actuel — qui reste affiché quand `progress` est null (documents courts, non segmentés).
   - Si `resultPanel` existe encore (A4 non exécuté), ajoute la même indication minimale
     (aujourd'hui totalement absente) : au moins un texte "Génération en cours..." avec spinner
     quand `isStreaming`, plus la barre de progression si `progress` existe.

Contrainte : ne change rien au comportement pour cv/cover_letter (jamais segmentés, `progress` y
reste toujours null, donc le texte affiché ne change pas pour eux). Teste avec un plan de plus de
6 sections sur pro_doc pour vérifier que la segmentation et la progression s'activent bien. tsc +
eslint + au moins un test backend qui consomme l'endpoint et vérifie la séquence d'événements.
```

### Prompt B2 — Sauvegarde incrémentale par segment + récupération sur échec partiel

```
Aujourd'hui, `generate_document` ne persiste le document (`insert_document_draft`) qu'une seule
fois, tout à la fin, après que TOUS les segments aient réussi. Un échec au segment 8/10 (timeout,
erreur OpenRouter) perd les 7 précédents (déjà payés en tokens) : rien n'est récupérable, pas de
document_id, pas de reprise possible.

À faire :

1. `backend/app/core/documents.py` : ajoute `update_document_content(document_id, user_id, title,
   content_json) -> dict | None`, sur le même modèle que `finalize_document_render` mais qui met à
   jour `title`/`content_json` au lieu de `template`/`format`/`storage_path`.

2. `backend/app/api/v1/tools/documents_engine.py`, dans `generate_document` :
   - Génère `document_id = str(uuid.uuid4())` AVANT la boucle (plus seulement à la toute fin), et
     garde un flag `persisted = False`.
   - Dans la boucle segmentée, après CHAQUE segment (y compris le dernier) : construis le
     `Document` via `validate_document(...)` avec les `raw_blocks` accumulés jusqu'ici, calcule le
     titre via `_infer_title(...)`, puis persiste : `insert_document_draft(...)` si
     `not persisted` (premier segment), sinon `update_document_content(...)` — passe `persisted = True`
     après le premier appel.
   - Si une exception (`OpenRouterError` ou autre) survient pendant la boucle ET qu'au moins un
     segment a déjà été persisté : au lieu du simple `yield {"event": "error", ...}; return` actuel,
     yield un événement distinct
     `{"event": "partial", "data": json.dumps({"document_id": document_id, "title": title, "blocks": [...blocs déjà générés...], "completed_segments": i, "total_segments": total_segments})}`
     — le document partiel reste consultable/téléchargeable tel quel, rien n'est perdu. Si AUCUN
     segment n'a réussi (échec dès le premier), le comportement actuel (`error` simple, rien à
     récupérer) ne change pas.
   - Applique la même logique de sauvegarde-si-échec au chemin NON segmenté (cv/cover_letter/
     pro_doc/academic courts) : si `raw_blocks` contient au moins un bloc au moment de l'exception,
     persiste-le et yield `partial` au lieu de `error` sec — un appel unique peut lui aussi être
     interrompu en cours de flux (réseau), pas seulement la boucle segmentée.
   - À la fin (succès complet), le dernier segment ayant déjà tout persisté via
     `update_document_content`, l'insertion finale devient un simple passage par la même fonction
     (pas de logique dupliquée) — simplifie le bloc final de la fonction en conséquence.

3. `frontend/src/hooks/useBlockStream.ts` : gère le nouvel événement `partial` — expose un state
   distinct (ex. `partialResult: (GenerateDoneEvent & {completedSegments: number; totalSegments: number}) | null`)
   plutôt que de le confondre avec `error` (qui reste réservé au cas "rien à récupérer").

4. `frontend/src/components/tools/DocumentWorkspace.tsx` : quand `partialResult` existe après un
   échec, ajoute quand même la carte (comme un `ResultItem` normal, document_id/blocks/title
   présents) au fil de résultats, avec un message clair à côté ("Interrompu après la section
   {completedSegments}/{totalSegments} — le document a été enregistré tel quel, vous pouvez le
   télécharger ou relancer une génération.") au lieu de l'affichage d'erreur muet actuel qui ne
   laisse aucune trace du travail déjà fait.

Contrainte : ne change pas le comportement observable en cas de succès complet (mêmes événements
`block`/`done` qu'aujourd'hui pour le frontend, seule la persistance intermédiaire côté backend est
nouvelle). Teste un échec simulé (ex. forcer une exception après le 2e segment) pour vérifier
qu'un document_id valide et téléchargeable existe malgré l'échec.
```

---

## Backlog (non planifié ici)

- **Palier "introduction"** : pro_doc/academic bloquent l'outil entièrement
  (`available = tier !== "introduction"`), alors que cv/cover_letter laissent désormais générer et
  ne bloquent qu'au téléchargement. Écart de traitement entre outils du même moteur — décision
  produit à trancher, pas juste UX.
- **Prompt A4** (nettoyage du chemin singulier) : à faire seulement si on confirme qu'aucun futur
  outil du moteur documentaire n'aura besoin du mode non-multiResult.
