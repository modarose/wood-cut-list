import { convertDimension, UNITS } from './unitConverter.js';
import { createSupplyRequirement, validateSupplyRequirement } from './supplyRequirements.js';
import { createToolRequirement, validateToolRequirement } from './toolRequirements.js';

export const BENCHMATE_SCHEMA_VERSION = 1;
export const CANONICAL_UNITS = UNITS.MM;
export const DEFAULT_CURRENCY = 'AUD';

const VALID_UNITS = new Set(Object.values(UNITS));

const EMPTY_EDGE_TREATMENT = {
  top: 'none',
  bottom: 'none',
  left: 'none',
  right: 'none',
};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function normalizeUnit(unit) {
  const normalized = typeof unit === 'string' ? unit.trim().toLowerCase() : '';
  return VALID_UNITS.has(normalized) ? normalized : null;
}

function roundMillimetres(value) {
  return Math.round(value * 1000) / 1000;
}

function roundDisplayUnit(value) {
  return Math.round(value * 1000) / 1000;
}

function toMillimetres(value, unit) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value);
  if (!Number.isFinite(numericValue) || !unit) return null;

  return roundMillimetres(convertDimension(numericValue, unit, CANONICAL_UNITS));
}

function fromMillimetres(value, unit) {
  if (!Number.isFinite(value)) return 0;
  return roundDisplayUnit(convertDimension(value, CANONICAL_UNITS, unit));
}

function createWarning(code, message, path) {
  return { code, message, path };
}

function readDimension(value, unit, path, warnings, { allowZero = false } = {}) {
  const converted = toMillimetres(value, unit);
  const isValid = converted !== null && (allowZero ? converted >= 0 : converted > 0);

  if (!isValid) {
    warnings.push(createWarning(
      converted === null ? 'missing-dimension' : 'invalid-dimension',
      `${path} must be ${allowZero ? 'zero or greater' : 'greater than zero'} in the source data.`,
      path,
    ));
    return 0;
  }

  return converted;
}

function readQuantity(value, path, warnings) {
  if (value === undefined || value === null || value === '') {
    warnings.push(createWarning(
      'missing-quantity',
      `${path} is missing; quantity was set to 0 until it is reviewed.`,
      path,
    ));
    return 0;
  }

  const quantity = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(quantity) || quantity < 0) {
    warnings.push(createWarning(
      'invalid-quantity',
      `${path} must be a non-negative integer.`,
      path,
    ));
    return 0;
  }

  return quantity;
}

function makeStableId(prefix, sourceId, fallback) {
  const rawId = String(sourceId ?? fallback).trim();
  const safeId = rawId.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
  if (safeId === prefix || safeId.startsWith(`${prefix}_`)) return safeId;
  return `${prefix}_${safeId || fallback}`;
}

function makeUniqueId(candidate, usedIds) {
  let id = candidate;
  let suffix = 2;

  while (usedIds.has(id)) {
    id = `${candidate}_${suffix}`;
    suffix += 1;
  }

  usedIds.add(id);
  return id;
}

function cloneJson(value) {
  if (value === undefined) return null;

  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return null;
  }
}

function normalizeEdgeTreatment(value) {
  if (!isObject(value)) return { ...EMPTY_EDGE_TREATMENT };
  return {
    ...EMPTY_EDGE_TREATMENT,
    ...value,
  };
}

