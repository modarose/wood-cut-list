import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  createBenchMateProjectFromWoodCut,
  parseBenchMateProject,
  serializeBenchMateProject,
  toWoodCutSession,
  validateBenchMateProject,
} from '../src/utils/benchmateAdapter.js';
import { optimizeCutList } from '../src/utils/cutOptimizer.js';
import {
  loadStoredProjects,
  PROJECT_STORAGE_KEY,
  saveStoredProjects,
} from '../src/utils/projectStorage.js';
import {
  createMaterialStock,
  loadStoredMaterials,
  MATERIAL_STORAGE_KEY,
  matchMaterialStockToParts,
  releaseMaterialStock,
  reserveMaterialStock,
  saveStoredMaterials,
  validateMaterialStock,
} from '../src/utils/materialInventory.js';
import {
  createTool,
  loadStoredTools,
  removeStoredTool,
  saveStoredTools,
  TOOL_STORAGE_KEY,
  updateTool,
  validateTool,
} from '../src/utils/toolInventory.js';
import { getProjectResourceCheck } from '../src/utils/projectReadiness.js';
import {
  createSupply,
  loadStoredSupplies,
  removeStoredSupply,
  saveStoredSupplies,
  SUPPLY_STORAGE_KEY,
  validateSupply,
} from '../src/utils/supplyInventory.js';
import {
  createSupplyRequirement,
  getSupplyRequirementCheck,
  validateSupplyRequirement,
} from '../src/utils/supplyRequirements.js';
import {
  createToolRequirement,
  getToolRequirementCheck,
  validateToolRequirement,
} from '../src/utils/toolRequirements.js';
import {
  addBuildStage,
  addBuildStep,
  createBuildPlan,
  getBuildPlanSummary,
  updateBuildStep,
  validateBuildPlan,
} from '../src/utils/buildPlanner.js';
import { getBuildPlanReadiness } from '../src/utils/buildReadiness.js';
import {
  buildCostingCsv,
  createCostItem,
  getCostItemInventoryCandidates,
  getCostItemInventoryStatus,
  getCostingSummary,
  getShoppingListGroups,
  validateCostItem,
} from '../src/utils/costing.js';
import {
  createProjectBudget,
  getBudgetComparison,
  validateProjectBudget,
} from '../src/utils/budget.js';
import {
  createSupplierSnapshot,
  getSupplierSnapshotFreshness,
  getSupplierSnapshotReview,
  validateSupplierSnapshot,
} from '../src/utils/supplierSnapshots.js';

const FIXED_NOW = '2026-07-31T00:00:00.000Z';

test('maps a legacy millimetre WoodCut session into the canonical envelope', () => {
  const session = {
    unit: 'mm',
    stock: { width: 1220, height: 2440, kerf: 3, margin: 5 },
    parts: [
      {
        id: 'side',
        name: 'Side panel',
        width: 300,
        height: 1800,
        qty: 2,
        allowRotation: false,
        color: '#123456',
      },
    ],
    strategy: 'bssf',
    cutPreference: 'rip_first',
  };

  const record = createBenchMateProjectFromWoodCut(session, {
    projectId: 'project_test',
    revisionId: 'revision_test',
    now: FIXED_NOW,
  });

  assert.equal(record.schemaVersion, 1);
  assert.equal(record.project.units, 'mm');
  assert.equal(record.project.activeRevisionId, 'revision_test');
  assert.deepEqual(record.cutStock.dimensions, {
    width: 1220,
    length: 2440,
    thickness: null,
  });
  assert.deepEqual(record.parts[0].dimensions, {
    length: 1800,
    width: 300,
    thickness: null,
  });
  assert.equal(record.parts[0].quantity, 2);
  assert.equal(record.parts[0].rotationAllowed, false);
  assert.equal(record.parts[0].sourceEntityId, 'side');
  assert.equal(record.project.readiness, 'needs-review');
  assert.equal(validateBenchMateProject(record).valid, true);

  const restored = toWoodCutSession(record);
  assert.deepEqual(restored, session);
});

test('persists an optional inventory source reference without changing the WoodCut session shape', () => {
  const record = createBenchMateProjectFromWoodCut({
    unit: 'mm',
    stock: { width: 600, height: 1200, kerf: 3, margin: 0 },
    parts: [],
  }, {
    projectId: 'project_stock_reference',
    sourceMaterialStockId: 'stock_owned_sheet',
    now: FIXED_NOW,
  });

  assert.equal(record.cutStock.sourceMaterialStockId, 'stock_owned_sheet');
  assert.equal(validateBenchMateProject(record).valid, true);
  assert.deepEqual(toWoodCutSession(record).stock, {
    width: 600,
    height: 1200,
    kerf: 3,
    margin: 0,
  });
});

test('normalizes inch dimensions to millimetres while preserving an inch round trip', () => {
  const record = createBenchMateProjectFromWoodCut({
    unit: 'in',
    stock: { width: 48, height: 96, kerf: 0.125, margin: 0.25 },
    parts: [
      { id: 'top', name: 'Top', width: 12, height: 24, qty: 1, allowRotation: true },
    ],
  }, {
    projectId: 'project_inches',
    now: FIXED_NOW,
  });

  assert.deepEqual(record.cutStock.dimensions, {
    width: 1219.2,
    length: 2438.4,
    thickness: null,
  });
  assert.equal(record.cutStock.kerf, 3.175);
  assert.equal(record.cutStock.margin, 6.35);
  assert.equal(record.parts[0].dimensions.width, 304.8);
  assert.equal(record.parts[0].dimensions.length, 609.6);

  const restored = toWoodCutSession(record, { unit: 'in' });
  assert.equal(restored.stock.width, 48);
  assert.equal(restored.stock.height, 96);
  assert.equal(restored.stock.kerf, 0.125);
  assert.equal(restored.parts[0].width, 12);
  assert.equal(restored.parts[0].height, 24);
});

