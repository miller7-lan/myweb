import { Suspense } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { GalaxyScene } from './components/Scene/GalaxyScene';
import { UIOverlay } from './components/UI/UIOverlay';
import { ThemeOverlay } from './components/UI/ThemeOverlay';
import { GuidePet } from './components/UI/GuidePet';
import { useGalaxyStore } from './store/useGalaxyStore';

function SceneBackground() {
  const { size } = useThree();
  const isMobilePortrait = size.width <= 768 && size.height > size.width;

  return <color attach="background" args={[isMobilePortrait ? '#05070d' : '#020204']} />;
}

function App() {
  const visualMode = useGalaxyStore((state) => state.visualMode);

  return (
    <div className="w-full h-full relative overflow-hidden bg-galaxy-bg text-gray-200" data-visual-mode={visualMode}>
      <Canvas
        camera={{ position: [0, 5, 20], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <SceneBackground />
        <Suspense fallback={null}>
          <GalaxyScene />
        </Suspense>
      </Canvas>
      <UIOverlay />
      <ThemeOverlay />
      <GuidePet />
    </div>
  );
}

export default App;
