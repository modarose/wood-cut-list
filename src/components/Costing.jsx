import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Calculator,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Plus,
  ReceiptText,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import ActionMenu from './ActionMenu';
import {
  COST_ITEM_CATEGORIES,
  COST_ITEM_STATUSES,
  COST_ITEM_UNITS,
  createCostItem,
  formatAud,
  formatCostItemQuantity,
  getCostingStatusMessage,
  getCostingSummary,
  updateCostItem,
} from '../utils/costing.js';

const EMPTY_FORM = {
  name: '',
  category: 'sheet-goods',
  quantity: '1',
  unit: 'each',
  status: 'planned',
  unitCost: '',
  supplier: '',
  productReference: '',
  url: '',
  checkedAt: '',
  notes: '',
};

function optionLabel(options, value) {
  return options.find(option => option.value === value)?.label ?? value;
}

function toForm(item) {
  return {
    name: item.name,
    category: item.category,
    quantity: String(item.quantity),
    unit: item.unit,
    status: item.status,
    unitCost: item.unitCost === null ? '' : String(item.unitCost),
    supplier: item.supplier ?? '',
    productReference: item.productReference ?? '',
    url: item.url ?? '',
    checkedAt: item.checkedAt ? item.checkedAt.slice(0, 10) : '',
    notes: item.notes ?? '',
  };
}

function formatDate(value) {
  if (!value) return 'Not checked';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Invalid date' : date.toLocaleDateString('en-AU');
}

function statusClass(status) {
  return 'ws-cost-status ' + status;
}

function statusIcon(status) {
  if (status === 'estimated') return <CheckCircle2 size={16} />;
  if (status === 'not-started') return <Calculator size={16} />;
  return <AlertTriangle size={16} />;
}

function statusText(status) {
  if (status === 'owned') return 'Owned';
  if (status === 'planned') return 'Planned';
  return 'Needs sourcing';
}

function buildPayload(form) {
  return {
    ...form,
    quantity: form.quantity === '' ? null : Number(form.quantity),
    unitCost: form.unitCost === '' ? null : Number(form.unitCost),
    checkedAt: form.checkedAt || null,
  };
}

