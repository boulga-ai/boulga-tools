# Boulga AI — Corrections post-audit documentaire

5 corrections ciblées issues de l'audit `docs/AUDIT_DOC_V3.md`. Chaque correction
cible un problème réel identifié dans le code, pas une spéculation.

Règle méta : ne remplace AUCUNE décision intelligente du LLM par une règle codée,
une phrase prescrite, ou un comportement dicté. Si une correction t'amène à écrire
une nouvelle règle mécanique pour le LLM, **arrête-toi et signale-le** au lieu de
le faire. Le LLM est intelligent — on lui retire des contraintes, on ne lui en
ajoute pas.

Exécute dans l'ordre. Commite après chaque correction. Vérifie à la fin de chacune.

---

## Correction 1 — Retirer les sur-contraintes du prompt d'analyse

```
Ouvre backend/app/core/llm/prompts/doc_engine.py, fonction
build_analyze_system_prompt().

SUPPRIME ces deux règles mécaniques (cite l'audit §A et §E) :

1. La règle « Tant que tu n'as pas proposé de plan, ta réponse contient
   TOUJOURS au moins une question ou une suggestion — jamais de cul-de-sac
   silencieux. »
   → Supprime cette contrainte de comptage. Remplace-la par une DESCRIPTION
   DU RÔLE (pas une contrainte) qui indique au LLM les formes de réponse à
   sa disposition : poser des questions pertinentes, faire des suggestions
   concrètes, résumer ce qu'il a compris, proposer une structure, ou conclure
   que les informations sont suffisantes — selon ce qui est le plus utile à
   ce stade de la conversation.
   C'est une description de ses possibilités, pas un minimum imposé. Le LLM
   choisit librement la forme, le nombre, et le moment. Il doit rester actif
   dans le dialogue (pas de réponse vide), mais on ne lui dicte pas combien
   de questions poser ni à quel tour.

2. La règle « Ne remplis proposed_plan que si le user a explicitement
   demandé le plan dans son dernier message (sinon laisse-le à null) »
   → Supprime cette interdiction. Le LLM peut proposer un plan quand il le
   juge pertinent, comme n'importe quelle autre suggestion. Le user accepte,
   modifie, ou ignore.

Le reste du prompt (vocabulaire de blocs, structure JSON de sortie, garde-fou
anti-invention de faits) reste inchangé.

Côté frontend (DocumentWorkspace.tsx) : le champ can_propose_plan et le
bouton « Voir le plan » peuvent rester comme raccourci explicite pour le user
qui veut demander un plan — mais le plan peut aussi apparaître spontanément
dans proposed_plan si le LLM le juge utile, sans que le user ait cliqué.
Vérifie que le code frontend AFFICHE le plan proposé s'il est présent dans la
réponse, que le user l'ait demandé ou non.

Supprime aussi le commentaire trompeur dans doc_engine.py (lignes ~98-100)
qui mentionne un « contexte compact déjà appliqué en amont pour les sessions
longues » — ce mécanisme n'existe pas (voir audit §F).

VÉRIFICATION : relis le prompt système d'analyse après modification. Confirme
qu'il ne contient plus aucune règle qui DICTE au LLM combien de
questions/suggestions produire, ni aucune interdiction de proposer un plan.
Le seul garde-fou éthique qui reste est l'anti-invention de faits.
```

## Correction 2 — Le titre : visible et modifiable après génération

```
L'audit §D montre que le titre du document n'est ni visible ni modifiable
après génération. Le user n'a aucun moyen de le corriger avant téléchargement.

Le titre que le user tape dans le cadrage (champ « Titre (optionnel) ») est
simplement une information transmise au LLM dans le prompt, comme toutes les
autres infos du cadrage. Le LLM en tient compte pour produire le meilleur
titre. _infer_title() n'a PAS besoin de changer de priorité — le LLM décide.

La seule correction nécessaire :

Dans DocumentWorkspace.tsx, zone de résultat (colonne droite) : rends le
titre VISIBLE et MODIFIABLE après génération. Le titre inféré (depuis les
blocs ou le cadrage) s'affiche en haut du résultat dans un champ éditable
(clic → input inline). Toute modification est sauvegardée dans le work_state
et utilisée lors du rendu/téléchargement.

Dans l'endpoint /documents/{id}/render : si un title est fourni dans la
requête, mettre à jour le document avec ce titre.

VÉRIFICATION : génère un document → le titre s'affiche en haut et est
cliquable pour le modifier. Modifie-le → télécharge → le titre modifié est
bien celui du fichier persisté.
```

## Correction 3 — CV → Lettre : proposition au lieu d'injection automatique

```
L'audit §B montre que les données du CV sont injectées automatiquement dans la
Lettre à la navigation (useEffect au montage) sans que le user le sache.
Et « Importer depuis mon CV » charge toujours le dernier CV sans proposer de
choix si le user en a plusieurs.

Corrige :

1. Dans cover-letter/page.tsx : SUPPRIME l'useEffect qui appelle
   applyCVBlocks(lastCVBlocks) automatiquement au montage. Remplace par un
   BANDEAU visible en haut de la page (uniquement s'il y a un CV en mémoire
   ou en base) :
   « Un CV récent a été trouvé. Utiliser ces informations pour pré-remplir ? »
   avec deux boutons : [Utiliser] et [Non merci].
   - Si le user clique [Utiliser] → applyCVBlocks.
   - Si le user clique [Non merci] → le bandeau disparaît, rien n'est injecté.
   - Le bandeau ne réapparaît plus une fois qu'un choix est fait (flag local).

2. Bouton « Importer depuis mon CV » : s'il y a un seul CV en base → le
   charger directement (comme maintenant). S'il y en a PLUSIEURS → afficher
   une liste (titre + date) et laisser le user CHOISIR lequel importer.
   Endpoint existant GET /api/v1/documents/latest/cv → à compléter par un
   GET /api/v1/documents?tool=cv qui renvoie la liste de tous les CV du user.
   Si cet endpoint existe déjà, l'utiliser. Si le user n'a aucun CV en base,
   afficher un message « Aucun CV trouvé. Créez d'abord un CV. »

3. NE TOUCHE PAS à la connexion Générateur de plan → Document pro/académique
   (l'audit dit que c'est un non-problème : l'automatisme suit un choix
   explicite du user sur la page précédente).

VÉRIFICATION : navigue vers la page Lettre de motivation après avoir généré un
CV → le textarea NE doit PAS être pré-rempli automatiquement. Un bandeau
propose d'utiliser le CV. Clique [Non merci] → bandeau disparaît, textarea
vide. Recharge la page → le bandeau ne réapparaît pas.
```