test('surfaces unresolved legacy values instead of inventing dimensions or quantities', () => {
  const record = createBenchMateProjectFromWoodCut({
    unit: 'mm',
    stock: { width: 0, height: -1, kerf: -2, margin: 0 },
    parts: [
      { id: 'unknown', width: 0, height: -10, qty: -1 },
    ],
  }, {
    projectId: 'project_invalid',
    now: FIXED_NOW,
  });
  const invalidUnitRecord = createBenchMateProjectFromWoodCut({
    unit: 'cm',
    stock: { width: 600, height: 1200, kerf: 3, margin: 0 },
    parts: [],
  }, {
    projectId: 'project_invalid_unit',
    now: FIXED_NOW,
  });

  const warningCodes = record.designRevisions[0].warnings.map(warning => warning.code);
  const invalidUnitCodes = invalidUnitRecord.designRevisions[0].warnings.map(warning => warning.code);
  assert.equal(record.cutStock.dimensions.width, 0);
  assert.equal(record.parts[0].quantity, 0);
  assert.ok(warningCodes.includes('invalid-dimension'));
  assert.ok(warningCodes.includes('invalid-quantity'));
  assert.ok(warningCodes.includes('thickness-missing'));
  assert.ok(warningCodes.includes('material-mapping-missing'));
  assert.ok(invalidUnitCodes.includes('invalid-unit'));
});

test('serializes and parses a valid canonical project', () => {
  const record = createBenchMateProjectFromWoodCut({
    unit: 'mm',
    stock: { width: 600, height: 1200, kerf: 3, margin: 0 },
    parts: [
      {
        id: 'panel',
        name: 'Panel',
        width: 300,
        height: 500,
        thickness: 18,
        qty: 1,
        materialRequirementId: 'material_panel',
      },
    ],
  }, {
    projectId: 'project_serialized',
    now: FIXED_NOW,
  });

  const serialized = serializeBenchMateProject(record);
  const parsed = parseBenchMateProject(serialized);
  assert.deepEqual(parsed, record);
  assert.throws(
    () => parseBenchMateProject('{"schemaVersion":2}'),
    /schemaVersion/,
  );
});

test('the checked-in sample project follows the canonical schema', async () => {
  const sampleJson = await readFile(
    new URL('../docs/examples/benchmate-project.json', import.meta.url),
    'utf8',
  );
  const sample = parseBenchMateProject(sampleJson);

  assert.equal(sample.project.id, 'project_bookshelf-demo');
  assert.equal(sample.project.units, 'mm');
  assert.equal(sample.parts[0].dimensions.length, 1800);
  assert.equal(validateBenchMateProject(sample).valid, true);
});

test('local project storage round-trips valid records and ignores invalid records', () => {
  let serialized = null;
  const storage = {
    getItem() {
      return serialized;
    },
    setItem(key, value) {
      assert.equal(key, PROJECT_STORAGE_KEY);
      serialized = value;
    },
  };
  const record = createBenchMateProjectFromWoodCut({
    unit: 'mm',
    stock: { width: 600, height: 1200, kerf: 3, margin: 0 },
    parts: [],
  }, {
    projectId: 'project_storage',
    now: FIXED_NOW,
  });

  assert.equal(saveStoredProjects([record], storage), true);
  assert.deepEqual(loadStoredProjects(storage), [record]);

  storage.setItem(PROJECT_STORAGE_KEY, JSON.stringify([record, { schemaVersion: 99 }]));
  assert.deepEqual(loadStoredProjects(storage), [record]);
});

test('the existing optimizer is deterministic for identical inputs', () => {
  const stock = { width: 1220, height: 2440, kerf: 3, margin: 5 };
  const parts = [
    { id: 'a', name: 'A', width: 300, height: 600, qty: 2, allowRotation: false },
    { id: 'b', name: 'B', width: 500, height: 400, qty: 1, allowRotation: true },
  ];

  const first = optimizeCutList(stock, parts, { strategy: 'bssf', cutPreference: 'rip_first' });
  const second = optimizeCutList(stock, parts, { strategy: 'bssf', cutPreference: 'rip_first' });

  assert.deepEqual(first, second);
});

test('material stock requires positive dimensions and cannot reserve more than it owns', () => {
  const material = createMaterialStock({
    id: 'stock_sheet',
    category: 'sheet-goods',
    name: '18 mm plywood',
    length: 2440,
    width: 1220,
    thickness: 18,
    usableLength: 2440,
    usableWidth: 1220,
    quantity: 2,
    reservedQuantity: 1,
    source: 'owned',
    condition: 'good',
  }, { now: FIXED_NOW });

  assert.equal(validateMaterialStock(material).valid, true);
  assert.equal(material.updatedAt, FIXED_NOW);
  assert.throws(
    () => createMaterialStock({
      ...material,
      quantity: 1,
      reservedQuantity: 2,
    }),
    /reservedQuantity cannot exceed quantity/,
  );
});

test('material inventory storage round-trips valid records and ignores invalid records', () => {
  let serialized = null;
  const storage = {
    getItem(key) {
      assert.equal(key, MATERIAL_STORAGE_KEY);
      return serialized;
    },
    setItem(key, value) {
      assert.equal(key, MATERIAL_STORAGE_KEY);
      serialized = value;
    },
  };
  const material = createMaterialStock({
    id: 'stock_storage',
    category: 'offcut',
    name: 'Oak offcut',
    length: 800,
    width: 300,
    thickness: 19,
    usableLength: 780,
    usableWidth: 290,
    quantity: 1,
    source: 'owned',
    condition: 'rough',
  }, { now: FIXED_NOW });

  assert.equal(saveStoredMaterials([material], storage), true);
  assert.deepEqual(loadStoredMaterials(storage), [material]);
  storage.setItem(MATERIAL_STORAGE_KEY, JSON.stringify([material, { id: 'invalid' }]));
  assert.deepEqual(loadStoredMaterials(storage), [material]);
});