export default function Costing({
  projectId,
  projectName,
  costItems,
  onChange,
  onBack,
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');

  const summary = useMemo(() => getCostingSummary(costItems), [costItems]);

  const openNewForm = () => {
    setEditingItem(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = item => {
    setEditingItem(item);
    setForm(toForm(item));
    setFormError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingItem(null);
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
      const payload = buildPayload(form);
      const nextItem = editingItem
        ? updateCostItem(editingItem, payload, { projectId })
        : createCostItem(payload, { projectId });
      const nextItems = editingItem
        ? costItems.map(item => (item.id === editingItem.id ? nextItem : item))
        : [...costItems, nextItem];
      onChange(nextItems);
      closeForm();
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleDelete = item => {
    if (!item?.id) return;
    if (!window.confirm('Remove ' + (item.name || 'this cost item') + ' from this project estimate?')) return;
    onChange(costItems.filter(candidate => candidate.id !== item.id));
  };

  return (
    <main className="ws-main">
      <div className="ws-content ws-cost-content">
        <div className="ws-cost-heading">
          <div>
            <div className="ws-page-eyebrow">BenchMate project costs</div>
            <h1 className="ws-page-title">Costing</h1>
            <p className="ws-page-copy">
              Keep a transparent manual estimate for {projectName || 'this project'}.
              Prices are snapshots, not live supplier availability.
            </p>
          </div>
          <ActionMenu
            ariaLabel="Costing actions"
            items={[
              { key: 'optimizer', label: 'Optimizer', icon: ArrowLeft, onClick: onBack },
            ]}
          />
        </div>

        <div className="ws-cost-toolbar">
          <div>
            <strong>
              {summary.totalItems
                ? summary.totalItems + ' cost item' + (summary.totalItems === 1 ? '' : 's')
                : 'No cost items recorded'}
            </strong>
            <span className="ws-inventory-toolbar-copy">
              Add confirmed owned stock and planned purchases to this project
            </span>
          </div>
          <button type="button" className="ws-btn ws-btn-primary" onClick={openNewForm}>
            <Plus size={15} />
            Add cost item
          </button>
        </div>

        <div className="ws-metrics-grid ws-cost-metrics">
          <div className="ws-metric-card">
            <div className="ws-metric-label"><ShoppingCart size={13} /> Purchase estimate</div>
            <div className="ws-metric-value">{formatAud(summary.purchaseTotal)}</div>
            <div className="ws-cost-metric-note">{summary.shoppingItems} item{summary.shoppingItems === 1 ? '' : 's'} to buy</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><CheckCircle2 size={13} /> Owned value</div>
            <div className="ws-metric-value">{formatAud(summary.ownedValue)}</div>
            <div className="ws-cost-metric-note">{summary.ownedItems} owned item{summary.ownedItems === 1 ? '' : 's'}</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><ReceiptText size={13} /> Estimated total</div>
            <div className="ws-metric-value">{formatAud(summary.estimatedTotal)}</div>
            <div className="ws-cost-metric-note">Owned value plus purchases</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><AlertTriangle size={13} /> Price review</div>
            <div className={'ws-metric-value' + (summary.unknownPriceCount ? ' secondary' : '')}>
              {summary.unknownPriceCount}
            </div>
            <div className="ws-cost-metric-note">Shopping item{summary.unknownPriceCount === 1 ? '' : 's'} without price</div>
          </div>
        </div>

        <div className={'ws-cost-status-banner ' + summary.status}>
          {statusIcon(summary.status)}
          <div>
            <strong>{summary.statusLabel}</strong>
            <span>{getCostingStatusMessage(summary)}</span>
          </div>
        </div>

        {isFormOpen && (
          <form className="ws-card ws-cost-form" onSubmit={handleSubmit}>
            <div className="ws-card-header">
              <div className="ws-card-title">
                <Calculator size={17} />
                {editingItem ? 'Edit cost item' : 'Add cost item'}
              </div>
              <button type="button" className="ws-btn ws-btn-icon" onClick={closeForm} title="Close form">
                <X size={17} />
              </button>
            </div>
            <div className="ws-card-body">
              {formError && <div className="ws-form-error" role="alert">{formError}</div>}
              <div className="ws-cost-form-grid">
                <label className="ws-input-group ws-cost-field-wide">
                  <span className="ws-label">Item name</span>
                  <input className="ws-input" name="name" value={form.name} onChange={handleFormChange} placeholder="18 mm plywood sheet" autoFocus />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Category</span>
                  <select className="ws-select" name="category" value={form.category} onChange={handleFormChange}>
                    {COST_ITEM_CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Status</span>
                  <select className="ws-select" name="status" value={form.status} onChange={handleFormChange}>
                    {COST_ITEM_STATUSES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Quantity</span>
                  <input className="ws-input" type="number" min="0" step="0.01" name="quantity" value={form.quantity} onChange={handleFormChange} />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Unit</span>
                  <select className="ws-select" name="unit" value={form.unit} onChange={handleFormChange}>
                    {COST_ITEM_UNITS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Unit cost (AUD)</span>
                  <input className="ws-input" type="number" min="0" step="0.01" name="unitCost" value={form.unitCost} onChange={handleFormChange} placeholder="Optional" />
                </label>
                <label className="ws-input-group ws-cost-field-wide">
                  <span className="ws-label">Supplier</span>
                  <input className="ws-input" name="supplier" value={form.supplier} onChange={handleFormChange} placeholder="Supplier or store" />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Product reference</span>
                  <input className="ws-input" name="productReference" value={form.productReference} onChange={handleFormChange} placeholder="SKU or model" />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Checked at</span>
                  <input className="ws-input" type="date" name="checkedAt" value={form.checkedAt} onChange={handleFormChange} />
                </label>
                <label className="ws-input-group ws-cost-field-wide">
                  <span className="ws-label">Product URL</span>
                  <input className="ws-input" type="url" name="url" value={form.url} onChange={handleFormChange} placeholder="https://" />
                </label>
                <label className="ws-input-group ws-cost-field-full">
                  <span className="ws-label">Notes</span>
                  <textarea className="ws-input ws-cost-notes" name="notes" rows="3" value={form.notes} onChange={handleFormChange} placeholder="Record dimensions, finish, pack size or assumptions" />
                </label>
              </div>
              <div className="ws-cost-form-actions">
                <button type="button" className="ws-btn" onClick={closeForm}>Cancel</button>
                <button type="submit" className="ws-btn ws-btn-primary">
                  {editingItem ? 'Save changes' : 'Add cost item'}
                </button>
              </div>
            </div>
          </form>
        )}

        <section className="ws-card">
          <div className="ws-card-header">
            <div className="ws-card-title"><ReceiptText size={17} /> Project cost items</div>
            <span className="ws-card-badge">{summary.totalItems} records</span>
          </div>
          {summary.rows.length ? (
            <div className="ws-cost-table-wrap">
              <table className="ws-table ws-cost-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Supplier</th>
                    <th>Unit cost</th>
                    <th>Line total</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {summary.rows.map(row => {
                    const item = row.item;
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="ws-cost-item-name">{item?.name || 'Invalid cost item'}</div>
                          <div className={row.valid ? 'ws-inventory-meta' : 'ws-cost-invalid'}>
                            {row.valid ? optionLabel(COST_ITEM_CATEGORIES, item.category) : row.reason}
                          </div>
                        </td>
                        <td>{row.valid ? formatCostItemQuantity(item) : '—'}</td>
                        <td>
                          {row.valid && <span className={statusClass(item.status)}>{statusText(item.status)}</span>}
                        </td>
                        <td>{item?.supplier || '—'}</td>
                        <td>{row.valid && item.unitCost !== null ? formatAud(item.unitCost) : 'TBC'}</td>
                        <td>{row.lineTotal !== null ? formatAud(row.lineTotal) : 'TBC'}</td>
                        <td>
                          <div className="ws-inventory-actions">
                            {row.valid && (
                              <button type="button" className="ws-btn ws-btn-icon" onClick={() => openEditForm(item)} title="Edit cost item">
                                <Pencil size={15} />
                              </button>
                            )}
                            <button type="button" className="ws-btn ws-btn-icon ws-btn-danger" onClick={() => handleDelete(item)} title="Remove cost item">
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ws-inventory-empty">
              <ReceiptText size={30} />
              <strong>No project cost items yet</strong>
              <span>Add material, hardware, finish or consumable records to start the estimate.</span>
              <button type="button" className="ws-btn ws-btn-primary" onClick={openNewForm}>
                <Plus size={15} />
                Add first item
              </button>
            </div>
          )}
        </section>

        <section className="ws-card ws-shopping-list-card">
          <div className="ws-card-header">
            <div className="ws-card-title"><ShoppingCart size={17} /> Shopping list</div>
            <span className="ws-card-badge">{summary.shoppingItems} items</span>
          </div>
          {summary.shoppingRows.length ? (
            <div className="ws-cost-table-wrap">
              <table className="ws-table ws-cost-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Quantity</th>
                    <th>Supplier</th>
                    <th>Checked</th>
                    <th>Estimate</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {summary.shoppingRows.map(row => (
                    <tr key={'shopping-' + row.id}>
                      <td>
                        <div className="ws-cost-item-name">{row.item.name}</div>
                        <div className="ws-inventory-meta">{optionLabel(COST_ITEM_CATEGORIES, row.item.category)}</div>
                      </td>
                      <td>{formatCostItemQuantity(row.item)}</td>
                      <td>{row.item.supplier || 'Supplier not recorded'}</td>
                      <td>{formatDate(row.item.checkedAt)}</td>
                      <td>{row.lineTotal !== null ? formatAud(row.lineTotal) : 'TBC'}</td>
                      <td>
                        {row.item.url && (
                          <a className="ws-btn ws-btn-icon" href={row.item.url} target="_blank" rel="noreferrer" title="Open product link">
                            <ExternalLink size={15} />
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="ws-inventory-empty ws-inventory-empty-compact">
              <span>No planned purchases yet. Owned records stay out of this shopping list.</span>
            </div>
          )}
        </section>

        <p className="ws-cost-boundary">
          Costing is a manual project estimate in AUD. It does not fetch live supplier prices,
          confirm availability or replace the cut optimiser and inventory quantity checks.
          Project {projectId} keeps these records with its saved revisions.
        </p>
      </div>
    </main>
  );
}
