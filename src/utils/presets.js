/**
 * Stock sheet templates & sample woodworking project presets
 */
import { UNITS } from './unitConverter';

export const STOCK_PRESETS = [
  {
    name: '4 x 8 ft Plywood / MDF (Imperial)',
    unit: UNITS.INCH,
    width: 48,
    height: 96,
    kerf: 0.125, // 1/8"
    margin: 0.25,
  },
  {
    name: '2440 x 1220 mm Standard Sheet (Metric)',
    unit: UNITS.MM,
    width: 1220,
    height: 2440,
    kerf: 3.0,
    margin: 5.0,
  },
  {
    name: '5 x 5 ft Baltic Birch (Imperial)',
    unit: UNITS.INCH,
    width: 60,
    height: 60,
    kerf: 0.125,
    margin: 0.25,
  },
  {
    name: '2800 x 2070 mm Euro MDF (Metric)',
    unit: UNITS.MM,
    width: 2070,
    height: 2800,
    kerf: 3.0,
    margin: 10.0,
  },
  {
    name: '4 x 4 ft Half Sheet (Imperial)',
    unit: UNITS.INCH,
    width: 48,
    height: 48,
    kerf: 0.125,
    margin: 0.25,
  }
];

export const PROJECT_PRESETS = [
  {
    id: 'bookcase',
    name: 'Custom Bookshelf',
    description: 'A 5-shelf bookshelf with side panels and backer',
    unit: UNITS.MM,
    stock: { width: 1220, height: 2440, kerf: 3, margin: 5 },
    parts: [
      { id: '1', name: 'Side Panels', width: 300, height: 1800, qty: 2, allowRotation: false, color: '#3B82F6' },
      { id: '2', name: 'Top & Bottom', width: 300, height: 840, qty: 2, allowRotation: false, color: '#10B981' },
      { id: '3', name: 'Adjustable Shelves', width: 280, height: 804, qty: 4, allowRotation: true, color: '#F59E0B' },
      { id: '4', name: 'Kick Plate', width: 100, height: 840, qty: 1, allowRotation: true, color: '#8B5CF6' },
      { id: '5', name: 'Plywood Backing', width: 840, height: 1800, qty: 1, allowRotation: false, color: '#EC4899' },
    ]
  },
  {
    id: 'kitchen_cabinet',
    name: 'Base Kitchen Cabinet',
    description: 'Standard 24" (600mm) base cabinet box frame',
    unit: UNITS.MM,
    stock: { width: 1220, height: 2440, kerf: 3, margin: 5 },
    parts: [
      { id: '1', name: 'Side Panels', width: 560, height: 720, qty: 2, allowRotation: false, color: '#2563EB' },
      { id: '2', name: 'Bottom Panel', width: 564, height: 560, qty: 1, allowRotation: false, color: '#059669' },
      { id: '3', name: 'Stretchers', width: 100, height: 564, qty: 2, allowRotation: true, color: '#D97706' },
      { id: '4', name: 'Adjustable Shelf', width: 530, height: 564, qty: 1, allowRotation: true, color: '#7C3AED' },
      { id: '5', name: 'Drawer Front', width: 596, height: 140, qty: 1, allowRotation: false, color: '#DB2777' },
      { id: '6', name: 'Door Panel', width: 596, height: 570, qty: 1, allowRotation: false, color: '#0D9488' },
    ]
  },
  {
    id: 'workbench',
    name: 'Garage Workbench',
    description: 'Heavy duty workshop table top and shelf',
    unit: UNITS.INCH,
    stock: { width: 48, height: 96, kerf: 0.125, margin: 0.25 },
    parts: [
      { id: '1', name: 'Main Worktop', width: 30, height: 72, qty: 1, allowRotation: false, color: '#1E40AF' },
      { id: '2', name: 'Lower Shelf', width: 24, height: 68, qty: 1, allowRotation: false, color: '#047857' },
      { id: '3', name: 'Leg Aprons', width: 4, height: 72, qty: 2, allowRotation: true, color: '#B45309' },
      { id: '4', name: 'End Cap Rails', width: 4, height: 30, qty: 4, allowRotation: true, color: '#6D28D9' },
    ]
  }
];
