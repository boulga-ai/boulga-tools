import json
from collections.abc import AsyncIterator
from typing import Literal, TypedDict

import httpx

from app.config import settings

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# Prix de reference (USD / million de tokens, juillet 2026).
MODEL_PRICES: dict[str, dict[str, float]] = {
    "google/gemini-2.5-flash-lite": {"input": 0.10, "output": 0.40},
    "deepseek/deepseek-v4-flash": {"input": 0.14, "output": 0.28},
    "google/gemini-3.1-flash-lite": {"input": 0.25, "output": 1.50},
    "deepseek/deepseek-v4-pro": {"input": 0.44, "output": 0.87},
    "anthropic/claude-haiku-4.5": {"input": 1.00, "output": 5.00},
    "x-ai/grok-4.3": {"input": 1.25, "output": 2.50},
    "google/gemini-3.5-flash": {"input": 1.50, "output": 9.00},
    "x-ai/grok-4.5": {"input": 2.00, "output": 6.00},
    "openai/gpt-5.1-mini": {"input": 0.40, "output": 1.60},
    "anthropic/claude-sonnet-4.6": {"input": 3.00, "output": 15.00},
    "openai/gpt-5.1": {"input": 2.50, "output": 10.00},
    "anthropic/claude-opus-4.6": {"input": 5.00, "output": 25.00},
}


def compute_cost(model: str, tokens_in: int, tokens_out: int) -> float:
    """Cout en USD d'un appel, a partir de la table de prix. Modele inconnu -> 0.0
    (n'empeche jamais une reponse d'etre servie, mais a surveiller dans usage_logs)."""
    prices = MODEL_PRICES.get(model)
    if prices is None:
        return 0.0
    cost = (tokens_in / 1_000_000) * prices["input"] + (tokens_out / 1_000_000) * prices["output"]
    return round(cost, 6)


class DeltaChunk(TypedDict):
    type: Literal["delta"]
    text: str


class UsageChunk(TypedDict):
    type: Literal["usage"]
    tokens_in: int
    tokens_out: int


StreamChunk = DeltaChunk | UsageChunk


class OpenRouterError(Exception):
    pass


async def stream_completion(
    model: str,
    messages: list[dict],
    *,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    plugins: list[dict] | None = None,
) -> AsyncIterator[StreamChunk]:
    """Appelle OpenRouter en streaming et yield des deltas de texte, puis un chunk usage
    (tokens_in/tokens_out) une fois le flux termine. plugins active des extensions
    OpenRouter (ex. recherche web {"id": "web", "max_results": N}) - facturees en sus,
    voir https://openrouter.ai/docs/guides/features/plugins/web-search."""
    payload: dict = {
        "model": model,
        "messages": messages,
        "stream": True,
        "temperature": temperature,
        "stream_options": {"include_usage": True},
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    if plugins is not None:
        payload["plugins"] = plugins

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "HTTP-Referer": "https://boulga.ai",
        "X-Title": "Boulga AI",
    }

    try:
        async with httpx.AsyncClient(timeout=180) as client:
            async with client.stream(
                "POST", OPENROUTER_URL, json=payload, headers=headers
            ) as response:
                if response.status_code >= 400:
                    body = await response.aread()
                    raise OpenRouterError(
                        f"OpenRouter a renvoye {response.status_code} : {body.decode(errors='ignore')}"
                    )

                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data = line[len("data: ") :].strip()
                    if data == "[DONE]":
                        break

                    try:
                        chunk = json.loads(data)
                    except json.JSONDecodeError:
                        continue

                    usage = chunk.get("usage")
                    if usage:
                        yield {
                            "type": "usage",
                            "tokens_in": usage.get("prompt_tokens", 0),
                            "tokens_out": usage.get("completion_tokens", 0),
                        }

                    for choice in chunk.get("choices", []):
                        text = choice.get("delta", {}).get("content")
                        if text:
                            yield {"type": "delta", "text": text}
    except httpx.HTTPError as exc:
        raise OpenRouterError(f"OpenRouter injoignable : {exc}") from exc


