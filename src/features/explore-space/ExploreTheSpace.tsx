import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  ArrowLeft, 
  Sparkles, 
  Compass, 
  ChevronRight, 
  ChevronLeft, 
  Orbit, 
  Satellite, 
  X, 
  Minimize2,
  Volume2,
  VolumeX
} from 'lucide-react';
import { 
  createMilkyWayDome, 
  createRealisticStarfield, 
  getMilkyWayTexture 
} from '../../components/space/deepSpaceEnvironment';
import { 
  getRealisticEarthDayTexture, 
  createRealisticCloudMesh 
} from '../../components/space/earthRealistic';
import { getSpacecraft3DModel } from '../../components/space/spacecraftModelRegistry';
import type { TabType } from '../../components/common/Navbar';

export type CosmicEnvironment = 
  | 'SOLAR_SYSTEM' 
  | 'MILKY_WAY' 
  | 'GALAXIES' 
  | 'NEBULAS' 
  | 'DEEP_SPACE' 
  | 'UNIVERSE';

export interface SpatialWalkthroughStep {
  id: string;
  stepNumber: number;
  totalSteps: number;
  phaseLabel: string;
  title: string;
  description: string;
  env: CosmicEnvironment;
  cameraPos: [number, number, number];
  cameraTarget: [number, number, number];
  keyAction?: {
    label: string;
    tab?: TabType;
  };
  tip: string;
}

export const SPATIAL_WALKTHROUGH_STEPS: SpatialWalkthroughStep[] = [
  {
    id: 'welcome',
    stepNumber: 1,
    totalSteps: 5,
    phaseLabel: '01 // IMMERSIVE SPACE',
    title: 'Welcome to Explore the Space.',
    description: 'You have left Mission Control and entered open deep space. Surrounding you is an authentic, multi-tier cosmic environment rendered with physically grounded scale, depth, and lighting.',
    env: 'SOLAR_SYSTEM',
    cameraPos: [0, 80, 270],
    cameraTarget: [0, 0, 0],
    tip: 'Vast cosmos • Realistic stellar canopy • Zero interface clutter'
  },
  {
    id: 'look-around',
    stepNumber: 2,
    totalSteps: 5,
    phaseLabel: '02 // PERSPECTIVE & CONTROLS',
    title: 'Look around freely.',
    description: 'Space has no fixed horizon. Left-click and drag to orbit your celestial vantage point in full 360°, scroll or pinch to zoom across astronomical distances, and right-click to pan.',
    env: 'SOLAR_SYSTEM',
    cameraPos: [45, 55, 230],
    cameraTarget: [0, 0, 0],
    tip: 'Left Drag: Orbit 360° • Scroll: Zoom • Right Drag: Pan'
  },
  {
    id: 'solar-system',
    stepNumber: 3,
    totalSteps: 5,
    phaseLabel: '03 // SOLAR SYSTEM',
    title: 'Explore the Solar System.',
    description: 'A physically grounded heliocentric simulation. Notice the Sun’s inverse-square illumination, Earth with its atmospheric limb and cloud layer, planetary orbital geometries, and deep-space probes.',
    env: 'SOLAR_SYSTEM',
    cameraPos: [65, 36, 140],
    cameraTarget: [25, 0, 0],
    tip: 'Physically believable illumination • Scaled planetary surfaces'
  },
  {
    id: 'domains',
    stepNumber: 4,
    totalSteps: 5,
    phaseLabel: '04 // COSMIC NAVIGATION',
    title: 'Navigate Cosmic Domains.',
    description: 'Journey across the cosmos using the domain navigation below: switch between the Solar System, the Milky Way galactic dome, distant Galaxies, glowing Nebulas, filamentary Deep Space, and the Universe web.',
    env: 'MILKY_WAY',
    cameraPos: [0, 85, 260],
    cameraTarget: [0, 0, 0],
    tip: 'Select Solar System, Milky Way, Galaxies, Nebulas, Deep Space, or Universe'
  },
  {
    id: 'return',
    stepNumber: 5,
    totalSteps: 5,
    phaseLabel: '05 // RETURN TO CONSOLE',
    title: 'Return to Mission Control.',
    description: 'Whenever you wish to resume analyzing verified satellite telemetry and space weather, click "Return to Mission Control" at the top-left or press ESC to smoothly return to the console.',
    env: 'SOLAR_SYSTEM',
    cameraPos: [0, 75, 260],
    cameraTarget: [0, 0, 0],
    keyAction: {
      label: 'Return to Mission Control',
      tab: 'mission-control'
    },
    tip: 'Click Return to Mission Control at top-left or press ESC anytime'
  }
];

// ---------------------------------------------------------------------------
// Procedural Jupiter Atmosphere Texture Generator
// ---------------------------------------------------------------------------
let cachedJupiterTex: THREE.CanvasTexture | null = null;
function getProceduralJupiterTexture(): THREE.CanvasTexture {
  if (cachedJupiterTex) return cachedJupiterTex;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Base amber cream
  ctx.fillStyle = '#f5eedb';
  ctx.fillRect(0, 0, 1024, 512);

  // Belts and zones
  const bands = [
    { y: 60, h: 45, col: '#c87a38' },
    { y: 130, h: 55, col: '#9c5221' },
    { y: 210, h: 65, col: '#b86b2e' },
    { y: 300, h: 50, col: '#8b4513' },
    { y: 380, h: 40, col: '#c87a38' }
  ];

  bands.forEach(b => {
    ctx.fillStyle = b.col;
    for (let x = 0; x < 1024; x += 16) {
      const wave = Math.sin(x * 0.02) * 6 + Math.cos(x * 0.05) * 3;
      ctx.fillRect(x, b.y + wave, 18, b.h);
    }
  });

  // Great Red Spot
  ctx.fillStyle = '#b91c1c';
  ctx.beginPath();
  ctx.ellipse(650, 310, 48, 28, -0.15, 0, Math.PI * 2);
  ctx.fill();

  cachedJupiterTex = new THREE.CanvasTexture(canvas);
  return cachedJupiterTex;
}

