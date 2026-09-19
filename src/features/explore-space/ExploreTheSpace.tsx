import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  ArrowLeft, 
  Sparkles, 
  Compass, 
  Eye, 
  ChevronRight, 
  ChevronLeft, 
  Orbit, 
  Satellite, 
  Activity, 
  Database, 
  Radio, 
  X, 
  Minimize2,
  Maximize2
} from 'lucide-react';
import { getMilkyWayTexture } from '../../components/space/deepSpaceEnvironment';
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
    id: 'step-entry',
    stepNumber: 1,
    totalSteps: 6,
    phaseLabel: '01 // DEEP SPACE ENTRY',
    title: 'Welcome to SpacePulse in Deep Space',
    description: 'You have left the command deck and entered the deep-space simulation. Drag to rotate your celestial perspective, scroll or pinch to zoom, and right-click to pan freely.',
    env: 'SOLAR_SYSTEM',
    cameraPos: [0, 75, 260],
    cameraTarget: [0, 0, 0],
    tip: 'Mouse / Touch: Drag to Orbit • Scroll to Zoom • Right-click to Pan'
  },
  {
    id: 'step-solar-system',
    stepNumber: 2,
    totalSteps: 6,
    phaseLabel: '02 // CELESTIAL MECHANICS',
    title: 'Solar System & Planetary Orbits',
    description: 'Real-time heliocentric simulation rendered with Keplerian orbital planes. Planetary motions, orbital rings, and the asteroid belt simulate authentic celestial dynamics.',
    env: 'SOLAR_SYSTEM',
    cameraPos: [65, 45, 140],
    cameraTarget: [35, 0, 0],
    tip: 'Keplerian Orbits • Asteroid Belt • Heliocentric Reference Frame'
  },
  {
    id: 'step-spacecraft',
    stepNumber: 3,
    totalSteps: 6,
    phaseLabel: '03 // SPACECRAFT FLEET',
    title: 'Authentic Spacecraft & Active Missions',
    description: 'Track ISRO, NASA, and ESA deep space probes and satellites. Each spacecraft is rendered with accurate engineering structures and live orbital coordinates.',
    env: 'SOLAR_SYSTEM',
    cameraPos: [-36, 16, 75],
    cameraTarget: [-35, 12, 55],
    keyAction: {
      label: 'View Spacecraft Fleet',
      tab: 'spacecraft'
    },
    tip: 'Solar wings, communications dish, and propulsion arrays'
  },
  {
    id: 'step-space-map',
    stepNumber: 4,
    totalSteps: 6,
    phaseLabel: '04 // CARTOGRAPHY & EPHEMERIDES',
    title: 'Interactive Space Map & Inspector',
    description: 'Access thousands of verified satellites and deep space probes on the Space Map. Inspect comprehensive engineering dossiers, orbital elements, and live apogee/perigee telemetry.',
    env: 'MILKY_WAY',
    cameraPos: [0, 110, 360],
    cameraTarget: [0, 0, 0],
    keyAction: {
      label: 'Open Space Map',
      tab: 'space-map'
    },
    tip: 'J2000.0 Heliocentric / Geocentric Coordinate System'
  },
  {
    id: 'step-analysis',
    stepNumber: 5,
    totalSteps: 6,
    phaseLabel: '05 // ASTRODYNAMICS ENGINE',
    title: 'Scientific Vector Analysis & Light-Time',
    description: 'Calculate exact Euclidean geometric distances, relative velocity vectors, and one-way light transmission latencies between any two active missions across the solar system.',
    env: 'GALAXIES',
    cameraPos: [0, 150, 420],
    cameraTarget: [0, 0, 0],
    keyAction: {
      label: 'Launch Scientific Analysis',
      tab: 'analysis'
    },
    tip: 'Zero synthetic values • Direct ephemeris computation'
  },
  {
    id: 'step-return',
    stepNumber: 6,
    totalSteps: 6,
    phaseLabel: '06 // MISSION CONTROL CONSOLE',
    title: 'Command Deck & Authoritative Data',
    description: 'Return anytime to Mission Control to monitor live NOAA space weather geomagnetic alerts, CelesTrak orbital updates, and mission directory archives.',
    env: 'SOLAR_SYSTEM',
    cameraPos: [0, 75, 260],
    cameraTarget: [0, 0, 0],
    keyAction: {
      label: 'Return to Mission Control',
      tab: 'mission-control'
    },
    tip: 'Click Return to Mission Control at top-left anytime'
  }
];

