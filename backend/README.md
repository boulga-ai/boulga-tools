# Boulga AI — Backend

FastAPI, Python 3.12.

## Lancer en local

```bash
python -m venv .venv
.venv\Scripts\activate      # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
cp .env.example .env         # puis renseigner les cles

uvicorn app.main:app --reload --port 8003
```

Verifier : `GET http://localhost:8003/health` -> `{"status": "ok"}`
