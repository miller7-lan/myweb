import React, { useEffect, useRef, useState, useMemo } from 'react';
import gsap from 'gsap';
import { skillsData, type SkillNode } from '../../data/skills';
import { SkillNodeTooltip } from './SkillNodeTooltip';
import { TechDetailBubble } from './TechDetailBubble';

export const SkillConstellation: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<SkillNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const selectedNodeRef = useRef<SkillNode | null>(null);
  
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // Map Pan & Zoom state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const dragDistance = useRef(0);

  const links = useMemo(() => {
    const linesArr: { id: string; source: SkillNode; target: SkillNode; isMainBranch: boolean; isGuide: boolean }[] = [];
    skillsData.forEach(node => {
      node.links.forEach(linkId => {
        const target = skillsData.find(n => n.id === linkId);
        if (target) {
          linesArr.push({
            id: `${node.id}-${target.id}`,
            source: node,
            target: target,
            isMainBranch: node.id === 'core',
            isGuide: target.type === 'skill' && target.status !== 'learned'
          });
        }
      });
    });
    return linesArr;
  }, []);

  const adjacencyMap = useMemo(() => {
    const map = new Map<string, Set<string>>();
    skillsData.forEach(node => map.set(node.id, new Set()));
    links.forEach(link => {
      map.get(link.source.id)?.add(link.target.id);
      map.get(link.target.id)?.add(link.source.id);
    });
    return map;
  }, [links]);

  const getBranchId = (nodeId: string): string | null => {
    if (nodeId === 'core') return null;
    const node = skillsData.find(n => n.id === nodeId);
    if (!node) return null;
    if (node.type === 'branch') return node.id;
    
    let currentId = nodeId;
    for (let i=0; i<10; i++) {
      const parentLink = links.find(l => l.target.id === currentId);
      if (!parentLink) break;
      if (parentLink.source.type === 'branch') return parentLink.source.id;
      currentId = parentLink.source.id;
    }
    return null;
  };

  const activeNode = selectedNode || hoveredNode;
  const activeBranchId = activeNode ? getBranchId(activeNode.id) : null;

  // Constellation geometry note:
  // Learned skills use solid "star map" lines. Learning / locked skills use guide lines
  // that stop before the actual node, so the visual reads as "outer point moving inward"
  // instead of a line crossing through the point. Keep guide lines out of the draw-on
  // stroke animation below; GSAP's strokeDasharray would otherwise overwrite the real
  // SVG dash pattern and make dashed guides look solid.
  const createPath = (x1: number, y1: number, x2: number, y2: number, isMainBranch: boolean) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return `M ${x1} ${y1} L ${x2} ${y2}`;

    const offset = dist * (isMainBranch ? 0.055 : 0.14); 
    const nx = -dy / dist;
    const ny = dx / dist;
    const cx = x1 + dx * 0.5 + nx * offset;
    const cy = y1 + dy * 0.5 + ny * offset;
    return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;
  };

  const getGuideEndPoint = (target: SkillNode) => {
    const radius = Math.sqrt(target.x * target.x + target.y * target.y);
    if (radius === 0) return { x: target.x, y: target.y };

    // The dashed guide's farthest point from the center is the learning node's
    // closest breathing position, not the node center. This preserves the
    // "from outside inward to the intersection" direction the layout depends on.
    const guideRadius = Math.max(160, radius - 28);
    const ratio = guideRadius / radius;
    return {
      x: target.x * ratio,
      y: target.y * ratio,
    };
  };

  // Wheel Zoom Listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (selectedNodeRef.current) return;

      const zoomSensitivity = 0.002;
      const delta = -e.deltaY * zoomSensitivity;
      
      setTransform(prev => {
        let newScale = prev.scale * Math.exp(delta);
        newScale = Math.max(0.75, Math.min(newScale, 2.2));
        
        // Scale from center approach
        const scaleRatio = newScale / prev.scale;
        return {
          x: prev.x * scaleRatio,
          y: prev.y * scaleRatio,
          scale: newScale
        };
      });
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (selectedNodeRef.current) return;

    isDragging.current = true;
    dragDistance.current = 0;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grabbing';
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (selectedNodeRef.current) return;

    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    if (!isDragging.current) return;

    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    dragDistance.current += Math.abs(dx) + Math.abs(dy);
    
    lastMouse.current = { x: e.clientX, y: e.clientY };

    setTransform(prev => ({
      ...prev,
      x: prev.x + dx,
      y: prev.y + dy
    }));
  };

  const handlePointerUp = () => {
    if (selectedNodeRef.current) return;

    isDragging.current = false;
    if (containerRef.current) {
      containerRef.current.style.cursor = 'grab';
    }
  };

  const handleZoomIn = () => setTransform(p => ({ ...p, scale: Math.min(p.scale * 1.25, 2.2), x: p.x * 1.25, y: p.y * 1.25 }));
  const handleZoomOut = () => setTransform(p => ({ ...p, scale: Math.max(p.scale / 1.25, 0.75), x: p.x / 1.25, y: p.y / 1.25 }));
  const handleReset = () => setTransform({ x: 0, y: 0, scale: 1 });

  // GSAP Animations
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('.path-draw', { strokeDasharray: 800, strokeDashoffset: 800, opacity: 0 });
      gsap.set('.path-guide', { strokeDashoffset: 0, opacity: 0 });
      gsap.set('.node-core', { scale: 0, opacity: 0 });
      gsap.set('.node-branch', { scale: 0, opacity: 0 });
      gsap.set('.node-skill-learned', { scale: 0, opacity: 0 });
      gsap.set('.node-skill-learning', { scale: 0, opacity: 0 });
      gsap.set('.node-skill-locked', { scale: 0, opacity: 0 });
      gsap.set('.branch-label', { opacity: 0, y: 5 });
      
      const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

      tl.to('.node-core', { scale: 1, opacity: 1, duration: 1 }, 0.4);
      tl.to('.path-main', { strokeDashoffset: 0, opacity: 1, duration: 1.2, stagger: 0.1 }, 0.6);
      tl.to('.node-branch', { scale: 1, opacity: 1, duration: 0.8, stagger: 0.1 }, 1.0);
      tl.to('.branch-label', { opacity: 0.6, y: 0, duration: 0.8, stagger: 0.1 }, 1.0);
      tl.to('.path-sub.path-draw', { strokeDashoffset: 0, opacity: 1, duration: 1.5, stagger: 0.05 }, 1.2);
      tl.to('.path-guide', { opacity: 1, duration: 1.0, stagger: 0.04 }, 1.35);
      tl.to('.node-skill-learned', { scale: 1, opacity: 1, duration: 0.8, stagger: 0.05 }, 1.4);
      tl.to('.node-skill-learning', { scale: 1, opacity: 1, duration: 0.8, stagger: 0.05 }, 1.7);
      tl.to('.node-skill-locked', { scale: 1, opacity: 0.5, duration: 1.0, stagger: 0.05 }, 2.0);

      gsap.to('.inner-circle-learning', {
        scale: 1.1, opacity: 0.48, duration: 2.8, yoyo: true, repeat: -1, ease: "sine.inOut"
      });
      gsap.to('.inner-circle-core', {
        scale: 1.05, opacity: 0.72, duration: 3.6, yoyo: true, repeat: -1, ease: "sine.inOut"
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-full bg-transparent overflow-hidden touch-none select-none cursor-grab"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Zoom Controls */}
      <div className={`absolute bottom-6 right-6 z-20 flex flex-col space-y-2 transition-opacity duration-300 ${selectedNode ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        <button onClick={handleZoomIn} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#101016]/80 border border-white/10 text-gray-400 hover:text-white hover:bg-[#1a1a24] transition-all backdrop-blur-md shadow-lg pointer-events-auto active:scale-95 text-lg font-light">+</button>
        <button onClick={handleZoomOut} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#101016]/80 border border-white/10 text-gray-400 hover:text-white hover:bg-[#1a1a24] transition-all backdrop-blur-md shadow-lg pointer-events-auto active:scale-95 text-lg font-light">-</button>
        <button onClick={handleReset} className="px-3 h-8 flex items-center justify-center rounded-full bg-[#101016]/80 border border-white/10 text-gray-400 hover:text-white hover:bg-[#1a1a24] transition-all backdrop-blur-md shadow-lg pointer-events-auto active:scale-95 text-[10px] tracking-widest uppercase">Reset</button>
      </div>

      <div 
        className="w-full h-full origin-center transition-transform duration-75 ease-linear pointer-events-none"
        style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
      >
        <svg 
          className="w-full h-full pointer-events-auto"
          viewBox="-450 -400 900 800"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <filter id="glow-core" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-learned" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-learning" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-hover" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          <g className="pointer-events-none">
            <circle cx="0" cy="0" r="150" fill="radial-gradient(circle, rgba(220,230,255,0.03) 0%, rgba(2,2,4,0) 70%)" />
            <circle cx="0" cy="0" r="130" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1" strokeDasharray="4 8" />
            <circle cx="0" cy="0" r="280" fill="none" stroke="rgba(255,255,255,0.015)" strokeWidth="1" strokeDasharray="2 12" />
          </g>

          {links.map((link) => {
            const isHovered = activeNode && (link.source.id === activeNode.id || link.target.id === activeNode.id);
            const linkBranchId = getBranchId(link.target.id) || link.target.id;
            
            let opacity = 1;
            if (activeNode && activeNode.id !== 'core') {
              if (linkBranchId !== activeBranchId) opacity = 0.15;
            }

            const bothLearned = link.source.status === 'learned' && link.target.status === 'learned';
            const anyLocked = link.source.status === 'locked' || link.target.status === 'locked';
            const isMain = link.isMainBranch;
            const isGuide = link.isGuide;
            
            let strokeColor;
            let strokeWidth = isMain ? 1.5 : 1;
            let strokeDasharray = "none";

            if (isGuide) {
              strokeColor = isHovered ? "rgba(190, 210, 255, 0.68)" : "rgba(160, 185, 245, 0.34)";
              strokeWidth = isHovered ? 1.35 : 0.95;
              strokeDasharray = "3 6";
            } else if (isHovered) {
              strokeColor = "rgba(220, 230, 255, 0.8)";
              strokeWidth = isMain ? 2 : 1.5;
            } else if (bothLearned) {
              strokeColor = "rgba(220, 230, 255, 0.4)";
            } else if (anyLocked) {
              strokeColor = "rgba(100, 100, 110, 0.2)";
              strokeDasharray = "4 4";
            } else {
              strokeColor = "rgba(160, 190, 255, 0.18)";
            }

            const guideEndPoint = isGuide ? getGuideEndPoint(link.target) : link.target;

            return (
              <path
                key={link.id}
                d={createPath(link.source.x, link.source.y, guideEndPoint.x, guideEndPoint.y, isMain)}
                className={`constellation-path transition-all duration-300 ${isMain ? 'path-main' : 'path-sub'} ${isGuide ? 'path-guide' : 'path-draw'}`}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                strokeDasharray={strokeDasharray}
                fill="none"
                style={{ opacity }}
              />
            );
          })}

          {skillsData.map((node) => {
            const isHovered = activeNode?.id === node.id;
            const isAdjacent = activeNode ? adjacencyMap.get(activeNode.id)?.has(node.id) : false;
            const nodeBranchId = getBranchId(node.id) || node.id;
            
            let groupOpacity = 1;
            if (activeNode && activeNode.id !== 'core' && node.id !== 'core') {
              if (nodeBranchId !== activeBranchId) groupOpacity = 0.2;
            }

            let fill;
            let r;
            let filter = "";
            const outerClass = `constellation-node node-${node.type === 'skill' ? 'skill-' + node.status : node.type} cursor-pointer`;
            let innerClass = "transition-all duration-300";

            if (node.type === 'core') {
              r = 10; 
              fill = "#ffffff";
              filter = "url(#glow-core)";
              innerClass += " inner-circle-core";
            } else if (node.type === 'branch') {
              r = 6.5;
              fill = "#e8edff";
              filter = isHovered ? "url(#glow-hover)" : "url(#glow-learned)";
            } else if (node.status === 'learned') {
              r = 4.5;
              fill = "#e0e5ff";
              filter = isHovered ? "url(#glow-hover)" : "url(#glow-learned)";
            } else if (node.status === 'learning') {
              r = 3.5;
              fill = "#a0c0ff";
              filter = isHovered ? "url(#glow-hover)" : "url(#glow-learning)";
              innerClass += " inner-circle-learning";
            } else {
              r = 3;
              fill = "#5a5a66";
              if (isHovered) filter = "url(#glow-learning)";
            }

            if (isHovered && node.type !== 'core') {
              r *= 1.3;
            } else if (isAdjacent && node.type !== 'core') {
              r *= 1.15;
              if (node.status === 'locked') fill = "#8a8a99";
              else fill = "#ffffff";
            }

            const labelMagnitude = Math.max(Math.sqrt(node.x * node.x + node.y * node.y), 1);
            const labelX = node.x + (node.x / labelMagnitude) * 34;
            const labelY = node.y + (node.y / labelMagnitude) * 20 - 5;
            const labelAnchor = node.x > 0 ? "start" : "end";

            return (
              <g
                key={node.id}
                className={outerClass}
                onMouseEnter={() => !selectedNode && setHoveredNode(node)}
                onMouseLeave={() => !selectedNode && setHoveredNode(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (dragDistance.current < 5) {
                    setSelectedNode(node);
                    setHoveredNode(null);
                  }
                }}
                style={{ transformOrigin: `${node.x}px ${node.y}px`, opacity: groupOpacity }}
              >
                <circle cx={node.x} cy={node.y} r={20} fill="transparent" />
                
                {node.type === 'core' && (
                  <circle cx={node.x} cy={node.y} r={20} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" strokeDasharray="1 6" className="animate-[spin_20s_linear_infinite] origin-center" />
                )}
                
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={r}
                  fill={fill}
                  filter={filter}
                  className={innerClass}
                  style={{ transformOrigin: `${node.x}px ${node.y}px` }}
                />

                {node.type === 'branch' && (
                  <text
                    x={labelX}
                    y={labelY}
                    textAnchor={labelAnchor}
                    className="branch-label fill-gray-100 text-[10px] uppercase tracking-[0.2em] font-light pointer-events-none transition-opacity duration-300"
                    style={{
                      opacity: (transform.scale < 0.85 && !isHovered) ? 0.55 : (isHovered ? 1 : 0.88),
                      paintOrder: 'stroke',
                      stroke: 'rgba(0,0,0,0.82)',
                      strokeWidth: 2.2,
                      filter: 'drop-shadow(0 0 8px rgba(220,230,255,0.18))',
                    }}
                  >
                    {node.name}
                    <tspan x={labelX} dy="14" className="fill-gray-300 text-[9px] tracking-widest">{node.zhName}</tspan>
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      
      <SkillNodeTooltip 
        node={selectedNode ? null : hoveredNode} 
        x={mousePos.x} 
        y={mousePos.y} 
        visible={!!hoveredNode && !selectedNode} 
      />

      {/* Tech Bubble (Highest z-index) */}
      <TechDetailBubble 
        node={selectedNode} 
        onClose={() => setSelectedNode(null)} 
      />
    </div>
  );
};
