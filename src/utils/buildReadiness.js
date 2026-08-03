import { getBuildStepProgress } from './buildPlanner.js';
import { getProjectResourceCheck } from './projectReadiness.js';
import { getSupplyRequirementCheck } from './supplyRequirements.js';

export const BUILD_READINESS_STATUS_LABELS = Object.freeze({
  'not-started': 'No steps yet',
  ready: 'Ready to build',
  'needs-review': 'Review required',
  blocked: 'Build blocked',
  complete: 'Build complete',
});

function getIssue(type, severity, message) {
  return { type, severity, message };
}

function getMaterialIssues(step, partsById, materialRows, selectedStockCheck) {
  const blockers = [];
  const reviews = [];

  for (const partId of step.partIds) {
    if (!partsById.has(partId)) {
      blockers.push(getIssue(
        'part',
        'blocked',
        `Cut-list part ${partId} is no longer available in this project.`,
      ));
      continue;
    }

    const row = materialRows.get(partId);
    if (!row || row.status === 'unmatched') {
      blockers.push(getIssue(
        'material',
        'blocked',
        `${row?.name ?? partsById.get(partId)?.name ?? partId} has no available material candidate.`,
      ));
    } else if (row.status === 'planned') {
      reviews.push(getIssue(
        'material',
        'needs-review',
        `${row.name} depends on a planned material purchase.`,
      ));
    } else if (row.status === 'needs-review') {
      reviews.push(getIssue(
        'material',
        'needs-review',
        `${row.name} needs dimension or quantity review before cutting.`,
      ));
    }
  }

  if (step.partIds.length > 0 && selectedStockCheck) {
    if (selectedStockCheck.status === 'quantity-gap') {
      blockers.push(getIssue('material', 'blocked', selectedStockCheck.message));
    } else if (selectedStockCheck.status === 'dimension-gap') {
      blockers.push(getIssue('material', 'blocked', selectedStockCheck.message));
    } else if (selectedStockCheck.status === 'needs-review') {
      reviews.push(getIssue('material', 'needs-review', selectedStockCheck.message));
    } else if (selectedStockCheck.source === 'planned') {
      reviews.push(getIssue(
        'material',
        'needs-review',
        'The selected stock is a planned purchase and must be obtained before workshop execution.',
      ));
    }
  }

  return { blockers, reviews };
}

function getToolIssues(step, toolRequirementsById, toolRows) {
  const blockers = [];
  const reviews = [];

  for (const requirementId of step.toolRequirementIds) {
    if (!toolRequirementsById.has(requirementId)) {
      blockers.push(getIssue(
        'tool',
        'blocked',
        `Tool requirement ${requirementId} is no longer available in this project.`,
      ));
      continue;
    }

    const row = toolRows.get(requirementId);
    if (!row || row.status === 'missing') {
      const capability = typeof toolRequirementsById.get(requirementId).capability === 'string'
        ? toolRequirementsById.get(requirementId).capability.replaceAll('-', ' ')
        : requirementId;
      blockers.push(getIssue(
        'tool',
        'blocked',
        `${capability} has no matching owned tool.`,
      ));
    } else if (row.status !== 'covered') {
      reviews.push(getIssue('tool', 'needs-review', row.reason));
    }
  }

  return { blockers, reviews };
}

function getSupplyIssues(step, supplyRequirementsById, supplyRows) {
  const blockers = [];
  const reviews = [];

  for (const requirementId of step.supplyRequirementIds) {
    if (!supplyRequirementsById.has(requirementId)) {
      blockers.push(getIssue(
        'supply',
        'blocked',
        `Supply requirement ${requirementId} is no longer available in this project.`,
      ));
      continue;
    }

    const row = supplyRows.get(requirementId);
    if (!row || row.status === 'missing') {
      const name = typeof supplyRequirementsById.get(requirementId).name === 'string'
        ? supplyRequirementsById.get(requirementId).name
        : requirementId;
      blockers.push(getIssue(
        'supply',
        'blocked',
        `${name} is not available or planned.`,
      ));
    } else if (row.status !== 'owned') {
      reviews.push(getIssue('supply', 'needs-review', row.reason));
    }
  }

  return { blockers, reviews };
}

function getDependencyIssues(step, stepMap, blockingDependencies) {
  const blockers = blockingDependencies.map(dependency => getIssue(
    'dependency',
    'blocked',
    `Complete “${dependency.name}” before starting this step.`,
  ));

  step.dependsOn
    .filter(dependencyId => !stepMap.has(dependencyId))
    .forEach(dependencyId => blockers.push(getIssue(
      'dependency',
      'blocked',
      `Dependency ${dependencyId} is no longer available in this plan.`,
    )));

  return blockers;
}

