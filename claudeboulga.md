# BOULGA AI
## Document de référence produit — Version 1.0

*Boulga — « puits » en mooré : le lieu où l'on puise ce dont on a besoin.*

---

## Sommaire

1. Vision et positionnement
2. Marché cible et personas
3. Positionnement concurrentiel
4. Philosophie de conception : la génération bornée
5. Architecture produit : packs et outils
6. Description complète des 20 outils
7. Le parcours guidé — Rédacteur de documents académiques longs
8. Modèle de monétisation
9. Grille tarifaire
10. Interface et expérience utilisateur
11. Décisions de positionnement et garde-fous
12. Feuille de route de construction
13. Points restant à définir
14. Glossaire

---

## 1. Vision et positionnement

Boulga AI est une plateforme d'outils d'intelligence artificielle dédiée à la production documentaire académique et professionnelle, conçue pour répondre aux besoins concrets des étudiants, chercheurs, indépendants, petites et moyennes entreprises et agences de rédaction d'Afrique de l'Ouest francophone.

Plutôt que de proposer un assistant conversationnel généraliste, Boulga rassemble un ensemble de vingt outils spécialisés, chacun conçu pour accomplir une tâche d'écriture, de vérification ou de production documentaire précise : rédiger un mémoire, générer une facture, corriger un texte, convertir un fichier, préparer une soutenance. Chaque outil produit un résultat concret, utilisable immédiatement, dans un format professionnel.

Cette approche répond à un double objectif :

- **Utilité immédiate** : l'utilisateur sait exactement ce qu'il va obtenir en entrant dans un outil, contrairement à un chat généraliste où la valeur dépend de la qualité de ses propres questions.
- **Viabilité économique** : chaque outil a un coût de traitement prévisible, ce qui permet à Boulga de proposer des prix accessibles en FCFA tout en restant rentable.

Boulga se positionne comme la plateforme de référence pour l'écrit académique et professionnel en Afrique de l'Ouest francophone — un espace unique qui regroupe des outils habituellement dispersés entre plusieurs services distincts (convertisseurs de fichiers, correcteurs, détecteurs de plagiat, générateurs de CV, assistants de rédaction), avec une interface en français, des références culturelles locales et un paiement adapté au mobile money.

---

## 2. Marché cible et personas

### L'étudiant

De la licence au doctorat, l'étudiant francophone ouest-africain fait face à des exigences académiques précises : rapport de stage en fin de cycle, mémoire de fin d'études, thèse de doctorat, soutenances orales, devoirs à rendre dans des délais serrés. Il a besoin d'outils qui respectent les normes académiques (citations, plagiat, structure imposée) tout en restant abordables avec un budget étudiant.

### Le chercheur

Le chercheur ou l'enseignant-chercheur a besoin d'outils de recherche rapides, de vérification de sources, de traduction de documents scientifiques et de préparation de présentations pour des colloques ou soutenances qu'il encadre.

### L'indépendant et la PME

Le freelance, le consultant, le gérant de petite entreprise a besoin de produire rapidement des documents professionnels crédibles — offres commerciales, factures, présentations, contenus pour les réseaux sociaux — sans les moyens de s'offrir une agence ou un community manager.

### L'entreprise et l'agence de rédaction

Sur le palier le plus élevé, Boulga s'adresse aux structures qui produisent du contenu écrit à volume important — cabinets de conseil, agences de communication, entreprises avec plusieurs collaborateurs — qui ont besoin d'un accès illimité, de plusieurs sièges utilisateurs et d'une intégration via API.

### Parcours utilisateur type par persona

**L'étudiante en fin de licence de gestion.** Elle arrive sur Boulga trois mois avant sa soutenance, sans sujet de mémoire arrêté. Elle utilise d'abord le Convertisseur de fichiers pour remettre en forme des notes de cours scannées, puis découvre le Détecteur de contenu IA en cherchant à vérifier un devoir. Convaincue par la qualité de ces deux premiers outils gratuits, elle s'abonne au palier Goutte pour accéder au Pack Académique. Elle utilise le parcours guidé du Rédacteur de documents académiques longs, obtient des suggestions de sujet dans son domaine, valide un plan, et rédige son mémoire section par section sur plusieurs semaines. Une fois le document terminé, elle génère ses citations bibliographiques, vérifie son taux de plagiat, puis prépare sa soutenance avec le Rédacteur de discours & pitchs en mode Pitch de soutenance. En parallèle, elle prépare son CV et sa lettre de motivation pour sa recherche de premier emploi.

**Le chercheur en sciences sociales.** Il utilise principalement l'Assistant de recherche IA pour défricher rapidement un nouveau champ de littérature, le Chat sur document pour synthétiser les articles qu'il reçoit de ses pairs, et le Traducteur multilingue pour intégrer des sources anglophones dans ses travaux en français. Son usage est plus dispersé dans le temps que celui de l'étudiant, avec des pics autour des périodes de publication et de conférence, où il mobilise aussi le Rédacteur de discours & pitchs pour préparer ses présentations en colloque.

**La gérante d'une PME de transport à Ouagadougou.** Elle découvre Boulga en cherchant un moyen de convertir un devis reçu en PDF. Elle s'abonne ensuite au palier Source pour le Pack Business : elle génère ses factures et devis en FCFA au fil de l'eau, produit son rapport d'activité annuel avec le Rédacteur de document pro, et publie régulièrement sur WhatsApp Business et Facebook grâce au Générateur de posts réseaux sociaux. Lorsqu'elle cherche à convaincre un partenaire financier, elle enchaîne Générateur de présentation et Rédacteur de discours & pitchs en mode Pitch commercial.

**Le cabinet de conseil au palier Océan.** Une petite structure de cinq consultants s'abonne au palier le plus élevé pour donner à chaque collaborateur un accès illimité aux deux packs, avec un tableau de bord permettant au gérant de suivre l'usage de son équipe. L'accès API est utilisé pour connecter certains outils, notamment le Générateur de document pro, à leurs propres modèles internes de rapports clients.

