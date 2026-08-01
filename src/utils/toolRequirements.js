import {
  TOOL_CAPABILITIES,
  validateTool,
} from './toolInventory.js';

const VALID_CAPABILITIES = new Set(TOOL_CAPABILITIES.map(option => option.value));

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readInteger(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(number) ? number : null;
}

export function createToolRequirementId() {
  if (globalThis.crypto?.randomUUID) {
    return `tool_requirement_${globalThis.crypto.randomUUID()}`;
  }

  return `tool_requirement_${Date.now()}`;
}

export function validateToolRequirement(requirement) {
  const errors = [];

  if (!isObject(requirement)) {
    return { valid: false, errors: ['Tool requirement must be an object.'] };
  }

  if (!readText(requirement.id)) errors.push('Tool requirement id is required.');
  if (!readText(requirement.projectId)) errors.push('Tool requirement projectId is required.');
  if (!VALID_CAPABILITIES.has(requirement.capability)) {
    errors.push('Tool requirement capability is invalid.');
  }
  if (!Number.isInteger(requirement.quantity) || requirement.quantity <= 0) {
    errors.push('Tool requirement quantity must be a positive integer.');
  }

  return { valid: errors.length === 0, errors };
}

export function createToolRequirement(input = {}, options = {}) {
  const source = isObject(input) ? input : {};
  const now = options.now ?? new Date().toISOString();
  const requirement = {
    id: readText(options.id ?? source.id) || createToolRequirementId(),
    projectId: readText(options.projectId ?? source.projectId),
    capability: readText(source.capability),
    quantity: readInteger(source.quantity),
    notes: readText(source.notes),
    createdAt: options.createdAt ?? source.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };

  const validation = validateToolRequirement(requirement);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return requirement;
}

export function updateToolRequirement(existing, input = {}, options = {}) {
  if (!isObject(existing)) throw new Error('The existing tool requirement is invalid.');

  return createToolRequirement({ ...existing, ...input }, {
    ...options,
    id: existing.id,
    projectId: options.projectId ?? existing.projectId,
    createdAt: existing.createdAt,
  });
}

function countLabel(value, singular, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

function getRowStatus(readyCount, attentionCount, nonOwnedCount, requiredQuantity) {
  if (readyCount >= requiredQuantity) return 'covered';
  if (readyCount > 0) return 'partial';
  if (attentionCount > 0 || nonOwnedCount > 0) return 'needs-review';
  return 'missing';
}

function getRowReason(status, readyCount, attentionCount, nonOwnedCount, requiredQuantity) {
  if (status === 'covered') {
    return `${countLabel(readyCount, 'owned available tool')} cover this capability.`;
  }
  if (status === 'partial') {
    const shortfall = Math.max(0, requiredQuantity - readyCount);
    const attentionMessage = attentionCount > 0
      ? ` ${countLabel(attentionCount, 'matching owned tool')} need review.`
      : '';
    return `${countLabel(readyCount, 'owned available tool')}; ${countLabel(shortfall, 'tool')} still required.${attentionMessage}`;
  }
  if (status === 'needs-review') {
    const messages = [];
    if (attentionCount > 0) {
      messages.push(`${countLabel(attentionCount, 'matching owned tool')} are unavailable, in maintenance or need condition review`);
    }
    if (nonOwnedCount > 0) {
      messages.push(`${countLabel(nonOwnedCount, 'matching non-owned tool')} are reference, borrowed or hired candidates`);
    }
    return `${messages.join('; ')}.`;
  }
  return 'No matching owned tool capability was found.';
}

export function getToolRequirementCheck(requirements = [], tools = []) {
  const validTools = Array.isArray(tools)
    ? tools.filter(tool => validateTool(tool).valid)
    : [];
  const rows = (Array.isArray(requirements) ? requirements : []).map((requirement, index) => {
    const validation = validateToolRequirement(requirement);
    if (!validation.valid) {
      return {
        id: requirement?.id ?? `invalid_tool_requirement_${index + 1}`,
        requirement,
        status: 'needs-review',
        reason: validation.errors.join(' '),
        requiredQuantity: Number.isInteger(requirement?.quantity) ? requirement.quantity : 0,
        readyCount: 0,
        attentionCount: 0,
        nonOwnedCount: 0,
        matchingTools: [],
        readyTools: [],
        attentionTools: [],
        nonOwnedTools: [],
      };
    }

    const matchingTools = validTools.filter(tool => tool.capabilities.includes(requirement.capability));
    const readyTools = matchingTools.filter(tool => (
      tool.owned
      && tool.availability === 'available'
      && tool.condition !== 'damaged'
      && tool.condition !== 'unknown'
    ));
    const attentionTools = matchingTools.filter(tool => tool.owned && !readyTools.includes(tool));
    const nonOwnedTools = matchingTools.filter(tool => !tool.owned);
    const readyCount = readyTools.length;
    const attentionCount = attentionTools.length;
    const nonOwnedCount = nonOwnedTools.length;
    const status = getRowStatus(
      readyCount,
      attentionCount,
      nonOwnedCount,
      requirement.quantity,
    );

    return {
      id: requirement.id,
      requirement,
      status,
      reason: getRowReason(
        status,
        readyCount,
        attentionCount,
        nonOwnedCount,
        requirement.quantity,
      ),
      requiredQuantity: requirement.quantity,
      readyCount,
      attentionCount,
      nonOwnedCount,
      matchingTools,
      readyTools,
      attentionTools,
      nonOwnedTools,
    };
  });

  const summary = {
    totalRequirements: rows.length,
    covered: rows.filter(row => row.status === 'covered').length,
    partial: rows.filter(row => row.status === 'partial').length,
    needsReview: rows.filter(row => row.status === 'needs-review').length,
    missing: rows.filter(row => row.status === 'missing').length,
  };

  let status = 'covered';
  if (rows.length === 0) status = 'not-started';
  else if (summary.partial || summary.needsReview || summary.missing) status = 'needs-attention';

  const statusLabel = {
    'not-started': 'No tool requirements',
    covered: 'Tools feasible',
    'needs-attention': 'Tool gaps',
  }[status];

  return { rows, summary, status, statusLabel };
}
