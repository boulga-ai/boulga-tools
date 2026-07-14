# Boulga AI — Document académique : vrai chat collecteur (V4)

Ce fichier ne touche QUE l'outil Document académique
(`frontend/src/app/(dashboard)/tools/academic-writer/page.tsx` et
`frontend/src/components/tools/DocumentWorkspace.tsx`, partagé par les 3 autres
outils documentaires). Une fois validé ici, le même patron sera répliqué sur
CV / Lettre / Document pro dans un second temps — ne touche pas à ces 3 pages
maintenant.

## Principe directeur

L'outil devient un **chat collecteur d'informations**, pas un chat libre et pas
un formulaire. Chaque tour s'empile visuellement et reste visible (comme
Claude) — mais le rôle de l'IA reste strictement de comprendre ce que le user
décrit, poser les questions utiles, proposer des suggestions, et permettre de
générer à tout moment. Le prompt système actuel (`build_analyze_system_prompt`)
fait déjà ça correctement depuis la Correction 1 post-audit — **ne le
retouche pas**, seul l'habillage change.

Deux boutons persistants restent la seule façon d'agir sur le document :
« Analyser » (enrichit le fil) et « Générer » (produit le document, toujours
actif). Rien de nouveau à ce niveau — uniquement la façon dont le fil
s'affiche et se collecte.

---

## Correction 1 — Modèle de données : des tours qui s'empilent, jamais effacés

```
AVANT DE CODER : dans DocumentWorkspace.tsx, `analysis: AnalyzeResponse | null`
ne garde que la dernière réponse — à chaque nouvel appel à /analyze, l'ancienne
est perdue de l'affichage (même si `history` l'envoie toujours au backend).
C'est la cause principale de l'effet "formulaire qui écrase" au lieu de chat.

Ajoute un état `chatTurns` à côté de `history` (ne touche pas à `history`, qui
reste le format exact envoyé au backend — `chatTurns` est purement pour
l'affichage) :

type ChatTurn =
  | { id: string; role: "user"; content: string }
  | {
      id: string;
      role: "assistant";
      message: string;
      questions: (AnalyzeQuestion & { answer?: string })[];
      suggestions: (AnalyzeSuggestion & { status: "pending" | "accepted" | "rejected" })[];
    };

Dans handleAnalyze, à chaque appel réussi :
- si userText n'est pas vide, pousse un tour { role: "user", content: userText }
  dans chatTurns (en plus de history, comme aujourd'hui).
- pousse un tour assistant avec data.message, data.questions et
  data.suggestions (chaque question/suggestion avec son etat initial :
  answer undefined / status "pending").

answerQuestion et acceptSuggestion/rejectSuggestion doivent maintenant chercher
la question/suggestion PAR SON ID à travers tous les chatTurns (pas seulement
le dernier) et mettre a jour son etat localement dans le tour ou elle se
trouve — une question repondue reste affichee, resolue, dans SON tour, elle ne
disparait pas.

Restauration (academic uniquement, via work_state) : ajoute chatTurns au type
WorkState et persiste-le comme le reste. S'il est absent (anciennes sessions),
initialise a partir de rien — pas de reconstruction retroactive necessaire.

VÉRIFICATION : lance 3 tours d'analyse successifs avec des questions/
suggestions différentes à chaque fois. Confirme que les 3 tours restent tous
visibles avec leur état (répondu/accepté/refusé) préservé, dans l'ordre.
```

## Correction 2 — Composeur façon chat (remplace le champ de formulaire)

