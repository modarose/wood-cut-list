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
  assert.equal(record.project.activeRevisionId, 'revision_revision_test');
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
