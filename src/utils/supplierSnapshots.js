export const SUPPLIER_SNAPSHOT_PROVIDERS = Object.freeze([
  { value: 'manual', label: 'Manual record' },
  { value: 'bunnings', label: 'Bunnings' },
  { value: 'other', label: 'Other supplier' },
]);

export const SUPPLIER_AVAILABILITY_STATUSES = Object.freeze([
  { value: 'unknown', label: 'Unknown' },
  { value: 'in-stock', label: 'In stock' },
  { value: 'limited', label: 'Limited' },
  { value: 'out-of-stock', label: 'Out of stock' },
]);

export const DEFAULT_SNAPSHOT_MAX_AGE_DAYS = 14;

const VALID_PROVIDERS = new Set(SUPPLIER_SNAPSHOT_PROVIDERS.map(option => option.value));
const VALID_AVAILABILITY_STATUSES = new Set(
  SUPPLIER_AVAILABILITY_STATUSES.map(option => option.value),
);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function readNullableText(value) {
  const text = readText(value);
  return text || null;
}

function optionLabel(options, value) {
  return options.find(option => option.value === value)?.label ?? value;
}

export function validateSupplierSnapshot(snapshot) {
  const errors = [];

  if (!isObject(snapshot)) {
    return { valid: false, errors: ['Supplier snapshot must be an object.'] };
  }

  if (!VALID_PROVIDERS.has(snapshot.provider)) {
    errors.push('Supplier snapshot provider is invalid.');
  }
  if (snapshot.externalItemNumber !== null
    && snapshot.externalItemNumber !== undefined
    && typeof snapshot.externalItemNumber !== 'string') {
    errors.push('Supplier snapshot externalItemNumber must be null or a string.');
  }
  if (snapshot.storeId !== null
    && snapshot.storeId !== undefined
    && typeof snapshot.storeId !== 'string') {
    errors.push('Supplier snapshot storeId must be null or a string.');
  }
  if (snapshot.storeName !== null
    && snapshot.storeName !== undefined
    && typeof snapshot.storeName !== 'string') {
    errors.push('Supplier snapshot storeName must be null or a string.');
  }
  if (!VALID_AVAILABILITY_STATUSES.has(snapshot.availability)) {
    errors.push('Supplier snapshot availability is invalid.');
  }

  return { valid: errors.length === 0, errors };
}

export function createSupplierSnapshot(input = {}) {
  if (input !== null && input !== undefined && !isObject(input)) {
    throw new Error('Supplier snapshot must be an object.');
  }
  const source = isObject(input) ? input : {};
  const snapshot = {
    provider: readText(source.provider) || 'manual',
    externalItemNumber: readNullableText(source.externalItemNumber),
    storeId: readNullableText(source.storeId),
    storeName: readNullableText(source.storeName),
    availability: readText(source.availability) || 'unknown',
  };

  const validation = validateSupplierSnapshot(snapshot);
  if (!validation.valid) throw new Error(validation.errors.join(' '));
  return snapshot;
}

function hasManualSnapshotFields(item) {
  return Boolean(
    readText(item?.supplier)
    || readText(item?.productReference)
    || readText(item?.url)
    || item?.unitCost !== null && item?.unitCost !== undefined
    || readText(item?.checkedAt),
  );
}

export function getSupplierSnapshotForCostItem(item) {
  const source = isObject(item?.supplierSnapshot) ? item.supplierSnapshot : null;
  if (!source && !hasManualSnapshotFields(item)) return null;

  return createSupplierSnapshot({
    ...(source ?? {}),
    provider: source?.provider ?? 'manual',
    externalItemNumber: source?.externalItemNumber ?? item?.productReference,
  });
}

export function getSupplierProviderLabel(provider) {
  return optionLabel(SUPPLIER_SNAPSHOT_PROVIDERS, provider);
}

export function getSupplierAvailabilityLabel(availability) {
  return optionLabel(SUPPLIER_AVAILABILITY_STATUSES, availability);
}

export function getSupplierSnapshotFreshness(checkedAt, options = {}) {
  const value = readText(checkedAt);
  if (!value) {
    return {
      status: 'not-checked',
      label: 'Not checked',
      ageDays: null,
    };
  }

  const checkedDate = new Date(value);
  if (Number.isNaN(checkedDate.getTime())) {
    return {
      status: 'invalid',
      label: 'Invalid date',
      ageDays: null,
    };
  }

  const now = options.now ? new Date(options.now) : new Date();
  if (Number.isNaN(now.getTime())) {
    return {
      status: 'invalid',
      label: 'Invalid comparison date',
      ageDays: null,
    };
  }

  const maxAgeDays = Number.isFinite(options.maxAgeDays) && options.maxAgeDays >= 0
    ? options.maxAgeDays
    : DEFAULT_SNAPSHOT_MAX_AGE_DAYS;
  const ageDays = Math.max(0, Math.floor((now.getTime() - checkedDate.getTime()) / 86400000));
  const isStale = ageDays > maxAgeDays;

  return {
    status: isStale ? 'stale' : 'current',
    label: isStale ? 'Stale snapshot' : 'Current snapshot',
    ageDays,
    checkedAt: checkedDate.toISOString(),
    maxAgeDays,
  };
}

export function getSupplierSnapshotReview(item, options = {}) {
  const snapshot = getSupplierSnapshotForCostItem(item);
  if (!snapshot) {
    return {
      snapshot: null,
      providerLabel: 'Not recorded',
      storeLabel: 'Store not recorded',
      availability: 'unknown',
      availabilityLabel: getSupplierAvailabilityLabel('unknown'),
      freshness: getSupplierSnapshotFreshness(null, options),
      status: 'not-recorded',
      needsReview: false,
    };
  }

  const freshness = getSupplierSnapshotFreshness(item?.checkedAt, options);
  const needsReview = freshness.status !== 'current' || snapshot.availability === 'unknown';

  return {
    snapshot,
    providerLabel: getSupplierProviderLabel(snapshot.provider),
    storeLabel: snapshot.storeName || snapshot.storeId || 'Store not recorded',
    availability: snapshot.availability,
    availabilityLabel: getSupplierAvailabilityLabel(snapshot.availability),
    freshness,
    status: needsReview ? 'needs-review' : 'ready',
    needsReview,
  };
}
