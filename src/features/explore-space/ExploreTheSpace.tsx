import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ArrowLeft, Sparkles, Compass, Eye } from 'lucide-react';
import { getMilkyWayTexture } from '../../components/space/deepSpaceEnvironment';

export type CosmicEnvironment = 
  | 'SOLAR_SYSTEM' 
  | 'MILKY_WAY' 
  | 'GALAXIES' 
  | 'NEBULAS' 
  | 'DEEP_SPACE' 
  | 'UNIVERSE';

interface ExploreTheSpaceProps {
  onExit: () => void;
}

export const ExploreTheSpace: React.FC<ExploreTheSpaceProps> = ({ onExit }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [activeEnv, setActiveEnv] = useState<CosmicEnvironment>('SOLAR_SYSTEM');
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Three.js References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const envGroupRef = useRef<THREE.Group | null>(null);
  const animIdRef = useRef<number>(0);
  const hideTimeoutRef = useRef<number | null>(null);

  // Handle auto-hiding controls for distraction-free immersion
  const resetControlsTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimeoutRef.current) {
      window.clearTimeout(hideTimeoutRef.current);
    }
    hideTimeoutRef.current = window.setTimeout(() => {
      setControlsVisible(false);
    }, 3500);
  }, []);

  // -------------------------------------------------------------------------
  // Procedural Environment Builders
  // -------------------------------------------------------------------------

  // 1. SOLAR SYSTEM
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

    // Add per-frame animation hook
    group.userData.update = () => {
      sunMesh.rotation.y += 0.002;
      asteroidBelt.rotation.y += 0.0004;
      planetMeshes.forEach(p => {
        p.orbitGroup.rotation.y += p.spd * 0.4;
        p.mesh.rotation.y += 0.01;
      });
    };
  };

  // 2. MILKY WAY
  const buildMilkyWay = (group: THREE.Group) => {
    // Panoramic Milky Way Dome
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

    // 25,000 Galactic Disc Stars
    const starCount = 24000;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      // Exponential distribution along galactic disc
      const r = Math.pow(Math.random(), 2.2) * 800;
      const theta = Math.random() * Math.PI * 2;
      const height = (Math.random() - 0.5) * (180 * (1 - r / 900));

      positions[i * 3] = Math.cos(theta) * r;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(theta) * r;

      // Color variation: warmer towards core, bluer in outer arms
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
    // Grand Spiral Galaxy Model using logarithmic spiral equations
    const armCount = 2;
    const starsPerArm = 8000;
    const totalStars = armCount * starsPerArm + 4000;
    const pos = new Float32Array(totalStars * 3);
    const cols = new Float32Array(totalStars * 3);

    let ptr = 0;

    // Spiral Arms
    for (let arm = 0; arm < armCount; arm++) {
      const armOffset = (arm * Math.PI * 2) / armCount;
      for (let i = 0; i < starsPerArm; i++) {
        const progress = i / starsPerArm;
        const r = Math.pow(progress, 1.4) * 480;
        const theta = r * 0.025 + armOffset;

        // Gaussian scatter around spiral arm
        const spread = 25 * progress;
        const x = Math.cos(theta) * r + (Math.random() - 0.5) * spread;
        const y = (Math.random() - 0.5) * (18 * (1 - progress));
        const z = Math.sin(theta) * r + (Math.random() - 0.5) * spread;

        pos[ptr * 3] = x;
        pos[ptr * 3 + 1] = y;
        pos[ptr * 3 + 2] = z;

        // Young blue stars in spiral arms
        cols[ptr * 3] = 0.4 + Math.random() * 0.3;
        cols[ptr * 3 + 1] = 0.65 + Math.random() * 0.3;
        cols[ptr * 3 + 2] = 1.0;
        ptr++;
      }
    }

    // Dense Galactic Core
    for (let i = 0; i < 4000; i++) {
      const r = Math.pow(Math.random(), 2) * 75;
      const theta = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 22;

      pos[ptr * 3] = Math.cos(theta) * r;
      pos[ptr * 3 + 1] = y;
      pos[ptr * 3 + 2] = Math.sin(theta) * r;

      // Golden incandescent stellar bulge
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

    // Companion Dwarf Galaxy (Elliptical satellite)
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
    // Layered Volumetric Cloud Particles
    const cloudCount = 7000;
    const pos = new Float32Array(cloudCount * 3);
    const cols = new Float32Array(cloudCount * 3);

    for (let i = 0; i < cloudCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 260;

      // Complex chaotic shape with sinusoidal modulation
      const wave = Math.sin(theta * 3) * Math.cos(phi * 2) * 45;
      const rad = r + wave;

      pos[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = (rad * Math.sin(phi) * Math.sin(theta)) * 0.7;
      pos[i * 3 + 2] = rad * Math.cos(phi);

      // Deep celestial colors: hydrogen-alpha magenta, [OIII] teal, and cosmic dust indigo
      if (rad < 100) {
        // Cyan / Teal ionization core
        cols[i * 3] = 0.15;
        cols[i * 3 + 1] = 0.85;
        cols[i * 3 + 2] = 0.95;
      } else if (rad < 190) {
        // Deep Magenta / Rose filaments
        cols[i * 3] = 0.85;
        cols[i * 3 + 1] = 0.2;
        cols[i * 3 + 2] = 0.65;
      } else {
        // Interstellar Deep Indigo
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

    // Embedded Protostellar Cluster
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
    // Ultra-dark vast emptiness with sparse distant faint stars
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

    // Extremely faint dark matter filament lines
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
    // 9,000 galaxy clusters along cosmic web filaments
    const clusterCount = 120;
    const totalPoints = clusterCount * 80;
    const pos = new Float32Array(totalPoints * 3);
    const cols = new Float32Array(totalPoints * 3);

    let ptr = 0;
    const nodes: THREE.Vector3[] = [];

    // Create primary gravitational nodes
    for (let n = 0; n < clusterCount; n++) {
      const node = new THREE.Vector3(
        (Math.random() - 0.5) * 750,
        (Math.random() - 0.5) * 450,
        (Math.random() - 0.5) * 750
      );
      nodes.push(node);
    }

    // Connect nodes with stellar filament scatter
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

        // Faint golden/violet galaxy node colors
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
    camera.position.set(0, 75, 260);
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

    // Environment Container Group
    const envGroup = new THREE.Group();
    scene.add(envGroup);
    envGroupRef.current = envGroup;

    // Build Initial Environment
    buildSolarSystem(envGroup);

    // Animation Loop
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      if (envGroup.userData?.update) {
        envGroup.userData.update();
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
  const switchEnvironment = useCallback((newEnv: CosmicEnvironment) => {
    if (newEnv === activeEnv || isTransitioning) return;
    setIsTransitioning(true);
    resetControlsTimer();

    const envGroup = envGroupRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    if (!envGroup || !camera || !controls) return;

    // Smooth transition: camera smoothly resets, old meshes dispose cleanly
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
          camera.position.set(0, 85, 300);
          controls.target.set(0, 0, 0);
          break;
        case 'MILKY_WAY':
          buildMilkyWay(envGroup);
          camera.position.set(0, 120, 480);
          controls.target.set(0, 0, 0);
          break;
        case 'GALAXIES':
          buildGalaxies(envGroup);
          camera.position.set(0, 160, 460);
          controls.target.set(0, 0, 0);
          break;
        case 'NEBULAS':
          buildNebulas(envGroup);
          camera.position.set(0, 50, 240);
          controls.target.set(0, 0, 0);
          break;
        case 'DEEP_SPACE':
          buildDeepSpace(envGroup);
          camera.position.set(0, 30, 200);
          controls.target.set(0, 0, 0);
          break;
        case 'UNIVERSE':
          buildUniverse(envGroup);
          camera.position.set(0, 200, 600);
          controls.target.set(0, 0, 0);
          break;
      }

      setActiveEnv(newEnv);
      setIsTransitioning(false);
    }, 280);
  }, [activeEnv, isTransitioning, resetControlsTimer]);

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

      {/* Subtle Cinematic Warp / Transition Overlay */}
      {isTransitioning && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(1, 2, 6, 0.85)',
          backdropFilter: 'blur(12px)',
          transition: 'all 0.25s ease',
          pointerEvents: 'none'
        }} />
      )}

      {/* Top Left Return Button (Subtle & Auto-Hiding) */}
      <div style={{
        position: 'absolute',
        top: '24px',
        left: '24px',
        zIndex: 20,
        transition: 'opacity 0.4s ease',
        opacity: controlsVisible ? 1 : 0.15,
        pointerEvents: controlsVisible ? 'auto' : 'none'
      }}>
        <button
          onClick={onExit}
          className="btn"
          style={{
            background: 'rgba(7, 17, 31, 0.8)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: 'var(--text-primary)',
            padding: '8px 14px',
            fontSize: '12px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            borderRadius: 'var(--radius-full)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.6)'
          }}
          title="Return to SpacePulse Mission Control"
        >
          <ArrowLeft size={14} style={{ color: 'var(--accent-cyan)' }} />
          <span>Return to SpacePulse</span>
        </button>
      </div>

      {/* Bottom Center: Minimal Cosmic Environment Selector (Auto-Hiding) */}
      <div style={{
        position: 'absolute',
        bottom: '28px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 20,
        transition: 'opacity 0.4s ease',
        opacity: controlsVisible ? 1 : 0.18,
        pointerEvents: controlsVisible ? 'auto' : 'none',
        maxWidth: 'calc(100vw - 32px)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(7, 17, 31, 0.85)',
          backdropFilter: 'blur(14px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
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
                  background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'transparent',
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
    </div>
  );
};
