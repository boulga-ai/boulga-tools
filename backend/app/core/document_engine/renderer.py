from collections.abc import Callable
from pathlib import Path

from pydantic import BaseModel

# Un template est un module qui appelle register_template(name, build) au chargement.
# build(content, output_dir) -> chemin du .docx produit. Le template ne touche QUE le
# design (styles, polices, couleurs, marges) — jamais le contenu, deja valide en amont.
TemplateBuilder = Callable[[BaseModel, Path], Path]

_registry: dict[str, TemplateBuilder] = {}


class RendererError(Exception):
    pass


def register_template(name: str, builder: TemplateBuilder) -> None:
    _registry[name] = builder


def available_templates() -> list[str]:
    return sorted(_registry.keys())


def render(content: BaseModel, template: str, output_dir: Path) -> Path:
    builder = _registry.get(template)
    if builder is None:
        raise RendererError(f"Template inconnu : {template}")
    return builder(content, output_dir)