// ---------------------------------------------------------------------------
// Subtle Procedural Web Audio Ambient Resonance Engine
// ---------------------------------------------------------------------------
class SubtleSpaceAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  public isMuted: boolean = false;

  public start() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      this.masterGain.gain.exponentialRampToValueAtTime(0.035, this.ctx.currentTime + 3.5);
      this.masterGain.connect(this.ctx.destination);

      // Lowpass filter for deep, quiet subterranean hum (75Hz cutoff)
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(75, this.ctx.currentTime);
      filter.Q.setValueAtTime(1.2, this.ctx.currentTime);
      filter.connect(this.masterGain);

      // Dual sine oscillators (48Hz and 52Hz creating subtle 4Hz spatial beat)
      this.osc1 = this.ctx.createOscillator();
      this.osc1.type = 'sine';
      this.osc1.frequency.setValueAtTime(48, this.ctx.currentTime);
      this.osc1.connect(filter);
      this.osc1.start();

      this.osc2 = this.ctx.createOscillator();
      this.osc2.type = 'sine';
      this.osc2.frequency.setValueAtTime(52, this.ctx.currentTime);
      this.osc2.connect(filter);
      this.osc2.start();
    } catch {
      // Audio autoplay policy fallback
    }
  }

  public setMute(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.035, this.ctx.currentTime);
    }
  }

  public stop() {
    try {
      if (this.masterGain && this.ctx) {
        this.masterGain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + 0.3);
      }
      setTimeout(() => {
        this.osc1?.stop();
        this.osc2?.stop();
        this.ctx?.close();
        this.ctx = null;
      }, 350);
    } catch {
      // Ignored
    }
  }
}

interface ExploreTheSpaceProps {
  onExit: (targetTab?: TabType) => void;
}

