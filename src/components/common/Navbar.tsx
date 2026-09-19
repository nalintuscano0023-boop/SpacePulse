import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Satellite, 
  Orbit, 
  Compass, 
  Database, 
  Clock, 
  Radio
} from 'lucide-react';
import { formatUtcTime } from '../../utils/time';

export type TabType = 'mission-control' | 'spacecraft' | 'space-map' | 'analysis' | 'missions';

interface NavbarProps {
  activeTab: TabType;
  onSelectTab: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab }) => {
  const [utcTime, setUtcTime] = useState(formatUtcTime());

  useEffect(() => {
    const timer = setInterval(() => {
      setUtcTime(formatUtcTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const navItems: { id: TabType; label: string; icon: React.ReactNode; tooltip: string }[] = [
    { id: 'mission-control', label: 'Mission Control', icon: <Activity size={15} />, tooltip: 'Mission Control: Platform overview and telemetry status' },
    { id: 'spacecraft', label: 'Spacecraft', icon: <Satellite size={15} />, tooltip: 'Spacecraft: Monitored active fleet, satellites, and 3D models' },
    { id: 'space-map', label: 'Space Map', icon: <Orbit size={15} />, tooltip: 'Space Map: 3D interactive orbits and real-time celestial visualization' },
    { id: 'analysis', label: 'Analysis', icon: <Compass size={15} />, tooltip: 'Analysis: Keplerian orbital mechanics, relative velocities, and light delay' },
    { id: 'missions', label: 'Missions & Data', icon: <Database size={15} />, tooltip: 'Missions & Data: Verified agency dossiers and planetary science archives' }
  ];

  return (
    <>
      {/* Top Floating Aerospace Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(3, 5, 10, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-hairline)',
        paddingTop: 'var(--sat)',
        paddingLeft: 'max(16px, var(--sal))',
        paddingRight: 'max(16px, var(--sar))',
        minHeight: '56px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1540px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          padding: '6px 0'
        }}>
          {/* Brand Identity */}
          <div 
            onClick={() => onSelectTab('mission-control')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              userSelect: 'none',
              minWidth: 0,
              flexShrink: 1
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
                fontSize: '16px',
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
                  marginTop: '2px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                Space Intelligence & Visualization Platform
              </div>
            </div>
          </div>

          {/* Desktop 5-Item Navigation */}
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
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '12.5px',
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
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Status & Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-hairline)',
              padding: '4px 8px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)'
            }}>
              <Clock size={12} style={{ color: 'var(--accent-cyan)' }} />
              <span className="mono" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{utcTime}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Floating Navigation Bar */}
      <div className="mobile-bottom-nav" style={{
        display: 'none',
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(3, 5, 10, 0.94)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--border-hairline)',
        paddingTop: '6px',
        paddingBottom: 'calc(6px + var(--sab))',
        paddingLeft: 'max(4px, var(--sal))',
        paddingRight: 'max(4px, var(--sar))',
        justifyContent: 'space-around',
        alignItems: 'stretch'
      }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              title={item.tooltip}
              aria-label={item.tooltip}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: '48px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '3px',
                padding: '4px 2px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '10px',
                fontFamily: 'var(--font-heading)',
                background: isActive ? 'rgba(56, 189, 248, 0.08)' : 'transparent',
                border: 'none',
                borderTop: isActive ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                touchAction: 'manipulation'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.icon}
              </div>
              <span style={{
                fontSize: '9.5px',
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                fontWeight: isActive ? 600 : 400
              }}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      <style>{`
        @media (min-width: 860px) {
          .desktop-navbar {
            display: flex !important;
          }
        }
        @media (max-width: 859px) {
          .mobile-bottom-nav {
            display: flex !important;
          }
          main {
            padding-bottom: calc(72px + var(--sab)) !important;
          }
        }
        @media (max-width: 540px) {
          .navbar-subtitle {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
};
