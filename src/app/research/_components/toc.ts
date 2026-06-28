// Pure (server-safe) table-of-contents helpers shared across whitepapers.

export interface TocNode {
  id: string;
  label: string;
  children?: TocNode[];
}

interface HeadingInput {
  num: string;
  title: string;
  id: string;
}

function depthOf(num: string): number {
  if (/^appendix/i.test(num)) return 1;
  const norm = num.replace(/(\.0)+$/, '');
  return norm.split('.').length;
}

function labelOf(num: string, title: string): string {
  const n = /^appendix/i.test(num) ? num : num.replace(/\.0$/, '');
  return `${n}  ${title}`;
}

/** Build a nested TOC tree from a flat, ordered list of numbered headings. */
export function buildToc(headings: HeadingInput[]): TocNode[] {
  const roots: TocNode[] = [];
  const stack: { depth: number; node: TocNode }[] = [];
  for (const h of headings) {
    const depth = depthOf(h.num);
    const node: TocNode = { id: h.id, label: labelOf(h.num, h.title) };
    while (stack.length && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length) {
      const parent = stack[stack.length - 1].node;
      (parent.children ??= []).push(node);
    } else {
      roots.push(node);
    }
    stack.push({ depth, node });
  }
  return roots;
}

export function flattenToc(nodes: TocNode[]): TocNode[] {
  return nodes.flatMap((n) => [n, ...(n.children ? flattenToc(n.children) : [])]);
}

/** Ids of every node that has children (used to expand all by default). */
export function collectParentIds(nodes: TocNode[]): string[] {
  return nodes.flatMap((n) =>
    n.children && n.children.length ? [n.id, ...collectParentIds(n.children)] : []
  );
}

/** Path of ancestor ids (excluding the target itself) leading to `id`. */
export function pathTo(nodes: TocNode[], id: string, trail: string[] = []): string[] | null {
  for (const n of nodes) {
    if (n.id === id) return trail;
    if (n.children) {
      const found = pathTo(n.children, id, [...trail, n.id]);
      if (found) return found;
    }
  }
  return null;
}
