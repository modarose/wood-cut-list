import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Package,
  Pencil,
  Plus,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import {
  createSupplyRequirement,
  getSupplyRequirementCheck,
  updateSupplyRequirement,
} from '../utils/supplyRequirements.js';
import {
  SUPPLY_CATEGORIES,
  SUPPLY_UNITS,
} from '../utils/supplyInventory.js';

const EMPTY_FORM = {
  category: 'hardware',
  name: '',
  reference: '',
  unit: 'each',
  quantity: '1',
  notes: '',
};

function optionLabel(options, value) {
  return options.find(option => option.value === value)?.label ?? value;
}

function toForm(requirement) {
  return {
    category: requirement.category,
    name: requirement.name,
    reference: requirement.reference ?? '',
    unit: requirement.unit,
    quantity: String(requirement.quantity),
    notes: requirement.notes ?? '',
  };
}

function formatQuantity(value) {
  if (!Number.isFinite(value)) return '—';
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

function requirementSummary(row) {
  const requirement = row.requirement;
  const unit = optionLabel(SUPPLY_UNITS, requirement.unit).toLowerCase();
  const reference = requirement.reference ? ` · ${requirement.reference}` : '';
  return `${formatQuantity(row.requiredQuantity)} ${unit}${reference}`;
}

function rowClass(status) {
  if (status === 'owned') return 'potential';
  if (status === 'planned') return 'planned';
  if (status === 'needs-review') return 'needs-review';
  return 'unmatched';
}

function RowStatusIcon({ status }) {
  if (status === 'owned') return <CheckCircle2 size={15} />;
  if (status === 'planned') return <ShoppingCart size={15} />;
  return <AlertTriangle size={15} />;
}

function rowResult(row) {
  const unit = optionLabel(SUPPLY_UNITS, row.requirement?.unit).toLowerCase();
  if (row.status === 'owned') {
    return `${formatQuantity(row.ownedQuantity)} ${unit} owned`;
  }
  if (row.status === 'planned') {
    return `${formatQuantity(row.ownedQuantity)} owned + ${formatQuantity(row.plannedQuantity)} planned`;
  }
  if (row.status === 'partial') {
    return `${formatQuantity(row.availableQuantity)} ${unit} found; ${formatQuantity(row.shortfall)} still needed`;
  }
  return row.reason;
}

export default function ProjectSupplyRequirements({
  projectId,
  requirements = [],
  supplies = [],
  check: suppliedCheck,
  onChange,
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingRequirement, setEditingRequirement] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');

  const calculatedCheck = useMemo(
    () => getSupplyRequirementCheck(requirements, supplies),
    [requirements, supplies],
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
        ? updateSupplyRequirement(editingRequirement, form, { projectId })
        : createSupplyRequirement(form, { projectId });
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
    if (!window.confirm(`Remove ${requirement.name} from this project's requirements?`)) return;
    onChange(requirements.filter(candidate => candidate.id !== requirement.id));
  };

  const gapCount = check.summary.partial + check.summary.missing + check.summary.needsReview;

  return (
    <section className="ws-project-supply-panel">
      <div className="ws-project-supply-heading">
        <div>
          <div className="ws-project-supply-eyebrow">Project requirements</div>
          <h3>Hardware and supplies</h3>
          <p>
            Add the screws, glue, finish or consumables this project needs. Matching is exact by category,
            name and unit.
          </p>
        </div>
        <div className="ws-project-supply-heading-actions">
          <span className={`ws-readiness-status ${check.status === 'covered' ? 'screened' : check.status === 'not-started' ? 'not-started' : 'attention'}`}>
            {check.statusLabel}
          </span>
          <button type="button" className="ws-btn ws-btn-primary" onClick={openNewForm}>
            <Plus size={15} />
            Add requirement
          </button>
        </div>
      </div>

      <div className="ws-metrics-grid ws-project-supply-metrics">
        <div className="ws-metric-card">
          <div className="ws-metric-label"><Package size={13} /> Requirements</div>
          <div className="ws-metric-value">{check.summary.totalRequirements}</div>
        </div>
        <div className="ws-metric-card">
          <div className="ws-metric-label"><CheckCircle2 size={13} /> Owned covered</div>
          <div className="ws-metric-value">{check.summary.ownedCovered}</div>
        </div>
        <div className="ws-metric-card">
          <div className="ws-metric-label"><ShoppingCart size={13} /> Planned covered</div>
          <div className={`ws-metric-value${check.summary.plannedCovered ? ' secondary' : ''}`}>
            {check.summary.plannedCovered}
          </div>
        </div>
        <div className="ws-metric-card">
          <div className="ws-metric-label"><AlertTriangle size={13} /> Gaps</div>
          <div className={`ws-metric-value${gapCount ? ' secondary' : ''}`}>{gapCount}</div>
        </div>
      </div>

      {isFormOpen && (
        <form className="ws-project-supply-form" onSubmit={handleSubmit}>
          <div className="ws-project-supply-form-heading">
            <strong>{editingRequirement ? 'Edit requirement' : 'Add project requirement'}</strong>
            <button type="button" className="ws-btn ws-btn-icon" onClick={closeForm} title="Close requirement form">
              <X size={16} />
            </button>
          </div>
          {formError && <div className="ws-form-error" role="alert">{formError}</div>}
          <div className="ws-inventory-form-grid">
            <label className="ws-input-group ws-inventory-field-wide">
              <span className="ws-label">Supply name</span>
              <input className="ws-input" name="name" value={form.name} onChange={handleFormChange} placeholder="50 mm screws" autoFocus />
            </label>
            <label className="ws-input-group">
              <span className="ws-label">Category</span>
              <select className="ws-select" name="category" value={form.category} onChange={handleFormChange}>
                {SUPPLY_CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="ws-input-group">
              <span className="ws-label">Unit</span>
              <select className="ws-select" name="unit" value={form.unit} onChange={handleFormChange}>
                {SUPPLY_UNITS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="ws-input-group">
              <span className="ws-label">Quantity</span>
              <input className="ws-input" type="number" min="0.01" step="0.01" name="quantity" value={form.quantity} onChange={handleFormChange} />
            </label>
            <label className="ws-input-group ws-inventory-field-wide">
              <span className="ws-label">Reference / size</span>
              <input className="ws-input" name="reference" value={form.reference} onChange={handleFormChange} placeholder="50 mm coarse thread" />
            </label>
            <label className="ws-input-group ws-inventory-field-full">
              <span className="ws-label">Notes</span>
              <textarea className="ws-input ws-inventory-notes" name="notes" value={form.notes} onChange={handleFormChange} placeholder="Where or how this supply is used" rows="2" />
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
          <span>No project supply requirements yet. Add them to see owned stock, planned purchases and gaps.</span>
        </div>
      ) : (
        <div className="ws-project-supply-list" aria-label="Project supply requirement matches">
          {check.rows.map(row => (
            <div className={`ws-inventory-match-row ${rowClass(row.status)}`} key={row.id}>
              <div className="ws-inventory-match-status" title={row.status}>
                <RowStatusIcon status={row.status} />
              </div>
              <div className="ws-inventory-match-main">
                <strong>{row.requirement?.name ?? 'Unnamed requirement'}</strong>
                <span>{requirementSummary(row)} · {optionLabel(SUPPLY_CATEGORIES, row.requirement?.category)}</span>
              </div>
              <div className="ws-inventory-match-result">
                <strong>{row.status === 'owned' ? 'Owned' : row.status === 'planned' ? 'Planned purchase' : row.status === 'partial' ? 'Partial' : row.status === 'needs-review' ? 'Needs review' : 'Missing'}</strong>
                <span>{rowResult(row)}</span>
              </div>
              <div className="ws-project-supply-row-actions">
                <button type="button" className="ws-btn ws-btn-icon" onClick={() => openEditForm(row.requirement)} title={`Edit ${row.requirement?.name ?? 'requirement'}`}>
                  <Pencil size={14} />
                </button>
                <button type="button" className="ws-btn ws-btn-icon ws-btn-danger" onClick={() => handleDelete(row.requirement)} title={`Remove ${row.requirement?.name ?? 'requirement'}`}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="ws-project-supply-note">
        Inventory is not consumed or reserved by this report. Different units and unmatched references remain visible for manual review.
      </div>
    </section>
  );
}
