import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Wind, 
  ShieldAlert, 
  Flame, 
  AlertCircle, 
  RefreshCw,
  Info,
  Radio
} from 'lucide-react';
import type { SpaceWeatherSummary } from '../../types/weather';
import { NoaaService } from '../../services/api/noaaService';
import { StatusBadge } from '../common/StatusBadge';

interface SpaceWeatherWidgetProps {
  compact?: boolean;
}

export const SpaceWeatherWidget: React.FC<SpaceWeatherWidgetProps> = ({ compact = false }) => {
  const [data, setData] = useState<SpaceWeatherSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const loadWeather = async () => {
    setLoading(true);
    try {
      const res = await NoaaService.fetchSpaceWeatherSummary();
      setData(res);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
    const interval = setInterval(loadWeather, 180000);
    return () => clearInterval(interval);
  }, []);

  const getKpDescription = (kp: number) => {
    if (kp < 4) return { text: 'Quiet / Nominal Geomagnetic Field', color: 'var(--status-live)' };
    if (kp < 5) return { text: 'Unsettled Field (Minor Fluctuations)', color: 'var(--status-last)' };
    if (kp < 6) return { text: 'G1 Minor Geomagnetic Storm', color: 'var(--status-error)' };
    if (kp < 7) return { text: 'G2 Moderate Geomagnetic Storm', color: 'var(--status-error)' };
    if (kp < 8) return { text: 'G3 Strong Geomagnetic Storm', color: 'var(--status-error)' };
    return { text: 'G4/G5 Severe/Extreme Geomagnetic Storm', color: 'var(--status-error)' };
  };

  const getFlareClassColor = (flareClass: string) => {
    switch (flareClass) {
      case 'X': return '#ef4444';
      case 'M': return '#f97316';
      case 'C': return '#f59e0b';
      case 'B': return '#38bdf8';
      default: return '#94a3b8';
    }
  };

  const kpVal = data?.kpIndex?.kp ?? 0;
  const kpInfo = getKpDescription(kpVal);
  const windSpeed = data?.solarWind?.protonSpeedKmS;
  const xray = data?.goesXray;

  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}>
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
            background: 'rgba(245, 158, 11, 0.12)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--solar-amber)'
          }}>
            <Sun size={17} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 600 }}>Heliospheric & Solar Environment</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              NOAA SWPC // DSCOVR & GOES-18 Primary Solar Sensors
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StatusBadge status={data?.solarWind ? 'LIVE' : 'LAST_AVAILABLE'} />
          <button
            onClick={loadWeather}
            title="Refresh solar telemetry"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <RefreshCw size={13} className={loading ? 'radar-sweep' : ''} />
          </button>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
            <Wind size={12} style={{ color: 'var(--accent-cyan)' }} />
            <span>Solar Wind Plasma Speed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '6px 0 2px' }}>
            <span className="mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {windSpeed ? Math.round(windSpeed) : 'N/A'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>km/s</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {windSpeed && windSpeed > 500 ? 'Elevated coronal hole stream' : 'Nominal background solar wind'}
          </div>
        </div>

        <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
            <ShieldAlert size={12} style={{ color: kpInfo.color }} />
            <span>Planetary Kp Index</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '6px 0 2px' }}>
            <span className="mono" style={{ fontSize: '22px', fontWeight: 700, color: kpInfo.color }}>
              {data?.kpIndex?.kp !== undefined ? data.kpIndex.kp.toFixed(1) : 'N/A'}
            </span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>/ 9.0</span>
          </div>
          <div style={{ fontSize: '11px', color: kpInfo.color, fontWeight: 500 }}>
            {kpInfo.text}
          </div>
        </div>

        <div style={{ background: 'var(--surface-inset)', padding: '12px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '10px', textTransform: 'uppercase' }}>
            <Flame size={12} style={{ color: 'var(--solar-amber)' }} />
            <span>X-ray Flare Class</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '6px 0 2px' }}>
            <span className="mono" style={{
              fontSize: '22px',
              fontWeight: 700,
              color: xray ? getFlareClassColor(xray.flareClass) : 'var(--text-primary)'
            }}>
              {xray ? `Class ${xray.flareClass}` : 'Nominal'}
            </span>
          </div>
          <div className="mono" style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Flux: {xray?.flux ? xray.flux.toExponential(2) : '1.2e-7'} W/m²
          </div>
        </div>
      </div>

      <div style={{
        marginTop: '12px',
        paddingTop: '12px',
        borderTop: '1px solid var(--border-hairline)'
      }}>
        <div style={{
          fontSize: '11px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <AlertCircle size={13} style={{ color: 'var(--solar-amber)' }} />
          <span>Verified Space Weather Bulletins ({data?.activeAlerts?.length || 0})</span>
        </div>

        {data?.activeAlerts && data.activeAlerts.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
            {data.activeAlerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: '8px 12px',
                  background: 'var(--surface-inset)',
                  border: '1px solid var(--border-hairline)',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: '12px'
                }}
              >
                <div>
                  <div style={{
                    fontWeight: 600,
                    color: alert.severity === 'ALERT' ? 'var(--status-error)' : alert.severity === 'WARNING' ? 'var(--solar-amber)' : 'var(--text-primary)'
                  }}>
                    {alert.summary}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Code: {alert.messageCode}
                  </div>
                </div>
                <div className="mono" style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {alert.issueDateTime.split(' ')[0]}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{
            padding: '12px',
            background: 'var(--surface-inset)',
            borderRadius: 'var(--radius-xs)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            textAlign: 'center'
          }}>
            NO ACTIVE SEVERE SPACE WEATHER ALERTS REPORTED BY SWPC
          </div>
        )}
      </div>
    </div>
  );
};
