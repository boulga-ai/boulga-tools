import re

_WORD_RE = re.compile(r"\S+")


def count_words(text: str) -> int:
    """Compte de mots simple (separateur : espaces) — c'est cette unite, jamais les
    tokens, qui est exposee a l'utilisateur pour les quotas."""
    if not text:
        return 0
    return len(_WORD_RE.findall(text))
