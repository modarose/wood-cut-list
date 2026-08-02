import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import {
  createToolRequirement,
  getToolRequirementCheck,
  updateToolRequirement,
} from '../utils/toolRequirements.js';
import { TOOL_CAPABILITIES } from '../utils/toolInventory.js';

const EMPTY_FORM = {
  capability: 'measuring',
  quantity: '1',
  notes: '',
};

function optionLabel(options, value) {
  return options.find(option => option.value === value)?.label ?? value;
}

function toForm(requirement) {
  return {
    capability: requirement.capability,
    quantity: String(requirement.quantity),
    notes: requirement.notes ?? '',
  };
}

function rowClass(status) {
  if (status === 'covered') return 'potential';
  if (status === 'needs-review') return 'needs-review';
  return 'unmatched';
}

function RowStatusIcon({ status }) {
  return status === 'covered' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />;
}

function rowResult(row) {
  if (row.status === 'covered') {
    return `${row.readyCount} owned available ${row.readyCount === 1 ? 'tool' : 'tools'}`;
  }
  return row.reason;
}

export default function ProjectToolRequirements({
  projectId,
  requirements = [],
  tools = [],
  check: suppliedCheck,
  onChange,
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const calculatedCheck = useMemo(
    () => getToolRequirementCheck(requirements, tools),
    [requirements, tools],
  );
  const check = suppliedCheck ?? calculatedCheck;

  useEffect(() => {
    setIsFormOpen(false);
    setEditingRequirement(null);
    setFormError('');
  }, [projectId]);

  const openNewForm = () => {
    setEditingRequirement(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = requirement => {
    setEditingRequirement(requirement);
    setForm(toForm(requirement));
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingRequirement(null);
    setFormError('');
  };

  const handleFormChange = event => {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
    setFormError('');
  };

  const handleSubmit = event => {
    event.preventDefault();

    try {
      const requirement = editingRequirement
        ? updateToolRequirement(editingRequirement, form, { projectId })
        : createToolRequirement(form, { projectId });
      const nextRequirements = editingRequirement
        ? requirements.map(candidate => (
          candidate.id === requirement.id ? requirement : candidate
        ))
        : [...requirements, requirement];

      onChange(nextRequirements);
      closeForm();
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleDelete = requirement => {
    if (!window.confirm('Remove this tool requirement from the project?')) return;
    onChange(requirements.filter(candidate => candidate.id !== requirement.id));
  };

  const attentionCount = check.summary.partial + check.summary.needsReview + check.summary.missing;

  return (
    <section className="ws-project-tool-panel">
      <div className="ws-project-tool-heading">
        <div>
          <div className="ws-project-supply-eyebrow">Project requirements</div>
          <h3>Tools and capabilities</h3>
          <p>
            Add the capabilities this project needs. A match means an owned tool is available and not marked damaged or unknown.
          </p>
        </div>
        <div className="ws-project-supply-heading-actions">
          <span className={`ws-readiness-status ${check.status === 'covered' ? 'screened' : check.status === 'not-started' ? 'not-started' : 'attention'}`}>
            {check.statusLabel}
          </span>
          <button type="button" className="ws-btn ws-btn-primary" onClick={openNewForm}>
            <Plus size={15} />
            Add tool need
          </button>
        </div>
      </div>

      <div className="ws-metrics-grid ws-project-supply-metrics">
        <div className="ws-metric-card">
          <div className="ws-metric-label"><Wrench size={13} /> Requirements</div>
          <div className="ws-metric-value">{check.summary.totalRequirements}</div>
        </div>
        <div className="ws-metric-card">
          <div className="ws-metric-label"><CheckCircle2 size={13} /> Covered</div>
          <div className="ws-metric-value">{check.summary.covered}</div>
        </div>
        <div className="ws-metric-card">
          <div className="ws-metric-label"><Settings size={13} /> Needs review</div>
          <div className={`ws-metric-value${check.summary.needsReview ? ' secondary' : ''}`}>
            {check.summary.needsReview}
          </div>
        </div>
        <div className="ws-metric-card">
          <div className="ws-metric-label"><AlertTriangle size={13} /> Gaps</div>
          <div className={`ws-metric-value${attentionCount ? ' secondary' : ''}`}>{attentionCount}</div>
        </div>
      </div>

      {isFormOpen && (
        <form className="ws-project-supply-form" onSubmit={handleSubmit}>
          <div className="ws-project-supply-form-heading">
            <strong>{editingRequirement ? 'Edit tool requirement' : 'Add tool requirement'}</strong>
            <button type="button" className="ws-btn ws-btn-icon" onClick={closeForm} title="Close tool requirement form">
              <X size={16} />
            </button>
          </div>
          {formError && <div className="ws-form-error" role="alert">{formError}</div>}
          <div className="ws-tool-requirement-form-grid">
            <label className="ws-input-group">
              <span className="ws-label">Required capability</span>
              <select className="ws-select" name="capability" value={form.capability} onChange={handleFormChange}>
                {TOOL_CAPABILITIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="ws-input-group">
              <span className="ws-label">Quantity</span>
              <input className="ws-input" type="number" min="1" step="1" name="quantity" value={form.quantity} onChange={handleFormChange} />
            </label>
            <label className="ws-input-group ws-tool-requirement-field-wide">
              <span className="ws-label">Notes</span>
              <input className="ws-input" name="notes" value={form.notes} onChange={handleFormChange} placeholder="For example, guide rail required for the cut" />
            </label>
          </div>
          <div className="ws-inventory-form-actions">
            <button type="button" className="ws-btn" onClick={closeForm}>Cancel</button>
            <button type="submit" className="ws-btn ws-btn-primary">{editingRequirement ? 'Save changes' : 'Add requirement'}</button>
          </div>
        </form>
      )}

      {requirements.length === 0 ? (
        <div className="ws-inventory-empty ws-inventory-empty-compact ws-project-supply-empty">
          <span>No project tool requirements yet. Add them to screen owned capability coverage.</span>
        </div>
      ) : (
        <div className="ws-project-supply-list" aria-label="Project tool requirement matches">
          {check.rows.map(row => (
            <div className={`ws-inventory-match-row ${rowClass(row.status)}`} key={row.id}>
              <div className="ws-inventory-match-status" title={row.status}>
                <RowStatusIcon status={row.status} />
              </div>
              <div className="ws-inventory-match-main">
                <strong>{optionLabel(TOOL_CAPABILITIES, row.requirement?.capability)}</strong>
                <span>{row.requiredQuantity} required{row.requirement?.notes ? ` · ${row.requirement.notes}` : ''}</span>
              </div>
              <div className="ws-inventory-match-result">
                <strong>{row.status === 'covered' ? 'Covered' : row.status === 'partial' ? 'Partial' : row.status === 'needs-review' ? 'Needs review' : 'Missing'}</strong>
                <span>{rowResult(row)}</span>
              </div>
              <div className="ws-project-supply-row-actions">
                <button type="button" className="ws-btn ws-btn-icon" onClick={() => openEditForm(row.requirement)} title="Edit tool requirement">
                  <Pencil size={14} />
                </button>
                <button type="button" className="ws-btn ws-btn-icon ws-btn-danger" onClick={() => handleDelete(row.requirement)} title="Remove tool requirement">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ws-project-supply-note">
        This is a capability screen, not a tool assignment or safety certification. Non-owned, unavailable and uncertain tools remain visible for manual review.
      </div>
    </section>
  );
}
