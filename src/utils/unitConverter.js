/**
 * Unit conversion & formatting utilities for Woodworking Cut List
 * Supports Metric (mm) and Imperial (inches with fractional rendering)
 */

export const UNITS = {
  MM: 'mm',
  INCH: 'in'
};

const MM_PER_INCH = 25.4;

/**
 * Convert millimeters to inches
 */
export function mmToInches(mm) {
  if (isNaN(mm) || mm === null) return 0;
  return mm / MM_PER_INCH;
}

/**
 * Convert inches to millimeters
 */
export function inchesToMm(inches) {
  if (isNaN(inches) || inches === null) return 0;
  return inches * MM_PER_INCH;
}

/**
 * Convert value based on current unit selection
 */
export function convertDimension(value, fromUnit, toUnit) {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;
  if (fromUnit === toUnit) return num;

  if (fromUnit === UNITS.MM && toUnit === UNITS.INCH) {
    return mmToInches(num);
  } else if (fromUnit === UNITS.INCH && toUnit === UNITS.MM) {
    return inchesToMm(num);
  }
  return num;
}

/**
 * Find closest fractional inch representation (down to 1/64")
 */
export function decimalToFraction(decimal, precision = 64) {
  if (isNaN(decimal)) return '';
  const whole = Math.floor(decimal);
  const remainder = Math.abs(decimal - whole);

  if (remainder < 0.005) {
    return `${whole}`;
  }

  const numSixtyFourths = Math.round(remainder * precision);
  if (numSixtyFourths === 0) return `${whole}`;
  if (numSixtyFourths === precision) return `${whole + 1}`;

  // Simplify fraction
  let gcd = function(a, b) { return b ? gcd(b, a % b) : a; };
  let divisor = gcd(numSixtyFourths, precision);

  let num = numSixtyFourths / divisor;
  let den = precision / divisor;

  return whole > 0 ? `${whole} ${num}/${den}` : `${num}/${den}`;
}

/**
 * Parse string input which might contain fractions like "12 1/4" or "12.25"
 */
export function parseDimensionInput(inputStr) {
  if (typeof inputStr === 'number') return inputStr;
  if (!inputStr || typeof inputStr !== 'string') return 0;

  const trimmed = inputStr.trim().replace(/"/g, '');
  if (!trimmed) return 0;

  // Handle whole + fraction e.g. "48 1/2"
  const spaceParts = trimmed.split(/\s+/);
  if (spaceParts.length === 2 && spaceParts[1].includes('/')) {
    const whole = parseFloat(spaceParts[0]);
    const [fracNum, fracDen] = spaceParts[1].split('/').map(Number);
    if (!isNaN(whole) && !isNaN(fracNum) && !isNaN(fracDen) && fracDen !== 0) {
      return whole + (fracNum / fracDen);
    }
  }

  // Handle lone fraction e.g. "3/8"
  if (trimmed.includes('/') && spaceParts.length === 1) {
    const [fracNum, fracDen] = trimmed.split('/').map(Number);
    if (!isNaN(fracNum) && !isNaN(fracDen) && fracDen !== 0) {
      return fracNum / fracDen;
    }
  }

  const parsed = parseFloat(trimmed);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Format dimension string for display according to unit
 */
export function formatDimension(val, unit, showUnit = true) {
  const num = parseFloat(val);
  if (isNaN(num)) return `0 ${showUnit ? unit : ''}`.trim();

  if (unit === UNITS.INCH) {
    const fracStr = decimalToFraction(num);
    const unitSuffix = showUnit ? '"' : '';
    return `${fracStr}${unitSuffix}`;
  } else {
    // MM display (rounded to 1 decimal place if has decimals, otherwise whole)
    const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(1);
    const unitSuffix = showUnit ? ' mm' : '';
    return `${formatted}${unitSuffix}`;
  }
}
