export const COST_ITEM_CATEGORIES = Object.freeze([
  { value: 'sheet-goods', label: 'Sheet goods' },
  { value: 'solid-timber', label: 'Solid timber' },
  { value: 'hardware', label: 'Hardware' },
  { value: 'adhesive', label: 'Adhesive' },
  { value: 'finish', label: 'Finish' },
  { value: 'abrasive', label: 'Abrasive' },
  { value: 'consumable', label: 'Consumable' },
  { value: 'other', label: 'Other' },
]);

export const COST_ITEM_UNITS = Object.freeze([
  { value: 'each', label: 'Each' },
  { value: 'sheet', label: 'Sheet' },
  { value: 'pack', label: 'Pack' },
  { value: 'box', label: 'Box' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'tin', label: 'Tin' },
  { value: 'tube', label: 'Tube' },
  { value: 'metre', label: 'Metre' },
  { value: 'square-metre', label: 'Square metre' },
  { value: 'litre', label: 'Litre' },
  { value: 'kilogram', label: 'Kilogram' },
  { value: 'other', label: 'Other' },
]);

export const COST_ITEM_STATUSES = Object.freeze([
  { value: 'owned', label: 'Owned' },
  { value: 'planned', label: 'Planned purchase' },
  { value: 'missing', label: 'Needs sourcing' },
]);

export const COST_ITEM_INVENTORY_TYPES = Object.freeze([
  { value: 'material', label: 'Material inventory' },
  { value: 'supply', label: 'Supplies inventory' },
]);

const VALID_CATEGORIES = new Set(COST_ITEM_CATEGORIES.map(option => option.value));
const VALID_UNITS = new Set(COST_ITEM_UNITS.map(option => option.value));
const VALID_STATUSES = new Set(COST_ITEM_STATUSES.map(option => option.value));
const VALID_INVENTORY_TYPES = new Set(COST_ITEM_INVENTORY_TYPES.map(option => option.value));
const MATERIAL_COST_CATEGORIES = new Set(['sheet-goods', 'solid-timber']);
const SUPPLY_COST_CATEGORIES = new Set(['hardware', 'adhesive', 'finish', 'abrasive', 'consumable']);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function readDate(value) {
  const date = readText(value);
  return date || null;
}

