FROM python:3.12-slim

# LibreOffice headless (conversion Office <-> PDF) + polices de base pour un rendu correct.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    fonts-dejavu \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV SOFFICE_BIN=soffice \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8003

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003"]
