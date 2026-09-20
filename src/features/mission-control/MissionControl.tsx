import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Orbit, 
  Users, 
  ShieldCheck, 
  Compass, 
  ChevronRight, 
  Radio, 
  BookOpen,
  ArrowRightLeft,
  Sun,
  ChevronDown,
  ChevronUp,
  Activity,
  Sparkles,
  Satellite,
  Database
} from 'lucide-react';
import { SpaceWeatherWidget } from '../../components/weather/SpaceWeatherWidget';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from '../../services/data/spacecraftCatalog';
import type { SpacecraftObject } from '../../types/space';
import { AstronautsService } from '../../services/api/astronautsService';
import type { CrewReport } from '../../types/missions';
import { StatusBadge } from '../../components/common/StatusBadge';
import type { TabType } from '../../components/common/Navbar';
import type { AnalysisType } from '../analysis/ScientificAnalysis';
import { 
  createRealisticEarthShaderMaterial, 
  createRealisticAtmosphereMesh, 
  createRealisticCloudMesh 
} from '../../components/space/earthRealistic';
import { getSpacecraft3DModel } from '../../components/space/spacecraftModelRegistry';

interface MissionControlProps {
  onNavigateTab: (tab: TabType) => void;
  onFocusOnMap?: (objectId: string) => void;
  onAnalyzeObject?: (objectId: string, mode?: AnalysisType) => void;
  onExploreSpace?: () => void;
}

interface FleetSummary {
  totalTracked: number;
  currentData: number;
  calculatedData: number;
  lastAvailable: number;
  unavailable: number;
}

interface MissionSnapshotItem {
  id: string;
  name: string;
  agency: 'ISRO' | 'NASA';
  missionType: string;
  status: 'CALCULATED' | 'LAST_AVAILABLE' | 'UNAVAILABLE' | 'LIVE';
  objective: string;
  archiveReference: string;
  launchDate: string;
  launchVehicle: string;
  target: string;
  keyAchievements: string[];
  payloads: string[];
  officialSourceUrl: string;
  craftId?: string;
  actionType: 'inspect' | 'moon-distance';
}

const MISSION_SNAPSHOTS: MissionSnapshotItem[] = [
  {
    id: 'isro-aditya-l1',
    name: 'Aditya-L1 Solar Observatory',
    agency: 'ISRO',
    missionType: 'Solar Corona & Space Weather Observatory',
    status: 'CALCULATED',
    objective: 'Continuous 24/7 solar corona and disk imagery to investigate coronal heating mechanisms and coronal mass ejection (CME) acceleration dynamics at Sun-Earth L1.',
    archiveReference: 'ISRO ISSDC PRADAN Archive • SGP4 & Keplerian Models • Ref: ISRO-2023-0902',
    launchDate: 'September 2, 2023',
    launchVehicle: 'PSLV-C57 (XL Configuration)',
    target: 'Sun-Earth L1 Halo Orbit (~1.5M km from Earth)',
    keyAchievements: [
      'Successful insertion into Sun-Earth L1 halo orbit on January 6, 2024',
      'Continuous uninterrupted solar coronal observation with zero eclipses',
      'Real-time solar wind plasma sampling during major geomagnetic storms by ASPEX/PAPA'
    ],
    payloads: ['VELC', 'SUIT', 'ASPEX', 'PAPA', 'SoLEXS', 'HEL1OS', 'MAG'],
    officialSourceUrl: 'https://www.isro.gov.in/Aditya_L1.html',
    craftId: 'aditya-l1',
    actionType: 'inspect'
  },
  {
    id: 'isro-chandrayaan-3',
    name: 'Chandrayaan-3 Lunar Polar Mission',
    agency: 'ISRO',
    missionType: 'Lunar South Pole Lander & Rover In-Situ Exploration',
    status: 'LAST_AVAILABLE',
    objective: 'First in-situ vertical thermal conductivity and temperature gradient measurement of polar lunar regolith down to 10 cm, plus direct laser-spectroscopic detection of Sulphur (S).',
    archiveReference: 'ISRO ISSDC Planetary Data Archive (PRADAN) • Ref: ISRO-2023-0714',
    launchDate: 'July 14, 2023 (Touchdown: August 23, 2023)',
    launchVehicle: 'LVM3-M4',
    target: 'Lunar South Polar Region (Shiv Shakti Point, 69.37° S, 32.32° E)',
    keyAchievements: [
      'Historic first successful soft landing near the Lunar South Pole (Aug 23, 2023)',
      'Direct thermal gradient profile of lunar regolith (-10°C to +60°C) via ChaSTE',
      'Unambiguous in-situ detection of elemental Sulphur (S) by LIBS and APXS',
      'Successful 40 cm hop experiment executed by Vikram Lander'
    ],
    payloads: ['ChaSTE (Thermal Probe)', 'ILSA (Seismometer)', 'LIBS (Laser Spectroscope)', 'APXS (X-Ray Spectrometer)'],
    officialSourceUrl: 'https://www.isro.gov.in/Chandrayaan3.html',
    actionType: 'moon-distance'
  },
  {
    id: 'nasa-voyager-1',
    name: 'Voyager Interstellar Mission',
    agency: 'NASA',
    missionType: 'Interstellar Medium Exploration Probe',
    status: 'UNAVAILABLE',
    objective: 'Direct in-situ sampling of interstellar plasma density, magnetic field orientation, and galactic cosmic ray flux beyond the solar heliopause.',
    archiveReference: 'NASA Deep Space Network • Goldstone / Madrid / Canberra • Ref: NASA-VIM-1977',
    launchDate: 'September 5, 1977',
    launchVehicle: 'Titan IIIE / Centaur',
    target: 'Interstellar Space (> 163 AU from Sun, Ophiuchus direction)',
    keyAchievements: [
      'First human-made spacecraft to cross the Heliopause into Interstellar Space (August 2012)',
      'Most distant human artifact in history (> 24.5 billion km from Earth)',
      'Discovered active volcanism on Jupiter’s moon Io and intricate structure in Saturn’s rings'
    ],
    payloads: ['MAG (Magnetometer)', 'CRS (Cosmic Ray System)', 'LECP (Low Energy Charged Particles)', 'PWS (Plasma Waves)'],
    officialSourceUrl: 'https://voyager.jpl.nasa.gov/',
    craftId: 'voyager-1',
    actionType: 'inspect'
  }
];

