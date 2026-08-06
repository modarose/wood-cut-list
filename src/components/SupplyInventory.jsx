import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  MapPin,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import InventoryModeSwitch from './InventoryModeSwitch';
import {
  createSupply,
  SUPPLY_CATEGORIES,
  SUPPLY_SOURCES,
  SUPPLY_UNITS,
} from '../utils/supplyInventory.js';

const EMPTY_FORM = {
  category: 'hardware',
  name: '',
  brand: '',
  reference: '',
  unit: 'each',
  quantity: '1',
  source: 'owned',
  location: '',
  notes: '',
  lastCheckedAt: '',
};

function optionLabel(options, value) {
  return options.find(option => option.value === value)?.label ?? value;
}

function toForm(supply) {
  return {
    category: supply.category,
    name: supply.name,
    brand: supply.brand ?? '',
    reference: supply.reference ?? '',
    unit: supply.unit,
    quantity: String(supply.quantity),
    source: supply.source,
    location: supply.location ?? '',
    notes: supply.notes ?? '',
    lastCheckedAt: supply.lastCheckedAt ?? '',
  };
}

function formatQuantity(value) {
  if (!Number.isFinite(value)) return '—';
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
}

export default function SupplyInventory({
  supplies,
  onSaveSupply,
  onDeleteSupply,
  onOpenMaterials,
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSupply, setEditingSupply] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('all');

  const filteredSupplies = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return supplies.filter(supply => {
      const searchable = [
        supply.name,
        supply.brand,
        supply.reference,
        supply.location,
        supply.notes,
      ].join(' ').toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesCategory = categoryFilter === 'all' || supply.category === categoryFilter;
      const matchesSource = sourceFilter === 'all' || supply.source === sourceFilter;
      return matchesQuery && matchesCategory && matchesSource;
    });
  }, [categoryFilter, query, sourceFilter, supplies]);

  const ownedCount = supplies.filter(supply => supply.source === 'owned').length;
  const plannedCount = supplies.filter(supply => supply.source === 'planned').length;
  const categoryCount = new Set(supplies.map(supply => supply.category)).size;

  const openNewForm = () => {
    setEditingSupply(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setPageError('');
    setIsFormOpen(true);
  };

  const openEditForm = supply => {
    setEditingSupply(supply);
    setForm(toForm(supply));
    setFormError('');
    setPageError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingSupply(null);
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
      createSupply(form, {
        id: editingSupply?.id,
        createdAt: editingSupply?.createdAt,
      });
    } catch (error) {
      setFormError(error.message);
      return;
    }

    const result = onSaveSupply(form, editingSupply);
    if (!result.saved) {
      setFormError(result.error || 'The supply could not be saved.');
      return;
    }

    closeForm();
  };

  const handleDelete = supply => {
    if (!window.confirm(`Remove ${supply.name} from supplies inventory?`)) return;
    const result = onDeleteSupply(supply);
    if (!result.saved) setPageError(result.error || 'The supply could not be removed.');
  };

  return (
    <main className="ws-main">
      <div className="ws-content ws-inventory-content">
        <div className="ws-inventory-heading">
          <div>
            <div className="ws-page-eyebrow">WoodCut Studio workshop</div>
            <h1 className="ws-page-title">Workshop supplies</h1>
            <p className="ws-page-copy">
              Track hardware, adhesives, finishes and abrasives without inventing prices or project requirements.
            </p>
          </div>
          <InventoryModeSwitch
            activeMode="supplies"
            onOpenMaterials={onOpenMaterials}
          />
        </div>

        <div className="ws-inventory-toolbar">
          <div>
            <strong>{supplies.length ? `${supplies.length} supply record${supplies.length === 1 ? '' : 's'}` : 'No supplies recorded'}</strong>
            <span className="ws-inventory-toolbar-copy">Quantities are stored with their selected unit in this browser</span>
          </div>
          <button type="button" className="ws-btn ws-btn-primary" onClick={openNewForm}>
            <Plus size={15} />
            Add supply
          </button>
        </div>

        {pageError && <div className="ws-form-error" role="alert">{pageError}</div>}

        <div className="ws-metrics-grid ws-inventory-metrics">
          <div className="ws-metric-card">
            <div className="ws-metric-label"><Package size={13} /> Supply records</div>
            <div className="ws-metric-value">{supplies.length}</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><CheckCircle2 size={13} /> Owned records</div>
            <div className="ws-metric-value">{ownedCount}</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><AlertTriangle size={13} /> Planned records</div>
            <div className={`ws-metric-value${plannedCount ? ' secondary' : ''}`}>{plannedCount}</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><Package size={13} /> Categories</div>
            <div className="ws-metric-value">{categoryCount}</div>
          </div>
        </div>

        {isFormOpen && (
          <form className="ws-card ws-inventory-form" onSubmit={handleSubmit}>
            <div className="ws-card-header">
              <div className="ws-card-title">
                <Package size={17} />
                {editingSupply ? 'Edit supply' : 'Add supply'}
              </div>
              <button type="button" className="ws-btn ws-btn-icon" onClick={closeForm} title="Close form">
                <X size={17} />
              </button>
            </div>
            <div className="ws-card-body">
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
                  <input className="ws-input" type="number" min="0" step="0.01" name="quantity" value={form.quantity} onChange={handleFormChange} />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Source</span>
                  <select className="ws-select" name="source" value={form.source} onChange={handleFormChange}>
                    {SUPPLY_SOURCES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Brand</span>
                  <input className="ws-input" name="brand" value={form.brand} onChange={handleFormChange} placeholder="Kreg" />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Reference / size</span>
                  <input className="ws-input" name="reference" value={form.reference} onChange={handleFormChange} placeholder="50 mm coarse thread" />
                </label>
                <label className="ws-input-group ws-inventory-field-wide">
                  <span className="ws-label">Location</span>
                  <input className="ws-input" name="location" value={form.location} onChange={handleFormChange} placeholder="Hardware drawer 2" />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Last checked</span>
                  <input className="ws-input" type="date" name="lastCheckedAt" value={form.lastCheckedAt} onChange={handleFormChange} />
                </label>
                <label className="ws-input-group ws-inventory-field-full">
                  <span className="ws-label">Notes</span>
                  <textarea className="ws-input ws-inventory-notes" name="notes" value={form.notes} onChange={handleFormChange} placeholder="Finish colour, grit, compatibility or other workshop details" rows="3" />
                </label>
              </div>
              <div className="ws-inventory-form-actions">
                <button type="button" className="ws-btn" onClick={closeForm}>Cancel</button>
                <button type="submit" className="ws-btn ws-btn-primary">{editingSupply ? 'Save changes' : 'Add to inventory'}</button>
              </div>
            </div>
          </form>
        )}

        <section className="ws-card">
          <div className="ws-card-header">
            <div className="ws-card-title"><Package size={17} /> Supplies records</div>
            <span className="ws-card-badge">No pricing yet</span>
          </div>
          <div className="ws-tool-filter-bar ws-supply-filter-bar">
            <label className="ws-tool-search">
              <Search size={15} />
              <input className="ws-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search supplies, brands or references" aria-label="Search supplies" />
            </label>
            <select className="ws-select" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="Filter by supply category">
              <option value="all">All categories</option>
              {SUPPLY_CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className="ws-select" value={sourceFilter} onChange={event => setSourceFilter(event.target.value)} aria-label="Filter by supply source">
              <option value="all">All sources</option>
              {SUPPLY_SOURCES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="ws-inventory-table-wrap">
            {supplies.length === 0 ? (
              <div className="ws-inventory-empty">
                <Package size={28} />
                <strong>Your supplies inventory is empty.</strong>
                <span>Add hardware, glue, finish or abrasives when you know what you have.</span>
                <button type="button" className="ws-btn ws-btn-primary" onClick={openNewForm}><Plus size={15} /> Add first supply</button>
              </div>
            ) : filteredSupplies.length === 0 ? (
              <div className="ws-inventory-empty ws-inventory-empty-compact">
                <span>No supplies match the current filters.</span>
              </div>
            ) : (
              <table className="ws-table ws-inventory-table ws-supply-table">
                <thead>
                  <tr>
                    <th>Supply</th>
                    <th>Category</th>
                    <th>Quantity</th>
                    <th>Source</th>
                    <th>Location</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredSupplies.map(supply => (
                    <tr key={supply.id}>
                      <td>
                        <div className="ws-inventory-material-name">{supply.name}</div>
                        <div className="ws-inventory-meta">{[supply.brand, supply.reference].filter(Boolean).join(' · ') || 'No reference recorded'}</div>
                      </td>
                      <td>{optionLabel(SUPPLY_CATEGORIES, supply.category)}</td>
                      <td>
                        <div className="ws-inventory-quantity">{formatQuantity(supply.quantity)} {optionLabel(SUPPLY_UNITS, supply.unit).toLowerCase()}</div>
                        <div className="ws-inventory-meta">{supply.lastCheckedAt ? `Checked ${supply.lastCheckedAt}` : 'Not checked'}</div>
                      </td>
                      <td>{optionLabel(SUPPLY_SOURCES, supply.source)}</td>
                      <td>
                        <div className="ws-inventory-location"><MapPin size={13} /> {supply.location || 'No location'}</div>
                      </td>
                      <td>
                        <div className="ws-inventory-actions">
                          <button type="button" className="ws-btn ws-btn-icon" onClick={() => openEditForm(supply)} title={`Edit ${supply.name}`}><Pencil size={15} /></button>
                          <button type="button" className="ws-btn ws-btn-icon ws-btn-danger" onClick={() => handleDelete(supply)} title={`Remove ${supply.name}`}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <div className="ws-tool-safety-note">
          <AlertTriangle size={15} />
          Supply records are planning data only. Prices, product availability and project requirements will be added in later slices.
        </div>
      </div>
    </main>
  );
}