---

## 3. Positionnement concurrentiel

Le marché des outils IA d'écriture est déjà occupé par des acteurs bien installés, principalement anglophones et généralistes : JustDone, QuillBot, Grammarly, Copy.ai, Jasper, Writesonic pour la production de contenu ; Scribbr, GPTZero et Originality.ai pour la vérification académique ; ChatPDF et Smallpdf pour l'analyse de documents. Une analyse de ces plateformes a directement nourri la conception du catalogue d'outils de Boulga.

Trois enseignements structurants en ressortent :

**La sélection plutôt que l'exhaustivité.** Des plateformes comme JustDone revendiquent plus d'une centaine d'outils, organisés en un catalogue paginé et filtrable. Boulga fait le choix inverse : vingt outils soigneusement choisis, organisés en trois packs clairement identifiables à un profil d'utilisateur. Cette sélectivité est un avantage, pas une limite — elle évite la dilution de la valeur perçue et facilite la découverte.

**Le trio académique comme référence de crédibilité.** Scribbr a construit toute sa réputation sur l'association de trois outils : citations bibliographiques, vérification de plagiat, détection de contenu IA. Boulga reprend cette combinaison éprouvée et l'intègre nativement au Pack Académique, aux côtés du Rédacteur de documents académiques longs, ce qu'aucun concurrent généraliste ne propose de façon aussi intégrée.

**Le quota en mots comme unité de mesure universelle.** L'observation de l'interface de JustDone a révélé qu'un compteur unique de mots consommés, affiché en permanence dans l'application, est une unité bien plus lisible pour l'utilisateur qu'un système de jetons ou de tokens techniques. Ce principe a directement informé le choix de Boulga de ne jamais exposer de terminologie technique liée aux modèles de langage dans l'interface utilisateur.

Le différenciateur propre à Boulga, qu'aucun des acteurs étudiés ne propose, reste la combinaison de trois éléments : l'ancrage local (paiement mobile money via FedaPay, langues locales, références culturelles ouest-africaines), le parcours guidé conversationnel pour les documents académiques longs, et le modèle de monétisation par déblocage de téléchargement plutôt que par simple quota, qui correspond mieux à des usages ponctuels à haute valeur comme un mémoire ou un CV.

---

## 4. Philosophie de conception : la génération bornée

Le principe directeur de Boulga est que chaque outil doit avoir un **coût de traitement prévisible**. Concrètement, cela signifie :

- Un **input défini** : un sujet, un texte à transformer, un fichier à traiter — jamais une conversation ouverte sans limite de tours.
- Un **output de taille prévisible** : un document structuré, un score, un fichier converti — jamais une génération dont la longueur dépend du bon vouloir de l'utilisateur.
- Des **quotas explicites** : chaque outil est soumis à une limite d'usage (nombre de mots, nombre de générations, nombre de téléchargements) définie par le palier d'abonnement.

Les deux exceptions à cette règle — le Chat IA généraliste et l'Assistant de recherche IA — sont volontairement bridées : quota de mots strict, modèle économique par défaut, et pour l'assistant de recherche, une seule synthèse structurée par requête plutôt qu'un fil de discussion qui s'étire indéfiniment.

Cette discipline de conception est ce qui distingue Boulga d'un simple agrégateur de chatbots : chaque euro (ou chaque franc CFA) de coût d'infrastructure est directement rattachable à une valeur livrée à l'utilisateur.

---

## 5. Architecture produit : packs et outils

Les vingt outils de Boulga sont organisés en trois packs thématiques, complétés par un groupe d'outils transversaux accessibles indépendamment du pack choisi. Cette organisation permet à chaque utilisateur de se situer immédiatement : un étudiant sait qu'il doit regarder le Pack Académique, un entrepreneur le Pack Business, et tout le monde peut utiliser les outils du quotidien du Pack Introduction.

| Pack | Rôle stratégique | Nombre d'outils |
|---|---|---|
| **Introduction** | Porte d'entrée gratuite, usage quotidien, acquisition | 5 |
| **Académique** | Production et vérification de documents académiques | 9 |
| **Business** | Production de documents et contenus professionnels | 5 |
| **Transversal** | Recherche d'emploi, accessible depuis n'importe quel pack | 2 |

Un outil — le Rédacteur de discours & pitchs — est partagé entre le Pack Académique (mode Pitch de soutenance) et le Pack Business (mode Pitch commercial), ce qui porte le total réel à vingt outils distincts pour vingt et une entrées de catalogue.

---

## 6. Description complète des 20 outils

### PACK INTRODUCTION

#### 1. Convertisseur de fichiers

**Description.** Convertit des documents entre les formats PDF, Word, Excel, PowerPoint et image, avec fusion et séparation de fichiers PDF incluses. C'est l'outil le plus universel de la plateforme : quasiment tout utilisateur, quel que soit son profil, en a besoin à un moment donné.

**Utilisateur cible.** Tous profils, sans exception.

**Entrée.** Un fichier source dans un format donné, et le format de sortie souhaité.

**Sortie.** Le fichier converti, prêt à télécharger, avec la mise en page et le contenu préservés autant que possible.

**Fonctionnement.** Contrairement à la majorité des outils de la plateforme, la conversion de fichiers ne nécessite quasiment aucun appel à un modèle de langage — elle repose sur des bibliothèques de traitement de documents déterministes. Le coût de traitement est donc quasiment nul, ce qui en fait l'outil idéal pour une offre gratuite et illimitée.

**Monétisation.** Gratuit et sans limite stricte, y compris pour un utilisateur non-abonné. Fonction d'acquisition : c'est souvent le premier outil qu'un nouvel utilisateur essaie, avant de découvrir le reste de la plateforme.

