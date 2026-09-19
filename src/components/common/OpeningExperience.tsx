import React, { useState, useEffect } from 'react';
import { Radio, ArrowRight } from 'lucide-react';

interface OpeningExperienceProps {
  onComplete: () => void;
}

export const OpeningExperience: React.FC<OpeningExperienceProps> = ({ onComplete }) => {
  const [phase, setPhase] = useState<'intro' | 'fadeout'>('intro');
  const [dataStatusText, setDataStatusText] = useState('ESTABLISHING TELEMETRY UPLINK...');

  useEffect(() => {
    const t1 = setTimeout(() => {
      setDataStatusText('RETRIEVING VERIFIED DATA: NOAA SWPC • CELESTRAK • NASA JPL');
    }, 600);

    const t2 = setTimeout(() => {
      setPhase('fadeout');
    }, 1600);

    const t3 = setTimeout(() => {
      onComplete();
    }, 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      onClick={() => onComplete()}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100dvh',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(7, 17, 31, 0.95), #03050a 95%)',
        color: '#f8fafc',
        cursor: 'pointer',
        touchAction: 'manipulation',
        padding: 'max(16px, var(--sat)) max(16px, var(--sar)) max(16px, var(--sab)) max(16px, var(--sal))',
        boxSizing: 'border-box',
        transition: 'opacity 0.5s cubic-bezier(0.16, 1, 0.3, 1), transform 0.5s ease',
        opacity: phase === 'fadeout' ? 0 : 1,
        pointerEvents: phase === 'fadeout' ? 'none' : 'auto'
      }}
    >
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        maxWidth: '560px',
        width: '100%',
        padding: '0 16px',
        boxSizing: 'border-box',
        animation: 'introFadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1)'
      }}>
        {/* Pulsing Core Emblem */}
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, rgba(56, 189, 248, 0.15), rgba(99, 102, 241, 0.2))',
          border: '1px solid rgba(56, 189, 248, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-cyan)',
          boxShadow: '0 0 35px -5px rgba(56, 189, 248, 0.35)',
          marginBottom: '20px'
        }}>
          <Radio size={28} />
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: 'clamp(24px, 7vw, 34px)',
          fontWeight: 700,
          letterSpacing: '0.12em',
          fontFamily: 'var(--font-heading)',
          color: '#ffffff',
          marginBottom: '8px',
          lineHeight: 1.15
        }}>
          SPACE<span style={{ color: 'var(--accent-cyan)' }}>PULSE</span>
        </h1>

        {/* Subtitle */}
        <div style={{
          fontSize: 'clamp(10px, 2.5vw, 12px)',
          fontFamily: 'var(--font-mono)',
          letterSpacing: '0.15em',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          marginBottom: '16px'
        }}>
          Space Intelligence & Observation Platform
        </div>

        <p style={{
          fontSize: 'clamp(12px, 3.2vw, 14px)',
          color: 'var(--text-muted)',
          lineHeight: 1.6,
          marginBottom: '28px',
          maxWidth: '480px'
        }}>
          Explore the universe through verified, real-world space telemetry.
        </p>

        {/* Live Loading Ticker */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '6px 14px',
          maxWidth: '100%',
          boxSizing: 'border-box',
          borderRadius: 'var(--radius-full)',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(56, 189, 248, 0.2)',
          fontSize: '11px',
          fontFamily: 'var(--font-mono)',
          color: 'var(--accent-cyan)',
          textAlign: 'center',
          lineHeight: 1.4
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'var(--status-live)',
            boxShadow: '0 0 8px var(--status-live)',
            display: 'inline-block',
            flexShrink: 0
          }} />
          <span style={{ wordBreak: 'break-word' }}>{dataStatusText}</span>
        </div>

        {/* Skip action hint */}
        <div style={{
          marginTop: '28px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          opacity: 0.7
        }}>
          <span>Click anywhere to enter console</span>
          <ArrowRight size={11} />
        </div>
      </div>

      <style>{`
        @keyframes introFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
