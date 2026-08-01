import {
  SUPPLY_CATEGORIES,
  SUPPLY_UNITS,
  validateSupply,
} from './supplyInventory.js';

const VALID_CATEGORIES = new Set(SUPPLY_CATEGORIES.map(option => option.value));
const VALID_UNITS = new Set(SUPPLY_UNITS.map(option => option.value));

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

function normalizeKey(value) {
  return readText(value).toLowerCase().replace(/\s+/g, ' ');
}

export function createSupplyRequirementId() {
  if (globalThis.crypto?.randomUUID) {
    return `supply_requirement_${globalThis.crypto.randomUUID()}`;
  }

  return `supply_requirement_${Date.now()}`;
}

export function validateSupplyRequirement(requirement) {
  const errors = [];

  if (!isObject(requirement)) {
    return { valid: false, errors: ['Supply requirement must be an object.'] };
  }

  if (!readText(requirement.id)) errors.push('Supply requirement id is required.');
  if (!readText(requirement.projectId)) errors.push('Supply requirement projectId is required.');
  if (!readText(requirement.name)) errors.push('Supply requirement name is required.');
  if (!VALID_CATEGORIES.has(requirement.category)) {
    errors.push('Supply requirement category is invalid.');
  }
  if (!VALID_UNITS.has(requirement.unit)) errors.push('Supply requirement unit is invalid.');

  if (!Number.isFinite(requirement.quantity) || requirement.quantity <= 0) {
    errors.push('Supply requirement quantity must be greater than zero.');
  }

  return { valid: errors.length === 0, errors };
}

export function createSupplyRequirement(input = {}, options = {}) {
  const source = isObject(input) ? input : {};
  const now = options.now ?? new Date().toISOString();
  const requirement = {
    id: readText(options.id ?? source.id) || createSupplyRequirementId(),
    projectId: readText(options.projectId ?? source.projectId),
    category: readText(source.category) || 'hardware',
    name: readText(source.name),
    reference: readText(source.reference),
    unit: readText(source.unit) || 'each',
    quantity: readNumber(source.quantity),
    notes: readText(source.notes),
    createdAt: options.createdAt ?? source.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };

  const validation = validateSupplyRequirement(requirement);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return requirement;
}

export function updateSupplyRequirement(existing, input = {}, options = {}) {
  if (!isObject(existing)) throw new Error('The existing supply requirement is invalid.');

  return createSupplyRequirement({ ...existing, ...input }, {
    ...options,
    id: existing.id,
    projectId: options.projectId ?? existing.projectId,
    createdAt: existing.createdAt,
  });
}

function sumQuantity(records) {
  return records.reduce((total, record) => total + record.quantity, 0);
}

function getRowStatus(ownedQuantity, plannedQuantity, requiredQuantity) {
  if (ownedQuantity >= requiredQuantity) return 'owned';
  if (ownedQuantity + plannedQuantity >= requiredQuantity) return 'planned';
  if (ownedQuantity + plannedQuantity > 0) return 'partial';
  return 'missing';
}

function getRowReason(status, ownedQuantity, plannedQuantity, requiredQuantity) {
  if (status === 'owned') return 'Owned quantity covers this requirement.';
  if (status === 'planned') {
    const ownedShortfall = Math.max(0, requiredQuantity - ownedQuantity);
    return `${ownedShortfall} ${ownedShortfall === 1 ? 'unit' : 'units'} covered by owned stock; planned stock covers the balance.`;
  }
  if (status === 'partial') {
    const availableQuantity = ownedQuantity + plannedQuantity;
    const shortfall = Math.max(0, requiredQuantity - availableQuantity);
    return `${availableQuantity} available or planned; ${shortfall} still required.`;
  }
  return 'No matching owned or planned supply record was found.';
}

function matchesRequirement(requirement, supply) {
  if (requirement.category !== supply.category || requirement.unit !== supply.unit) return false;
  if (normalizeKey(requirement.name) !== normalizeKey(supply.name)) return false;

  const requirementReference = normalizeKey(requirement.reference);
  return !requirementReference || requirementReference === normalizeKey(supply.reference);
}

export function getSupplyRequirementCheck(requirements = [], supplies = []) {
  const validSupplies = Array.isArray(supplies)
    ? supplies.filter(supply => validateSupply(supply).valid)
    : [];
  const rows = (Array.isArray(requirements) ? requirements : []).map((requirement, index) => {
    const validation = validateSupplyRequirement(requirement);
    if (!validation.valid) {
      return {
        id: requirement?.id ?? `invalid_requirement_${index + 1}`,
        requirement,
        status: 'needs-review',
        reason: validation.errors.join(' '),
        requiredQuantity: Number.isFinite(requirement?.quantity) ? requirement.quantity : 0,
        ownedQuantity: 0,
        plannedQuantity: 0,
        availableQuantity: 0,
        shortfall: 0,
        ownedCandidates: [],
        plannedCandidates: [],
      };
    }

    const candidates = validSupplies.filter(supply => matchesRequirement(requirement, supply));
    const ownedCandidates = candidates.filter(supply => supply.source === 'owned');
    const plannedCandidates = candidates.filter(supply => supply.source === 'planned');
    const ownedQuantity = sumQuantity(ownedCandidates);
    const plannedQuantity = sumQuantity(plannedCandidates);
    const availableQuantity = ownedQuantity + plannedQuantity;
    const status = getRowStatus(ownedQuantity, plannedQuantity, requirement.quantity);

    return {
      id: requirement.id,
      requirement,
      status,
      reason: getRowReason(status, ownedQuantity, plannedQuantity, requirement.quantity),
      requiredQuantity: requirement.quantity,
      ownedQuantity,
      plannedQuantity,
      availableQuantity,
      shortfall: Math.max(0, requirement.quantity - availableQuantity),
      ownedCandidates,
      plannedCandidates,
    };
  });

  const summary = {
    totalRequirements: rows.length,
    ownedCovered: rows.filter(row => row.status === 'owned').length,
    plannedCovered: rows.filter(row => row.status === 'planned').length,
    partial: rows.filter(row => row.status === 'partial').length,
    missing: rows.filter(row => row.status === 'missing').length,
    needsReview: rows.filter(row => row.status === 'needs-review').length,
  };

  let status = 'covered';
  if (rows.length === 0) status = 'not-started';
  else if (summary.partial || summary.missing || summary.needsReview) status = 'needs-attention';
  else if (summary.plannedCovered) status = 'planned';

  const statusLabel = {
    'not-started': 'No supply requirements',
    covered: 'Supplies covered',
    planned: 'Purchase planned',
    'needs-attention': 'Supply gaps',
  }[status];

  return { rows, summary, status, statusLabel };
}
