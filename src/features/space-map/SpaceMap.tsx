import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Orbit,
  Layers, 
  Clock, 
  RotateCcw, 
  ChevronRight,
  ChevronLeft,
  Crosshair,
  Search,
  Eye,
  Globe,
  AlertTriangle,
  Compass,
  Sliders,
  RefreshCw,
  Info,
  X,
  Sparkles,
  Maximize2
} from 'lucide-react';
import { calculatePlanetEphemeris } from '../../services/calculations/kepler';
import { calculateAdityaL1Ephemeris } from '../../services/calculations/lagrange';
import { CelestrakService, SatelliteTrackData } from '../../services/api/celestrakService';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from '../../services/data/spacecraftCatalog';
import { resolveTrackingCapability } from '../../services/data/trackingCapability';
import type { InspectableObject, SpacecraftObject } from '../../types/space';
import { resolveInspectableObject, normalizeSpacecraftObject } from '../../services/data/objectResolver';
import { formatDistanceKm } from '../../utils/formatters';
import { calculateLightTimeSeconds, formatLightTime } from '../../services/calculations/physics';
import { 
  createRealisticEarthShaderMaterial, 
  createRealisticAtmosphereMesh, 
  createRealisticCloudMesh 
} from '../../components/space/earthRealistic';
import { getSpacecraft3DModel } from '../../components/space/spacecraftModelRegistry';
import { createRealisticStarfield } from '../../components/space/deepSpaceEnvironment';
import { 
  createScientificReticle, 
  createDirectionalOrbitLine 
} from '../../components/space/spacecraftVisuals';
import { 
  createRealisticSun, 
  createRealisticPlanet, 
  PLANET_VISUAL_CONFIGS 
} from '../../components/space/planetRealistic';
import { Spacecraft3DViewer } from '../../components/inspector/Spacecraft3DViewer';

interface SpaceMapProps {
  onSelectObject?: (obj: InspectableObject) => void;
  onInspectObject?: (obj: InspectableObject) => void;
  selectedObjectId?: string;
}

type ViewMode = 'SOLAR_SYSTEM' | 'EARTH_ORBIT';
type ScaleMode = 'EXPLORATION' | 'SCIENTIFIC';

interface VisualBody {
  id: string;
  name: string;
  type: 'star' | 'planet' | 'moon' | 'spacecraft' | 'satellite';
  mesh: THREE.Object3D;
  planetMesh?: THREE.Mesh;
  cloudsMesh?: THREE.Mesh;
  position: THREE.Vector3;
  realKm: { x: number; y: number; z: number };
  radiusKm: number;
  orbitLine?: THREE.Line;
  color: string;
  craftData?: SpacecraftObject;
  satTrack?: SatelliteTrackData;
}

interface FlyToAnimation {
  startPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  startLookAt: THREE.Vector3;
  targetLookAt: THREE.Vector3;
  startTime: number;
  durationMs: number;
}

// True astronomical orbital periods (in Earth days) for full 360° Keplerian sampling
const ORBITAL_PERIODS_DAYS: Record<string, number> = {
  mercury: 87.97,
  venus: 224.70,
  earth: 365.25,
  mars: 686.98,
  jupiter: 4332.59,  // ~11.86 Earth years
  saturn: 10759.22,  // ~29.46 Earth years
  uranus: 30685.40,  // ~84.0 Earth years
  neptune: 60189.00  // ~164.8 Earth years
};

// Authentic sidereal rotation rates (radians per animation frame)
const PLANET_ROTATION_SPEEDS: Record<string, number> = {
  mercury: 0.0004,
  venus: -0.0003, // Retrograde rotation
  earth: 0.0028,
  mars: 0.0027,
  jupiter: 0.0068, // Rapid rotation of gas giant
  saturn: 0.0064,
  uranus: -0.0042, // Retrograde & tilted on side
  neptune: 0.0045
};

/**
 * Computes visual distance in scene units from true heliocentric distance in AU
 */
function computeVisualDistance(rAU: number, mode: ScaleMode): number {
  if (mode === 'SCIENTIFIC') {
    // True proportional scale: 1 AU = 22.0 scene units
    return Math.max(0.1, rAU * 22.0);
  }
  // Exploration Scale: Continuous non-linear power-law compression
  // Preserves exact ordering, true heliocentric angles, and eccentricity variations
  // r_vis = 16.5 * (r_AU)^0.52 + 4.5
  return Math.max(4.8, 16.5 * Math.pow(Math.max(0.01, rAU), 0.52) + 4.5);
}

/**
 * Transforms heliocentric ecliptic J2000 coordinates (in AU) to Three.js scene coordinates
 * Ecliptic X -> Three.js X
 * Ecliptic Z (Latitude / Ecliptic Normal) -> Three.js Y (Up)
 * Ecliptic Y (In-Plane 90°) -> Three.js Z
 */
function eclipticToSceneCoords(posAU: { x: number; y: number; z: number }, mode: ScaleMode): THREE.Vector3 {
  const rAU = Math.sqrt(posAU.x * posAU.x + posAU.y * posAU.y + posAU.z * posAU.z);
  const visualR = computeVisualDistance(rAU, mode);
  const factor = rAU > 0 ? visualR / rAU : 1.0;
  
  return new THREE.Vector3(
    posAU.x * factor,
    posAU.z * factor,
    posAU.y * factor
  );
}

// Satellite distance mapping around Earth in Earth-Orbit mode
function mapSatelliteVisualRadius(altKm: number): number {
  const EARTH_VISUAL_R = 10.0;
  if (altKm < 2000) {
    // LEO (200km - 2000km): mapped between 11.5 and 14.5
    return EARTH_VISUAL_R + 1.4 + (Math.max(120, altKm) / 2000.0) * 3.0;
  }
  if (altKm < 35000) {
    // MEO (2000km - 35000km): mapped between 14.5 and 22.0
    return 14.5 + ((altKm - 2000.0) / 33000.0) * 7.5;
  }
  // GEO (~35786km): mapped ~22.5 to 24.5
  return 22.5 + Math.min(3.0, ((altKm - 35000.0) / 2000.0) * 1.5);
}

