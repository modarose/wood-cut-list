import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Ruler,
  Trash2,
  X,
} from 'lucide-react';
import {
  createMaterialStock,
  getAvailableQuantity,
  MATERIAL_CATEGORIES,
  MATERIAL_CONDITIONS,
  MATERIAL_SOURCES,
  matchMaterialStockToParts,
} from '../utils/materialInventory.js';

const EMPTY_FORM = {
  category: 'sheet-goods',
  name: '',
  species: '',
  length: '',
  width: '',
  thickness: '',
  usableLength: '',
  usableWidth: '',
  quantity: '1',
  condition: 'good',
  location: '',
  reservedQuantity: '0',
  source: 'owned',
  notes: '',
};

function formatMillimetres(value) {
  if (!Number.isFinite(value)) return '—';
  return `${value % 1 === 0 ? value : value.toFixed(1)} mm`;
}

function formatDimensions(material) {
  return [
    formatMillimetres(material.dimensions.length),
    formatMillimetres(material.dimensions.width),
    formatMillimetres(material.dimensions.thickness),
  ].join(' × ');
}

function optionLabel(options, value) {
  return options.find(option => option.value === value)?.label ?? value;
}

function toForm(material) {
  return {
    category: material.category,
    name: material.name,
    species: material.species ?? '',
    length: String(material.dimensions.length),
    width: String(material.dimensions.width),
    thickness: String(material.dimensions.thickness),
    usableLength: String(material.usableLength),
    usableWidth: String(material.usableWidth),
    quantity: String(material.quantity),
    condition: material.condition,
    location: material.location ?? '',
    reservedQuantity: String(material.reservedQuantity ?? 0),
    source: material.source,
    notes: material.notes ?? '',
  };
}

function StatusIcon({ status }) {
  if (status === 'potential') return <CheckCircle2 size={15} />;
  return <AlertTriangle size={15} />;
}