## Correction 4 — Académique long : génération segmentée

```
L'audit §F confirme que le document académique complet est généré en un seul
appel LLM. Pour un rapport de stage court, c'est bien. Pour un mémoire ou
une thèse (40+ pages), c'est un risque réel de troncature, timeout, et coût
excessif.

Implémente une GÉNÉRATION SEGMENTÉE pour les documents académiques longs,
INVISIBLE pour le user (il clique Générer, les blocs arrivent comme d'habitude).

Backend — dans documents_engine.py, endpoint /generate :

Quand doc_type == "academic" ET le plan contient plus de 6 sections (ou le
type est mémoire/thèse) :
- Au lieu d'un seul appel LLM qui génère tout le document, faire N appels
  successifs : un par groupe de sections du plan (par exemple, page de garde +
  introduction en un appel, puis chaque chapitre en un appel, puis conclusion +
  bibliographie en un appel).
- Chaque appel reçoit : le plan complet + un résumé compact des sections déjà
  générées (2-3 phrases par section, générées par le même appel au moment de
  la production — le LLM génère la section ET son résumé dans le même flux) +
  la consigne de rédiger le groupe de sections suivant.
- Les blocs de chaque segment sont streamés au fur et à mesure en SSE
  (le user voit le document se construire progressivement, comme avant).
- À la fin de tous les segments, le document complet est assemblé et persisté.

Prompt — dans doc_engine.py :
- Crée une variante build_segment_messages(context, plan, segment_sections,
  previous_summaries) pour les appels segmentés.
- Le prompt de segment dit au LLM : « Voici le plan complet du document. Voici
  un résumé des sections déjà rédigées. Rédige maintenant les sections
  suivantes : [liste]. Produis aussi un résumé de 2-3 phrases de ce que tu
  as rédigé, sur la dernière ligne, préfixé par SUMMARY: . »
- Le backend parse le SUMMARY: de la sortie et le stocke pour les appels
  suivants. Si le LLM ne produit pas de SUMMARY:, le backend en génère un
  simple (premiers 200 caractères de la section).

Seuil configurable : le nombre de sections minimum pour déclencher le mode
segmenté (défaut 6 — en dessous, on génère tout d'un coup comme maintenant).
Configurable via une variable dans config.py, pas hardcodé dans la logique.

Pour les 3 autres types (cv, cover_letter, pro_doc) : aucun changement, un
seul appel comme maintenant (ces documents sont toujours courts).

VÉRIFICATION : simule (mock) une génération académique avec un plan de 10
sections. Vérifie que les appels sont segmentés (plusieurs appels successifs),
que chaque segment reçoit les résumés des segments précédents, et que le
document final assemblé contient tous les blocs dans l'ordre. Vérifie aussi
qu'un plan de 4 sections passe en un seul appel (pas de segmentation inutile).
```

## Correction 5 — Supprimer le commentaire trompeur + nettoyage

```
Dernière passe de nettoyage.

1. Supprime le commentaire dans doc_engine.py (lignes ~98-100) qui prétend
   qu'un « contexte compact est déjà appliqué en amont pour les sessions
   longues ». Après la Correction 4, le mécanisme existe réellement via
   build_segment_messages — mets à jour le commentaire pour refléter ce qui
   existe vraiment.

2. Fais une passe rapide sur les 4 pages outils frontend (cv-writer,
   cover-letter, pro-doc-writer, academic-writer) et DocumentWorkspace.tsx
   pour vérifier qu'il n'y a pas d'autres automatismes non voulus ou
   comportements non documentés (injection silencieuse, conditions cachées).

3. Vérifie que le build frontend (tsc + eslint + next build) passe proprement
   après toutes les corrections.

4. Mets à jour docs/AUDIT_DOC_V3.md en ajoutant une section « Corrections
   appliquées » qui liste les 5 corrections et leur statut (fait/pas fait).

VÉRIFICATION FINALE : confirme que :
- Le prompt d'analyse ne contient plus aucune règle qui dicte au LLM le nombre
  de questions à poser ou l'interdiction de proposer un plan.
- Le titre est prioritairement celui du user, visible et modifiable.
- La navigation vers la Lettre ne préremplit plus automatiquement sans
  proposition visible.
- Un document académique avec un plan long est généré par segments.
- Aucun commentaire ne décrit un mécanisme inexistant.
```

---

## Ordre d'exécution

1. Correction 1 — Retirer les sur-contraintes du prompt (la plus simple)
2. Correction 2 — Titre (UX)
3. Correction 3 — CV → Lettre (UX)
4. Correction 4 — Académique segmenté (la plus technique)
5. Correction 5 — Nettoyage et vérification finale

*Boulga AI — Puiser l'intelligence qu'il vous faut.*