test('material matching reports potential dimensional candidates without claiming allocation', () => {
  const materials = [createMaterialStock({
    id: 'stock_rotated',
    category: 'sheet-goods',
    name: 'Birch plywood',
    length: 600,
    width: 300,
    thickness: 12,
    usableLength: 600,
    usableWidth: 300,
    quantity: 1,
    source: 'owned',
    condition: 'good',
  }, { now: FIXED_NOW }), createMaterialStock({
    id: 'stock_planned',
    category: 'sheet-goods',
    name: 'Planned MDF',
    length: 700,
    width: 400,
    thickness: 12,
    usableLength: 700,
    usableWidth: 400,
    quantity: 1,
    source: 'planned',
    condition: 'good',
  }, { now: FIXED_NOW })];
  const result = matchMaterialStockToParts([
    { id: 'top', name: 'Top', width: 500, height: 250, thickness: 12, qty: 1, allowRotation: true },
    { id: 'side', name: 'Side', width: 400, height: 800, thickness: 12, qty: 1, allowRotation: false },
    { id: 'shelf', name: 'Shelf', width: 350, height: 650, thickness: 12, qty: 1, allowRotation: false },
  ], 'mm', materials);

  assert.equal(result.totalPartTypes, 3);
  assert.equal(result.matchedPartTypes, 1);
  assert.equal(result.plannedPartTypes, 1);
  assert.equal(result.unmatchedPartTypes, 1);
  assert.equal(result.rows[0].status, 'potential');
  assert.equal(result.rows[0].candidates[0].orientation, 'rotated');
  assert.equal(result.rows[1].status, 'unmatched');
  assert.equal(result.rows[2].status, 'planned');
});

test('project resource check separates owned, planned and unresolved material rows', () => {
  const materials = [createMaterialStock({
    id: 'stock_owned',
    category: 'sheet-goods',
    name: 'Birch plywood',
    length: 600,
    width: 300,
    thickness: 12,
    usableLength: 600,
    usableWidth: 300,
    quantity: 1,
    source: 'owned',
    condition: 'good',
  }, { now: FIXED_NOW }), createMaterialStock({
    id: 'stock_planned',
    category: 'sheet-goods',
    name: 'Planned MDF',
    length: 700,
    width: 400,
    thickness: 12,
    usableLength: 700,
    usableWidth: 400,
    quantity: 1,
    source: 'planned',
    condition: 'good',
  }, { now: FIXED_NOW })];

  const result = getProjectResourceCheck([
    { id: 'top', name: 'Top', width: 500, height: 250, thickness: 12, qty: 1, allowRotation: true },
    { id: 'side', name: 'Side', width: 400, height: 800, thickness: 12, qty: 1, allowRotation: false },
    { id: 'shelf', name: 'Shelf', width: 350, height: 650, thickness: 12, qty: 1, allowRotation: false },
  ], 'mm', materials);

  assert.equal(result.status, 'material-gap');
  assert.equal(result.statusLabel, 'Material gap');
  assert.equal(result.matchedPartTypes, 1);
  assert.equal(result.plannedPartTypes, 1);
  assert.equal(result.unmatchedPartTypes, 1);
  assert.deepEqual(result.attentionRows.map(row => row.id), ['side', 'shelf']);
  assert.equal(result.toolRequirements.status, 'not-started');
  assert.equal(result.hardwareRequirements.status, 'not-mapped');
});

test('project resource check marks invalid parts for review without inventing requirements', () => {
  const result = getProjectResourceCheck([
    { id: 'unknown', name: 'Unknown panel', width: 0, height: 100, qty: 1 },
  ], 'mm', []);

  assert.equal(result.status, 'needs-review');
  assert.equal(result.reviewPartTypes, 1);
  assert.equal(result.attentionRows[0].status, 'needs-review');
});

test('project resource check flags insufficient selected stock quantity', () => {
  const material = createMaterialStock({
    id: 'stock_selected',
    category: 'sheet-goods',
    name: '2440 x 1220 plywood',
    length: 2440,
    width: 1220,
    thickness: 18,
    usableLength: 2440,
    usableWidth: 1220,
    quantity: 1,
    source: 'owned',
    condition: 'good',
  }, { now: FIXED_NOW });

  const result = getProjectResourceCheck([
    { id: 'panel', name: 'Panel', width: 600, height: 900, thickness: 18, qty: 1, allowRotation: true },
  ], 'mm', [material], {
    selectedMaterialId: material.id,
    requiredStockQuantity: 2,
  });

  assert.equal(result.status, 'quantity-gap');
  assert.equal(result.statusLabel, '1 sheet short');
  assert.equal(result.selectedStockCheck.availableQuantity, 1);
  assert.equal(result.selectedStockCheck.requiredQuantity, 2);
  assert.equal(result.selectedStockCheck.quantityShortfall, 1);
  assert.equal(result.selectedStockCheck.status, 'quantity-gap');
});

test('owned material reservations are explicit, bounded and releasable by project', () => {
  const material = createMaterialStock({
    id: 'stock_reservable',
    category: 'sheet-goods',
    name: 'MDF',
    length: 2440,
    width: 1220,
    thickness: 18,
    usableLength: 2440,
    usableWidth: 1220,
    quantity: 3,
    source: 'owned',
    condition: 'good',
  }, { now: FIXED_NOW });

  const reserved = reserveMaterialStock(material, 'project_reservation', 2, {
    now: FIXED_NOW,
    reservedAt: FIXED_NOW,
  });
  assert.equal(reserved.reservedQuantity, 2);
  assert.equal(reserved.reservations[0].quantity, 2);
  assert.equal(reserved.quantity - reserved.reservedQuantity, 1);
  assert.throws(
    () => reserveMaterialStock(reserved, 'project_other', 2),
    /exceeds the available material quantity/,
  );

  const released = releaseMaterialStock(reserved, 'project_reservation', undefined, {
    now: FIXED_NOW,
    releasedAt: FIXED_NOW,
  });
  assert.equal(released.reservedQuantity, 0);
  assert.deepEqual(released.reservations, []);
  assert.throws(
    () => reserveMaterialStock({ ...material, source: 'planned' }, 'project_reservation', 1),
    /Only owned material can be reserved/,
  );
});

