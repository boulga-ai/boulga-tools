# Boulga AI — Déploiement

## 1. Supabase (base de données, auth, storage)

1. Créer un projet Supabase (dev et/ou prod).
2. Appliquer les migrations dans l'ordre (voir `backend/supabase/README.md`) :
   `0001_init.sql`, `0002_rls.sql`, `0003_storage.sql`, `0004_quota_functions.sql`.
3. Vérifier que les 3 buckets Storage existent : `uploads`, `generated`, `temp`.
4. Créer le compte `boulgacorporation@gmail.com` (email/mot de passe ou Google) — le trigger
   lui attribue automatiquement `role = 'admin'`.
5. Récupérer `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET` (si legacy) et
   la clé anonyme publique pour le frontend.

## 2. Backend — Railway

1. Nouveau projet Railway, déploiement depuis `backend/` (Dockerfile fourni : Python 3.12 +
   LibreOffice headless).
2. Variables d'environnement (voir `backend/.env.example`) :
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`
   - `OPENROUTER_API_KEY`
   - `COPYLEAKS_EMAIL`, `COPYLEAKS_API_KEY` (laisser vide = mode mock)
   - `ENV=production`, `PORT=8003`
   - `ALLOWED_ORIGINS=https://<domaine-vercel>,http://localhost:3000,http://localhost:3001,http://localhost:3002`
   - `ADMIN_EMAIL=boulgacorporation@gmail.com`
   - `LLM_ROUTING_JSON` (optionnel, surcharge la matrice de routage sans redéploiement)
   - `SOFFICE_BIN=soffice` (déjà default, inutile de le redéfinir sauf cas particulier)
3. Railway expose une URL publique HTTPS — c'est le `NEXT_PUBLIC_BACKEND_URL` du frontend.
4. Health check : `GET /health` doit répondre `{"status": "ok"}`.

## 3. Frontend — Vercel

1. Nouveau projet Vercel, déploiement depuis `frontend/` (Next.js 16, détection automatique,
   aucune configuration `vercel.json` nécessaire).
2. Variables d'environnement (voir `frontend/.env.example`) :
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_BACKEND_URL=https://<domaine-railway>`
3. Une fois le domaine Vercel connu, l'ajouter à `ALLOWED_ORIGINS` côté backend (étape 2) et
   redéployer le backend.

## 4. CORS

Le backend n'autorise que les origines listées dans `ALLOWED_ORIGINS` (voir `app/config.py`).
En prod, cette liste doit contenir le domaine Vercel définitif (et non un domaine de preview
temporaire, qui change à chaque déploiement — pour les previews, ajouter le domaine au fur et
à mesure ou utiliser un domaine de preview fixe si Vercel le permet).

## 5. Paiement (FedaPay)

Non branché en V1. Le webhook est en place (`app/api/webhooks/fedapay.py`, répond 501) mais
inactif. Les paliers sont attribués manuellement par l'admin via
`PATCH /api/v1/admin/users/{id}/tier` en attendant l'intégration V1.1.

## 6. Après déploiement

- Vérifier `/health` (backend) et la page d'accueil (frontend).
- Se connecter avec `boulgacorporation@gmail.com`, confirmer l'accès à `/admin`.
- Tester un outil gratuit de bout en bout (Convertisseur ou Reformulateur en palier
  Introduction).
- Suivre `TESTS_CHECKLIST.md` pour la validation complète des 13 outils.
- Surveiller `usage_logs` (dashboard `/admin/costs`) pour calibrer les quotas réels après les
  premiers jours d'usage — les limites actuelles (`app/core/quota.py::TIER_LIMITS`) sont
  provisoires.
