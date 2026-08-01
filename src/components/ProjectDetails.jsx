import React from 'react';
import { FolderKanban } from 'lucide-react';

const PROJECT_STATUSES = [
  { value: 'idea', label: 'Idea' },
  { value: 'planning', label: 'Planning' },
  { value: 'ready-to-buy', label: 'Ready to buy' },
  { value: 'building', label: 'Building' },
  { value: 'paused', label: 'Paused' },
  { value: 'complete', label: 'Complete' },
];

function formatSavedAt(value) {
  if (!value) return 'Not saved yet';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Saved';

  return `Saved ${date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })}`;
}

export default function ProjectDetails({
  name,
  status,
  description,
  isDirty,
  lastSavedAt,
  saveError,
  onNameChange,
  onStatusChange,
  onDescriptionChange,
}) {
  return (
    <section className="ws-card no-print" style={{ marginBottom: 'var(--ws-space-md)' }}>
      <div className="ws-card-header">
        <div className="ws-card-title">
          <FolderKanban size={18} />
          Project details
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <span style={{
            fontFamily: 'var(--ws-font-mono)',
            fontSize: '11px',
            color: isDirty ? 'var(--ws-secondary)' : 'var(--ws-on-surface-variant)',
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
          }}>
            {isDirty ? 'Unsaved changes' : formatSavedAt(lastSavedAt)}
          </span>
        </div>
      </div>

      <div className="ws-card-body">
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(220px, 2fr) minmax(180px, 1fr)',
          gap: 'var(--ws-space-md)',
          marginBottom: 'var(--ws-space-md)',
        }}>
          <div className="ws-input-group">
            <label className="ws-label" htmlFor="project-name">Project name</label>
            <input
              id="project-name"
              type="text"
              className="ws-input"
              value={name}
              onChange={event => onNameChange(event.target.value)}
              placeholder="Untitled project"
            />
          </div>

          <div className="ws-input-group">
            <label className="ws-label" htmlFor="project-status">Status</label>
            <select
              id="project-status"
              className="ws-select"
              value={status}
              onChange={event => onStatusChange(event.target.value)}
            >
              {PROJECT_STATUSES.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="ws-input-group">
          <label className="ws-label" htmlFor="project-description">Notes</label>
          <textarea
            id="project-description"
            className="ws-input"
            value={description}
            onChange={event => onDescriptionChange(event.target.value)}
            placeholder="What are you building, and what should you remember?"
            rows={2}
            style={{ resize: 'vertical', minHeight: '58px' }}
          />
        </div>

        {saveError && (
          <div style={{
            marginTop: 'var(--ws-space-md)',
            padding: '10px 12px',
            borderRadius: 'var(--ws-radius)',
            color: 'var(--ws-error)',
            background: 'var(--ws-error-container)',
            fontSize: '13px',
          }}>
            {saveError}
          </div>
        )}
      </div>
    </section>
  );
}