export const ExploreTheSpace: React.FC<ExploreTheSpaceProps> = ({ onExit }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeEnv, setActiveEnv] = useState<CosmicEnvironment>('SOLAR_SYSTEM');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Cinematic Entrance Progression
  // 'entering' (0-1.8s) -> 'settled' (1.8s+)
  const [entryPhase, setEntryPhase] = useState<'entering' | 'settled'>('entering');
  
  // THE FIRST WOW MOMENT: Walkthrough HUD remains completely hidden for initial 6.5s
  const [isWalkthroughReady, setIsWalkthroughReady] = useState(false);
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(true);
  const [isWalkthroughMinimized, setIsWalkthroughMinimized] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Audio State
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const audioEngineRef = useRef<SubtleSpaceAudioEngine | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const envGroupRef = useRef<THREE.Group | null>(null);
  const animIdRef = useRef<number>(0);
  const hideTimeoutRef = useRef<number | null>(null);

  // Smooth Camera Interpolation targets
  const targetCamPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 75, 260));
  const targetCamLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const isCameraLerping = useRef<boolean>(true);
  const lastUserInteractionTime = useRef<number>(Date.now());

  // Handle auto-hiding controls for distraction-free immersion
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    lastUserInteractionTime.current = Date.now();
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 4500);
  }, []);

  // -------------------------------------------------------------------------
  // Audio Initialization
  // -------------------------------------------------------------------------
  useEffect(() => {
    const audio = new SubtleSpaceAudioEngine();
    audioEngineRef.current = audio;
    audio.start();

    return () => {
      audio.stop();
    };
  }, []);

  const toggleAudio = useCallback(() => {
    if (!audioEngineRef.current) return;
    const nextMuted = !isAudioMuted;
    setIsAudioMuted(nextMuted);
    audioEngineRef.current.setMute(nextMuted);
  }, [isAudioMuted]);

  // -------------------------------------------------------------------------
  // Entrance Sequence & Automatic Walkthrough Trigger
  // -------------------------------------------------------------------------
  useEffect(() => {
    // 1.8s: Camera enters space and settles; canvas fully revealed
    const t1 = setTimeout(() => {
      setEntryPhase('settled');
    }, 1800);

    // Short settling moment after entry transition completes (~500ms after settled).
    // The interactive spatial walkthrough automatically begins inside Explore the Space!
    const t2 = setTimeout(() => {
      setIsWalkthroughReady(true);
      setIsWalkthroughActive(true);
      setIsWalkthroughMinimized(false);
      setCurrentStepIndex(0);
    }, 2300);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Procedural Environment Builders
  // -------------------------------------------------------------------------

  // 1. SOLAR SYSTEM WITH REALISTIC PLANETS & AUTHENTIC SPACECRAFT
  const buildSolarSystem = (group: THREE.Group) => {
    // 1a. The Sun (Physically believable brilliant star)
    const sunGeo = new THREE.SphereGeometry(14, 48, 48);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    group.add(sunMesh);

    // Inner Corona Halo (Additive warm incandescence)
    const innerCoronaGeo = new THREE.SphereGeometry(18, 36, 36);
    const innerCoronaMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const innerCorona = new THREE.Mesh(innerCoronaGeo, innerCoronaMat);
    group.add(innerCorona);

    // Outer Atmospheric Falloff Glow
    const outerCoronaGeo = new THREE.SphereGeometry(32, 36, 36);
    const outerCoronaMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.16,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    });
    const outerCorona = new THREE.Mesh(outerCoronaGeo, outerCoronaMat);
    group.add(outerCorona);

    // Physically-Grounded Illumination
    const sunlight = new THREE.PointLight(0xffffff, 4.0, 4500, 1.2);
    sunlight.position.set(0, 0, 0);
    group.add(sunlight);

    // Deep Vacuum Ambient (Subtle cosmic starlight fill)
    const cosmicAmbient = new THREE.AmbientLight(0x0a1628, 0.45);
    group.add(cosmicAmbient);

    // 1b. Planets Array
    const planetsData = [
      { id: 'mercury', r: 2.2, d: 38, col: 0xa8a29e, spd: 0.015, rough: 0.8 },
      { id: 'venus', r: 3.8, d: 58, col: 0xfef3c7, spd: 0.011, rough: 0.6 },
      { id: 'earth', r: 4.2, d: 82, col: 0x38bdf8, spd: 0.008, isEarth: true },
      { id: 'mars', r: 2.8, d: 112, col: 0xb91c1c, spd: 0.006, isMars: true },
      { id: 'jupiter', r: 9.5, d: 165, col: 0xd97706, spd: 0.0035, isJupiter: true },
      { id: 'saturn', r: 7.8, d: 220, col: 0xfef08a, spd: 0.0025, hasRings: true },
      { id: 'uranus', r: 5.5, d: 275, col: 0xa5f3fc, spd: 0.0018, rough: 0.5 },
      { id: 'neptune', r: 5.2, d: 325, col: 0x3b82f6, spd: 0.0012, rough: 0.5 }
    ];

    const planetMeshes: Array<{ mesh: THREE.Mesh; orbitGroup: THREE.Group; spd: number; cloudMesh?: THREE.Mesh }> = [];

    planetsData.forEach((p) => {
      const orbitGroup = new THREE.Group();
      group.add(orbitGroup);

      const pGeo = new THREE.SphereGeometry(p.r, 36, 36);
      let pMat: THREE.Material;

      if (p.isEarth) {
        const earthTex = getRealisticEarthDayTexture();
        pMat = new THREE.MeshStandardMaterial({
          map: earthTex,
          roughness: 0.55,
          metalness: 0.1
        });
      } else if (p.isJupiter) {
        const jupTex = getProceduralJupiterTexture();
        pMat = new THREE.MeshStandardMaterial({
          map: jupTex,
          roughness: 0.7,
          metalness: 0.05
        });
      } else if (p.isMars) {
        pMat = new THREE.MeshStandardMaterial({
          color: 0x991b1b,
          roughness: 0.85,
          metalness: 0.1
        });
      } else {
        pMat = new THREE.MeshStandardMaterial({
          color: p.col,
          roughness: p.rough || 0.65,
          metalness: 0.1
        });
      }

      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(p.d, 0, 0);
      orbitGroup.add(pMesh);

      let cloudMesh: THREE.Mesh | undefined;

      // Realistic Earth: Atmospheric cloud layer and Moon
      if (p.isEarth) {
        cloudMesh = createRealisticCloudMesh(p.r);
        pMesh.add(cloudMesh);

        // Natural Moon
        const moonGeo = new THREE.SphereGeometry(0.9, 18, 18);
        const moonMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.85 });
        const moonMesh = new THREE.Mesh(moonGeo, moonMat);
        moonMesh.position.set(8.5, 0.8, 3.2);
        pMesh.add(moonMesh);
      }

      // Realistic Saturn Rings with Cassini division
      if (p.hasRings) {
        const ringGeo = new THREE.RingGeometry(p.r * 1.35, p.r * 2.35, 64);
        const ringMat = new THREE.MeshStandardMaterial({
          color: 0xca8a04,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.68,
          roughness: 0.4
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.35;
        pMesh.add(ringMesh);
      }

      // Thin, authentic Keplerian orbital line
      const trailPts: THREE.Vector3[] = [];
      for (let a = 0; a <= 96; a++) {
        const theta = (a / 96) * Math.PI * 2;
        trailPts.push(new THREE.Vector3(Math.cos(theta) * p.d, 0, Math.sin(theta) * p.d));
      }
      const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts);
      const trailMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.1
      });
      const trailLine = new THREE.Line(trailGeo, trailMat);
      group.add(trailLine);

      planetMeshes.push({ mesh: pMesh, orbitGroup, spd: p.spd, cloudMesh });
    });

    // Asteroid Belt: 2,200 particle rocks between Mars and Jupiter
    const astCount = 2200;
    const astPositions = new Float32Array(astCount * 3);
    const astColors = new Float32Array(astCount * 3);
    for (let i = 0; i < astCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 132 + Math.random() * 26;
      const height = (Math.random() - 0.5) * 7;
      astPositions[i * 3] = Math.cos(angle) * radius;
      astPositions[i * 3 + 1] = height;
      astPositions[i * 3 + 2] = Math.sin(angle) * radius;

      const shade = 0.45 + Math.random() * 0.4;
      astColors[i * 3] = shade;
      astColors[i * 3 + 1] = shade;
      astColors[i * 3 + 2] = shade * 1.05;
    }
    const astGeo = new THREE.BufferGeometry();
    astGeo.setAttribute('position', new THREE.BufferAttribute(astPositions, 3));
    astGeo.setAttribute('color', new THREE.BufferAttribute(astColors, 3));
    const astMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.6
    });
    const asteroidBelt = new THREE.Points(astGeo, astMat);
    group.add(asteroidBelt);

    // 1c. Authentic Deep Spacecraft: Voyager 1 Blueprint Model
    const spacecraft = getSpacecraft3DModel('voyager-1', { scale: 0.85 });
    spacecraft.position.set(-35, 12, 55);
    spacecraft.rotation.y = 0.6;
    spacecraft.rotation.x = 0.15;
    group.add(spacecraft);

    // Subtle Cyan Telemetry Beacon on probe
    const beacon = new THREE.PointLight(0x38bdf8, 1.2, 30);
    beacon.position.set(-35, 13.5, 55);
    group.add(beacon);

    // Per-frame animation hook
    group.userData.update = () => {
      sunMesh.rotation.y += 0.0015;
      innerCorona.rotation.y -= 0.001;
      asteroidBelt.rotation.y += 0.0003;
      planetMeshes.forEach(p => {
        p.orbitGroup.rotation.y += p.spd * 0.35;
        p.mesh.rotation.y += 0.008;
        if (p.cloudMesh) p.cloudMesh.rotation.y += 0.0012;
      });
      spacecraft.rotation.y += 0.002;
      spacecraft.position.y = 12 + Math.sin(Date.now() * 0.0012) * 0.6;
      beacon.intensity = 1.0 + Math.sin(Date.now() * 0.004) * 0.4;
    };
  };

  // 2. MILKY WAY (Using authentic multi-layer dome and galactic starfield)
  const buildMilkyWay = (group: THREE.Group) => {
    const domeMesh = createMilkyWayDome();
    group.add(domeMesh);

    const starfield = createRealisticStarfield();
    group.add(starfield);

    group.userData.update = () => {
      domeMesh.rotation.y += 0.0001;
      starfield.rotation.y += 0.0002;
    };
  };

  // 3. GALAXIES
  const buildGalaxies = (group: THREE.Group) => {
    const armCount = 2;
    const starsPerArm = 8500;
    const totalStars = armCount * starsPerArm + 4500;
    const pos = new Float32Array(totalStars * 3);
    const cols = new Float32Array(totalStars * 3);

    let ptr = 0;

    for (let arm = 0; arm < armCount; arm++) {
      const armOffset = (arm * Math.PI * 2) / armCount;
      for (let i = 0; i < starsPerArm; i++) {
        const progress = i / starsPerArm;
        const r = Math.pow(progress, 1.35) * 480;
        const theta = r * 0.024 + armOffset;

        const spread = 24 * progress;
        const x = Math.cos(theta) * r + (Math.random() - 0.5) * spread;
        const y = (Math.random() - 0.5) * (18 * (1 - progress));
        const z = Math.sin(theta) * r + (Math.random() - 0.5) * spread;

        pos[ptr * 3] = x;
        pos[ptr * 3 + 1] = y;
        pos[ptr * 3 + 2] = z;

        cols[ptr * 3] = 0.5 + Math.random() * 0.3;
        cols[ptr * 3 + 1] = 0.7 + Math.random() * 0.25;
        cols[ptr * 3 + 2] = 1.0;
        ptr++;
      }
    }

    for (let i = 0; i < 4500; i++) {
      const r = Math.pow(Math.random(), 2) * 75;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 22;

      pos[ptr * 3] = Math.cos(theta) * r;
      pos[ptr * 3 + 1] = y;
      pos[ptr * 3 + 2] = Math.sin(theta) * r;

      cols[ptr * 3] = 1.0;
      cols[ptr * 3 + 1] = 0.88;
      cols[ptr * 3 + 2] = 0.6;
      ptr++;
    }

    const galGeo = new THREE.BufferGeometry();
    galGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    galGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const galMat = new THREE.PointsMaterial({
      size: 2.0,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });
    const mainGalaxy = new THREE.Points(galGeo, galMat);
    mainGalaxy.rotation.x = 0.45;
    mainGalaxy.rotation.z = 0.2;
    group.add(mainGalaxy);

    const dwarfCount = 1500;
    const dPos = new Float32Array(dwarfCount * 3);
    const dCols = new Float32Array(dwarfCount * 3);
    for (let i = 0; i < dwarfCount; i++) {
      dPos[i * 3] = 280 + (Math.random() - 0.5) * 60;
      dPos[i * 3 + 1] = 120 + (Math.random() - 0.5) * 40;
      dPos[i * 3 + 2] = -180 + (Math.random() - 0.5) * 60;

      dCols[i * 3] = 0.9;
      dCols[i * 3 + 1] = 0.85;
      dCols[i * 3 + 2] = 0.8;
    }
    const dwarfGeo = new THREE.BufferGeometry();
    dwarfGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
    dwarfGeo.setAttribute('color', new THREE.BufferAttribute(dCols, 3));
    const dwarfMat = new THREE.PointsMaterial({ size: 1.6, vertexColors: true, transparent: true, opacity: 0.7 });
    const dwarfGalaxy = new THREE.Points(dwarfGeo, dwarfMat);
    group.add(dwarfGalaxy);

    group.userData.update = () => {
      mainGalaxy.rotation.y += 0.0006;
      dwarfGalaxy.rotation.y += 0.0002;
    };
  };

  // 4. NEBULAS
  const buildNebulas = (group: THREE.Group) => {
    const cloudCount = 7000;
    const pos = new Float32Array(cloudCount * 3);
    const cols = new Float32Array(cloudCount * 3);

    for (let i = 0; i < cloudCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 260;

      const wave = Math.sin(theta * 3) * Math.cos(phi * 2) * 45;
      const rad = r + wave;

      pos[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = (rad * Math.sin(phi) * Math.sin(theta)) * 0.7;
      pos[i * 3 + 2] = rad * Math.cos(phi);

      if (rad < 100) {
        cols[i * 3] = 0.15;
        cols[i * 3 + 1] = 0.85;
        cols[i * 3 + 2] = 0.95;
      } else if (rad < 190) {
        cols[i * 3] = 0.85;
        cols[i * 3 + 1] = 0.2;
        cols[i * 3 + 2] = 0.65;
      } else {
        cols[i * 3] = 0.35;
        cols[i * 3 + 1] = 0.15;
        cols[i * 3 + 2] = 0.65;
      }
    }

    const nebGeo = new THREE.BufferGeometry();
    nebGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    nebGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const nebMat = new THREE.PointsMaterial({
      size: 4.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending
    });
    const nebulaClouds = new THREE.Points(nebGeo, nebMat);
    group.add(nebulaClouds);

    group.userData.update = () => {
      nebulaClouds.rotation.y += 0.0004;
    };
  };

  // 5. DEEP SPACE
  const buildDeepSpace = (group: THREE.Group) => {
    const starfield = createRealisticStarfield();
    group.add(starfield);

    const filPts: THREE.Vector3[] = [];
    for (let f = 0; f < 14; f++) {
      const p1 = new THREE.Vector3((Math.random() - 0.5) * 800, (Math.random() - 0.5) * 500, (Math.random() - 0.5) * 800);
      const p2 = p1.clone().add(new THREE.Vector3((Math.random() - 0.5) * 300, (Math.random() - 0.5) * 200, (Math.random() - 0.5) * 300));
      filPts.push(p1, p2);
    }
    const filGeo = new THREE.BufferGeometry().setFromPoints(filPts);
    const filMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.04
    });
    const filaments = new THREE.LineSegments(filGeo, filMat);
    group.add(filaments);

    group.userData.update = () => {
      starfield.rotation.y += 0.0001;
    };
  };

  // 6. UNIVERSE (Cosmic Web)
  const buildUniverse = (group: THREE.Group) => {
    const clusterCount = 120;
    const totalPoints = clusterCount * 80;
    const pos = new Float32Array(totalPoints * 3);
    const cols = new Float32Array(totalPoints * 3);

    let ptr = 0;
    const nodes: THREE.Vector3[] = [];

    for (let n = 0; n < clusterCount; n++) {
      const node = new THREE.Vector3(
        (Math.random() - 0.5) * 750,
        (Math.random() - 0.5) * 450,
        (Math.random() - 0.5) * 750
      );
      nodes.push(node);
    }

    for (let n = 0; n < clusterCount; n++) {
      const nodeA = nodes[n];
      const nodeB = nodes[(n + 1) % clusterCount];

      for (let s = 0; s < 80; s++) {
        const t = s / 80;
        const basePt = new THREE.Vector3().lerpVectors(nodeA, nodeB, t);
        const scatter = 20 * Math.sin(t * Math.PI) + 4;

        pos[ptr * 3] = basePt.x + (Math.random() - 0.5) * scatter;
        pos[ptr * 3 + 1] = basePt.y + (Math.random() - 0.5) * scatter;
        pos[ptr * 3 + 2] = basePt.z + (Math.random() - 0.5) * scatter;

        cols[ptr * 3] = 0.75 + Math.random() * 0.25;
        cols[ptr * 3 + 1] = 0.65 + Math.random() * 0.3;
        cols[ptr * 3 + 2] = 0.95;
        ptr++;
      }
    }

    const uniGeo = new THREE.BufferGeometry();
    uniGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    uniGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const uniMat = new THREE.PointsMaterial({
      size: 2.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    const cosmicWeb = new THREE.Points(uniGeo, uniMat);
    group.add(cosmicWeb);

    group.userData.update = () => {
      cosmicWeb.rotation.y += 0.0002;
    };
  };

  // -------------------------------------------------------------------------
  // Mount Three.js Scene
  // -------------------------------------------------------------------------
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010206);
    sceneRef.current = scene;

    // Atmospheric deep space starfield always in background
    const bgStarfield = createRealisticStarfield();
    scene.add(bgStarfield);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 9500);
    // Initial entrance camera position
    camera.position.set(0, 180, 520);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.04;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.85;
    controls.minDistance = 15;
    controls.maxDistance = 1400;
    controlsRef.current = controls;

    const onControlsStart = () => {
      isCameraLerping.current = false;
      lastUserInteractionTime.current = Date.now();
    };
    controls.addEventListener('start', onControlsStart);

    // Environment Container Group
    const envGroup = new THREE.Group();
    scene.add(envGroup);
    envGroupRef.current = envGroup;

    // Build Initial Environment
    buildSolarSystem(envGroup);

    // Initial camera target: smoothly glides from 520 into 260
    targetCamPos.current = new THREE.Vector3(0, 75, 260);
    targetCamLookAt.current = new THREE.Vector3(0, 0, 0);
    isCameraLerping.current = true;

    // Animation Loop
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);

      if (envGroup.userData?.update) {
        envGroup.userData.update();
      }

      bgStarfield.rotation.y += 0.00008;

      // Smooth cinematic camera lerp
      if (isCameraLerping.current && camera && controls) {
        camera.position.lerp(targetCamPos.current, 0.038);
        controls.target.lerp(targetCamLookAt.current, 0.038);
        if (camera.position.distanceTo(targetCamPos.current) < 0.35) {
          isCameraLerping.current = false;
        }
      } else if (Date.now() - lastUserInteractionTime.current > 4000) {
        // Slow majestic ambient drift when idle
        const time = Date.now() * 0.0003;
        camera.position.x += Math.sin(time) * 0.03;
        camera.position.y += Math.cos(time * 0.8) * 0.02;
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    resetControlsTimer();

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      controls.removeEventListener('start', onControlsStart);
      if (hideTimeoutRef.current) window.clearTimeout(hideTimeoutRef.current);
      controls.dispose();
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // -------------------------------------------------------------------------
  // Switch Environment with Smooth Transition
  // -------------------------------------------------------------------------
  const switchEnvironment = useCallback((newEnv: CosmicEnvironment, resetCamera = true) => {
    if (newEnv === activeEnv && !resetCamera) return;
    setIsTransitioning(true);
    resetControlsTimer();

    const envGroup = envGroupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!envGroup || !camera || !controls) return;

    setTimeout(() => {
      while (envGroup.children.length > 0) {
        const obj = envGroup.children[0];
        envGroup.remove(obj);
        if ('geometry' in obj && obj.geometry) (obj.geometry as THREE.BufferGeometry).dispose();
        if ('material' in obj && obj.material) {
          const mat = obj.material;
          if (Array.isArray(mat)) mat.forEach(m => m.dispose());
          else (mat as THREE.Material).dispose();
        }
      }

      switch (newEnv) {
        case 'SOLAR_SYSTEM':
          buildSolarSystem(envGroup);
          if (resetCamera) {
            targetCamPos.current = new THREE.Vector3(0, 75, 260);
            targetCamLookAt.current = new THREE.Vector3(0, 0, 0);
            isCameraLerping.current = true;
          }
          break;
        case 'MILKY_WAY':
          buildMilkyWay(envGroup);
          if (resetCamera) {
            targetCamPos.current = new THREE.Vector3(0, 110, 360);
            targetCamLookAt.current = new THREE.Vector3(0, 0, 0);
            isCameraLerping.current = true;
          }
          break;
        case 'GALAXIES':
          buildGalaxies(envGroup);
          if (resetCamera) {
            targetCamPos.current = new THREE.Vector3(0, 150, 420);
            targetCamLookAt.current = new THREE.Vector3(0, 0, 0);
            isCameraLerping.current = true;
          }
          break;
        case 'NEBULAS':
          buildNebulas(envGroup);
          if (resetCamera) {
            targetCamPos.current = new THREE.Vector3(0, 50, 240);
            targetCamLookAt.current = new THREE.Vector3(0, 0, 0);
            isCameraLerping.current = true;
          }
          break;
        case 'DEEP_SPACE':
          buildDeepSpace(envGroup);
          if (resetCamera) {
            targetCamPos.current = new THREE.Vector3(0, 30, 200);
            targetCamLookAt.current = new THREE.Vector3(0, 0, 0);
            isCameraLerping.current = true;
          }
          break;
        case 'UNIVERSE':
          buildUniverse(envGroup);
          if (resetCamera) {
            targetCamPos.current = new THREE.Vector3(0, 200, 600);
            targetCamLookAt.current = new THREE.Vector3(0, 0, 0);
            isCameraLerping.current = true;
          }
          break;
      }

      setActiveEnv(newEnv);
      setIsTransitioning(false);
    }, 280);
  }, [activeEnv, resetControlsTimer]);

  // -------------------------------------------------------------------------
  // Walkthrough Navigation
  // -------------------------------------------------------------------------
  const goToStep = useCallback((idx: number) => {
    if (idx < 0 || idx >= SPATIAL_WALKTHROUGH_STEPS.length) return;
    setCurrentStepIndex(idx);
    const step = SPATIAL_WALKTHROUGH_STEPS[idx];

    targetCamPos.current = new THREE.Vector3(...step.cameraPos);
    targetCamLookAt.current = new THREE.Vector3(...step.cameraTarget);
    isCameraLerping.current = true;

    if (step.env !== activeEnv) {
      switchEnvironment(step.env, false);
    }
  }, [activeEnv, switchEnvironment]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < SPATIAL_WALKTHROUGH_STEPS.length - 1) {
      goToStep(currentStepIndex + 1);
    } else {
      setIsWalkthroughMinimized(true);
    }
  }, [currentStepIndex, goToStep]);

  const handlePrevStep = useCallback(() => {
    if (currentStepIndex > 0) {
      goToStep(currentStepIndex - 1);
    }
  }, [currentStepIndex, goToStep]);

  // -------------------------------------------------------------------------
  // Graceful Exit Handling
  // -------------------------------------------------------------------------
  const handleExit = useCallback((targetTab?: TabType) => {
    setIsExiting(true);
    audioEngineRef.current?.stop();
    setTimeout(() => {
      onExit(targetTab);
    }, 350);
  }, [onExit]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isWalkthroughActive && !isWalkthroughMinimized) {
          setIsWalkthroughMinimized(true);
        } else {
          handleExit('mission-control');
        }
      } else if (e.key === 'ArrowRight' && isWalkthroughActive && !isWalkthroughMinimized) {
        handleNextStep();
      } else if (e.key === 'ArrowLeft' && isWalkthroughActive && !isWalkthroughMinimized) {
        handlePrevStep();
      } else if (e.key.toLowerCase() === 'm') {
        toggleAudio();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWalkthroughActive, isWalkthroughMinimized, handleNextStep, handlePrevStep, handleExit, toggleAudio]);

  const currentStep = SPATIAL_WALKTHROUGH_STEPS[currentStepIndex];

  return (
    <div
      onMouseMove={resetControlsTimer}
      onTouchStart={resetControlsTimer}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#010206',
        overflow: 'hidden',
        userSelect: 'none',
        fontFamily: 'var(--font-sans)',
        cursor: 'grab'
      }}
    >
      {/* Three.js Canvas Container */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* 1. Cinematic Hyper-Space Entry Veil: Leaving Mission Control */}
      {entryPhase === 'entering' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#010206',
          zIndex: 50,
          pointerEvents: 'none',
          animation: 'spaceEntryTransition 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '2px solid rgba(56, 189, 248, 0.25)',
            borderTopColor: 'var(--accent-cyan)',
            animation: 'spacePulseSpin 1s linear infinite'
          }} />
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.22em',
            color: 'var(--accent-cyan)',
            textTransform: 'uppercase'
          }}>
            CROSSING INTERFACE // ENTERING DEEP SPACE
          </div>
        </div>
      )}

      {/* 2. Graceful Exit Transition Veil */}
      {isExiting && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#010206',
          zIndex: 60,
          pointerEvents: 'none',
          animation: 'spacePulseFadeIn 0.35s ease forwards'
        }} />
      )}

      {/* 3. Cosmic Warp / Environment Switch Transition Veil */}
      {isTransitioning && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(1, 2, 6, 0.85)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.25s ease',
          pointerEvents: 'none',
          zIndex: 30
        }} />
      )}

      {/* 4. Top Header Bar: Discoverable "Return to Mission Control" + Ambient Controls */}
      <div style={{
        position: 'absolute',
        top: 'max(16px, var(--sat))',
        left: 'max(16px, var(--sal))',
        right: 'max(16px, var(--sar))',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px',
        pointerEvents: 'none',
        transition: 'opacity 0.4s ease',
        opacity: controlsVisible ? 1 : 0.25
      }}>
        {/* Subtle, discoverable Return to Mission Control control */}
        <button
          onClick={() => handleExit('mission-control')}
          className="btn"
          style={{
            pointerEvents: 'auto',
            background: 'rgba(4, 10, 20, 0.8)',
            backdropFilter: 'blur(16px)',
            border: currentStep?.id === 'return' 
              ? '1px solid rgba(56, 189, 248, 0.8)' 
              : '1px solid rgba(56, 189, 248, 0.3)',
            color: '#f8fafc',
            padding: '8px 16px',
            fontSize: '12px',
            fontFamily: 'var(--font-heading)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            minHeight: '38px',
            touchAction: 'manipulation',
            borderRadius: 'var(--radius-full)',
            boxShadow: currentStep?.id === 'return'
              ? '0 0 25px rgba(56, 189, 248, 0.45), 0 8px 24px rgba(0, 0, 0, 0.7)'
              : '0 8px 24px rgba(0, 0, 0, 0.7), 0 0 15px rgba(56, 189, 248, 0.12)',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}
          title="Return to SpacePulse Mission Control (ESC)"
        >
          <ArrowLeft size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>Return to Mission Control</span>
        </button>

        {/* Right Status Indicators & Ambient Sound Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          pointerEvents: 'auto'
        }}>
          {/* Subtle Ambient Cosmic Sound Toggle */}
          <button
            onClick={toggleAudio}
            style={{
              background: 'rgba(4, 10, 20, 0.75)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: isAudioMuted ? 'var(--text-muted)' : 'var(--accent-cyan)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              minHeight: '36px',
              touchAction: 'manipulation',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title={isAudioMuted ? 'Unmute Deep Space Ambience (M)' : 'Mute Deep Space Ambience (M)'}
          >
            {isAudioMuted ? <VolumeX size={13} /> : <Volume2 size={13} />}
            <span>{isAudioMuted ? 'AUDIO: OFF' : 'AUDIO: SUBTLE'}</span>
          </button>

          {/* Reopen Walkthrough HUD Pill if Minimized */}
          {isWalkthroughReady && (!isWalkthroughActive || isWalkthroughMinimized) && (
            <button
              onClick={() => {
                setIsWalkthroughActive(true);
                setIsWalkthroughMinimized(false);
              }}
              style={{
                background: 'rgba(56, 189, 248, 0.12)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: 'var(--accent-cyan)',
                padding: '6px 14px',
                borderRadius: 'var(--radius-full)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                minHeight: '36px',
                touchAction: 'manipulation',
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.5), 0 0 10px rgba(56, 189, 248, 0.12)',
                backdropFilter: 'blur(12px)'
              }}
              title="Open Spatial Mission Walkthrough"
            >
              <Compass size={13} />
              <span>SPATIAL GUIDE ({currentStepIndex + 1}/{SPATIAL_WALKTHROUGH_STEPS.length})</span>
            </button>
          )}

          <div 
            className="canopy-simulation-badge"
            style={{
              background: 'rgba(4, 10, 20, 0.75)',
              backdropFilter: 'blur(14px)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-full)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)'
            }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--status-live)',
              boxShadow: '0 0 8px var(--status-live)'
            }} />
            <span>REALISTIC SIMULATION // 1:1 CANOPY</span>
          </div>
        </div>
      </div>

      {/* 5. Spatial Walkthrough Floating Aerospace HUD (Appears only after initial wow moment) */}
      {isWalkthroughReady && isWalkthroughActive && !isWalkthroughMinimized && (
        <div style={{
          position: 'absolute',
          bottom: 'calc(84px + var(--sab))',
          left: 'max(16px, var(--sal))',
          zIndex: 25,
          width: '420px',
          maxWidth: 'calc(100vw - 32px)',
          maxHeight: 'calc(100dvh - 170px)',
          overflowY: 'auto',
          background: 'rgba(4, 10, 20, 0.92)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 1px rgba(255, 255, 255, 0.15)',
          padding: '16px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          animation: 'walkthroughHudFadeIn 0.4s ease',
          pointerEvents: 'auto'
        }}>
          {/* Top Phase Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              letterSpacing: '0.12em',
              color: 'var(--accent-cyan)',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              padding: '2px 8px',
              borderRadius: '3px',
              fontWeight: 600
            }}>
              {currentStep.phaseLabel}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setIsWalkthroughMinimized(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  minWidth: '32px',
                  minHeight: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation'
                }}
                title="Minimize Guide (Free Contemplation)"
              >
                <Minimize2 size={13} />
              </button>
              <button
                onClick={() => setIsWalkthroughActive(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '6px',
                  minWidth: '32px',
                  minHeight: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  touchAction: 'manipulation'
                }}
                title="Dismiss Guide"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Title and Short Story Description */}
          <div>
            <h2 style={{
              margin: '0 0 4px 0',
              fontSize: '15px',
              fontWeight: 600,
              color: '#ffffff',
              letterSpacing: '-0.01em',
              fontFamily: 'var(--font-heading)'
            }}>
              {currentStep.title}
            </h2>
            <p style={{
              margin: 0,
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5
            }}>
              {currentStep.description}
            </p>
          </div>

          {/* Contextual Guidance Micro-Pill */}
          <div style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-cyan)',
            background: 'rgba(56, 189, 248, 0.06)',
            border: '1px solid rgba(56, 189, 248, 0.18)',
            padding: '5px 10px',
            borderRadius: '4px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>✦</span>
            <span>{currentStep.tip}</span>
          </div>

          {/* Segmented Step Progression Dots */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '2px 0' }}>
            {SPATIAL_WALKTHROUGH_STEPS.map((s, idx) => {
              const isSelected = idx === currentStepIndex;
              const isPassed = idx < currentStepIndex;
              return (
                <button
                  key={s.id}
                  onClick={() => goToStep(idx)}
                  style={{
                    flex: 1,
                    height: '4px',
                    borderRadius: '2px',
                    background: isSelected 
                      ? 'var(--accent-cyan)' 
                      : isPassed 
                      ? 'rgba(56, 189, 248, 0.4)' 
                      : 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                    transition: 'all 0.25s ease'
                  }}
                  title={`Step ${idx + 1}: ${s.title}`}
                />
              );
            })}
          </div>

          {/* Action Row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-hairline)',
            gap: '8px'
          }}>
            <button
              onClick={handlePrevStep}
              disabled={currentStepIndex === 0}
              className="btn btn-secondary"
              style={{
                fontSize: '11px',
                padding: '6px 12px',
                minHeight: '36px',
                touchAction: 'manipulation',
                opacity: currentStepIndex === 0 ? 0.3 : 1,
                cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={13} />
              <span>Back</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {currentStep.keyAction && currentStep.keyAction.tab !== 'mission-control' && (
                <button
                  onClick={() => handleExit(currentStep.keyAction?.tab)}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '11px',
                    padding: '6px 12px',
                    minHeight: '36px',
                    touchAction: 'manipulation',
                    color: 'var(--accent-cyan)',
                    border: '1px solid rgba(56, 189, 248, 0.35)',
                    background: 'rgba(56, 189, 248, 0.08)'
                  }}
                >
                  <span>{currentStep.keyAction.label}</span>
                  <ChevronRight size={12} />
                </button>
              )}

              {currentStepIndex < SPATIAL_WALKTHROUGH_STEPS.length - 1 ? (
                <button
                  onClick={handleNextStep}
                  className="btn btn-primary"
                  style={{
                    fontSize: '11px',
                    padding: '6px 14px',
                    minHeight: '36px',
                    touchAction: 'manipulation',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4)'
                  }}
                >
                  <span>Next</span>
                  <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  onClick={() => handleExit('mission-control')}
                  className="btn btn-primary"
                  style={{
                    fontSize: '11px',
                    padding: '6px 14px',
                    minHeight: '36px',
                    touchAction: 'manipulation',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.5), 0 0 10px rgba(56, 189, 248, 0.15)'
                  }}
                >
                  <span>Return to Mission Control</span>
                  <Sparkles size={13} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 6. Bottom Center: Minimal Cosmic Domain Selector (Highlighted on Step 4) */}
      <div style={{
        position: 'absolute',
        bottom: 'max(16px, var(--sab))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        transition: 'all 0.4s ease',
        opacity: (controlsVisible || isWalkthroughActive) ? 1 : 0.25,
        pointerEvents: (controlsVisible || isWalkthroughActive) ? 'auto' : 'none',
        maxWidth: 'calc(100vw - 24px)',
        width: 'max-content'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(4, 10, 20, 0.88)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: currentStep?.id === 'domains' 
            ? '1px solid rgba(56, 189, 248, 0.45)' 
            : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: currentStep?.id === 'domains'
            ? '0 0 16px rgba(56, 189, 248, 0.2), 0 8px 32px rgba(0, 0, 0, 0.75)'
            : '0 8px 32px rgba(0, 0, 0, 0.75)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          overflowX: 'auto',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          maxWidth: 'calc(100vw - 24px)',
          touchAction: 'pan-x',
          transition: 'all 0.3s ease'
        }}>
          {[
            { id: 'SOLAR_SYSTEM', label: 'Solar System' },
            { id: 'MILKY_WAY', label: 'Milky Way' },
            { id: 'GALAXIES', label: 'Galaxies' },
            { id: 'NEBULAS', label: 'Nebulas' },
            { id: 'DEEP_SPACE', label: 'Deep Space' },
            { id: 'UNIVERSE', label: 'Universe' }
          ].map(env => {
            const isActive = activeEnv === env.id;
            return (
              <button
                key={env.id}
                onClick={() => switchEnvironment(env.id as CosmicEnvironment)}
                style={{
                  background: isActive ? 'rgba(56, 189, 248, 0.22)' : 'transparent',
                  border: isActive ? '1px solid rgba(56, 189, 248, 0.5)' : '1px solid transparent',
                  color: isActive ? '#ffffff' : 'var(--text-muted)',
                  borderRadius: 'var(--radius-full)',
                  padding: '6px 14px',
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  letterSpacing: '0.02em',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  minHeight: '34px',
                  touchAction: 'manipulation'
                }}
              >
                {env.label}
              </button>
            );
          })}
        </div>
      </div>

      <style>{`
        @keyframes walkthroughHudFadeIn {
          from { opacity: 0; transform: translateY(14px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes spacePulseSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes spacePulseFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes spaceEntryTransition {
          0% { opacity: 1; transform: scale(1.04); }
          50% { opacity: 0.95; }
          100% { opacity: 0; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};