function mapPart(partInput, index, sourceUnit, revisionId, usedIds) {
  const part = isObject(partInput) ? partInput : {};
  const warnings = [];
  const sourceEntityId = part.id === undefined || part.id === null || part.id === ''
    ? null
    : String(part.id);

  if (!sourceEntityId) {
    warnings.push(createWarning(
      'missing-source-id',
      'The part had no source ID; a stable row-based ID was generated.',
      `parts[${index}].id`,
    ));
  }

  const id = makeUniqueId(
    makeStableId('part', sourceEntityId, `${index + 1}`),
    usedIds,
  );

  const name = typeof part.name === 'string' && part.name.trim()
    ? part.name.trim()
    : `Part ${index + 1}`;

  if (name === `Part ${index + 1}` && !part.name) {
    warnings.push(createWarning(
      'missing-name',
      'The part had no name; a review label was generated.',
      `parts[${index}].name`,
    ));
  }

  const width = readDimension(
    part.width ?? part.dimensions?.width,
    sourceUnit,
    `parts[${index}].width`,
    warnings,
  );
  const length = readDimension(
    part.height ?? part.length ?? part.dimensions?.length,
    sourceUnit,
    `parts[${index}].height`,
    warnings,
  );
  const thicknessValue = part.thickness ?? part.dimensions?.thickness;
  const thickness = thicknessValue === undefined || thicknessValue === null || thicknessValue === ''
    ? null
    : readDimension(thicknessValue, sourceUnit, `parts[${index}].thickness`, warnings);

  if (thickness === null) {
    warnings.push(createWarning(
      'thickness-missing',
      'Material thickness was not provided by the WoodCut session.',
      `parts[${index}].thickness`,
    ));
  }

  const quantity = readQuantity(
    part.qty ?? part.quantity,
    `parts[${index}].quantity`,
    warnings,
  );
  const rotationAllowed = part.allowRotation !== false;
  const materialRequirementId = part.materialRequirementId ?? null;

  if (!materialRequirementId) {
    warnings.push(createWarning(
      'material-mapping-missing',
      'No BenchMate material requirement is mapped to this part.',
      `parts[${index}].materialRequirementId`,
    ));
  }

  if (!rotationAllowed && !part.grainDirection) {
    warnings.push(createWarning(
      'grain-direction-missing',
      'Rotation is locked, but the source does not identify the grain direction.',
      `parts[${index}].grainDirection`,
    ));
  }

  const shape = part.shape ?? 'rectangular';
  if (shape !== 'rectangular') {
    warnings.push(createWarning(
      'unsupported-geometry',
      `The ${shape} part requires review before rectangular cut optimisation.`,
      `parts[${index}].shape`,
    ));
  }

  return {
    part: {
      id,
      revisionId,
      name,
      partCode: part.partCode ?? null,
      quantity,
      dimensions: {
        length,
        width,
        thickness,
      },
      shape,
      materialRequirementId,
      grainDirection: part.grainDirection ?? null,
      rotationAllowed,
      edgeTreatment: normalizeEdgeTreatment(part.edgeTreatment),
      cutAllowance: 0,
      machiningNotes: part.machiningNotes ?? null,
      sourceEntityId,
      sourceUnit: sourceUnit ?? null,
      confidence: warnings.length > 0 ? 'needs-review' : 'confirmed',
      status: warnings.length > 0 ? 'needs-review' : 'active',
      warnings,
      presentation: {
        color: typeof part.color === 'string' ? part.color : null,
      },
    },
    warnings,
  };
}

function mapSupplyRequirements(requirementsInput, projectId, now) {
  if (!Array.isArray(requirementsInput)) return [];

  return requirementsInput.map(requirement => createSupplyRequirement(requirement, {
    id: requirement?.id,
    projectId,
    createdAt: requirement?.createdAt ?? now,
    updatedAt: now,
    now,
  }));
}

function mapToolRequirements(requirementsInput, projectId, now) {
  if (!Array.isArray(requirementsInput)) return [];

  return requirementsInput.map(requirement => createToolRequirement(requirement, {
    id: requirement?.id,
    projectId,
    createdAt: requirement?.createdAt ?? now,
    updatedAt: now,
    now,
  }));
}