test('tool inventory normalizes capabilities and validates availability fields', () => {
  const tool = createTool({
    id: 'tool_track_saw',
    name: 'Track saw',
    category: 'saw',
    brand: 'Makita',
    model: 'SP6000',
    owned: true,
    availability: 'available',
    condition: 'good',
    location: 'Workshop wall A',
    capabilities: ['rip-cutting', 'cross-cutting', 'rip-cutting'],
    accessories: 'Guide rail, dust bag',
    lastMaintenanceAt: '2026-07-01',
  }, { now: FIXED_NOW });

  assert.deepEqual(tool.capabilities, ['rip-cutting', 'cross-cutting']);
  assert.deepEqual(tool.accessories, ['Guide rail', 'dust bag']);
  assert.equal(validateTool(tool).valid, true);
  assert.throws(
    () => updateTool(tool, { availability: 'not-a-status' }),
    /Tool availability is invalid/,
  );
});

test('tool inventory storage ignores invalid records and removes valid records', () => {
  let serialized = null;
  const storage = {
    getItem(key) {
      assert.equal(key, TOOL_STORAGE_KEY);
      return serialized;
    },
    setItem(key, value) {
      assert.equal(key, TOOL_STORAGE_KEY);
      serialized = value;
    },
  };
  const tool = createTool({
    id: 'tool_storage',
    name: 'Orbital sander',
    category: 'sander',
    owned: true,
    availability: 'maintenance',
    condition: 'fair',
    capabilities: ['sanding'],
  }, { now: FIXED_NOW });

  assert.equal(saveStoredTools([tool], storage), true);
  assert.deepEqual(loadStoredTools(storage), [tool]);
  storage.setItem(TOOL_STORAGE_KEY, JSON.stringify([tool, { id: 'invalid' }]));
  assert.deepEqual(loadStoredTools(storage), [tool]);

  const removed = removeStoredTool(tool.id, [tool], storage);
  assert.equal(removed.saved, true);
  assert.deepEqual(removed.tools, []);
});

test('project tool requirements screen owned, review and missing capability matches', () => {
  const coveredRequirement = createToolRequirement({
    id: 'tool_requirement_cross_cutting',
    projectId: 'project_tools',
    capability: 'cross-cutting',
    quantity: 1,
  }, { now: FIXED_NOW });
  const reviewRequirement = createToolRequirement({
    id: 'tool_requirement_routing',
    projectId: 'project_tools',
    capability: 'routing',
    quantity: 1,
  }, { now: FIXED_NOW });
  const borrowedRequirement = createToolRequirement({
    id: 'tool_requirement_sanding',
    projectId: 'project_tools',
    capability: 'sanding',
    quantity: 1,
  }, { now: FIXED_NOW });
  const missingRequirement = createToolRequirement({
    id: 'tool_requirement_planing',
    projectId: 'project_tools',
    capability: 'planing',
    quantity: 1,
  }, { now: FIXED_NOW });
  const trackSaw = createTool({
    id: 'tool_ready_saw',
    name: 'Track saw',
    category: 'saw',
    owned: true,
    availability: 'available',
    condition: 'good',
    capabilities: ['cross-cutting'],
  }, { now: FIXED_NOW });
  const router = createTool({
    id: 'tool_maintenance_router',
    name: 'Router',
    category: 'router',
    owned: true,
    availability: 'maintenance',
    condition: 'fair',
    capabilities: ['routing'],
  }, { now: FIXED_NOW });
  const borrowedSander = createTool({
    id: 'tool_borrowed_sander',
    name: 'Random orbital sander',
    category: 'sander',
    owned: false,
    availability: 'available',
    condition: 'good',
    capabilities: ['sanding'],
  }, { now: FIXED_NOW });

  assert.equal(validateToolRequirement(coveredRequirement).valid, true);
  assert.throws(
    () => createToolRequirement({ ...coveredRequirement, quantity: 0 }),
    /quantity must be a positive integer/,
  );

  const check = getToolRequirementCheck(
    [coveredRequirement, reviewRequirement, borrowedRequirement, missingRequirement],
    [trackSaw, router, borrowedSander],
  );
  assert.equal(check.status, 'needs-attention');
  assert.deepEqual(check.summary, {
    totalRequirements: 4,
    covered: 1,
    partial: 0,
    needsReview: 2,
    missing: 1,
  });
  assert.equal(check.rows[0].status, 'covered');
  assert.equal(check.rows[1].status, 'needs-review');
  assert.equal(check.rows[1].attentionCount, 1);
  assert.equal(check.rows[2].status, 'needs-review');
  assert.equal(check.rows[2].nonOwnedCount, 1);
  assert.equal(check.rows[3].status, 'missing');

  const record = createBenchMateProjectFromWoodCut({
    unit: 'mm',
    stock: { width: 600, height: 1200, kerf: 3, margin: 0 },
    parts: [],
  }, {
    projectId: 'project_tools',
    toolRequirements: [coveredRequirement],
    now: FIXED_NOW,
  });
  assert.deepEqual(record.project.toolRequirementIds, ['tool_requirement_cross_cutting']);
  assert.deepEqual(record.toolRequirements, [coveredRequirement]);
  assert.equal(validateBenchMateProject(record).valid, true);
});

test('supply inventory stores fractional quantities with explicit units', () => {
  let serialized = null;
  const storage = {
    getItem(key) {
      assert.equal(key, SUPPLY_STORAGE_KEY);
      return serialized;
    },
    setItem(key, value) {
      assert.equal(key, SUPPLY_STORAGE_KEY);
      serialized = value;
    },
  };
  const supply = createSupply({
    id: 'supply_finish',
    category: 'finish',
    name: 'Water-based clear coat',
    brand: 'Example brand',
    unit: 'litre',
    quantity: 1.5,
    source: 'owned',
    lastCheckedAt: '2026-07-31',
  }, { now: FIXED_NOW });

  assert.equal(validateSupply(supply).valid, true);
  assert.equal(saveStoredSupplies([supply], storage), true);
  assert.deepEqual(loadStoredSupplies(storage), [supply]);
  storage.setItem(SUPPLY_STORAGE_KEY, JSON.stringify([supply, { id: 'invalid' }]));
  assert.deepEqual(loadStoredSupplies(storage), [supply]);

  const removed = removeStoredSupply(supply.id, [supply], storage);
  assert.equal(removed.saved, true);
  assert.deepEqual(removed.supplies, []);
  assert.throws(
    () => createSupply({ ...supply, quantity: -1 }),
    /quantity must be a non-negative number/,
  );
});

