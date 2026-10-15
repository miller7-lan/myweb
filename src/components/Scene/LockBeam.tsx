import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { themes } from '../../data/themes';
import { useGalaxyStore } from '../../store/useGalaxyStore';

const DASH_PX = 10;
const GAP_PX = 6;
const PERIOD_PX = DASH_PX + GAP_PX;

const beamVertexShader = /* glsl */ `
  void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const beamFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uPhase;
  uniform float uPixelRatio;
  uniform vec2 uStartPx;
  uniform vec2 uEndPx;
  uniform float uDashPx;
  uniform float uPeriodPx;

  void main() {
    // Measure along the projected axis in CSS pixels, independent of depth and DPR.
    vec2 axis = uEndPx - uStartPx;
    vec2 direction = axis / max(length(axis), 0.001);
    float distancePx = dot(gl_FragCoord.xy / uPixelRatio - uStartPx, direction);
    // Increasing phase moves each segment from the core toward the target planet.
    float dashPosition = mod(distancePx - uPhase, uPeriodPx);
    float dashMask = smoothstep(0.0, 1.0, dashPosition)
      * (1.0 - smoothstep(uDashPx - 1.0, uDashPx, dashPosition));
    gl_FragColor = vec4(uColor, uOpacity * dashMask);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

export const LockBeam: React.FC = () => {
  const pulseRef = useRef(0);
  const previousTarget = useRef<string | null>(null);
  const reducedMotion = useRef(false);
  const beamRef = useRef<THREE.Mesh>(null);
  const targetPosition = useRef(new THREE.Vector3());
  const midpoint = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const screenStart = useRef(new THREE.Vector3());
  const screenEnd = useRef(new THREE.Vector3());
  const targetColor = useRef(new THREE.Color());
  const up = useMemo(() => new THREE.Vector3(0, 1, 0), []);
  const uniforms = useMemo(() => ({
    uColor: { value: new THREE.Color('#e2e8f0') },
    uOpacity: { value: 0 },
    uPhase: { value: 0 },
    uPixelRatio: { value: 1 },
    uStartPx: { value: new THREE.Vector2() },
    uEndPx: { value: new THREE.Vector2() },
    uDashPx: { value: DASH_PX },
    uPeriodPx: { value: PERIOD_PX },
  }), []);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const syncPreference = () => { reducedMotion.current = preference.matches; };
    syncPreference();
    preference.addEventListener('change', syncPreference);
    return () => preference.removeEventListener('change', syncPreference);
  }, []);

  useFrame(({ camera, gl, size }, delta) => {
    const state = useGalaxyStore.getState();
    const theme = state.hoveredPlanet ? themes[state.hoveredPlanet] : null;
    const planetPosition = state.hoveredPlanet ? state.planetPositions[state.hoveredPlanet] : null;
    const isVisible = Boolean(theme && planetPosition) && (state.viewState === 'HOME' || state.viewState === 'HOVER_PLANET');
    const modeOpacity = state.visualMode === 'silent' ? 0.42 : state.visualMode === 'focus' ? 0.68 : 1;
    const isStatic = reducedMotion.current || state.visualMode === 'silent';
    const beam = beamRef.current;
    if (!beam) return;
    const beamUniforms = (beam.material as THREE.ShaderMaterial).uniforms;

    if (state.hoveredPlanet && previousTarget.current !== state.hoveredPlanet) {
      beamUniforms.uPhase.value = 0;
      pulseRef.current = 0;
    }
    previousTarget.current = state.hoveredPlanet;
    if (!isStatic && isVisible) {
      pulseRef.current += delta;
      const speed = state.visualMode === 'focus' ? 14 : 22;
      beamUniforms.uPhase.value = (beamUniforms.uPhase.value + speed * delta) % PERIOD_PX;
    }

    const pulse = isStatic ? 0 : Math.sin(pulseRef.current * 3.2) * 0.08;
    const targetOpacity = isVisible ? (0.28 + pulse) * modeOpacity : 0;
    beamUniforms.uOpacity.value = THREE.MathUtils.damp(beamUniforms.uOpacity.value, targetOpacity, 8, delta);
    beam.visible = beamUniforms.uOpacity.value > 0.001;

    if (!theme || !planetPosition) return;

    targetPosition.current.fromArray(planetPosition);
    const length = targetPosition.current.length();
    if (length < 0.001) {
      beam.visible = false;
      return;
    }
    midpoint.current.copy(targetPosition.current).multiplyScalar(0.5);
    direction.current.copy(targetPosition.current).normalize();
    beam.position.copy(midpoint.current);
    beam.scale.set(1, length, 1);
    beam.quaternion.setFromUnitVectors(up, direction.current);
    beamUniforms.uColor.value.lerp(targetColor.current.set(theme.color), 1 - Math.exp(-12 * delta));

    // The cylinder's bottom is the core and its top is the planet. Project the
    // actual mesh endpoints so camera changes and responsive layouts stay aligned.
    beam.updateWorldMatrix(true, false);
    screenStart.current.set(0, -0.5, 0).applyMatrix4(beam.matrixWorld).project(camera);
    screenEnd.current.set(0, 0.5, 0).applyMatrix4(beam.matrixWorld).project(camera);
    beamUniforms.uStartPx.value.set((screenStart.current.x + 1) * size.width / 2, (screenStart.current.y + 1) * size.height / 2);
    beamUniforms.uEndPx.value.set((screenEnd.current.x + 1) * size.width / 2, (screenEnd.current.y + 1) * size.height / 2);
    beamUniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return (
    <mesh ref={beamRef} visible={false}>
      <cylinderGeometry args={[0.018, 0.018, 1, 10, 1, true]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={beamVertexShader}
        fragmentShader={beamFragmentShader}
        transparent
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
};