```
AVANT DE CODER : le bloc actuel est un <Label> + <Textarea> figé au-dessus des
boutons, qui ressemble a un champ de formulaire classique. Remplace-le par un
vrai composeur de chat.

Disposition de la colonne gauche (academic uniquement, dans DocumentWorkspace
quand docType === "academic" — les 3 autres docType gardent l'ancien rendu
pour l'instant) :
1. En haut : cadrage compact (type, domaine, competence, niveau de detail —
   Correction 3) sur une bande fine, jamais melangee au fil.
2. Au centre : le fil de chatTurns, scrollable, chaque tour dans une bulle
   (user aligne a droite ou distinct visuellement, assistant a gauche avec ses
   cartes de questions/suggestions integrees dans SA bulle).
3. En bas, FIXE (sticky) : le composeur — textarea qui grandit avec le texte
   (pas de label au-dessus, juste un placeholder), bouton d'envoi (icone),
   Entree pour envoyer / Maj+Entree pour un saut de ligne. L'envoi appelle
   handleAnalyze(false) et vide le champ.
4. Juste au-dessus du composeur, une barre persistante avec les boutons
   « Générer le document » et le lien « Voir le plan » (si can_propose_plan) —
   toujours accessibles sans scroller le fil.

Le placeholder du composeur reste celui deja fourni par la page (
textareaPlaceholder), mais reformule-le si besoin pour sonner comme une
invite de conversation plutot qu'un champ a remplir.

Aucun changement cote backend ni cote logique d'appel (handleAnalyze,
handleGenerate restent les memes) — uniquement la disposition et le rendu.

VÉRIFICATION : le champ ressemble et se comporte comme un vrai composeur de
chat (grandit, Entree envoie, le fil reste visible et scrollable au-dessus).
Generer reste accessible a tout moment sans avoir a scroller.
```

## Correction 3 — Compétence et niveau de détail (sans jamais nommer un modèle)

```
AVANT DE CODER : analyse app/core/llm/router.py — DEFAULT_ROUTING["academic_writer"]
n'a qu'UN SEUL candidat par palier aujourd'hui (pas de choix possible). Pour
que "competence" ait un sens, il faut un 2e candidat par groupe de palier.

=== Backend ===

Dans router.py, DEFAULT_ROUTING["academic_writer"] : ajoute un 2e candidat par
groupe actif (goutte_source et fleuve_ocean), ordonne [standard, expert] :
- goutte_source : garde x-ai/grok-4.3 en "standard", ajoute
  google/gemini-3.5-flash en "expert" (deja utilise ailleurs, prix connu).
- fleuve_ocean : garde anthropic/claude-sonnet-4.6 en "standard", ajoute
  anthropic/claude-opus-4.6 en "expert" (deja dans MODEL_PRICES).

SIGNALE EXPLICITEMENT dans ta reponse : choisir "expert" a fleuve_ocean
appelle Opus, sensiblement plus cher que Sonnet (voir MODEL_PRICES dans
client.py) — cout reel plus eleve par generation. Ce n'est pas neutre
economiquement, a confirmer que c'est voulu avant de merger si un doute
subsiste.

resolve_model(tool, tier, competence="standard") -> ajoute un parametre
competence optionnel. "standard" = candidates[0] (comportement actuel,
inchange par defaut). "expert" = candidates[1] si il existe, sinon retombe
sur candidates[0] sans erreur (jamais de blocage si un palier n'a qu'un seul
candidat).

Dans documents_engine.py, DocEngineContext gagne deux champs optionnels :
competence: Literal["standard","expert"] = "standard" et
depth: Literal["essentiel","detaille","tres_detaille"] = "detaille". Les deux
sont passes a resolve_model / au prompt de generation.

Dans doc_engine.py, build_generate_system_prompt (et build_segment_system_prompt)
recoivent le niveau de detail et l'incluent comme consigne de longueur/
profondeur (reutilise la MEME echelle que app/models/planner.py
PlannerDepth — meme vocabulaire, ne pas en inventer un autre). Aucune regle
mecanique de comptage (pas de "exactement N mots") — une consigne d'intention
("developpe en profondeur avec sous-parties" pour tres_detaille, "reste
concis, l'essentiel" pour essentiel), le LLM juge la longueur exacte.

=== Frontend ===

Dans le cadrage compact d'academic-writer (Correction 2), ajoute deux
selecteurs :
- "Compétence" : options avec des libellés SANS AUCUN nom de modèle —
  "Standard" et "Expert" uniquement. Si le palier de l'utilisateur n'offre
  qu'un candidat (verifie cote frontend via l'info de palier disponible, ou
  simplement masque le selecteur si l'appel ne renvoie qu'une option), NE
  MONTRE PAS le sélecteur plutôt qu'un choix a une seule option.
- "Niveau de détail" : "Essentiel" / "Détaillé" / "Très détaillé" — toujours
  visible, ne depend pas du palier.

Ces deux valeurs rejoignent le cadrage (comme doc_type/domain aujourd'hui) et
sont transmises dans le contexte a chaque appel /analyze et /generate.

VÉRIFICATION : confirme qu'aucun nom de modèle (Claude, Grok, Gemini, Opus,
Sonnet) n'apparaît nulle part dans le code frontend affiché à l'utilisateur.
Teste resolve_model avec competence="expert" sur un tool a un seul candidat
— confirme qu'il retombe sur candidates[0] sans erreur.
```

