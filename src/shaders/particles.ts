export const particleVertexShader = `
uniform float uTime;
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

  float impactLife = 1.55;
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
  
  // Interpolate from scattered position to target position based on intro progress
  // Easing can be done in JS or here. We use JS to animate uIntroProgress non-linearly.
  vec3 pos = mix(aInitialPos, targetPos, uIntroProgress);
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vec4 clipPosition = projectionMatrix * mvPosition;
  
  // Size attenuation
  gl_PointSize = uParticleSize * (20.0 / -mvPosition.z) * (1.0 + aRandom);
  
  vPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
  vDistanceToMouse = distance(vPosition, uMousePos);
  vScreenPos = clipPosition.xy / clipPosition.w;
  
  vAlpha = 1.0;
  vImpactGlow = wave;
  
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
  float alpha = exp(-ll * ll * 16.0) * vAlpha;
  
  // Screen-space spotlight keeps the glow centered on the pointer without tinting it by theme color.
  vec2 screenDelta = (vScreenPos - uMouseScreenPos) * vec2(uAspect, 1.0);
  float screenDistance = length(screenDelta);
  float screenFalloff = smoothstep(0.2, 0.0, screenDistance);
  float screenIntensity = clamp(pow(screenFalloff, 2.65) + pow(screenFalloff, 8.0) * 0.36, 0.0, 0.98);
  
  // Keep a subtle world-space falloff so nearby 3D particles still feel connected.
  float worldIntensity = smoothstep(4.2, 0.0, vDistanceToMouse) * 0.14;
  float lightIntensity = clamp(screenIntensity * (1.0 + uFocusBoost * 0.42) + worldIntensity, 0.0, 1.0);
  
  vec3 pointerLightColor = vec3(0.92, 0.96, 1.0);
  vec3 ambientLightColor = vec3(0.52, 0.6, 0.76);
  
  // Focused planets emit their own themed light first; the pointer spotlight stays white and gives way.
  float themeDominance = clamp(max(uIsHovered, uHoverBrightness * 1.45), 0.0, 1.0);
  float mouseDamp = mix(1.0, 0.22, themeDominance);
  float pointerSpot = screenIntensity * mouseDamp;
  float effectiveLightIntensity = lightIntensity * mouseDamp;
  
  vec3 finalColor = mix(uColor, pointerLightColor, effectiveLightIntensity * 0.86);
  finalColor = mix(finalColor, uGlowColor, clamp(uHoverBrightness * 0.86, 0.0, 0.68));
  finalColor += uGlowColor * uHoverBrightness * 0.58;
  finalColor += ambientLightColor * uFocusBoost * 0.08;
  finalColor += pointerLightColor * pointerSpot * (0.56 + uFocusBoost * 0.5);
  finalColor += mix(vec3(0.65, 0.72, 0.82), uGlowColor, 0.28) * clamp(vImpactGlow * 0.62, 0.0, 0.72);
  
  // Volumetric Lighting around the ship's mast-top twinkling Morning Star
  float distToShip = distance(vPosition, uShipPos);
  float shipLightIntensity = smoothstep(1.45, 0.0, distToShip) * (1.0 - screenIntensity);
  vec3 goldGlow = vec3(0.99, 0.88, 0.45) * shipLightIntensity * 1.15 * uShipLightStrength;
  finalColor += goldGlow;
  
  float opacityBoost = shipLightIntensity * 1.2 * uShipLightStrength;
  float ambientOpacityBoost = uFocusBoost * 0.06;
  float pointerOpacityBoost = pointerSpot * (0.48 + uFocusBoost * 0.7);
  float finalOpacity = alpha * uOpacity * (1.0 + ambientOpacityBoost + pointerOpacityBoost + clamp(vImpactGlow * 0.24, 0.0, 0.28) + opacityBoost);
  
  gl_FragColor = vec4(finalColor, finalOpacity);
}
`;
