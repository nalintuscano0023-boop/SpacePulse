import React, { useState, useEffect } from 'react';
import { 
  Sun, 
  Wind, 
  ShieldAlert, 
  Flame, 
  AlertCircle, 
  RefreshCw,
  Info
} from 'lucide-react';
import { SpaceWeatherSummary } from '../../types/weather';
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
      // Handled in service
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWeather();
    // Poll every 3 minutes
    const interval = setInterval(loadWeather, 180000);
    return () => clearInterval(interval);
  }, []);

  const getKpDescription = (kp: number) => {
    if (kp < 4) return { text: 'Quiet / Nominal', color: 'var(--status-live)' };
    if (kp < 5) return { text: 'Unsettled Conditions', color: 'var(--status-last)' };
    if (kp < 6) return { text: 'G1 Minor Storm', color: 'var(--status-error)' };
    if (kp < 7) return { text: 'G2 Moderate Storm', color: 'var(--status-error)' };
    if (kp < 8) return { text: 'G3 Strong Storm', color: 'var(--status-error)' };
    return { text: 'G4/G5 Severe Storm', color: 'var(--status-error)' };
  };

  const getFlareClassColor = (flareClass: string) => {
    switch (flareClass) {
      case 'X': return '#ef4444';
      case 'M': return '#f97316';
      case 'C': return '#eab308';
      case 'B': return '#38bdf8';
      default: return '#94a3b8';
    }
  };

  if (loading && !data) {
    return (
      <div className="glass-card" style={{ padding: '24px', textAlign: 'center' }}>
        <RefreshCw size={20} className="radar-sweep" style={{ color: 'var(--accent-cyan)', margin: '0 auto 12px' }} />
        <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Connecting to NOAA Space Weather Prediction Center...</div>
      </div>
    );
  }

  const kpVal = data?.kpIndex?.kp ?? 0;
  const kpInfo = getKpDescription(kpVal);
  const windSpeed = data?.solarWind?.protonSpeedKmS;
  const xray = data?.goesXray;

  return (
    <div className="glass-panel" style={{ padding: '20px', borderRadius: 'var(--radius-md)' }}>
      {/* Header */}
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
            background: 'rgba(245, 158, 11, 0.15)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59e0b'
          }}>
            <Sun size={18} />
          </div>
          <div>
            <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Space Weather Environment</h3>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              NOAA SWPC / DSCOVR & GOES-18 Satellites
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <StatusBadge status={data?.solarWind ? 'LIVE' : 'LAST_AVAILABLE'} />
          <button
            onClick={loadWeather}
            title="Refresh Space Weather"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <RefreshCw size={14} className={loading ? 'radar-sweep' : ''} />
          </button>
        </div>
      </div>

      {/* Primary Weather Indicators Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: compact ? '1fr 1fr' : 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '12px',
        marginBottom: '16px'
      }}>
        {/* Solar Wind Velocity */}
        <div className="glass-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
            <Wind size={13} style={{ color: 'var(--accent-cyan)' }} />
            <span>Solar Wind Speed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '8px 0 4px' }}>
            <span className="mono" style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {windSpeed ? Math.round(windSpeed) : 'N/A'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>km/s</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {windSpeed && windSpeed > 500 ? 'High velocity stream' : 'Nominal background flow'}
          </div>
        </div>

        {/* Planetary K-Index */}
        <div className="glass-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
            <ShieldAlert size={13} style={{ color: kpInfo.color }} />
            <span>Planetary Kp Index</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '8px 0 4px' }}>
            <span className="mono" style={{ fontSize: '22px', fontWeight: 700, color: kpInfo.color }}>
              {data?.kpIndex?.kp !== undefined ? data.kpIndex.kp.toFixed(1) : 'N/A'}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>/ 9.0</span>
          </div>
          <div style={{ fontSize: '11px', color: kpInfo.color, fontWeight: 500 }}>
            {kpInfo.text}
          </div>
        </div>

        {/* Solar Flare Monitor (GOES-18 X-ray) */}
        <div className="glass-card" style={{ padding: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase' }}>
            <Flame size={13} style={{ color: '#f59e0b' }} />
            <span>X-ray Flare Class</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', margin: '8px 0 4px' }}>
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

      {/* Active Alerts List */}
      {data?.activeAlerts && data.activeAlerts.length > 0 && (
        <div style={{
          marginTop: '12px',
          paddingTop: '12px',
          borderTop: '1px solid var(--border-subtle)'
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
            <AlertCircle size={13} style={{ color: '#f59e0b' }} />
            <span>Latest Official SWPC Bulletins ({data.activeAlerts.length})</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '140px', overflowY: 'auto' }}>
            {data.activeAlerts.slice(0, 4).map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255, 255, 255, 0.05)',
                  borderRadius: 'var(--radius-sm)',
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
                    color: alert.severity === 'ALERT' ? '#ef4444' : alert.severity === 'WARNING' ? '#f59e0b' : 'var(--text-primary)'
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
        </div>
      )}
    </div>
  );
};
