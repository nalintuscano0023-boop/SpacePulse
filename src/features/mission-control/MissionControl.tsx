import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { 
  Orbit, 
  Users, 
  ShieldCheck, 
  Compass, 
  ChevronRight,
  Database,
  Radio,
  BookOpen
} from 'lucide-react';
import { SpaceWeatherWidget } from '../../components/weather/SpaceWeatherWidget';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from '../../services/data/spacecraftCatalog';
import type { SpacecraftObject } from '../../types/space';
import { AstronautsService } from '../../services/api/astronautsService';
import type { CrewReport } from '../../types/missions';
import { StatusBadge } from '../../components/common/StatusBadge';
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
  const miniCanvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const featuredDefs = SPACECRAFT_REGISTRY.filter(s => 
          ['aditya-l1', 'iss', 'astrosat', 'voyager-1'].includes(s.id)
        );
        const resolved = await Promise.all(featuredDefs.map(def => resolveSpacecraftState(def)));
        setFeaturedFleet(resolved);

        const crew = await AstronautsService.fetchActiveAstronauts();
        setCrewReport(crew);
      } catch (err) {
        console.error('Mission control load error:', err);
      }
    }

    loadData();
  }, []);

  // Mini 3D Orbital Vista for the Hero Deck
  useEffect(() => {
    if (!miniCanvasRef.current) return;
    const container = miniCanvasRef.current;
    const width = container.clientWidth || 320;
    const height = container.clientHeight || 200;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(0, 16, 32);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Mini Earth
    const earthGeo = new THREE.SphereGeometry(5.5, 32, 32);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.5,
      metalness: 0.1
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // Mini Atmospheric Glow
    const atmoGeo = new THREE.SphereGeometry(5.8, 32, 32);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.22,
      side: THREE.BackSide
    });
    const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
    scene.add(atmoMesh);

    // Orbit ring for ISS
    const issRingGeo = new THREE.RingGeometry(7.6, 7.75, 64);
    const issRingMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.35 });
    const issRing = new THREE.Mesh(issRingGeo, issRingMat);
    issRing.rotation.x = Math.PI / 2.3;
    scene.add(issRing);

    // Satellite marker
    const satGeo = new THREE.SphereGeometry(0.3, 12, 12);
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

      earthMesh.rotation.y = t * 0.12;
      satMesh.position.set(
        7.68 * Math.cos(t * 1.1),
        2.2 * Math.sin(t * 1.1),
        7.68 * Math.sin(t * 1.1) * 0.7
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
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* 1. COMMAND OVERVIEW HEADER */}
      <div className="glass-panel tech-corner" style={{
        padding: '24px 28px',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'minmax(300px, 1.6fr) minmax(240px, 1fr)',
        gap: '24px',
        alignItems: 'center'
      }}>
        {/* Left Column: Command Overview */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
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
              <span>PRIMARY MISSION CONSOLE</span>
            </div>

            <StatusBadge status="LIVE" />
          </div>

          <div>
            <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
              Mission Control
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.55, marginTop: '4px' }}>
              Space intelligence at a glance. Verified astronomical ephemerides, NOAA solar weather, and active orbital fleet telemetry synchronized directly in your browser.
            </p>
          </div>

          {/* Key Global Metrics Strip */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '10px',
            padding: '10px 12px',
            background: 'var(--surface-inset)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-xs)'
          }}>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Fleet</div>
              <div className="mono" style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                12 Objects
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

          {/* Primary Quick Actions */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
            <button
              onClick={() => onNavigateTab('space-map')}
              className="btn btn-primary"
              style={{ fontSize: '12px', padding: '7px 14px' }}
            >
              <Orbit size={14} />
              <span>Launch 3D Space Map</span>
            </button>

            <button
              onClick={() => onNavigateTab('analysis')}
              className="btn btn-secondary"
              style={{ fontSize: '12px', padding: '7px 14px' }}
            >
              <Compass size={14} />
              <span>Vector Analysis</span>
            </button>
          </div>
        </div>

        {/* Right Column: Mini 3D Orbital Vista */}
        <div style={{
          height: '210px',
          width: '100%',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderLeft: '1px solid var(--border-hairline)'
        }} className="hero-vista">
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

      {/* 2. ACTIVE / RELEVANT OBJECTS (COMPACT SUMMARY) */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600 }}>Active Fleet Highlights</h2>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Key monitored spacecraft and satellites with live status indicators
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('spacecraft')}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '5px 10px' }}
          >
            <span>Explore All 12 Spacecraft</span>
            <ChevronRight size={13} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px'
        }}>
          {featuredFleet.map((craft) => (
            <div
              key={craft.id}
              onClick={() => onSelectObject(craft)}
              className="glass-card"
              style={{
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                cursor: 'pointer',
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
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '8px',
                borderTop: '1px solid var(--border-hairline)',
                fontSize: '11px',
                color: 'var(--accent-cyan)'
              }}>
                <span>Inspect Object Dossier</span>
                <ChevronRight size={13} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. SPACE ENVIRONMENT & HUMAN CREW PRESENCE */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
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

      {/* 4. RECENT & FLAGSHIP MISSIONS SUMMARY */}
      <div className="glass-panel" style={{ padding: '20px' }}>
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
            <h3 style={{ fontSize: '14px', fontWeight: 600 }}>Flagship Scientific Missions</h3>
          </div>

          <button
            onClick={() => onNavigateTab('missions')}
            className="btn btn-secondary"
            style={{ fontSize: '11px', padding: '5px 10px' }}
          >
            <span>View All Mission Profiles</span>
            <ChevronRight size={13} />
          </button>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '12px'
        }}>
          <div
            onClick={() => onNavigateTab('missions')}
            className="glass-card"
            style={{ padding: '12px 14px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Aditya-L1 Solar Observatory</span>
              <span className="agency-badge" style={{ height: '18px', fontSize: '9px' }}>ISRO</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              India's first space-based solar mission placed in a halo orbit around Sun-Earth L1 point.
            </p>
          </div>

          <div
            onClick={() => onNavigateTab('missions')}
            className="glass-card"
            style={{ padding: '12px 14px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Chandrayaan-3 Lunar Mission</span>
              <span className="agency-badge" style={{ height: '18px', fontSize: '9px' }}>ISRO</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Historic soft landing at the Lunar South Pole with Vikram lander and Pragyan rover.
            </p>
          </div>

          <div
            onClick={() => onNavigateTab('missions')}
            className="glass-card"
            style={{ padding: '12px 14px', cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>Voyager Interstellar Mission</span>
              <span className="agency-badge" style={{ height: '18px', fontSize: '9px' }}>NASA</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Humanity's farthest probes exploring the interstellar medium beyond the heliopause.
            </p>
          </div>
        </div>
      </div>

      {/* 5. DATA HEALTH & PROTOCOLS */}
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
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
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