test('build planner stores ordered stages, dependencies and completion progress', () => {
  let plan = createBuildPlan({
    projectId: 'project_build',
    name: 'Workshop build plan',
  }, { projectId: 'project_build', now: FIXED_NOW });
  plan = addBuildStage(plan, { name: 'Preparation' }, { now: FIXED_NOW });
  const stageId = plan.stages[0].id;
  plan = addBuildStep(plan, stageId, {
    name: 'Mark cut lines',
    type: 'preparation',
    estimatedMinutes: 15,
  }, { now: FIXED_NOW });
  const firstStepId = plan.steps[0].id;
  plan = addBuildStep(plan, stageId, {
    name: 'Cut panels',
    type: 'cutting',
    dependsOn: [firstStepId],
    estimatedMinutes: 45,
    waitMinutes: 5,
  }, { now: FIXED_NOW });

  let summary = getBuildPlanSummary(plan);
  assert.equal(summary.totalStages, 1);
  assert.equal(summary.totalSteps, 2);
  assert.equal(summary.estimatedMinutes, 60);
  assert.equal(summary.waitMinutes, 5);
  assert.equal(summary.blockedSteps, 1);
  assert.equal(summary.availableSteps, 1);

  plan = updateBuildStep(plan, firstStepId, { status: 'complete' }, { now: FIXED_NOW });
  summary = getBuildPlanSummary(plan);
  assert.equal(summary.completedSteps, 1);
  assert.equal(summary.progress.find(item => item.step.name === 'Cut panels').isAvailable, true);
  assert.equal(validateBuildPlan(plan).valid, true);
  assert.throws(
    () => updateBuildStep(plan, plan.steps[1].id, { dependsOn: [plan.steps[1].id] }, { now: FIXED_NOW }),
    /cannot depend on itself|cycle/,
  );

  const record = createBenchMateProjectFromWoodCut({
    unit: 'mm',
    stock: { width: 600, height: 1200, kerf: 3, margin: 0 },
    parts: [],
  }, {
    projectId: 'project_build',
    buildPlan: plan,
    now: FIXED_NOW,
  });
  assert.deepEqual(record.project.buildMethodIds, [plan.id]);
  assert.deepEqual(record.buildMethods, [plan]);
  assert.equal(validateBenchMateProject(record).valid, true);
  assert.deepEqual(parseBenchMateProject(JSON.stringify(record)).buildMethods, [plan]);
});

test('build readiness combines dependencies with material, tool and supply checks', () => {
  const projectId = 'project_readiness';
  const panel = {
    id: 'part_panel',
    name: 'Side panel',
    width: 300,
    height: 500,
    thickness: 18,
    qty: 1,
    allowRotation: true,
  };
  const material = createMaterialStock({
    id: 'stock_plywood',
    category: 'sheet-goods',
    name: '18 mm plywood',
    dimensions: { length: 2440, width: 1220, thickness: 18 },
    usableLength: 2440,
    usableWidth: 1220,
    quantity: 1,
    source: 'owned',
  }, { now: FIXED_NOW });
  const measuringRequirement = createToolRequirement({
    id: 'tool_requirement_measuring',
    projectId,
    capability: 'measuring',
    quantity: 1,
  }, { now: FIXED_NOW });
  const missingToolRequirement = createToolRequirement({
    id: 'tool_requirement_routing',
    projectId,
    capability: 'routing',
    quantity: 1,
  }, { now: FIXED_NOW });
  const tapeMeasure = createTool({
    id: 'tool_tape_measure',
    name: 'Tape measure',
    category: 'measuring',
    owned: true,
    availability: 'available',
    condition: 'good',
    capabilities: ['measuring'],
  }, { now: FIXED_NOW });
  const ownedScrews = createSupply({
    id: 'supply_owned_screws',
    category: 'hardware',
    name: '50 mm screws',
    unit: 'each',
    quantity: 10,
    source: 'owned',
  }, { now: FIXED_NOW });
  const plannedFinish = createSupply({
    id: 'supply_planned_finish',
    category: 'finish',
    name: 'Clear coat',
    unit: 'tin',
    quantity: 1,
    source: 'planned',
  }, { now: FIXED_NOW });
  const screwRequirement = createSupplyRequirement({
    id: 'supply_requirement_screws',
    projectId,
    category: 'hardware',
    name: '50 mm screws',
    unit: 'each',
    quantity: 4,
  }, { now: FIXED_NOW });
  const finishRequirement = createSupplyRequirement({
    id: 'supply_requirement_finish',
    projectId,
    category: 'finish',
    name: 'Clear coat',
    unit: 'tin',
    quantity: 1,
  }, { now: FIXED_NOW });
  const plan = createBuildPlan({
    id: 'build_plan_readiness',
    projectId,
    name: 'Readiness test plan',
    stages: [{ id: 'stage_build', name: 'Build', sequence: 1 }],
    steps: [
      {
        id: 'step_mark',
        stageId: 'stage_build',
        name: 'Mark panel',
        type: 'preparation',
        partIds: [panel.id],
        toolRequirementIds: [measuringRequirement.id],
        supplyRequirementIds: [screwRequirement.id],
      },
      {
        id: 'step_route',
        stageId: 'stage_build',
        name: 'Route edge',
        type: 'joinery',
        dependsOn: ['step_mark'],
        toolRequirementIds: [missingToolRequirement.id],
      },
      {
        id: 'step_finish',
        stageId: 'stage_build',
        name: 'Apply finish',
        type: 'finishing',
        supplyRequirementIds: [finishRequirement.id],
      },
    ],
  }, { projectId, now: FIXED_NOW });

  const readiness = getBuildPlanReadiness(plan, {
    parts: [panel],
    materials: [material],
    unit: 'mm',
    toolRequirements: [measuringRequirement, missingToolRequirement],
    tools: [tapeMeasure],
    supplyRequirements: [screwRequirement, finishRequirement],
    supplies: [ownedScrews, plannedFinish],
  });

  assert.equal(readiness.status, 'blocked');
  assert.equal(readiness.totalSteps, 3);
  assert.equal(readiness.readySteps, 1);
  assert.equal(readiness.reviewSteps, 1);
  assert.equal(readiness.blockedSteps, 1);
  assert.deepEqual(
    readiness.steps.map(item => [item.step.id, item.status]),
    [
      ['step_mark', 'ready'],
      ['step_route', 'blocked'],
      ['step_finish', 'needs-review'],
    ],
  );
  assert.equal(readiness.steps[1].blockers.length, 2);
  assert.match(readiness.steps[1].issues[0].message, /Mark panel/);
  assert.match(readiness.steps[1].issues[1].message, /routing/);
  assert.match(readiness.steps[2].reviews[0].message, /planned stock/);
});