export const SpaceMap: React.FC<SpaceMapProps> = ({
  onSelectObject,
  onInspectObject,
  selectedObjectId
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // View Modes & Active State
  const [viewMode, setViewMode] = useState<ViewMode>('SOLAR_SYSTEM');
  const [scaleMode, setScaleMode] = useState<ScaleMode>('EXPLORATION');
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(selectedObjectId || null);
  const [simDate, setSimDate] = useState<Date>(new Date());
  
  // Layer Toggles
  const [showPlanets, setShowPlanets] = useState<boolean>(true);
  const [showOrbits, setShowOrbits] = useState<boolean>(true);
  const [showSpacecraft, setShowSpacecraft] = useState<boolean>(true);
  const [showSatellites, setShowSatellites] = useState<boolean>(true);

  // Status & Telemetry
  const [isInitializing, setIsInitializing] = useState<boolean>(true);
  const [webGLFailed, setWebGLFailed] = useState<boolean>(false);
  const [isFetchingSatellites, setIsFetchingSatellites] = useState<boolean>(false);
  const [satelliteCount, setSatelliteCount] = useState<number>(0);
  const [hoveredBody, setHoveredBody] = useState<{ name: string; altKm?: number; x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [viewing3DViewer, setViewing3DViewer] = useState<{ id: string; name: string } | null>(null);
  const [voyagerNotice, setVoyagerNotice] = useState<boolean>(false);

  // First-Time Observatory Guided Walkthrough State (1 to 5, 0 = inactive)
  const [walkthroughPhase, setWalkthroughPhase] = useState<number>(() => {
    try {
      const completed = localStorage.getItem('spacepulse_solarsystem_walkthrough_completed');
      return completed === 'true' ? 0 : 1;
    } catch {
      return 0;
    }
  });

  // HUD Telemetry State
  const [hudData, setHudData] = useState<{
    name: string;
    catalogId?: string;
    distEarthKm: number;
    distSunKm: number;
    altitudeKm?: number;
    velocityKmS?: number;
    lightTimeStr: string;
    type: string;
    orbitClass?: string;
    status: string;
    source: string;
    isUnavailable?: boolean;
  } | null>(null);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bodiesRef = useRef<Map<string, VisualBody>>(new Map());
  const cloudsMeshRef = useRef<THREE.Mesh | null>(null);
  const reticleRef = useRef<THREE.Group | null>(null);
  const distLineRef = useRef<THREE.Line | null>(null);
  const animIdRef = useRef<number>(0);

  // Lighting References for Dynamic Celestial Illuminance
  const sunPointLightRef = useRef<THREE.PointLight | null>(null);
  const sunDirLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  // Smooth Fly-To Camera Flight Reference
  const flyToAnimRef = useRef<FlyToAnimation | null>(null);
  const handleObjectSelectionRef = useRef<(objectId: string, shouldInspect?: boolean) => void>(() => {});

  // Synchronize selection from parent prop
  useEffect(() => {
    if (selectedObjectId) {
      setSelectedBodyId(selectedObjectId);
      const isEarthSat = ['iss', 'css-tiangong', 'hubble', 'astrosat', 'cartosat-3', 'eos-06', 'noaa-19', 'terra'].includes(selectedObjectId) || selectedObjectId.startsWith('norad-');
      if (isEarthSat) {
        setViewMode('EARTH_ORBIT');
      } else if (selectedObjectId !== 'moon' && !selectedObjectId.startsWith('chandrayaan')) {
        setViewMode('SOLAR_SYSTEM');
      }
    }
  }, [selectedObjectId]);

  // Smooth Fly-To Interpolator Function
  const flyToTarget = useCallback((targetPos: THREE.Vector3, targetLook: THREE.Vector3, durationMs: number = 1300) => {
    if (!cameraRef.current || !controlsRef.current) return;
    flyToAnimRef.current = {
      startPos: cameraRef.current.position.clone(),
      targetPos: targetPos.clone(),
      startLookAt: controlsRef.current.target.clone(),
      targetLookAt: targetLook.clone(),
      startTime: performance.now(),
      durationMs
    };
  }, []);

  const resetView = useCallback(() => {
    if (viewMode === 'EARTH_ORBIT') {
      flyToTarget(new THREE.Vector3(18, 10, 28), new THREE.Vector3(-1.2, 0, 0), 1000);
    } else {
      if (scaleMode === 'SCIENTIFIC') {
        flyToTarget(new THREE.Vector3(60, 110, 260), new THREE.Vector3(0, -1, 0), 1100);
      } else {
        // Ecliptic observatory viewpoint: shallow ~22° angle across the planetary plane
        flyToTarget(new THREE.Vector3(26, 30, 85), new THREE.Vector3(0, -1, 0), 1000);
      }
    }
  }, [viewMode, scaleMode, flyToTarget]);

  // Focus on specific object with smooth ease-in-out flight
  const focusOnObject = useCallback((id: string) => {
    const body = bodiesRef.current.get(id);
    if (!body || !cameraRef.current || !controlsRef.current) return;

    if (viewMode === 'EARTH_ORBIT') {
      if (body.id === 'earth') {
        flyToTarget(new THREE.Vector3(14, 11, 24), new THREE.Vector3(-1.2, 0, 0), 1200);
      } else {
        const targetLook = body.position.clone();
        const zoomDist = selectedBodyId === id ? 1.8 : 3.8;
        const offset = body.position.clone().normalize().multiplyScalar(zoomDist).add(new THREE.Vector3(1.0, 1.0, 1.6));
        flyToTarget(body.position.clone().add(offset), targetLook, 1200);
      }
    } else {
      const targetLook = body.position.clone();
      let viewDist = 12.0;

      if (body.id === 'sun') {
        viewDist = 26.0;
      } else if (body.id === 'jupiter' || body.id === 'saturn') {
        viewDist = 16.0;
      } else if (body.id === 'uranus' || body.id === 'neptune') {
        viewDist = 12.0;
      } else if (body.id === 'earth' || body.id === 'venus') {
        viewDist = 9.0;
      } else if (body.id === 'mars' || body.id === 'mercury') {
        viewDist = 7.0;
      } else if (body.id === 'aditya-l1') {
        viewDist = 4.5;
      }

      // Compute camera offset along current viewing angle with slight upward elevation
      const currentDir = cameraRef.current.position.clone().sub(targetLook).normalize();
      // Ensure elevation so rings and illuminated hemispheres are discernible
      if (currentDir.y < 0.25) currentDir.y = 0.35;
      currentDir.normalize();

      const targetCam = targetLook.clone().add(currentDir.multiplyScalar(viewDist));
      flyToTarget(targetCam, targetLook, 1300);
    }
  }, [viewMode, selectedBodyId, flyToTarget]);

  // Unified object selection and inspection handler
  const handleObjectSelection = useCallback(async (objectId: string, shouldInspect: boolean = false) => {
    setSelectedBodyId(objectId);
    const body = bodiesRef.current.get(objectId);
    let resolved: InspectableObject | null = null;
    if (body?.craftData) {
      resolved = normalizeSpacecraftObject(body.craftData);
    } else {
      resolved = await resolveInspectableObject(objectId, simDate);
    }
    if (resolved) {
      if (shouldInspect && onInspectObject) {
        onInspectObject(resolved);
      } else if (onSelectObject) {
        onSelectObject(resolved);
      }
    }
  }, [simDate, onInspectObject, onSelectObject]);
  handleObjectSelectionRef.current = handleObjectSelection;

  // Camera Presets for Earth Orbit
  const setCameraPreset = useCallback((preset: 'horizon' | 'polar' | 'equatorial' | 'default') => {
    if (viewMode === 'EARTH_ORBIT') {
      if (preset === 'horizon') {
        flyToTarget(new THREE.Vector3(20, 4, 22), new THREE.Vector3(0, 0, 0), 1000);
      } else if (preset === 'polar') {
        flyToTarget(new THREE.Vector3(0, 28, 2), new THREE.Vector3(0, 0, 0), 1000);
      } else if (preset === 'equatorial') {
        flyToTarget(new THREE.Vector3(28, 2, 8), new THREE.Vector3(0, 0, 0), 1000);
      } else {
        flyToTarget(new THREE.Vector3(18, 10, 28), new THREE.Vector3(-1.2, 0, 0), 1000);
      }
    } else {
      resetView();
    }
  }, [viewMode, flyToTarget, resetView]);

  // =========================================================================
  // 1. INITIALIZE THREE.JS SCENE & RENDERER (Runs Once)
  // =========================================================================
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // WebGL Capability Check
    let hasWebGL = true;
    try {
      const testCanvas = document.createElement('canvas');
      hasWebGL = !!(window.WebGLRenderingContext && (testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl')));
    } catch {
      hasWebGL = false;
    }

    if (!hasWebGL) {
      setWebGLFailed(true);
      setIsInitializing(false);
      return;
    }

    const width = Math.max(container.clientWidth || 0, window.innerWidth || 800, 320);
    const height = Math.max(container.clientHeight || 0, (window.innerHeight ? window.innerHeight - 130 : 650), 400);

    const scene = new THREE.Scene();
    // Deep cosmic space black - pure vacuum
    scene.background = new THREE.Color('#000204');
    sceneRef.current = scene;

    // Perspective Camera: 50° FOV gives natural depth perception without fish-eye distortion
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 35000);
    camera.position.set(26, 30, 85);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.30;
    rendererRef.current = renderer;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05; // Smooth spatial damping
    controls.minDistance = 2.5;
    controls.maxDistance = 5000;
    controls.target.set(0, -1, 0);
    controlsRef.current = controls;

    // Multi-Tier Deep Space Starfield (10,000+ stars with authentic B-V spectral classes)
    // Completely separate from planetary geometry - NO giant translucent dome!
    const starfield = createRealisticStarfield();
    scene.add(starfield);

    // Dynamic Multi-Source Illuminating System
    // Solar PointLight at (0, 0, 0) - will be populated by createRealisticSun
    const sunPointLight = new THREE.PointLight(0xfffaec, 4.2, 8000, 0.06);
    sunPointLight.position.set(0, 0, 0);
    scene.add(sunPointLight);
    sunPointLightRef.current = sunPointLight;

    // Directional Sunlight for Earth-Orbit Tracking View (aligned with terminator)
    const earthSunDir = new THREE.Vector3(1.2, 0.35, 0.85).normalize();
    const sunDirLight = new THREE.DirectionalLight(0xfffaec, 0.0);
    sunDirLight.position.copy(earthSunDir.clone().multiplyScalar(250));
    scene.add(sunDirLight);
    sunDirLightRef.current = sunDirLight;

    // Restrained Astronomical Ambient Illumination
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.22);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    // Distance Ranging Vector
    const distGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]);
    const distMat = new THREE.LineDashedMaterial({ color: 0x38bdf8, dashSize: 2, gapSize: 1.5, transparent: true, opacity: 0.55 });
    const distanceLine = new THREE.Line(distGeo, distMat);
    distanceLine.visible = false;
    scene.add(distanceLine);
    distLineRef.current = distanceLine;

    // Scientific Target Acquisition Reticle
    const reticle = createScientificReticle(2.2);
    reticle.visible = false;
    scene.add(reticle);
    reticleRef.current = reticle;

    // Resize Observer for Dynamic Viewport Sizing
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentRect.width || container.clientWidth || 300;
        const h = entry.contentRect.height || container.clientHeight || 300;
        if (cameraRef.current && rendererRef.current) {
          cameraRef.current.aspect = w / h;
          cameraRef.current.updateProjectionMatrix();
          rendererRef.current.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);

    // Raycaster for Hover & Click Interactions
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Object3D[] = [];
      bodiesRef.current.forEach(b => meshes.push(b.mesh));

      const intersects = raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        let hit: THREE.Object3D | null = intersects[0].object;
        while (hit && !hit.userData.bodyId && hit.parent) {
          hit = hit.parent;
        }
        if (hit && hit.userData.bodyId) {
          const body = bodiesRef.current.get(hit.userData.bodyId);
          if (body) {
            setHoveredBody({
              name: body.name,
              altKm: body.satTrack?.state?.altitudeKm,
              x: e.clientX,
              y: e.clientY
            });
            renderer.domElement.style.cursor = 'pointer';
            return;
          }
        }
      }
      setHoveredBody(null);
      renderer.domElement.style.cursor = 'default';
    };

    const onPointerClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Object3D[] = [];
      bodiesRef.current.forEach(b => meshes.push(b.mesh));

      const intersects = raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        let hit: THREE.Object3D | null = intersects[0].object;
        while (hit && !hit.userData.bodyId && hit.parent) {
          hit = hit.parent;
        }
        if (hit && hit.userData.bodyId) {
          const bodyId = hit.userData.bodyId;

          // If user clicked Earth in Solar System view, smoothly fly to Earth first
          focusOnObject(bodyId);
          handleObjectSelectionRef.current(bodyId, false);
        }
      }
    };

    renderer.domElement.addEventListener('mousemove', onPointerMove);
    renderer.domElement.addEventListener('click', onPointerClick);

    // Animation Loop
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);

      // 1. Smooth Camera Fly-To Interpolation
      if (flyToAnimRef.current) {
        const anim = flyToAnimRef.current;
        const now = performance.now();
        const elapsed = now - anim.startTime;
        const progress = Math.min(1.0, elapsed / anim.durationMs);

        // Smooth cubic ease-in-out
        const ease = progress < 0.5 
          ? 4 * progress * progress * progress 
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

        camera.position.lerpVectors(anim.startPos, anim.targetPos, ease);
        controls.target.lerpVectors(anim.startLookAt, anim.targetLookAt, ease);
        controls.update();

        if (progress >= 1.0) {
          flyToAnimRef.current = null;
        }
      } else {
        controls.update();
      }

      // 2. Rotate Planets at Believable Speeds
      bodiesRef.current.forEach(body => {
        const speed = PLANET_ROTATION_SPEEDS[body.id] || 0.002;
        if (body.planetMesh) {
          body.planetMesh.rotation.y += speed;
        } else if (body.type === 'planet' || body.id === 'earth') {
          body.mesh.rotation.y += speed;
        }

        if (body.cloudsMesh) {
          body.cloudsMesh.rotation.y += speed + 0.0006;
        }

        if (body.type === 'satellite') {
          body.mesh.rotation.y += 0.004;
        }
      });

      // 3. Keep Selection Reticle aligned and subtly pulsing
      if (reticleRef.current && reticleRef.current.visible) {
        reticleRef.current.rotation.z += 0.008;
      }

      renderer.render(scene, camera);
    };

    animate();
    setIsInitializing(false);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('mousemove', onPointerMove);
      renderer.domElement.removeEventListener('click', onPointerClick);
      renderer.dispose();
    };
  }, []);

  // =========================================================================
  // 2. BUILD BASE ASTRONOMICAL SCENE (Solar System or Earth Orbit)
  // =========================================================================
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear previous dynamic bodies & orbit lines
    bodiesRef.current.forEach(body => {
      scene.remove(body.mesh);
      if (body.orbitLine) scene.remove(body.orbitLine);
    });
    bodiesRef.current.clear();

    if (viewMode === 'SOLAR_SYSTEM') {
      // Configure lighting for Solar System View
      if (sunPointLightRef.current) sunPointLightRef.current.intensity = 4.2;
      if (sunDirLightRef.current) sunDirLightRef.current.intensity = 0.0;
      if (ambientLightRef.current) {
        ambientLightRef.current.color.setHex(0xffffff);
        ambientLightRef.current.intensity = 0.22;
      }

      // ----------------------------------------------------
      // 1. Sun (Authentic Self-Illuminated Star)
      // ----------------------------------------------------
      const sunSystem = createRealisticSun(4.5);
      scene.add(sunSystem.mesh);

      bodiesRef.current.set('sun', {
        id: 'sun',
        name: 'Sun (Sol)',
        type: 'star',
        mesh: sunSystem.mesh,
        position: new THREE.Vector3(0, 0, 0),
        realKm: { x: 0, y: 0, z: 0 },
        radiusKm: 696340,
        color: '#f59e0b'
      });

      // ----------------------------------------------------
      // 2. All 8 Major Planets (Mercury to Neptune)
      // ----------------------------------------------------
      const planetKeys = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

      planetKeys.forEach(pId => {
        try {
          const config = PLANET_VISUAL_CONFIGS[pId];
          if (!config) return;

          const ephem = calculatePlanetEphemeris(pId, simDate);
          const scenePos = eclipticToSceneCoords(ephem.positionAU, scaleMode);

          // Scaled visual radius based on scale mode
          const visualRadius = scaleMode === 'SCIENTIFIC'
            ? Math.max(0.4, config.baseRadius * 0.42)
            : config.baseRadius;

          const planetObj = createRealisticPlanet(pId, visualRadius);
          planetObj.group.position.copy(scenePos);
          planetObj.group.visible = showPlanets;
          scene.add(planetObj.group);

          // If Earth, add the Moon orbiting Earth
          if (pId === 'earth') {
            const moonGeo = new THREE.SphereGeometry(visualRadius * 0.27, 24, 24);
            const moonMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.9 });
            const moonMesh = new THREE.Mesh(moonGeo, moonMat);
            moonMesh.position.set(visualRadius * 2.8, 0.4, visualRadius * 1.5);
            moonMesh.userData = { bodyId: 'moon' };
            planetObj.group.add(moonMesh);

            // Satellite Constellation Ring Badge
            const satRingGeo = new THREE.RingGeometry(visualRadius * 1.25, visualRadius * 1.38, 36);
            const satRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
            const satRing = new THREE.Mesh(satRingGeo, satRingMat);
            satRing.rotation.x = Math.PI / 2.3;
            planetObj.group.add(satRing);

            cloudsMeshRef.current = planetObj.cloudsMesh || null;
          }

          // Keplerian Elliptical Orbit Path sampled across true orbital period
          let orbitLine: THREE.Line | undefined;
          if (showOrbits) {
            const orbitPts: THREE.Vector3[] = [];
            const samples = 180;
            const periodDays = ORBITAL_PERIODS_DAYS[pId] || 365.25;
            const tStart = simDate.getTime();

            for (let s = 0; s <= samples; s++) {
              const sampleDate = new Date(tStart + (s / samples) * periodDays * 86400000);
              const sEphem = calculatePlanetEphemeris(pId, sampleDate);
              const ptScene = eclipticToSceneCoords(sEphem.positionAU, scaleMode);
              orbitPts.push(ptScene);
            }

            const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
            const orbitMat = new THREE.LineBasicMaterial({
              color: new THREE.Color(config.color),
              transparent: true,
              opacity: selectedBodyId === pId ? 0.85 : 0.20
            });
            orbitLine = new THREE.Line(orbitGeo, orbitMat);
            scene.add(orbitLine);
          }

          bodiesRef.current.set(pId, {
            id: pId,
            name: config.name,
            type: 'planet',
            mesh: planetObj.group,
            planetMesh: planetObj.planetMesh,
            cloudsMesh: planetObj.cloudsMesh,
            position: scenePos,
            realKm: ephem.positionKm,
            radiusKm: config.radiusKm,
            orbitLine,
            color: config.color
          });

        } catch (e) {
          console.error('Failed to calculate ephemeris for:', pId, e);
        }
      });

      // ----------------------------------------------------
      // 3. Aditya-L1 Solar Observatory at Sun-Earth L1
      // ----------------------------------------------------
      try {
        const l1 = calculateAdityaL1Ephemeris(simDate);
        const earthBody = bodiesRef.current.get('earth');
        if (earthBody) {
          const dirToSun = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), earthBody.position).normalize();
          const l1VisualOffset = scaleMode === 'SCIENTIFIC' ? 0.8 : 3.2;
          const l1VisualPos = earthBody.position.clone().add(dirToSun.multiplyScalar(l1VisualOffset));

          const l1Mesh = getSpacecraft3DModel('aditya-l1', { scale: 0.45, isMapMode: true });
          l1Mesh.position.copy(l1VisualPos);
          l1Mesh.lookAt(0, 0, 0); // Point instruments toward the Sun
          l1Mesh.userData = { bodyId: 'aditya-l1' };
          l1Mesh.visible = showSpacecraft;
          scene.add(l1Mesh);

          let haloLine: THREE.Line | undefined;
          if (showOrbits) {
            const haloPts: THREE.Vector3[] = [];
            for (let a = 0; a <= 32; a++) {
              const th = (a / 32) * Math.PI * 2;
              haloPts.push(l1VisualPos.clone().add(new THREE.Vector3(0.9 * Math.cos(th), 0.6 * Math.sin(th), 0)));
            }
            const hGeo = new THREE.BufferGeometry().setFromPoints(haloPts);
            const hMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.45 });
            haloLine = new THREE.Line(hGeo, hMat);
            scene.add(haloLine);
          }

          const adityaDef = SPACECRAFT_REGISTRY.find(s => s.id === 'aditya-l1');
          if (adityaDef) {
            resolveSpacecraftState(adityaDef, simDate).then(craftState => {
              bodiesRef.current.set('aditya-l1', {
                id: 'aditya-l1',
                name: 'Aditya-L1',
                type: 'spacecraft',
                mesh: l1Mesh,
                position: l1VisualPos,
                realKm: l1.positionKm,
                radiusKm: 2,
                orbitLine: haloLine,
                color: '#38bdf8',
                craftData: craftState
              });
            });
          }
        }
      } catch (e) {
        console.error('Aditya-L1 error:', e);
      }

    } else {
      // ----------------------------------------------------
      // EARTH ORBIT TRACKING MODE (Earth Centered + Moon)
      // ----------------------------------------------------
      if (sunPointLightRef.current) sunPointLightRef.current.intensity = 0.0;
      if (sunDirLightRef.current) sunDirLightRef.current.intensity = 3.2;
      if (ambientLightRef.current) {
        ambientLightRef.current.color.setHex(0x0c1527);
        ambientLightRef.current.intensity = 0.18;
      }

      const EARTH_R = 10.0;
      const sunDir = new THREE.Vector3(1.2, 0.35, 0.85).normalize();

      // 1. Realistic Day/Night Earth Shader with specular oceans & city lights
      const earthGeo = new THREE.SphereGeometry(EARTH_R, 64, 64);
      const earthMat = createRealisticEarthShaderMaterial(sunDir);
      const earthMesh = new THREE.Mesh(earthGeo, earthMat);
      earthMesh.userData = { bodyId: 'earth' };
      scene.add(earthMesh);

      // 2. Realistic Cloud Layer rotating above surface
      const cloudsMesh = createRealisticCloudMesh(EARTH_R);
      earthMesh.add(cloudsMesh);
      cloudsMeshRef.current = cloudsMesh;

      // 3. Realistic Rayleigh Atmospheric Scattering Shell (Fresnel limb)
      const atmoGlow = createRealisticAtmosphereMesh(EARTH_R, sunDir);
      earthMesh.add(atmoGlow);

      bodiesRef.current.set('earth', {
        id: 'earth',
        name: 'Earth',
        type: 'planet',
        mesh: earthMesh,
        position: new THREE.Vector3(0, 0, 0),
        realKm: { x: 0, y: 0, z: 0 },
        radiusKm: 6371,
        color: '#38bdf8'
      });

      // 4. Moon at scaled visual distance (~45 units)
      const moonDist = 45.0;
      const moonGeo = new THREE.SphereGeometry(1.6, 24, 24);
      const moonMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dc, roughness: 0.9 });
      const moonMesh = new THREE.Mesh(moonGeo, moonMat);
      const moonAngle = (simDate.getTime() / (27.3 * 86400000)) * Math.PI * 2;
      const moonPos = new THREE.Vector3(Math.cos(moonAngle) * moonDist, Math.sin(moonAngle * 0.1) * 3.5, Math.sin(moonAngle) * moonDist);
      moonMesh.position.copy(moonPos);
      moonMesh.userData = { bodyId: 'moon' };
      scene.add(moonMesh);

      if (showOrbits) {
        const moonOrbitPts: THREE.Vector3[] = [];
        for (let m = 0; m <= 64; m++) {
          const ma = (m / 64) * Math.PI * 2;
          moonOrbitPts.push(new THREE.Vector3(Math.cos(ma) * moonDist, Math.sin(ma * 0.1) * 3.5, Math.sin(ma) * moonDist));
        }
        const mGeo = new THREE.BufferGeometry().setFromPoints(moonOrbitPts);
        const mMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.25 });
        const moonOrbitLine = new THREE.Line(mGeo, mMat);
        scene.add(moonOrbitLine);
      }

      bodiesRef.current.set('moon', {
        id: 'moon',
        name: 'Moon',
        type: 'moon',
        mesh: moonMesh,
        position: moonPos,
        realKm: { x: moonPos.x * 10000, y: moonPos.y * 10000, z: moonPos.z * 10000 },
        radiusKm: 1737,
        color: '#cfd8dc'
      });

      // 5. Asynchronously Load Verified Satellites from CelesTrak
      setIsFetchingSatellites(true);
      CelestrakService.getSupportedEarthSatellites(simDate)
        .then(satellites => {
          setIsFetchingSatellites(false);
          setSatelliteCount(satellites.length);

          satellites.forEach(sat => {
            if (!sat.state) return;

            const eci = sat.state.positionEciKm;
            const altKm = sat.state.altitudeKm;

            const dirNorm = new THREE.Vector3(eci.x, eci.z, eci.y).normalize();
            const visualR = mapSatelliteVisualRadius(altKm);
            const satPos = dirNorm.clone().multiplyScalar(visualR);

            const orbitColors: Record<string, number> = {
              LEO: 0x38bdf8,
              SSO: 0x34d399,
              MEO: 0xfbbf24,
              GEO: 0xa855f7,
              HEO: 0xf43f5e
            };
            const satColor = orbitColors[sat.orbitClass] || 0x38bdf8;
            const isStation = sat.noradId === 25544 || sat.noradId === 48274;

            const satMesh = getSpacecraft3DModel(String(sat.noradId), {
              scale: isStation ? 0.38 : 0.28,
              isMapMode: true
            });
            satMesh.position.copy(satPos);
            satMesh.lookAt(0, 0, 0);
            satMesh.userData = { bodyId: `norad-${sat.noradId}`, noradId: sat.noradId };
            satMesh.visible = showSatellites;
            scene.add(satMesh);

            const markerGeo = new THREE.SphereGeometry(0.18, 12, 12);
            const markerMat = new THREE.MeshBasicMaterial({ color: satColor });
            const markerMesh = new THREE.Mesh(markerGeo, markerMat);
            satMesh.add(markerMesh);

            let orbitLine: THREE.Line | undefined;
            if (showOrbits && sat.orbitPath.length > 2) {
              const pathPts = sat.orbitPath.map(pt => {
                const ptDistKm = Math.sqrt(pt.x * pt.x + pt.y * pt.y + pt.z * pt.z);
                const ptAltKm = Math.max(100, ptDistKm - 6371);
                const ptDir = new THREE.Vector3(pt.x, pt.z, pt.y).normalize();
                const ptVisR = mapSatelliteVisualRadius(ptAltKm);
                return ptDir.multiplyScalar(ptVisR);
              });
              orbitLine = createDirectionalOrbitLine(pathPts, satColor);
              scene.add(orbitLine);
            }

            const craftDef = SPACECRAFT_REGISTRY.find(s => s.noradId === sat.noradId);
            const craftId = craftDef ? craftDef.id : `norad-${sat.noradId}`;
            const trackingCap = resolveTrackingCapability(craftId, sat.name, {
              noradId: sat.noradId,
              isLiveGp: sat.isLiveGp,
              epochDate: sat.epochDate,
              epochStr: sat.epochStr,
              orbitClass: sat.orbitClass,
              timestamp: sat.telemetrySource.timestamp,
              hasValidState: true
            }, simDate);

            const craftObj: SpacecraftObject = {
              id: craftId,
              name: sat.name,
              noradId: sat.noradId,
              agency: craftDef ? craftDef.agency : 'Commercial',
              mission: craftDef ? craftDef.mission : 'Earth Observation & Telemetry',
              launchDate: craftDef ? craftDef.launchDate : 'Verified Epoch',
              statusText: `Operational in ${sat.orbitClass} (${Math.round(sat.state.altitudeKm)} km)`,
              isOperational: true,
              orbitType: sat.orbitClass === 'SSO' ? 'Sun-Synchronous (SSO)' :
                         sat.orbitClass === 'GEO' ? 'Geostationary (GEO)' :
                         sat.orbitClass === 'MEO' ? 'Medium Earth Orbit (MEO)' :
                         'Low Earth Orbit (LEO)',
              coordinateFrame: 'Geocentric ECI (TEME / J2000)',
              description: craftDef ? craftDef.description : `Active Earth-orbiting satellite tracked by CelesTrak NORAD.`,
              significance: craftDef ? craftDef.significance : 'Continuous orbital telemetry for navigation, communications, and Earth observation.',
              scientificExplanation: `Orbits Earth at ${Math.round(sat.state.altitudeKm)} km altitude with ${sat.inclinationDeg.toFixed(1)}° inclination. Period: ${sat.periodMinutes.toFixed(1)} min.`,
              payloads: craftDef ? craftDef.payloads : ['Tracking Beacon', 'S-Band Transponder'],
              distanceFromEarthKm: sat.state.distanceFromEarthSurfaceKm,
              distanceFromSunKm: 149597870.7,
              velocityKmS: sat.state.velocityKmS,
              lightTimeToEarthSec: calculateLightTimeSeconds(sat.state.distanceFromEarthSurfaceKm),
              position: sat.state.positionEciKm,
              geodetic: {
                latitude: sat.state.latitudeDeg,
                longitude: sat.state.longitudeDeg,
                altitudeKm: sat.state.altitudeKm
              },
              orbitalElements: {
                epoch: sat.epochStr,
                semiMajorAxisKm: sat.semiMajorAxisKm,
                inclinationDeg: sat.inclinationDeg,
                eccentricity: sat.eccentricity,
                periodMinutes: sat.periodMinutes,
                raanDeg: sat.raanDeg,
                argPericenterDeg: sat.argPericenterDeg,
                meanAnomalyDeg: sat.meanAnomalyDeg
              },
              telemetrySource: sat.telemetrySource,
              trackingCapability: trackingCap
            };

            const bodyKey = craftDef ? craftDef.id : `norad-${sat.noradId}`;
            bodiesRef.current.set(bodyKey, {
              id: bodyKey,
              name: sat.name,
              type: 'satellite',
              mesh: satMesh,
              position: satPos,
              realKm: sat.state.positionEciKm,
              radiusKm: 0.1,
              orbitLine,
              color: `#${satColor.toString(16).padStart(6, '0')}`,
              craftData: craftObj,
              satTrack: sat
            });
          });
        })
        .catch(err => {
          console.error('Failed to retrieve satellites:', err);
          setIsFetchingSatellites(false);
        });
    }

  }, [viewMode, scaleMode, simDate, showPlanets, showOrbits, showSpacecraft, showSatellites]);

  // Update HUD & Selection Reticle when selection changes
  useEffect(() => {
    const reticle = reticleRef.current;
    const distLine = distLineRef.current;

    // Orbit Line Emphasis: Selected orbit prominent, other orbits quieter
    bodiesRef.current.forEach((body) => {
      if (body.orbitLine && body.orbitLine.material) {
        const mat = body.orbitLine.material as THREE.LineBasicMaterial;
        if (!selectedBodyId) {
          mat.opacity = 0.20;
        } else if (body.id === selectedBodyId) {
          mat.opacity = 0.85;
        } else {
          mat.opacity = 0.08;
        }
      }
    });

    if (selectedBodyId === 'voyager-1' || selectedBodyId === 'voyager-2') {
      setVoyagerNotice(true);
      if (reticle) reticle.visible = false;
      if (distLine) distLine.visible = false;

      setHudData({
        name: selectedBodyId === 'voyager-1' ? 'Voyager 1' : 'Voyager 2',
        distEarthKm: 0,
        distSunKm: 0,
        lightTimeStr: 'N/A',
        type: 'Deep Space Spacecraft',
        status: 'UNAVAILABLE',
        source: 'NASA JPL Deep Space Network',
        isUnavailable: true
      });
      return;
    } else {
      setVoyagerNotice(false);
    }

    const selected = selectedBodyId ? bodiesRef.current.get(selectedBodyId) : null;
    const earth = bodiesRef.current.get('earth');

    if (selected && reticle) {
      reticle.position.copy(selected.position);
      reticle.scale.set(selected.type === 'planet' ? 2.2 : 1.1, selected.type === 'planet' ? 2.2 : 1.1, 1);
      reticle.visible = true;
    } else if (reticle) {
      reticle.visible = false;
    }

    if (selected && earth && selected.id !== 'earth' && distLine) {
      distLine.geometry.setFromPoints([earth.position, selected.position]);
      distLine.computeLineDistances();
      distLine.visible = true;

      const dx = selected.realKm.x - earth.realKm.x;
      const dy = selected.realKm.y - earth.realKm.y;
      const dz = selected.realKm.z - earth.realKm.z;
      const distEarthKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const ltSec = calculateLightTimeSeconds(distEarthKm);

      setHudData({
        name: selected.name,
        catalogId: selected.satTrack ? `NORAD ${selected.satTrack.noradId}` : undefined,
        distEarthKm,
        distSunKm: 149597870.7,
        altitudeKm: selected.satTrack?.state?.altitudeKm,
        velocityKmS: selected.satTrack?.state?.velocityKmS || selected.craftData?.velocityKmS,
        lightTimeStr: formatLightTime(ltSec),
        type: selected.type,
        orbitClass: selected.satTrack?.orbitClass || selected.craftData?.orbitType,
        status: selected.craftData?.telemetrySource.status || 'CALCULATED',
        source: selected.craftData?.telemetrySource.sourceName || 'Astronomical Ephemeris Model'
      });
    } else if (selected && selected.id === 'earth') {
      if (distLine) distLine.visible = false;
      setHudData({
        name: 'Earth',
        distEarthKm: 0,
        distSunKm: 149597870.7,
        lightTimeStr: '0.0 ms',
        type: 'planet',
        status: 'CALCULATED',
        source: 'NASA JPL Standish Keplerian Model'
      });
    } else if (!selected) {
      if (distLine) distLine.visible = false;
      setHudData(null);
    }
  }, [selectedBodyId, viewMode, simDate]);

  // Guided Walkthrough Phase Transitions
  const handleWalkthroughStep = useCallback((step: number) => {
    setWalkthroughPhase(step);
    if (step === 0) {
      try {
        localStorage.setItem('spacepulse_solarsystem_walkthrough_completed', 'true');
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
      resetView();
      return;
    }

    if (step === 1) {
      // Phase 1: Deep Space Arrival
      flyToTarget(new THREE.Vector3(0, 190, 440), new THREE.Vector3(0, 0, 0), 1600);
    } else if (step === 2) {
      // Phase 2: Heliocentric Architecture Reveal
      flyToTarget(new THREE.Vector3(26, 32, 90), new THREE.Vector3(0, -1, 0), 1600);
    } else if (step === 3) {
      // Phase 3: Spatial Controls & Navigation
      flyToTarget(new THREE.Vector3(18, 22, 65), new THREE.Vector3(0, -1, 0), 1400);
    } else if (step === 4) {
      // Phase 4: Target Acquisition Demonstration (Earth)
      const earthBody = bodiesRef.current.get('earth');
      if (earthBody) {
        setSelectedBodyId('earth');
        const offset = new THREE.Vector3(5.5, 3.8, 7.5);
        flyToTarget(earthBody.position.clone().add(offset), earthBody.position.clone(), 1600);
        handleObjectSelectionRef.current('earth', false);
      }
    } else if (step === 5) {
      // Phase 5: Return to Full Observatory Overview
      flyToTarget(new THREE.Vector3(28, 30, 85), new THREE.Vector3(0, -1, 0), 1500);
    }
  }, [flyToTarget, resetView]);

  // Search Objects Registry
  const searchableList = useMemo(() => {
    return [
      { id: 'sun', name: 'Sun (Sol)', type: 'star', category: 'Star' },
      { id: 'mercury', name: 'Mercury', type: 'planet', category: 'Planet' },
      { id: 'venus', name: 'Venus', type: 'planet', category: 'Planet' },
      { id: 'earth', name: 'Earth', type: 'planet', category: 'Planet' },
      { id: 'moon', name: 'Moon (Luna)', type: 'moon', category: 'Lunar Body' },
      { id: 'mars', name: 'Mars', type: 'planet', category: 'Planet' },
      { id: 'jupiter', name: 'Jupiter', type: 'planet', category: 'Planet' },
      { id: 'saturn', name: 'Saturn', type: 'planet', category: 'Planet' },
      { id: 'uranus', name: 'Uranus', type: 'planet', category: 'Planet' },
      { id: 'neptune', name: 'Neptune', type: 'planet', category: 'Planet' },
      { id: 'aditya-l1', name: 'Aditya-L1', type: 'spacecraft', category: 'Solar Observatory (L1)' },
      { id: 'iss', name: 'ISS (International Space Station)', type: 'satellite', category: 'Space Station (LEO)' },
      { id: 'css-tiangong', name: 'CSS Tiangong', type: 'satellite', category: 'Space Station (LEO)' },
      { id: 'hubble', name: 'Hubble Space Telescope', type: 'satellite', category: 'Observatory (LEO)' },
      { id: 'astrosat', name: 'Astrosat', type: 'satellite', category: 'Observatory (LEO)' },
      { id: 'cartosat-3', name: 'Cartosat-3', type: 'satellite', category: 'Earth Observation (SSO)' },
      { id: 'eos-06', name: 'EOS-06 (Oceansat-3)', type: 'satellite', category: 'Ocean Monitor (SSO)' },
      { id: 'noaa-19', name: 'NOAA-19 (POES)', type: 'satellite', category: 'Weather Satellite (SSO)' },
      { id: 'terra', name: 'Terra (EOS AM-1)', type: 'satellite', category: 'Earth Observing (SSO)' },
      { id: 'voyager-1', name: 'Voyager 1', type: 'spacecraft', category: 'Deep Space (No Ephemeris)' }
    ];
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return searchableList.filter(item => 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery, searchableList]);

  const handleSearchResultSelect = (obj: typeof searchableList[0]) => {
    setSearchQuery('');
    setShowSearchDropdown(false);

    if (obj.id === 'voyager-1' || obj.id === 'voyager-2') {
      setSelectedBodyId(obj.id);
      setVoyagerNotice(true);
      handleObjectSelection(obj.id, false);
      return;
    }

    if (obj.type === 'satellite') {
      setSelectedBodyId(obj.id);
      if (viewMode !== 'EARTH_ORBIT') {
        setViewMode('EARTH_ORBIT');
        setTimeout(() => focusOnObject(obj.id), 250);
      } else {
        focusOnObject(obj.id);
      }
    } else {
      setSelectedBodyId(obj.id);
      if (viewMode === 'EARTH_ORBIT') {
        setViewMode('SOLAR_SYSTEM');
        setTimeout(() => focusOnObject(obj.id), 250);
      } else {
        focusOnObject(obj.id);
      }
    }

    handleObjectSelection(obj.id, false);
  };

  // Fallback if WebGL is completely unsupported on device
  if (webGLFailed) {
    return (
      <div className="container" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '36px', maxWidth: '640px', margin: '0 auto' }}>
          <AlertTriangle size={36} style={{ color: 'var(--status-last)', margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>
            3D Visualization is unavailable on this device
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '12px' }}>
            Hardware WebGL acceleration could not be initialized in your browser context. You can still inspect verified Keplerian ephemerides and CelesTrak orbital states via the Spacecraft Explorer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 'calc(100vh - 120px)',
      minHeight: '400px',
      overflow: 'hidden',
      display: 'block'
    }}>
      {/* 3D WebGL Canvas Mount Container */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          outline: 'none',
          position: 'absolute',
          inset: 0,
          zIndex: 1
        }}
      />

      {/* Loading Overlay */}
      {isInitializing && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: '#010307',
          zIndex: 30,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}>
          <RefreshCw size={24} className="radar-sweep" style={{ color: 'var(--accent-cyan)' }} />
          <div style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', letterSpacing: '0.08em' }}>
            INITIALIZING SPACE OBSERVATORY // THREE.JS HELIOCENTRIC ENGINE
          </div>
        </div>
      )}

      {/* Top Scientific Control Toolbar */}
      <div style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        right: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        pointerEvents: 'none',
        zIndex: 20
      }}>
        {/* Sub-Header: Reference Frame & Source Provenance Metadata */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '2px'
        }}>
          <div style={{
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--accent-cyan)',
            letterSpacing: '0.04em',
            background: 'rgba(3, 7, 18, 0.88)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            width: 'fit-content',
            pointerEvents: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>{viewMode === 'EARTH_ORBIT' ? 'GEOCENTRIC REFERENCE (ECI TEME J2000)' : 'HELIOCENTRIC REFERENCE (ECLIPTIC J2000)'}</span>
            <span>•</span>
            <span>DATA: CALCULATED (NASA JPL J2000 & CELESTRAK SGP4)</span>
            <span>•</span>
            <span style={{ color: scaleMode === 'SCIENTIFIC' ? '#34d399' : 'var(--text-muted)' }}>
              {viewMode === 'EARTH_ORBIT' 
                ? 'SATELLITE MARKERS ENLARGED'
                : scaleMode === 'SCIENTIFIC' 
                  ? 'TRUE PROPORTIONAL SCALE (AU)' 
                  : 'EXPLORATION SCALE — COMPRESSED'}
            </span>
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '10px',
            color: 'var(--text-secondary)',
            background: 'rgba(3, 7, 18, 0.88)',
            border: '1px solid var(--border-hairline)',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            pointerEvents: 'auto'
          }}>
            <Info size={11} style={{ color: 'var(--accent-cyan)' }} />
            <span>Click any planet or satellite to acquire telemetry • Drag to orbit • Scroll to zoom</span>
          </div>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Left: View Mode Toggle, Scale Mode Switcher, Quick Selectors, Search */}
          <div id="space-map-controls-panel" style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto', flexWrap: 'wrap' }}>
            {/* Mode Switcher */}
            <div className="glass-panel" style={{ display: 'flex', padding: '3px', borderRadius: 'var(--radius-xs)', gap: '3px', background: 'rgba(5, 12, 24, 0.88)' }}>
              <button
                onClick={() => {
                  setViewMode('SOLAR_SYSTEM');
                  resetView();
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: viewMode === 'SOLAR_SYSTEM' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                  color: viewMode === 'SOLAR_SYSTEM' ? '#ffffff' : 'var(--text-secondary)',
                  border: viewMode === 'SOLAR_SYSTEM' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid transparent',
                  boxShadow: viewMode === 'SOLAR_SYSTEM' ? '0 0 12px rgba(56, 189, 248, 0.16)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Orbit size={13} style={{ color: viewMode === 'SOLAR_SYSTEM' ? 'var(--accent-cyan)' : 'inherit' }} />
                <span>Solar System</span>
              </button>

              <button
                onClick={() => {
                  setViewMode('EARTH_ORBIT');
                  resetView();
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: viewMode === 'EARTH_ORBIT' ? 'rgba(56, 189, 248, 0.18)' : 'transparent',
                  color: viewMode === 'EARTH_ORBIT' ? '#ffffff' : 'var(--text-secondary)',
                  border: viewMode === 'EARTH_ORBIT' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid transparent',
                  boxShadow: viewMode === 'EARTH_ORBIT' ? '0 0 12px rgba(56, 189, 248, 0.16)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <Globe size={13} style={{ color: viewMode === 'EARTH_ORBIT' ? 'var(--accent-cyan)' : 'inherit' }} />
                <span>Earth Orbit Tracking</span>
              </button>
            </div>

            {/* Scale Mode Switcher (Visible in Solar System Mode) */}
            {viewMode === 'SOLAR_SYSTEM' && (
              <div className="glass-panel" style={{ display: 'flex', padding: '3px', borderRadius: 'var(--radius-xs)', gap: '3px', background: 'rgba(5, 12, 24, 0.88)' }}>
                <button
                  onClick={() => setScaleMode('EXPLORATION')}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: scaleMode === 'EXPLORATION' ? 'rgba(56, 189, 248, 0.20)' : 'transparent',
                    color: scaleMode === 'EXPLORATION' ? '#ffffff' : 'var(--text-secondary)',
                    border: scaleMode === 'EXPLORATION' ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Orbital distances compressed for human exploration; planets visually enlarged"
                >
                  <Sliders size={12} />
                  <span>Exploration</span>
                </button>

                <button
                  onClick={() => {
                    setScaleMode('SCIENTIFIC');
                    flyToTarget(new THREE.Vector3(60, 110, 260), new THREE.Vector3(0, -1, 0), 1200);
                  }}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    background: scaleMode === 'SCIENTIFIC' ? 'rgba(52, 211, 153, 0.20)' : 'transparent',
                    color: scaleMode === 'SCIENTIFIC' ? '#ffffff' : 'var(--text-secondary)',
                    border: scaleMode === 'SCIENTIFIC' ? '1px solid rgba(52, 211, 153, 0.45)' : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                  title="Orbital distances follow true astronomical proportions (1 AU = 22 units); planets realistically tiny"
                >
                  <Maximize2 size={12} />
                  <span>Scientific</span>
                </button>
              </div>
            )}

            {/* Quick Selectors */}
            {viewMode === 'EARTH_ORBIT' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                {['iss', 'css-tiangong', 'hubble', 'astrosat', 'cartosat-3', 'eos-06'].map(satId => {
                  const isSel = selectedBodyId === satId;
                  const nameMap: Record<string, string> = {
                    iss: 'ISS',
                    'css-tiangong': 'Tiangong',
                    hubble: 'Hubble',
                    astrosat: 'Astrosat',
                    'cartosat-3': 'Cartosat-3',
                    'eos-06': 'EOS-06'
                  };
                  return (
                    <button
                      key={satId}
                      onClick={() => {
                        focusOnObject(satId);
                        handleObjectSelection(satId, false);
                      }}
                      className={`btn ${isSel ? 'btn-active' : 'btn-secondary'}`}
                      style={{ fontSize: '11px', padding: '5px 9px' }}
                    >
                      {nameMap[satId] || satId}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                {['sun', 'earth', 'mars', 'jupiter', 'aditya-l1', 'voyager-1'].map(id => {
                  const isSel = selectedBodyId === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        if (id === 'voyager-1') {
                          setVoyagerNotice(true);
                        } else {
                          focusOnObject(id);
                        }
                        handleObjectSelection(id, false);
                      }}
                      className={`btn ${isSel ? 'btn-active' : 'btn-secondary'}`}
                      style={{ fontSize: '11px', padding: '5px 9px' }}
                    >
                      {id === 'aditya-l1' ? 'Aditya-L1' : id === 'voyager-1' ? 'Voyager 1' : id.charAt(0).toUpperCase() + id.slice(1)}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Interactive Search Bar */}
            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(5, 12, 24, 0.88)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-xs)',
                padding: '5px 10px',
                width: '200px'
              }}>
                <Search size={13} style={{ color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search body or probe..."
                  value={searchQuery}
                  onFocus={() => setShowSearchDropdown(true)}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearchDropdown(true);
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '11px',
                    width: '100%',
                    fontFamily: 'var(--font-sans)'
                  }}
                />
              </div>

              {showSearchDropdown && searchResults.length > 0 && (
                <div
                  className="glass-panel"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    borderRadius: 'var(--radius-xs)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 50,
                    padding: '4px',
                    background: 'rgba(5, 12, 24, 0.96)'
                  }}
                >
                  {searchResults.map(res => (
                    <div
                      key={res.id}
                      onClick={() => handleSearchResultSelect(res)}
                      style={{
                        padding: '6px 8px',
                        borderRadius: '3px',
                        fontSize: '11px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(56, 189, 248, 0.12)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{res.name}</span>
                      <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{res.category}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Walkthrough Tour, Camera Presets, Layer Toggles & Reset */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'auto' }}>
            {viewMode === 'EARTH_ORBIT' && isFetchingSatellites && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-xs)',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                fontSize: '10px',
                color: 'var(--accent-cyan)'
              }}>
                <RefreshCw size={11} className="radar-sweep" />
                <span>RETRIEVING ORBITAL DATA</span>
              </div>
            )}

            {/* Camera Presets (Earth Orbit) */}
            {viewMode === 'EARTH_ORBIT' && (
              <div className="glass-panel" style={{ display: 'flex', padding: '2px', borderRadius: 'var(--radius-xs)', gap: '2px', background: 'rgba(5, 12, 24, 0.88)' }}>
                <button
                  onClick={() => setCameraPreset('default')}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '10px' }}
                  title="Cinematic Orbital Horizon"
                >
                  Orbital
                </button>
                <button
                  onClick={() => setCameraPreset('horizon')}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '10px' }}
                  title="Sunlit Limb View"
                >
                  Limb
                </button>
                <button
                  onClick={() => setCameraPreset('polar')}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '10px' }}
                  title="Polar View"
                >
                  Polar
                </button>
                <button
                  onClick={() => setCameraPreset('equatorial')}
                  className="btn btn-secondary"
                  style={{ padding: '4px 8px', fontSize: '10px' }}
                  title="Equatorial View"
                >
                  Equator
                </button>
              </div>
            )}

            {/* Tour / Walkthrough Replay Button */}
            {viewMode === 'SOLAR_SYSTEM' && (
              <button
                onClick={() => handleWalkthroughStep(1)}
                className="btn btn-secondary"
                title="Start Guided Observatory Tour"
                style={{ fontSize: '11px', padding: '6px 10px', gap: '5px' }}
              >
                <Sparkles size={13} style={{ color: 'var(--accent-cyan)' }} />
                <span>Tour</span>
              </button>
            )}

            <button
              onClick={() => setShowOrbits(!showOrbits)}
              className={`btn ${showOrbits ? 'btn-active' : 'btn-secondary'}`}
              title="Toggle Keplerian Orbital Paths"
              style={{ fontSize: '11px', padding: '6px 10px' }}
            >
              <Layers size={13} />
              <span>Orbits</span>
            </button>

            <button
              onClick={resetView}
              className="btn btn-secondary"
              title="Reset Observatory Framing"
              style={{ fontSize: '11px', padding: '6px 10px' }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Guided Walkthrough Floating Modal (Phases 1 to 5) */}
      {walkthroughPhase > 0 && (
        <div
          className="glass-panel tech-corner"
          style={{
            position: 'absolute',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '460px',
            maxWidth: 'calc(100vw - 32px)',
            padding: '16px 20px',
            borderRadius: 'var(--radius-sm)',
            zIndex: 40,
            background: 'rgba(5, 12, 24, 0.94)',
            border: '1px solid rgba(56, 189, 248, 0.45)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.75)',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 700,
              color: 'var(--accent-cyan)',
              letterSpacing: '0.08em'
            }}>
              <Compass size={13} className="radar-sweep" />
              <span>{walkthroughPhase === 1 ? 'PHASE 01 // ARRIVAL' :
                     walkthroughPhase === 2 ? 'PHASE 02 // SYSTEM REVEAL' :
                     walkthroughPhase === 3 ? 'PHASE 03 // OBSERVATORY CONTROLS' :
                     walkthroughPhase === 4 ? 'PHASE 04 // TARGET ACQUISITION (EARTH)' :
                     'PHASE 05 // SYSTEM READY'}</span>
            </div>

            <button
              onClick={() => handleWalkthroughStep(0)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              title="Skip Walkthrough"
            >
              <X size={14} />
            </button>
          </div>

          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
            {walkthroughPhase === 1 && 'Approaching the Heliocentric System'}
            {walkthroughPhase === 2 && 'Keplerian Architecture & True Geometry'}
            {walkthroughPhase === 3 && 'Spatial Exploration & Time Scrubbing'}
            {walkthroughPhase === 4 && 'Target Tracking & Planetary Telemetry'}
            {walkthroughPhase === 5 && 'Observatory Ready For Exploration'}
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.55, margin: '0 0 14px 0' }}>
            {walkthroughPhase === 1 && 'Entering deep heliocentric observation domain. Notice the distant multi-tier star canopy with authentic B-V spectral classifications.'}
            {walkthroughPhase === 2 && 'Planetary positions and orbital ellipses are propagated from verified NASA JPL J2000 secular elements with inverse-square solar illumination.'}
            {walkthroughPhase === 3 && 'Left-click and drag to orbit in 360°, scroll to zoom, and toggle between Exploration and Scientific scales. Use the timeline to simulate orbital movement.'}
            {walkthroughPhase === 4 && 'Selecting any celestial body smoothly tracks the target, revealing calculated distances, light-time delays, velocity vectors, and atmospheric features.'}
            {walkthroughPhase === 5 && 'The observatory is now under your control. Switch between Exploration Scale and Scientific Scale anytime, or explore Earth Orbit Tracking.'}
          </p>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '10px',
            borderTop: '1px solid var(--border-hairline)'
          }}>
            <button
              onClick={() => handleWalkthroughStep(0)}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '5px 12px' }}
            >
              Skip Tour
            </button>

            <div style={{ display: 'flex', gap: '6px' }}>
              {walkthroughPhase > 1 && (
                <button
                  onClick={() => handleWalkthroughStep(walkthroughPhase - 1)}
                  className="btn btn-secondary"
                  style={{ fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <ChevronLeft size={12} />
                  <span>Back</span>
                </button>
              )}

              {walkthroughPhase < 5 ? (
                <button
                  onClick={() => handleWalkthroughStep(walkthroughPhase + 1)}
                  className="btn btn-primary"
                  style={{ fontSize: '11px', padding: '5px 14px', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <span>Next</span>
                  <ChevronRight size={12} />
                </button>
              ) : (
                <button
                  onClick={() => handleWalkthroughStep(0)}
                  className="btn btn-primary"
                  style={{ fontSize: '11px', padding: '5px 16px' }}
                >
                  Start Exploring
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {hoveredBody && (
        <div
          style={{
            position: 'fixed',
            left: `${hoveredBody.x + 14}px`,
            top: `${hoveredBody.y - 12}px`,
            background: 'rgba(3, 7, 18, 0.94)',
            border: '1px solid var(--accent-cyan)',
            borderRadius: '4px',
            padding: '4px 8px',
            pointerEvents: 'none',
            zIndex: 100,
            fontSize: '11px',
            color: '#ffffff',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)'
          }}
        >
          <div style={{ fontWeight: 700 }}>{hoveredBody.name}</div>
          {hoveredBody.altKm !== undefined && (
            <div style={{ fontSize: '10px', color: 'var(--accent-cyan)' }}>
              Altitude: {Math.round(hoveredBody.altKm)} km (Calculated)
            </div>
          )}
        </div>
      )}

      {/* Voyager Ephemeris Notice - Contextual Status */}
      {voyagerNotice && (
        <div
          className="glass-panel tech-corner"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '20px',
            padding: '12px 16px',
            borderRadius: 'var(--radius-sm)',
            zIndex: 25,
            maxWidth: '320px',
            border: '1px solid rgba(245, 158, 11, 0.35)',
            background: 'rgba(7, 17, 31, 0.94)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em' }}>
              <span style={{ fontSize: '7px' }}>●</span> POSITION DATA UNAVAILABLE
            </div>
            <button
              onClick={() => setVoyagerNotice(false)}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
              title="Close"
            >
              <X size={13} />
            </button>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>
            Voyager 1 (Interstellar Probe)
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Ephemeris: Source Unavailable
          </div>

          <div style={{
            display: 'flex',
            gap: '8px',
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-hairline)'
          }}>
            <button
              onClick={() => setViewing3DViewer({ id: 'voyager-1', name: 'Voyager 1' })}
              className="btn btn-primary"
              style={{ flex: 1, fontSize: '11px', padding: '6px 10px' }}
            >
              <Eye size={13} />
              <span>3D Architecture</span>
            </button>
            <button
              onClick={() => setVoyagerNotice(false)}
              className="btn btn-secondary"
              style={{ fontSize: '11px', padding: '6px 10px' }}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Target Acquisition HUD Reticle (Bottom Left) */}
      {!voyagerNotice && hudData && (
        <div
          className="glass-panel tech-corner space-map-hud"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '16px',
            padding: '12px 14px',
            borderRadius: 'var(--radius-sm)',
            zIndex: 15,
            width: '320px',
            maxWidth: 'calc(100vw - 32px)',
            animation: 'fadeIn 0.2s ease',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.65)'
          }}
        >
          {/* Header Row: Reticle indicator & Inspect Button */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-cyan)',
              letterSpacing: '0.06em',
              fontWeight: 700
            }}>
              <Crosshair size={12} className="radar-sweep" />
              <span>OBJECT ACQUIRED</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedBodyId) {
                    handleObjectSelection(selectedBodyId, true);
                  }
                }}
                type="button"
                className="btn btn-primary"
                style={{
                  padding: '3px 10px',
                  fontSize: '11px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: 'var(--radius-full)'
                }}
                aria-label={`Inspect ${hudData.name}`}
                title={`Open comprehensive telemetry inspector for ${hudData.name}`}
              >
                <span>Inspect</span>
                <ChevronRight size={12} />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedBodyId(null);
                  setHudData(null);
                  if (reticleRef.current) reticleRef.current.visible = false;
                  if (distLineRef.current) distLineRef.current.visible = false;
                }}
                type="button"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '3px',
                  touchAction: 'manipulation'
                }}
                aria-label="Dismiss object HUD"
                title="Dismiss object selection"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Object Name & Category */}
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', letterSpacing: '-0.01em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {hudData.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {hudData.catalogId && <span>{hudData.catalogId}</span>}
            {hudData.catalogId && hudData.orbitClass && <span>•</span>}
            {hudData.orbitClass && <span>{hudData.orbitClass}</span>}
          </div>

          {/* Telemetry Metrics in a single strip */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--surface-inset)',
            borderRadius: 'var(--radius-xs)',
            padding: '6px 10px',
            marginTop: '8px',
            fontSize: '11px'
          }}>
            <div>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {hudData.altitudeKm !== undefined ? 'Altitude' : 'Dist to Earth'}
              </div>
              <div className="mono" style={{ fontWeight: 700, color: 'var(--text-primary)', marginTop: '1px' }}>
                {hudData.altitudeKm !== undefined 
                  ? `${Math.round(hudData.altitudeKm)} km`
                  : formatDistanceKm(hudData.distEarthKm, true)}
              </div>
            </div>

            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {hudData.velocityKmS !== undefined ? 'Orbital Speed' : 'Radio Delay ($c$)'}
              </div>
              <div className="mono" style={{ fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '1px' }}>
                {hudData.velocityKmS !== undefined 
                  ? `${hudData.velocityKmS.toFixed(2)} km/s`
                  : hudData.lightTimeStr}
              </div>
            </div>
          </div>

          {/* Source Provenance */}
          <div style={{
            marginTop: '6px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-hairline)',
            fontSize: '9px',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>SRC: {hudData.source.substring(0, 22)}</span>
            <span style={{ color: 'var(--accent-cyan)' }}>KEPLERIAN PROPAGATED</span>
          </div>
        </div>
      )}

      {/* Scientific Transparency Scale Disclaimer (Bottom Center) */}
      <div
        className="space-map-scale-disclaimer"
        style={{
          position: 'absolute',
          bottom: '12px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(3, 5, 10, 0.88)',
          backdropFilter: 'blur(8px)',
          padding: '5px 14px',
          borderRadius: 'var(--radius-full)',
          border: '1px solid rgba(56, 189, 248, 0.25)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          textAlign: 'center',
          pointerEvents: 'none',
          maxWidth: 'min(580px, calc(100vw - 32px))',
          zIndex: 15,
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.6)'
        }}
      >
        {scaleMode === 'SCIENTIFIC' ? (
          <span>
            <strong style={{ color: '#34d399' }}>SCIENTIFIC SCALE:</strong> True proportional interplanetary distances (1 AU = 22 scene units).
          </span>
        ) : (
          <span>
            <strong style={{ color: 'var(--accent-cyan)' }}>EXPLORATION SCALE — DISTANCES VISUALLY COMPRESSED:</strong> Continuous power-law mapping preserves exact Keplerian ordering and true angular positions.
          </span>
        )}
      </div>

      {/* Time Scrubber (Bottom Right) */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '20px',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          zIndex: 15,
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'rgba(5, 12, 24, 0.92)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={13} style={{ color: 'var(--accent-cyan)' }} />
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '8px', color: 'var(--text-muted)', letterSpacing: '0.04em' }}>CALCULATED FOR</span>
            <span className="mono" style={{ fontSize: '11px', fontWeight: 600, color: '#ffffff' }}>
              {simDate.toISOString().split('T')[0]}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setSimDate(new Date(simDate.getTime() - 86400000 * 7))}
            className="btn btn-secondary"
            style={{ padding: '3px 6px', fontSize: '10px' }}
            title="Rewind 7 days"
          >
            -7d
          </button>
          <button
            onClick={() => setSimDate(new Date())}
            className="btn btn-secondary"
            style={{ padding: '3px 6px', fontSize: '10px' }}
            title="Reset to current time"
          >
            Now
          </button>
          <button
            onClick={() => setSimDate(new Date(simDate.getTime() + 86400000 * 7))}
            className="btn btn-secondary"
            style={{ padding: '3px 6px', fontSize: '10px' }}
            title="Advance 7 days"
          >
            +7d
          </button>
        </div>
      </div>

      {/* 3D Spacecraft Architecture Viewer Modal */}
      {viewing3DViewer && (
        <Spacecraft3DViewer
          craftId={viewing3DViewer.id}
          craftName={viewing3DViewer.name}
          onClose={() => setViewing3DViewer(null)}
        />
      )}

      <style>{`
        @media (max-width: 768px) {
          .space-map-scale-disclaimer {
            display: none !important;
          }
          .space-map-hud {
            bottom: 12px !important;
            left: 8px !important;
            right: 8px !important;
            width: auto !important;
            max-width: none !important;
          }
        }
      `}</style>
    </div>
  );
};