export function createBenchMateProjectFromWoodCut(session = {}, options = {}) {
  const sourceSession = isObject(session) ? session : {};
  const warnings = [];
  const sourceUnit = normalizeUnit(sourceSession.unit);

  if (!sourceUnit) {
    warnings.push(createWarning(
      'invalid-unit',
      'The WoodCut session unit must be either mm or in.',
      'unit',
    ));
  }

  const projectId = makeStableId('project', options.projectId, 'woodcut_studio');
  const revisionId = makeStableId('revision', options.revisionId, `${projectId}_1`);
  const now = options.now ?? new Date().toISOString();
  const stockInput = isObject(sourceSession.stock) ? sourceSession.stock : {};
  const stockWarnings = [];

  if (!isObject(sourceSession.stock)) {
    stockWarnings.push(createWarning(
      'missing-stock',
      'The WoodCut session did not contain stock settings.',
      'stock',
    ));
  }

  const cutStock = {
    id: makeStableId('cut-stock', options.stockId, `${projectId}_template`),
    source: 'woodcut-studio',
    sourceMaterialStockId: options.sourceMaterialStockId ?? null,
    sourceUnit: sourceUnit ?? sourceSession.unit ?? null,
    dimensions: {
      width: readDimension(stockInput.width, sourceUnit, 'stock.width', stockWarnings),
      length: readDimension(stockInput.height, sourceUnit, 'stock.height', stockWarnings),
      thickness: null,
    },
    kerf: readDimension(stockInput.kerf, sourceUnit, 'stock.kerf', stockWarnings, { allowZero: true }),
    margin: readDimension(stockInput.margin, sourceUnit, 'stock.margin', stockWarnings, { allowZero: true }),
    status: stockWarnings.length > 0 ? 'needs-review' : 'ready',
    warnings: stockWarnings,
  };

  const partsInput = Array.isArray(sourceSession.parts) ? sourceSession.parts : [];
  if (!Array.isArray(sourceSession.parts)) {
    warnings.push(createWarning(
      'missing-parts',
      'The WoodCut session did not contain a parts list.',
      'parts',
    ));
  }

  const usedPartIds = new Set();
  const mappedParts = partsInput.map((part, index) => {
    const mapped = mapPart(part, index, sourceUnit, revisionId, usedPartIds);
    warnings.push(...mapped.warnings);
    return mapped.part;
  });

  warnings.push(...stockWarnings);

  const supplyRequirements = mapSupplyRequirements(
    options.supplyRequirements,
    projectId,
    now,
  );
  const toolRequirements = mapToolRequirements(
    options.toolRequirements,
    projectId,
    now,
  );

  const revisionWarnings = [...warnings];
  const revisionStatus = revisionWarnings.length > 0 ? 'needs-review' : 'draft';
  const project = {
    id: projectId,
    name: options.name ?? 'Untitled WoodCut project',
    status: options.status ?? 'planning',
    description: options.description ?? '',
    units: CANONICAL_UNITS,
    currency: options.currency ?? DEFAULT_CURRENCY,
    activeRevisionId: revisionId,
    designRevisionIds: [revisionId],
    materialRequirementIds: [],
    hardwareRequirementIds: [],
    finishRequirementIds: [],
    supplyRequirementIds: supplyRequirements.map(requirement => requirement.id),
    toolRequirementIds: toolRequirements.map(requirement => requirement.id),
    buildMethodIds: [],
    journalEntryIds: [],
    readiness: revisionWarnings.length > 0 ? 'needs-review' : 'ready',
    createdAt: now,
    updatedAt: now,
  };

  const designRevision = {
    id: revisionId,
    projectId,
    revisionNumber: options.revisionNumber ?? 1,
    source: {
      type: 'woodcut-studio',
      name: options.sourceName ?? 'WoodCut Studio session',
      externalId: null,
      fileHash: null,
    },
    sourceUnit: sourceUnit ?? sourceSession.unit ?? null,
    status: revisionStatus,
    partIds: mappedParts.map(part => part.id),
    importedAt: now,
    approvedAt: null,
    warnings: revisionWarnings,
    sourcePayload: cloneJson(sourceSession),
  };

  return {
    schemaVersion: BENCHMATE_SCHEMA_VERSION,
    project,
    designRevisions: [designRevision],
    parts: mappedParts,
    materialRequirements: [],
    materialStock: [],
    supplyRequirements,
    toolRequirements,
    cutStock,
    cutSettings: {
      strategy: sourceSession.strategy ?? 'bssf',
      cutPreference: sourceSession.cutPreference ?? 'rip_first',
    },
  };
}

export function toWoodCutSession(record, options = {}) {
  const validation = validateBenchMateProject(record);
  if (!validation.valid) {
    throw new Error(`Invalid BenchMate project: ${validation.errors.join(' ')}`);
  }

  const requestedUnit = normalizeUnit(options.unit ?? record.project.units) ?? UNITS.MM;
  const activeRevisionId = record.project.activeRevisionId;
  const activeParts = record.parts.filter(part => part.revisionId === activeRevisionId);
  const cutStock = record.cutStock;

  return {
    unit: requestedUnit,
    stock: {
      width: fromMillimetres(cutStock.dimensions.width, requestedUnit),
      height: fromMillimetres(cutStock.dimensions.length, requestedUnit),
      kerf: fromMillimetres(cutStock.kerf, requestedUnit),
      margin: fromMillimetres(cutStock.margin, requestedUnit),
    },
    parts: activeParts.map(part => ({
      id: part.sourceEntityId ?? part.id,
      name: part.name,
      width: fromMillimetres(part.dimensions.width, requestedUnit),
      height: fromMillimetres(part.dimensions.length, requestedUnit),
      qty: part.quantity,
      allowRotation: part.rotationAllowed !== false,
      color: part.presentation?.color ?? '#3B82F6',
    })),
    strategy: record.cutSettings?.strategy ?? 'bssf',
    cutPreference: record.cutSettings?.cutPreference ?? 'rip_first',
  };
}

