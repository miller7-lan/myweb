import * as THREE from 'three';
import { meteorWave } from '../utils/meteorWave';

/*
 * The ship's ripples on the ring (utils/wakeTrail.ts), in ring-local space:
 * every point the ship passed sends out a few rings of ripples that widen
 * and fade as they spread, overlapping where they meet. Returns the
 * water's height there, about -1.4 to 1.4.
 */
export const wakeGLSL = `
uniform vec4 uWakePoints[32];
uniform vec3 uWakeMotion[32];
uniform float uWakeLife;
uniform float uTime;

float wakeAt(vec2 p) {
  float height = 0.0;
  for (int i = 0; i < 32; i++) {
    vec4 src = uWakePoints[i];
    float age = uTime - src.z;
    if (src.w <= 0.0 || age < 0.0 || age > uWakeLife) continue;
    vec2 rel = p - src.xy;
    vec3 motion = uWakeMotion[i];
    float speed = length(motion.xy);
    float dist = length(rel);
    float gap = dist - (speed * 0.3 * age + 0.05);
    // The packet widens and its waves lengthen as it spreads.
    float spread = 0.14 + age * 0.06;
    if (gap > spread * 2.2 || gap < -spread * 3.2) continue;
    float wavelength = 0.2 + age * 0.05;
    float packet = exp(-gap * gap / (2.0 * spread * spread));
    float wave = cos(gap / wavelength * 6.2832) * packet;
    float fade = pow(1.0 - age / uWakeLife, 1.4) * smoothstep(0.0, 0.2, age) * src.w;
    // In a turn the outer side's waves are stronger, the inner side's weaker.
    float side = sign(motion.x * rel.y - motion.y * rel.x);
    fade *= 1.0 - side * clamp(motion.z * 1.6, -1.0, 1.0) * 0.65;
    height += wave * fade;
  }
  return clamp(height * 0.6, -1.4, 1.4);
}
`;

/*
 * Every material on particleVertexShader shares one GL program, and a
 * uniform a material doesn't list keeps whatever the last one set. So each
 * lists these too: no wake and no beam unless it says so.
 */
const noWakePoints = Array.from({ length: 32 }, () => new THREE.Vector4(0, 0, -999, 0));
const noWakeMotion = Array.from({ length: 32 }, () => new THREE.Vector3());
export const particleSharedUniforms = () => ({
  uWakePoints: { value: noWakePoints },
  uWakeMotion: { value: noWakeMotion },
  uWakeLife: { value: 1 },
  uSuck: { value: 0 },
  uSuckPoint: { value: new THREE.Vector3() },
});

