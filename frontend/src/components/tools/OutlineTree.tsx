"use client";

import { useState } from "react";
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { OutlineNode } from "@/lib/outline-tree";
import { addChild, moveNode, newNodeId, removeNode, updateTitle } from "@/lib/outline-tree";

function OutlineNodeRow({
  node,
  onUpdateTitle,
  onRemove,
  onAddChild,
  onMove,
}: {
  node: OutlineNode;
  onUpdateTitle: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.title);

  function commit() {
    setEditing(false);
    if (draft.trim()) onUpdateTitle(node.id, draft.trim());
    else setDraft(node.title);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="group flex items-center gap-1.5 rounded-[8px] px-2 py-1 hover:bg-accent">
        <div className="flex flex-col">
          <button onClick={() => onMove(node.id, -1)} className="text-muted-foreground hover:text-foreground">
            <ChevronUp className="size-3" />
          </button>
          <button onClick={() => onMove(node.id, 1)} className="text-muted-foreground hover:text-foreground">
            <ChevronDown className="size-3" />
          </button>
        </div>
        {editing ? (
          <Input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => e.key === "Enter" && commit()}
            className="h-7 flex-1"
          />
        ) : (
          <span
            onDoubleClick={() => setEditing(true)}
            className="flex-1 cursor-text py-1 text-sm"
            style={{ fontWeight: node.level === 1 ? 600 : 400 }}
          >
            {node.title}
          </span>
        )}
        <button
          onClick={() => onAddChild(node.id)}
          className="hidden text-muted-foreground hover:text-bleu-boulga group-hover:block"
          title="Ajouter une sous-section"
        >
          <Plus className="size-3.5" />
        </button>
        <button
          onClick={() => onRemove(node.id)}
          className="hidden text-muted-foreground hover:text-erreur group-hover:block"
          title="Supprimer"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      {node.children.length > 0 && (
        <div className="ml-5 flex flex-col gap-1 border-l pl-2">
          {node.children.map((child) => (
            <OutlineNodeRow
              key={child.id}
              node={child}
              onUpdateTitle={onUpdateTitle}
              onRemove={onRemove}
              onAddChild={onAddChild}
              onMove={onMove}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function OutlineTree({
  tree,
  onChange,
}: {
  tree: OutlineNode[];
  onChange: (tree: OutlineNode[]) => void;
}) {
  function findNode(nodes: OutlineNode[], id: string): OutlineNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      const found = findNode(node.children, id);
      if (found) return found;
    }
    return null;
  }

  function addChildAt(parentId: string) {
    const parent = findNode(tree, parentId);
    const newChild: OutlineNode = {
      id: newNodeId(),
      title: "Nouvelle section",
      level: (parent?.level ?? 0) + 1,
      children: [],
    };
    onChange(addChild(tree, parentId, newChild));
  }

  return (
    <div className="flex flex-col gap-2 rounded-[12px] border bg-card p-4">
      {tree.map((node) => (
        <OutlineNodeRow
          key={node.id}
          node={node}
          onUpdateTitle={(id, title) => onChange(updateTitle(tree, id, title))}
          onRemove={(id) => onChange(removeNode(tree, id))}
          onAddChild={addChildAt}
          onMove={(id, direction) => onChange(moveNode(tree, id, direction))}
        />
      ))}
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => onChange([...tree, { id: newNodeId(), title: "Nouvelle section", level: 1, children: [] }])}
      >
        <Plus className="size-3.5" /> Ajouter une section
      </Button>
    </div>
  );
}