## Correction 4 — Changer de projet

```
AVANT DE CODER : academic-writer/page.tsx charge automatiquement LA session
in_progress la plus recente, ou en cree une — il n'y a aucune façon de voir
la liste des projets existants ni de choisir lequel reprendre.

Ajoute un sélecteur de projet en haut de la page (au-dessus du cadrage) :
« Projet : {titre du projet actif} ▾ ». Au clic, ouvre une liste courte
(GET /api/v1/tools/generators/academic/sessions, deja triee par updated_at)
affichant titre + date pour chaque session, plus une option
« + Nouveau projet » en bas.

Choisir un projet dans la liste charge SON work_state dans DocumentWorkspace
(comme le chargement initial actuel, mais pour l'id choisi plutôt que "le"
in_progress). « + Nouveau projet » cree une nouvelle session vide et bascule
dessus.

Plusieurs projets peuvent rester "in_progress" simultanement — ne force pas
la fermeture de l'ancien projet quand on en choisit un autre.

VÉRIFICATION : cree 2 projets distincts avec des sujets differents, bascule
de l'un a l'autre via le selecteur — confirme que chacun garde son propre
fil de chat, son propre plan, ses propres blocs generes, independamment.
```

## Correction 5 — Corriger l'affichage périmé + nettoyage final

```
Bug observe : changer le cadrage (type/domaine/competence/niveau de detail)
apres qu'un document a deja ete genere laisse l'ancien document affiche a
droite, sans aucun signal qu'il ne correspond plus au cadrage actuel.

Dans DocumentWorkspace.tsx : quand un champ de cadrage change ET qu'un
documentId existe deja, vide blocks/documentId/docTitle (le panneau de droite
revient a "Votre document apparaîtra ici"). Meme comportement au changement de
projet (Correction 4) — bascule vers un panneau vide ou le work_state du
projet cible s'il en a deja un.

Ne vide RIEN sur un changement de userText ou une reponse a une question/
suggestion (ce sont des enrichissements normaux du meme document en cours,
pas un changement de sujet).

VÉRIFICATION FINALE :
- Génère un document, change le domaine → le panneau droit se vide
  immédiatement, aucun document perime affiche.
- tsc + eslint + next build propres.
- Repasse rapide : confirme qu'aucun nom de modele n'est visible cote user,
  que le fil de chat ne s'efface jamais, que Générer reste toujours actif.
```

---

## Ordre d'exécution

1. Correction 1 — Modèle de données (tours empilés)
2. Correction 2 — Composeur façon chat
3. Correction 3 — Compétence + niveau de détail
4. Correction 4 — Changer de projet
5. Correction 5 — Affichage périmé + vérification finale

*Boulga AI — Puiser l'intelligence qu'il vous faut.*
