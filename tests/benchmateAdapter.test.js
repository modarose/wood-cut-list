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
