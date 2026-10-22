import React, { useEffect, useRef, useState } from 'react';
import { SkillConstellation } from './SkillConstellation';
import { SkillRelationGraph } from './SkillRelationGraph';
import { Network, Sparkles } from 'lucide-react';
import gsap from 'gsap';

export const StackContent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<'graph' | 'constellation'>(() => {
    try { return localStorage.getItem('galaxy-stack-view') === 'constellation' ? 'constellation' : 'graph'; }
    catch { return 'graph'; }
  });
  const changeView = (next: 'graph' | 'constellation') => {
    setView(next);
    try { localStorage.setItem('galaxy-stack-view', next); } catch { /* The view still works without storage. */ }
  };

  useEffect(() => {
    gsap.fromTo(containerRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1.4, ease: "power4.out" }
    );
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col h-full relative" ref={containerRef}>
      {/* Header Info */}
      <div className="section-heading mb-6 pl-4 md:pl-2">
        <div className="hud-kicker mb-4">
          <span className="hud-dot" />
          <span>STACK EXPLORER</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-light tracking-widest text-gray-100 mb-1">
          Stack
        </h2>
        <span className="block text-xl text-gray-400 font-extralight tracking-widest mb-3">技术栈 · {view === 'graph' ? '关系图谱' : '技能星图'}</span>
        
        <p className="text-xs text-gray-500 font-light max-w-2xl leading-relaxed tracking-wide mb-3">
          从已交付的工具，到正在学习的 Java 后端、C++ 数据结构与销量预测，记录持续扩展的技术路径。
        </p>

        <div className="flex flex-wrap gap-3">
          <span className="hud-chip">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#e0e5ff] shadow-[0_0_6px_#e0e5ff]"></span>
            点亮 · 已掌握
          </span>
          <span className="hud-chip">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#a0c0ff] shadow-[0_0_4px_#a0c0ff] animate-[pulse_2s_ease-in-out_infinite]"></span>
            微光 · 学习中
          </span>
          <span className="hud-chip text-gray-500">
            <span className="mr-2 h-1.5 w-1.5 rounded-full bg-[#5a5a66]"></span>
            暗星 · 计划学习
          </span>
        </div>
      </div>

      <div className="stack-view-toolbar mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="stack-view-switch flex gap-1 rounded-full border border-white/10 bg-[#0a0e18]/70 p-1" role="group" aria-label="技术栈视图">
          <button className="stack-view-option" aria-pressed={view === 'graph'} aria-controls="stack-visualization" onClick={() => changeView('graph')}><Network size={14} />关系图谱</button>
          <button className="stack-view-option" aria-pressed={view === 'constellation'} aria-controls="stack-visualization" onClick={() => changeView('constellation')}><Sparkles size={14} />技能星图</button>
        </div>
        <p className="text-[11px] tracking-wide text-gray-500">{view === 'graph' ? '拖动节点 · 滚动缩放 · 点击查看详情' : '拖动星图 · 滚动缩放 · 点击探索技能'}</p>
      </div>

      {/* Map Container */}
      <div id="stack-visualization" className={`stack-map-panel hud-panel w-full flex-none relative rounded-[32px] overflow-hidden flex flex-col ${view === 'graph' ? 'stack-relation-panel' : ''}`} data-guide-id="stack-map">
        {/* Vignette Overlay (Pointer events none so it doesn't block dragging) */}
        <div className="absolute inset-0 pointer-events-none rounded-[32px] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-10" />
        
        {view === 'graph' ? <SkillRelationGraph /> : <SkillConstellation />}
      </div>
    </div>
  );
};
