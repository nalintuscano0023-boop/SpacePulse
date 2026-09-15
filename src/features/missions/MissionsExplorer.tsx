import React, { useState } from 'react';
import { 
  Database, 
  ExternalLink, 
  Search, 
  FileText, 
  ShieldCheck, 
  Layers, 
  ChevronRight,
  BookOpen,
  Award,
  Globe
} from 'lucide-react';
import { MISSIONS_DATABASE, ARCHIVE_DATASETS } from '../../services/data/missionsCatalog';
import { MissionRecord, ArchiveDataset } from '../../types/missions';
import { StatusBadge } from '../../components/common/StatusBadge';

export const MissionsExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'missions' | 'archives'>('missions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<'ALL' | 'ISRO' | 'NASA'>('ALL');
  const [selectedMission, setSelectedMission] = useState<MissionRecord | null>(MISSIONS_DATABASE[0]);

  const filteredMissions = MISSIONS_DATABASE.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.overview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.target.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    if (selectedAgency === 'ISRO') return m.agency === 'ISRO';
    if (selectedAgency === 'NASA') return m.agency === 'NASA';
    return true;
  });

  const filteredArchives = ARCHIVE_DATASETS.filter(a => {
    return a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.mission.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.archiveHost.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ padding: '20px 0 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontSize: '11px',
            fontFamily: 'var(--font-heading)',
            color: 'var(--status-live)',
            fontWeight: 600,
            textTransform: 'uppercase'
          }}>
            <Database size={12} />
            <span>Authoritative Planetary & Astronomical Archives</span>
          </div>
          <StatusBadge status="LAST_AVAILABLE" />
        </div>

        <h1 style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.02em', color: '#f8fafc' }}>
          Missions & Scientific Data Archives
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '850px', lineHeight: 1.5, marginTop: '4px' }}>
          Comprehensive verified mission logs, scientific payloads, and open planetary science archives from ISRO (ISSDC / PRADAN & MOSDAC), NASA PDS, and international space agencies.
        </p>
      </div>

      {/* Mode Switcher Tabs & Search */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px'
      }}>
        {/* Toggle Mode */}
        <div style={{ display: 'flex', gap: '6px', background: 'rgba(255, 255, 255, 0.03)', padding: '4px', borderRadius: 'var(--radius-sm)' }}>
          <button
            onClick={() => setActiveTab('missions')}
            className={`btn ${activeTab === 'missions' ? 'btn-active' : 'btn-ghost'}`}
            style={{ fontSize: '13px', padding: '6px 16px' }}
          >
            <BookOpen size={14} />
            <span>Mission Profiles ({MISSIONS_DATABASE.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('archives')}
            className={`btn ${activeTab === 'archives' ? 'btn-active' : 'btn-ghost'}`}
            style={{ fontSize: '13px', padding: '6px 16px' }}
          >
            <Layers size={14} />
            <span>Public Datasets & Archives ({ARCHIVE_DATASETS.length})</span>
          </button>
        </div>

        {/* Search */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          padding: '8px 14px',
          width: '100%',
          maxWidth: '320px'
        }}>
          <Search size={15} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search missions, instruments, or data..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px',
              width: '100%',
              fontFamily: 'var(--font-sans)'
            }}
          />
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'missions' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 360px) 1fr',
          gap: '20px'
        }}>
          {/* Mission List Sidebar */}
          <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', height: 'fit-content' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              {(['ALL', 'ISRO', 'NASA'] as const).map(ag => (
                <button
                  key={ag}
                  onClick={() => setSelectedAgency(ag)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: selectedAgency === ag ? '1px solid var(--border-active)' : '1px solid transparent',
                    background: selectedAgency === ag ? 'rgba(56, 189, 248, 0.15)' : 'transparent',
                    color: selectedAgency === ag ? 'var(--accent-cyan)' : 'var(--text-muted)'
                  }}
                >
                  {ag}
                </button>
              ))}
            </div>

            {filteredMissions.map((m) => {
              const isSelected = selectedMission?.id === m.id;
              return (
                <div
                  key={m.id}
                  onClick={() => setSelectedMission(m)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    background: isSelected ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    border: isSelected ? '1px solid var(--border-active)' : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {m.name}
                    </span>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-muted)',
                      fontWeight: 600
                    }}>
                      {m.agency}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {m.missionType} • {m.launchDate.split('-')[0]}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Mission Detail View */}
          {selectedMission && (
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Mission Hero */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                borderBottom: '1px solid var(--border-subtle)',
                paddingBottom: '16px'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{selectedMission.name}</h2>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.15)',
                      color: 'var(--accent-cyan)',
                      fontWeight: 600
                    }}>
                      {selectedMission.agency}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {selectedMission.missionType} • Launched {selectedMission.launchDate} via {selectedMission.launchVehicle}
                  </div>
                </div>

                <a
                  href={selectedMission.officialSourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: '12px' }}
                >
                  <span>Official Mission Portal</span>
                  <ExternalLink size={13} />
                </a>
              </div>

              {/* Overview */}
              <div>
                <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>
                  Mission Overview
                </h3>
                <p style={{ fontSize: '14px', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
                  {selectedMission.overview}
                </p>
              </div>

              {/* Key Achievements */}
              <div>
                <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={14} style={{ color: '#f59e0b' }} />
                  <span>Key Scientific & Engineering Achievements</span>
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {selectedMission.keyAchievements.map((ach, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '10px 14px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '13px',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '10px'
                      }}
                    >
                      <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>•</span>
                      <span>{ach}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Scientific Payload Specifications */}
              <div>
                <h3 style={{ fontSize: '14px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Layers size={14} style={{ color: 'var(--accent-cyan)' }} />
                  <span>Verified Payload Instrumentation ({selectedMission.payloads.length})</span>
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '12px'
                }}>
                  {selectedMission.payloads.map((payload) => (
                    <div
                      key={payload.acronym}
                      className="glass-card"
                      style={{ padding: '16px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '14px', color: 'var(--text-primary)' }}>
                          {payload.acronym}
                        </span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {payload.leadInstitution}
                        </span>
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--accent-cyan)', marginBottom: '6px' }}>
                        {payload.name}
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '8px' }}>
                        {payload.description}
                      </p>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '6px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Data Format: </span>
                        {payload.dataType}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catalog Reference Footer */}
              <div style={{
                padding: '12px 16px',
                background: 'rgba(0, 0, 0, 0.3)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '11px',
                color: 'var(--text-muted)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <span>Catalog ID: {selectedMission.officialCatalogId}</span>
                <span>Verified Source: Official {selectedMission.agency} Documentation</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Open Planetary Science Archives Directory */
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '16px'
        }}>
          {filteredArchives.map((archive) => (
            <div
              key={archive.id}
              className="glass-card"
              style={{
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '14px'
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
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: 'rgba(56, 189, 248, 0.1)',
                      color: 'var(--accent-cyan)',
                      fontWeight: 600
                    }}>
                      {archive.archiveHost}
                    </span>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, marginTop: '6px', color: '#f8fafc' }}>
                      {archive.title}
                    </h3>
                  </div>
                </div>

                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '12px' }}>
                  {archive.description}
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Mission</span>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{archive.mission}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Data Level</span>
                    <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>{archive.dataLevel}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Supported Formats</span>
                    <span className="mono" style={{ color: 'var(--accent-cyan)' }}>{archive.formats.join(', ')}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Access Policy</span>
                    <span style={{ color: 'var(--status-live)', fontWeight: 500 }}>{archive.accessType}</span>
                  </div>
                </div>
              </div>

              <div style={{
                paddingTop: '12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <a
                  href={archive.officialUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                  style={{ fontSize: '12px', padding: '6px 12px' }}
                >
                  <span>Open Official Archive</span>
                  <ExternalLink size={13} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
