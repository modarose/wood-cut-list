/**
 * 2D Guillotine Bin Packing & Cutting Stock Optimizer for Woodworking
 */

export const STRATEGIES = {
  BSSF: 'bssf', // Best Short Side First
  BAF: 'baf',   // Best Area First
};

export const CUT_PREFERENCES = {
  RIP_FIRST: 'rip_first',     // Vertical lengthwise cut first
  CROSS_FIRST: 'cross_first', // Horizontal cross-cut first
};

function readPositiveNumber(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function readPositiveInteger(value) {
  const number = readPositiveNumber(value);
  return number !== null && Number.isInteger(number) ? number : null;
}

/**
 * Main calculation entry point
 */
export function optimizeCutList(stockSheet, partsList, options = {}) {
  const kerf = Math.max(0, parseFloat(options.kerf) || 0);
  const margin = Math.max(0, parseFloat(options.margin) || 0);
  const strategy = options.strategy || STRATEGIES.BSSF;
  const cutPref = options.cutPreference || CUT_PREFERENCES.RIP_FIRST;

  const invalidParts = [];
  const validationErrors = [];
  const itemsToPlace = [];
  const sourceParts = Array.isArray(partsList) ? partsList : [];

  if (!Array.isArray(partsList)) {
    validationErrors.push('Cut-list parts must be an array.');
  }

  // Validate before expanding quantities. Invalid rows must not become zero-sized
  // placements or silently turn a zero quantity into one requested part.
  sourceParts.forEach((part, partIndex) => {
    if (!part || typeof part !== 'object' || Array.isArray(part)) {
      invalidParts.push({
        id: `invalid_${partIndex}`,
        name: `Part ${partIndex + 1}`,
        reason: 'Part entry must be an object.',
      });
      return;
    }

    const width = readPositiveNumber(part.width);
    const height = readPositiveNumber(part.height);
    const quantityInput = part.qty === undefined
      ? 1
      : part.qty;
    const quantity = readPositiveInteger(quantityInput);
    const partName = part.name || `Part ${part.id ?? partIndex + 1}`;
    const errors = [];

    if (width === null) errors.push('Width must be a finite number greater than zero.');
    if (height === null) errors.push('Length must be a finite number greater than zero.');
    if (quantity === null) errors.push('Quantity must be a positive whole number.');

    if (errors.length > 0) {
      invalidParts.push({
        id: part.id ?? `invalid_${partIndex}`,
        name: partName,
        width: part.width,
        height: part.height,
        qty: part.qty,
        reason: errors.join(' '),
      });
      return;
    }

    for (let i = 0; i < quantity; i++) {
      itemsToPlace.push({
        id: `${part.id}_${i}`,
        originalId: part.id,
        name: partName,
        width,
        height,
        allowRotation: part.allowRotation !== false,
        color: part.color || '#3B82F6',
        instanceIndex: i + 1,
        totalQty: quantity,
      });
    }
  });

  // Effective sheet size after edge trim margin
  const stockWidth = readPositiveNumber(stockSheet?.width);
  const stockHeight = readPositiveNumber(stockSheet?.height);
  if (stockWidth === null) validationErrors.push('Stock width must be a finite number greater than zero.');
  if (stockHeight === null) validationErrors.push('Stock length must be a finite number greater than zero.');

  const usableWidth = stockWidth === null ? 0 : Math.max(0, stockWidth - margin * 2);
  const usableHeight = stockHeight === null ? 0 : Math.max(0, stockHeight - margin * 2);

  if (usableWidth <= 0 || usableHeight <= 0) {
    validationErrors.push('Stock dimensions and trim margin leave no usable cutting area.');
    return {
      sheets: [],
      unplacedParts: itemsToPlace,
      invalidParts,
      validationErrors,
      overallEfficiency: 0,
      totalSheetsCount: 0,
    };
  }

  // Sort items by size (Largest Area First for optimal packing heuristic)
  itemsToPlace.sort((a, b) => {
    const areaA = a.width * a.height;
    const areaB = b.width * b.height;
    if (areaB !== areaA) return areaB - areaA;
    return Math.max(b.width, b.height) - Math.max(a.width, a.height);
  });

  const sheets = [];
  let remainingItems = [...itemsToPlace];
  let sheetIndex = 1;

  while (remainingItems.length > 0) {
    const sheetResult = packSingleSheet(
      sheetIndex,
      stockWidth,
      stockHeight,
      margin,
      kerf,
      remainingItems,
      strategy,
      cutPref
    );

    if (sheetResult.placements.length === 0) {
      // Cannot fit even one remaining item on a fresh sheet (e.g. piece larger than sheet)
      break;
    }

    sheets.push(sheetResult);

    // Remove placed items from remaining
    const placedIds = new Set(sheetResult.placements.map(p => p.id));
    remainingItems = remainingItems.filter(item => !placedIds.has(item.id));

    sheetIndex++;
    if (sheetIndex > 50) {
      // Safety limit for runaway calculation
      break;
    }
  }

  // Overall Statistics Calculation
  let totalSheetArea = sheets.length * stockWidth * stockHeight;
  let totalPartsArea = 0;
  let totalKerfArea = 0;

  sheets.forEach(s => {
    totalPartsArea += s.usedArea;
    totalKerfArea += s.kerfArea;
  });

  const totalScrapArea = totalSheetArea - totalPartsArea - totalKerfArea;
  const overallEfficiency = totalSheetArea > 0 ? (totalPartsArea / totalSheetArea) * 100 : 0;

  return {
    sheets,
    unplacedParts: remainingItems,
    invalidParts,
    validationErrors,
    totalSheetsCount: sheets.length,
    totalSheetArea,
    totalPartsArea,
    totalKerfArea,
    totalScrapArea,
    overallEfficiency,
  };
}

/**
 * Pack items onto a single stock sheet using Guillotine split
 */
function packSingleSheet(sheetIndex, sheetW, sheetH, margin, kerf, items, strategy, cutPref) {
  // Free rectangles remaining on this sheet
  let freeRects = [
    {
      x: margin,
      y: margin,
      width: sheetW - margin * 2,
      height: sheetH - margin * 2,
    }
  ];

  const placements = [];
  const cuts = [];
  const unplacedInThisSheet = [];

  for (const item of items) {
    let bestRectIdx = -1;
    let bestRotated = false;
    let bestScore = Infinity;

    // Search for best fitting free rect
    for (let i = 0; i < freeRects.length; i++) {
      const free = freeRects[i];

      // Option 1: Normal orientation
      if (item.width <= free.width && item.height <= free.height) {
        const score = calculateScore(free, item.width, item.height, strategy);
        if (score < bestScore) {
          bestScore = score;
          bestRectIdx = i;
          bestRotated = false;
        }
      }

      // Option 2: Rotated 90 degrees (if allowed)
      if (item.allowRotation && item.height <= free.width && item.width <= free.height) {
        const score = calculateScore(free, item.height, item.width, strategy);
        if (score < bestScore) {
          bestScore = score;
          bestRectIdx = i;
          bestRotated = true;
        }
      }
    }

    if (bestRectIdx !== -1) {
      const targetFree = freeRects[bestRectIdx];
      const placedWidth = bestRotated ? item.height : item.width;
      const placedHeight = bestRotated ? item.width : item.height;

      // Add placement
      placements.push({
        id: item.id,
        originalId: item.originalId,
        name: item.name,
        x: targetFree.x,
        y: targetFree.y,
        width: placedWidth,
        height: placedHeight,
        rotated: bestRotated,
        color: item.color,
        instanceIndex: item.instanceIndex,
        totalQty: item.totalQty,
      });

      // Split the selected free rectangle (Guillotine cut)
      // Account for kerf saw blade width added to splits
      const remainingFree = splitFreeRectangle(
        targetFree,
        placedWidth,
        placedHeight,
        kerf,
        cutPref,
        cuts
      );

      // Replace target free rect with newly created splits
      freeRects.splice(bestRectIdx, 1, ...remainingFree);
    } else {
      unplacedInThisSheet.push(item);
    }
  }

  // Calculate statistics for this sheet
  const usedArea = placements.reduce((sum, p) => sum + p.width * p.height, 0);

  // Kerf estimation: count boundary kerf paths
  let kerfLength = 0;
  placements.forEach(p => {
    kerfLength += (p.width + p.height) * 2;
  });
  const kerfArea = Math.min((sheetW * sheetH) - usedArea, kerfLength * kerf * 0.5);

  const scrapArea = Math.max(0, (sheetW * sheetH) - usedArea - kerfArea);
  const efficiency = ((usedArea / (sheetW * sheetH)) * 100);

  return {
    sheetIndex,
    width: sheetW,
    height: sheetH,
    margin,
    kerf,
    placements,
    freeRects,
    cuts,
    usedArea,
    kerfArea,
    scrapArea,
    efficiency,
  };
}

/**
 * Score function for Guillotine bin packing
 */
function calculateScore(free, width, height, strategy) {
  const remW = free.width - width;
  const remH = free.height - height;

  if (strategy === STRATEGIES.BSSF) {
    // Best Short Side First: minimize the smaller leftover dimension
    return Math.min(remW, remH);
  } else {
    // Best Area First: minimize leftover area
    return free.width * free.height - width * height;
  }
}

/**
 * Split a free rectangle after placing a piece of (w, h)
 */
function splitFreeRectangle(free, w, h, kerf, cutPref, cuts) {
  const newFree = [];

  // Dimensions of remaining area
  const rightW = free.width - w - kerf;
  const bottomH = free.height - h - kerf;

  if (cutPref === CUT_PREFERENCES.RIP_FIRST) {
    // Vertical rip cut along the sheet length first
    if (rightW > 0) {
      newFree.push({
        x: free.x + w + kerf,
        y: free.y,
        width: rightW,
        height: h,
      });
    }

    if (bottomH > 0) {
      newFree.push({
        x: free.x,
        y: free.y + h + kerf,
        width: free.width,
        height: bottomH,
      });
    }

    // Track cut lines with relative fence measurement cutSize
    if (rightW > 0) {
      cuts.push({
        type: 'vertical',
        x: free.x + w,
        y1: free.y,
        y2: free.y + h,
        cutSize: w,
      });
    }
    if (bottomH > 0) {
      cuts.push({
        type: 'horizontal',
        y: free.y + h,
        x1: free.x,
        x2: free.x + free.width,
        cutSize: h,
      });
    }

  } else {
    // Horizontal cross-cut across the sheet width first
    if (bottomH > 0) {
      newFree.push({
        x: free.x,
        y: free.y + h + kerf,
        width: w,
        height: bottomH,
      });
    }

    if (rightW > 0) {
      newFree.push({
        x: free.x + w + kerf,
        y: free.y,
        width: rightW,
        height: free.height,
      });
    }

    // Track cut lines with relative fence measurement cutSize
    if (bottomH > 0) {
      cuts.push({
        type: 'horizontal',
        y: free.y + h,
        x1: free.x,
        x2: free.x + w,
        cutSize: h,
      });
    }
    if (rightW > 0) {
      cuts.push({
        type: 'vertical',
        x: free.x + w,
        y1: free.y,
        y2: free.y + free.height,
        cutSize: w,
      });
    }
  }

  return newFree;
}
