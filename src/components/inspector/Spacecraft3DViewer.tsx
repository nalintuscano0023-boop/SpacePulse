import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { X, RotateCw, ZoomIn, Info, AlertTriangle } from 'lucide-react';
import { getSpacecraft3DModel } from '../space/spacecraftModelRegistry';

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
  const isVoyager = craftId.toLowerCase().includes('voyager');

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#030712');

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(4.5, 3.2, 5.5);

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
    controls.minDistance = 2.0;
    controls.maxDistance = 15;

    // Professional Studio Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.4);
    keyLight.position.set(5, 8, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.85);
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

    // Mount Authentic Spacecraft-Specific 3D Model from Registry
    const model = getSpacecraft3DModel(craftId, { scale: 1.5 });
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
  }, [craftId, isVoyager]);

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

        {/* Positional Transparency Indicator for Voyager */}
        {isVoyager && (
          <div
            style={{
              padding: '6px 20px',
              background: 'rgba(245, 158, 11, 0.08)',
              borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '11px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#f59e0b', fontWeight: 700 }}>
              <span style={{ fontSize: '7px' }}>●</span>
              <span>POSITION DATA UNAVAILABLE</span>
            </div>
            <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
              Architectural 3D Model Inspection
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
          <div
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              width: '280px',
              background: 'rgba(7, 17, 31, 0.88)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-xs)',
              padding: '12px 14px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            {(() => {
              const nid = craftId.toLowerCase();
              let title = 'Spacecraft Architecture';
              let items: string[] = [];

              if (nid.includes('voyager')) {
                title = 'Voyager Subsystem Architecture';
                items = [
                  'High-Gain Antenna: 3.7m parabolic dish for DSN communications',
                  'Decagonal Bus: 10-sided equipment bay wrapped in gold thermal blanket',
                  'RTG Power Boom: 3 radioisotope thermoelectric generators',
                  'Magnetometer Boom: 13m deployable truss with dual sensors',
                  'Science Scan Platform: TV cameras, infrared & UV spectrometers',
                  'The Golden Record: 12-inch gold-plated phonograph record'
                ];
              } else if (nid.includes('aditya') || nid === '164') {
                title = 'Aditya-L1 Subsystem Architecture';
                items = [
                  'VELC: Visible Emission Line Coronagraph aperture pointing at Sun',
                  'SUIT: Solar Ultraviolet Imaging Telescope optical barrel',
                  'I-2K Bus: Gold Kapton MLI chassis with thermal control radiators',
                  'Stepped Solar Wings: Dual articulated photovoltaic panel arrays',
                  'MAG Boom: 6-meter deployable digital magnetometer boom',
                  'ASPEX & PAPA: Solar wind and plasma particle analyzer suites'
                ];
              } else if (nid.includes('chandrayaan-3') || nid.includes('vikram')) {
                title = 'Chandrayaan-3 Vikram Architecture';
                items = [
                  'Octagonal Lander Body: Gold MLI wrapped core avionics structure',
                  'Landing Gear: 4 canted shock-absorbing legs with footplates',
                  'Main Propulsion: 4 liquid throttleable engines (800N each)',
                  'ChaSTE Probe: Lunar regolith thermal gradient penetrator',
                  'ILSA: Instrument for Lunar Seismic Activity sensor',
                  'Pragyan Rover Ramp: Deployment ramp for 6-wheeled surface rover'
                ];
              } else if (nid === 'iss' || nid === '25544') {
                title = 'ISS Orbital Complex Architecture';
                items = [
                  'Integrated Truss Structure: 108m central carbon-composite backbone',
                  'Solar Array Wings: 8 dual photovoltaic wings (cobalt silicon cells)',
                  'Thermal Radiators: Ammonia active thermal control system panels',
                  'US/ESA/JAXA Modules: Destiny, Columbus, Kibo with exposed porch',
                  'Russian Segment: Zarya FGB and Zvezda service module',
                  'Cupola: 7-window nadir Earth observation dome'
                ];
              } else if (nid.includes('tiangong') || nid === '48274') {
                title = 'CSS Tiangong Subsystem Architecture';
                items = [
                  'Tianhe Core Module: Central command and living habitat cylinder',
                  'Wentian Lab Module: Dedicated life science laboratory cabin',
                  'Mengtian Lab Module: Microgravity and physics research cabin',
                  'Flexible Solar Wings: Huge articulated multi-joint solar arrays',
                  'Robotic Arm: 10.2m Chinese large robotic arm for station assembly',
                  'Docking Hub: Spherical forward node with 5 docking ports'
                ];
              } else if (nid.includes('astrosat') || nid === '40930') {
                title = 'Astrosat Subsystem Architecture';
                items = [
                  'UVIT: Twin parallel Ultraviolet Imaging Telescopes',
                  'LAXPC: 3 Large Area X-ray Proportional Counter detector boxes',
                  'SXT: Soft X-ray Telescope conical foil mirror assembly',
                  'SSM: Scanning Sky Monitor rotatable boom',
                  'Dual Solar Arrays: Articulated solar wings with carbon yokes',
                  'Downlink Dish: Steerable X-band science data antenna'
                ];
              } else if (nid.includes('hubble') || nid === '20580') {
                title = 'Hubble Space Telescope Architecture';
                items = [
                  'Optical Assembly: 2.4m Ritchey-Chrétien primary mirror assembly',
                  'Aperture Door: 45° open sunshade with baffled light shield',
                  'Solar Arrays: Dual articulated rectangular solar array wings',
                  'High-Gain Antennas: Steerable communication dishes on booms',
                  'Aft Equipment Shroud: Gold foil wrapped avionics and instrument bay'
                ];
              } else {
                title = `${craftName} Subsystem Architecture`;
                items = [
                  'Payload Assembly: Documented agency science/observation sensors',
                  'Equipment Bus: Spacecraft chassis with thermal blankets & avionics',
                  'Solar Arrays: Photovoltaic panels for continuous orbital power',
                  'Communications: High-gain parabolic antenna for telemetry download',
                  'Attitude Control: Reaction wheels, thrusters, and star trackers'
                ];
              }

              return (
                <>
                  <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                    <Info size={13} style={{ color: 'var(--accent-cyan)' }} />
                    <span>{title}</span>
                  </div>
                  {items.map((item, idx) => (
                    <div key={idx} style={{ lineHeight: 1.45 }}>
                      • <strong>{item.split(':')[0]}:</strong>{item.split(':')[1] || ''}
                    </div>
                  ))}
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};
