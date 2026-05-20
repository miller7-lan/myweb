export const particleVertexShader = `
uniform float uTime;
uniform vec3 uMousePos;
uniform vec2 uMouseScreenPos;
uniform float uAspect;
uniform float uParticleSize;
uniform vec3 uGlowColor;
uniform float uHoverBrightness;
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
uniform float uOpacity;

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
  
  // Screen-space lighting keeps the glow consistent across the full viewport.
  vec2 screenDelta = (vScreenPos - uMouseScreenPos) * vec2(uAspect, 1.0);
  float screenIntensity = smoothstep(0.28, 0.0, length(screenDelta));
  screenIntensity = clamp(screenIntensity, 0.0, 0.85);
  
  // Keep a subtle world-space falloff so nearby 3D particles still feel connected.
  float worldIntensity = smoothstep(5.0, 0.0, vDistanceToMouse) * 0.18;
  float lightIntensity = clamp(screenIntensity + worldIntensity, 0.0, 0.9);
  
  // Mouse light stays subtle so focused planets keep their theme color.
  vec3 lightColor = mix(vec3(0.7, 0.75, 0.85), uGlowColor, clamp(uHoverBrightness * 1.4, 0.0, 0.85));
  
  // Keep global mouse light and focused planet light separate so they do not fight.
  float focusLightDamping = 1.0 - clamp(uHoverBrightness * 0.62, 0.0, 0.55);
  vec3 finalColor = mix(uColor, lightColor, lightIntensity * focusLightDamping);
  finalColor = mix(finalColor, uGlowColor, clamp(uHoverBrightness * 0.5, 0.0, 0.38));
  finalColor += uGlowColor * uHoverBrightness * 0.24;
  finalColor += mix(vec3(0.65, 0.72, 0.82), uGlowColor, 0.28) * clamp(vImpactGlow * 0.62, 0.0, 0.72);
  
  gl_FragColor = vec4(finalColor, alpha * uOpacity * (1.0 + clamp(vImpactGlow * 0.24, 0.0, 0.28)));
}
`;
