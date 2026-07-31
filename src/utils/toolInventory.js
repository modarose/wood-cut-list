export const TOOL_STORAGE_KEY = 'benchmate.tools.v1';

export const TOOL_CATEGORIES = Object.freeze([
  { value: 'saw', label: 'Saw' },
  { value: 'router', label: 'Router' },
  { value: 'drill', label: 'Drill / driver' },
  { value: 'sander', label: 'Sander' },
  { value: 'hand-tool', label: 'Hand tool' },
  { value: 'measuring', label: 'Measuring' },
  { value: 'clamp', label: 'Clamp / jig' },
  { value: 'safety', label: 'Safety' },
  { value: 'other', label: 'Other' },
]);

export const TOOL_AVAILABILITIES = Object.freeze([
  { value: 'available', label: 'Available' },
  { value: 'unavailable', label: 'Unavailable' },
  { value: 'maintenance', label: 'Needs maintenance' },
]);

export const TOOL_CONDITIONS = Object.freeze([
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'damaged', label: 'Damaged' },
  { value: 'unknown', label: 'Unknown' },
]);

export const TOOL_CAPABILITIES = Object.freeze([
  { value: 'cross-cutting', label: 'Cross-cutting' },
  { value: 'rip-cutting', label: 'Rip-cutting' },
  { value: 'routing', label: 'Routing' },
  { value: 'drilling', label: 'Drilling' },
  { value: 'sanding', label: 'Sanding' },
  { value: 'jointing', label: 'Jointing' },
  { value: 'planing', label: 'Planing' },
  { value: 'measuring', label: 'Measuring' },
  { value: 'clamping', label: 'Clamping' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'dust-collection', label: 'Dust collection' },
  { value: 'other', label: 'Other' },
]);

const VALID_CATEGORIES = new Set(TOOL_CATEGORIES.map(option => option.value));
const VALID_AVAILABILITIES = new Set(TOOL_AVAILABILITIES.map(option => option.value));
const VALID_CONDITIONS = new Set(TOOL_CONDITIONS.map(option => option.value));
const VALID_CAPABILITIES = new Set(TOOL_CAPABILITIES.map(option => option.value));

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readBoolean(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function readList(value) {
  const values = Array.isArray(value) ? value : typeof value === 'string' ? value.split(',') : [];
  return [...new Set(values.map(readText).filter(Boolean))];
}

function readDate(value) {
  const date = readText(value);
  return date || null;
}

export function createToolId() {
  if (globalThis.crypto?.randomUUID) {
    return `tool_${globalThis.crypto.randomUUID()}`;
  }

  return `tool_${Date.now()}`;
}

export function validateTool(tool) {
  const errors = [];

  if (!isObject(tool)) {
    return { valid: false, errors: ['Tool must be an object.'] };
  }

  if (!readText(tool.id)) errors.push('Tool id is required.');
  if (!readText(tool.name)) errors.push('Tool name is required.');
  if (!VALID_CATEGORIES.has(tool.category)) errors.push('Tool category is invalid.');
  if (!VALID_AVAILABILITIES.has(tool.availability)) errors.push('Tool availability is invalid.');
  if (!VALID_CONDITIONS.has(tool.condition)) errors.push('Tool condition is invalid.');
  if (typeof tool.owned !== 'boolean') errors.push('Tool owned must be boolean.');

  if (!Array.isArray(tool.capabilities)) {
    errors.push('Tool capabilities must be an array.');
  } else {
    const capabilitySet = new Set();
    for (const [index, capability] of tool.capabilities.entries()) {
      if (!VALID_CAPABILITIES.has(capability)) {
        errors.push(`Tool capabilities[${index}] is not a recognised capability.`);
      }
      if (capabilitySet.has(capability)) errors.push('Tool capabilities must not contain duplicates.');
      capabilitySet.add(capability);
    }
  }

  if (!Array.isArray(tool.accessories)) {
    errors.push('Tool accessories must be an array.');
  } else if (tool.accessories.some(accessory => !readText(accessory))) {
    errors.push('Tool accessories cannot contain empty values.');
  }

  if (tool.lastMaintenanceAt !== null
    && tool.lastMaintenanceAt !== undefined
    && (!readText(tool.lastMaintenanceAt) || Number.isNaN(Date.parse(tool.lastMaintenanceAt)))) {
    errors.push('Tool lastMaintenanceAt must be null or a valid date.');
  }

  return { valid: errors.length === 0, errors };
}

export function createTool(input = {}, options = {}) {
  const source = isObject(input) ? input : {};
  const now = options.now ?? new Date().toISOString();
  const tool = {
    id: readText(options.id ?? source.id) || createToolId(),
    name: readText(source.name),
    category: readText(source.category) || 'other',
    brand: readText(source.brand),
    model: readText(source.model),
    owned: readBoolean(source.owned, true),
    availability: readText(source.availability) || 'available',
    condition: readText(source.condition) || 'good',
    location: readText(source.location),
    capabilities: readList(source.capabilities),
    accessories: readList(source.accessories),
    maintenanceNotes: readText(source.maintenanceNotes),
    lastMaintenanceAt: readDate(source.lastMaintenanceAt),
    createdAt: options.createdAt ?? source.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };

  const validation = validateTool(tool);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return tool;
}

export function updateTool(existing, input = {}, options = {}) {
  if (!isObject(existing)) throw new Error('The existing tool record is invalid.');

  return createTool({ ...existing, ...input }, {
    ...options,
    id: existing.id,
    createdAt: existing.createdAt,
  });
}

function getDefaultStorage() {
  if (typeof window === 'undefined') return null;
  return window.localStorage;
}

function parseStoredTool(value) {
  try {
    return validateTool(value).valid ? value : null;
  } catch {
    return null;
  }
}

export function loadStoredTools(storage = getDefaultStorage()) {
  if (!storage) return [];

  try {
    const serialized = storage.getItem(TOOL_STORAGE_KEY);
    if (!serialized) return [];
    const records = JSON.parse(serialized);
    if (!Array.isArray(records)) return [];
    return records.map(parseStoredTool).filter(Boolean);
  } catch {
    return [];
  }
}

export function saveStoredTools(tools, storage = getDefaultStorage()) {
  if (!storage || !Array.isArray(tools)) return false;
  if (tools.some(tool => !validateTool(tool).valid)) return false;

  try {
    storage.setItem(TOOL_STORAGE_KEY, JSON.stringify(tools));
    return true;
  } catch {
    return false;
  }
}

export function upsertStoredTool(tool, tools, storage = getDefaultStorage()) {
  const validation = validateTool(tool);
  if (!validation.valid || !Array.isArray(tools)) {
    return { tools, saved: false, error: validation.errors.join(' ') };
  }

  const nextTools = [
    ...tools.filter(candidate => candidate.id !== tool.id),
    tool,
  ];

  return {
    tools: nextTools,
    saved: saveStoredTools(nextTools, storage),
    error: '',
  };
}

export function removeStoredTool(toolId, tools, storage = getDefaultStorage()) {
  if (!Array.isArray(tools)) return { tools, saved: false };

  const nextTools = tools.filter(tool => tool.id !== toolId);
  return {
    tools: nextTools,
    saved: saveStoredTools(nextTools, storage),
  };
}
