import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

export const SpaceEnvironment: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;

    let isWebGLAvailable = true;
    try {
      const canvas = document.createElement('canvas');
      isWebGLAvailable = !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
    } catch {
      isWebGLAvailable = false;
    }

    if (!isWebGLAvailable) {
      return;
    }

    const width = window.innerWidth;
    const height = window.innerHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x03050a, 0.0004);

    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 4000);
    camera.position.z = 800;

    const isMobile = window.innerWidth < 768;
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: false,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 1.5));
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.pointerEvents = 'none';
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const distantStarCount = isMobile ? 1200 : 3200;
    const distantGeo = new THREE.BufferGeometry();
    const distantPositions = new Float32Array(distantStarCount * 3);
    const distantColors = new Float32Array(distantStarCount * 3);

    const spectralColors = [
      new THREE.Color(0xa5b4fc),
      new THREE.Color(0xe0e7ff),
      new THREE.Color(0xfef08a),
      new THREE.Color(0xfdba74),
      new THREE.Color(0xfca5a5)
    ];

    for (let i = 0; i < distantStarCount; i++) {
      const radius = 1200 + Math.random() * 1600;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      distantPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      distantPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      distantPositions[i * 3 + 2] = radius * Math.cos(phi);

      const color = spectralColors[Math.floor(Math.random() * spectralColors.length)];
      const brightness = 0.35 + Math.random() * 0.65;
      distantColors[i * 3] = color.r * brightness;
      distantColors[i * 3 + 1] = color.g * brightness;
      distantColors[i * 3 + 2] = color.b * brightness;
    }

    distantGeo.setAttribute('position', new THREE.BufferAttribute(distantPositions, 3));
    distantGeo.setAttribute('color', new THREE.BufferAttribute(distantColors, 3));

    const distantMat = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.85
    });

    const distantStars = new THREE.Points(distantGeo, distantMat);
    scene.add(distantStars);

    const mwStarCount = isMobile ? 2000 : 5500;
    const mwGeo = new THREE.BufferGeometry();
    const mwPositions = new Float32Array(mwStarCount * 3);
    const mwColors = new Float32Array(mwStarCount * 3);

    const galacticAngle = -Math.PI / 3.8;
    const cosG = Math.cos(galacticAngle);
    const sinG = Math.sin(galacticAngle);

    for (let i = 0; i < mwStarCount; i++) {
      const t = (Math.random() - 0.5) * 2800;
      const u = (Math.random() + Math.random() + Math.random() - 1.5) * 260;
      const z = -600 + (Math.random() - 0.5) * 800;

      const x = t * cosG - u * sinG;
      const y = t * sinG + u * cosG;

      mwPositions[i * 3] = x;
      mwPositions[i * 3 + 1] = y;
      mwPositions[i * 3 + 2] = z;

      const coreFactor = Math.exp(-(u * u) / 25000);
      const isCore = Math.random() < coreFactor;

      if (isCore) {
        mwColors[i * 3] = 0.85 + Math.random() * 0.15;
        mwColors[i * 3 + 1] = 0.88 + Math.random() * 0.12;
        mwColors[i * 3 + 2] = 0.98;
      } else {
        mwColors[i * 3] = 0.25 + Math.random() * 0.25;
        mwColors[i * 3 + 1] = 0.35 + Math.random() * 0.35;
        mwColors[i * 3 + 2] = 0.75 + Math.random() * 0.25;
      }
    }

    mwGeo.setAttribute('position', new THREE.BufferAttribute(mwPositions, 3));
    mwGeo.setAttribute('color', new THREE.BufferAttribute(mwColors, 3));

    const mwMat = new THREE.PointsMaterial({
      size: 1.8,
      vertexColors: true,
      transparent: true,
      opacity: 0.7
    });

    const milkyWay = new THREE.Points(mwGeo, mwMat);
    scene.add(milkyWay);

    const fgCount = isMobile ? 180 : 450;
    const fgGeo = new THREE.BufferGeometry();
    const fgPositions = new Float32Array(fgCount * 3);
    const fgColors = new Float32Array(fgCount * 3);

    for (let i = 0; i < fgCount; i++) {
      fgPositions[i * 3] = (Math.random() - 0.5) * 1800;
      fgPositions[i * 3 + 1] = (Math.random() - 0.5) * 1400;
      fgPositions[i * 3 + 2] = 200 + Math.random() * 400;

      const c = spectralColors[Math.floor(Math.random() * spectralColors.length)];
      fgColors[i * 3] = c.r;
      fgColors[i * 3 + 1] = c.g;
      fgColors[i * 3 + 2] = c.b;
    }

    fgGeo.setAttribute('position', new THREE.BufferAttribute(fgPositions, 3));
    fgGeo.setAttribute('color', new THREE.BufferAttribute(fgColors, 3));

    const fgMat = new THREE.PointsMaterial({
      size: 2.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9
    });

    const fgStars = new THREE.Points(fgGeo, fgMat);
    scene.add(fgStars);

    let targetMouseX = 0;
    let targetMouseY = 0;
    let currentMouseX = 0;
    let currentMouseY = 0;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 60;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 40;
    };

    if (!isMobile) {
      window.addEventListener('mousemove', onMouseMove, { passive: true });
    }

    const onResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId = 0;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      
      if (!prefersReducedMotion) {
        const elapsed = clock.getElapsedTime();
        distantStars.rotation.y = elapsed * 0.0012;
        milkyWay.rotation.y = elapsed * 0.0016;
        fgStars.rotation.y = elapsed * 0.0022;

        currentMouseX += (targetMouseX - currentMouseX) * 0.03;
        currentMouseY += (targetMouseY - currentMouseY) * 0.03;

        camera.position.x = currentMouseX;
        camera.position.y = -currentMouseY;
        camera.lookAt(0, 0, 0);
      }

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (!isMobile) {
        window.removeEventListener('mousemove', onMouseMove);
      }
      renderer.dispose();
      distantGeo.dispose();
      distantMat.dispose();
      mwGeo.dispose();
      mwMat.dispose();
      fgGeo.dispose();
      fgMat.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        background: `
          radial-gradient(ellipse 110% 70% at 75% 15%, rgba(30, 27, 75, 0.35) 0%, transparent 70%),
          radial-gradient(ellipse 90% 60% at 20% 85%, rgba(15, 23, 42, 0.45) 0%, transparent 60%),
          linear-gradient(180deg, #03050a 0%, #07111f 55%, #05070e 100%)
        `
      }}
    />
  );
};