test('project supply requirements persist and separate owned, planned and missing matches', () => {
  const requirement = createSupplyRequirement({
    id: 'requirement_screws',
    projectId: 'project_requirements',
    category: 'hardware',
    name: '50 mm screws',
    reference: 'coarse thread',
    unit: 'each',
    quantity: 10,
  }, { now: FIXED_NOW });
  const missingRequirement = createSupplyRequirement({
    id: 'requirement_glue',
    projectId: 'project_requirements',
    category: 'adhesive',
    name: 'PVA glue',
    unit: 'bottle',
    quantity: 1,
  }, { now: FIXED_NOW });
  const ownedScrews = createSupply({
    id: 'supply_owned_screws',
    category: 'hardware',
    name: '50 mm screws',
    reference: 'coarse thread',
    unit: 'each',
    quantity: 4,
    source: 'owned',
  }, { now: FIXED_NOW });
  const plannedScrews = createSupply({
    id: 'supply_planned_screws',
    category: 'hardware',
    name: '50 mm screws',
    reference: 'coarse thread',
    unit: 'each',
    quantity: 6,
    source: 'planned',
  }, { now: FIXED_NOW });
  const wrongReference = createSupply({
    id: 'supply_wrong_reference',
    category: 'hardware',
    name: '50 mm screws',
    reference: 'fine thread',
    unit: 'each',
    quantity: 100,
    source: 'owned',
  }, { now: FIXED_NOW });

  assert.equal(validateSupplyRequirement(requirement).valid, true);
  assert.throws(
    () => createSupplyRequirement({ ...requirement, quantity: 0 }),
    /quantity must be greater than zero/,
  );

  const check = getSupplyRequirementCheck(
    [requirement, missingRequirement],
    [ownedScrews, plannedScrews, wrongReference],
  );
  assert.equal(check.status, 'needs-attention');
  assert.deepEqual(check.summary, {
    totalRequirements: 2,
    ownedCovered: 0,
    plannedCovered: 1,
    partial: 0,
    missing: 1,
    needsReview: 0,
  });
  assert.equal(check.rows[0].status, 'planned');
  assert.equal(check.rows[0].ownedQuantity, 4);
  assert.equal(check.rows[0].plannedQuantity, 6);
  assert.equal(check.rows[1].status, 'missing');

  const record = createBenchMateProjectFromWoodCut({
    unit: 'mm',
    stock: { width: 600, height: 1200, kerf: 3, margin: 0 },
    parts: [],
  }, {
    projectId: 'project_requirements',
    supplyRequirements: [requirement, missingRequirement],
    now: FIXED_NOW,
  });
  assert.deepEqual(record.project.supplyRequirementIds, [
    'requirement_screws',
    'requirement_glue',
  ]);
  assert.deepEqual(record.supplyRequirements, [requirement, missingRequirement]);
  assert.equal(validateBenchMateProject(record).valid, true);
});

test('manual cost items summarize purchases and persist with the project envelope', () => {
  const owned = createCostItem({
    id: 'cost_owned_sheet',
    projectId: 'project_costing',
    category: 'sheet-goods',
    name: 'Plywood sheet',
    quantity: 1,
    unit: 'sheet',
    status: 'owned',
    unitCost: 80,
    supplier: 'Existing stock',
    checkedAt: FIXED_NOW,
  }, { now: FIXED_NOW });
  const planned = createCostItem({
    id: 'cost_planned_screws',
    projectId: 'project_costing',
    category: 'hardware',
    name: '50 mm screws',
    quantity: 2,
    unit: 'box',
    status: 'planned',
    unitCost: 12,
    supplier: 'Hardware store',
    checkedAt: FIXED_NOW,
  }, { now: FIXED_NOW });
  const missing = createCostItem({
    id: 'cost_missing_finish',
    projectId: 'project_costing',
    category: 'finish',
    name: 'Clear coat',
    quantity: 1,
    unit: 'tin',
    status: 'missing',
  }, { now: FIXED_NOW });

  assert.equal(validateCostItem(owned).valid, true);
  assert.equal(validateCostItem(planned).valid, true);
  assert.equal(validateCostItem(missing).valid, true);

  const summary = getCostingSummary([owned, planned, missing]);
  assert.equal(summary.status, 'needs-review');
  assert.equal(summary.purchaseTotal, 24);
  assert.equal(summary.ownedValue, 80);
  assert.equal(summary.estimatedTotal, 104);
  assert.equal(summary.shoppingItems, 2);
  assert.equal(summary.unknownPriceCount, 1);
  assert.equal(summary.missingItems, 1);
  assert.deepEqual(summary.supplierNames, ['Hardware store']);

  const record = createBenchMateProjectFromWoodCut({
    unit: 'mm',
    stock: { width: 600, height: 1200, kerf: 3, margin: 0 },
    parts: [],
  }, {
    projectId: 'project_costing',
    costItems: [owned, planned, missing],
    now: FIXED_NOW,
  });

  assert.deepEqual(record.project.costItemIds, [
    'cost_owned_sheet',
    'cost_planned_screws',
    'cost_missing_finish',
  ]);
  assert.deepEqual(record.costItems, [owned, planned, missing]);
  assert.equal(validateBenchMateProject(record).valid, true);
  assert.deepEqual(parseBenchMateProject(serializeBenchMateProject(record)).costItems, [
    owned,
    planned,
    missing,
  ]);
});

