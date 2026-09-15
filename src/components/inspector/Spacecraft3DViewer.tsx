import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X, RotateCw, ZoomIn, Info, AlertTriangle } from 'lucide-react';
import { createVoyagerSpacecraftModel } from '../models/voyagerModel';
import { createSatelliteModel } from '../models/satellite3D';

interface Spacecraft3DViewerProps {
  craftId: string;
  craftName: string;
  onClose: () => void;
}

export const Spacecraft3DViewer: React.FC<Spacecraft3DViewerProps> = ({
  craftId,
  craftName,
  onClose
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const isVoyager = craftId.includes('voyager');
  const isStation = craftId === 'iss' || craftId.includes('tiangong');

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712');

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(4, 3, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.minDistance = 2.5;
    controls.maxDistance = 14;

    // Professional Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.8);
    fillLight.position.set(-6, -2, -4);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xf59e0b, 1.2);
    rimLight.position.set(0, -6, -5);
    scene.add(rimLight);

    const ambientLight = new THREE.AmbientLight(0x1e293b, 1.2);
    scene.add(ambientLight);

    // Subtle grid platform
    const grid = new THREE.GridHelper(10, 20, 0x1e293b, 0x0a101f);
    grid.position.y = -1.8;
    scene.add(grid);

    // Model Mount
    let model: THREE.Group;
    if (isVoyager) {
      model = createVoyagerSpacecraftModel();
    } else {
      model = createSatelliteModel(1.6, isStation);
    }
    scene.add(model);

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    let animId: number;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [craftId, isVoyager, isStation]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        background: 'rgba(3, 5, 10, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px'
      }}
    >
      <div
        className="glass-panel tech-corner"
        style={{
          width: '900px',
          maxWidth: '100%',
          height: '640px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.75)'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.02)'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--accent-cyan)',
                  padding: '2px 6px',
                  borderRadius: '3px',
                  background: 'rgba(56, 189, 248, 0.1)',
                  fontWeight: 600
                }}
              >
                SPACECRAFT ARCHITECTURE // 3D VIEWER
              </span>
              {isVoyager && (
                <span
                  style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--status-last)',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: 'rgba(245, 158, 11, 0.1)',
                    fontWeight: 600
                  }}
                >
                  NON-POSITIONAL ARCHITECTURAL MODEL
                </span>
              )}
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff', marginTop: '2px' }}>
              {craftName}
            </h2>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Close 3D Viewer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Positional Transparency Alert for Voyager */}
        {isVoyager && (
          <div
            style={{
              padding: '8px 20px',
              background: 'rgba(245, 158, 11, 0.08)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '11px',
              color: '#fef08a'
            }}
          >
            <AlertTriangle size={14} style={{ flexShrink: 0, color: '#f59e0b' }} />
            <span>
              <strong>EPHEMERIS SOURCE UNAVAILABLE:</strong> Reliable browser-accessible positional data is currently unavailable for this object. Displayed in non-positional architectural context; no fabricated Solar System coordinates are rendered.
            </span>
          </div>
        )}

        {/* Main 3D Canvas Area */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div ref={mountRef} style={{ width: '100%', height: '100%', outline: 'none' }} />

          {/* Controls Hint */}
          <div
            style={{
              position: 'absolute',
              bottom: '16px',
              left: '20px',
              background: 'rgba(3, 5, 10, 0.75)',
              padding: '6px 12px',
              borderRadius: 'var(--radius-xs)',
              border: '1px solid var(--border-hairline)',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              pointerEvents: 'none'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <RotateCw size={12} /> Left-click + drag to orbit
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ZoomIn size={12} /> Scroll to zoom
            </span>
          </div>

          {/* Subsystems Breakdown Overlay (Right Side) */}
          {isVoyager && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '260px',
                background: 'rgba(7, 17, 31, 0.85)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-xs)',
                padding: '12px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={13} style={{ color: 'var(--accent-cyan)' }} />
                <span>Voyager Subsystem Architecture</span>
              </div>
              <div>• <strong>High-Gain Antenna:</strong> 3.7m parabolic dish reflector for DSN communications.</div>
              <div>• <strong>Central Bus:</strong> 10-sided decagonal equipment bay in gold thermal insulation.</div>
              <div>• <strong>RTG Power Boom:</strong> 3 radioisotope thermoelectric generators on lateral boom.</div>
              <div>• <strong>Magnetometer Boom:</strong> 13m fiberglass deployable truss with dual sensors.</div>
              <div>• <strong>Scan Platform:</strong> Narrow & wide angle television cameras, IR & UV spectrometers.</div>
              <div>• <strong>The Golden Record:</strong> 12-inch gold-plated copper phonograph record.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
