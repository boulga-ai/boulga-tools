export type OutlineNode = {
  id: string;
  title: string;
  level: number;
  children: OutlineNode[];
};

function mapTree(nodes: OutlineNode[], fn: (node: OutlineNode) => OutlineNode | null): OutlineNode[] {
  return nodes
    .map((node) => {
      const mapped = fn(node);
      if (mapped === null) return null;
      return { ...mapped, children: mapTree(mapped.children, fn) };
    })
    .filter((n): n is OutlineNode => n !== null);
}

export function updateTitle(tree: OutlineNode[], id: string, title: string): OutlineNode[] {
  return mapTree(tree, (node) => (node.id === id ? { ...node, title } : node));
}

export function removeNode(tree: OutlineNode[], id: string): OutlineNode[] {
  return mapTree(tree, (node) => (node.id === id ? null : node));
}

export function addChild(tree: OutlineNode[], parentId: string | null, newNode: OutlineNode): OutlineNode[] {
  if (parentId === null) return [...tree, newNode];
  return mapTree(tree, (node) =>
    node.id === parentId ? { ...node, children: [...node.children, newNode] } : node,
  );
}

function moveWithinSiblings(siblings: OutlineNode[], id: string, direction: -1 | 1): OutlineNode[] {
  const index = siblings.findIndex((n) => n.id === id);
  if (index === -1) return siblings;
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= siblings.length) return siblings;
  const next = [...siblings];
  [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
  return next;
}

export function moveNode(tree: OutlineNode[], id: string, direction: -1 | 1): OutlineNode[] {
  if (tree.some((n) => n.id === id)) {
    return moveWithinSiblings(tree, id, direction);
  }
  return tree.map((node) => ({
    ...node,
    children: node.children.some((c) => c.id === id)
      ? moveWithinSiblings(node.children, id, direction)
      : moveNode(node.children, id, direction),
  }));
}

let counter = 0;
export function newNodeId(): string {
  counter += 1;
  return `new-${Date.now()}-${counter}`;
}
