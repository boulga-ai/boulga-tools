# Boulga AI — Checklist de tests V1

## Authentification
- [ ] Inscription email + mot de passe (nom, téléphone collectés)
- [ ] Connexion email + mot de passe
- [ ] Connexion Google OAuth
- [ ] Session persistante après rafraîchissement de page
- [ ] Déconnexion
- [ ] Redirection vers `/login` si non connecté sur une route `(dashboard)`
- [ ] `boulgacorporation@gmail.com` obtient `role=admin` et accède à `/admin`
- [ ] Un compte non-admin obtient 403 sur `/api/v1/admin/*`

## Quotas
- [ ] `GET /api/v1/quota` renvoie les bons soldes du mois courant
- [ ] Un appel LLM décrémente `words_used` uniquement en fin de génération
- [ ] Quota mots épuisé → 402 avec message clair, palier Introduction
- [ ] Téléchargement de document décrémente `downloads_used`
- [ ] Régénération d'un document (autre template/format) décrémente `downloads` mais PAS `words`
- [ ] CV / Lettre / Doc pro / Académique : la génération à l'écran est gratuite (pas de
      décrément de `words_used`)

## Pack Introduction (gratuit, 5 000 mots/mois)
- [ ] Convertisseur de fichiers (gratuit, illimité, hors quota)
- [ ] Détecteur de contenu IA — score gratuit
- [ ] Réécriture IA — bloquée (badge palier Goutte), débloquée dès Goutte
- [ ] Reformulateur / Correcteur — sélecteur de ton désactivé
- [ ] Rédacteur d'email pro
- [ ] Chat IA généraliste — historique de conversations
- [ ] Posts réseaux sociaux — 6 plateformes
- [ ] Discours et pitchs — bloqué (badge palier Goutte)
- [ ] CV / Lettre / Plan / Doc pro / Académique — bloqués (badge palier Goutte)

## Pack Rédaction + Business (palier Goutte+)
- [ ] Sélecteur de ton actif sur Reformulateur
- [ ] Réécriture IA (Détecteur) et correction (Plagiat) accessibles
- [ ] Discours et pitchs accessible, durée estimée affichée
- [ ] Vérificateur de plagiat — soumission, polling, passages surlignés + sources

## Documents avancés (palier Goutte+)
- [ ] CV — formulaire, Analyser, Générer, aperçu, 2 templates, PDF et Word
- [ ] Lettre de motivation — Importer depuis mon CV pré-remplit les champs
- [ ] Générateur de plan — arborescence éditable, envoi vers Doc pro / Académique
- [ ] Document professionnel — plan importé ou saisi, 8 types de documents
- [ ] Document académique — parcours 7 étapes complet :
  - [ ] Étape 1-3 : type, domaine, sujet (+ suggestions)
  - [ ] Étape 4 : plan généré et édité
  - [ ] Étape 5 : génération section par section, statuts (à faire/généré/validé)
  - [ ] Modifier un titre de section dans le plan après génération → section repasse "à revoir"
  - [ ] Étape 6 : relecture, compteur de mots total
  - [ ] Étape 7 : export (2 templates, PDF/Word), message de félicitations
  - [ ] Fermer l'onglet en cours de route et revenir → reprise à la bonne étape

## Dashboard admin
- [ ] KPIs : utilisateurs, coûts (jour/semaine/mois), Claude vs autres modèles, volumes
- [ ] Liste utilisateurs : recherche, pagination
- [ ] Détail utilisateur : quotas, 50 derniers usage_logs
- [ ] Changement de palier manuel → quotas du mois mis à jour immédiatement
- [ ] Réinitialisation de quota
- [ ] Page coûts : filtre 7j/30j/90j, tri, total

## Documents et Paramètres
- [ ] Page Documents : historique, filtre par outil, télécharger, régénérer, supprimer
- [ ] Paramètres > Profil : modifier nom/téléphone, changer mot de passe
- [ ] Paramètres > Abonnement : palier actuel visible, comparatif des paliers
- [ ] Paramètres > Quotas : progress bar du mois, historique 6 mois
- [ ] Suppression de compte : confirmation, déconnexion, données supprimées

## Responsive
- [ ] Sidebar → drawer sous 768px sur toutes les pages du dashboard
- [ ] Chat : liste de conversations en Sheet sur mobile
- [ ] Document académique : stepper compact vertical sur mobile
- [ ] Tableaux (coûts, utilisateurs) : scroll horizontal sans casser la mise en page
- [ ] Formulaires (CV, doc pro) : une colonne sur mobile

## Sécurité
- [ ] Aucune clé API (OpenRouter, Copyleaks, service_role) visible côté client (DevTools réseau)
- [ ] URL de téléchargement expire après 15 min
- [ ] Rate limiting : 11 appels rapides sur un endpoint LLM → 429
- [ ] Upload > 25 Mo rejeté proprement
- [ ] Extension de fichier non supportée rejetée proprement

## Infrastructure
- [ ] `GET /health` répond 200 en prod
- [ ] Conversion DOCX → PDF fonctionne en prod (LibreOffice présent dans le conteneur)
- [ ] CORS : le domaine Vercel prod est bien dans `ALLOWED_ORIGINS`
