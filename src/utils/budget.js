export const BUDGET_CURRENCY = 'AUD';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

export function validateProjectBudget(budget) {
  const errors = [];

  if (budget === null || budget === undefined) return { valid: true, errors };
  if (!isObject(budget)) return { valid: false, errors: ['Project budget must be an object or null.'] };
  if (budget.amount !== null
    && budget.amount !== undefined
    && (!Number.isFinite(budget.amount) || budget.amount < 0)) {
    errors.push('Project budget amount must be null or a non-negative number.');
  }
  if (budget.currency !== BUDGET_CURRENCY) {
    errors.push(`Project budget currency must be ${BUDGET_CURRENCY}.`);
  }

  return { valid: errors.length === 0, errors };
}

export function createProjectBudget(input = null) {
  if (input === null || input === undefined || input === '') return null;
  const source = isObject(input) ? input : { amount: input };
  const budget = {
    amount: readNumber(source.amount),
    currency: source.currency ?? BUDGET_CURRENCY,
  };
  const validation = validateProjectBudget(budget);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return budget;
}

export function getBudgetComparison(budget, estimatedTotal, actualTotal = null) {
  const validation = validateProjectBudget(budget);
  if (!validation.valid) {
    return {
      status: 'invalid',
      label: 'Budget needs review',
      budgetAmount: null,
      estimatedTotal: Number.isFinite(estimatedTotal) ? estimatedTotal : 0,
      actualTotal: Number.isFinite(actualTotal) ? actualTotal : null,
      estimatedVariance: null,
      actualVariance: null,
      actualTracked: Number.isFinite(actualTotal),
    };
  }

  if (!budget || budget.amount === null || budget.amount === undefined) {
    return {
      status: 'not-set',
      label: 'Budget not set',
      budgetAmount: null,
      estimatedTotal: Number.isFinite(estimatedTotal) ? estimatedTotal : 0,
      actualTotal: Number.isFinite(actualTotal) ? actualTotal : null,
      estimatedVariance: null,
      actualVariance: null,
      actualTracked: Number.isFinite(actualTotal),
    };
  }

  const estimate = Number.isFinite(estimatedTotal) ? estimatedTotal : 0;
  const actual = Number.isFinite(actualTotal) ? actualTotal : null;
  const estimatedVariance = budget.amount - estimate;
  const actualVariance = actual === null ? null : budget.amount - actual;
  const status = actual !== null && actual > budget.amount
    ? 'over-budget'
    : estimate > budget.amount
      ? 'estimate-over'
      : 'within-budget';

  return {
    status,
    label: {
      'within-budget': 'Within budget',
      'estimate-over': 'Estimate over budget',
      'over-budget': 'Over budget',
    }[status],
    budgetAmount: budget.amount,
    estimatedTotal: estimate,
    actualTotal: actual,
    estimatedVariance,
    actualVariance,
    actualTracked: actual !== null,
  };
}
