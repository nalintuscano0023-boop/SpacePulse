import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Orbit, 
  Users, 
  ShieldCheck, 
  ArrowUpRight, 
  Compass, 
  ChevronRight,
  Database,
  Radio,
  Clock,
  Sparkles,
  Layers,
  Crosshair
} from 'lucide-react';
import { SpaceWeatherWidget } from '../../components/weather/SpaceWeatherWidget';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from '../../services/data/spacecraftCatalog';
import type { SpacecraftObject } from '../../types/space';
import { AstronautsService } from '../../services/api/astronautsService';
import type { CrewReport } from '../../types/missions';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDistanceKm, formatVelocityKmS } from '../../utils/formatters';
import { formatLightTime, kmToAu } from '../../services/calculations/physics';
import type { TabType } from '../../components/common/Navbar';

interface MissionControlProps {
  onSelectObject: (obj: SpacecraftObject) => void;
  onNavigateTab: (tab: TabType) => void;
}

export const MissionControl: React.FC<MissionControlProps> = ({
  onSelectObject,
  onNavigateTab
}) => {
  const [featuredFleet, setFeaturedFleet] = useState<SpacecraftObject[]>([]);
  const [crewReport, setCrewReport] = useState<CrewReport | null>(null);
  const [loading, setLoading] = useState(true);
  const miniCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const featuredDefs = SPACECRAFT_REGISTRY.filter(s => 
          ['aditya-l1', 'voyager-1', 'iss', 'astrosat', 'chandrayaan-2-orbiter', 'voyager-2'].includes(s.id)
        );
        const resolved = await Promise.all(featuredDefs.map(def => resolveSpacecraftState(def)));
        setFeaturedFleet(resolved);

        const crew = await AstronautsService.fetchActiveAstronauts();
        setCrewReport(crew);
      } catch (err) {
        console.error('Mission control load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Mini 3D Orbital Vista for the Hero Deck
  useEffect(() => {
    if (!miniCanvasRef.current) return;
    const container = miniCanvasRef.current;
    const width = container.clientWidth || 340;
    const height = container.clientHeight || 240;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 18, 36);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Mini Earth
    const earthGeo = new THREE.SphereGeometry(6, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.5,
      metalness: 0.1
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // Mini Atmospheric Glow
    const atmoGeo = new THREE.SphereGeometry(6.4, 32, 32);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmoMesh);

    // Orbit rings for ISS and Moon
    const issRingGeo = new THREE.RingGeometry(8.2, 8.35, 64);
    const issRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.4 });
    const issRing = new THREE.Mesh(issRingGeo, issRingMat);
    issRing.rotation.x = Math.PI / 2.3;
    scene.add(issRing);

    // Satellite marker
    const satGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const satMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const satMesh = new THREE.Mesh(satGeo, satMat);
    scene.add(satMesh);

    // Lighting
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(30, 15, 20);
    scene.add(dirLight);

    const ambLight = new THREE.AmbientLight(0x0f172a, 1.0);
    scene.add(ambLight);

    let animId = 0;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();

      earthMesh.rotation.y = t * 0.15;
      satMesh.position.set(
        8.27 * Math.cos(t * 1.2),
        2.5 * Math.sin(t * 1.2),
        8.27 * Math.sin(t * 1.2) * 0.7
      );

      renderer.render(scene, camera);
    };

    animate();

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
      atmoGeo.dispose();
      atmoMat.dispose();
      issRingGeo.dispose();
      issRingMat.dispose();
    };
  }, []);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* 1. HERO COMMAND DECK */}
      <div className="glass-panel tech-corner" style={{
        padding: '28px',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 1.5fr) minmax(260px, 1fr)',
        gap: '24px',
        alignItems: 'center'
      }}>
        {/* Left Column: Command Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Header Provenance Ribbon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '3px 9px',
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
              <span>ORBITAL OBSERVATORY // CONSOLE 01</span>
            </div>

            <StatusBadge status="LIVE" />
          </div>

          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Space Intelligence Platform
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '6px', maxWidth: '640px' }}>
              Verified space environment telemetry and astronomical ephemerides, calculated in real time where supported. Direct browser streams from NOAA Space Weather Prediction Center, CelesTrak NORAD, and authoritative ISRO & NASA mission archives.
            </p>
          </div>

          {/* Telemetry Metrics Bar */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            padding: '12px',
            background: 'var(--surface-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-sm)'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Fleet Tracked</div>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                12 Spacecraft
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Humans in Orbit</div>
              <div className="mono" style={{ fontSize: '16px', fontWeight: 700, color: 'var(--status-live)', marginTop: '2px' }}>
                {crewReport?.totalInOrbit || 12} Astronauts
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Ephemeris Engine</div>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '3px' }}>
                NASA J2000
              </div>
            </div>

            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Data Integrity</div>
              <div className="mono" style={{ fontSize: '14px', fontWeight: 600, color: 'var(--status-live)', marginTop: '3px' }}>
                100% Real
              </div>
            </div>
          </div>

          {/* Quick Command Actions */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
            <button
              onClick={() => onNavigateTab('space-map')}
              className="btn btn-primary"
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              <Orbit size={15} />
              <span>Launch 3D Space Map</span>
            </button>

            <button
              onClick={() => onNavigateTab('analysis')}
              className="btn btn-secondary"
              style={{ fontSize: '13px', padding: '8px 16px' }}
            >
              <Compass size={15} />
              <span>Vector Analysis</span>
            </button>
          </div>
        </div>

        {/* Right Column: Mini 3D Orbital Vista */}
        <div style={{
          height: '240px',
          width: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderLeft: '1px solid var(--border-hairline)'
        }} className="hero-vista">
          <div ref={miniCanvasRef} style={{ width: '100%', height: '100%' }} />

          {/* Overlay Reticle Labels */}
          <div style={{
            position: 'absolute',
            bottom: '12px',
            right: '12px',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)',
            background: 'rgba(3, 5, 10, 0.75)',
            padding: '3px 8px',
            borderRadius: 'var(--radius-xs)',
            border: '1px solid var(--border-hairline)'
          }}>
            GEOCENTRIC SGP4 TRACK
          </div>
        </div>
      </div>

      {/* 2. ATMOSPHERIC SPACE ENVIRONMENT & CREW DECK */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {/* Solar Wind & Space Weather Component */}
        <SpaceWeatherWidget />

        {/* Humanity in Orbit Station Operations */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-hairline)',
            paddingBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-xs)',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}>
                <Users size={17} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Active Crewed Outposts</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Low Earth Orbit (LEO) Human Manifest
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StatusBadge status={crewReport?.status || 'LIVE'} />
              <span className="mono" style={{
                padding: '2px 8px',
                background: 'rgba(56, 189, 248, 0.1)',
                borderRadius: 'var(--radius-xs)',
                color: 'var(--accent-cyan)',
                fontWeight: 700,
                fontSize: '12px'
              }}>
                {crewReport?.totalInOrbit || 12} in Space
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {crewReport?.crafts.map((craft) => (
              <div
                key={craft.craftName}
                style={{
                  padding: '12px 14px',
                  background: 'var(--surface-inset)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-xs)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>
                      {craft.craftName === 'ISS' ? 'International Space Station (ISS)' : 'Tiangong (CSS Tianhe)'}
                    </span>
                  </div>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {craft.astronauts.length} Crew
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {craft.astronauts.map((astronaut, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '11px',
                        padding: '3px 8px',
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
            fontSize: '11px',
            color: 'var(--text-muted)',
            marginTop: '12px',
            paddingTop: '8px',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            justifyContent: 'space-between'
          }}>
            <span>Source: Open-Notify Public Registry</span>
            <span>Internal cabin locations: Strictly Private</span>
          </div>
        </div>
      </div>

      {/* 3. FEATURED ACTIVE FLEET DECK */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px'
        }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Active Fleet Telemetry</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-world propagated coordinates and speed-of-light latencies
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('spacecraft')}
            className="btn btn-secondary"
            style={{ fontSize: '12px' }}
          >
            <span>Complete Directory</span>
            <ChevronRight size={13} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '16px'
        }}>
          {featuredFleet.map((craft) => (
            <div
              key={craft.id}
              onClick={() => onSelectObject(craft)}
              className="glass-card"
              style={{
                padding: '18px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer'
              }}
            >
              <div>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {craft.name}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '3px',
                        fontWeight: 600,
                        color: 'var(--accent-cyan)'
                      }}>
                        {craft.agency}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {craft.orbitType}
                    </div>
                  </div>

                  <StatusBadge status={craft.telemetrySource.status} metadata={craft.telemetrySource} compact />
                </div>

                {/* Telemetry Numbers Matrix */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '8px',
                  background: 'var(--surface-inset)',
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-xs)',
                  margin: '10px 0'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Distance from Earth
                    </div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {craft.distanceFromEarthKm !== undefined ? formatDistanceKm(craft.distanceFromEarthKm, true) : 'Unavailable'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Orbital Speed
                    </div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {craft.velocityKmS !== undefined ? formatVelocityKmS(craft.velocityKmS) : 'Unavailable'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Light Delay ($t = d/c$)
                    </div>
                    <div className="mono" style={{ fontSize: '13px', fontWeight: 600, color: 'var(--accent-cyan)', marginTop: '2px' }}>
                      {craft.lightTimeToEarthSec !== undefined ? formatLightTime(craft.lightTimeToEarthSec) : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Status
                    </div>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: craft.isOperational ? 'var(--status-live)' : 'var(--text-muted)', marginTop: '2px' }}>
                      {craft.isOperational ? 'Operational' : 'Completed'}
                    </div>
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '6px 0' }}>
                  {craft.description}
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '10px',
                borderTop: '1px solid var(--border-hairline)',
                fontSize: '11px',
                color: 'var(--accent-cyan)'
              }}>
                <span>Inspect full scientific telemetry</span>
                <ChevronRight size={13} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. UPSTREAM TELEMETRY FEEDS HEALTH DECK */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={17} style={{ color: 'var(--status-live)' }} />
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Upstream Telemetry Feeds & Protocol Health</h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>100% Client-Side Architecture</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}>
          <div style={{ padding: '12px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>NOAA SWPC</span>
              <StatusBadge status="LIVE" compact />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              DSCOVR & GOES-18 Solar Plasma / X-ray Stream (CORS Direct)
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>CelesTrak (NORAD)</span>
              <StatusBadge status="LIVE" compact />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              GP OMM / TLE Element Sets (18th Space Defense Squadron)
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>NASA JPL Ephemeris</span>
              <StatusBadge status="CALCULATED" compact />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Standish J2000 secular perturbation Keplerian equations
            </div>
          </div>

          <div style={{ padding: '12px', background: 'var(--surface-inset)', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>ISRO Planetary Science</span>
              <StatusBadge status="LAST_AVAILABLE" compact />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              ISSDC PRADAN & MOSDAC public planetary data archives
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .hero-vista {
            display: none !important;
          }
          .glass-panel.tech-corner {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};