export function validateBenchMateProject(record) {
  const errors = [];
  const warnings = [];

  if (!isObject(record)) {
    return { valid: false, errors: ['The project must be an object.'], warnings };
  }

  if (record.schemaVersion !== BENCHMATE_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${BENCHMATE_SCHEMA_VERSION}.`);
  }

  if (!isObject(record.project)) {
    errors.push('project must be an object.');
  } else {
    if (!record.project.id) errors.push('project.id is required.');
    if (record.project.units !== CANONICAL_UNITS) errors.push('project.units must be mm.');
    if (!record.project.activeRevisionId) errors.push('project.activeRevisionId is required.');
    if (record.project.supplyRequirementIds !== undefined
      && !Array.isArray(record.project.supplyRequirementIds)) {
      errors.push('project.supplyRequirementIds must be an array.');
    }
    if (record.project.toolRequirementIds !== undefined
      && !Array.isArray(record.project.toolRequirementIds)) {
      errors.push('project.toolRequirementIds must be an array.');
    }
  }

  if (!Array.isArray(record.designRevisions)) {
    errors.push('designRevisions must be an array.');
  }

  if (!Array.isArray(record.parts)) {
    errors.push('parts must be an array.');
  }

  const supplyRequirements = record.supplyRequirements ?? [];
  if (!Array.isArray(supplyRequirements)) {
    errors.push('supplyRequirements must be an array.');
  } else {
    const requirementIds = new Set();
    for (const [index, requirement] of supplyRequirements.entries()) {
      const validation = validateSupplyRequirement(requirement);
      if (!validation.valid) {
        errors.push(...validation.errors.map(error => `supplyRequirements[${index}]: ${error}`));
      }
      if (requirementIds.has(requirement?.id)) {
        errors.push(`supplyRequirements[${index}].id must be unique.`);
      }
      if (requirement?.id) requirementIds.add(requirement.id);
      if (requirement?.projectId !== record.project?.id) {
        errors.push(`supplyRequirements[${index}].projectId must match project.id.`);
      }
    }

    const projectRequirementIds = record.project?.supplyRequirementIds ?? [];
    if (Array.isArray(record.project?.supplyRequirementIds)) {
      if (projectRequirementIds.length !== requirementIds.size
        || projectRequirementIds.some(id => !requirementIds.has(id))) {
        errors.push('project.supplyRequirementIds must reference the saved supply requirements.');
      }
    }
  }

  const toolRequirements = record.toolRequirements ?? [];
  if (!Array.isArray(toolRequirements)) {
    errors.push('toolRequirements must be an array.');
  } else {
    const requirementIds = new Set();
    for (const [index, requirement] of toolRequirements.entries()) {
      const validation = validateToolRequirement(requirement);
      if (!validation.valid) {
        errors.push(...validation.errors.map(error => `toolRequirements[${index}]: ${error}`));
      }
      if (requirementIds.has(requirement?.id)) {
        errors.push(`toolRequirements[${index}].id must be unique.`);
      }
      if (requirement?.id) requirementIds.add(requirement.id);
      if (requirement?.projectId !== record.project?.id) {
        errors.push(`toolRequirements[${index}].projectId must match project.id.`);
      }
    }

    const projectRequirementIds = record.project?.toolRequirementIds ?? [];
    if (Array.isArray(record.project?.toolRequirementIds)) {
      if (projectRequirementIds.length !== requirementIds.size
        || projectRequirementIds.some(id => !requirementIds.has(id))) {
        errors.push('project.toolRequirementIds must reference the saved tool requirements.');
      }
    }
  }

  if (!isObject(record.cutStock)) {
    errors.push('cutStock must be an object.');
  } else {
    if (record.cutStock.sourceMaterialStockId !== undefined
      && record.cutStock.sourceMaterialStockId !== null
      && typeof record.cutStock.sourceMaterialStockId !== 'string') {
      errors.push('cutStock.sourceMaterialStockId must be null or a string.');
    }

    const stockDimensions = record.cutStock.dimensions;
    if (!isObject(stockDimensions)) {
      errors.push('cutStock.dimensions must be an object.');
    } else {
      for (const field of ['width', 'length']) {
        if (!Number.isFinite(stockDimensions[field]) || stockDimensions[field] < 0) {
          errors.push(`cutStock.dimensions.${field} must be a non-negative number.`);
        }
      }
    }

    for (const field of ['kerf', 'margin']) {
      if (!Number.isFinite(record.cutStock[field]) || record.cutStock[field] < 0) {
        errors.push(`cutStock.${field} must be a non-negative number.`);
      }
    }
  }

  if (Array.isArray(record.designRevisions)) {
    const revisionIds = new Set(record.designRevisions.map(revision => revision?.id));
    for (const [index, revision] of record.designRevisions.entries()) {
      if (!isObject(revision) || !revision.id) {
        errors.push(`designRevisions[${index}].id is required.`);
      }
      if (revision?.projectId !== record.project?.id) {
        errors.push(`designRevisions[${index}].projectId must match project.id.`);
      }
      if (!Array.isArray(revision?.partIds)) {
        errors.push(`designRevisions[${index}].partIds must be an array.`);
      }
    }

    if (record.project?.activeRevisionId && !revisionIds.has(record.project.activeRevisionId)) {
      errors.push('project.activeRevisionId must reference a design revision.');
    }
  }

  if (Array.isArray(record.parts)) {
    const partIds = new Set();
    for (const [index, part] of record.parts.entries()) {
      if (!isObject(part) || !part.id) {
        errors.push(`parts[${index}].id is required.`);
        continue;
      }
      if (partIds.has(part.id)) errors.push(`parts[${index}].id must be unique.`);
      partIds.add(part.id);
      if (!Number.isInteger(part.quantity) || part.quantity < 0) {
        errors.push(`parts[${index}].quantity must be a non-negative integer.`);
      }
      if (!isObject(part.dimensions)) {
        errors.push(`parts[${index}].dimensions must be an object.`);
        continue;
      }
      for (const field of ['width', 'length']) {
        if (!Number.isFinite(part.dimensions[field]) || part.dimensions[field] < 0) {
          errors.push(`parts[${index}].dimensions.${field} must be a non-negative number.`);
        }
      }
      if (part.dimensions.thickness !== null
        && (!Number.isFinite(part.dimensions.thickness) || part.dimensions.thickness < 0)) {
        errors.push(`parts[${index}].dimensions.thickness must be null or non-negative.`);
      }
      if (part.revisionId !== record.project?.activeRevisionId) {
        warnings.push(`parts[${index}] is not part of the active revision.`);
      }
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

export function serializeBenchMateProject(record) {
  const validation = validateBenchMateProject(record);
  if (!validation.valid) {
    throw new Error(`Cannot serialize invalid BenchMate project: ${validation.errors.join(' ')}`);
  }

  return JSON.stringify(record, null, 2);
}

export function parseBenchMateProject(serialized) {
  let record;

  try {
    record = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
  } catch {
    throw new Error('BenchMate project JSON could not be parsed.');
  }

  const normalizedRecord = {
    ...record,
    project: {
      ...record.project,
      supplyRequirementIds: record.project?.supplyRequirementIds
        ?? (Array.isArray(record.supplyRequirements)
          ? record.supplyRequirements.map(requirement => requirement?.id).filter(Boolean)
          : []),
      toolRequirementIds: record.project?.toolRequirementIds
        ?? (Array.isArray(record.toolRequirements)
          ? record.toolRequirements.map(requirement => requirement?.id).filter(Boolean)
          : []),
    },
    supplyRequirements: record.supplyRequirements ?? [],
    toolRequirements: record.toolRequirements ?? [],
  };

  const validation = validateBenchMateProject(normalizedRecord);
  if (!validation.valid) {
    throw new Error(`Invalid BenchMate project JSON: ${validation.errors.join(' ')}`);
  }

  return normalizedRecord;
}