export const particleVertexShader = `
uniform vec3 uMousePos;
uniform vec2 uMouseScreenPos;
uniform float uAspect;
uniform float uParticleSize;
uniform vec3 uGlowColor;
uniform float uHoverBrightness;
uniform float uFocusBoost;
uniform float uOpacity;
uniform float uIntroProgress;
uniform vec3 uImpactPoints[4];
uniform float uImpactStartTimes[4];
uniform float uImpactStrengths[4];
uniform float uImpactRadius;
${wakeGLSL}
// The UFO's tractor beam (UfoRaid): 0–1 of the particles pulled up into
// uSuckPoint (in this field's own space).
uniform float uSuck;
uniform vec3 uSuckPoint;

attribute float aRandom;
attribute vec3 aInitialPos;

varying vec3 vPosition;
varying float vDistanceToMouse;
varying vec2 vScreenPos;
varying float vAlpha;
varying float vImpactGlow;

void main() {
  // Base target position
  vec3 targetPos = position;
  
  // Basic floating movement on target position
  targetPos.y += sin(uTime * 0.5 + aRandom * 10.0) * 0.05;
  targetPos.x += cos(uTime * 0.3 + aRandom * 10.0) * 0.05;

  float impactLife = ${meteorWave.life.toFixed(2)};
  float combinedWave = 0.0;
  for (int i = 0; i < 4; i++) {
    float impactAge = uTime - uImpactStartTimes[i];
    float impactActive = step(0.0, impactAge) * (1.0 - step(impactLife, impactAge));
    float waveTravel = impactAge / impactLife;
    float distToImpact = distance(position.xz, uImpactPoints[i].xz);
    float waveFront = waveTravel * uImpactRadius;
    float waveBand = 1.0 - smoothstep(0.0, 0.62, abs(distToImpact - waveFront));
    float waveFalloff = pow(1.0 - clamp(waveTravel, 0.0, 1.0), 1.45);
    combinedWave += waveBand * waveFalloff * uImpactStrengths[i] * impactActive;
  }
  float wave = min(combinedWave, 1.65);
  vec2 radialDir = normalize(position.xz + vec2(0.0001));
  targetPos.xz += radialDir * wave * 0.24;
  targetPos.y += wave * (0.62 + aRandom * 0.28);

  // The ship's ripples (wakeGLSL above): a gentle rise and fall.
  float wakeHeight = wakeAt(position.xz);
  targetPos.y += wakeHeight * 0.07;
  float wakeFoam = max(wakeHeight, 0.0) * 0.25;

  // Interpolate from scattered position to target position based on intro progress
  // Easing can be done in JS or here. We use JS to animate uIntroProgress non-linearly.
  vec3 pos = mix(aInitialPos, targetPos, uIntroProgress);
  float sucked = 0.0;
  if (uSuck > 0.0) {
    // Each particle leaves in its own time and spirals up into the beam.
    sucked = clamp(uSuck * 1.7 - aRandom * 0.7, 0.0, 1.0);
    sucked = sucked * sucked * (3.0 - 2.0 * sucked);
    float spin = sucked * 7.0 + aRandom * 6.2832;
    vec3 swirl = vec3(cos(spin), 0.0, sin(spin)) * 0.45 * sucked * (1.0 - sucked);
    pos = mix(pos, uSuckPoint, sucked) + swirl;
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vec4 clipPosition = projectionMatrix * mvPosition;
  
  // Size attenuation
  // A few brighter grains among fine dust, with a safe near-camera size limit.
  float grainSize = mix(0.7, 1.55, pow(aRandom, 2.0));
  float viewportScale = clamp(1.6 / uAspect, 0.65, 1.0);
  gl_PointSize = clamp(uParticleSize * viewportScale * (20.0 / max(0.1, -mvPosition.z)) * grainSize, 1.0, 28.0);
  
  vPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  vDistanceToMouse = distance(vPosition, uMousePos);
  vScreenPos = clipPosition.xy / clipPosition.w;
  
  float shimmer = 0.94 + 0.06 * sin(uTime * 0.65 + aRandom * 62.83);
  vAlpha = mix(0.68, 1.0, aRandom) * shimmer;
  vImpactGlow = wave + wakeFoam + sucked * (1.0 - sucked) * 2.0;
  vAlpha *= 1.0 - sucked * 0.85;
  
  gl_Position = clipPosition;
}
`;

