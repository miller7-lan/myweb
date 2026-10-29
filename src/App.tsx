import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { GalaxyScene } from './components/Scene/GalaxyScene';
import { UIOverlay } from './components/UI/UIOverlay';
import { ThemeOverlay } from './components/UI/ThemeOverlay';
import { GuidePet } from './components/UI/GuidePet';
import { LiquidGlass } from './components/UI/LiquidGlass';
import { PortalTransition } from './components/UI/PortalTransition';
import { IntroSequence } from './components/UI/IntroSequence';
import { FinaleSequence } from './components/UI/FinaleSequence';
import { UfoRaid } from './components/UI/UfoRaid';
import { PaperPlane } from './components/UI/PaperPlane';
import { CoreTether } from './components/UI/CoreTether';
import { glassSurfaceSelector } from './utils/glassSurfaces';
import { useGalaxyStore } from './store/useGalaxyStore';

function SceneBackground() {
  const { size } = useThree();
  const isMobilePortrait = size.width <= 768 && size.height > size.width;

  return <color attach="background" args={[isMobilePortrait ? '#05070d' : '#020204']} />;
}

// Glass surfaces catch a specular highlight that follows the mouse (see "liquid glass" in globals.css).
function useGlassHighlight() {
  useEffect(() => {
    // At most one style write per frame, however fast the mouse reports.
    let frame = 0;
    let pending: PointerEvent | null = null;

    const apply = () => {
      frame = 0;
      const event = pending;
      pending = null;
      if (!event || !(event.target instanceof Element)) return;
      const surface = event.target.closest<HTMLElement>(glassSurfaceSelector);
      if (!surface) return;
      const bounds = surface.getBoundingClientRect();
      surface.style.setProperty('--glass-x', `${event.clientX - bounds.left}px`);
      surface.style.setProperty('--glass-y', `${event.clientY - bounds.top}px`);
      // Light the rim corner nearest the pointer: the gradient runs from the pointer toward the centre.
      const towardCentreX = bounds.left + bounds.width / 2 - event.clientX;
      const towardCentreY = bounds.top + bounds.height / 2 - event.clientY;
      surface.style.setProperty('--glass-angle', `${(Math.atan2(towardCentreX, -towardCentreY) * 180) / Math.PI}deg`);
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      pending = event;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);
}

function App() {
  const visualMode = useGalaxyStore((state) => state.visualMode);
  const viewState = useGalaxyStore((state) => state.viewState);
  useGlassHighlight();

  return (
    <div className="w-full h-full relative overflow-hidden bg-galaxy-bg text-gray-200" data-visual-mode={visualMode}>
      <Canvas
        className="galaxy-canvas-brightness"
        // While a theme page is open the galaxy sits under a dark, heavily
        // blurred backdrop. Rendering it only on demand there means every
        // glass surface's backdrop stops changing each frame.
        frameloop={viewState === 'THEME' ? 'demand' : 'always'}
        camera={{ position: [0, 5, 20], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <SceneBackground />
        <Suspense fallback={null}>
          <GalaxyScene />
        </Suspense>
      </Canvas>
      <div className="galaxy-ui-brightness absolute inset-0 pointer-events-none">
        <UIOverlay />
        <ThemeOverlay />
      </div>
      <CoreTether />
      <PortalTransition />
      <IntroSequence />
      <FinaleSequence />
      <UfoRaid />
      <PaperPlane />
      <GuidePet />
      <LiquidGlass />
    </div>
  );
}

export default App;