export default function MaterialInventory({
  materials,
  parts,
  unit,
  onSaveMaterial,
  onDeleteMaterial,
  onBack,
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');

  const materialCheck = useMemo(
    () => matchMaterialStockToParts(parts, unit, materials),
    [materials, parts, unit],
  );
  const availableMaterials = materials.filter(material => material.source === 'owned');
  const availableItems = availableMaterials.filter(material => getAvailableQuantity(material) > 0).length;
  const availableQuantity = materials.reduce(
    (sum, material) => sum + (material.source === 'owned' ? getAvailableQuantity(material) : 0),
    0,
  );

  const openNewForm = () => {
    setEditingMaterial(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setPageError('');
    setIsFormOpen(true);
  };

  const openEditForm = (material) => {
    setEditingMaterial(material);
    setForm(toForm(material));
    setFormError('');
    setPageError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingMaterial(null);
    setFormError('');
  };

  const handleFormChange = event => {
    const { name, value } = event.target;
    setForm(current => ({ ...current, [name]: value }));
    setFormError('');
  };

  const handleSubmit = event => {
    event.preventDefault();
    setPageError('');

    try {
      // Validate here so the form gets a useful message before the storage layer is called.
      createMaterialStock(form, {
        id: editingMaterial?.id,
        createdAt: editingMaterial?.createdAt,
      });
    } catch (error) {
      setFormError(error.message);
      return;
    }

    const result = onSaveMaterial(form, editingMaterial);
    if (!result.saved) {
      setFormError(result.error || 'The material could not be saved.');
      return;
    }

    closeForm();
  };

  const handleDelete = material => {
    if (!window.confirm(`Remove ${material.name} from material inventory?`)) return;

    const result = onDeleteMaterial(material);
    if (!result.saved) {
      setPageError(result.error || 'The material could not be removed.');
    }
  };

  return (
    <main className="ws-main">
      <div className="ws-content ws-inventory-content">
        <div className="ws-inventory-heading">
          <div>
            <div className="ws-page-eyebrow">BenchMate workshop</div>
            <h1 className="ws-page-title">Material inventory</h1>
            <p className="ws-page-copy">
              Record the boards, sheets and offcuts you actually have before planning purchases.
            </p>
          </div>
          <button type="button" className="ws-btn" onClick={onBack}>
            <ArrowLeft size={15} />
            Optimizer
          </button>
        </div>

        <div className="ws-inventory-toolbar">
          <div>
            <strong>{materials.length ? `${materials.length} inventory item${materials.length === 1 ? '' : 's'}` : 'No inventory recorded'}</strong>
            <span className="ws-inventory-toolbar-copy">Metric dimensions · stored locally in this browser</span>
          </div>
          <button type="button" className="ws-btn ws-btn-primary" onClick={openNewForm}>
            <Plus size={15} />
            Add material
          </button>
        </div>

        {pageError && <div className="ws-form-error" role="alert">{pageError}</div>}

        <div className="ws-metrics-grid ws-inventory-metrics">
          <div className="ws-metric-card">
            <div className="ws-metric-label"><Package size={13} /> Inventory items</div>
            <div className="ws-metric-value">{materials.length}</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><CheckCircle2 size={13} /> Available items</div>
            <div className="ws-metric-value">{availableItems}</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><Ruler size={13} /> Available quantity</div>
            <div className="ws-metric-value">{availableQuantity}<span className="ws-metric-unit"> items</span></div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><AlertTriangle size={13} /> Owned cut-list fit</div>
            <div className={`ws-metric-value${materialCheck.unmatchedPartTypes ? ' secondary' : ''}`}>
              {materialCheck.matchedPartTypes}<span className="ws-metric-unit"> / {materialCheck.totalPartTypes} types</span>
            </div>
          </div>
        </div>

        {isFormOpen && (
          <form className="ws-card ws-inventory-form" onSubmit={handleSubmit}>
            <div className="ws-card-header">
              <div className="ws-card-title">
                <Package size={17} />
                {editingMaterial ? 'Edit material' : 'Add material'}
              </div>
              <button type="button" className="ws-btn ws-btn-icon" onClick={closeForm} title="Close form">
                <X size={17} />
              </button>
            </div>
            <div className="ws-card-body">
              {formError && <div className="ws-form-error" role="alert">{formError}</div>}
              <div className="ws-inventory-form-grid">
                <label className="ws-input-group ws-inventory-field-wide">
                  <span className="ws-label">Material name</span>
                  <input className="ws-input" name="name" value={form.name} onChange={handleFormChange} placeholder="18 mm plywood" autoFocus />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Category</span>
                  <select className="ws-select" name="category" value={form.category} onChange={handleFormChange}>
                    {MATERIAL_CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Species / material</span>
                  <input className="ws-input" name="species" value={form.species} onChange={handleFormChange} placeholder="Birch plywood" />
                </label>

                <div className="ws-inventory-form-section-label ws-inventory-field-wide">Overall dimensions (mm)</div>
                <label className="ws-input-group">
                  <span className="ws-label">Length</span>
                  <input className="ws-input" type="number" min="0" step="0.1" name="length" value={form.length} onChange={handleFormChange} placeholder="2440" />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Width</span>
                  <input className="ws-input" type="number" min="0" step="0.1" name="width" value={form.width} onChange={handleFormChange} placeholder="1220" />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Thickness</span>
                  <input className="ws-input" type="number" min="0" step="0.1" name="thickness" value={form.thickness} onChange={handleFormChange} placeholder="18" />
                </label>

                <div className="ws-inventory-form-section-label ws-inventory-field-wide">Usable dimensions and quantity</div>
                <label className="ws-input-group">
                  <span className="ws-label">Usable length</span>
                  <input className="ws-input" type="number" min="0" step="0.1" name="usableLength" value={form.usableLength} onChange={handleFormChange} placeholder="2440" />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Usable width</span>
                  <input className="ws-input" type="number" min="0" step="0.1" name="usableWidth" value={form.usableWidth} onChange={handleFormChange} placeholder="1220" />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Quantity</span>
                  <input className="ws-input" type="number" min="0" step="1" name="quantity" value={form.quantity} onChange={handleFormChange} />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Reserved</span>
                  <input className="ws-input" type="number" min="0" step="1" name="reservedQuantity" value={form.reservedQuantity} onChange={handleFormChange} />
                </label>

                <label className="ws-input-group">
                  <span className="ws-label">Source</span>
                  <select className="ws-select" name="source" value={form.source} onChange={handleFormChange}>
                    {MATERIAL_SOURCES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Condition</span>
                  <select className="ws-select" name="condition" value={form.condition} onChange={handleFormChange}>
                    {MATERIAL_CONDITIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group ws-inventory-field-wide">
                  <span className="ws-label">Location</span>
                  <input className="ws-input" name="location" value={form.location} onChange={handleFormChange} placeholder="Garage rack A" />
                </label>
                <label className="ws-input-group ws-inventory-field-full">
                  <span className="ws-label">Notes</span>
                  <textarea className="ws-input ws-inventory-notes" name="notes" value={form.notes} onChange={handleFormChange} placeholder="Defects, grain notes or other workshop details" rows="3" />
                </label>
              </div>
              <div className="ws-inventory-form-actions">
                <button type="button" className="ws-btn" onClick={closeForm}>Cancel</button>
                <button type="submit" className="ws-btn ws-btn-primary">{editingMaterial ? 'Save changes' : 'Add to inventory'}</button>
              </div>
            </div>
          </form>
        )}

        <section className="ws-card">
          <div className="ws-card-header">
            <div className="ws-card-title"><Package size={17} /> Material records</div>
            <span className="ws-card-badge">Metric · mm</span>
          </div>
          <div className="ws-inventory-table-wrap">
            {materials.length === 0 ? (
              <div className="ws-inventory-empty">
                <Package size={28} />
                <strong>Your workshop inventory is empty.</strong>
                <span>Add a board, sheet or offcut to start checking project requirements.</span>
                <button type="button" className="ws-btn ws-btn-primary" onClick={openNewForm}><Plus size={15} /> Add first material</button>
              </div>
            ) : (
              <table className="ws-table ws-inventory-table">
                <thead>
                  <tr>
                    <th>Material</th>
                    <th>Dimensions</th>
                    <th>Quantity</th>
                    <th>Source</th>
                    <th>Location</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {materials.map(material => (
                    <tr key={material.id}>
                      <td>
                        <div className="ws-inventory-material-name">{material.name}</div>
                        <div className="ws-inventory-meta">
                          {optionLabel(MATERIAL_CATEGORIES, material.category)}
                          {material.species ? ` · ${material.species}` : ''}
                        </div>
                      </td>
                      <td>
                        <div>{formatDimensions(material)}</div>
                        <div className="ws-inventory-meta">usable {formatMillimetres(material.usableLength)} × {formatMillimetres(material.usableWidth)}</div>
                      </td>
                      <td>
                        <div className="ws-inventory-quantity">{getAvailableQuantity(material)} available</div>
                        <div className="ws-inventory-meta">{material.reservedQuantity} reserved · {material.quantity} total</div>
                      </td>
                      <td>
                        <div>{optionLabel(MATERIAL_SOURCES, material.source)}</div>
                        <div className="ws-inventory-meta">{optionLabel(MATERIAL_CONDITIONS, material.condition)}</div>
                      </td>
                      <td>
                        <div className="ws-inventory-location"><MapPin size={13} /> {material.location || 'No location'}</div>
                      </td>
                      <td>
                        <div className="ws-inventory-actions">
                          <button type="button" className="ws-btn ws-btn-icon" onClick={() => openEditForm(material)} title={`Edit ${material.name}`}><Pencil size={15} /></button>
                          <button type="button" className="ws-btn ws-btn-icon ws-btn-danger" onClick={() => handleDelete(material)} title={`Remove ${material.name}`}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="ws-card">
          <div className="ws-card-header">
            <div className="ws-card-title"><Ruler size={17} /> Current cut-list material check</div>
            <span className="ws-card-badge">Screening only</span>
          </div>
          <div className="ws-card-body">
            <p className="ws-inventory-note">
              This check looks for individual stock items with compatible dimensions and thickness. It does not allocate boards, reserve stock or replace WoodCut optimisation.
            </p>
            {materialCheck.rows.length === 0 ? (
              <div className="ws-inventory-empty ws-inventory-empty-compact">
                <span>Add parts in the Optimizer to see potential material matches.</span>
              </div>
            ) : (
              <div className="ws-inventory-match-list">
                {materialCheck.rows.map(row => (
                  <div className={`ws-inventory-match-row ${row.status}`} key={row.id}>
                    <div className="ws-inventory-match-status" title={row.status}>
                      <StatusIcon status={row.status} />
                    </div>
                    <div className="ws-inventory-match-main">
                      <strong>{row.name}</strong>
                      <span>{row.quantity} required · {formatMillimetres(row.dimensions.width)} × {formatMillimetres(row.dimensions.length)}{row.dimensions.thickness ? ` × ${formatMillimetres(row.dimensions.thickness)}` : ''}</span>
                    </div>
                    <div className="ws-inventory-match-result">
                      {row.status === 'potential' ? (
                        <span>Potential owned stock: {row.ownedCandidates.map(candidate => `${candidate.name} (${candidate.orientation})`).join(', ')}</span>
                      ) : row.status === 'planned' ? (
                        <span>Planned purchase candidate: {row.plannedCandidates.map(candidate => `${candidate.name} (${candidate.orientation})`).join(', ')}</span>
                      ) : (
                        <span>{row.reason}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
