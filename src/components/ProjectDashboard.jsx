import React, { useState } from 'react';
import { Archive, ArrowLeft, Copy, FolderOpen, Plus, RotateCcw } from 'lucide-react';

function statusLabel(status) {
  return (status || 'planning').replaceAll('-', ' ');
}

function formatDate(value) {
  if (!value) return 'Not saved';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function ProjectCard({ projectRecord, archived, onOpen, onDuplicate, onArchive, onRestore }) {
  const { project } = projectRecord;
  const revision = projectRecord.designRevisions.find(item => item.id === project.activeRevisionId);
  const partCount = projectRecord.parts.reduce((sum, part) => sum + part.quantity, 0);

  return (
    <article className="ws-card" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--ws-space-md)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--ws-space-md)', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--ws-on-surface)' }}>{project.name}</h2>
          <div style={{
            display: 'inline-flex',
            marginTop: '8px',
            padding: '4px 8px',
            borderRadius: 'var(--ws-radius-full)',
            background: 'var(--ws-surface-container)',
            color: 'var(--ws-on-surface-variant)',
            fontFamily: 'var(--ws-font-mono)',
            fontSize: '11px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}>
            {statusLabel(project.status)}
          </div>
        </div>
        <span style={{
          color: project.readiness === 'needs-review' ? 'var(--ws-secondary)' : 'var(--ws-primary)',
          fontFamily: 'var(--ws-font-mono)',
          fontSize: '11px',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}>
          {project.readiness || 'needs-review'}
        </span>
      </div>

      <p style={{ margin: 0, minHeight: '2.6em', color: 'var(--ws-on-surface-variant)', fontSize: '14px', lineHeight: 1.45 }}>
        {project.description || 'No project notes yet.'}
      </p>

      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '8px 16px',
        paddingTop: 'var(--ws-space-sm)',
        borderTop: '1px solid var(--ws-outline-variant)',
        color: 'var(--ws-on-surface-variant)',
        fontFamily: 'var(--ws-font-mono)',
        fontSize: '11px',
      }}>
        <span>{partCount} part{partCount === 1 ? '' : 's'}</span>
        <span>Revision {revision?.revisionNumber ?? 1}</span>
        <span>Updated {formatDate(project.updatedAt)}</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {!archived && (
          <button className="ws-btn ws-btn-primary ws-btn-sm" onClick={() => onOpen(projectRecord)}>
            <FolderOpen size={14} />
            Open
          </button>
        )}
        <button className="ws-btn ws-btn-sm" onClick={() => onDuplicate(projectRecord)}>
          <Copy size={14} />
          Duplicate
        </button>
        {archived ? (
          <button className="ws-btn ws-btn-sm" onClick={() => onRestore(projectRecord)}>
            <RotateCcw size={14} />
            Restore
          </button>
        ) : (
          <button className="ws-btn ws-btn-sm" onClick={() => onArchive(projectRecord)}>
            <Archive size={14} />
            Archive
          </button>
        )}
      </div>
    </article>
  );
}

export default function ProjectDashboard({
  projects,
  onClose,
  onCreate,
  onOpen,
  onDuplicate,
  onArchive,
  onRestore,
}) {
  const [showArchived, setShowArchived] = useState(false);
  const visibleProjects = projects.filter(projectRecord => Boolean(projectRecord.project.archivedAt) === showArchived);

  return (
    <main className="ws-main">
        <div className="ws-content" style={{ maxWidth: '1180px', margin: '0 auto', width: '100%' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            gap: 'var(--ws-space-md)',
            flexWrap: 'wrap',
            marginBottom: 'var(--ws-space-lg)',
          }}>
            <div>
              <div className="ws-label" style={{ marginBottom: '8px' }}>BenchMate workspace</div>
              <h1 style={{ margin: 0, color: 'var(--ws-on-surface)', fontSize: 'clamp(1.6rem, 4vw, 2.4rem)' }}>Projects</h1>
              <p style={{ margin: '8px 0 0', color: 'var(--ws-on-surface-variant)', maxWidth: '620px', lineHeight: 1.5 }}>
                Keep project notes and cut-list revisions together while WoodCut Studio continues to do the optimisation work.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="ws-btn ws-btn-sm" onClick={onClose}>
                <ArrowLeft size={14} />
                Back to workspace
              </button>
              <button className="ws-btn ws-btn-primary ws-btn-sm" onClick={onCreate}>
                <Plus size={14} />
                New project
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: 'var(--ws-space-md)' }}>
            <div className="ws-card-title" style={{ fontSize: '0.9rem' }}>
              {showArchived ? 'Archived projects' : 'Active projects'}
            </div>
            <button
              className="ws-btn ws-btn-sm"
              onClick={() => setShowArchived(value => !value)}
            >
              {showArchived ? 'Show active' : 'Show archived'}
            </button>
          </div>

          {visibleProjects.length === 0 ? (
            <section className="ws-card" style={{ padding: 'var(--ws-space-xl)', textAlign: 'center' }}>
              <FolderOpen size={32} color="var(--ws-outline)" />
              <h2 style={{ margin: '12px 0 6px', fontSize: '1.1rem' }}>
                {showArchived ? 'No archived projects' : 'No saved projects yet'}
              </h2>
              <p style={{ margin: 0, color: 'var(--ws-on-surface-variant)' }}>
                {showArchived ? 'Archived projects will remain available here.' : 'Create a project or save the current cut-list workspace.'}
              </p>
            </section>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'var(--ws-space-md)' }}>
              {visibleProjects.map(projectRecord => (
                <ProjectCard
                  key={projectRecord.project.id}
                  projectRecord={projectRecord}
                  archived={showArchived}
                  onOpen={onOpen}
                  onDuplicate={onDuplicate}
                  onArchive={onArchive}
                  onRestore={onRestore}
                />
              ))}
            </div>
          )}
        </div>
    </main>
  );
}
