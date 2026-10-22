import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw, Settings2 } from 'lucide-react';
import { skillsData, type SkillNode } from '../../data/skills';
import { TechDetailBubble } from './TechDetailBubble';
import { createGraphLayout, graphBranchById, graphBranchColors, graphLinks, type GraphPoint } from './skillGraphLayout';
import { useSkillGraphPhysics } from './useSkillGraphPhysics';

const initialLayout = createGraphLayout();
const clampScale = (scale: number) => Math.max(0.55, Math.min(3.5, scale));
type Gesture = { id: string | null; x: number; y: number; distance: number };

export function SkillRelationGraph() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 1000, height: 620 });
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [hovered, setHovered] = useState<string | null>(null);
  const [selected, setSelected] = useState<SkillNode | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [showShared, setShowShared] = useState(true);
  const gesture = useRef<Gesture | null>(null);
  const pointers = useRef(new Map<number, GraphPoint>());
  const pinchDistance = useRef(0);
  const worldWidth = Math.max(620, size.width / size.height * 800);
  const graphRadius = Math.min(290, worldWidth / 2 - 100);

  const basePositions = useMemo(() => new Map(skillsData.map((node) => {
    const base = initialLayout.get(node.id)!;
    return [node.id, { x: base.x * graphRadius, y: base.y * graphRadius }];
  })), [graphRadius]);
  const physics = useSkillGraphPhysics(basePositions, graphRadius);
  const { positions } = physics;
  const visibleLinks = showShared ? graphLinks : graphLinks.filter((link) => !link.shared);
  const neighbors = useMemo(() => new Set(visibleLinks.flatMap((link) =>
    link.source === hovered ? [link.target] : link.target === hovered ? [link.source] : [],
  )), [hovered, visibleLinks]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: entry.contentRect.width, height: Math.max(1, entry.contentRect.height) });
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const openSkill = (event: WindowEventMap['galaxy-guide-open']) => {
      const action = event.detail.target.openAction;
      if (action?.type === 'select-skill') setSelected(skillsData.find((node) => node.id === action.value) ?? null);
    };
    window.addEventListener('galaxy-guide-open', openSkill);
    return () => window.removeEventListener('galaxy-guide-open', openSkill);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onWheel = (event: WheelEvent) => {
      // Controls keep their normal browser interaction.
      if (!(event.target instanceof Element) || !event.target.closest('svg')) return;
      event.preventDefault();
      const bounds = svgRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const factor = Math.max(worldWidth / bounds.width, 800 / bounds.height);
      const x = (event.clientX - bounds.left - bounds.width / 2) * factor;
      const y = (event.clientY - bounds.top - bounds.height / 2) * factor;
      setTransform((previous) => {
        const scale = clampScale(previous.scale * Math.exp(-event.deltaY * 0.0015));
        const ratio = scale / previous.scale;
        return { scale, x: x - (x - previous.x) * ratio, y: y - (y - previous.y) * ratio };
      });
    };
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, [worldWidth]);

  const zoom = (factor: number) => setTransform((previous) => {
    const scale = clampScale(previous.scale * factor);
    const ratio = scale / previous.scale;
    return { scale, x: previous.x * ratio, y: previous.y * ratio };
  });
  const reset = () => {
    physics.reset();
    setTransform({ x: 0, y: 0, scale: 1 });
    setHovered(null);
  };
  const endPointer = (event: React.PointerEvent<SVGSVGElement>, cancelled = false) => {
    const current = gesture.current;
    physics.endDrag();
    pointers.current.delete(event.pointerId);
    if (!cancelled && current?.id && current.distance < 5 && pinchDistance.current === 0) {
      setSelected(skillsData.find((node) => node.id === current.id) ?? null);
    }
    // End the whole gesture after a pinch, so releasing the last finger never clicks a node.
    gesture.current = null;
    if (pointers.current.size === 0) pinchDistance.current = 0;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  return (
    <div ref={containerRef} className="skill-relation-graph relative h-full w-full overflow-hidden" data-testid="skill-relation-graph">
      <div className="relation-graph-caption pointer-events-none absolute left-5 top-5 z-10">
        <span className="hud-kicker">KNOWLEDGE GRAPH</span>
        <p className="mt-1 text-[11px] text-gray-500">{skillsData.length} 个节点 · {visibleLinks.length} 条关联</p>
      </div>

      <div className="absolute right-4 top-4 z-20 flex flex-col gap-2">
        <button className="relation-graph-button" aria-label="关系图显示设置" aria-expanded={settingsOpen} aria-controls="relation-graph-settings" onClick={() => setSettingsOpen(!settingsOpen)}><Settings2 size={17} /></button>
        <button className="relation-graph-button" aria-label="重置关系图" title="重新排列并居中" onClick={reset}><RotateCcw size={16} /></button>
      </div>
      {settingsOpen && (
        <div id="relation-graph-settings" className="relation-graph-settings absolute right-16 top-4 z-30 rounded-2xl border border-white/10 p-4 text-xs text-gray-300 shadow-xl">
          <p className="mb-3 text-[10px] tracking-[0.18em] text-gray-500">显示设置</p>
          <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" checked={showLabels} onChange={(event) => setShowLabels(event.target.checked)} />节点名称</label>
          <label className="mt-3 flex cursor-pointer items-center gap-3"><input type="checkbox" checked={showShared} onChange={(event) => setShowShared(event.target.checked)} />同项目技术关联</label>
        </div>
      )}

      <svg ref={svgRef} className="h-full w-full touch-none select-none" viewBox={`${-worldWidth / 2} -400 ${worldWidth} 800`} aria-label="技术栈关系图，可拖动节点、平移和缩放" role="group"
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          const target = (event.target as Element).closest('[data-node-id]');
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          event.currentTarget.setPointerCapture(event.pointerId);
          if (pointers.current.size === 2) {
            const [a, b] = [...pointers.current.values()];
            pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
            gesture.current = null;
            physics.endDrag();
          } else {
            gesture.current = { id: target?.getAttribute('data-node-id') ?? null, x: event.clientX, y: event.clientY, distance: 0 };
            if (gesture.current.id) physics.beginDrag(gesture.current.id);
          }
        }}
        onPointerMove={(event) => {
          if (!pointers.current.has(event.pointerId)) return;
          pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (pointers.current.size >= 2) {
            const [a, b] = [...pointers.current.values()];
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            if (pinchDistance.current > 0) zoom(distance / pinchDistance.current);
            pinchDistance.current = distance;
            return;
          }
          const current = gesture.current;
          if (!current) return;
          const dx = event.clientX - current.x, dy = event.clientY - current.y;
          current.x = event.clientX; current.y = event.clientY;
          current.distance += Math.hypot(dx, dy);
          const bounds = event.currentTarget.getBoundingClientRect();
          const factor = Math.max(worldWidth / bounds.width, 800 / bounds.height);
          if (current.id) {
            physics.moveDrag(dx * factor / transform.scale, dy * factor / transform.scale);
          } else {
            setTransform((previous) => ({ ...previous, x: previous.x + dx * factor, y: previous.y + dy * factor }));
          }
        }}
        onPointerUp={(event) => endPointer(event)} onPointerCancel={(event) => endPointer(event, true)}
      >
        <defs>
          <filter id="relation-node-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3.5" />
          </filter>
        </defs>
        <g transform={`translate(${transform.x} ${transform.y}) scale(${transform.scale})`}>
          <g aria-hidden="true" className="pointer-events-none">
            {visibleLinks.map((link) => {
              const source = positions.get(link.source)!, target = positions.get(link.target)!;
              const active = hovered === link.source || hovered === link.target;
              return <line key={`${link.source}-${link.target}`} x1={source.x} y1={source.y} x2={target.x} y2={target.y}
                stroke={active ? '#bbcee9' : link.shared ? '#8493b3' : '#b3bed0'}
                strokeOpacity={hovered ? active ? 0.65 : 0.045 : link.shared ? 0.14 : 0.24}
                strokeWidth={active ? 1.2 : 0.7} vectorEffect="non-scaling-stroke"><title>{link.shared ? '同项目技术关联' : '技能分类关联'}</title></line>;
            })}
          </g>
          {skillsData.map((node) => {
            const point = positions.get(node.id)!;
            const branch = graphBranchById.get(node.id);
            const color = branch === undefined ? '#e1e3e8' : graphBranchColors[branch];
            const active = node.id === hovered;
            const radius = 4;
            const glowRadius = node.type === 'core' ? 18 : node.type === 'branch' ? 11 : 5;
            const dimmed = hovered !== null && !active && !neighbors.has(node.id);
            return (
              <g key={node.id} transform={`translate(${point.x} ${point.y})`} data-node-id={node.id} data-guide-id={`skill-${node.id}`}
                className="relation-graph-node" role="button" tabIndex={0} aria-label={`${node.name}，${node.status === 'learned' ? '已掌握' : node.status === 'learning' ? '学习中' : '计划学习'}`}
                onPointerEnter={() => !gesture.current && setHovered(node.id)} onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(node.id)} onBlur={() => setHovered(null)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelected(node); }
                }} style={{ opacity: dimmed ? 0.22 : 1 }}>
                <title>{node.zhName} · {node.description}</title>
                <circle r={Math.max(19, radius + 6)} fill="transparent" />
                <circle r={glowRadius * (active ? 1.25 : 1)} fill={color} fillOpacity={node.status === 'locked' ? 0.07 : 0.16} filter="url(#relation-node-glow)" className="pointer-events-none" />
                <circle className="relation-node-focus" r={glowRadius + 6} fill="none" stroke={color} strokeOpacity={active ? 0.35 : 0} strokeWidth={0.7} />
                <circle r={radius} fill={color} fillOpacity={node.status === 'locked' ? 0.28 : node.status === 'learning' ? 0.66 : 0.95} />
                {(showLabels || active) && <text y={radius + 18} textAnchor="middle" fill={active ? '#f0f4fc' : node.type === 'skill' ? '#b2bdd0' : '#dce3ef'} fontSize={node.type === 'core' ? 17 : node.type === 'branch' ? 15 : 12.5} fontWeight={node.type === 'core' ? 500 : 400} style={{ paintOrder: 'stroke', stroke: '#080c16', strokeWidth: 3, strokeLinejoin: 'round' }}>{node.type === 'skill' ? node.name : node.zhName}</text>}
              </g>
            );
          })}
        </g>
      </svg>

      <div className="relation-graph-legend pointer-events-none absolute bottom-5 left-5 right-24 z-10 flex flex-wrap gap-x-4 gap-y-2">
        {([{ label: '能力核心', glow: 10 }, { label: '技术分类', glow: 6 }, { label: '技能节点', glow: 2 }]).map(({ label, glow }) => <span key={label} className="flex items-center gap-2 text-[10px] text-gray-400"><span className="h-1 w-1 rounded-full bg-[#e0e5ff]" style={{ boxShadow: `0 0 ${glow}px ${glow / 3}px #e0e5ff66` }} />{label}</span>)}
      </div>
      <div className="absolute bottom-5 right-4 z-20 flex flex-col gap-2">
        <button className="relation-graph-button" aria-label="放大关系图" onClick={() => zoom(1.25)}><Plus size={17} /></button>
        <button className="relation-graph-button" aria-label="缩小关系图" onClick={() => zoom(0.8)}><Minus size={17} /></button>
      </div>
      <TechDetailBubble node={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