**Cas d'usage.** Un étudiant reçoit une attestation de stage scannée en PDF et doit la modifier — il la convertit en Word, l'édite, puis la reconvertit en PDF pour l'envoyer.

---

#### 2. Détecteur de contenu IA

**Description.** Analyse un texte fourni par l'utilisateur et estime la probabilité qu'il ait été généré par une intelligence artificielle, avec identification des passages les plus suspects.

**Utilisateur cible.** Étudiants avant la remise d'un travail, enseignants vérifiant des copies, recruteurs évaluant des candidatures, rédacteurs souhaitant vérifier leur propre production.

**Entrée.** Un texte collé directement ou un fichier (PDF, DOCX, TXT).

**Sortie.** Un score de probabilité de génération par IA exprimé en pourcentage, accompagné d'un surlignage des portions de texte les plus concernées.

**Fonctionnement.** Le score de détection est calculé et affiché gratuitement, sans restriction — c'est un outil à fort potentiel de partage et de viralité qui attire du trafic vers la plateforme. En revanche, l'action de réécriture proposée pour faire baisser ce score est un service distinct et payant.

**Monétisation.** Le score est gratuit et illimité. L'action « Réécrire dans un autre ton », qui reformule le texte pour en modifier la texture stylistique selon l'un des six tons disponibles (Convivial, Académique, Professionnel, Neutre, Persuasif, Formel/Soutenu), est réservée aux abonnés à partir du palier Goutte. Cette action est positionnée comme un service d'amélioration stylistique légitime plutôt que comme un outil de contournement de détection.

**Cas d'usage.** Un étudiant vérifie son propre mémoire avant remise, constate un score élevé sur l'introduction, et utilise la réécriture en ton académique pour retravailler le passage.

---

#### 3. Reformulateur / Correcteur

**Description.** Transforme un texte fourni par l'utilisateur selon différents modes : reformulation, correction grammaticale et orthographique, simplification, formalisation ou académisation, avec un choix de ton.

**Utilisateur cible.** Tous profils — c'est l'un des outils les plus utilisés au quotidien par les étudiants comme par les professionnels.

**Entrée.** Un texte, de la longueur d'une phrase à plusieurs paragraphes, et le mode de transformation souhaité.

**Sortie.** Le texte transformé, prêt à être copié ou réinjecté dans un document.

**Fonctionnement.** Chaque transformation est un appel unique, borné par la longueur du texte fourni — pas de fil de conversation, pas d'itération illimitée.

**Monétisation.** Un quota de mots gratuit est disponible chaque mois pour la correction et la reformulation de base. Le sélecteur de ton (les six tons) est une fonctionnalité payante, disponible dès le palier Goutte.

**Cas d'usage.** Un professionnel rédige un message important et souhaite vérifier sa grammaire, puis ajuster le ton pour le rendre plus persuasif avant de l'envoyer à un client.

---

#### 4. Rédacteur d'email pro

**Description.** Génère un email professionnel complet, prêt à copier-coller, à partir d'un contexte et d'un objectif fournis par l'utilisateur : relance de facture impayée, remerciement, refus poli, demande d'information, réponse à une réclamation.

**Utilisateur cible.** Indépendants, salariés, étudiants en recherche de stage ou d'emploi, gérants de PME.

**Entrée.** Le contexte de la situation, le destinataire, l'objectif de l'email et éventuellement le ton souhaité.

**Sortie.** Un email complet avec objet, formule d'introduction, corps du message et formule de politesse adaptée au contexte francophone professionnel.

**Fonctionnement.** Génération courte et bornée — la longueur d'un email reste naturellement limitée, ce qui en fait l'un des outils les moins coûteux de la plateforme malgré un usage quotidien intensif.

**Monétisation.** Quota de mots gratuit mensuel, comme le Reformulateur/Correcteur.

**Cas d'usage.** Une gérante de petite entreprise de transport doit relancer un client trois fois sans avoir reçu de paiement — elle génère un email de relance ferme mais courtois en quelques secondes.

---

#### 5. Chat IA généraliste

**Description.** Un espace de conversation libre avec l'intelligence artificielle pour toute question qui ne correspond pas à un outil spécialisé — c'est le seul point d'entrée « ouvert » de la plateforme, volontairement limité pour rester maîtrisable en coût.

**Utilisateur cible.** Tous profils, pour des besoins ponctuels ne justifiant pas un outil dédié.

**Entrée.** Un message libre.

**Sortie.** Une réponse conversationnelle.

**Fonctionnement.** Contrairement à l'ancien projet de Hub LLM qui proposait un accès illimité à plusieurs modèles avancés, ce chat est volontairement restreint : modèle économique par défaut, quota de messages ou de mots strict selon le palier d'abonnement, sans accès aux modèles les plus coûteux sauf sur les paliers supérieurs.

**Monétisation.** Quota de messages/mots par jour ou par mois selon le palier. Ce n'est pas l'outil central de la plateforme, mais un complément.

**Cas d'usage.** Un utilisateur a une question rapide sur une notion qu'il ne comprend pas, sans besoin d'un outil dédié.

---

### PACK ACADÉMIQUE

#### 6. Rédacteur de documents académiques longs

**Description.** L'outil phare du Pack Académique. Il permet de produire un rapport de stage, un mémoire ou une thèse complète, structurée, avec page de garde personnalisée, à travers un parcours guidé conversationnel plutôt qu'un simple formulaire. Le détail complet du parcours est décrit à la section 7 de ce document.

**Utilisateur cible.** Étudiants en fin de cycle, du BTS/DUT au doctorat.

**Entrée.** Le type de document, le domaine d'étude, le sujet ou la problématique (avec suggestions si l'utilisateur n'en a pas), les informations de mise en page.

**Sortie.** Un document complet structuré en sections, avec page de garde, remerciements, introduction, développement et conclusion, prêt à être exporté.