test('purchase budgets compare estimates with actual spend and persist with the project', () => {
  const owned = createCostItem({
    id: 'cost_budget_owned',
    projectId: 'project_budget',
    category: 'sheet-goods',
    name: 'Plywood sheet',
    quantity: 1,
    unit: 'sheet',
    status: 'owned',
    unitCost: 80,
    actualCost: 80,
    actualCheckedAt: '2026-08-05',
  }, { now: FIXED_NOW });
  const purchase = createCostItem({
    id: 'cost_budget_purchase',
    projectId: 'project_budget',
    category: 'hardware',
    name: 'Screws',
    quantity: 2,
    unit: 'box',
    status: 'planned',
    unitCost: 12,
    actualCost: 25,
    actualCheckedAt: '2026-08-05',
  }, { now: FIXED_NOW });
  const budget = createProjectBudget({ amount: 30, currency: 'AUD' });

  assert.deepEqual(budget, { amount: 30, currency: 'AUD' });
  assert.equal(validateProjectBudget(budget).valid, true);
  assert.equal(validateProjectBudget({ amount: 30, currency: 'USD' }).valid, false);
  assert.deepEqual(getBudgetComparison(budget, 24, 25), {
    status: 'within-budget',
    label: 'Within budget',
    budgetAmount: 30,
    estimatedTotal: 24,
    actualTotal: 25,
    estimatedVariance: 6,
    actualVariance: 5,
    actualTracked: true,
  });

  const summary = getCostingSummary([owned, purchase], budget);
  assert.equal(summary.purchaseTotal, 24);
  assert.equal(summary.actualTotal, 105);
  assert.equal(summary.actualPurchaseTotal, 25);
  assert.equal(summary.actualPurchaseItemCount, 1);
  assert.equal(summary.actualPendingCount, 0);
  assert.equal(summary.rows[1].actualVariance, 1);
  assert.equal(summary.budgetComparison.actualVariance, 5);

  const zeroActual = createCostItem({
    ...purchase,
    id: 'cost_budget_zero',
    actualCost: 0,
  }, { now: FIXED_NOW });
  const zeroSummary = getCostingSummary([zeroActual], createProjectBudget(0));
  assert.equal(zeroSummary.actualPurchaseTotal, 0);
  assert.equal(zeroSummary.budgetComparison.actualTracked, true);
  assert.equal(zeroSummary.budgetComparison.actualTotal, 0);

  const overBudget = getCostingSummary([purchase], createProjectBudget(20));
  assert.equal(overBudget.budgetComparison.status, 'over-budget');
  assert.equal(overBudget.budgetComparison.actualVariance, -5);

  const record = createBenchMateProjectFromWoodCut({
    unit: 'mm',
    stock: { width: 600, height: 1200, kerf: 3, margin: 0 },
    parts: [],
  }, {
    projectId: 'project_budget',
    budget,
    costItems: [owned, purchase],
    now: FIXED_NOW,
  });
  assert.deepEqual(record.project.budget, budget);
  assert.equal(validateBenchMateProject(record).valid, true);
  assert.deepEqual(parseBenchMateProject(serializeBenchMateProject(record)).project.budget, budget);
  assert.throws(
    () => createProjectBudget({ amount: -1, currency: 'AUD' }),
    /non-negative/,
  );
});

test('cost items can link to compatible inventory without copying inventory records', () => {
  const material = createMaterialStock({
    id: 'stock_cost_link',
    category: 'sheet-goods',
    name: 'Plywood sheet',
    length: 2440,
    width: 1220,
    thickness: 18,
    usableLength: 2440,
    usableWidth: 1220,
    quantity: 2,
    source: 'owned',
    condition: 'good',
  }, { now: FIXED_NOW });
  const supply = createSupply({
    id: 'supply_cost_link',
    category: 'hardware',
    name: '50 mm screws',
    unit: 'box',
    quantity: 3,
    source: 'owned',
  }, { now: FIXED_NOW });
  const costItem = createCostItem({
    id: 'cost_linked_screws',
    projectId: 'project_cost_links',
    category: 'hardware',
    name: '50 mm screws',
    quantity: 1,
    unit: 'box',
    status: 'owned',
    unitCost: 12,
    inventoryLink: { type: 'supply', id: supply.id },
  }, { now: FIXED_NOW });

  const candidates = getCostItemInventoryCandidates(
    costItem,
    [material],
    [supply],
  );
  assert.deepEqual(candidates.materials, []);
  assert.deepEqual(candidates.supplies.map(candidate => candidate.id), [supply.id]);
  assert.equal(
    getCostItemInventoryStatus({ type: 'supply', id: supply.id }, [], [supply]),
    'owned',
  );
  const plannedSupply = createSupply({
    ...supply,
    id: 'supply_cost_link_planned',
    source: 'planned',
  }, { now: FIXED_NOW });
  assert.equal(
    getCostItemInventoryStatus(
      { type: 'supply', id: plannedSupply.id },
      [],
      [plannedSupply],
    ),
    'planned',
  );
  assert.equal(
    getCostItemInventoryStatus({ type: 'material', id: material.id }, [material], []),
    'owned',
  );
  assert.equal(validateCostItem(costItem).valid, true);
  assert.throws(
    () => createCostItem({
      ...costItem,
      inventoryLink: { type: 'unknown', id: 'record' },
    }),
    /inventoryLink type is invalid/,
  );

  const record = createBenchMateProjectFromWoodCut({
    unit: 'mm',
    stock: { width: 600, height: 1200, kerf: 3, margin: 0 },
    parts: [],
  }, {
    projectId: 'project_cost_links',
    costItems: [costItem],
    now: FIXED_NOW,
  });

  assert.deepEqual(record.costItems[0].inventoryLink, {
    type: 'supply',
    id: supply.id,
  });
  assert.equal(validateBenchMateProject(record).valid, true);
  assert.deepEqual(
    parseBenchMateProject(serializeBenchMateProject(record)).costItems[0].inventoryLink,
    costItem.inventoryLink,
  );
});