export const MissionControl: React.FC<MissionControlProps> = ({
  onNavigateTab,
  onFocusOnMap,
  onAnalyzeObject,
  onExploreSpace
}) => {
  const [featuredFleet, setFeaturedFleet] = useState<SpacecraftObject[]>([]);
  const [fleetSummary, setFleetSummary] = useState<FleetSummary>({
    totalTracked: 12,
    currentData: 0,
    calculatedData: 0,
    lastAvailable: 0,
    unavailable: 0
  });
  const [crewReport, setCrewReport] = useState<CrewReport | null>(null);
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null);
  const miniCanvasRef = useRef<HTMLDivElement>(null);
  const snapshotStarsRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = snapshotStarsRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = canvas.parentElement?.clientWidth || 900;
      canvas.height = canvas.parentElement?.clientHeight || 500;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const stars = Array.from({ length: 48 }, () => ({
      x: Math.random() * (canvas.width || 900),
      y: Math.random() * (canvas.height || 500),
      radius: Math.random() * 1.2 + 0.4,
      alpha: Math.random() * 0.35 + 0.1,
      speedX: (Math.random() - 0.5) * 0.12,
      speedY: (Math.random() - 0.5) * 0.08,
      twinkleSpeed: Math.random() * 0.02 + 0.006,
      twinklePhase: Math.random() * Math.PI * 2
    }));

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const now = Date.now();
      stars.forEach(s => {
        s.x += s.speedX;
        s.y += s.speedY;
        if (s.x < 0) s.x = canvas.width;
        if (s.x > canvas.width) s.x = 0;
        if (s.y < 0) s.y = canvas.height;
        if (s.y > canvas.height) s.y = 0;

        const currentAlpha = Math.max(0.06, Math.min(0.5, s.alpha + Math.sin(now * s.twinkleSpeed + s.twinklePhase) * 0.14));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(186, 230, 253, ${currentAlpha})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(render);
    };
    render();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  useEffect(() => {
    async function loadData() {
      try {
        const allResolved = await Promise.all(SPACECRAFT_REGISTRY.map(def => resolveSpacecraftState(def)));

        const liveCount = allResolved.filter(c => c.telemetrySource.status === 'LIVE').length;
        const calcCount = allResolved.filter(c => c.telemetrySource.status === 'CALCULATED').length;
        const lastCount = allResolved.filter(c => c.telemetrySource.status === 'LAST_AVAILABLE').length;
        const unavailCount = allResolved.filter(c => c.telemetrySource.status === 'UNAVAILABLE').length;

        setFleetSummary({
          totalTracked: allResolved.length,
          currentData: liveCount,
          calculatedData: calcCount,
          lastAvailable: lastCount,
          unavailable: unavailCount
        });

        const featured = allResolved.filter(s => 
          ['aditya-l1', 'iss', 'astrosat', 'voyager-1'].includes(s.id)
        );
        setFeaturedFleet(featured);

        const crew = await AstronautsService.fetchActiveAstronauts();
        setCrewReport(crew);
      } catch (err) {
        console.error('Mission control load error:', err);
      }
    }

    loadData();
  }, []);

  useEffect(() => {
    if (!miniCanvasRef.current) return;
    const container = miniCanvasRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 220;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 500);
    camera.position.set(0, 9.5, 24.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const sunDirection = new THREE.Vector3(1.6, 0.5, 1.0).normalize();

    const earthGroup = new THREE.Group();
    earthGroup.rotation.z = -23.44 * (Math.PI / 180);
    earthGroup.rotation.x = 0.12;
    scene.add(earthGroup);

    const earthRadius = 5.5;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);
    const earthMat = createRealisticEarthShaderMaterial(sunDirection);
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthMesh);

    const cloudsMesh = createRealisticCloudMesh(earthRadius);
    earthGroup.add(cloudsMesh);

    const atmoMesh = createRealisticAtmosphereMesh(earthRadius, sunDirection);
    earthGroup.add(atmoMesh);

    const orbitRadius = 7.6;
    const orbitGroup = new THREE.Group();
    orbitGroup.rotation.x = 51.64 * (Math.PI / 180);
    orbitGroup.rotation.y = 0.32;
    scene.add(orbitGroup);

    const orbitPoints: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      orbitPoints.push(new THREE.Vector3(Math.cos(theta) * orbitRadius, 0, Math.sin(theta) * orbitRadius));
    }
    const orbitTrackGeo = new THREE.BufferGeometry().setFromPoints(orbitPoints);
    const orbitTrackMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.32,
      blending: THREE.AdditiveBlending
    });
    const orbitTrackLine = new THREE.Line(orbitTrackGeo, orbitTrackMat);
    orbitGroup.add(orbitTrackLine);

    const issCraft = getSpacecraft3DModel('iss', { scale: 0.125 });
    orbitGroup.add(issCraft);

    const beaconGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const beaconMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.75
    });
    const beacon = new THREE.Mesh(beaconGeo, beaconMat);
    beacon.position.set(0, 0.45, 0);
    issCraft.add(beacon);

    const sunLight = new THREE.DirectionalLight(0xfff8ee, 2.6);
    sunLight.position.copy(sunDirection.clone().multiplyScalar(40));
    scene.add(sunLight);

    const ambLight = new THREE.AmbientLight(0x060d1a, 0.35);
    scene.add(ambLight);

    const rimLight = new THREE.DirectionalLight(0x1e3a8a, 0.45);
    rimLight.position.set(-25, -10, -20);
    scene.add(rimLight);

    const starCount = 360;
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 70 + Math.random() * 35;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = r * Math.cos(phi);

      const t = Math.random();
      if (t < 0.65) {
        starColors[i * 3] = 0.85; starColors[i * 3 + 1] = 0.92; starColors[i * 3 + 2] = 1.0;
      } else if (t < 0.85) {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 1.0; starColors[i * 3 + 2] = 1.0;
      } else {
        starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.88; starColors[i * 3 + 2] = 0.72;
      }
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const starMat = new THREE.PointsMaterial({
      size: 1.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: false
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const motionScale = prefersReducedMotion ? 0.15 : 1.0;

    let animId = 0;
    let lastTime = performance.now();
    let simTime = 0;

    const animate = (now: number) => {
      animId = requestAnimationFrame(animate);

      const dt = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      if (document.hidden) return;

      simTime += dt * motionScale;

      earthMesh.rotation.y = simTime * 0.05;
      cloudsMesh.rotation.y = simTime * 0.065;

      const orbitSpeed = 0.28;
      const orbitAngle = simTime * orbitSpeed;
      const posX = Math.cos(orbitAngle) * orbitRadius;
      const posZ = Math.sin(orbitAngle) * orbitRadius;
      issCraft.position.set(posX, 0, posZ);

      issCraft.rotation.y = -orbitAngle + Math.PI / 2;
      issCraft.rotation.x = Math.sin(orbitAngle) * 0.04;

      beaconMat.opacity = 0.45 + 0.4 * Math.sin(simTime * 4.0);

      renderer.render(scene, camera);
    };

    animId = requestAnimationFrame(animate);

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      earthGeo.dispose();
      earthMat.dispose();
      cloudsMesh.geometry.dispose();
      (cloudsMesh.material as THREE.Material).dispose();
      atmoMesh.geometry.dispose();
      (atmoMesh.material as THREE.Material).dispose();
      orbitTrackGeo.dispose();
      orbitTrackMat.dispose();
      beaconGeo.dispose();
      beaconMat.dispose();
      starGeo.dispose();
      starMat.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      <div id="mission-control-overview" className="glass-panel tech-corner mission-control-hero" style={{
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 8px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-cyan)',
              fontWeight: 600,
              textTransform: 'uppercase'
            }}>
              <Radio size={12} />
              <span>SPACE INTELLIGENCE & VISUALIZATION PLATFORM</span>
            </div>

            <StatusBadge status="LIVE" />
          </div>

          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Mission Control
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: '4px' }}>
              Real-time space intelligence platform monitoring verified spacecraft, orbital mechanics, space weather, and planetary science missions from ISRO, NASA, and NOAA.
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 110px), 1fr))',
            gap: '10px',
            padding: '10px 12px',
            background: 'var(--surface-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-xs)'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Fleet</div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                {fleetSummary.totalTracked} Objects
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Humans in Orbit</div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--status-live)', marginTop: '2px' }}>
                {crewReport?.totalInOrbit || 12} Crew
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ephemeris Mode</div>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '3px' }}>
                NASA J2000
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data Integrity</div>
              <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--status-live)', marginTop: '3px' }}>
                100% Real
              </div>
            </div>
          </div>

          <div style={{ marginTop: '2px' }}>
            <div style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              marginBottom: '8px',
              letterSpacing: '0.04em',
              textTransform: 'uppercase'
            }}>
              Quick Investigations
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                onClick={() => onFocusOnMap ? onFocusOnMap('iss') : onNavigateTab('space-map')}
                className="btn btn-primary"
                style={{ fontSize: '11px', padding: '6px 12px' }}
                title="Directly track the International Space Station in live 3D Earth Orbit"
              >
                <Orbit size={13} />
                <span>Track ISS in 3D</span>
              </button>

              <button
                onClick={() => onAnalyzeObject ? onAnalyzeObject('earth', 'comparison') : onNavigateTab('analysis')}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '6px 12px' }}
                title="Compare relative velocity, trajectory, and separation vectors between bodies"
              >
                <ArrowRightLeft size={13} style={{ color: 'var(--accent-cyan)' }} />
                <span>Compare Earth & Moon</span>
              </button>

              <button
                onClick={() => onAnalyzeObject ? onAnalyzeObject('aditya-l1', 'distance') : onNavigateTab('analysis')}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '6px 12px' }}
                title="Measure distance in AU and calculate speed-of-light signal latency"
              >
                <Compass size={13} style={{ color: 'var(--accent-cyan)' }} />
                <span>Analyze Aditya-L1</span>
              </button>

              <button
                onClick={() => {
                  const el = document.getElementById('space-weather-section');
                  if (el) {
                    el.scrollIntoView({ behavior: 'smooth' });
                    el.style.boxShadow = '0 0 16px rgba(56, 189, 248, 0.25)';
                    setTimeout(() => { if (el) el.style.boxShadow = ''; }, 2000);
                  }
                }}
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '6px 12px' }}
                title="Inspect real-time NOAA solar wind and geomagnetic storm index"
              >
                <Sun size={13} style={{ color: '#f59e0b' }} />
                <span>Check Space Weather</span>
              </button>
            </div>
          </div>
        </div>

        <div className="hero-vista">
          <div ref={miniCanvasRef} style={{ width: '100%', height: '100%' }} />

          <div style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            background: 'rgba(3, 5, 10, 0.8)',
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-hairline)'
          }}>
            GEOCENTRIC SGP4 ORBIT
          </div>
        </div>
      </div>

      <div id="platform-capabilities-overview" className="glass-panel" style={{ padding: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <div style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-cyan)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 600
            }}>
              PLATFORM CAPABILITIES // DISCOVER SPACEPULSE
            </div>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
              Explore Core Intelligence Systems
            </h2>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Direct access to all 4 scientific and visualization sections
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))',
          gap: '12px'
        }}>
          <div
            onClick={() => onNavigateTab('spacecraft')}
            className="glass-card"
            style={{
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-cyan)'
                }}>
                  <Satellite size={16} />
                </div>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>01 // FLEET</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginTop: '10px' }}>
                Spacecraft Catalog
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '4px' }}>
                Browse 12 monitored spacecraft, active satellites, orbital parameters, and inspect interactive 3D blueprints.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              <span>Explore Fleet</span>
              <ChevronRight size={13} />
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('space-map')}
            className="glass-card"
            style={{
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-cyan)'
                }}>
                  <Orbit size={16} />
                </div>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>02 // 3D MAP</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginTop: '10px' }}>
                3D Space Map
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '4px' }}>
                Inspect real-time Keplerian planetary orbits (J2000) and live Earth satellites with client-side SGP4 propagation.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              <span>Launch Space Map</span>
              <ChevronRight size={13} />
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('analysis')}
            className="glass-card"
            style={{
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-cyan)'
                }}>
                  <Compass size={16} />
                </div>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>03 // KINEMATICS</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginTop: '10px' }}>
                Scientific Analysis
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '4px' }}>
                Compute true Euclidean separation, speed-of-light radio delay ($c$), and relative vectors between celestial bodies.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              <span>Run Calculations</span>
              <ChevronRight size={13} />
            </div>
          </div>

          <div
            onClick={() => onNavigateTab('missions')}
            className="glass-card"
            style={{
              padding: '16px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease'
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-cyan)'
                }}>
                  <Database size={16} />
                </div>
                <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>04 // ARCHIVES</span>
              </div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff', marginTop: '10px' }}>
                Missions & Data
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45, marginTop: '4px' }}>
                Access verified mission records, scientific milestones, and open planetary repositories from ISRO, NASA, and NOAA.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 600 }}>
              <span>View Archives</span>
              <ChevronRight size={13} />
            </div>
          </div>
        </div>
      </div>

      <div id="active-fleet-section" className="glass-panel" style={{ padding: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Active Fleet Highlights</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Key monitored spacecraft and satellites with verified telemetry states
            </p>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'var(--surface-inset)',
            padding: '5px 12px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-hairline)',
            fontSize: '11px',
            flexWrap: 'wrap'
          }}>
            <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Fleet at a Glance:
            </span>
            <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 700 }} title="Total tracked objects in registry">
              {fleetSummary.totalTracked} Monitored
            </span>
            <span style={{ color: 'var(--border-hairline)' }}>•</span>
            <span className="mono" style={{ color: 'var(--status-live)', fontWeight: 600 }} title="Real-time SGP4 live propagated objects">
              {fleetSummary.currentData} Live
            </span>
            <span style={{ color: 'var(--border-hairline)' }}>•</span>
            <span className="mono" style={{ color: 'var(--accent-cyan)', fontWeight: 600 }} title="Objects with mathematically calculated ephemeris">
              {fleetSummary.calculatedData} Calculated
            </span>
            {fleetSummary.lastAvailable > 0 && (
              <>
                <span style={{ color: 'var(--border-hairline)' }}>•</span>
                <span className="mono" style={{ color: '#f59e0b', fontWeight: 600 }} title="Historical missions with last verified archive telemetry">
                  {fleetSummary.lastAvailable} Historic
                </span>
              </>
            )}
            {fleetSummary.unavailable > 0 && (
              <>
                <span style={{ color: 'var(--border-hairline)' }}>•</span>
                <span className="mono" style={{ color: 'var(--text-muted)' }} title="Objects with ephemeris source unavailable in browser">
                  {fleetSummary.unavailable} No Ephem
                </span>
              </>
            )}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
          gap: '12px'
        }}>
          {featuredFleet.map((craft) => (
            <div
              key={craft.id}
              className="glass-card"
              style={{
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '8px'
              }}
            >
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {craft.name}
                      </span>
                      <span className="agency-badge" style={{ height: '18px', fontSize: '9px', padding: '1px 5px' }}>
                        {craft.agency}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '3px' }}>
                      {craft.orbitType}
                    </div>
                  </div>

                  <StatusBadge status={craft.telemetrySource.status} metadata={craft.telemetrySource} compact />
                </div>

                <p style={{
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  lineHeight: 1.4,
                  margin: '6px 0 0',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {craft.description}
                </p>

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '10px',
                  paddingTop: '8px',
                  borderTop: '1px solid var(--border-hairline)',
                  fontSize: '10px',
                  color: 'var(--text-muted)',
                  gap: '8px'
                }}>
                  <span className="mono" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }} title={craft.telemetrySource.sourceName}>
                    {craft.telemetrySource.sourceName}
                  </span>
                  <button
                    onClick={() => onFocusOnMap ? onFocusOnMap(craft.id) : onNavigateTab('space-map')}
                    className="btn btn-secondary"
                    style={{ padding: '3px 8px', fontSize: '10px', minHeight: '26px', gap: '3px' }}
                    title={`Track ${craft.name} on 3D Space Map`}
                  >
                    <span>Track</span>
                    <ChevronRight size={11} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div 
        id="space-weather-section"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
          gap: '20px',
          scrollMarginTop: '80px',
          transition: 'box-shadow 0.3s ease',
          borderRadius: 'var(--radius-sm)'
        }}
      >
        <SpaceWeatherWidget />

        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            borderBottom: '1px solid var(--border-hairline)',
            paddingBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                borderRadius: 'var(--radius-xs)',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}>
                <Users size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Active Crewed Outposts</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Low Earth Orbit Human Manifest
                </div>
              </div>
            </div>

            <span className="mono" style={{
              padding: '2px 8px',
              background: 'rgba(56, 189, 248, 0.1)',
              borderRadius: 'var(--radius-xs)',
              color: 'var(--accent-cyan)',
              fontWeight: 700,
              fontSize: '11px'
            }}>
              {crewReport?.totalInOrbit || 12} in Space
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {crewReport?.crafts.map((craft) => (
              <div
                key={craft.craftName}
                style={{
                  padding: '10px 12px',
                  background: 'var(--surface-inset)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-xs)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '6px'
                }}>
                  <span style={{ fontWeight: 600, fontSize: '12px' }}>
                    {craft.craftName === 'ISS' ? 'International Space Station (ISS)' : 'Tiangong (CSS Tianhe)'}
                  </span>
                  <span className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                    {craft.astronauts.length} Crew Onboard
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {craft.astronauts.map((astronaut, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderRadius: '3px',
                        border: '1px solid var(--border-hairline)',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {astronaut.name}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            fontSize: '10px',
            color: 'var(--text-muted)',
            marginTop: '10px',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Verified Source: Open-Notify Astrometry</span>
            <span>Client-Side Synchronized</span>
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '20px', position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={snapshotStarsRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 0,
            opacity: 0.85
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            flexWrap: 'wrap',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={16} style={{ color: 'var(--accent-cyan)' }} />
              <div>
                <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Mission Snapshot</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Core scientific objectives, operational milestones, and data provenance
                </div>
              </div>
            </div>

            <div style={{
              fontSize: '10px',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-mono)',
              padding: '3px 8px',
              borderRadius: 'var(--radius-xs)',
              background: 'var(--surface-inset)',
              border: '1px solid var(--border-hairline)',
              textTransform: 'uppercase'
            }}>
              Interactive Mission Dossiers
            </div>
          </div>

          <div 
            id="mission-snapshots-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 290px), 1fr))',
              gap: '14px',
              alignItems: 'start'
            }}
          >
            {MISSION_SNAPSHOTS.map((snapshot) => {
              const isExpanded = selectedSnapshotId === snapshot.id;
              const matchedCraft = snapshot.craftId 
                ? featuredFleet.find(c => c.id === snapshot.craftId) || SPACECRAFT_REGISTRY.find(c => c.id === snapshot.craftId)
                : undefined;

              return (
                <div
                  key={snapshot.id}
                  className="glass-card"
                  style={{
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '12px',
                    borderColor: isExpanded ? 'var(--accent-cyan)' : undefined,
                    background: isExpanded ? 'rgba(7, 17, 31, 0.96)' : undefined,
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontWeight: 700, fontSize: '14px', color: '#ffffff' }}>
                            {snapshot.name}
                          </span>
                          <span className="agency-badge" style={{ height: '18px', fontSize: '9px', padding: '1px 5px' }}>
                            {snapshot.agency}
                          </span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>
                          {snapshot.missionType}
                        </div>
                      </div>

                      <StatusBadge status={snapshot.status} compact />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <div style={{ background: 'var(--surface-inset)', padding: '6px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Launch Vehicle</div>
                        <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-primary)', marginTop: '2px', wordBreak: 'break-word', lineHeight: 1.35 }} title={snapshot.launchVehicle}>{snapshot.launchVehicle}</div>
                      </div>
                      <div style={{ background: 'var(--surface-inset)', padding: '6px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Launch Date</div>
                        <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--text-primary)', marginTop: '2px', wordBreak: 'break-word', lineHeight: 1.35 }} title={snapshot.launchDate}>{snapshot.launchDate}</div>
                      </div>
                    </div>

                    <div style={{ background: 'var(--surface-inset)', padding: '6px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                      <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>Target Destination</div>
                      <div style={{ fontWeight: 600, fontSize: '11px', color: 'var(--accent-cyan)', marginTop: '2px' }}>{snapshot.target}</div>
                    </div>

                    <div style={{
                      padding: '8px 10px',
                      background: 'var(--surface-inset)',
                      borderRadius: 'var(--radius-xs)',
                      border: '1px solid var(--border-hairline)',
                      fontSize: '11px',
                      lineHeight: 1.5,
                      color: 'var(--text-secondary)'
                    }}>
                      <strong style={{ color: 'var(--text-primary)' }}>Objective: </strong>
                      {snapshot.objective}
                    </div>

                    <div style={{ background: 'var(--surface-inset)', padding: '6px 8px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'uppercase', fontFamily: 'var(--font-mono)' }}>
                          Instruments & Payloads ({snapshot.payloads.length})
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(isExpanded ? snapshot.payloads : snapshot.payloads.slice(0, 3)).map((p, idx) => (
                          <span
                            key={idx}
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              background: 'rgba(56, 189, 248, 0.08)',
                              border: '1px solid rgba(56, 189, 248, 0.2)',
                              borderRadius: '3px',
                              color: 'var(--accent-cyan)'
                            }}
                          >
                            {p}
                          </span>
                        ))}
                        {!isExpanded && snapshot.payloads.length > 3 && (
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 6px',
                              background: 'rgba(255, 255, 255, 0.04)',
                              border: '1px solid var(--border-hairline)',
                              borderRadius: '3px',
                              color: 'var(--text-muted)'
                            }}
                          >
                            +{snapshot.payloads.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div 
                        style={{
                          padding: '8px 10px',
                          background: 'rgba(56, 189, 248, 0.03)',
                          borderRadius: 'var(--radius-xs)',
                          border: '1px solid rgba(56, 189, 248, 0.15)',
                          fontSize: '11px',
                          animation: 'fadeIn 0.2s ease'
                        }}
                      >
                        <div style={{ fontSize: '10px', color: 'var(--accent-cyan)', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>
                          Key Scientific Milestones
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '16px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                          {snapshot.keyAchievements.map((ach, i) => (
                            <li key={i}>{ach}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid var(--border-hairline)', paddingTop: '10px' }}>
                    <div style={{
                      fontSize: '9px',
                      color: 'var(--text-muted)',
                      fontFamily: 'var(--font-mono)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }} title={snapshot.archiveReference}>
                      {snapshot.archiveReference}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '6px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setSelectedSnapshotId(isExpanded ? null : snapshot.id)}
                          className="btn btn-ghost"
                          style={{
                            fontSize: '10px',
                            padding: '4px 8px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            color: isExpanded ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                            border: '1px solid var(--border-hairline)'
                          }}
                        >
                          <span>{isExpanded ? 'Collapse' : 'Milestones'}</span>
                          {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                      </div>

                      {snapshot.actionType === 'inspect' && matchedCraft && (
                        <button
                          type="button"
                          onClick={() => onNavigateTab('spacecraft')}
                          className="btn btn-primary"
                          style={{ fontSize: '10px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Activity size={12} />
                          <span>Telemetry</span>
                        </button>
                      )}

                      {snapshot.actionType === 'moon-distance' && (
                        <button
                          type="button"
                          onClick={() => onAnalyzeObject ? onAnalyzeObject('moon', 'distance') : onNavigateTab('analysis')}
                          className="btn btn-primary"
                          style={{ fontSize: '10px', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Compass size={12} />
                          <span>Trajectory</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="glass-panel" style={{ padding: '18px 20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '12px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={16} style={{ color: 'var(--status-live)' }} />
            <h3 style={{ fontSize: '13px', fontWeight: 600 }}>Upstream Telemetry Feeds & Protocol Health</h3>
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>100% Client-Side Architecture</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))',
          gap: '10px'
        }}>
          <div style={{ padding: '10px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>NOAA SWPC</span>
              <StatusBadge status="LIVE" compact />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              DSCOVR & GOES Solar Plasma / X-ray Stream
            </div>
          </div>

          <div style={{ padding: '10px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>CelesTrak (NORAD)</span>
              <StatusBadge status="LIVE" compact />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              GP OMM / TLE Element Sets (18th SDS)
            </div>
          </div>

          <div style={{ padding: '10px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>NASA JPL Ephemeris</span>
              <StatusBadge status="CALCULATED" compact />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Keplerian state & J2000 secular matrices
            </div>
          </div>

          <div style={{ padding: '10px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '12px' }}>ISRO Science Repositories</span>
              <StatusBadge status="LAST_AVAILABLE" compact />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>
              ISSDC PRADAN & MOSDAC mission archives
            </div>
          </div>
        </div>
      </div>

      {onExploreSpace && (
        <div
          id="explore-space-cta-card"
          onClick={onExploreSpace}
          className="glass-panel explore-space-cta"
          style={{
            position: 'relative',
            padding: '24px 28px',
            overflow: 'hidden',
            cursor: 'pointer',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            background: 'linear-gradient(135deg, rgba(3, 7, 18, 0.95) 0%, rgba(15, 23, 42, 0.9) 100%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
            transition: 'all 0.35s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '20px',
            flexWrap: 'wrap'
          }}
        >
          <div style={{
            position: 'absolute',
            top: '-50%',
            right: '-10%',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, rgba(139, 92, 246, 0.08) 50%, transparent 70%)',
            pointerEvents: 'none',
            filter: 'blur(30px)'
          }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', zIndex: 2 }}>
            <div style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              boxShadow: '0 0 16px rgba(56, 189, 248, 0.3)'
            }} className="breathing-icon">
              <Sparkles size={22} />
            </div>

            <div>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--accent-cyan)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                fontWeight: 600
              }}>
                <span>PURE VISUAL IMMERSION</span>
                <span>•</span>
                <span>SILENT COSMOS</span>
              </div>

              <div style={{
                fontSize: '18px',
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                marginTop: '2px'
              }}>
                Explore the Space
              </div>

              <div style={{
                fontSize: '12px',
                color: 'var(--text-secondary)',
                marginTop: '3px'
              }}>
                Step beyond scientific data into the silent depths of galaxies, nebulas, and the cosmic web.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', zIndex: 2 }}>
            <span style={{
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--accent-cyan)',
              fontWeight: 600,
              letterSpacing: '0.04em'
            }}>
              ENTER THE UNIVERSE
            </span>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'rgba(56, 189, 248, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              transition: 'transform 0.2s ease'
            }} className="cta-arrow">
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      )}

      <style>{`
        .explore-space-cta:hover {
          border-color: rgba(56, 189, 248, 0.6) !important;
          box-shadow: 0 12px 40px rgba(56, 189, 248, 0.2) !important;
          transform: translateY(-2px);
        }
        .explore-space-cta:hover .cta-arrow {
          transform: translateX(4px);
          background: var(--accent-cyan);
          color: #000000;
        }
        .breathing-icon {
          animation: breathingGlow 3s infinite ease-in-out;
        }
        @keyframes breathingGlow {
          0%, 100% {
            box-shadow: 0 0 12px rgba(56, 189, 248, 0.25);
            border-color: rgba(56, 189, 248, 0.35);
          }
          50% {
            box-shadow: 0 0 24px rgba(56, 189, 248, 0.55);
            border-color: rgba(56, 189, 248, 0.7);
          }
        }
        .mission-control-hero {
          display: grid;
          grid-template-columns: minmax(300px, 1.6fr) minmax(240px, 1fr);
          padding: 24px 28px;
        }
        @media (max-width: 900px) {
          .mission-control-hero {
            grid-template-columns: 1fr !important;
            padding: 20px 18px !important;
          }
          .hero-vista {
            height: 200px !important;
            border-left: none !important;
            border-top: 1px solid var(--border-hairline) !important;
          }
        }
        @media (max-width: 540px) {
          .mission-control-hero {
            padding: 16px 14px !important;
          }
          .hero-vista {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
