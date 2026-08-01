import { getAvailableQuantity, matchMaterialStockToParts } from './materialInventory.js';
import { getToolRequirementCheck } from './toolRequirements.js';

const STATUS_LABELS = Object.freeze({
  'not-started': 'No parts yet',
  'needs-review': 'Review required',
  'material-gap': 'Material gap',
  planned: 'Purchase planned',
  screened: 'Potentially covered',
});

function getSelectedStockCheck(materialCheck, materials, options = {}) {
  const selectedMaterialId = typeof options.selectedMaterialId === 'string'
    ? options.selectedMaterialId
    : '';
  const selectedMaterial = Array.isArray(materials)
    ? materials.find(material => material.id === selectedMaterialId) ?? null
    : null;
  const requiredQuantity = Number.isInteger(options.requiredStockQuantity)
    ? Math.max(0, options.requiredStockQuantity)
    : null;

  if (!selectedMaterial) {
    return {
      status: 'not-selected',
      name: '',
      source: null,
      availableQuantity: null,
      requiredQuantity,
      quantityShortfall: 0,
      dimensionallyFits: null,
      message: 'Select a material record to compare available stock with the optimizer result.',
    };
  }

  const requiredRows = materialCheck.rows.filter(row => row.quantity > 0);
  const dimensionallyFits = requiredRows.length > 0
    && requiredRows.every(row => row.candidates.some(candidate => candidate.id === selectedMaterial.id));
  const availableQuantity = getAvailableQuantity(selectedMaterial);

  if (materialCheck.reviewPartTypes > 0) {
    return {
      status: 'needs-review',
      name: selectedMaterial.name,
      source: selectedMaterial.source,
      availableQuantity,
      requiredQuantity,
      quantityShortfall: 0,
      dimensionallyFits,
      message: 'Resolve part dimensions or quantities before comparing stock quantity.',
    };
  }

  if (requiredRows.length === 0) {
    return {
      status: 'not-started',
      name: selectedMaterial.name,
      source: selectedMaterial.source,
      availableQuantity,
      requiredQuantity,
      quantityShortfall: 0,
      dimensionallyFits,
      message: 'Add cut-list parts to calculate the required stock quantity.',
    };
  }

  if (!dimensionallyFits) {
    return {
      status: 'dimension-gap',
      name: selectedMaterial.name,
      source: selectedMaterial.source,
      availableQuantity,
      requiredQuantity,
      quantityShortfall: 0,
      dimensionallyFits,
      message: 'The selected stock does not pass dimensional screening for every active part type.',
    };
  }

  const quantityShortfall = requiredQuantity === null
    ? 0
    : Math.max(0, requiredQuantity - availableQuantity);

  return {
    status: quantityShortfall > 0 ? 'quantity-gap' : 'quantity-covered',
    name: selectedMaterial.name,
    source: selectedMaterial.source,
    availableQuantity,
    requiredQuantity,
    quantityShortfall,
    dimensionallyFits,
    message: quantityShortfall > 0
      ? `${quantityShortfall} more sheet${quantityShortfall === 1 ? '' : 's'} required for the optimizer result.`
      : 'Available quantity covers the optimizer result at the stock-record level.',
  };
}

function getStatus(materialCheck, selectedStockCheck) {
  if (materialCheck.rows.length === 0) return 'not-started';
  if (materialCheck.reviewPartTypes > 0) return 'needs-review';
  if (materialCheck.unmatchedPartTypes > 0) return 'material-gap';
  if (materialCheck.plannedPartTypes > 0) return 'planned';
  if (selectedStockCheck.status === 'quantity-gap') return 'quantity-gap';
  return 'screened';
}

export function getProjectResourceCheck(parts = [], unit = 'mm', materials = [], options = {}) {
  const materialCheck = matchMaterialStockToParts(parts, unit, materials);
  const selectedStockCheck = getSelectedStockCheck(materialCheck, materials, options);
  const toolRequirements = getToolRequirementCheck(options.toolRequirements, options.tools);
  const attentionRows = materialCheck.rows.filter(row => row.status !== 'potential');
  const status = getStatus(materialCheck, selectedStockCheck);
  const statusLabel = status === 'quantity-gap'
    ? `${selectedStockCheck.quantityShortfall} sheet${selectedStockCheck.quantityShortfall === 1 ? '' : 's'} short`
    : STATUS_LABELS[status];

  return {
    ...materialCheck,
    status,
    statusLabel,
    attentionRows,
    selectedStockCheck,
    toolRequirements,
    hardwareRequirements: {
      status: 'not-mapped',
      message: 'Hardware and finish requirements are not mapped to this project yet.',
    },
  };
}
