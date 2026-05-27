import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { GalaxyScene } from './components/Scene/GalaxyScene';
import { UIOverlay } from './components/UI/UIOverlay';
import { ThemeOverlay } from './components/UI/ThemeOverlay';
import { useGalaxyStore } from './store/useGalaxyStore';

function App() {
  const visualMode = useGalaxyStore((state) => state.visualMode);

  return (
    <div className="w-full h-full relative overflow-hidden bg-galaxy-bg text-gray-200" data-visual-mode={visualMode}>
      <Canvas
        camera={{ position: [0, 5, 20], fov: 45 }}
        gl={{ antialias: true, alpha: false }}
        dpr={Math.min(window.devicePixelRatio, 2)}
      >
        <color attach="background" args={['#020204']} />
        <Suspense fallback={null}>
          <GalaxyScene />
        </Suspense>
      </Canvas>
      <UIOverlay />
      <ThemeOverlay />
    </div>
  );
}

export default App;