function countLabel(value, singular, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function normalizeInventoryLink(value) {
  if (value === undefined || value === null || value === '') return null;
  if (!isObject(value)) return value;
  return {
    type: readText(value.type),
    id: readText(value.id),
  };
}

export function createCostItemId() {
  if (globalThis.crypto?.randomUUID) {
    return `cost_item_${globalThis.crypto.randomUUID()}`;
  }

  return `cost_item_${Date.now()}`;
}

export function validateCostItem(item) {
  const errors = [];

  if (!isObject(item)) return { valid: false, errors: ['Cost item must be an object.'] };
  if (!readText(item.id)) errors.push('Cost item id is required.');
  if (!readText(item.projectId)) errors.push('Cost item projectId is required.');
  if (!readText(item.name)) errors.push('Cost item name is required.');
  if (!VALID_CATEGORIES.has(item.category)) errors.push('Cost item category is invalid.');
  if (!VALID_UNITS.has(item.unit)) errors.push('Cost item unit is invalid.');
  if (!VALID_STATUSES.has(item.status)) errors.push('Cost item status is invalid.');
  if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
    errors.push('Cost item quantity must be greater than zero.');
  }
  if (item.unitCost !== null
    && (!Number.isFinite(item.unitCost) || item.unitCost < 0)) {
    errors.push('Cost item unitCost must be null or a non-negative number.');
  }
  if (item.currency !== 'AUD') errors.push('Cost item currency must be AUD.');
  if (item.checkedAt !== null
    && (!readText(item.checkedAt) || Number.isNaN(Date.parse(item.checkedAt)))) {
    errors.push('Cost item checkedAt must be null or a valid date.');
  }
  if (item.inventoryLink !== null && item.inventoryLink !== undefined) {
    if (!isObject(item.inventoryLink)) {
      errors.push('Cost item inventoryLink must be null or an object.');
    } else {
      if (!VALID_INVENTORY_TYPES.has(item.inventoryLink.type)) {
        errors.push('Cost item inventoryLink type is invalid.');
      }
      if (!readText(item.inventoryLink.id)) {
        errors.push('Cost item inventoryLink id is required.');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function createCostItem(input = {}, options = {}) {
  const source = isObject(input) ? input : {};
  const now = options.now ?? new Date().toISOString();
  const item = {
    id: readText(options.id ?? source.id) || createCostItemId(),
    projectId: readText(options.projectId ?? source.projectId),
    category: readText(source.category) || 'other',
    name: readText(source.name),
    quantity: readNumber(source.quantity),
    unit: readText(source.unit) || 'each',
    status: readText(source.status) || 'planned',
    unitCost: readNumber(source.unitCost),
    currency: readText(source.currency) || 'AUD',
    supplier: readText(source.supplier),
    productReference: readText(source.productReference),
    url: readText(source.url),
    checkedAt: readDate(source.checkedAt),
    notes: readText(source.notes),
    inventoryLink: normalizeInventoryLink(source.inventoryLink),
    createdAt: options.createdAt ?? source.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };

  const validation = validateCostItem(item);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return item;
}

export function updateCostItem(existing, input = {}, options = {}) {
  if (!isObject(existing)) throw new Error('The existing cost item is invalid.');

  return createCostItem({ ...existing, ...input }, {
    ...options,
    id: existing.id,
    projectId: options.projectId ?? existing.projectId,
    createdAt: existing.createdAt,
  });
}

function sortInventoryCandidates(records, item) {
  const itemName = readText(item?.name).toLowerCase();
  return [...records].sort((a, b) => {
    const aNameMatch = readText(a.name).toLowerCase() === itemName ? 1 : 0;
    const bNameMatch = readText(b.name).toLowerCase() === itemName ? 1 : 0;
    if (aNameMatch !== bNameMatch) return bNameMatch - aNameMatch;
    return readText(a.name).localeCompare(readText(b.name));
  });
}

export function getCostItemInventoryCandidates(item, materials = [], supplies = []) {
  const sourceMaterials = Array.isArray(materials) ? materials : [];
  const sourceSupplies = Array.isArray(supplies) ? supplies : [];
  const materialCandidates = MATERIAL_COST_CATEGORIES.has(item?.category)
    ? sourceMaterials.filter(material => material.category === item.category)
    : [];
  const supplyCandidates = SUPPLY_COST_CATEGORIES.has(item?.category)
    ? sourceSupplies.filter(supply => (
      supply.category === item.category
      && (supply.unit === item.unit || item.unit === 'other')
    ))
    : [];

  return {
    materials: sortInventoryCandidates(materialCandidates, item),
    supplies: sortInventoryCandidates(supplyCandidates, item),
  };
}

export function canCreateSupplyInventoryRecord(item) {
  return SUPPLY_COST_CATEGORIES.has(item?.category);
}

export function getCostItemInventoryStatus(inventoryLink, materials = [], supplies = []) {
  if (!inventoryLink?.type || !inventoryLink.id) return null;
  const records = inventoryLink.type === 'material' ? materials : supplies;
  const record = records.find(candidate => candidate.id === inventoryLink.id);
  if (!record) return null;
  if (record.source === 'owned') return 'owned';
  if (record.source === 'planned') return 'planned';
  return null;
}

function getLineTotal(item) {
  return Number.isFinite(item.unitCost) ? item.quantity * item.unitCost : null;
}

function getSummaryStatus(rows) {
  if (rows.length === 0) return 'not-started';
  if (rows.some(row => !row.valid)) return 'needs-review';
  if (rows.some(row => row.item.status === 'missing')) return 'needs-review';
  if (rows.some(row => row.item.status !== 'owned' && row.lineTotal === null)) return 'needs-review';
  return 'estimated';
}

export function getCostingSummary(items = []) {
  const sourceItems = Array.isArray(items) ? items : [];
  const rows = sourceItems.map((item, index) => {
    const validation = validateCostItem(item);
    return {
      id: item?.id ?? `invalid_cost_item_${index + 1}`,
      item,
      valid: validation.valid,
      reason: validation.valid ? '' : validation.errors.join(' '),
      lineTotal: validation.valid ? getLineTotal(item) : null,
    };
  });
  const ownedRows = rows.filter(row => row.valid && row.item.status === 'owned');
  const shoppingRows = rows.filter(row => row.valid && row.item.status !== 'owned');
  const pricedRows = rows.filter(row => row.valid && row.lineTotal !== null);
  const purchaseTotal = shoppingRows.reduce(
    (total, row) => total + (row.lineTotal ?? 0),
    0,
  );
  const ownedValue = ownedRows.reduce(
    (total, row) => total + (row.lineTotal ?? 0),
    0,
  );
  const unknownPriceRows = shoppingRows.filter(row => row.lineTotal === null);
  const status = getSummaryStatus(rows);

  return {
    status,
    statusLabel: {
      'not-started': 'No cost items',
      estimated: 'Estimate ready',
      'needs-review': 'Review required',
    }[status],
    rows,
    shoppingRows,
    ownedRows,
    totalItems: rows.length,
    ownedItems: ownedRows.length,
    shoppingItems: shoppingRows.length,
    pricedItems: pricedRows.length,
    unknownPriceCount: unknownPriceRows.length,
    purchaseTotal,
    ownedValue,
    estimatedTotal: purchaseTotal + ownedValue,
    supplierNames: [...new Set(shoppingRows.map(row => row.item.supplier).filter(Boolean))],
    missingItems: shoppingRows.filter(row => row.item.status === 'missing').length,
  };
}

export function formatAud(value) {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
  }).format(value);
}

export function formatCostItemQuantity(item) {
  if (!item || !Number.isFinite(item.quantity)) return '—';
  return `${item.quantity} ${item.unit}`;
}

export function getCostingStatusMessage(summary) {
  if (summary.status === 'not-started') return 'Add manual cost items to build the project estimate.';
  if (summary.unknownPriceCount > 0) {
    return `${countLabel(summary.unknownPriceCount, 'shopping item')} still need a price or supplier review.`;
  }
  if (summary.missingItems > 0) {
    return `${countLabel(summary.missingItems, 'item')} still need sourcing before the build is ready to buy.`;
  }
  return 'The purchase total reflects priced items marked as planned or needing sourcing.';
}

function csvValue(value) {
  if (value === null || value === undefined) return '';
  return `"${String(value).replace(/"/g, '""')}"`;
}

export function buildCostingCsv(summary = {}) {
  const rows = Array.isArray(summary.rows) ? summary.rows : [];
  const header = [
    'Item',
    'Category',
    'Quantity',
    'Unit',
    'Status',
    'Supplier',
    'Product reference',
    'Checked at',
    'Unit cost (AUD)',
    'Line total (AUD)',
    'List',
    'Review note',
    'Product URL',
  ];
  const lines = [header.map(csvValue).join(',')];

  rows.forEach(row => {
    const item = row.item ?? {};
    const valid = row.valid === true;
    lines.push([
      item.name,
      valid ? item.category : '',
      valid ? item.quantity : '',
      valid ? item.unit : '',
      valid ? item.status : '',
      valid ? item.supplier : '',
      valid ? item.productReference : '',
      valid ? item.checkedAt : '',
      valid && item.unitCost !== null ? item.unitCost : '',
      valid && row.lineTotal !== null ? row.lineTotal : '',
      valid ? (item.status === 'owned' ? 'Owned' : 'Shopping list') : 'Review',
      valid ? '' : row.reason,
      valid ? item.url : '',
    ].map(csvValue).join(','));
  });

  return lines.join('\r\n') + '\r\n';
}
