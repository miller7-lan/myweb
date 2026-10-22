import { skillsData, type SkillNode } from '../../data/skills';

export type GraphPoint = { x: number; y: number };
export type GraphLink = { source: string; target: string; shared: boolean };

export const graphBranches = skillsData.filter((node) => node.type === 'branch');
// Pale mineral tones: category accents stay close to the site's cool whites.
export const graphBranchColors = [
  '#c7bfae', // Languages · sand
  '#afc6be', // AI · sage
  '#b7bfd2', // Desktop · slate blue
  '#afc3ca', // Backend · mist blue
  '#c2b7cc', // Frontend · muted lavender
  '#bac3b8', // Dev tools · stone green
] as const;
export const graphBranchById = new Map<string, number>();

function assignBranch(node: SkillNode, branch: number) {
  if (graphBranchById.has(node.id)) return;
  graphBranchById.set(node.id, branch);
  node.links.forEach((id) => {
    const child = skillsData.find((item) => item.id === id);
    if (child) assignBranch(child, branch);
  });
}
graphBranches.forEach(assignBranch);

// Keep the star map's hierarchy intact; derive extra graph edges only from
// projects explicitly shared by skills. No inferred proficiency or dependencies.
export const graphLinks: GraphLink[] = skillsData.flatMap((node) =>
  node.links.filter((id) => skillsData.some((item) => item.id === id))
    .map((target) => ({ source: node.id, target, shared: false })),
);
const edgeIds = new Set(graphLinks.map(({ source, target }) => [source, target].sort().join(':')));
skillsData.filter((node) => node.type === 'skill').forEach((node) => {
  const related = skillsData.filter((other) => other.type === 'skill' && other.id !== node.id
    && graphBranchById.get(other.id) !== graphBranchById.get(node.id))
    .map((other) => ({ other, count: other.relatedProjects?.filter((project) => node.relatedProjects?.includes(project)).length ?? 0 }))
    .filter(({ count }) => count > 0)
    .sort((a, b) => b.count - a.count || a.other.id.localeCompare(b.other.id)).slice(0, 2);
  related.forEach(({ other }) => {
    const key = [node.id, other.id].sort().join(':');
    if (edgeIds.has(key)) return;
    edgeIds.add(key);
    graphLinks.push({ source: node.id, target: other.id, shared: true });
  });
});

// Settle a deterministic initial layout. The interactive spring simulation
// starts from these readable positions and sleeps again after movement settles.
export function createGraphLayout(): Map<string, GraphPoint> {
  const nodes = skillsData.map((node, index) => ({
    id: node.id,
    x: Math.cos(index * 2.39996) * (80 + Math.sqrt(index) * 40),
    y: Math.sin(index * 2.39996) * (80 + Math.sqrt(index) * 40),
    vx: 0, vy: 0,
  }));
  const byId = new Map(nodes.map((node) => [node.id, node]));
  for (let step = 0; step < 320; step++) {
    const cooling = 1 - step / 360;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = b.x - a.x, dy = b.y - a.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const force = 2600 / (distance * distance);
        const fx = dx / distance * force, fy = dy / distance * force;
        a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
        // Reserve horizontal space for the always-visible labels.
        if (Math.abs(dy) < 34 && Math.abs(dx) < 150) {
          const push = (34 - Math.abs(dy)) * 0.035 * (dy < 0 ? -1 : 1);
          a.vy -= push; b.vy += push;
        }
      }
    }
    graphLinks.forEach((link) => {
      const a = byId.get(link.source)!, b = byId.get(link.target)!;
      const dx = b.x - a.x, dy = b.y - a.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const force = (distance - (link.shared ? 170 : 125)) * (link.shared ? 0.006 : 0.018);
      a.vx += dx / distance * force; a.vy += dy / distance * force;
      b.vx -= dx / distance * force; b.vy -= dy / distance * force;
    });
    nodes.forEach((node) => {
      node.vx = (node.vx - node.x * 0.003) * 0.72;
      node.vy = (node.vy - node.y * 0.003) * 0.72;
      node.x += node.vx * cooling; node.y += node.vy * cooling;
    });
  }
  const extentX = Math.max(...nodes.map((node) => Math.abs(node.x)), 1);
  const extentY = Math.max(...nodes.map((node) => Math.abs(node.y)), 1);
  return new Map(nodes.map((node) => [node.id, { x: node.x / extentX, y: node.y / extentY }]));
}
