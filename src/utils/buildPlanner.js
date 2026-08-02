export const BUILD_STEP_TYPES = Object.freeze([
  { value: 'preparation', label: 'Preparation' },
  { value: 'cutting', label: 'Cutting' },
  { value: 'joinery', label: 'Joinery' },
  { value: 'assembly', label: 'Assembly' },
  { value: 'sanding', label: 'Sanding' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'waiting', label: 'Waiting / cure time' },
  { value: 'other', label: 'Other' },
]);

export const BUILD_STEP_STATUSES = Object.freeze([
  { value: 'not-started', label: 'Not started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'complete', label: 'Complete' },
]);

export const BUILD_PLAN_STATUSES = Object.freeze([
  { value: 'draft', label: 'Draft' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'complete', label: 'Complete' },
]);

const VALID_STEP_TYPES = new Set(BUILD_STEP_TYPES.map(option => option.value));
const VALID_STEP_STATUSES = new Set(BUILD_STEP_STATUSES.map(option => option.value));
const VALID_PLAN_STATUSES = new Set(BUILD_PLAN_STATUSES.map(option => option.value));

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

function readList(value) {
  const values = Array.isArray(value) ? value : value === undefined ? [] : [value];
  return [...new Set(values.map(readText).filter(Boolean))];
}

function createId(prefix) {
  if (globalThis.crypto?.randomUUID) return `${prefix}_${globalThis.crypto.randomUUID()}`;
  return `${prefix}_${Date.now()}`;
}

export function createBuildPlanId() {
  return createId('build_plan');
}

export function createBuildStageId() {
  return createId('build_stage');
}

export function createBuildStepId() {
  return createId('build_step');
}

export function createBuildStage(input = {}, options = {}) {
  const source = isObject(input) ? input : {};
  const sequence = readInteger(options.sequence ?? source.sequence) ?? 1;
  const stage = {
    id: readText(options.id ?? source.id) || createBuildStageId(),
    name: readText(source.name),
    sequence,
    stepIds: readList(source.stepIds),
  };

  if (!stage.name) throw new Error('Build stage name is required.');
  if (!Number.isInteger(stage.sequence) || stage.sequence <= 0) {
    throw new Error('Build stage sequence must be a positive integer.');
  }

  return stage;
}

export function createBuildStep(input = {}, options = {}) {
  const source = isObject(input) ? input : {};
  const step = {
    id: readText(options.id ?? source.id) || createBuildStepId(),
    stageId: readText(options.stageId ?? source.stageId),
    sequence: readInteger(options.sequence ?? source.sequence) ?? 1,
    name: readText(source.name),
    type: readText(source.type) || 'other',
    dependsOn: readList(source.dependsOn),
    partIds: readList(source.partIds),
    toolRequirementIds: readList(source.toolRequirementIds),
    supplyRequirementIds: readList(source.supplyRequirementIds),
    estimatedMinutes: readInteger(source.estimatedMinutes) ?? 0,
    waitMinutes: readInteger(source.waitMinutes) ?? 0,
    status: readText(source.status) || 'not-started',
    notes: readText(source.notes),
    safetyNotes: readList(source.safetyNotes),
  };

  const validation = validateBuildStep(step);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return step;
}

export function validateBuildStep(step) {
  const errors = [];

  if (!isObject(step)) return { valid: false, errors: ['Build step must be an object.'] };
  if (!readText(step.id)) errors.push('Build step id is required.');
  if (!readText(step.stageId)) errors.push('Build step stageId is required.');
  if (!readText(step.name)) errors.push('Build step name is required.');
  if (!Number.isInteger(step.sequence) || step.sequence <= 0) {
    errors.push('Build step sequence must be a positive integer.');
  }
  if (!VALID_STEP_TYPES.has(step.type)) errors.push('Build step type is invalid.');
  if (!VALID_STEP_STATUSES.has(step.status)) errors.push('Build step status is invalid.');
  for (const field of ['dependsOn', 'partIds', 'toolRequirementIds', 'supplyRequirementIds', 'safetyNotes']) {
    if (!Array.isArray(step[field])) errors.push(`Build step ${field} must be an array.`);
  }
  for (const field of ['estimatedMinutes', 'waitMinutes']) {
    if (!Number.isInteger(step[field]) || step[field] < 0) {
      errors.push(`Build step ${field} must be a non-negative integer.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function hasDependencyCycle(steps) {
  const stepMap = new Map(steps.map(step => [step.id, step]));
  const visiting = new Set();
  const visited = new Set();

  function visit(stepId) {
    if (visiting.has(stepId)) return true;
    if (visited.has(stepId)) return false;

    visiting.add(stepId);
    const step = stepMap.get(stepId);
    if (step?.dependsOn.some(dependencyId => visit(dependencyId))) return true;
    visiting.delete(stepId);
    visited.add(stepId);
    return false;
  }

  return steps.some(step => visit(step.id));
}

function derivePlanStatus(steps) {
  if (steps.length === 0) return 'draft';
  if (steps.every(step => step.status === 'complete')) return 'complete';
  if (steps.some(step => step.status === 'complete' || step.status === 'in-progress')) {
    return 'in-progress';
  }
  return 'draft';
}

function rebuildStageStepIds(stages, steps) {
  return stages.map(stage => ({
    ...stage,
    stepIds: steps
      .filter(step => step.stageId === stage.id)
      .sort((a, b) => a.sequence - b.sequence)
      .map(step => step.id),
  }));
}

export function validateBuildPlan(plan) {
  const errors = [];

  if (!isObject(plan)) return { valid: false, errors: ['Build plan must be an object.'] };
  if (!readText(plan.id)) errors.push('Build plan id is required.');
  if (!readText(plan.projectId)) errors.push('Build plan projectId is required.');
  if (!readText(plan.name)) errors.push('Build plan name is required.');
  if (!VALID_PLAN_STATUSES.has(plan.status)) errors.push('Build plan status is invalid.');
  if (!Array.isArray(plan.stages)) errors.push('Build plan stages must be an array.');
  if (!Array.isArray(plan.steps)) errors.push('Build plan steps must be an array.');

  if (!Array.isArray(plan.stages) || !Array.isArray(plan.steps)) {
    return { valid: errors.length === 0, errors };
  }

  const stageIds = new Set();
  for (const [index, stage] of plan.stages.entries()) {
    if (!isObject(stage) || !readText(stage.id)) {
      errors.push(`buildPlan.stages[${index}].id is required.`);
      continue;
    }
    if (stageIds.has(stage.id)) errors.push(`buildPlan.stages[${index}].id must be unique.`);
    stageIds.add(stage.id);
    if (!readText(stage.name)) errors.push(`buildPlan.stages[${index}].name is required.`);
    if (!Number.isInteger(stage.sequence) || stage.sequence <= 0) {
      errors.push(`buildPlan.stages[${index}].sequence must be a positive integer.`);
    }
    if (!Array.isArray(stage.stepIds)) errors.push(`buildPlan.stages[${index}].stepIds must be an array.`);
  }

  const stepIds = new Set();
  for (const [index, step] of plan.steps.entries()) {
    const validation = validateBuildStep(step);
    if (!validation.valid) errors.push(...validation.errors.map(error => `buildPlan.steps[${index}]: ${error}`));
    if (stepIds.has(step?.id)) errors.push(`buildPlan.steps[${index}].id must be unique.`);
    if (step?.id) stepIds.add(step.id);
    if (step?.stageId && !stageIds.has(step.stageId)) {
      errors.push(`buildPlan.steps[${index}].stageId must reference a stage.`);
    }
  }

  const referencedStepIds = new Set();
  for (const [index, stage] of plan.stages.entries()) {
    for (const stepId of Array.isArray(stage.stepIds) ? stage.stepIds : []) {
      if (!stepIds.has(stepId)) errors.push(`buildPlan.stages[${index}].stepIds references an unknown step.`);
      if (referencedStepIds.has(stepId)) errors.push(`buildPlan step ${stepId} is referenced by more than one stage.`);
      referencedStepIds.add(stepId);
    }
  }
  if (referencedStepIds.size !== stepIds.size) errors.push('Every build step must be referenced by its stage.');

  for (const [index, step] of plan.steps.entries()) {
    for (const dependencyId of Array.isArray(step?.dependsOn) ? step.dependsOn : []) {
      if (!stepIds.has(dependencyId)) errors.push(`buildPlan.steps[${index}].dependsOn references an unknown step.`);
      if (dependencyId === step.id) errors.push(`buildPlan.steps[${index}] cannot depend on itself.`);
    }
  }
  if (hasDependencyCycle(plan.steps)) errors.push('Build plan dependencies cannot contain a cycle.');

  return { valid: errors.length === 0, errors };
}

export function createBuildPlan(input = {}, options = {}) {
  const source = isObject(input) ? input : {};
  const now = options.now ?? new Date().toISOString();
  const rawStages = Array.isArray(source.stages) ? source.stages : [];
  const stages = rawStages.map((stage, index) => createBuildStage(stage, {
    id: stage?.id,
    sequence: index + 1,
  }));
  const stageIds = new Set(stages.map(stage => stage.id));
  const rawSteps = Array.isArray(source.steps) ? source.steps : [];
  const steps = rawSteps.map((step, index) => createBuildStep(step, {
    id: step?.id,
    stageId: stageIds.has(step?.stageId) ? step.stageId : undefined,
    sequence: step?.sequence ?? index + 1,
  }));
  const plan = {
    id: readText(options.id ?? source.id) || createBuildPlanId(),
    projectId: readText(options.projectId ?? source.projectId),
    name: readText(source.name) || 'Workshop build plan',
    status: derivePlanStatus(steps),
    stages: rebuildStageStepIds(stages, steps),
    steps,
    createdAt: options.createdAt ?? source.createdAt ?? now,
    updatedAt: options.updatedAt ?? now,
  };

  const validation = validateBuildPlan(plan);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return plan;
}

export function updateBuildPlan(existing, input = {}, options = {}) {
  if (!isObject(existing)) throw new Error('The existing build plan is invalid.');
  return createBuildPlan({ ...existing, ...input }, {
    ...options,
    id: existing.id,
    projectId: options.projectId ?? existing.projectId,
    createdAt: existing.createdAt,
  });
}

export function addBuildStage(plan, input = {}, options = {}) {
  return updateBuildPlan(plan, {
    stages: [...plan.stages, createBuildStage(input, { sequence: plan.stages.length + 1 })],
  }, options);
}

export function updateBuildStage(plan, stageId, input = {}, options = {}) {
  return updateBuildPlan(plan, {
    stages: plan.stages.map(stage => (
      stage.id === stageId ? createBuildStage({ ...stage, ...input }, { id: stage.id, sequence: stage.sequence }) : stage
    )),
  }, options);
}

export function removeBuildStage(plan, stageId, options = {}) {
  const removedStepIds = new Set(plan.steps.filter(step => step.stageId === stageId).map(step => step.id));
  return updateBuildPlan(plan, {
    stages: plan.stages.filter(stage => stage.id !== stageId),
    steps: plan.steps
      .filter(step => step.stageId !== stageId)
      .map(step => ({
        ...step,
        dependsOn: step.dependsOn.filter(dependencyId => !removedStepIds.has(dependencyId)),
      })),
  }, options);
}

export function addBuildStep(plan, stageId, input = {}, options = {}) {
  const stage = plan.stages.find(candidate => candidate.id === stageId);
  if (!stage) throw new Error('The selected build stage does not exist.');
  const stageStepCount = plan.steps.filter(step => step.stageId === stageId).length;
  const step = createBuildStep(input, {
    stageId,
    sequence: stageStepCount + 1,
  });
  return updateBuildPlan(plan, { steps: [...plan.steps, step] }, options);
}

export function updateBuildStep(plan, stepId, input = {}, options = {}) {
  return updateBuildPlan(plan, {
    steps: plan.steps.map(step => (
      step.id === stepId ? createBuildStep({ ...step, ...input }, { id: step.id, stageId: step.stageId, sequence: step.sequence }) : step
    )),
  }, options);
}

export function removeBuildStep(plan, stepId, options = {}) {
  return updateBuildPlan(plan, {
    steps: plan.steps
      .filter(step => step.id !== stepId)
      .map(step => ({ ...step, dependsOn: step.dependsOn.filter(dependencyId => dependencyId !== stepId) })),
  }, options);
}

export function getBuildStepProgress(plan) {
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  const stepMap = new Map(steps.map(step => [step.id, step]));
  return steps.map(step => {
    const blockingDependencies = step.dependsOn
      .map(dependencyId => stepMap.get(dependencyId))
      .filter(dependency => dependency && dependency.status !== 'complete');
    return {
      step,
      blockingDependencies,
      isBlocked: step.status !== 'complete' && blockingDependencies.length > 0,
      isAvailable: step.status !== 'complete' && blockingDependencies.length === 0,
    };
  });
}

export function getBuildPlanSummary(plan) {
  const progress = getBuildStepProgress(plan);
  const steps = progress.map(item => item.step);
  const completedSteps = steps.filter(step => step.status === 'complete').length;
  const inProgressSteps = steps.filter(step => step.status === 'in-progress').length;
  const blockedSteps = progress.filter(item => item.isBlocked || item.step.status === 'blocked').length;
  const estimatedMinutes = steps.reduce((total, step) => total + step.estimatedMinutes, 0);
  const waitMinutes = steps.reduce((total, step) => total + step.waitMinutes, 0);
  const status = derivePlanStatus(steps);

  return {
    status,
    statusLabel: BUILD_PLAN_STATUSES.find(option => option.value === status)?.label ?? status,
    totalStages: Array.isArray(plan?.stages) ? plan.stages.length : 0,
    totalSteps: steps.length,
    completedSteps,
    inProgressSteps,
    blockedSteps,
    availableSteps: progress.filter(item => item.isAvailable).length,
    estimatedMinutes,
    waitMinutes,
    progressPercent: steps.length ? Math.round((completedSteps / steps.length) * 100) : 0,
    progress,
  };
}

export function cloneBuildPlan(plan, projectId, options = {}) {
  if (!plan) return null;
  const stageIdMap = new Map(plan.stages.map(stage => [stage.id, createBuildStageId()]));
  const stepIdMap = new Map(plan.steps.map(step => [step.id, createBuildStepId()]));
  const clonedStages = plan.stages.map(stage => ({
    ...stage,
    id: stageIdMap.get(stage.id),
  }));
  const clonedSteps = plan.steps.map(step => ({
    ...step,
    id: stepIdMap.get(step.id),
    stageId: stageIdMap.get(step.stageId),
    dependsOn: step.dependsOn.map(dependencyId => stepIdMap.get(dependencyId)).filter(Boolean),
  }));

  return createBuildPlan({
    ...plan,
    id: undefined,
    projectId,
    stages: clonedStages,
    steps: clonedSteps,
  }, {
    projectId,
    createdAt: options.createdAt,
    now: options.now,
  });
}
