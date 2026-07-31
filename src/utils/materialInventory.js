import { convertDimension, UNITS } from './unitConverter.js';

export const MATERIAL_STORAGE_KEY = 'benchmate.materials.v1';

export const MATERIAL_CATEGORIES = Object.freeze([
  { value: 'sheet-goods', label: 'Sheet goods' },
  { value: 'solid-timber', label: 'Solid timber' },
  { value: 'offcut', label: 'Offcut' },
]);

export const MATERIAL_SOURCES = Object.freeze([
  { value: 'owned', label: 'Owned' },
  { value: 'planned', label: 'Planned purchase' },
]);

export const MATERIAL_CONDITIONS = Object.freeze([
  { value: 'good', label: 'Good' },
  { value: 'rough', label: 'Rough' },
  { value: 'damaged', label: 'Damaged' },
]);

const VALID_CATEGORIES = new Set(MATERIAL_CATEGORIES.map(option => option.value));
const VALID_SOURCES = new Set(MATERIAL_SOURCES.map(option => option.value));
const VALID_CONDITIONS = new Set(MATERIAL_CONDITIONS.map(option => option.value));
const DIMENSION_TOLERANCE = 0.001;

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function readInteger(value) {
  const number = readNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

function readText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getDimensionInput(source, field) {
  const dimensions = isObject(source.dimensions) ? source.dimensions : {};
  return source[field] ?? dimensions[field];
}

function roundMillimetres(value) {
  return Math.round(value * 1000) / 1000;
}

function toMillimetres(value, unit) {
  const number = readNumber(value);
  if (number === null || ![UNITS.MM, UNITS.INCH].includes(unit)) return null;
  return roundMillimetres(convertDimension(number, unit, UNITS.MM));
}

export function createMaterialId() {
  if (globalThis.crypto?.randomUUID) {
    return `stock_${globalThis.crypto.randomUUID()}`;
  }

  return `stock_${Date.now()}`;
}

export function getAvailableQuantity(material) {
  if (!isObject(material)) return 0;
  const quantity = readInteger(material.quantity) ?? 0;
  const reservedQuantity = readInteger(material.reservedQuantity) ?? 0;
  return Math.max(0, quantity - reservedQuantity);
}

export function validateMaterialStock(material) {
  const errors = [];

  if (!isObject(material)) {
    return { valid: false, errors: ['Material stock must be an object.'] };
  }

  if (!readText(material.id)) errors.push('Material stock id is required.');
  if (!readText(material.name)) errors.push('Material stock name is required.');
  if (!VALID_CATEGORIES.has(material.category)) errors.push('Material stock category is invalid.');
  if (!VALID_SOURCES.has(material.source)) errors.push('Material stock source is invalid.');
  if (!VALID_CONDITIONS.has(material.condition)) errors.push('Material stock condition is invalid.');

  if (!isObject(material.dimensions)) {
    errors.push('Material stock dimensions are required.');
  } else {
    for (const field of ['length', 'width', 'thickness']) {
      if (!Number.isFinite(material.dimensions[field]) || material.dimensions[field] <= 0) {
        errors.push(`Material stock dimensions.${field} must be greater than zero.`);
      }
    }
  }

  for (const field of ['usableLength', 'usableWidth']) {
    if (!Number.isFinite(material[field]) || material[field] <= 0) {
      errors.push(`Material stock ${field} must be greater than zero.`);
    }
  }

  if (isObject(material.dimensions)
    && Number.isFinite(material.usableLength)
    && material.usableLength > material.dimensions.length) {
    errors.push('Material stock usableLength cannot exceed overall length.');
  }
  if (isObject(material.dimensions)
    && Number.isFinite(material.usableWidth)
    && material.usableWidth > material.dimensions.width) {
    errors.push('Material stock usableWidth cannot exceed overall width.');
  }

  if (!Number.isInteger(material.quantity) || material.quantity < 0) {
    errors.push('Material stock quantity must be a non-negative integer.');
  }
  if (!Number.isInteger(material.reservedQuantity) || material.reservedQuantity < 0) {
    errors.push('Material stock reservedQuantity must be a non-negative integer.');
  }
  if (Number.isInteger(material.quantity)
    && Number.isInteger(material.reservedQuantity)
    && material.reservedQuantity > material.quantity) {
    errors.push('Material stock reservedQuantity cannot exceed quantity.');
  }

  return { valid: errors.length === 0, errors };
}

export function createMaterialStock(input = {}, options = {}) {
  const source = isObject(input) ? input : {};
  const now = options.now ?? new Date().toISOString();
  const material = {
    id: readText(options.id ?? source.id) || createMaterialId(),
    category: readText(source.category) || 'sheet-goods',
    name: readText(source.name),
    species: readText(source.species),
    dimensions: {
      length: readNumber(getDimensionInput(source, 'length')),
      width: readNumber(getDimensionInput(source, 'width')),
      thickness: readNumber(getDimensionInput(source, 'thickness')),
    },
    usableLength: readNumber(source.usableLength ?? source.usableDimensions?.length),
    usableWidth: readNumber(source.usableWidth ?? source.usableDimensions?.width),
    quantity: readInteger(source.quantity),
    condition: readText(source.condition) || 'good',
    location: readText(source.location),
    reservedQuantity: readInteger(source.reservedQuantity) ?? 0,
    source: readText(source.source) || 'owned',
    notes: readText(source.notes),
    createdAt: options.createdAt ?? source.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };

  const validation = validateMaterialStock(material);
  if (!validation.valid) {
    throw new Error(validation.errors.join(' '));
  }

  return material;
}

export function updateMaterialStock(existing, input = {}, options = {}) {
  if (!isObject(existing)) throw new Error('The existing material stock record is invalid.');

  return createMaterialStock({
    ...existing,
    ...input,
    dimensions: {
      ...existing.dimensions,
      ...(isObject(input.dimensions) ? input.dimensions : {}),
    },
  }, {
    ...options,
    id: existing.id,
    createdAt: existing.createdAt,
  });
}

function parseStoredMaterial(value) {
  try {
    const validation = validateMaterialStock(value);
    return validation.valid ? value : null;
  } catch {
    return null;
  }
}

function getDefaultStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

export function loadStoredMaterials(storage = getDefaultStorage()) {
  if (!storage) return [];

  try {
    const serialized = storage.getItem(MATERIAL_STORAGE_KEY);
    if (!serialized) return [];

    const records = JSON.parse(serialized);
    if (!Array.isArray(records)) return [];
    return records.map(parseStoredMaterial).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveStoredMaterials(materials, storage = getDefaultStorage()) {
  if (!storage || !Array.isArray(materials)) return false;
  if (materials.some(material => !validateMaterialStock(material).valid)) return false;

  try {
    storage.setItem(MATERIAL_STORAGE_KEY, JSON.stringify(materials));
    return true;
  } catch {
    return false;
  }
}

export function upsertStoredMaterial(material, materials, storage = getDefaultStorage()) {
  const validation = validateMaterialStock(material);
  if (!validation.valid || !Array.isArray(materials)) {
    return { materials, saved: false, error: validation.errors.join(' ') };
  }

  const nextMaterials = [
    ...materials.filter(candidate => candidate.id !== material.id),
    material,
  ];

  return {
    materials: nextMaterials,
    saved: saveStoredMaterials(nextMaterials, storage),
    error: '',
  };
}

export function removeStoredMaterial(materialId, materials, storage = getDefaultStorage()) {
  if (!Array.isArray(materials)) return { materials, saved: false };

  const nextMaterials = materials.filter(material => material.id !== materialId);
  return {
    materials: nextMaterials,
    saved: saveStoredMaterials(nextMaterials, storage),
  };
}

function getPartDimension(part, field, unit) {
  if (!isObject(part)) return null;
  const sourceValue = field === 'length'
    ? part.length ?? part.height ?? part.dimensions?.length
    : field === 'width'
      ? part.width ?? part.dimensions?.width
      : part.thickness ?? part.dimensions?.thickness;
  return toMillimetres(sourceValue, unit);
}

function getPartQuantity(part) {
  const quantity = readInteger(part?.qty ?? part?.quantity);
  return quantity === null ? null : quantity;
}

function findMaterialCandidates(part, unit, materials) {
  const length = getPartDimension(part, 'length', unit);
  const width = getPartDimension(part, 'width', unit);
  const thickness = getPartDimension(part, 'thickness', unit);
  const allowRotation = part?.allowRotation !== false && part?.rotationAllowed !== false;

  if (length === null || width === null || length <= 0 || width <= 0) return [];

  return materials.flatMap(material => {
    const availableQuantity = getAvailableQuantity(material);
    if (availableQuantity <= 0) return [];

    if (thickness !== null
      && Math.abs(material.dimensions.thickness - thickness) > DIMENSION_TOLERANCE) {
      return [];
    }

    const directFit = material.usableLength >= length && material.usableWidth >= width;
    const rotatedFit = allowRotation
      && material.usableLength >= width
      && material.usableWidth >= length;
    if (!directFit && !rotatedFit) return [];

    return [{
      id: material.id,
      name: material.name,
      availableQuantity,
      orientation: directFit && rotatedFit ? 'either' : directFit ? 'lengthwise' : 'rotated',
      source: material.source,
    }];
  });
}

export function matchMaterialStockToParts(parts = [], unit = UNITS.MM, materials = []) {
  const sourceParts = Array.isArray(parts) ? parts : [];
  const validMaterials = Array.isArray(materials)
    ? materials.filter(material => validateMaterialStock(material).valid)
    : [];

  const rows = sourceParts.map((part, index) => {
    const quantity = getPartQuantity(part);
    const length = getPartDimension(part, 'length', unit);
    const width = getPartDimension(part, 'width', unit);
    const hasValidDimensions = length !== null && width !== null && length > 0 && width > 0;
    const candidates = findMaterialCandidates(part, unit, validMaterials);
    const ownedCandidates = candidates.filter(candidate => candidate.source === 'owned');
    const plannedCandidates = candidates.filter(candidate => candidate.source === 'planned');
    const needsReview = quantity === null || quantity < 0 || !hasValidDimensions;

    let reason = '';
    if (needsReview) {
      reason = 'Part dimensions or quantity need review.';
    } else if (validMaterials.length === 0) {
      reason = 'No inventory items recorded.';
    } else if (candidates.length === 0) {
      reason = 'No available stock passes the dimensional screening.';
    }

    return {
      id: String(part?.id ?? `part_${index + 1}`),
      name: readText(part?.name) || `Part ${index + 1}`,
      quantity: quantity ?? 0,
      dimensions: { length, width, thickness: getPartDimension(part, 'thickness', unit) },
      candidates,
      ownedCandidates,
      plannedCandidates,
      status: needsReview
        ? 'needs-review'
        : ownedCandidates.length > 0
          ? 'potential'
          : plannedCandidates.length > 0
            ? 'planned'
            : 'unmatched',
      reason,
    };
  }).filter(row => row.quantity > 0 || row.status === 'needs-review');

  const requiredRows = rows.filter(row => row.quantity > 0);
  const matchedRows = requiredRows.filter(row => row.status === 'potential');
  const plannedRows = requiredRows.filter(row => row.status === 'planned');

  return {
    rows,
    totalPartTypes: requiredRows.length,
    totalPartQuantity: requiredRows.reduce((sum, row) => sum + row.quantity, 0),
    matchedPartTypes: matchedRows.length,
    plannedPartTypes: plannedRows.length,
    unmatchedPartTypes: requiredRows.length - matchedRows.length - plannedRows.length,
    reviewPartTypes: rows.filter(row => row.status === 'needs-review').length,
  };
}