**Fonctionnement.** Le document est construit à partir d'un plan validé par l'utilisateur (généré par l'outil Plan/outline), puis rédigé soit intégralement d'un coup, soit section par section avec validation à chaque étape, selon le choix de l'utilisateur.

**Monétisation.** Génération et consultation à l'écran gratuites, avec un plafond anti-abus sur le nombre de générations. Le téléchargement du fichier final (Word ou PDF, avec mise en forme académique complète) est réservé aux abonnés à partir du palier Goutte.

**Cas d'usage.** Un étudiant en gestion doit rendre un mémoire de fin de licence sur un sujet qu'il n'a pas encore choisi — il sélectionne son domaine, obtient des suggestions de sujets, valide un plan, puis génère son document section par section en collaborant avec l'outil.

---

#### 7. Générateur de plan / outline

**Description.** Transforme un sujet en une structure détaillée — titres et sous-titres de sections, points à aborder dans chacune — sans encore rédiger le texte complet.

**Utilisateur cible.** Étudiants, mais aussi tout utilisateur du Pack Business souhaitant structurer un document avant de le rédiger.

**Entrée.** Un sujet ou une idée de départ, avec le type de document visé.

**Sortie.** Une structure hiérarchisée (parties, sous-parties) prête à être approuvée ou modifiée.

**Fonctionnement.** Génération courte et rapide — un seul appel bref au modèle de langage, ce qui en fait l'un des outils les moins coûteux malgré son rôle central : il sert de fondation à la quasi-totalité des rédacteurs de documents longs de la plateforme (documents académiques, document pro, présentations). Il existe à la fois comme outil autonome, accessible depuis le Pack Académique, et comme première étape intégrée automatiquement au sein du Rédacteur de document pro et du Rédacteur de documents académiques longs — un utilisateur du Pack Business y a donc accès en pratique dès qu'il utilise le Rédacteur de document pro, sans avoir besoin d'un accès séparé au Pack Académique.

**Monétisation.** Inclus dans le quota du Pack Académique ou Business selon le contexte d'utilisation.

**Cas d'usage.** Avant de rédiger son rapport d'activité, un gérant de PME génère d'abord un plan pour s'assurer de ne rien oublier, puis l'ajuste avant de lancer la rédaction complète.

---

#### 8. Vérificateur de plagiat

**Description.** Analyse un texte pour estimer le pourcentage de contenu potentiellement plagié, avec identification des passages concernés.

**Utilisateur cible.** Étudiants avant la remise d'un mémoire ou d'un devoir, enseignants, rédacteurs professionnels soucieux de l'originalité de leur contenu.

**Entrée.** Un texte ou un document complet.

**Sortie.** Un score de plagiat en pourcentage, avec surlignage des passages identifiés comme potentiellement copiés.

**Fonctionnement.** Le score est calculé et affiché gratuitement. L'action de correction — reformulation automatique des passages flaggés pour réduire le taux de similarité tout en conservant le sens — est un service payant distinct.

**Monétisation.** Score gratuit et illimité ; action « Corriger les passages détectés » réservée aux abonnés à partir du palier Goutte, avec le même sélecteur de six tons que le Détecteur de contenu IA.

**Cas d'usage.** Un étudiant a beaucoup cité une source dans sa revue de littérature ; le vérificateur identifie les passages trop proches de l'original et l'outil de correction les reformule pour rester dans les clous académiques.

---

#### 9. Générateur de citations bibliographiques

**Description.** Génère des citations bibliographiques correctement formatées selon les principales normes académiques (APA, MLA, Chicago) à partir des informations d'une source.

**Utilisateur cible.** Étudiants et chercheurs rédigeant un mémoire, une thèse ou un article nécessitant des références rigoureuses.

**Entrée.** Les informations d'une source (auteur, titre, année, éditeur, URL le cas échéant) ou un lien/DOI si disponible.

**Sortie.** La citation formatée dans le style demandé, prête à être insérée dans la bibliographie du document.

**Fonctionnement.** Traitement quasiment déterministe une fois les informations de la source identifiées — l'un des outils les plus légers en coût de la plateforme, malgré une forte valeur perçue pour l'utilisateur académique.

**Monétisation.** Inclus dans le Pack Académique.

**Cas d'usage.** Un étudiant en train de finaliser la bibliographie de son mémoire génère automatiquement chaque citation dans le style APA imposé par son établissement.

---

#### 10. Rédacteur de discours & pitchs

**Description.** Génère un texte destiné à être prononcé à voix haute, avec plusieurs modes selon le contexte : discours cérémoniel (mariage, hommage, allocution officielle, mot de bienvenue), pitch de soutenance (pour défendre un mémoire ou une thèse devant un jury, avec anticipation des questions probables), pitch commercial (vente, présentation de projet, levée de fonds) et prise de parole en public (conférence, réunion, discours d'ouverture).

**Utilisateur cible.** Étudiants préparant une soutenance (Pack Académique), entrepreneurs préparant un pitch commercial (Pack Business), et plus largement toute personne devant prendre la parole en public.

**Entrée.** Le mode souhaité, le contexte, la durée approximative visée, et pour le pitch de soutenance, le contenu du mémoire ou de la thèse à défendre.

**Sortie.** Un texte structuré pour l'oral (accroche, corps, conclusion), adapté à une lecture ou une mémorisation, et pour le mode soutenance, une anticipation des questions du jury avec des éléments de réponse.

**Fonctionnement.** Le mode Pitch de soutenance se connecte naturellement au Rédacteur de documents académiques longs — l'utilisateur qui vient de terminer son mémoire peut enchaîner directement sur la préparation de sa défense orale. Le mode Pitch commercial se connecte de la même manière au Générateur de présentation, pour produire le script oral qui accompagne les diapositives.

**Monétisation.** Inclus dans le Pack Académique (mode soutenance) et le Pack Business (mode commercial) — un seul et même outil, deux points d'entrée selon le pack.

**Cas d'usage.** Un étudiant vient de terminer la rédaction de son mémoire sur la logistique urbaine ; il génère ensuite son discours de soutenance avec anticipation des questions que le jury pourrait poser sur sa méthodologie.

---

#### 11. Chat sur document

**Description.** Permet d'uploader un fichier (PDF, DOCX, TXT) et de poser des questions sur son contenu, d'obtenir un résumé ou d'en extraire des données spécifiques.

**Utilisateur cible.** Étudiants souhaitant comprendre rapidement un support de cours ou un article scientifique, professionnels analysant un contrat ou un rapport reçu.

**Entrée.** Un fichier uploadé, puis une ou plusieurs questions à son sujet.

**Sortie.** Des réponses contextualisées au document, un résumé structuré, ou des données extraites.

**Fonctionnement.** Contrairement à un chatbot généraliste, cet outil est strictement borné au contenu du fichier fourni. Le nombre de questions posées sur un même document est plafonné selon le palier d'abonnement, ce qui évite qu'un usage se transforme en conversation ouverte et coûteuse.

**Monétisation.** Inclus dans le Pack Académique, avec un nombre de questions par document limité selon le palier.

**Cas d'usage.** Un étudiant reçoit un article scientifique de trente pages en anglais et souhaite en obtenir un résumé structuré en français avant son cours du lendemain.

---

#### 12. Assistant de recherche IA

**Description.** Un outil de recherche qui, à partir d'une question, produit une synthèse structurée avec des sources identifiées, plutôt qu'une simple réponse conversationnelle.

**Utilisateur cible.** Chercheurs, étudiants en phase de revue de littérature, journalistes, analystes.

**Entrée.** Une question ou un sujet de recherche.

**Sortie.** Une synthèse structurée de l'état des connaissances sur le sujet, avec indication des sources utilisées.

**Fonctionnement.** Volontairement borné : une requête produit une synthèse complète en une fois, plutôt qu'un fil de discussion qui s'étire. Pour approfondir, l'utilisateur reformule une nouvelle requête (comptée dans son quota) plutôt que d'enchaîner des tours gratuits illimités dans une même conversation.

**Monétisation.** Inclus dans le Pack Académique avec un nombre de recherches par mois limité selon le palier.

**Cas d'usage.** Un étudiant en début de rédaction de mémoire utilise l'assistant pour obtenir un premier panorama des travaux existants sur sa problématique avant de plonger dans les sources primaires.

---

#### 13. Traducteur multilingue

**Description.** Traduit un texte entre le français, l'anglais, et plusieurs langues locales d'Afrique de l'Ouest : le wolof, le dioula, le mooré et le bambara.

**Utilisateur cible.** Étudiants et chercheurs travaillant sur des sources en anglais, professionnels communiquant avec une clientèle locale dans sa langue, utilisateurs souhaitant produire du contenu accessible à un public non-francophone.

**Entrée.** Un texte source et la langue cible.

**Sortie.** Le texte traduit.

**Fonctionnement.** Traduction texte à texte, bornée par la longueur du texte fourni — pas de conversation, un traitement direct.

**Monétisation.** Inclus dans le Pack Académique, avec un quota de mots mensuel.

**Cas d'usage.** Un chercheur doit intégrer un extrait d'article anglophone dans son mémoire et le traduit fidèlement en français académique. Une commerçante souhaite adapter un message promotionnel en wolof pour sa clientèle locale.

---

#### 14. Générateur de fiches de révision / QCM

**Description.** À partir d'un cours ou d'un document fourni, génère des fiches de révision synthétiques et des questionnaires à choix multiples pour s'auto-évaluer.

**Utilisateur cible.** Étudiants en période de révision, particulièrement sollicité en période d'examens.

**Entrée.** Un cours ou un support de révision (texte ou fichier).

**Sortie.** Une fiche de révision structurée (points clés, définitions) et un QCM exportable avec corrigé.

**Fonctionnement.** Génération structurée bornée par la taille du document source.

**Monétisation.** Inclus dans le Pack Académique.

**Cas d'usage.** À l'approche d'un partiel, un étudiant transforme ses trente pages de notes de cours en une fiche de synthèse et un QCM de vingt questions pour tester sa mémorisation.

---

### PACK BUSINESS

#### 15. Rédacteur de document pro

**Description.** Génère des documents professionnels complets et formatés : offres commerciales, rapports d'activité, cahiers des charges, business plans, études de cas, analyses SWOT.

**Utilisateur cible.** Indépendants, gérants de PME, salariés devant produire des documents professionnels.

**Entrée.** Le type de document, le contexte, et idéalement un plan préalablement validé via le Générateur de plan.

**Sortie.** Un document complet, structuré, formaté professionnellement, prêt à être exporté et envoyé.

**Fonctionnement.** Comme pour le Rédacteur de documents académiques, la génération repose sur un plan préalable qui sert de squelette, ce qui améliore la cohérence du résultat et réduit le coût par rapport à une génération libre sans structure.

**Monétisation.** Génération et consultation gratuites à l'écran, téléchargement du fichier final réservé aux abonnés à partir du palier Goutte.

**Cas d'usage.** Une gérante de PME de transport doit produire son rapport d'activité annuel pour ses associés — elle génère d'abord un plan, le valide, puis obtient le document complet rédigé.

---

#### 16. Générateur de présentation (slides)

**Description.** Transforme un plan ou un texte en une présentation structurée, diapositive par diapositive, prête à être exportée.

**Utilisateur cible.** Étudiants préparant une soutenance, entrepreneurs préparant un pitch, professionnels préparant une réunion.

**Entrée.** Un plan ou un texte source, et le nombre approximatif de diapositives souhaité.

**Sortie.** Une présentation structurée avec titres de diapositives et contenu synthétisé par diapositive, exportable.

**Fonctionnement.** Génération bornée par la structure du plan fourni en entrée — le nombre de diapositives et leur contenu restent prévisibles.

**Monétisation.** Génération gratuite à l'écran, export du fichier de présentation réservé aux abonnés à partir de Goutte.

**Cas d'usage.** Un entrepreneur doit présenter son projet à des investisseurs la semaine suivante — il génère sa présentation à partir de son business plan déjà rédigé sur la plateforme, puis prépare le pitch oral qui l'accompagne avec le Rédacteur de discours & pitchs.

---

#### 17. Générateur de factures & devis en FCFA

**Description.** Génère des factures et devis conformes, en FCFA, à partir des informations du client et de la prestation.

**Utilisateur cible.** Indépendants et petites entreprises n'ayant pas de logiciel de facturation dédié.

**Entrée.** Les informations de l'entreprise émettrice, du client, le détail des prestations ou produits, les montants.

**Sortie.** Une facture ou un devis formaté professionnellement, avec les mentions attendues, prêt à être envoyé.

**Fonctionnement.** Génération quasi déterministe une fois les données saisies — l'un des outils les plus légers en coût, à forte utilité pratique récurrente pour les indépendants.

**Monétisation.** Génération gratuite à l'écran, téléchargement du document réservé aux abonnés à partir de Goutte.

**Cas d'usage.** Un consultant indépendant vient de terminer une mission et doit émettre sa facture le jour même pour respecter les délais de paiement convenus avec son client.

---

#### 18. Générateur de posts réseaux sociaux

**Description.** Génère des publications adaptées à différentes plateformes — Facebook, WhatsApp, Instagram — à partir d'un sujet ou d'une annonce à communiquer.

**Utilisateur cible.** Gérants de PME et indépendants ne disposant pas de community manager.

**Entrée.** Le sujet de la publication, la plateforme visée, et éventuellement le ton souhaité.

**Sortie.** Un texte de publication adapté au format et aux usages de la plateforme choisie, prêt à être copié-collé.

**Fonctionnement.** Génération courte, l'une des moins coûteuses de la plateforme malgré un usage potentiellement très fréquent.

**Monétisation.** Inclus dans le quota du Pack Business.

**Cas d'usage.** Une commerçante lance une promotion pour la fête des mères et génère en quelques secondes une annonce accrocheuse pour son statut WhatsApp Business et sa page Facebook.

---

### OUTILS TRANSVERSAUX

#### 19. Rédacteur de CV

**Description.** Construit un CV professionnel et structuré à partir des informations personnelles et de l'expérience du candidat, avec plusieurs modèles de mise en page.

**Utilisateur cible.** Étudiants en fin d'études cherchant leur premier emploi, professionnels en recherche d'un nouveau poste.

**Entrée.** Informations personnelles, formation, expériences professionnelles, compétences.

**Sortie.** Un CV formaté, optimisé pour la lisibilité, prêt à être imprimé ou envoyé.

**Fonctionnement.** Génération structurée à partir d'un formulaire guidé, avec choix de modèle visuel.

**Monétisation.** Génération et aperçu gratuits, téléchargement réservé aux abonnés à partir de Goutte.

**Cas d'usage.** Un étudiant finissant sa licence prépare son premier CV professionnel pour répondre à des offres de stage.

---

#### 20. Rédacteur de lettre de motivation

**Description.** Génère une lettre de motivation adaptée à un poste visé et au profil du candidat, compagnon naturel du Rédacteur de CV.

**Utilisateur cible.** Identique au Rédacteur de CV — souvent utilisés en tandem.

**Entrée.** Le poste visé, l'entreprise, le profil du candidat et éventuellement l'offre d'emploi elle-même.

**Sortie.** Une lettre de motivation structurée, adaptée au ton et au secteur visé.

**Fonctionnement.** Génération bornée par la structure classique d'une lettre de motivation (accroche, motivation, adéquation au poste, conclusion).

**Monétisation.** Génération et aperçu gratuits, téléchargement réservé aux abonnés à partir de Goutte.

**Cas d'usage.** Un candidat postule à plusieurs offres et génère une lettre adaptée à chacune en quelques minutes plutôt qu'en recommençant à chaque fois de zéro.

---

## 7. Le parcours guidé — Rédacteur de documents académiques longs

Le rapport de stage, le mémoire et la thèse sont regroupés dans un seul outil, avec un parcours conversationnel guidé en sept étapes plutôt qu'un formulaire unique, jugé trop intimidant pour un document aussi long et engageant.

**Étape 1 — Type de document.** L'utilisateur choisit entre Rapport de stage, Mémoire ou Thèse. Ce choix détermine le niveau d'exigence, la longueur cible et la rigueur des normes de citation appliquées par la suite.

**Étape 2 — Domaine d'étude.** L'utilisateur sélectionne son domaine (informatique, gestion, droit, santé, agronomie, sciences sociales, ingénierie, ou autre), ce qui oriente la suite du parcours et la pertinence des suggestions.

**Étape 3 — Sujet ou problématique.** L'utilisateur indique son sujet. S'il ne sait pas encore quoi choisir, il peut demander des suggestions : le système propose alors plusieurs pistes pertinentes selon son domaine, qu'il peut accepter ou faire régénérer.

**Étape 4 — Génération et validation du plan.** Le système génère un plan structuré, adapté à la profondeur du document choisi à l'étape 1 — un plan simple à trois ou quatre parties pour un rapport de stage, un plan à chapitres et sous-chapitres pour un mémoire ou une thèse. L'utilisateur peut l'approuver tel quel, modifier une section, ou le régénérer entièrement.

**Étape 5 — Choix du mode de rédaction.** Une fois le plan validé, l'utilisateur choisit entre une génération automatique complète du document, ou une génération section par section avec validation à chaque étape, offrant davantage de contrôle sur un document aussi engageant.

**Étape 6 — Informations de mise en page.** Le système recueille les informations nécessaires à la page de garde : nom, prénom, établissement, filière ou spécialité, promotion ou année académique, nom de l'encadreur ou directeur de mémoire, logo de l'établissement (optionnel), ville, pays, et date de soutenance si elle est connue.

**Étape 7 — Génération finale.** Le document complet est produit, visible intégralement à l'écran. Le téléchargement du fichier définitif, mis en forme selon les standards académiques, nécessite un abonnement actif à partir du palier Goutte.

---

## 8. Modèle de monétisation

Boulga applique trois logiques de monétisation distinctes selon la nature de chaque outil.

### Les rédacteurs de fichiers formatés

Concernent tous les outils qui produisent un document destiné à être téléchargé et utilisé tel quel : documents académiques, document pro, CV, lettre de motivation, présentations, factures et devis. Pour ces outils, la génération et la consultation du résultat à l'écran sont gratuites, avec un plafond raisonnable sur le nombre de générations pour éviter les abus. Le téléchargement du fichier final, avec sa mise en forme professionnelle complète, est réservé aux abonnés à partir du palier Goutte. Ce choix repose sur une observation simple : pour un document comme un CV ou un rapport, la mise en forme représente une part significative de la valeur perçue, et un utilisateur convaincu par la qualité du résultat affiché à l'écran sera naturellement incité à s'abonner pour obtenir le fichier.

### Les satellites à texte brut

Concernent les outils dont le résultat est un texte simple, sans mise en forme à débloquer : Reformulateur/Correcteur, Email pro, Chat IA, posts réseaux sociaux. Pour ces outils, le verrou par téléchargement n'a pas de sens puisque le texte affiché à l'écran constitue déjà la valeur complète. La monétisation repose donc sur un quota de mots gratuit renouvelé chaque mois, au-delà duquel un abonnement est nécessaire.

### Les outils de vérification

Concernent le Vérificateur de plagiat et le Détecteur de contenu IA. Le score ou le pourcentage calculé par ces outils est toujours visible gratuitement et sans restriction — cette gratuité entretient la viralité de ces outils et attire du trafic. En revanche, l'action de remédiation (corriger les passages plagiés, réécrire pour ajuster le style) est payante dès le palier Goutte, avec accès au sélecteur de six tons partagé entre plusieurs outils de la plateforme : Convivial, Académique, Professionnel, Neutre, Persuasif et Formel/Soutenu.

---

## 9. Grille tarifaire

| Palier | Prix mensuel | Prix annuel (-40%) | Contenu |
|---|---|---|---|
| **Introduction** | Gratuit | — | Pack Introduction complet, quota de mots limité |
| **Goutte** | 2 900 FCFA | 20 880 FCFA | Pack Introduction + un pack au choix (Académique ou Business), quota limité, déblocage des téléchargements |
| **Source** | 5 999 FCFA | 43 193 FCFA | Identique à Goutte, quota nettement plus généreux |
| **Fleuve** | 9 999 FCFA | 71 993 FCFA | Les deux packs (Académique et Business) débloqués simultanément |
| **Océan** | 29 999 FCFA | 215 993 FCFA | Accès illimité, multi-sièges, accès API — destiné aux chercheurs, agences de rédaction et entreprises |

**Modalités de paiement.** Le règlement s'effectue en une seule fois via FedaPay, sans mécanisme d'essai distinct — le palier Introduction, gratuit et sans limite de durée, remplit déjà cette fonction de découverte de la plateforme.

**Programme de parrainage.** Aucun programme de parrainage n'est prévu dans cette version du produit.

**Quotas précis.** Le nombre exact de mots gratuits sur le palier Introduction, ainsi que le nombre de générations et de téléchargements autorisés par outil et par palier payant, restent à définir précisément à partir de données réelles de coût par outil. Ces chiffres seront calibrés après une phase de mesure du coût réel de chaque outil en production.

---

## 10. Interface et expérience utilisateur

L'organisation en packs n'est pas qu'une logique de tarification : elle structure directement la navigation de l'application.

**La barre latérale.** Plutôt que d'afficher les vingt outils en permanence — ce qui rendrait la navigation illisible — la barre latérale se limite à un nombre restreint d'entrées : l'accueil, une page « Outils » présentant le catalogue complet sous forme de grille filtrable par pack et par catégorie, puis un nombre limité de raccourcis épinglés vers les outils à plus forte visibilité : **Chat IA généraliste** et **Assistant de recherche IA** en priorité — ce sont les points d'entrée les plus immédiatement compréhensibles pour un nouvel utilisateur, à l'image de ce que proposent les plateformes concurrentes étudiées — complétés par Reformulateur/Correcteur et Convertisseur de fichiers. Les rédacteurs à usage occasionnel (documents académiques, document pro, CV, présentations) ne sont volontairement pas épinglés : l'utilisateur les découvre via la page Outils, cohérent avec leur nature d'usage ponctuel à forte valeur plutôt que d'habitude quotidienne.

**La page Outils.** Chaque outil y est présenté sous forme de carte avec un intitulé clair, une description d'une phrase et une indication visuelle du pack auquel il appartient. Le tri par popularité et la recherche par nom permettent de retrouver rapidement un outil déjà connu.

**L'indicateur de quota.** Un compteur permanent, visible depuis n'importe quel outil, affiche la consommation restante par rapport au quota du palier d'abonnement. Pour les satellites à texte brut (Reformulateur/Correcteur, Email pro, Chat IA, posts réseaux sociaux, Traducteur), cette consommation est exprimée en nombre de mots ; pour les outils à action unitaire (Assistant de recherche IA, Chat sur document, générations de rédacteurs), elle est exprimée en nombre d'utilisations restantes. Dans tous les cas, l'unité affichée reste une grandeur compréhensible par l'utilisateur — jamais de terminologie technique liée aux jetons ou aux modèles de langage sous-jacents.

**L'onboarding.** À l'inscription, une question simple oriente l'utilisateur vers le pack le plus pertinent pour son profil : étudiant, chercheur, ou professionnel/entreprise. Cette question ne restreint pas l'accès — elle personnalise uniquement la mise en avant initiale des outils, l'utilisateur restant libre d'explorer l'ensemble du catalogue.

---

## 11. Décisions de positionnement et garde-fous

### Sur le chat ouvert

L'expérience du projet initial de Hub LLM a montré qu'un chat sans limite pouvait mettre en péril la viabilité économique de la plateforme. Le Chat IA généraliste et l'Assistant de recherche IA sont conservés parce qu'ils répondent à une attente réelle des utilisateurs et sont proposés par la quasi-totalité des plateformes concurrentes, mais leur usage est strictement borné par des quotas et, pour l'assistant de recherche, par une logique de synthèse en une seule fois plutôt que de conversation continue.

### Sur l'humaniseur de texte IA

La fonctionnalité de réécriture associée au Détecteur de contenu IA pourrait être perçue comme un outil de contournement des vérifications d'intégrité académique, ce qui entrerait en tension avec le positionnement sérieux de Boulga sur le marché académique. Ce risque est atténué en présentant cette fonctionnalité comme un service d'ajustement de ton et de style — les mêmes six tons appliqués également au Reformulateur/Correcteur et au Vérificateur de plagiat — plutôt que comme un outil de contournement explicite.

### Sur les documents juridiques

Le Rédacteur de contrats et documents juridiques simples, envisagé lors de la phase de conception, a été écarté de la première version en raison du risque de responsabilité associé à la génération de documents à portée légale sans validation par un professionnel du droit dans chaque juridiction concernée. Cette fonctionnalité pourra être réintroduite ultérieurement, encadrée par des clauses de non-responsabilité explicites et une revue juridique du contenu généré.

---

## 12. Feuille de route de construction

La construction des outils suit un ordre pensé pour maximiser la réutilisation technique et livrer de la valeur rapidement.

**Étape 1 — Le socle.** Générateur de plan/outline et Rédacteur de document pro, construits ensemble : le plan alimente directement le document, et cette paire établit le moteur de génération structurée réutilisable par la quasi-totalité des autres rédacteurs de la plateforme.

**Étape 2 — Satellites légers.** Reformulateur/Correcteur, Détecteur de contenu IA, Générateur de présentation. Des transformations de texte qui valident rapidement le moteur de base et apportent des gains de rétention et de visibilité rapides.

**Étape 3 — Business et fichiers.** Générateur de factures & devis, Générateur de posts réseaux sociaux, Rédacteur d'email pro, Vérificateur de plagiat, Chat sur document. Introduction de la gestion de fichiers uploadés et des cas d'usage professionnels.

**Étape 4 — Le reste.** Rédacteur de discours & pitchs, Rédacteur de documents académiques longs (avec son parcours guidé complet), Rédacteur de CV, Rédacteur de lettre de motivation, Convertisseur de fichiers. Les variations du moteur de document déjà éprouvé, avec le document académique traité en dernier compte tenu de sa complexité et de l'exigence de qualité qu'il impose.

Le Chat IA généraliste, l'Assistant de recherche IA, le Générateur de citations bibliographiques, le Traducteur multilingue et le Générateur de fiches de révision/QCM viennent compléter le Pack Académique après la stabilisation du socle technique.

---

## 13. Points restant à définir

- **Quotas précis** : nombre de mots gratuits par mois sur le palier Introduction, nombre de générations et de téléchargements autorisés par outil et par palier payant. À calibrer sur la base de mesures réelles de coût par outil une fois la plateforme en production.
- **Faisabilité technique FedaPay** : confirmation des capacités de l'intégration pour la facturation récurrente standard des abonnements mensuels et annuels.
- **Lettres de recommandation et attestations de travail** : outil mis de côté pour une version future, non prioritaire au lancement.
- **Rédacteur de contrats et documents juridiques** : à réintroduire ultérieurement avec un encadrement juridique approprié.

---

## 14. Glossaire

**Pack** — Regroupement thématique d'outils correspondant à un profil d'utilisateur (Introduction, Académique, Business). Détermine quels outils sont accessibles.

**Palier** — Niveau d'abonnement (Introduction, Goutte, Source, Fleuve, Océan). Détermine le prix, les packs inclus et le volume de quota disponible.

**Quota** — Volume d'usage autorisé, mesuré en mots consommés par mois, commun à l'ensemble des outils de la plateforme.

**Génération bornée** — Principe de conception selon lequel chaque outil produit une sortie de taille prévisible à partir d'un input défini, par opposition à une conversation ouverte de longueur illimitée.

**Rédacteur** — Catégorie d'outils produisant un document ou fichier formaté destiné à être téléchargé (documents académiques, document pro, CV, présentations, factures).

**Satellite** — Catégorie d'outils produisant un résultat en texte brut sans mise en forme à débloquer (Reformulateur/Correcteur, Email pro, posts réseaux sociaux).

**Outil transversal** — Outil accessible indépendamment du pack souscrit, en raison de son utilité pour plusieurs profils à la fois (CV, lettre de motivation).

**Parcours guidé** — Interaction conversationnelle en plusieurs étapes, utilisée spécifiquement pour le Rédacteur de documents académiques longs, par opposition à un formulaire unique.

**Sélecteur de ton** — Fonctionnalité payante permettant d'ajuster le style d'un texte selon six tons (Convivial, Académique, Professionnel, Neutre, Persuasif, Formel/Soutenu), partagée entre plusieurs outils.

---

*Boulga AI — le puits où l'on puise les outils dont on a besoin.*
*Document de référence produit — Version 1.0*
