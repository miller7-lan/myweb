import React, { useEffect, useRef } from 'react';
import { SkillConstellation } from './SkillConstellation';
import gsap from 'gsap';

export const StackContent: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    gsap.fromTo(containerRef.current,
      { opacity: 0, y: 40 },
      { opacity: 1, y: 0, duration: 1.4, ease: "power4.out" }
    );
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto flex flex-col h-full relative" ref={containerRef}>
      {/* Header Info */}
      <div className="mb-6 pl-4 md:pl-2">
        <div className="hud-kicker mb-4">
          <span className="hud-dot" />
          <span>STACK CONSTELLATION</span>
        </div>
        <h2 className="text-3xl md:text-4xl font-light tracking-widest text-gray-100 mb-1">
          Stack
        </h2>
        <span className="block text-xl text-gray-400 font-extralight tracking-widest mb-3">技能星图</span>
        
        <p className="text-xs text-gray-500 font-light max-w-sm leading-relaxed tracking-wide mb-3">
          A project-backed constellation of tools, languages, and systems I have shipped.
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

      {/* Map Container */}
      <div className="hud-panel w-full flex-1 relative min-h-[65vh] md:min-h-[70vh] rounded-[32px] overflow-hidden flex flex-col" data-guide-id="stack-map">
        {/* Vignette Overlay (Pointer events none so it doesn't block dragging) */}
        <div className="absolute inset-0 pointer-events-none rounded-[32px] shadow-[inset_0_0_100px_rgba(0,0,0,0.8)] z-10" />
        
        <SkillConstellation />
      </div>
    </div>
  );
};
