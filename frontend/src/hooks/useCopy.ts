"use client";

import { useCallback, useState } from "react";

function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  let succeeded = false;
  try {
    succeeded = document.execCommand("copy");
  } catch {
    succeeded = false;
  }
  document.body.removeChild(textarea);
  return succeeded;
}

/** Copie dans le presse-papiers, avec repli sur execCommand si l'API Clipboard est
 * indisponible (certains navigateurs mobiles / contextes non securises). Nettoie le
 * texte des separateurs techniques (ex. ---CORRECTIONS---) avant de copier. */
export function useCopy(resetDelayMs = 1500) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string) => {
      const cleaned = text.replace(/---CORRECTIONS---/g, "").trim();
      if (!cleaned) return;

      let succeeded = false;
      if (navigator.clipboard && window.isSecureContext) {
        try {
          await navigator.clipboard.writeText(cleaned);
          succeeded = true;
        } catch {
          succeeded = fallbackCopy(cleaned);
        }
      } else {
        succeeded = fallbackCopy(cleaned);
      }

      if (succeeded) {
        setCopied(true);
        setTimeout(() => setCopied(false), resetDelayMs);
      }
      return succeeded;
    },
    [resetDelayMs],
  );

  return { copied, copy };
}
