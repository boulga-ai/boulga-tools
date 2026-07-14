/**
 * Boulga AI — commandes de lancement en local.
 * Ce fichier est une note de reference (hors du projet Next.js, non compile/importe
 * nulle part) — a ouvrir dans l'editeur pour copier/coller les commandes.
 */

export const BACKEND_LAUNCH = `
cd backend
python -m venv .venv          # premiere fois seulement
.venv\\Scripts\\activate        # Windows
# source .venv/bin/activate   # macOS/Linux
pip install -r requirements.txt
cp .env.example .env          # puis renseigner les cles (Supabase, OpenRouter, Copyleaks)
uvicorn app.main:app --reload --port 8003
`;

export const FRONTEND_LAUNCH = `
cd frontend
npm install
cp .env.example .env.local    # puis renseigner NEXT_PUBLIC_SUPABASE_URL / ANON_KEY
npm run dev
`;

// Backend  -> http://localhost:8003/health  doit renvoyer {"status": "ok"}
// Frontend -> http://localhost:3000 (ou 3001 / 3002 si 3000 est deja pris)
