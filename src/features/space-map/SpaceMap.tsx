import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { 
  Orbit,
  Layers, 
  Clock, 
  RotateCcw, 
  ChevronRight
} from 'lucide-react';
import { calculatePlanetEphemeris } from '../../services/calculations/kepler';
import { calculateAdityaL1Ephemeris, calculateVoyagerEphemeris } from '../../services/calculations/lagrange';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from '../../services/data/spacecraftCatalog';
import type { SpacecraftObject } from '../../types/space';
import { formatDistanceKm } from '../../utils/formatters';
import { kmToAu, formatLightTime, calculateLightTimeSeconds } from '../../services/calculations/physics';
import { StatusBadge } from '../../components/common/StatusBadge';

interface SpaceMapProps {
  onSelectObject: (obj: SpacecraftObject) => void;
  selectedObjectId?: string;
}

interface VisualBody {
  id: string;
  name: string;
  type: 'star' | 'planet' | 'moon' | 'spacecraft';
  mesh: THREE.Object3D;
  position: THREE.Vector3; // Visual units
  realKm: { x: number; y: number; z: number };
  radiusKm: number;
  orbitLine?: THREE.Line;
  labelSprite?: THREE.Sprite;
  color: string;
  craftData?: SpacecraftObject;
}

export const SpaceMap: React.FC<SpaceMapProps> = ({ onSelectObject, selectedObjectId }) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // UI state
  const [showOrbits, setShowOrbits] = useState(true);
  const [showSpacecraft, setShowSpacecraft] = useState(true);
  const [showPlanets] = useState(true);
  const [simDate, setSimDate] = useState<Date>(new Date());
  const [selectedBodyId, setSelectedBodyId] = useState<string | null>(selectedObjectId || 'earth');
  const [hudData, setHudData] = useState<{
    name: string;
    distEarthKm: number;
    distSunKm: number;
    lightTimeStr: string;
    type: string;
  } | null>(null);

  // Internal Three.js references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const bodiesRef = useRef<Map<string, VisualBody>>(new Map());
  const distanceLineRef = useRef<THREE.Line | null>(null);
  const animationFrameRef = useRef<number>(0);

  // Visual scaling helpers:
  // In heliocentric view: 1 AU = 32 visual units with logarithmic soft-falloff for outer planets
  const mapAuToVisual = (au: number) => {
    if (au <= 1.8) return au * 32.0;
    if (au <= 6.0) return 1.8 * 32.0 + Math.pow(au - 1.8, 0.75) * 22.0;
    return 1.8 * 32.0 + Math.pow(6.0 - 1.8, 0.75) * 22.0 + Math.pow(au - 6.0, 0.65) * 16.0;
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#05070e');
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 8000);
    camera.position.set(0, 160, 220);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 1800;
    controls.minDistance = 5;
    controlsRef.current = controls;

    // 5. Lighting
    const sunLight = new THREE.PointLight(0xffffff, 2.5, 3000, 0.2);
    sunLight.position.set(0, 0, 0);
    scene.add(sunLight);

    const ambientLight = new THREE.AmbientLight(0x334155, 0.7);
    scene.add(ambientLight);

    // 6. Deep Starfield
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 3500;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const r = 1200 + Math.random() * 800;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const brightness = 0.5 + Math.random() * 0.5;
      starColors[i * 3] = brightness;
      starColors[i * 3 + 1] = brightness * (0.85 + Math.random() * 0.15);
      starColors[i * 3 + 2] = brightness * (0.9 + Math.random() * 0.1);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMaterial = new THREE.PointsMaterial({ size: 1.6, vertexColors: true, transparent: true, opacity: 0.8 });
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);

    // 7. Ecliptic Reference Plane Grid (subtle)
    const grid = new THREE.GridHelper(400, 40, 0x1e293b, 0x0f172a);
    grid.position.y = -0.5;
    scene.add(grid);

    // 8. Distance Line
    const distLineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0)]);
    const distLineMat = new THREE.LineDashedMaterial({
      color: 0x38bdf8,
      dashSize: 3,
      gapSize: 2,
      linewidth: 1.5,
      transparent: true,
      opacity: 0.75
    });
    const distanceLine = new THREE.Line(distLineGeo, distLineMat);
    distanceLine.computeLineDistances();
    distanceLine.visible = false;
    scene.add(distanceLine);
    distanceLineRef.current = distanceLine;

    // Resize handler
    const handleResize = () => {
      if (!container || !renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Raycaster for object clicking
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const meshes: THREE.Object3D[] = [];
      bodiesRef.current.forEach(body => {
        meshes.push(body.mesh);
      });

      const intersects = raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        let hitObject: THREE.Object3D | null = intersects[0].object;
        while (hitObject && !hitObject.userData.bodyId && hitObject.parent) {
          hitObject = hitObject.parent;
        }
        if (hitObject && hitObject.userData.bodyId) {
          const bodyId = hitObject.userData.bodyId;
          setSelectedBodyId(bodyId);
          const body = bodiesRef.current.get(bodyId);
          if (body && body.craftData) {
            onSelectObject(body.craftData);
          }
        }
      }
    };

    renderer.domElement.addEventListener('click', handleClick);

    // Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls.update();

      // Rotate planet meshes on their axes
      bodiesRef.current.forEach(body => {
        if (body.mesh) {
          body.mesh.rotation.y += 0.005;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleClick);
      renderer.dispose();
    };
  }, []);

  // Update bodies whenever date or settings change
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear existing bodies
    bodiesRef.current.forEach(body => {
      scene.remove(body.mesh);
      if (body.orbitLine) scene.remove(body.orbitLine);
    });
    bodiesRef.current.clear();

    const planetDefs = [
      { id: 'mercury', name: 'Mercury', color: '#94a3b8', radius: 1.0 },
      { id: 'venus', name: 'Venus', color: '#e2e8f0', radius: 1.6 },
      { id: 'earth', name: 'Earth', color: '#38bdf8', radius: 1.8 },
      { id: 'mars', name: 'Mars', color: '#ef4444', radius: 1.3 },
      { id: 'jupiter', name: 'Jupiter', color: '#f59e0b', radius: 4.2 },
      { id: 'saturn', name: 'Saturn', color: '#fde047', radius: 3.5, hasRings: true },
      { id: 'uranus', name: 'Uranus', color: '#67e8f9', radius: 2.6 },
      { id: 'neptune', name: 'Neptune', color: '#6366f1', radius: 2.5 }
    ];

    // 1. Create Sun
    const sunGeo = new THREE.SphereGeometry(6.5, 32, 32);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xfff7ed });
    const sunMesh = new THREE.Mesh(sunGeo, sunMat);
    sunMesh.userData = { bodyId: 'sun' };

    // Sun Glow Halo
    const haloGeo = new THREE.SphereGeometry(8.5, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    sunMesh.add(halo);
    scene.add(sunMesh);

    bodiesRef.current.set('sun', {
      id: 'sun',
      name: 'Sun',
      type: 'star',
      mesh: sunMesh,
      position: new THREE.Vector3(0, 0, 0),
      realKm: { x: 0, y: 0, z: 0 },
      radiusKm: 696340,
      color: '#f59e0b'
    });

    // 2. Compute Planet Ephemerides
    planetDefs.forEach(p => {
      try {
        const ephem = calculatePlanetEphemeris(p.id, simDate);

        const rAU = Math.sqrt(ephem.positionAU.x * ephem.positionAU.x + ephem.positionAU.y * ephem.positionAU.y + ephem.positionAU.z * ephem.positionAU.z);
        const visualR = mapAuToVisual(rAU);
        const factor = rAU > 0 ? visualR / rAU : 1;

        const posX = ephem.positionAU.x * factor;
        const posZ = ephem.positionAU.y * factor; // Map Y ecliptic to Z 3D
        const posY = ephem.positionAU.z * factor;

        // Mesh
        const geo = new THREE.SphereGeometry(p.radius, 24, 24);
        const mat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(p.color),
          roughness: 0.6,
          metalness: 0.1
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(posX, posY, posZ);
        mesh.userData = { bodyId: p.id };

        // Saturn Rings
        if (p.hasRings) {
          const ringGeo = new THREE.RingGeometry(p.radius * 1.4, p.radius * 2.3, 32);
          const ringMat = new THREE.MeshBasicMaterial({
            color: 0xe2e8f0,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.7
          });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.rotation.x = Math.PI / 2.3;
          mesh.add(ring);
        }

        // Orbit Line Loop
        let orbitLine: THREE.Line | undefined;
        if (showOrbits) {
          const orbitPts: THREE.Vector3[] = [];
          const samples = 100;
          for (let s = 0; s <= samples; s++) {
            const sampleDate = new Date(simDate.getTime() + (s / samples) * (p.id === 'mercury' ? 88 : p.id === 'earth' ? 365.25 : 687) * 86400000);
            const sEphem = calculatePlanetEphemeris(p.id, sampleDate);
            const srAU = Math.sqrt(sEphem.positionAU.x * sEphem.positionAU.x + sEphem.positionAU.y * sEphem.positionAU.y + sEphem.positionAU.z * sEphem.positionAU.z);
            const sVisR = mapAuToVisual(srAU);
            const sFactor = srAU > 0 ? sVisR / srAU : 1;
            orbitPts.push(new THREE.Vector3(sEphem.positionAU.x * sFactor, sEphem.positionAU.z * sFactor, sEphem.positionAU.y * sFactor));
          }
          const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitPts);
          const orbitMat = new THREE.LineBasicMaterial({
            color: new THREE.Color(p.color),
            transparent: true,
            opacity: 0.25
          });
          orbitLine = new THREE.Line(orbitGeo, orbitMat);
          scene.add(orbitLine);
        }

        mesh.visible = showPlanets;
        scene.add(mesh);

        bodiesRef.current.set(p.id, {
          id: p.id,
          name: p.name,
          type: 'planet',
          mesh,
          position: new THREE.Vector3(posX, posY, posZ),
          realKm: ephem.positionKm,
          radiusKm: p.radius * 2000,
          orbitLine,
          color: p.color
        });
      } catch (e) {
        console.error('Ephem error for', p.id, e);
      }
    });

    // 3. Spacecraft: Aditya-L1
    try {
      const l1 = calculateAdityaL1Ephemeris(simDate);
      const earthBody = bodiesRef.current.get('earth');
      if (earthBody) {
        // Offset visually along Sun-Earth vector
        const dir = new THREE.Vector3().subVectors(new THREE.Vector3(0, 0, 0), earthBody.position).normalize();
        const l1VisualPos = earthBody.position.clone().add(dir.multiplyScalar(4.5));

        const l1Geo = new THREE.OctahedronGeometry(0.8);
        const l1Mat = new THREE.MeshStandardMaterial({
          color: 0x38bdf8,
          emissive: 0x0284c7,
          emissiveIntensity: 0.5
        });
        const l1Mesh = new THREE.Mesh(l1Geo, l1Mat);
        l1Mesh.position.copy(l1VisualPos);
        l1Mesh.userData = { bodyId: 'aditya-l1' };
        l1Mesh.visible = showSpacecraft;
        scene.add(l1Mesh);

        // Halo Orbit Ring
        let haloLine: THREE.Line | undefined;
        if (showOrbits) {
          const haloPts: THREE.Vector3[] = [];
          for (let a = 0; a <= 32; a++) {
            const th = (a / 32) * Math.PI * 2;
            haloPts.push(l1VisualPos.clone().add(new THREE.Vector3(1.2 * Math.cos(th), 0.8 * Math.sin(th), 0)));
          }
          const hGeo = new THREE.BufferGeometry().setFromPoints(haloPts);
          const hMat = new THREE.LineBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
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
      console.error('L1 visual error:', e);
    }

    // 4. Spacecraft: Voyager 1 & Voyager 2 (Interstellar)
    ['voyager1', 'voyager2'].forEach(v => {
      try {
        const voy = calculateVoyagerEphemeris(v as 'voyager1' | 'voyager2', simDate);
        const id = v === 'voyager1' ? 'voyager-1' : 'voyager-2';
        const name = v === 'voyager1' ? 'Voyager 1' : 'Voyager 2';

        const visualR = mapAuToVisual(voy.distanceFromSunAU);
        const dirNorm = new THREE.Vector3(voy.positionAU.x, voy.positionAU.z, voy.positionAU.y).normalize();
        const vPos = dirNorm.multiplyScalar(visualR);

        const vGeo = new THREE.ConeGeometry(0.8, 1.6, 4);
        const vMat = new THREE.MeshStandardMaterial({
          color: v === 'voyager1' ? 0xf43f5e : 0xec4899,
          emissive: v === 'voyager1' ? 0x9f1239 : 0x831843,
          emissiveIntensity: 0.6
        });
        const vMesh = new THREE.Mesh(vGeo, vMat);
        vMesh.position.copy(vPos);
        vMesh.lookAt(vPos.clone().multiplyScalar(2));
        vMesh.userData = { bodyId: id };
        vMesh.visible = showSpacecraft;
        scene.add(vMesh);

        // Hyperbolic Trajectory Line from Sun
        let trajLine: THREE.Line | undefined;
        if (showOrbits) {
          const trajPts = [new THREE.Vector3(0, 0, 0), vPos];
          const tGeo = new THREE.BufferGeometry().setFromPoints(trajPts);
          const tMat = new THREE.LineDashedMaterial({
            color: v === 'voyager1' ? 0xf43f5e : 0xec4899,
            dashSize: 4,
            gapSize: 3,
            transparent: true,
            opacity: 0.4
          });
          trajLine = new THREE.Line(tGeo, tMat);
          trajLine.computeLineDistances();
          scene.add(trajLine);
        }

        const voyDef = SPACECRAFT_REGISTRY.find(s => s.id === id);
        if (voyDef) {
          resolveSpacecraftState(voyDef, simDate).then(craftState => {
            bodiesRef.current.set(id, {
              id,
              name,
              type: 'spacecraft',
              mesh: vMesh,
              position: vPos,
              realKm: voy.positionKm,
              radiusKm: 2,
              orbitLine: trajLine,
              color: v === 'voyager1' ? '#f43f5e' : '#ec4899',
              craftData: craftState
            });
          });
        }
      } catch (e) {
        console.error('Voyager visual error:', e);
      }
    });

  }, [simDate, showOrbits, showPlanets, showSpacecraft]);

  // Update HUD and Distance Line when selection changes
  useEffect(() => {
    const earth = bodiesRef.current.get('earth');
    const selected = selectedBodyId ? bodiesRef.current.get(selectedBodyId) : null;
    const distLine = distanceLineRef.current;

    if (selected && earth && selected.id !== 'earth' && distLine) {
      distLine.geometry.setFromPoints([earth.position, selected.position]);
      distLine.computeLineDistances();
      distLine.visible = true;

      // Real physical distance calculation
      const dx = selected.realKm.x - earth.realKm.x;
      const dy = selected.realKm.y - earth.realKm.y;
      const dz = selected.realKm.z - earth.realKm.z;
      const distEarthKm = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const distSunKm = Math.sqrt(
        selected.realKm.x * selected.realKm.x +
        selected.realKm.y * selected.realKm.y +
        selected.realKm.z * selected.realKm.z
      );
      const ltSec = calculateLightTimeSeconds(distEarthKm);

      setHudData({
        name: selected.name,
        distEarthKm,
        distSunKm,
        lightTimeStr: formatLightTime(ltSec),
        type: selected.type
      });
    } else {
      if (distLine) distLine.visible = false;
      if (selected && selected.id === 'earth' && earth) {
        const distSunKm = Math.sqrt(
          earth.realKm.x * earth.realKm.x +
          earth.realKm.y * earth.realKm.y +
          earth.realKm.z * earth.realKm.z
        );
        setHudData({
          name: 'Earth',
          distEarthKm: 0,
          distSunKm,
          lightTimeStr: '0.0 ms',
          type: 'planet'
        });
      } else {
        setHudData(null);
      }
    }
  }, [selectedBodyId, simDate]);

  // Focus Camera on Selected Body
  const focusOnObject = (id: string) => {
    const body = bodiesRef.current.get(id);
    if (!body || !cameraRef.current || !controlsRef.current) return;

    const targetPos = body.position;
    controlsRef.current.target.copy(targetPos);
    cameraRef.current.position.set(
      targetPos.x + 18,
      targetPos.y + 12,
      targetPos.z + 24
    );
    controlsRef.current.update();
  };

  // Reset to Global Solar System View
  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    controlsRef.current.target.set(0, 0, 0);
    cameraRef.current.position.set(0, 160, 220);
    controlsRef.current.update();
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: 'calc(100vh - 120px)', minHeight: '600px', overflow: 'hidden' }}>
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} style={{ width: '100%', height: '100%', outline: 'none' }} />

      {/* Top Floating Control Bar */}
      <div style={{
        position: 'absolute',
        top: '16px',
        left: '20px',
        right: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        pointerEvents: 'none',
        zIndex: 10
      }}>
        {/* Left: View Mode Badge & Quick Object Select */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
          <div className="glass-panel" style={{
            padding: '6px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: 'var(--radius-sm)'
          }}>
            <Orbit size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
              Solar System Ephemeris
            </span>
            <StatusBadge status="CALCULATED" compact />
          </div>

          {/* Quick Object Focus Buttons */}
          {['sun', 'earth', 'mars', 'jupiter', 'aditya-l1', 'voyager-1'].map(id => {
            const isSel = selectedBodyId === id;
            return (
              <button
                key={id}
                onClick={() => {
                  setSelectedBodyId(id);
                  focusOnObject(id);
                }}
                className={`btn ${isSel ? 'btn-active' : 'btn-secondary'}`}
                style={{ fontSize: '11px', padding: '6px 10px', pointerEvents: 'auto' }}
              >
                {id === 'aditya-l1' ? 'Aditya-L1' : id === 'voyager-1' ? 'Voyager 1' : id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Right: Layer Toggles & View Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', pointerEvents: 'auto' }}>
          <button
            onClick={() => setShowOrbits(!showOrbits)}
            className={`btn ${showOrbits ? 'btn-active' : 'btn-secondary'}`}
            title="Toggle Orbital Paths"
            style={{ fontSize: '11px', padding: '6px 10px' }}
          >
            <Layers size={13} />
            <span>Orbits</span>
          </button>

          <button
            onClick={() => setShowSpacecraft(!showSpacecraft)}
            className={`btn ${showSpacecraft ? 'btn-active' : 'btn-secondary'}`}
            title="Toggle Spacecraft"
            style={{ fontSize: '11px', padding: '6px 10px' }}
          >
            <span>Probes</span>
          </button>

          <button
            onClick={resetView}
            className="btn btn-secondary"
            title="Reset Camera View"
            style={{ fontSize: '11px', padding: '6px 10px' }}
          >
            <RotateCcw size={13} />
            <span>Reset View</span>
          </button>
        </div>
      </div>

      {/* Real-time Distance HUD Box (Bottom Left) */}
      {hudData && (
        <div
          className="glass-panel"
          style={{
            position: 'absolute',
            bottom: '24px',
            left: '20px',
            padding: '16px 20px',
            borderRadius: 'var(--radius-md)',
            zIndex: 10,
            maxWidth: '380px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {hudData.name}
              </span>
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                background: 'rgba(56, 189, 248, 0.1)',
                borderRadius: '4px',
                color: 'var(--accent-cyan)',
                fontWeight: 600,
                textTransform: 'uppercase'
              }}>
                {hudData.type}
              </span>
            </div>

            <button
              onClick={() => {
                const body = bodiesRef.current.get(selectedBodyId || '');
                if (body?.craftData) {
                  onSelectObject(body.craftData);
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--accent-cyan)',
                cursor: 'pointer',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>Inspect</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Distance to Earth
              </div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {formatDistanceKm(hudData.distEarthKm, true)}
              </div>
              <div className="mono" style={{ fontSize: '11px', color: 'var(--accent-cyan)' }}>
                {kmToAu(hudData.distEarthKm).toFixed(3)} AU
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                Radio Signal Delay
              </div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                {hudData.lightTimeStr}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                One-way light time ($c$)
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '10px',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-subtle)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Visual scale: Logarithmic normalized</span>
            <span>Metrics: Exact astronomical calculation</span>
          </div>
        </div>
      )}

      {/* Interactive Time Navigation Bar (Bottom Right) */}
      <div
        className="glass-panel"
        style={{
          position: 'absolute',
          bottom: '24px',
          right: '20px',
          padding: '12px 16px',
          borderRadius: 'var(--radius-md)',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Clock size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span className="mono" style={{ fontSize: '12px', fontWeight: 600 }}>
            {simDate.toISOString().split('T')[0]}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setSimDate(new Date(simDate.getTime() - 86400000 * 7))}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '10px' }}
            title="Rewind 7 days"
          >
            -7d
          </button>
          <button
            onClick={() => setSimDate(new Date())}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '10px' }}
            title="Reset to current time"
          >
            Now
          </button>
          <button
            onClick={() => setSimDate(new Date(simDate.getTime() + 86400000 * 7))}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '10px' }}
            title="Advance 7 days"
          >
            +7d
          </button>
          <button
            onClick={() => setSimDate(new Date(simDate.getTime() + 86400000 * 30))}
            className="btn btn-secondary"
            style={{ padding: '4px 8px', fontSize: '10px' }}
            title="Advance 30 days"
          >
            +30d
          </button>
        </div>
      </div>
    </div>
  );
};
