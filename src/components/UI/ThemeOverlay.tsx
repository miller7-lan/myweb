import React, { useEffect } from 'react';
import { useGalaxyStore } from '../../store/useGalaxyStore';
import { themes } from '../../data/themes';
import { ArrowLeft } from 'lucide-react';
import gsap from 'gsap';
import { IdentityContent } from '../Themes/IdentityContent';
import { CreationsContent } from '../Themes/CreationsContent';
import { StackContent } from '../Themes/StackContent';
import { OrbitContent } from '../Themes/OrbitContent';
import { SignalContent } from '../Themes/SignalContent';

export const ThemeOverlay: React.FC = () => {
  const { viewState, activeTheme, setViewState } = useGalaxyStore();
  const theme = activeTheme ? themes[activeTheme] : null;
  const scanLabels: Record<string, string> = {
    identity: 'Identity Core Online',
    creations: 'Archive Linked',
    stack: 'Stack Matrix Synced',
    orbit: 'Release Orbit Synced',
    signal: 'Signal Channel Open',
  };

  // We show the theme overlay visually when in THEME or LEAVING_THEME state
  const isVisible = viewState === 'THEME' || viewState === 'LEAVING_THEME';
  
  const handleReturn = () => {
    if (viewState !== 'THEME') return;
    setViewState('LEAVING_THEME');
    // The GalaxyScene handles the 3D transition.
    // Once LEAVING_THEME is done, it will reset to HOME and activeTheme to null.
  };

  useEffect(() => {
    if (viewState === 'THEME') {
      gsap.fromTo('.theme-backdrop',
        { opacity: 0 },
        { opacity: 1, duration: 1.2, ease: 'power2.out' }
      );

      gsap.fromTo('.theme-scan-intro',
        { opacity: 0 },
        { opacity: 1, duration: 0.18, ease: 'power2.out' }
      );

      gsap.fromTo('.theme-scanline',
        { scaleX: 0.05, opacity: 0 },
        { scaleX: 1, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.08 }
      );

      gsap.to('.theme-scan-intro', {
        opacity: 0,
        duration: 0.45,
        ease: 'power2.inOut',
        delay: 0.78
      });
      
      gsap.fromTo('.theme-content', 
        { opacity: 0, y: 20 }, 
        { opacity: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.1, delay: 0.55 }
      );
    } else if (viewState === 'LEAVING_THEME') {
      gsap.to(['.theme-backdrop', '.theme-content'], {
        opacity: 0,
        y: -10,
        duration: 0.6,
        ease: 'power2.inOut'
      });
    }
  }, [viewState]);

  if (!isVisible || !theme) return null;

  const renderContent = () => {
    switch (activeTheme) {
      case 'identity': return <IdentityContent />;
      case 'creations': return <CreationsContent />;
      case 'stack': return <StackContent />;
      case 'orbit': return <OrbitContent />;
      case 'signal': return <SignalContent />;
      default: return null;
    }
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none z-20 flex flex-col"
      style={{ ['--theme-color' as string]: theme.color }}
    >
      {/* Background Dimmer & Blur */}
      <div className="theme-backdrop absolute inset-0 bg-[#020204]/82 backdrop-blur-2xl opacity-0 pointer-events-auto">
        <div className="theme-orb right-[12%] top-[18%] h-56 w-56" />
        <div className="theme-orb bottom-[10%] left-[8%] h-72 w-72 opacity-[0.07]" />
      </div>

      <div className="theme-scan-intro absolute inset-0 z-40 flex items-center justify-center opacity-0 pointer-events-none">
        <div className="theme-scanline" />
        <div className="relative rounded-full border border-white/[0.08] bg-[#020204]/70 px-5 py-2 text-xs uppercase tracking-[0.28em] text-gray-300 backdrop-blur-md">
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[var(--theme-color)] shadow-[0_0_14px_var(--theme-color)]" />
          {scanLabels[String(activeTheme)] ?? 'Signal Locked'}
        </div>
      </div>
      
      {/* Fixed Return Layer */}
      <div className="absolute top-0 left-0 w-full h-28 md:h-32 z-50 pointer-events-none bg-gradient-to-b from-[#020204]/95 via-[#020204]/70 to-transparent">
        <button
          onClick={handleReturn}
          className="group fixed top-6 md:top-8 flex items-center gap-2 text-gray-400 hover:text-white transition-colors duration-300 w-fit cursor-pointer pointer-events-auto bg-[#020204]/65 backdrop-blur-md px-4 py-2 rounded-full border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
          style={{ left: 'max(1.5rem, calc((100vw - 72rem) / 2 + 2rem))' }}
          aria-label="Return to Galaxy"
        >
          <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          <span className="font-light tracking-wide text-sm uppercase">Return</span>
        </button>
        <div
          className="theme-content fixed top-6 right-6 hidden items-center gap-3 rounded-full border border-white/[0.08] bg-[#020204]/65 px-4 py-2 text-xs uppercase tracking-[0.22em] text-gray-400 backdrop-blur-md md:flex"
          style={{ right: 'max(1.5rem, calc((100vw - 72rem) / 2 + 2rem))' }}
        >
          <span className="hud-dot" />
          <span>{theme.title}</span>
          <span className="text-gray-600">/</span>
          <span className="text-gray-300">{theme.chineseName}</span>
        </div>
      </div>

      {/* Scrollable Container */}
      <div className="absolute inset-0 pointer-events-auto overflow-y-auto z-30 flex flex-col pt-36 md:pt-44">
        <div className="w-full max-w-6xl mx-auto px-8 md:px-16 flex flex-col flex-1 min-h-full pb-24">
          <div className="theme-content opacity-0 flex-1">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
};