async def complete_json(
    model: str, messages: list[dict], *, plugins: list[dict] | None = None
) -> tuple[dict, dict]:
    """Consomme un stream_completion en entier et parse le JSON produit. Tente une
    reparation simple (retrait des fences markdown, extraction du bloc {...} externe)
    avant d'abandonner. Renvoie (data, usage) ; usage = {tokens_in, tokens_out}."""
    full_text = ""
    usage = {"tokens_in": 0, "tokens_out": 0}

    async for chunk in stream_completion(model, messages, temperature=0.4, plugins=plugins):
        if chunk["type"] == "delta":
            full_text += chunk["text"]
        elif chunk["type"] == "usage":
            usage = {"tokens_in": chunk["tokens_in"], "tokens_out": chunk["tokens_out"]}

    text = full_text.strip()
    if text.startswith("```"):
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:]
        text = text.strip()

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        start, end = text.find("{"), text.rfind("}")
        if start == -1 or end == -1 or end < start:
            raise OpenRouterError("Reponse IA invalide (JSON malforme).")
        try:
            data = json.loads(text[start : end + 1])
        except json.JSONDecodeError as exc:
            raise OpenRouterError("Reponse IA invalide (JSON malforme).") from exc

    return data, usage


def cacheable_system_message(text: str) -> dict:
    """Construit un message systeme au format 'content parts' avec un marqueur
    cache_control (mecanisme de prompt caching explicite d'Anthropic, relaye par
    OpenRouter). Beneficie reellement du caching sur Claude ; sur les autres
    providers (Grok, Gemini, DeepSeek) le marqueur est ignore sans erreur — le
    contenu reste un message systeme valide, mais le gain de cout n'est PAS
    garanti hors Claude. Ne jamais presenter ce caching comme un acquis uniforme."""
    return {
        "role": "system",
        "content": [{"type": "text", "text": text, "cache_control": {"type": "ephemeral"}}],
    }


async def stream_blocks(model: str, messages: list[dict]) -> AsyncIterator[dict]:
    """Streame une completion et isole chaque ligne JSON complete (JSONL/NDJSON) des
    qu'elle est parsable, pour un effet 'le document se construit sous les yeux' sans
    avoir a parser du JSON partiel caractere par caractere. Yield des chunks
    {'type': 'block', 'data': dict} au fil de l'eau, puis un chunk usage en fin de
    flux. Une ligne qui n'est pas un bloc JSON valide est yield en
    {'type': 'text_line', 'text': str} plutot que d'etre supprimee silencieusement —
    utilise par la generation academique segmentee pour recuperer la ligne
    'SUMMARY: ...' de fin de segment (voir documents_engine.py). Les appelants qui
    n'utilisent que 'block'/'usage' ignorent naturellement ce type sans le traiter.
    Une fence markdown ou une ligne vide reste ignoree. La reparation fine des blocs
    vit dans document_engine.repair_block ; ce niveau-ci ne fait jamais planter le
    flux."""
    buffer = ""

    def _try_yield_line(line: str) -> dict | None:
        line = line.strip()
        if not line or line.startswith("```"):
            return None
        try:
            data = json.loads(line)
        except json.JSONDecodeError:
            return {"type": "text_line", "text": line}
        if isinstance(data, dict) and "type" in data:
            return {"type": "block", "data": data}
        return {"type": "text_line", "text": line}

    async for chunk in stream_completion(model, messages, temperature=0.5):
        if chunk["type"] == "delta":
            buffer += chunk["text"]
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                block_chunk = _try_yield_line(line)
                if block_chunk is not None:
                    yield block_chunk
        elif chunk["type"] == "usage":
            yield chunk

    block_chunk = _try_yield_line(buffer)
    if block_chunk is not None:
        yield block_chunk


async def complete_text(model: str, messages: list[dict]) -> tuple[str, dict]:
    """Consomme un stream_completion en entier et renvoie le texte brut (pas de parsing
    JSON) — utilise pour les appels courts hors streaming (ex. resume de section)."""
    full_text = ""
    usage = {"tokens_in": 0, "tokens_out": 0}

    async for chunk in stream_completion(model, messages, temperature=0.4):
        if chunk["type"] == "delta":
            full_text += chunk["text"]
        elif chunk["type"] == "usage":
            usage = {"tokens_in": chunk["tokens_in"], "tokens_out": chunk["tokens_out"]}

    return full_text.strip(), usage
