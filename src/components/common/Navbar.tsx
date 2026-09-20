import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Satellite, 
  Orbit, 
  Compass, 
  Database, 
  Clock, 
  Radio,
  Menu,
  X,
  ChevronRight
} from 'lucide-react';
import { formatUtcTime } from '../../utils/time';

export type TabType = 'mission-control' | 'spacecraft' | 'space-map' | 'analysis' | 'missions';

interface NavbarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab }) => {
  const [utcTime, setUtcTime] = useState(formatUtcTime());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(formatUtcTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isDrawerOpen) {
        setIsDrawerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawerOpen]);

  const navItems: { id: TabType; channel: string; label: string; icon: React.ReactNode; tooltip: string; subtitle: string }[] = [
    { 
      id: 'mission-control', 
      channel: '01',
      label: 'Mission Control', 
      icon: <Activity size={15} />, 
      tooltip: 'Mission Control: Global telemetry and fleet overview',
      subtitle: 'Global telemetry & fleet overview'
    },
    { 
      id: 'spacecraft', 
      channel: '02',
      label: 'Spacecraft', 
      icon: <Satellite size={15} />, 
      tooltip: 'Spacecraft: Monitored active fleet, satellites, and 3D models',
      subtitle: 'Active spacecraft & 3D models'
    },
    { 
      id: 'space-map', 
      channel: '03',
      label: 'Space Map', 
      icon: <Orbit size={15} />, 
      tooltip: 'Space Map: 3D interactive orbits and real-time celestial visualization',
      subtitle: '3D Solar System & Earth orbit'
    },
    { 
      id: 'analysis', 
      channel: '04',
      label: 'Analysis', 
      icon: <Compass size={15} />, 
      tooltip: 'Analysis: Keplerian orbital mechanics, relative velocities, and light delay',
      subtitle: 'Orbital mechanics & vectors'
    },
    { 
      id: 'missions', 
      channel: '05',
      label: 'Missions & Data', 
      icon: <Database size={15} />, 
      tooltip: 'Missions & Data: Verified agency dossiers and planetary science archives',
      subtitle: 'Archives & agency dossiers'
    }
  ];

  const currentItem = navItems.find(item => item.id === activeTab) || navItems[0];

  const handleItemClick = (id: TabType) => {
    onSelectTab(id);
    setIsDrawerOpen(false);
  };

  return (
    <>
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(3, 5, 10, 0.90)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-hairline)',
        paddingTop: 'var(--sat)',
        paddingLeft: 'max(12px, var(--sal))',
        paddingRight: 'max(12px, var(--sar))',
        minHeight: '56px',
        display: 'flex',
        alignItems: 'center',
        width: '100%'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1540px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '6px 0'
        }}>
          <div 
            onClick={() => handleItemClick('mission-control')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              userSelect: 'none',
              flexShrink: 0
            }}
            title="SpacePulse: Space Intelligence & Visualization Platform"
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-xs)',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--accent-cyan)',
              flexShrink: 0
            }}>
              <Radio size={17} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '15px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#ffffff',
                lineHeight: 1.2,
                whiteSpace: 'nowrap'
              }}>
                SPACE<span style={{ color: 'var(--accent-cyan)' }}>PULSE</span>
              </div>
              <div 
                className="navbar-subtitle"
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  lineHeight: 1.1,
                  marginTop: '1px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Space Intelligence & Visualization Platform
              </div>
            </div>
          </div>

          <button
            onClick={() => setIsDrawerOpen(!isDrawerOpen)}
            className="mobile-section-pill"
            aria-label={`Current Section: ${currentItem.label}. Tap to switch section.`}
            title="Tap to switch section"
            style={{
              display: 'none',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.28)',
              color: 'var(--accent-cyan)',
              fontSize: '11px',
              fontFamily: 'var(--font-heading)',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              maxWidth: '160px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              touchAction: 'manipulation'
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              {currentItem.icon}
            </span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {currentItem.label}
            </span>
          </button>

          <nav style={{
            display: 'none',
            alignItems: 'center',
            gap: '4px',
            background: 'rgba(7, 17, 31, 0.6)',
            padding: '4px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-hairline)'
          }} className="desktop-navbar">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id}`}
                  onClick={() => onSelectTab(item.id)}
                  title={item.tooltip}
                  aria-label={item.tooltip}
                  className="nav-item-btn"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 12px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '12px',
                    fontWeight: isActive ? 600 : 500,
                    fontFamily: 'var(--font-heading)',
                    letterSpacing: '0.01em',
                    cursor: 'pointer',
                    transition: 'all 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
                    border: isActive ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid transparent',
                    background: isActive ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    boxShadow: isActive ? '0 0 14px rgba(56, 189, 248, 0.16)' : 'none',
                    touchAction: 'manipulation'
                  }}
                >
                  <span style={{ color: isActive ? 'var(--accent-cyan)' : 'inherit', display: 'flex', alignItems: 'center' }}>
                    {item.icon}
                  </span>
                  <span style={{
                    fontSize: '10px',
                    fontFamily: 'var(--font-mono)',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                    letterSpacing: '0.04em'
                  }}>
                    {item.channel}
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div 
              className="navbar-status-beacon"
              style={{
                display: 'none',
                alignItems: 'center',
                gap: '6px',
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.22)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--status-live)',
                letterSpacing: '0.04em'
              }}
              title="Verified public data streams: NOAA SWPC • CelesTrak SGP4 • NASA JPL Horizons"
            >
              <span className="pulse-live-dot" style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--status-live)' }} />
              <span>FEEDS: ACTIVE</span>
            </div>

            <div 
              className="navbar-clock"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-hairline)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)'
              }}
            >
              <Clock size={11} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
              <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{utcTime}</span>
            </div>

            <button
              onClick={() => setIsDrawerOpen(!isDrawerOpen)}
              className="mobile-nav-toggle"
              aria-label={isDrawerOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              aria-expanded={isDrawerOpen}
              title={isDrawerOpen ? 'Close Navigation Menu' : 'Open Navigation Menu'}
              style={{
                display: 'none',
                alignItems: 'center',
                justifyContent: 'center',
                width: '38px',
                height: '38px',
                minWidth: '38px',
                minHeight: '38px',
                borderRadius: 'var(--radius-xs)',
                background: isDrawerOpen ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                border: isDrawerOpen ? '1px solid var(--accent-cyan)' : '1px solid var(--border-hairline)',
                color: isDrawerOpen ? '#ffffff' : 'var(--text-primary)',
                cursor: 'pointer',
                touchAction: 'manipulation',
                transition: 'all 0.15s ease'
              }}
            >
              {isDrawerOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {isDrawerOpen && (
        <div
          onClick={() => setIsDrawerOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 4, 8, 0.75)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 98,
            animation: 'fadeIn 0.2s ease'
          }}
          aria-hidden="true"
        />
      )}

      {isDrawerOpen && (
        <div
          style={{
            position: 'fixed',
            top: 'calc(56px + var(--sat))',
            left: 0,
            right: 0,
            maxHeight: 'calc(100dvh - 56px - var(--sat))',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch',
            background: 'rgba(5, 12, 24, 0.98)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderBottom: '1px solid rgba(56, 189, 248, 0.3)',
            boxShadow: '0 20px 48px rgba(0, 0, 0, 0.85)',
            zIndex: 99,
            padding: '14px 16px calc(18px + var(--sab))',
            animation: 'slideDownNav 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Navigation Menu"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '0 4px 4px'
            }}>
              SpacePulse Modules
            </div>

            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleItemClick(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    minHeight: '52px',
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: isActive ? 'rgba(56, 189, 248, 0.14)' : 'rgba(255, 255, 255, 0.025)',
                    border: isActive ? '1px solid rgba(56, 189, 248, 0.45)' : '1px solid var(--border-hairline)',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    touchAction: 'manipulation'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
                    <div style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: 'var(--radius-xs)',
                      background: isActive ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                      border: isActive ? '1px solid var(--accent-cyan)' : '1px solid var(--border-hairline)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      flexShrink: 0
                    }}>
                      {item.icon}
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-heading)',
                        color: isActive ? '#ffffff' : 'var(--text-primary)'
                      }}>
                        {item.label}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: 'var(--text-muted)',
                        marginTop: '1px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        {item.subtitle}
                      </div>
                    </div>
                  </div>

                  <ChevronRight 
                    size={16} 
                    style={{ 
                      color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                      flexShrink: 0,
                      marginLeft: '8px'
                    }} 
                  />
                </button>
              );
            })}
          </div>

          <div style={{
            marginTop: '14px',
            paddingTop: '12px',
            borderTop: '1px solid var(--border-hairline)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '10px',
            fontFamily: 'var(--font-mono)',
            color: 'var(--text-muted)'
          }}>
            <span>SYSTEM: NOMINAL</span>
            <span style={{ color: 'var(--accent-cyan)' }}>100% PUBLIC DATA</span>
          </div>
        </div>
      )}

      <style>{`
        @media (min-width: 860px) {
          .desktop-navbar {
            display: flex !important;
          }
          .navbar-status-beacon {
            display: inline-flex !important;
          }
        }
        @media (max-width: 859px) {
          .mobile-nav-toggle {
            display: flex !important;
          }
          .mobile-section-pill {
            display: inline-flex !important;
          }
        }
        @media (max-width: 600px) {
          .navbar-subtitle {
            display: none !important;
          }
        }
        @media (max-width: 440px) {
          .mobile-section-pill {
            max-width: 120px !important;
          }
        }
        @media (max-width: 360px) {
          .mobile-section-pill {
            display: none !important;
          }
        }
        @keyframes slideDownNav {
          from { transform: translateY(-12px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

