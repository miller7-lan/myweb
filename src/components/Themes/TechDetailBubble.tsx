import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { X } from 'lucide-react';
import { skillsData, type SkillNode } from '../../data/skills';

interface TechDetailBubbleProps {
  node: SkillNode | null;
  onClose: () => void;
}

export const TechDetailBubble: React.FC<TechDetailBubbleProps> = ({ node, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (node && containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, scale: 0.95, y: 10 },
        { opacity: 1, scale: 1, y: 0, duration: 0.5, ease: 'power4.out' }
      );
      
      // Animate content children staggering
      gsap.fromTo(containerRef.current.querySelectorAll('.stagger-item'),
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.05, ease: 'power3.out', delay: 0.1 }
      );
    }
  }, [node]);

  if (!node) return null;

  // Handle Close with Animation
  const handleClose = () => {
    if (containerRef.current) {
      gsap.to(containerRef.current, {
        opacity: 0,
        scale: 0.95,
        duration: 0.3,
        ease: 'power3.inOut',
        onComplete: onClose
      });
    } else {
      onClose();
    }
  };

  const renderStatusBadge = (status: string) => {
    switch(status) {
      case 'learned': return <span className="px-2 py-0.5 rounded-full border border-gray-400/30 bg-gray-400/10 text-gray-200 text-[10px] tracking-widest uppercase">Learned · 已掌握</span>;
      case 'learning': return <span className="px-2 py-0.5 rounded-full border border-[#a0c0ff]/30 bg-[#a0c0ff]/10 text-[#a0c0ff] text-[10px] tracking-widest uppercase animate-pulse">Learning · 学习中</span>;
      case 'locked': return <span className="px-2 py-0.5 rounded-full border border-gray-600/30 bg-gray-600/10 text-gray-500 text-[10px] tracking-widest uppercase">Planned · 计划学习</span>;
      default: return null;
    }
  };

  // Helper to find skills within a branch
  const getBranchSkills = (branchId: string, status: string) => {
    // We assume any skill whose getBranchId() === branchId is part of it.
    // For simplicity, we can just trace paths. In skills.ts we have 'branch-lang', 'branch-front', etc.
    const findDescendants = (startId: string, found = new Set<string>()) => {
      skillsData.find(n => n.id === startId)?.links.forEach(childId => {
        found.add(childId);
        findDescendants(childId, found);
      });
      return found;
    };
    const descendants = findDescendants(branchId);
    return Array.from(descendants)
      .map(id => skillsData.find(n => n.id === id))
      .filter((n): n is SkillNode => n !== undefined && n.status === status);
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
      {/* Invisible backdrop for click-outside */}
      <div className="absolute inset-0 pointer-events-auto" onClick={handleClose} />
      
      <div 
        ref={containerRef}
        className="relative w-[calc(100vw-32px)] md:w-[500px] max-h-[75vh] flex flex-col rounded-[28px] p-6 md:p-8 pointer-events-auto overflow-hidden"
        style={{
          background: 'radial-gradient(circle at top right, rgba(180,190,220,0.12), rgba(8,8,12,0.88))',
          border: '1px solid rgba(220,230,255,0.1)',
          boxShadow: '0 0 60px rgba(180,200,255,0.06), inset 0 0 40px rgba(255,255,255,0.03)',
          backdropFilter: 'blur(24px)'
        }}
      >
        <button 
          onClick={handleClose}
          className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors duration-300 z-10"
        >
          <X size={18} />
        </button>

        <div className="flex-1 overflow-y-auto no-scrollbar pr-1">
          {node.type === 'branch' ? (
            <div className="flex flex-col space-y-6">
              <div className="stagger-item">
                <h2 className="text-2xl font-light text-gray-100 tracking-widest mb-1">{node.zhName}</h2>
                <div className="text-sm text-gray-400 tracking-wide">{node.name}</div>
              </div>
              
              <div className="stagger-item text-xs text-gray-300 font-light leading-relaxed">
                {node.summary || node.description}
              </div>

              <div className="stagger-item grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-white/5 pt-4">
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#e0e5ff] shadow-[0_0_4px_#e0e5ff] mr-2" />已点亮
                  </h4>
                  <ul className="space-y-1.5">
                    {getBranchSkills(node.id, 'learned').map(s => (
                      <li key={s.id} className="text-xs text-gray-300 font-light">{s.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#a0c0ff] shadow-[0_0_4px_#a0c0ff] mr-2" />学习中
                  </h4>
                  <ul className="space-y-1.5">
                    {getBranchSkills(node.id, 'learning').map(s => (
                      <li key={s.id} className="text-xs text-[#a0c0ff] font-light">{s.name}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 flex items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5a5a66] mr-2" />计划
                  </h4>
                  <ul className="space-y-1.5">
                    {getBranchSkills(node.id, 'locked').map(s => (
                      <li key={s.id} className="text-xs text-gray-500 font-light">{s.name}</li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="stagger-item border-t border-white/5 pt-4">
                <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">相关项目 · Related Projects</h4>
                <div className="flex flex-wrap gap-2">
                  {node.relatedProjects?.map((proj, i) => (
                    <span key={i} className="text-xs text-gray-400 bg-white/5 px-2 py-1 rounded-md">{proj}</span>
                  ))}
                </div>
              </div>

              <div className="stagger-item border-t border-white/5 pt-4">
                <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">下一步计划 · Next Steps</h4>
                <ul className="space-y-1">
                  {node.nextSteps?.map((step, i) => (
                    <li key={i} className="text-xs text-gray-400 font-light flex items-start">
                      <span className="text-gray-600 mr-2">›</span> {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex flex-col space-y-5">
              <div className="stagger-item pr-8">
                <h2 className="text-2xl font-light text-gray-100 tracking-widest mb-1">{node.zhName}</h2>
                <div className="text-sm text-gray-400 tracking-wide mb-3">{node.name}</div>
                {renderStatusBadge(node.status)}
              </div>

              <div className="stagger-item text-xs text-gray-300 font-light leading-relaxed border-l-2 border-white/10 pl-3 py-1">
                {node.description}
              </div>

              {node.practice && node.practice.length > 0 && (
                <div className="stagger-item pt-2">
                  <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">实践 · Practice</h4>
                  <ul className="space-y-1.5">
                    {node.practice.map((p, i) => (
                      <li key={i} className="text-xs text-gray-400 font-light flex items-start">
                        <span className="text-gray-600 mr-2 text-[10px] mt-0.5">■</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="stagger-item pt-2 border-t border-white/5">
                <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">相关项目 · Related Projects</h4>
                <div className="flex flex-wrap gap-2">
                  {node.relatedProjects?.map((proj, i) => (
                    <span key={i} className="text-[11px] text-gray-300 bg-white/5 border border-white/[0.05] px-2 py-1 rounded-md tracking-wide">{proj}</span>
                  ))}
                </div>
              </div>

              <div className="stagger-item pt-2 border-t border-white/5">
                <h4 className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">下一步计划 · Next Steps</h4>
                <ul className="space-y-1">
                  {node.nextSteps?.map((step, i) => (
                    <li key={i} className="text-xs text-gray-400 font-light flex items-start">
                      <span className="text-gray-600 mr-2">›</span> {step}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