function getStepStageName(step, stagesById) {
  return stagesById.get(step.stageId)?.name ?? 'Unassigned stage';
}

export function getBuildPlanReadiness(plan, options = {}) {
  const sourcePlan = plan && Array.isArray(plan.steps) && Array.isArray(plan.stages)
    ? plan
    : { steps: [], stages: [] };
  const parts = Array.isArray(options.parts) ? options.parts : [];
  const toolRequirements = Array.isArray(options.toolRequirements) ? options.toolRequirements : [];
  const supplyRequirements = Array.isArray(options.supplyRequirements) ? options.supplyRequirements : [];
  const resourceCheck = options.resourceCheck ?? getProjectResourceCheck(
    parts,
    options.unit ?? 'mm',
    options.materials ?? [],
    {
      selectedMaterialId: options.selectedMaterialId,
      requiredStockQuantity: options.requiredStockQuantity,
      toolRequirements,
      tools: options.tools ?? [],
    },
  );
  const supplyCheck = options.supplyCheck ?? getSupplyRequirementCheck(
    supplyRequirements,
    options.supplies ?? [],
  );
  const materialRows = new Map((resourceCheck.rows ?? []).map(row => [row.id, row]));
  const toolRows = new Map((resourceCheck.toolRequirements?.rows ?? []).map(row => [row.id, row]));
  const supplyRows = new Map((supplyCheck.rows ?? []).map(row => [row.id, row]));
  const partsById = new Map(parts.map(part => [part.id, part]));
  const toolRequirementsById = new Map(toolRequirements.map(requirement => [requirement.id, requirement]));
  const supplyRequirementsById = new Map(supplyRequirements.map(requirement => [requirement.id, requirement]));
  const stagesById = new Map(sourcePlan.stages.map(stage => [stage.id, stage]));
  const stepMap = new Map(sourcePlan.steps.map(step => [step.id, step]));

  const steps = getBuildStepProgress(sourcePlan).map(progress => {
    const { step, blockingDependencies } = progress;
    const dependencyBlockers = getDependencyIssues(step, stepMap, blockingDependencies);
    const materialIssues = getMaterialIssues(
      step,
      partsById,
      materialRows,
      resourceCheck.selectedStockCheck,
    );
    const toolIssues = getToolIssues(step, toolRequirementsById, toolRows);
    const supplyIssues = getSupplyIssues(step, supplyRequirementsById, supplyRows);
    const blockers = [
      ...dependencyBlockers,
      ...materialIssues.blockers,
      ...toolIssues.blockers,
      ...supplyIssues.blockers,
    ];
    const reviews = [
      ...materialIssues.reviews,
      ...toolIssues.reviews,
      ...supplyIssues.reviews,
    ];

    if (step.status === 'blocked') {
      blockers.unshift(getIssue('step', 'blocked', 'This step is marked blocked in the build plan.'));
    }

    const status = blockers.length > 0
      ? 'blocked'
      : reviews.length > 0
        ? 'needs-review'
        : step.status === 'complete'
          ? 'complete'
          : 'ready';

    return {
      step,
      stageName: getStepStageName(step, stagesById),
      blockingDependencies,
      blockers,
      reviews,
      issues: [...blockers, ...reviews],
      status,
      statusLabel: BUILD_READINESS_STATUS_LABELS[status],
      isReady: status === 'ready',
      isBlocked: status === 'blocked',
      needsReview: status === 'needs-review',
    };
  });

  const blockedSteps = steps.filter(item => item.isBlocked).length;
  const reviewSteps = steps.filter(item => item.needsReview).length;
  const readySteps = steps.filter(item => item.isReady).length;
  const completedSteps = steps.filter(item => item.step.status === 'complete').length;
  const status = steps.length === 0
    ? 'not-started'
    : blockedSteps > 0
      ? 'blocked'
      : reviewSteps > 0
        ? 'needs-review'
        : completedSteps === steps.length
          ? 'complete'
          : 'ready';

  return {
    status,
    statusLabel: BUILD_READINESS_STATUS_LABELS[status],
    totalSteps: steps.length,
    readySteps,
    reviewSteps,
    blockedSteps,
    completedSteps,
    issueSteps: steps.filter(item => item.isBlocked || item.needsReview),
    steps,
    resourceCheck,
    supplyCheck,
  };
}
