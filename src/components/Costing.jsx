import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calculator,
  CheckCircle2,
  Download,
  ExternalLink,
  Link2,
  PackagePlus,
  Pencil,
  Plus,
  Printer,
  ReceiptText,
  Save,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import PageActions from './PageActions';
import {
  COST_ITEM_CATEGORIES,
  COST_ITEM_STATUSES,
  COST_ITEM_UNITS,
  canCreateSupplyInventoryRecord,
  buildCostingCsv,
  createCostItem,
  formatAud,
  formatCostItemQuantity,
  getCostItemInventoryCandidates,
  getCostItemInventoryStatus,
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

function getLinkedInventory(link, materials, supplies) {
  if (!link?.type || !link.id) return null;
  const records = link.type === 'material' ? materials : supplies;
  const record = records.find(candidate => candidate.id === link.id) ?? null;
  return {
    typeLabel: link.type === 'material' ? 'Material inventory' : 'Supplies inventory',
    record,
  };
}

function inventoryRecordMeta(type, record) {
  if (!record) return 'Record unavailable';
  if (type === 'material') {
    const available = Math.max(0, (record.quantity ?? 0) - (record.reservedQuantity ?? 0));
    return (record.quantity ?? 0) + ' owned · ' + available + ' available';
  }
  return (record.quantity ?? 0) + ' ' + record.unit + ' · '
    + (record.source === 'owned' ? 'Owned' : 'Planned purchase');
}

function fileSegment(value, fallback) {
  const segment = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return segment || fallback;
}

function CostingPrintReport({ projectName, summary }) {
  return (
    <div className="print-only print-report ws-cost-print-report">
      <section className="print-page print-cost-page">
        <div className="print-report-kicker">BENCHMATE · COST REPORT</div>
        <h1>Project cost estimate</h1>
        <p className="print-report-subtitle">
          {projectName || 'Untitled project'} &middot; AUD &middot; generated from the current manual estimate
        </p>

        <div className="print-summary-grid">
          <div><span>PURCHASE ESTIMATE</span><strong>{formatAud(summary.purchaseTotal)}</strong></div>
          <div><span>OWNED VALUE</span><strong>{formatAud(summary.ownedValue)}</strong></div>
          <div><span>ESTIMATED TOTAL</span><strong>{formatAud(summary.estimatedTotal)}</strong></div>
          <div><span>PRICE REVIEW</span><strong>{summary.unknownPriceCount}</strong></div>
        </div>

        <h2>Project cost items</h2>
        <table className="print-parts-table print-cost-table">
          <thead>
            <tr>
              <th>Item</th>
              <th>Category</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Supplier</th>
              <th>Unit cost</th>
              <th>Line total</th>
            </tr>
          </thead>
          <tbody>
            {summary.rows.length === 0 && (
              <tr><td colSpan="7">No cost items recorded.</td></tr>
            )}
            {summary.rows.map(row => {
              const item = row.item ?? {};
              return (
                <tr key={'print-cost-' + row.id} className={row.valid ? '' : 'print-cost-invalid-row'}>
                  <td>
                    <div>{item.name || 'Invalid cost item'}</div>
                    {row.valid && item.productReference && (
                      <div className="print-cost-reference">Ref: {item.productReference}</div>
                    )}
                    {!row.valid && <div className="print-cost-review-note">{row.reason}</div>}
                  </td>
                  <td>{row.valid ? optionLabel(COST_ITEM_CATEGORIES, item.category) : 'Review'}</td>
                  <td className="print-nowrap">{row.valid ? formatCostItemQuantity(item) : '—'}</td>
                  <td>{row.valid ? statusText(item.status) : 'Review'}</td>
                  <td>{row.valid ? (item.supplier || 'Not recorded') : '—'}</td>
                  <td className="print-nowrap">{row.valid && item.unitCost !== null ? formatAud(item.unitCost) : 'TBC'}</td>
                  <td className="print-nowrap">{row.valid && row.lineTotal !== null ? formatAud(row.lineTotal) : 'TBC'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {summary.status !== 'estimated' && (
          <p className="print-warning">{summary.statusLabel}: {getCostingStatusMessage(summary)}</p>
        )}
        {summary.shoppingRows.length === 0 && (
          <p className="print-cost-note">No planned purchases or items needing sourcing are currently recorded.</p>
        )}
      </section>

      {summary.shoppingRows.length > 0 && (
        <section className="print-page print-cost-page print-cost-shopping">
          <div className="print-report-kicker">SHOPPING LIST</div>
          <h1>Items to buy</h1>
          <p className="print-report-subtitle">
            {summary.shoppingItems} item{summary.shoppingItems === 1 ? '' : 's'} &middot; excludes owned inventory records
          </p>

          <table className="print-parts-table print-cost-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th>Quantity</th>
                <th>Supplier / reference</th>
                <th>Checked</th>
                <th>Estimate</th>
              </tr>
            </thead>
            <tbody>
              {summary.shoppingRows.map(row => (
                <tr key={'print-shopping-' + row.id}>
                  <td>{row.item.name}</td>
                  <td>{optionLabel(COST_ITEM_CATEGORIES, row.item.category)}</td>
                  <td className="print-nowrap">{formatCostItemQuantity(row.item)}</td>
                  <td>
                    <div>{row.item.supplier || 'Supplier not recorded'}</div>
                    {row.item.productReference && (
                      <div className="print-cost-reference">{row.item.productReference}</div>
                    )}
                    {row.item.url && <div className="print-cost-url">{row.item.url}</div>}
                  </td>
                  <td className="print-nowrap">{formatDate(row.item.checkedAt)}</td>
                  <td className="print-nowrap">{row.lineTotal !== null ? formatAud(row.lineTotal) : 'TBC'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="print-cost-total">
            <span>Purchase estimate</span>
            <strong>{formatAud(summary.purchaseTotal)}</strong>
          </div>
        </section>
      )}
    </div>
  );
}

export default function Costing({
  projectId,
  projectName,
  costItems,
  materials = [],
  supplies = [],
  onChange,
  onSaveProject,
  isDirty,
  onCreateSupply,
  onOpenInventory,
  onPrint,
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [formError, setFormError] = useState('');
  const [linkingItem, setLinkingItem] = useState(null);
  const [linkError, setLinkError] = useState('');

  const summary = useMemo(() => getCostingSummary(costItems), [costItems]);
  const inventoryCandidates = useMemo(
    () => getCostItemInventoryCandidates(linkingItem, materials, supplies),
    [linkingItem, materials, supplies],
  );
  const editingLinkedStatus = editingItem
    ? getCostItemInventoryStatus(editingItem.inventoryLink, materials, supplies)
    : null;
  const linkingInventoryStatus = linkingItem
    ? getCostItemInventoryStatus(linkingItem.inventoryLink, materials, supplies)
    : null;
  const linkingStatusMismatch = Boolean(
    linkingInventoryStatus && linkingInventoryStatus !== linkingItem?.status,
  );

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

  const openInventoryLink = item => {
    setLinkingItem(item);
    setLinkError('');
  };

  const closeInventoryLink = () => {
    setLinkingItem(null);
    setLinkError('');
  };

  const saveInventoryLink = (item, inventoryLink) => {
    try {
      const linkedStatus = getCostItemInventoryStatus(inventoryLink, materials, supplies);
      const nextItem = updateCostItem(item, {
        inventoryLink,
        ...(linkedStatus ? { status: linkedStatus } : {}),
      }, { projectId });
      onChange(costItems.map(candidate => (
        candidate.id === item.id ? nextItem : candidate
      )));
      closeInventoryLink();
    } catch (error) {
      setLinkError(error.message);
    }
  };

  const handleCreateSupply = () => {
    if (!linkingItem || !onCreateSupply) return;
    const result = onCreateSupply(linkingItem);
    if (!result.saved) {
      setLinkError(result.error || 'The supply could not be added to inventory.');
      return;
    }
    if (result.inventoryLink) {
      saveInventoryLink(linkingItem, result.inventoryLink);
    }
  };

  const handleUnlink = item => {
    saveInventoryLink(item, null);
  };

  const adoptInventoryStatus = item => {
    const linkedStatus = getCostItemInventoryStatus(item.inventoryLink, materials, supplies);
    if (!linkedStatus || linkedStatus === item.status) return;
    saveInventoryLink(item, item.inventoryLink);
  };

  const handleExportCsv = () => {
    const csv = buildCostingCsv(summary);
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileSegment(projectName || projectId, 'benchmate-project') + '-costing.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <main className="ws-main">
      <div className="ws-content ws-cost-content no-print">
        <div className="ws-cost-heading">
          <div>
            <div className="ws-page-eyebrow">WoodCut Studio project costs</div>
            <h1 className="ws-page-title">Costing</h1>
            <p className="ws-page-copy">
              Keep a transparent manual estimate for {projectName || 'this project'}.
              Prices are snapshots, not live supplier availability.
            </p>
          </div>
          <PageActions
            ariaLabel="Costing actions"
            visible={[
              {
                key: 'save',
                label: 'Save changes',
                icon: Save,
                onClick: onSaveProject,
                title: isDirty ? 'Save project' : 'Project is already saved',
                disabled: !isDirty,
                variant: 'primary',
              },
              { key: 'csv', label: 'Export CSV', icon: Download, onClick: handleExportCsv },
              { key: 'print', label: 'Print / PDF', icon: Printer, onClick: onPrint },
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
                  {editingLinkedStatus && form.status !== editingLinkedStatus && (
                    <span className="ws-cost-status-warning">
                      This override differs from the linked Inventory source ({optionLabel(COST_ITEM_STATUSES, editingLinkedStatus)}).
                    </span>
                  )}
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

        {linkingItem && (
          <section className="ws-card ws-cost-link-panel">
            <div className="ws-card-header">
              <div className="ws-card-title">
                <Link2 size={17} />
                Link inventory record
              </div>
              <button type="button" className="ws-btn ws-btn-icon" onClick={closeInventoryLink} title="Close inventory linking">
                <X size={17} />
              </button>
            </div>
            <div className="ws-card-body">
              <p className="ws-cost-link-copy">
                Choose an existing inventory record for <strong>{linkingItem.name}</strong>.
                The cost snapshot remains attached to this project.
              </p>
              {linkError && <div className="ws-form-error" role="alert">{linkError}</div>}
              {linkingStatusMismatch && (
                <div className="ws-cost-link-status">
                  <AlertTriangle size={15} />
                  <span>
                    Costing is {statusText(linkingItem.status)} while the linked Inventory source is {statusText(linkingInventoryStatus)}.
                  </span>
                </div>
              )}

              {inventoryCandidates.materials.length > 0 && (
                <div className="ws-cost-inventory-group">
                  <div className="ws-cost-inventory-group-label">Material inventory</div>
                  {inventoryCandidates.materials.map(record => (
                    <button
                      type="button"
                      className="ws-cost-inventory-option"
                      key={record.id}
                      onClick={() => saveInventoryLink(linkingItem, { type: 'material', id: record.id })}
                    >
                      <span>
                        <strong>{record.name}</strong>
                        <small>{inventoryRecordMeta('material', record)}</small>
                      </span>
                      <Link2 size={15} />
                    </button>
                  ))}
                </div>
              )}

              {inventoryCandidates.supplies.length > 0 && (
                <div className="ws-cost-inventory-group">
                  <div className="ws-cost-inventory-group-label">Supplies inventory</div>
                  {inventoryCandidates.supplies.map(record => (
                    <button
                      type="button"
                      className="ws-cost-inventory-option"
                      key={record.id}
                      onClick={() => saveInventoryLink(linkingItem, { type: 'supply', id: record.id })}
                    >
                      <span>
                        <strong>{record.name}</strong>
                        <small>{inventoryRecordMeta('supply', record)}</small>
                      </span>
                      <Link2 size={15} />
                    </button>
                  ))}
                </div>
              )}

              {inventoryCandidates.materials.length === 0
                && inventoryCandidates.supplies.length === 0 && (
                  <div className="ws-cost-link-empty">
                    No compatible inventory record is available yet.
                    Materials must be created in Inventory with dimensions before they can be linked.
                  </div>
                )}

              <div className="ws-cost-link-actions">
                {linkingStatusMismatch && (
                  <button
                    type="button"
                    className="ws-btn ws-btn-primary"
                    onClick={() => saveInventoryLink(linkingItem, linkingItem.inventoryLink)}
                  >
                    <CheckCircle2 size={15} />
                    Adopt Inventory status
                  </button>
                )}
                {linkingItem.inventoryLink && (
                  <button type="button" className="ws-btn ws-btn-danger" onClick={() => handleUnlink(linkingItem)}>
                    Unlink record
                  </button>
                )}
                {canCreateSupplyInventoryRecord(linkingItem) && onCreateSupply && (
                  <button type="button" className="ws-btn" onClick={handleCreateSupply}>
                    <PackagePlus size={15} />
                    Add to supplies
                  </button>
                )}
                {onOpenInventory && (
                  <button type="button" className="ws-btn" onClick={onOpenInventory}>
                    Open Inventory
                  </button>
                )}
                <button type="button" className="ws-btn" onClick={closeInventoryLink}>Cancel</button>
              </div>
            </div>
          </section>
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
                    const linkedStatusForRow = row.valid
                      ? getCostItemInventoryStatus(item.inventoryLink, materials, supplies)
                      : null;
                    const rowStatusMismatch = Boolean(linkedStatusForRow && linkedStatusForRow !== item.status);
                    return (
                      <tr key={row.id}>
                        <td>
                          <div className="ws-cost-item-name">{item?.name || 'Invalid cost item'}</div>
                          <div className={row.valid ? 'ws-inventory-meta' : 'ws-cost-invalid'}>
                            {row.valid ? optionLabel(COST_ITEM_CATEGORIES, item.category) : row.reason}
                          </div>
                          {row.valid && (() => {
                            const linkedInventory = getLinkedInventory(item.inventoryLink, materials, supplies);
                            const linkedStatus = getCostItemInventoryStatus(item.inventoryLink, materials, supplies);
                            const statusMismatch = linkedStatus && linkedStatus !== item.status;
                            return (
                              <div className={'ws-cost-inventory-link'
                                + (linkedInventory?.record ? '' : ' unavailable')
                                + (statusMismatch ? ' mismatch' : '')}>
                                <Link2 size={12} />
                                {linkedInventory?.record
                                  ? linkedInventory.typeLabel + ': ' + linkedInventory.record.name
                                    + (statusMismatch ? ' · status differs' : '')
                                  : item.inventoryLink
                                    ? 'Inventory record unavailable'
                                    : 'Not linked to inventory'}
                              </div>
                            );
                          })()}
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
                            {rowStatusMismatch && (
                              <button
                                type="button"
                                className="ws-btn ws-btn-icon"
                                onClick={() => adoptInventoryStatus(item)}
                                title={'Adopt linked Inventory status: ' + statusText(linkedStatusForRow)}
                              >
                                <CheckCircle2 size={15} />
                              </button>
                            )}
                            {row.valid && (
                              <button
                                type="button"
                                className="ws-btn ws-btn-icon"
                                onClick={() => openInventoryLink(item)}
                                title={item.inventoryLink ? 'Change inventory link' : 'Link to inventory'}
                              >
                                <Link2 size={15} />
                              </button>
                            )}
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
      <CostingPrintReport projectName={projectName} summary={summary} />
    </main>
  );
}
