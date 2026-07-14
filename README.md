# Boulga AI

Plateforme de 13 outils IA de production documentaire academique et professionnelle pour
l'Afrique de l'Ouest francophone. « Puiser l'intelligence qu'il vous faut. »

## Lancer en local

Deux serveurs a lancer en parallele (deux terminaux).

### Backend (FastAPI, port 8003)

```bash
cd backend
python -m venv .venv          # premiere fois seulement
.venv\Scripts\activate         # Windows
# source .venv/bin/activate    # macOS/Linux
pip install -r requirements.txt
cp .env.example .env           # puis renseigner les cles (Supabase, OpenRouter, Copyleaks)
uvicorn app.main:app --reload --port 8003
```

Verifier : http://localhost:8003/health -> `{"status": "ok"}`

### Frontend (Next.js, port 3000)

```bash
cd frontend
npm install
cp .env.example .env.local     # puis renseigner NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
npm run dev
```

Ouvrir http://localhost:3000 (ou le premier port libre parmi 3000/3001/3002).

## Structure du projet

- `backend/` — API FastAPI (Python 3.12), voir `backend/README.md`
- `frontend/` — App Next.js 16 (App Router), voir `frontend/README.md`
- `backend/supabase/` — migrations SQL (schema, RLS, storage, quotas)
- `DEPLOYMENT.md` — deploiement Railway (backend) + Vercel (frontend)
- `TESTS_CHECKLIST.md` — checklist de validation complete

## Documentation projet

- `claudeboulga.md` — vision produit, personas, monetisation
- `Boulga_AI_Cahier_des_charges_Technique_V1.docx` — cahier des charges technique
- `Boulga_AI_20_Prompts_Claude_Code_V2.md` — les 20 prompts de construction