export const particleFragmentShader = `
uniform vec3 uColor;
uniform vec2 uMouseScreenPos;
uniform float uAspect;
uniform vec3 uGlowColor;
uniform float uHoverBrightness;
uniform float uIsHovered; // 1.0 if hovered/active, 0.0 otherwise (instant response)
uniform float uFocusBoost;
uniform float uOpacity;
uniform vec3 uShipPos;
uniform float uShipLightStrength;

varying vec3 vPosition;
varying float vDistanceToMouse;
varying vec2 vScreenPos;
varying float vAlpha;
varying float vImpactGlow;

void main() {
  // Make particles soft circular discs
  vec2 xy = gl_PointCoord.xy - vec2(0.5);
  float ll = length(xy);
  if (ll > 0.5) discard;
  
  // Smooth gaussian-like falloff for soft edges
  float alpha = exp(-ll * ll * 22.0) * (1.0 - smoothstep(0.32, 0.5, ll)) * vAlpha;
  
  // Screen-space spotlight keeps a pure-white focus centered on the pointer.
  const float pointerGlowRadius = 0.3; // Original 0.2 radius increased by 50%.
  const float pointerWorldRadius = 6.3; // Original 4.2 radius increased by 50%.
  const float shipGlowRadius = 2.9; // Original 1.45 Morning Star radius increased by 100%.
  vec2 screenDelta = (vScreenPos - uMouseScreenPos) * vec2(uAspect, 1.0);
  float screenDistance = length(screenDelta);
  float screenFalloff = 1.0 - smoothstep(0.0, pointerGlowRadius, screenDistance);
  float screenIntensity = clamp(pow(screenFalloff, 2.65) + pow(screenFalloff, 8.0) * 0.36, 0.0, 0.98);
  
  // Keep a subtle world-space falloff so nearby 3D particles still feel connected.
  float worldIntensity = (1.0 - smoothstep(0.0, pointerWorldRadius, vDistanceToMouse)) * 0.14;
  float lightIntensity = clamp(screenIntensity * (1.0 + uFocusBoost * 0.42) + worldIntensity, 0.0, 1.0);
  
  vec3 pointerLightColor = vec3(1.0);
  vec3 ambientLightColor = vec3(0.52, 0.6, 0.76);
  
  // Focused planets emit saturated themed light first; the pointer remains a pure
  // white highlight with radial falloff instead of tinting the whole planet.
  float themeDominance = clamp(max(uIsHovered, uHoverBrightness * 1.45), 0.0, 1.0);
  // While a planet is focused the pointer glow takes on the theme colour instead of
  // washing it out to white.
  float mouseDamp = mix(1.0, 0.0, themeDominance);
  float pointerSpot = screenIntensity * mouseDamp;
  float effectiveLightIntensity = lightIntensity * mouseDamp;
  
  float pointerPurity = clamp(screenIntensity * (0.62 + uFocusBoost * 0.18), 0.0, 0.92);
  float themeMask = 1.0 - pointerPurity * 0.74;
  vec3 particleThemeColor = mix(uGlowColor, vec3(1.0), mix(0.22, 0.06, themeDominance));
  vec3 finalColor = mix(uColor, particleThemeColor, clamp(uHoverBrightness * 1.28 * themeMask, 0.0, 0.96));
  finalColor += particleThemeColor * uHoverBrightness * 0.42 * themeMask;
  finalColor = mix(finalColor, pointerLightColor, effectiveLightIntensity * mix(0.62, 0.08, uIsHovered));
  finalColor += ambientLightColor * uFocusBoost * 0.08;
  finalColor += pointerLightColor * pointerSpot * (0.6 + uFocusBoost * 0.3);
  finalColor += mix(vec3(0.65, 0.72, 0.82), uGlowColor, 0.28) * clamp(vImpactGlow * 0.62, 0.0, 0.72);
  
  // Volumetric Lighting around the ship's mast-top twinkling Morning Star
  float distToShip = distance(vPosition, uShipPos);
  float shipLightIntensity = (1.0 - smoothstep(0.0, shipGlowRadius, distToShip)) * (1.0 - screenIntensity);
  vec3 goldGlow = vec3(0.99, 0.88, 0.45) * shipLightIntensity * 1.15 * uShipLightStrength;
  finalColor += goldGlow;
  
  float opacityBoost = shipLightIntensity * 1.2 * uShipLightStrength;
  float ambientOpacityBoost = uFocusBoost * 0.06;
  float pointerOpacityBoost = pointerSpot * (0.48 + uFocusBoost * 0.7);
  float finalOpacity = alpha * uOpacity * (1.0 + ambientOpacityBoost + pointerOpacityBoost + clamp(vImpactGlow * 0.24, 0.0, 0.28) + opacityBoost);
  
  // Raise particle emission only; keep UI, geometry and soft-edge opacity unchanged.
  vec3 emitted = finalColor * 1.3;
  // Clip focused planets by their brightest channel so the hue survives instead of turning white.
  float peak = max(max(emitted.r, emitted.g), emitted.b);
  emitted = mix(emitted, emitted / max(peak, 1.0), themeDominance);
  gl_FragColor = vec4(emitted, finalOpacity);
}
`;
