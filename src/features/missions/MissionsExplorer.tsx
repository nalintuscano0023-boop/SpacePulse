import React, { useState } from 'react';
import { 
  Database, 
  ExternalLink, 
  Search, 
  Layers, 
  BookOpen,
  Award,
  ChevronRight,
  X,
  Radio
} from 'lucide-react';
import { MISSIONS_DATABASE, ARCHIVE_DATASETS } from '../../services/data/missionsCatalog';
import type { MissionRecord, ArchiveDataset } from '../../types/missions';
import { StatusBadge } from '../../components/common/StatusBadge';

type AgencyFilter = 'ALL' | 'ISRO' | 'NASA' | 'ESA' | 'OTHER';

export const MissionsExplorer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'missions' | 'archives'>('missions');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgency, setSelectedAgency] = useState<AgencyFilter>('ALL');
  const [previewMission, setPreviewMission] = useState<MissionRecord | null>(null);

  const filteredMissions = MISSIONS_DATABASE.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.overview.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.target.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) return false;
    
    if (selectedAgency === 'ISRO') return m.agency === 'ISRO';
    if (selectedAgency === 'NASA') return m.agency === 'NASA';
    if (selectedAgency === 'ESA') return m.agency === 'ESA';
    if (selectedAgency === 'OTHER') return m.agency !== 'ISRO' && m.agency !== 'NASA' && m.agency !== 'ESA';
    return true;
  });

  const filteredArchives = ARCHIVE_DATASETS.filter(a => {
    return a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.mission.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.archiveHost.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ padding: '12px 0 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
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
            <Database size={12} />
            <span>ASTRONOMICAL ARCHIVE // SCIENTIFIC MISSIONS</span>
          </div>
          <StatusBadge status="LAST_AVAILABLE" compact />
        </div>

        <h1 style={{ fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em', color: '#ffffff' }}>
          Missions & Planetary Science Archives
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)', maxWidth: '800px', lineHeight: 1.5, marginTop: '4px' }}>
          Verified mission dossiers, payload instrumentation records, and planetary science repositories from ISRO (PRADAN / MOSDAC), NASA PDS, and international space agencies.
        </p>

        {/* Quick Interaction Guide for First-Time Judges */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginTop: '10px',
          fontSize: '11px',
          color: 'var(--text-muted)',
          flexWrap: 'wrap',
          background: 'rgba(56, 189, 248, 0.05)',
          border: '1px solid rgba(56, 189, 248, 0.15)',
          padding: '6px 12px',
          borderRadius: 'var(--radius-xs)'
        }}>
          <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>HOW TO EXPLORE:</span>
          <span>Click any mission card to open its detailed scientific dossier & milestones</span>
          <span>•</span>
          <span>Switch to <strong>Open Repositories</strong> to inspect direct agency data links</span>
          <span>•</span>
          <span>Filter by agency to isolate ISRO, NASA, or ESA planetary archives</span>
        </div>
      </div>

      {/* Toolbar: Search, Filters & Sub-view Switcher */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        padding: '12px 16px',
        background: 'var(--surface-panel)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-hairline)'
      }}>
        {/* Sub-view switcher */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--surface-inset)', padding: '3px', borderRadius: 'var(--radius-xs)', border: '1px solid var(--border-hairline)' }}>
          <button
            onClick={() => setActiveTab('missions')}
            className={`btn ${activeTab === 'missions' ? 'btn-active' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '5px 12px' }}
          >
            <BookOpen size={13} />
            <span>Missions Directory ({MISSIONS_DATABASE.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('archives')}
            className={`btn ${activeTab === 'archives' ? 'btn-active' : 'btn-ghost'}`}
            style={{ fontSize: '12px', padding: '5px 12px' }}
          >
            <Layers size={13} />
            <span>Open Repositories ({ARCHIVE_DATASETS.length})</span>
          </button>
        </div>

        {/* Agency Filters (for Missions) */}
        {activeTab === 'missions' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginRight: '4px' }}>Filter:</span>
            {(['ALL', 'ISRO', 'NASA', 'ESA', 'OTHER'] as AgencyFilter[]).map(ag => (
              <button
                key={ag}
                onClick={() => setSelectedAgency(ag)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-xs)',
                  fontSize: '11px',
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: selectedAgency === ag ? '1px solid var(--border-focus)' : '1px solid transparent',
                  background: selectedAgency === ag ? 'rgba(56, 189, 248, 0.14)' : 'transparent',
                  color: selectedAgency === ag ? 'var(--accent-cyan)' : 'var(--text-muted)',
                  transition: 'all 0.15s ease'
                }}
              >
                {ag === 'ALL' ? 'All Agencies' : ag}
              </button>
            ))}
          </div>
        )}

        {/* Search Input */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--surface-inset)',
          border: '1px solid var(--border-hairline)',
          borderRadius: 'var(--radius-xs)',
          padding: '6px 10px',
          width: '100%',
          maxWidth: '280px'
        }}>
          <Search size={13} style={{ color: 'var(--text-muted)' }} />
          <input
            type="text"
            placeholder="Search missions or archives..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '12px',
              width: '100%',
              fontFamily: 'var(--font-sans)'
            }}
          />
        </div>
      </div>

      {/* Main Tab Content */}
      {activeTab === 'missions' ? (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          {/* Compact Mission Rows Table */}
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table-container">
              <thead>
                <tr style={{
                  borderBottom: '1px solid var(--border-hairline)',
                  background: 'rgba(3, 5, 10, 0.5)',
                  textAlign: 'left',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <th style={{ padding: '12px 16px' }}>Mission Name</th>
                  <th style={{ padding: '12px 16px' }}>Agency</th>
                  <th style={{ padding: '12px 16px' }}>Target / Scope</th>
                  <th style={{ padding: '12px 16px' }}>Launch Date</th>
                  <th style={{ padding: '12px 16px' }}>Payloads</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredMissions.map((mission) => {
                  const isSelected = previewMission?.id === mission.id;
                  return (
                    <tr
                      key={mission.id}
                      onClick={() => setPreviewMission(isSelected ? null : mission)}
                      className={`data-table-row ${isSelected ? 'selected' : ''}`}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#ffffff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span>{mission.name}</span>
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px', fontWeight: 400 }}>
                          {mission.missionType}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span className="agency-badge">{mission.agency}</span>
                      </td>

                      <td style={{ padding: '12px 16px', color: 'var(--accent-cyan)', fontSize: '11px' }}>
                        {mission.target}
                      </td>

                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
                        {mission.launchDate}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          fontSize: '11px',
                          color: 'var(--text-secondary)',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-xs)',
                          background: 'var(--surface-inset)'
                        }}>
                          {mission.payloads.length} Instruments
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ fontSize: '11px', padding: '4px 8px', gap: '4px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setPreviewMission(isSelected ? null : mission);
                          }}
                        >
                          <span>{isSelected ? 'Collapse' : 'Preview'}</span>
                          <ChevronRight size={13} style={{ transform: isSelected ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s ease' }} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Planetary Science Datasets Directory (Compact Rows) */
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table-container">
              <thead>
                <tr style={{
                  borderBottom: '1px solid var(--border-hairline)',
                  background: 'rgba(3, 5, 10, 0.5)',
                  textAlign: 'left',
                  fontSize: '11px',
                  color: 'var(--text-muted)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em'
                }}>
                  <th style={{ padding: '12px 16px' }}>Archive Title</th>
                  <th style={{ padding: '12px 16px' }}>Repository Host</th>
                  <th style={{ padding: '12px 16px' }}>Mission</th>
                  <th style={{ padding: '12px 16px' }}>Formats</th>
                  <th style={{ padding: '12px 16px' }}>Access</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Link</th>
                </tr>
              </thead>
              <tbody>
                {filteredArchives.map((archive) => (
                  <tr key={archive.id} className="data-table-row">
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#ffffff' }}>{archive.title}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '2px', maxWidth: '420px' }}>
                        {archive.description}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span className="agency-badge">{archive.archiveHost}</span>
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--accent-cyan)', fontSize: '11px' }}>
                      {archive.mission}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span className="mono" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {archive.formats.join(', ')}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--status-live)' }}>
                        {archive.accessType}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <a
                        href={archive.officialUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-secondary"
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        <span>Access</span>
                        <ExternalLink size={12} />
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Selected Mission Detailed Dossier Preview */}
      {previewMission && (
        <div
          className="glass-panel tech-corner"
          style={{
            padding: '20px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--border-hairline)',
            paddingBottom: '12px',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>{previewMission.name}</h2>
                <span className="agency-badge">{previewMission.agency}</span>
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                {previewMission.missionType} • Launched {previewMission.launchDate} via {previewMission.launchVehicle}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <a
                href={previewMission.officialSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: '11px', padding: '5px 12px' }}
              >
                <span>Official Mission Portal</span>
                <ExternalLink size={12} />
              </a>

              <button
                type="button"
                onClick={() => setPreviewMission(null)}
                className="btn btn-ghost"
                style={{ padding: '4px' }}
                aria-label="Close Preview"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Overview Text */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '4px' }}>
              Mission Summary
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
              {previewMission.overview}
            </p>
          </div>

          {/* Key Achievements */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--solar-amber)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <Award size={13} />
              <span>Verified Scientific Achievements</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {previewMission.keyAchievements.map((ach, i) => (
                <div
                  key={i}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--surface-inset)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-xs)',
                    fontSize: '12px',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: '8px'
                  }}
                >
                  <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>•</span>
                  <span>{ach}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Payloads Grid */}
          <div>
            <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', textTransform: 'uppercase', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <Layers size={13} />
              <span>Scientific Payload Instrumentation ({previewMission.payloads.length})</span>
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '8px'
            }}>
              {previewMission.payloads.map((payload) => (
                <div
                  key={payload.acronym}
                  style={{
                    padding: '10px 12px',
                    background: 'var(--surface-inset)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: 'var(--radius-xs)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 700, fontSize: '12px', color: 'var(--text-primary)' }}>
                      {payload.acronym}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                      {payload.leadInstitution}
                    </span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--accent-cyan)', fontWeight: 500 }}>
                    {payload.name}
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '4px 0 0' }}>
                    {payload.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