test('costing csv includes estimate fields and escapes spreadsheet values', () => {
  const item = createCostItem({
    id: 'cost_csv_item',
    projectId: 'project_csv',
    category: 'hardware',
    name: 'Screws, 50 mm',
    quantity: 2,
    unit: 'box',
    status: 'planned',
    unitCost: 12.5,
    supplier: 'Wood "Co"',
    productReference: 'SC-50',
    url: 'https://example.com/sc-50',
    checkedAt: '2026-08-04',
  }, { now: FIXED_NOW });

  const csv = buildCostingCsv(getCostingSummary([item]));

  assert.match(csv, /"Item","Category","Quantity"/);
  assert.match(csv, /"Screws, 50 mm","hardware","2","box","planned","Wood ""Co"""/);
  assert.match(csv, /"12\.5","25","","","","Shopping list"/);
  assert.match(csv, /"2026-08-04"/);
  assert.match(csv, /"https:\/\/example\.com\/sc-50"/);
});

test('supplier snapshots preserve manual fallback metadata and flag stale or unknown data', () => {
  const snapshot = createSupplierSnapshot({
    provider: 'bunnings',
    externalItemNumber: '1234567',
    storeName: 'Alexandria',
    storeId: 'store-001',
    availability: 'in-stock',
  });
  assert.deepEqual(snapshot, {
    provider: 'bunnings',
    externalItemNumber: '1234567',
    storeId: 'store-001',
    storeName: 'Alexandria',
    availability: 'in-stock',
  });
  assert.equal(validateSupplierSnapshot(snapshot).valid, true);
  assert.throws(
    () => createSupplierSnapshot({ provider: 'unsupported', availability: 'unknown' }),
    /provider is invalid/,
  );

  const item = createCostItem({
    id: 'cost_supplier_snapshot',
    projectId: 'project_supplier_snapshot',
    category: 'hardware',
    name: 'Pocket-hole screws',
    quantity: 1,
    unit: 'box',
    status: 'planned',
    unitCost: 18.5,
    supplier: 'Bunnings',
    productReference: '1234567',
    checkedAt: '2026-08-04T00:00:00.000Z',
    supplierSnapshot: snapshot,
  }, { now: FIXED_NOW });

  assert.equal(
    getSupplierSnapshotFreshness(item.checkedAt, { now: '2026-08-10T00:00:00.000Z' }).status,
    'current',
  );
  assert.equal(
    getSupplierSnapshotReview(item, { now: '2026-08-10T00:00:00.000Z' }).needsReview,
    false,
  );
  assert.equal(
    getSupplierSnapshotReview(item, { now: '2026-08-25T00:00:00.000Z' }).status,
    'needs-review',
  );

  const unknownAvailability = {
    ...item,
    supplierSnapshot: { ...snapshot, availability: 'unknown' },
  };
  assert.equal(
    getSupplierSnapshotReview(unknownAvailability, { now: '2026-08-10T00:00:00.000Z' }).needsReview,
    true,
  );
});

test('shopping lists group planned items by supplier, source and store', () => {
  const makeItem = (input) => createCostItem({
    projectId: 'project_shopping_groups',
    category: 'hardware',
    name: input.name,
    quantity: 1,
    unit: 'box',
    status: input.status ?? 'planned',
    unitCost: input.unitCost ?? null,
    supplier: input.supplier ?? '',
    checkedAt: input.checkedAt ?? null,
    supplierSnapshot: input.supplierSnapshot ?? null,
  }, { now: FIXED_NOW });

  const bunningsAlexandria = {
    provider: 'bunnings',
    storeId: 'alexandria',
    storeName: 'Alexandria',
    availability: 'in-stock',
  };
  const items = [
    makeItem({
      name: 'Screws',
      unitCost: 10,
      supplier: 'Bunnings',
      checkedAt: FIXED_NOW,
      supplierSnapshot: bunningsAlexandria,
    }),
    makeItem({
      name: 'Dowels',
      supplier: 'Bunnings',
      supplierSnapshot: bunningsAlexandria,
    }),
    makeItem({
      name: 'Glue',
      unitCost: 7,
      supplier: 'Bunnings',
      checkedAt: FIXED_NOW,
      supplierSnapshot: {
        ...bunningsAlexandria,
        storeId: 'rockdale',
        storeName: 'Rockdale',
      },
    }),
    makeItem({ name: 'Sandpaper', unitCost: 2 }),
    makeItem({
      name: 'Owned screws',
      unitCost: 100,
      supplier: 'Bunnings',
      status: 'owned',
      supplierSnapshot: bunningsAlexandria,
    }),
  ];

  const summary = getCostingSummary(items);
  assert.equal(summary.shoppingGroupCount, 3);
  assert.deepEqual(summary.shoppingGroups.map(group => [
    group.supplier,
    group.storeLabel,
    group.itemCount,
    group.knownTotal,
    group.unknownPriceCount,
  ]), [
    ['Bunnings', 'Alexandria', 2, 10, 1],
    ['Bunnings', 'Rockdale', 1, 7, 0],
    ['Supplier not recorded', 'Store not recorded', 1, 2, 0],
  ]);
  assert.equal(getShoppingListGroups(summary.rows).length, 3);
  const csv = buildCostingCsv(summary);
  assert.match(csv, /"Purchase group","Group known total \(AUD\)"/);
  assert.match(csv, /"Bunnings \/ Alexandria","10","1","1"/);
});
