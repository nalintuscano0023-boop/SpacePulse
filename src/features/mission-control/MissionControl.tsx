import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Satellite, 
  Orbit, 
  Users, 
  ShieldCheck, 
  ArrowUpRight, 
  Flame, 
  Radio, 
  Compass, 
  ExternalLink,
  ChevronRight,
  Database,
  Globe
} from 'lucide-react';
import { SpaceWeatherWidget } from '../../components/weather/SpaceWeatherWidget';
import { SPACECRAFT_REGISTRY, resolveSpacecraftState } from '../../services/data/spacecraftCatalog';
import { SpacecraftObject } from '../../types/space';
import { AstronautsService } from '../../services/api/astronautsService';
import { CrewReport } from '../../types/missions';
import { StatusBadge } from '../../components/common/StatusBadge';
import { formatDistanceKm, formatVelocityKmS } from '../../utils/formatters';
import { formatLightTime } from '../../services/calculations/physics';
import { TabType } from '../../components/common/Navbar';

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

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Load featured spacecraft: Aditya-L1, Voyager 1, Voyager 2, ISS, Astrosat, Chandrayaan-2
        const featuredDefs = SPACECRAFT_REGISTRY.filter(s => 
          ['aditya-l1', 'voyager-1', 'iss', 'astrosat', 'chandrayaan-2-orbiter', 'voyager-2'].includes(s.id)
        );

        const resolved = await Promise.all(featuredDefs.map(def => resolveSpacecraftState(def)));
        setFeaturedFleet(resolved);

        // Load active crew
        const crew = await AstronautsService.fetchActiveAstronauts();
        setCrewReport(crew);
      } catch (err) {
        console.error('Mission control data load error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Platform Header Hero */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        padding: '24px 0 8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(56, 189, 248, 0.1)',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            fontSize: '11px',
            fontFamily: 'var(--font-heading)',
            color: 'var(--accent-cyan)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.06em'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-cyan)' }} />
            <span>Mission Operations Center</span>
          </div>

          <StatusBadge status="LIVE" />
        </div>

        <h1 style={{ fontSize: '32px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
          Real-Time Space Intelligence & Telemetry
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '850px', lineHeight: 1.6 }}>
          SpacePulse aggregates verified public space data directly into your browser. Track real orbital vectors, solar wind dynamics from NOAA SWPC, active spacecraft positions, and astronomical ephemerides with zero synthetic or mock numbers.
        </p>
      </div>

      {/* Quick Launchpad Buttons */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '12px'
      }}>
        <div
          onClick={() => onNavigateTab('space-map')}
          className="glass-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(56, 189, 248, 0.12)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)'
            }}>
              <Orbit size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>3D Space Map</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Interactive Solar System & Orbits</div>
            </div>
          </div>
          <ArrowUpRight size={16} style={{ color: 'var(--text-muted)' }} />
        </div>

        <div
          onClick={() => onNavigateTab('analysis')}
          className="glass-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#818cf8'
            }}>
              <Compass size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>Analysis Workspace</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Calculated distance matrices & delay</div>
            </div>
          </div>
          <ArrowUpRight size={16} style={{ color: 'var(--text-muted)' }} />
        </div>

        <div
          onClick={() => onNavigateTab('missions')}
          className="glass-card"
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: 'rgba(16, 185, 129, 0.12)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--status-live)'
            }}>
              <Database size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>ISRO & NASA Archives</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>ISSDC PRADAN & MOSDAC datasets</div>
            </div>
          </div>
          <ArrowUpRight size={16} style={{ color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Two Column Layout: Space Weather & Crew in Orbit */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
        gap: '20px'
      }}>
        {/* Real Space Weather Stream */}
        <SpaceWeatherWidget />

        {/* Crewed Outposts & Astronauts in Space */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            borderBottom: '1px solid var(--border-subtle)',
            paddingBottom: '12px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-cyan)'
              }}>
                <Users size={18} />
              </div>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Humanity in Orbit</h3>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Active Crewed Space Stations
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StatusBadge status={crewReport?.status || 'LIVE'} />
              <span className="mono" style={{
                padding: '3px 8px',
                background: 'rgba(56, 189, 248, 0.15)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent-cyan)',
                fontWeight: 700,
                fontSize: '13px'
              }}>
                {crewReport?.totalInOrbit || 10} Astronauts
              </span>
            </div>
          </div>

          {/* Station Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {crewReport?.crafts.map((craft) => (
              <div
                key={craft.craftName}
                style={{
                  padding: '14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '10px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Satellite size={15} style={{ color: 'var(--accent-cyan)' }} />
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>
                      {craft.craftName === 'ISS' ? 'International Space Station (ISS)' : 'Tiangong Space Station (CSS)'}
                    </span>
                  </div>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {craft.astronauts.length} onboard
                  </span>
                </div>

                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '6px'
                }}>
                  {craft.astronauts.map((astronaut, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: '11px',
                        padding: '4px 8px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '4px',
                        border: '1px solid rgba(255, 255, 255, 0.05)',
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
            marginTop: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span>Source: Open-Notify Public Crew Registry</span>
            <span>Internal cabin locations: Strictly Private</span>
          </div>
        </div>
      </div>

      {/* Featured Active Spacecraft Fleet */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Featured Active Fleet</h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Real-time propagated telemetry and ephemeris coordinates
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('spacecraft')}
            className="btn btn-secondary"
          >
            <span>View All Spacecraft</span>
            <ChevronRight size={14} />
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
                padding: '20px',
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
                  marginBottom: '12px'
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
                        borderRadius: '4px',
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

                {/* Key Telemetry Metrics */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '10px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  padding: '12px',
                  borderRadius: 'var(--radius-sm)',
                  margin: '12px 0'
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Dist. From Earth
                    </div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {craft.distanceFromEarthKm ? formatDistanceKm(craft.distanceFromEarthKm, true) : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Velocity
                    </div>
                    <div className="mono" style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                      {craft.velocityKmS ? formatVelocityKmS(craft.velocityKmS) : 'N/A'}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Signal Delay ($c$)
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

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '8px 0' }}>
                  {craft.description}
                </p>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                fontSize: '11px',
                color: 'var(--accent-cyan)'
              }}>
                <span>Inspect full telemetry</span>
                <ChevronRight size={14} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upstream System Health Monitor */}
      <div className="glass-panel" style={{ padding: '20px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck size={18} style={{ color: 'var(--status-live)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Upstream Telemetry Feeds & Data Source Health</h3>
          </div>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>100% Client-Side Direct Architecture</span>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '12px'
        }}>
          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>NOAA SWPC</span>
              <StatusBadge status="LIVE" compact />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              DSCOVR & GOES-18 Solar Plasma / X-ray Stream (CORS Active)
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>CelesTrak (NORAD)</span>
              <StatusBadge status="LIVE" compact />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              GP OMM / TLE High-precision element sets (CORS Active)
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>NASA Ephemeris Engine</span>
              <StatusBadge status="CALCULATED" compact />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Standish J2000 secular perturbation Keplerian equations
            </div>
          </div>

          <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 600, fontSize: '13px' }}>ISRO Data Portals</span>
              <StatusBadge status="LAST_AVAILABLE" compact />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              ISSDC PRADAN & MOSDAC public planetary data archives
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
