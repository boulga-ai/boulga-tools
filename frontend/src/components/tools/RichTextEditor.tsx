"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { cn } from "@/lib/utils";

// Etape 3 du chantier UI : remplace le <Textarea> brut par un editeur riche, mais reste
// volontairement en semantique texte pur pour l'instant (onChange renvoie getText(), pas
// getHTML()) — le backend attend une chaine plate. Marks/blocs structurels (gras,
// titres, listes...) sont donc desactives : les proposer puis les faire disparaitre
// silencieusement au moment de la soumission serait trompeur. La pagination/mise en
// forme riche arrive a l'etape 4, une fois le contrat de contenu revu en consequence.
const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: false,
    bulletList: false,
    orderedList: false,
    listItem: false,
    blockquote: false,
    codeBlock: false,
    code: false,
    bold: false,
    italic: false,
    strike: false,
    horizontalRule: false,
  }),
];

export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const editor = useEditor({
    extensions: [...EDITOR_EXTENSIONS, Placeholder.configure({ placeholder })],
    content: value,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getText()),
    editorProps: {
      attributes: {
        class: "min-h-full text-sm leading-relaxed focus:outline-none whitespace-pre-wrap",
      },
    },
  });

  // Resynchronise seulement si la valeur externe diverge reellement de ce que l'editeur
  // affiche (reset apres soumission, choix d'un exemple cliquable, depot d'un fichier
  // qui vide le texte...) — sinon on ecraserait la position du curseur a chaque frappe.
  // emitUpdate: false est essentiel ici : setContent() declenche onUpdate par defaut,
  // ce qui rappellerait onChange() et donc, cote appelant, ecraserait un etat qui vient
  // d'etre pose au meme rendu (ex. un fichier tout juste selectionne se faisait
  // immediatement effacer par ce rebouclage).
  useEffect(() => {
    if (!editor) return;
    if (editor.getText() !== value) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  // Meme piege que setContent : setEditable() emet aussi un update par defaut
  // (emitUpdate=true), qui rappellerait onChange() a chaque bascule disabled/enabled
  // (ex. quand un fichier est selectionne, disabled passe a true) — false explicite
  // requis pour ne pas rappeler onChange() en dehors d'une vraie frappe utilisateur.
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [disabled, editor]);

  return (
    <div
      className={cn(
        "flex field-sizing-content min-h-32 w-full cursor-text overflow-y-auto rounded-lg border border-input bg-transparent px-2.5 py-2 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      onClick={() => editor?.commands.focus()}
    >
      <EditorContent editor={editor} className="w-full" />
    </div>
  );
}
