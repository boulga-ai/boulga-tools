// Genere et telecharge un rapport texte cote client — aucun appel backend necessaire,
// le contenu est deja disponible dans le resultat affiche.
export function downloadTextReport(filename: string, lines: string[]) {
  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