interface ExploreTheSpaceProps {
  onExit: (targetTab?: TabType) => void;
}

export const ExploreTheSpace: React.FC<ExploreTheSpaceProps> = ({ onExit }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeEnv, setActiveEnv] = useState<CosmicEnvironment>('SOLAR_SYSTEM');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  // Entrance and settling states
  const [entryPhase, setEntryPhase] = useState<'entering' | 'settling' | 'settled'>('entering');
  const [isWalkthroughActive, setIsWalkthroughActive] = useState(true);
  const [isWalkthroughMinimized, setIsWalkthroughMinimized] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const envGroupRef = useRef<THREE.Group | null>(null);
  const animIdRef = useRef<number>(0);
  const hideTimeoutRef = useRef<number | null>(null);

  // Smooth camera lerp targets
  const targetCamPos = useRef<THREE.Vector3>(new THREE.Vector3(0, 75, 260));
  const targetCamLookAt = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 0));
  const isCameraLerping = useRef<boolean>(true);

  // Handle auto-hiding controls for distraction-free immersion
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 4500);
  }, []);

  // Entrance Settling Sequence
  useEffect(() => {
    const t1 = setTimeout(() => {
      setEntryPhase('settling');
    }, 500);

    const t2 = setTimeout(() => {
      setEntryPhase('settled');
    }, 1200);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Procedural Environment Builders
  // -------------------------------------------------------------------------

  // 1. SOLAR SYSTEM WITH SPACECRAFT PROBE
  const buildSolarSystem = (group: THREE.Group) => {
    // Central Sun
    const sunGeo = new THREE.SphereGeometry(14, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff7ed });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    group.add(sunMesh);

    // Glowing Sun Corona Halo
    const coronaGeo = new THREE.SphereGeometry(17, 32, 32);
    const coronaMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.28,
      side: THREE.BackSide
    });
    const coronaMesh = new THREE.Mesh(coronaGeo, coronaMat);
    group.add(coronaMesh);

    // Sunlight
    const pointLight = new THREE.PointLight(0xffffff, 3.5, 3000);
    pointLight.position.set(0, 0, 0);
    group.add(pointLight);

    const ambLight = new THREE.AmbientLight(0x0f172a, 0.6);
    group.add(ambLight);

    // Planetary definitions [radius, dist, color, speed, hasRings]
    const planetsData: Array<{ r: number; d: number; col: number; spd: number; rings?: boolean }> = [
      { r: 2.2, d: 38, col: 0x94a3b8, spd: 0.015 },  // Mercury
      { r: 3.8, d: 58, col: 0xfde047, spd: 0.011 },  // Venus
      { r: 4.2, d: 82, col: 0x38bdf8, spd: 0.008 },  // Earth
      { r: 2.8, d: 112, col: 0xf87171, spd: 0.006 }, // Mars
      { r: 9.5, d: 165, col: 0xd97706, spd: 0.0035 },// Jupiter
      { r: 7.8, d: 220, col: 0xfef08a, spd: 0.0025, rings: true }, // Saturn
      { r: 5.5, d: 275, col: 0x67e8f9, spd: 0.0018 },// Uranus
      { r: 5.2, d: 325, col: 0x3b82f6, spd: 0.0012 } // Neptune
    ];

    const planetMeshes: Array<{ mesh: THREE.Mesh; orbitGroup: THREE.Group; spd: number }> = [];

    planetsData.forEach((p) => {
      const orbitGroup = new THREE.Group();
      group.add(orbitGroup);

      const pGeo = new THREE.SphereGeometry(p.r, 24, 24);
      const pMat = new THREE.MeshStandardMaterial({
        color: p.col,
        roughness: 0.7,
        metalness: 0.1
      });
      const pMesh = new THREE.Mesh(pGeo, pMat);
      pMesh.position.set(p.d, (Math.random() - 0.5) * 4, 0);
      orbitGroup.add(pMesh);

      // Saturn Rings
      if (p.rings) {
        const ringGeo = new THREE.RingGeometry(p.r * 1.4, p.r * 2.4, 48);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xca8a04,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = Math.PI / 2.5;
        pMesh.add(ringMesh);
      }

      // Faint subtle orbital trail
      const trailPts: THREE.Vector3[] = [];
      for (let a = 0; a <= 64; a++) {
        const theta = (a / 64) * Math.PI * 2;
        trailPts.push(new THREE.Vector3(Math.cos(theta) * p.d, 0, Math.sin(theta) * p.d));
      }
      const trailGeo = new THREE.BufferGeometry().setFromPoints(trailPts);
      const trailMat = new THREE.LineBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.12
      });
      const trailLine = new THREE.Line(trailGeo, trailMat);
      group.add(trailLine);

      planetMeshes.push({ mesh: pMesh, orbitGroup, spd: p.spd });
    });

    // Asteroid Belt Particles
    const astCount = 1800;
    const astPositions = new Float32Array(astCount * 3);
    const astColors = new Float32Array(astCount * 3);
    for (let i = 0; i < astCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 130 + Math.random() * 25;
      const height = (Math.random() - 0.5) * 8;
      astPositions[i * 3] = Math.cos(angle) * radius;
      astPositions[i * 3 + 1] = height;
      astPositions[i * 3 + 2] = Math.sin(angle) * radius;

      const shade = 0.5 + Math.random() * 0.4;
      astColors[i * 3] = shade;
      astColors[i * 3 + 1] = shade;
      astColors[i * 3 + 2] = shade * 1.05;
    }
    const astGeo = new THREE.BufferGeometry();
    astGeo.setAttribute('position', new THREE.BufferAttribute(astPositions, 3));
    astGeo.setAttribute('color', new THREE.BufferAttribute(astColors, 3));
    const astMat = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.65
    });
    const asteroidBelt = new THREE.Points(astGeo, astMat);
    group.add(asteroidBelt);

    // Authentic Deep Space Probe Model
    const probeGroup = new THREE.Group();
    probeGroup.position.set(-35, 12, 55);

    // Gold Foil Multi-Layer Main Bus
    const busGeo = new THREE.BoxGeometry(3.6, 2.8, 2.8);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.85,
      roughness: 0.25
    });
    const busMesh = new THREE.Mesh(busGeo, busMat);
    probeGroup.add(busMesh);

    // High-Gain Parabolic Communications Dish
    const dishGeo = new THREE.CylinderGeometry(2.4, 0.4, 0.7, 24, 1, true);
    const dishMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.65,
      roughness: 0.3,
      side: THREE.DoubleSide
    });
    const dishMesh = new THREE.Mesh(dishGeo, dishMat);
    dishMesh.rotation.z = Math.PI / 2;
    dishMesh.position.set(2.2, 0, 0);
    probeGroup.add(dishMesh);

    // High-Gain Feed Horn
    const hornGeo = new THREE.CylinderGeometry(0.12, 0.12, 1.4);
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const hornMesh = new THREE.Mesh(hornGeo, hornMat);
    hornMesh.rotation.z = Math.PI / 2;
    hornMesh.position.set(3.2, 0, 0);
    probeGroup.add(hornMesh);

    // Dual Photovoltaic Solar Wings
    const wingGeo = new THREE.BoxGeometry(0.15, 2.2, 8.5);
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x0f2b48,
      metalness: 0.6,
      roughness: 0.25
    });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0, 0, 5.8);
    probeGroup.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.position.set(0, 0, -5.8);
    probeGroup.add(rightWing);

    // Scientific Instrument Boom
    const boomGeo = new THREE.CylinderGeometry(0.08, 0.08, 6);
    const boomMat = new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 0.8 });
    const boomMesh = new THREE.Mesh(boomGeo, boomMat);
    boomMesh.position.set(-3.2, -1.2, 0);
    boomMesh.rotation.z = Math.PI / 4;
    probeGroup.add(boomMesh);

    // Soft Telemetry Cyan Beacon
    const beaconLight = new THREE.PointLight(0x38bdf8, 1.4, 25);
    beaconLight.position.set(0, 1.6, 0);
    probeGroup.add(beaconLight);

    group.add(probeGroup);

    // Add per-frame animation hook
    group.userData.update = () => {
      sunMesh.rotation.y += 0.002;
      asteroidBelt.rotation.y += 0.0004;
      planetMeshes.forEach(p => {
        p.orbitGroup.rotation.y += p.spd * 0.4;
        p.mesh.rotation.y += 0.01;
      });
      probeGroup.rotation.y += 0.003;
      probeGroup.position.y = 12 + Math.sin(Date.now() * 0.0015) * 0.8;
    };
  };

  // 2. MILKY WAY
  const buildMilkyWay = (group: THREE.Group) => {
    const domeGeo = new THREE.SphereGeometry(1800, 32, 32);
    const domeTex = getMilkyWayTexture();
    const domeMat = new THREE.MeshBasicMaterial({
      map: domeTex,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.95
    });
    const domeMesh = new THREE.Mesh(domeGeo, domeMat);
    domeMesh.rotation.x = 0.45;
    group.add(domeMesh);

    // 24,000 Galactic Disc Stars
    const starCount = 24000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = Math.pow(Math.random(), 2.2) * 800;
      const theta = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * (180 * (1 - r / 900));

      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      if (r < 180) {
        colors[i * 3] = 1.0;
        colors[i * 3 + 1] = 0.85;
        colors[i * 3 + 2] = 0.65;
      } else {
        const bl = 0.7 + Math.random() * 0.3;
        colors[i * 3] = bl * 0.8;
        colors[i * 3 + 1] = bl * 0.9;
        colors[i * 3 + 2] = 1.0;
      }
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });
    const starField = new THREE.Points(starGeo, starMat);
    group.add(starField);

    // Central supermassive core glow
    const coreGeo = new THREE.SphereGeometry(45, 24, 24);
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffedd5,
      transparent: true,
      opacity: 0.55
    });
    const coreMesh = new THREE.Mesh(coreGeo, coreMat);
    group.add(coreMesh);

    group.userData.update = () => {
      starField.rotation.y += 0.0003;
      domeMesh.rotation.y += 0.0001;
    };
  };

  // 3. GALAXIES
  const buildGalaxies = (group: THREE.Group) => {
    const armCount = 2;
    const starsPerArm = 8000;
    const totalStars = armCount * starsPerArm + 4000;
    const pos = new Float32Array(totalStars * 3);
    const cols = new Float32Array(totalStars * 3);

    let ptr = 0;

    for (let arm = 0; arm < armCount; arm++) {
      const armOffset = (arm * Math.PI * 2) / armCount;
      for (let i = 0; i < starsPerArm; i++) {
        const progress = i / starsPerArm;
        const r = Math.pow(progress, 1.4) * 480;
        const theta = r * 0.025 + armOffset;

        const spread = 25 * progress;
        const x = Math.cos(theta) * r + (Math.random() - 0.5) * spread;
        const y = (Math.random() - 0.5) * (18 * (1 - progress));
        const z = Math.sin(theta) * r + (Math.random() - 0.5) * spread;

        pos[ptr * 3] = x;
        pos[ptr * 3 + 1] = y;
        pos[ptr * 3 + 2] = z;

        cols[ptr * 3] = 0.4 + Math.random() * 0.3;
        cols[ptr * 3 + 1] = 0.65 + Math.random() * 0.3;
        cols[ptr * 3 + 2] = 1.0;
        ptr++;
      }
    }

    for (let i = 0; i < 4000; i++) {
      const r = Math.pow(Math.random(), 2) * 75;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 22;

      pos[ptr * 3] = Math.cos(theta) * r;
      pos[ptr * 3 + 1] = y;
      pos[ptr * 3 + 2] = Math.sin(theta) * r;

      cols[ptr * 3] = 1.0;
      cols[ptr * 3 + 1] = 0.85;
      cols[ptr * 3 + 2] = 0.5;
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
        cols[i * 3 + 2] = 0.65;
        cols[i * 3 + 1] = 0.2;
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

    const protoCount = 350;
    const protoPos = new Float32Array(protoCount * 3);
    for (let i = 0; i < protoCount; i++) {
      protoPos[i * 3] = (Math.random() - 0.5) * 140;
      protoPos[i * 3 + 1] = (Math.random() - 0.5) * 80;
      protoPos[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    const protoGeo = new THREE.BufferGeometry();
    protoGeo.setAttribute('position', new THREE.BufferAttribute(protoPos, 3));
    const protoMat = new THREE.PointsMaterial({
      size: 2.8,
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    const protoStars = new THREE.Points(protoGeo, protoMat);
    group.add(protoStars);

    group.userData.update = () => {
      nebulaClouds.rotation.y += 0.0004;
      nebulaClouds.rotation.x += 0.0002;
    };
  };

  // 5. DEEP SPACE
  const buildDeepSpace = (group: THREE.Group) => {
    const starCount = 3500;
    const pos = new Float32Array(starCount * 3);
    const cols = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const dist = 400 + Math.random() * 1200;
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);

      pos[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = dist * Math.cos(phi);

      const br = 0.3 + Math.random() * 0.45;
      cols[i * 3] = br;
      cols[i * 3 + 1] = br;
      cols[i * 3 + 2] = br * 1.1;
    }

    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });
    const deepStars = new THREE.Points(starGeo, starMat);
    group.add(deepStars);

    const filPts: THREE.Vector3[] = [];
    for (let f = 0; f < 12; f++) {
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
      deepStars.rotation.y += 0.0001;
    };
  };

  // 6. UNIVERSE (The Cosmic Web)
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
  // Mount Three.js Scene and Manage Environments
  // -------------------------------------------------------------------------
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010206);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.5, 8000);
    // Initial entrance camera position
    camera.position.set(0, 140, 480);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.65;
    controls.zoomSpeed = 0.85;
    controls.minDistance = 15;
    controls.maxDistance = 1200;
    controlsRef.current = controls;

    // Yield lerping control to user as soon as they interact
    const onControlsStart = () => {
      isCameraLerping.current = false;
    };
    controls.addEventListener('start', onControlsStart);

    // Environment Container Group
    const envGroup = new THREE.Group();
    scene.add(envGroup);
    envGroupRef.current = envGroup;

    // Build Initial Environment
    buildSolarSystem(envGroup);

    // Initial target settling position
    targetCamPos.current = new THREE.Vector3(0, 75, 260);
    targetCamLookAt.current = new THREE.Vector3(0, 0, 0);
    isCameraLerping.current = true;

    // Animation Loop with smooth camera interpolation
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);

      if (envGroup.userData?.update) {
        envGroup.userData.update();
      }

      // Smooth cinematic camera flight interpolation
      if (isCameraLerping.current && camera && controls) {
        camera.position.lerp(targetCamPos.current, 0.045);
        controls.target.lerp(targetCamLookAt.current, 0.045);
        if (camera.position.distanceTo(targetCamPos.current) < 0.4) {
          isCameraLerping.current = false;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Window Resize Handler
    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    resetControlsTimer();

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener('resize', onResize);
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
      // 1. Dispose previous environment assets
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

      // 2. Build newly selected environment
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
  // Walkthrough Step Navigation & Camera Choreography
  // -------------------------------------------------------------------------
  const goToStep = useCallback((idx: number) => {
    if (idx < 0 || idx >= SPATIAL_WALKTHROUGH_STEPS.length) return;
    setCurrentStepIndex(idx);
    const step = SPATIAL_WALKTHROUGH_STEPS[idx];

    // Smoothly fly camera to scenic vantage point
    targetCamPos.current = new THREE.Vector3(...step.cameraPos);
    targetCamLookAt.current = new THREE.Vector3(...step.cameraTarget);
    isCameraLerping.current = true;

    // Switch environment if this step highlights another cosmic domain
    if (step.env !== activeEnv) {
      switchEnvironment(step.env, false);
    }
  }, [activeEnv, switchEnvironment]);

  const handleNextStep = useCallback(() => {
    if (currentStepIndex < SPATIAL_WALKTHROUGH_STEPS.length - 1) {
      goToStep(currentStepIndex + 1);
    } else {
      // Completed last step: minimize to let user enjoy space freely
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
    setTimeout(() => {
      onExit(targetTab);
    }, 320);
  }, [onExit]);

  // Keyboard navigation inside Explore The Space
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
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isWalkthroughActive, isWalkthroughMinimized, handleNextStep, handlePrevStep, handleExit]);

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

      {/* 1. Cinematic Hyper-Space Entry Veil */}
      {entryPhase !== 'settled' && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#010206',
          zIndex: 50,
          pointerEvents: 'none',
          transition: 'opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
          opacity: entryPhase === 'entering' ? 1 : 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '14px'
        }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: '2px solid rgba(56, 189, 248, 0.3)',
            borderTopColor: 'var(--accent-cyan)',
            animation: 'spacePulseSpin 1s linear infinite'
          }} />
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '11px',
            letterSpacing: '0.2em',
            color: 'var(--accent-cyan)',
            textTransform: 'uppercase'
          }}>
            ENTERING DEEP SPACE // CALIBRATING SENSORS
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
          background: 'rgba(1, 2, 6, 0.82)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.25s ease',
          pointerEvents: 'none',
          zIndex: 30
        }} />
      )}

      {/* 4. Top Header Bar: Discoverable "Return to Mission Control" + Telemetry Stats */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'none'
      }}>
        {/* Subtle, discoverable Return to Mission Control control */}
        <button
          onClick={() => handleExit('mission-control')}
          className="btn"
          style={{
            pointerEvents: 'auto',
            background: 'rgba(5, 12, 24, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            color: '#f8fafc',
            padding: '8px 16px',
            fontSize: '12px',
            fontFamily: 'var(--font-heading)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.7), 0 0 15px rgba(56, 189, 248, 0.15)',
            transition: 'all 0.2s ease',
            cursor: 'pointer'
          }}
          title="Return to SpacePulse Mission Control"
        >
          <ArrowLeft size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>Return to Mission Control</span>
        </button>

        {/* Right Status Indicators & Walkthrough Reopen Pill */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          pointerEvents: 'auto'
        }}>
          {(!isWalkthroughActive || isWalkthroughMinimized) && (
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
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(56, 189, 248, 0.2)',
                backdropFilter: 'blur(12px)'
              }}
              title="Open Spatial Mission Walkthrough"
            >
              <Compass size={13} />
              <span>SPATIAL GUIDE ({currentStepIndex + 1}/{SPATIAL_WALKTHROUGH_STEPS.length})</span>
            </button>
          )}

          <div style={{
            background: 'rgba(5, 12, 24, 0.75)',
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
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'var(--status-live)',
              boxShadow: '0 0 8px var(--status-live)'
            }} />
            <span>IMMERSIVE // 3D CANVAS</span>
          </div>
        </div>
      </div>

      {/* 5. Spatial Walkthrough Floating Aerospace HUD */}
      {isWalkthroughActive && !isWalkthroughMinimized && entryPhase === 'settled' && (
        <div style={{
          position: 'absolute',
          bottom: '88px',
          left: '24px',
          zIndex: 25,
          width: '420px',
          maxWidth: 'calc(100vw - 48px)',
          background: 'rgba(4, 10, 20, 0.88)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 30px rgba(56, 189, 248, 0.18)',
          padding: '20px 22px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          animation: 'walkthroughHudFadeIn 0.35s ease',
          pointerEvents: 'auto'
        }}>
          {/* Top Aerospace Phase Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={() => setIsWalkthroughMinimized(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Minimize Guide (Free Exploration)"
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
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Dismiss Guide"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Title and Concise Description */}
          <div>
            <h2 style={{
              margin: '0 0 6px 0',
              fontSize: '16px',
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
              lineHeight: 1.55
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
                padding: '5px 10px',
                opacity: currentStepIndex === 0 ? 0.3 : 1,
                cursor: currentStepIndex === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              <ChevronLeft size={13} />
              <span>Back</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {currentStep.keyAction && (
                <button
                  onClick={() => handleExit(currentStep.keyAction?.tab)}
                  className="btn btn-secondary"
                  style={{
                    fontSize: '11px',
                    padding: '5px 12px',
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
                    padding: '5px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 0 12px rgba(56, 189, 248, 0.3)'
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
                    padding: '5px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 0 15px rgba(56, 189, 248, 0.35)'
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

      {/* 6. Bottom Center: Minimal Cosmic Domain Selector (Auto-Hiding) */}
      <div style={{
        position: 'absolute',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        transition: 'opacity 0.4s ease',
        opacity: controlsVisible ? 1 : 0.2,
        pointerEvents: controlsVisible ? 'auto' : 'none',
        maxWidth: 'calc(100vw - 32px)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(5, 12, 24, 0.85)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '4px',
          borderRadius: 'var(--radius-full)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.75)',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
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
                  letterSpacing: '0.02em'
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
          from { opacity: 0; transform: translateY(12px) scale(0.98); }
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
      `}</style>
    </div>
  );
};
