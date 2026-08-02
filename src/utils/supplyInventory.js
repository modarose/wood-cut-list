export const SUPPLY_STORAGE_KEY = 'benchmate.supplies.v1';

export const SUPPLY_CATEGORIES = Object.freeze([
  { value: 'hardware', label: 'Hardware' },
  { value: 'adhesive', label: 'Adhesive' },
  { value: 'finish', label: 'Finish' },
  { value: 'abrasive', label: 'Abrasive' },
  { value: 'consumable', label: 'Other consumable' },
]);

export const SUPPLY_UNITS = Object.freeze([
  { value: 'each', label: 'Each' },
  { value: 'pack', label: 'Pack' },
  { value: 'box', label: 'Box' },
  { value: 'bottle', label: 'Bottle' },
  { value: 'tin', label: 'Tin' },
  { value: 'tube', label: 'Tube' },
  { value: 'sheet', label: 'Sheet' },
  { value: 'metre', label: 'Metre' },
  { value: 'litre', label: 'Litre' },
  { value: 'kilogram', label: 'Kilogram' },
  { value: 'other', label: 'Other' },
]);

export const SUPPLY_SOURCES = Object.freeze([
  { value: 'owned', label: 'Owned' },
  { value: 'planned', label: 'Planned purchase' },
]);

const VALID_CATEGORIES = new Set(SUPPLY_CATEGORIES.map(option => option.value));
const VALID_UNITS = new Set(SUPPLY_UNITS.map(option => option.value));
const VALID_SOURCES = new Set(SUPPLY_SOURCES.map(option => option.value));

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

export function createSupplyId() {
  if (globalThis.crypto?.randomUUID) {
    return `supply_${globalThis.crypto.randomUUID()}`;
  }

  return `supply_${Date.now()}`;
}

export function validateSupply(supply) {
  const errors = [];

  if (!isObject(supply)) return { valid: false, errors: ['Supply must be an object.'] };

  if (!readText(supply.id)) errors.push('Supply id is required.');
  if (!readText(supply.name)) errors.push('Supply name is required.');
  if (!VALID_CATEGORIES.has(supply.category)) errors.push('Supply category is invalid.');
  if (!VALID_UNITS.has(supply.unit)) errors.push('Supply unit is invalid.');
  if (!VALID_SOURCES.has(supply.source)) errors.push('Supply source is invalid.');

  if (!Number.isFinite(supply.quantity) || supply.quantity < 0) {
    errors.push('Supply quantity must be a non-negative number.');
  }

  if (supply.lastCheckedAt !== null
    && supply.lastCheckedAt !== undefined
    && (!readText(supply.lastCheckedAt) || Number.isNaN(Date.parse(supply.lastCheckedAt)))) {
    errors.push('Supply lastCheckedAt must be null or a valid date.');
  }

  return { valid: errors.length === 0, errors };
}

export function createSupply(input = {}, options = {}) {
  const source = isObject(input) ? input : {};
  const now = options.now ?? new Date().toISOString();
  const supply = {
    id: readText(options.id ?? source.id) || createSupplyId(),
    category: readText(source.category) || 'consumable',
    name: readText(source.name),
    brand: readText(source.brand),
    reference: readText(source.reference),
    unit: readText(source.unit) || 'each',
    quantity: readNumber(source.quantity),
    source: readText(source.source) || 'owned',
    location: readText(source.location),
    notes: readText(source.notes),
    lastCheckedAt: readDate(source.lastCheckedAt),
    createdAt: options.createdAt ?? source.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };

  const validation = validateSupply(supply);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return supply;
}

export function updateSupply(existing, input = {}, options = {}) {
  if (!isObject(existing)) throw new Error('The existing supply record is invalid.');

  return createSupply({ ...existing, ...input }, {
    ...options,
    id: existing.id,
    createdAt: existing.createdAt,
  });
}

function getDefaultStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function parseStoredSupply(value) {
  try {
    return validateSupply(value).valid ? value : null;
  } catch {
    return null;
  }
}

export function loadStoredSupplies(storage = getDefaultStorage()) {
  if (!storage) return [];

  try {
    const serialized = storage.getItem(SUPPLY_STORAGE_KEY);
    if (!serialized) return [];
    const records = JSON.parse(serialized);
    if (!Array.isArray(records)) return [];
    return records.map(parseStoredSupply).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveStoredSupplies(supplies, storage = getDefaultStorage()) {
  if (!storage || !Array.isArray(supplies)) return false;
  if (supplies.some(supply => !validateSupply(supply).valid)) return false;

  try {
    storage.setItem(SUPPLY_STORAGE_KEY, JSON.stringify(supplies));
    return true;
  } catch {
    return false;
  }
}

export function upsertStoredSupply(supply, supplies, storage = getDefaultStorage()) {
  const validation = validateSupply(supply);
  if (!validation.valid || !Array.isArray(supplies)) {
    return { supplies, saved: false, error: validation.errors.join(' ') };
  }

  const nextSupplies = [
    ...supplies.filter(candidate => candidate.id !== supply.id),
    supply,
  ];

  return {
    supplies: nextSupplies,
    saved: saveStoredSupplies(nextSupplies, storage),
    error: '',
  };
}

export function removeStoredSupply(supplyId, supplies, storage = getDefaultStorage()) {
  if (!Array.isArray(supplies)) return { supplies, saved: false };

  const nextSupplies = supplies.filter(supply => supply.id !== supplyId);
  return {
    supplies: nextSupplies,
    saved: saveStoredSupplies(nextSupplies, storage),
  };
}
