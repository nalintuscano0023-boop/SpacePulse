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

  const navItems: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'mission-control', label: 'Mission Control', icon: <Activity size={15} /> },
    { id: 'spacecraft', label: 'Spacecraft', icon: <Satellite size={15} /> },
    { id: 'space-map', label: 'Space Map', icon: <Orbit size={15} /> },
    { id: 'analysis', label: 'Analysis', icon: <Compass size={15} /> },
    { id: 'missions', label: 'Missions & Data', icon: <Database size={15} /> }
  ];

  return (
    <>
      {/* Top Floating Aerospace Bar */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(3, 5, 10, 0.78)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--border-hairline)',
        padding: '0 24px',
        height: '60px',
        display: 'flex',
        alignItems: 'center'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '1540px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          {/* Brand Identity */}
          <div 
            onClick={() => onSelectTab('mission-control')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              cursor: 'pointer',
              userSelect: 'none'
            }}
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
              color: 'var(--accent-cyan)'
            }}>
              <Radio size={17} />
            </div>
            <div>
              <div style={{
                fontFamily: 'var(--font-heading)',
                fontSize: '16px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#ffffff'
              }}>
                SPACE<span style={{ color: 'var(--accent-cyan)' }}>PULSE</span>
              </div>
              <div style={{
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-muted)',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                lineHeight: 1
              }}>
                Orbital Intelligence
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '7px',
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '13px',
                    fontWeight: 500,
                    fontFamily: 'var(--font-heading)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    border: isActive ? '1px solid var(--border-focus)' : '1px solid transparent',
                    background: isActive ? 'rgba(56, 189, 248, 0.12)' : 'transparent',
                    color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                  }}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Right Status & Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-hairline)',
              padding: '5px 10px',
              borderRadius: 'var(--radius-xs)',
              fontSize: '12px',
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
        background: 'rgba(3, 5, 10, 0.92)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-hairline)',
        padding: '6px 12px 10px',
        justifyContent: 'space-around',
        alignItems: 'center'
      }}>
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 8px',
                borderRadius: 'var(--radius-xs)',
                fontSize: '10px',
                fontFamily: 'var(--font-heading)',
                background: 'transparent',
                border: 'none',
                color: isActive ? 'var(--accent-cyan)' : 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              {item.icon}
              <span>{item.label}</span>
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
            padding-bottom: 72px !important;
          }
        }
      `}</style>
    </>
  );
};
