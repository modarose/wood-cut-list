import React from 'react';
import { STOCK_PRESETS } from '../utils/presets';
import { convertDimension, UNITS } from '../utils/unitConverter';
import { Maximize2, Scissors, ShieldAlert } from 'lucide-react';

export default function SheetSettings({
  stock,
  onStockChange,
  unit,
  cutPreference,
  onCutPreferenceChange
}) {
  const handleWidthChange = (val) => {
    onStockChange({ ...stock, width: parseFloat(val) || 0 });
  };

  const handleHeightChange = (val) => {
    onStockChange({ ...stock, height: parseFloat(val) || 0 });
  };

  const handleKerfChange = (val) => {
    onStockChange({ ...stock, kerf: parseFloat(val) || 0 });
  };

  const handleMarginChange = (val) => {
    onStockChange({ ...stock, margin: parseFloat(val) || 0 });
  };

  const handlePresetSelect = (preset) => {
    let w = preset.width;
    let h = preset.height;
    let k = preset.kerf;
    let m = preset.margin;

    // Convert dimensions if preset unit differs from current active unit
    if (preset.unit !== unit) {
      w = convertDimension(w, preset.unit, unit);
      h = convertDimension(h, preset.unit, unit);
      k = convertDimension(k, preset.unit, unit);
      m = convertDimension(m, preset.unit, unit);
    }

    onStockChange({
      ...stock,
      width: Math.round(w * 10) / 10,
      height: Math.round(h * 10) / 10,
      kerf: Math.round(k * 100) / 100,
      margin: Math.round(m * 10) / 10,
    });
  };

  return (
    <div className="ram-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
      <div>
        <div className="ram-card-header">
          <div className="ram-card-title">
            1. STOCK SHEET & SAW PARAMETERS
          </div>
          <span className="ram-label" style={{ fontSize: '0.68rem', color: '#FF4500' }}>
            SPECIFICATION
          </span>
        </div>

        {/* 4 Inputs in 1 Line */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.6rem', flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: '0.4rem', marginBottom: '0.75rem' }}>
          
          {/* Width (4 chars) */}
          <div className="ram-input-group" style={{ flexShrink: 0 }}>
            <label className="ram-label" style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.65rem' }}>
              <Maximize2 size={11} /> WIDTH ({unit})
            </label>
            <input
              type="number"
              step={unit === UNITS.INCH ? '0.125' : '1'}
              value={stock.width}
              onChange={(e) => handleWidthChange(e.target.value)}
              className="ram-input num-tabular"
              style={{ width: '4.5rem', padding: '4px 6px', fontSize: '0.85rem' }}
              placeholder="1220"
            />
          </div>

          {/* Height / Length (4 chars) */}
          <div className="ram-input-group" style={{ flexShrink: 0 }}>
            <label className="ram-label" style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.65rem' }}>
              <Maximize2 size={11} style={{ transform: 'rotate(90deg)' }} /> LENGTH ({unit})
            </label>
            <input
              type="number"
              step={unit === UNITS.INCH ? '0.125' : '1'}
              value={stock.height}
              onChange={(e) => handleHeightChange(e.target.value)}
              className="ram-input num-tabular"
              style={{ width: '4.5rem', padding: '4px 6px', fontSize: '0.85rem' }}
              placeholder="2440"
            />
          </div>

          {/* Kerf (2 chars) */}
          <div className="ram-input-group" style={{ flexShrink: 0 }}>
            <label className="ram-label" style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.65rem' }}>
              <Scissors size={11} /> KERF ({unit})
            </label>
            <input
              type="number"
              step={unit === UNITS.INCH ? '0.03125' : '0.5'}
              value={stock.kerf}
              onChange={(e) => handleKerfChange(e.target.value)}
              className="ram-input num-tabular"
              style={{ width: '3.5rem', padding: '4px 6px', fontSize: '0.85rem' }}
              placeholder="3"
            />
          </div>

          {/* Trim Margin (2 chars) */}
          <div className="ram-input-group" style={{ flexShrink: 0 }}>
            <label className="ram-label" style={{ display: 'flex', alignItems: 'center', gap: '0.15rem', fontSize: '0.65rem' }}>
              <ShieldAlert size={11} /> MARGIN ({unit})
            </label>
            <input
              type="number"
              step={unit === UNITS.INCH ? '0.125' : '1'}
              value={stock.margin}
              onChange={(e) => handleMarginChange(e.target.value)}
              className="ram-input num-tabular"
              style={{ width: '3.5rem', padding: '4px 6px', fontSize: '0.85rem' }}
              placeholder="5"
            />
          </div>

        </div>
      </div>

      {/* Preset Dropdown & Cut Preference */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.6rem', paddingTop: '0.65rem', borderTop: '1px dashed #D6D2C8' }}>
        
        {/* Preset Sizes Dropdown */}
        <div className="ram-input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
          <span className="ram-label" style={{ fontSize: '0.65rem' }}>PRESETS:</span>
          <select
            onChange={(e) => {
              const selectedIdx = e.target.value;
              if (selectedIdx !== '') {
                handlePresetSelect(STOCK_PRESETS[parseInt(selectedIdx)]);
              }
            }}
            defaultValue=""
            className="ram-select"
            style={{ padding: '3px 6px', fontSize: '0.75rem', maxWidth: '200px' }}
          >
            <option value="" disabled>Select Preset Size...</option>
            {STOCK_PRESETS.map((p, idx) => (
              <option key={idx} value={idx}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Cut Direction Preference */}
        <div className="ram-input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
          <span className="ram-label" style={{ fontSize: '0.65rem' }}>CUT PREFERENCE:</span>
          <select
            value={cutPreference}
            onChange={(e) => onCutPreferenceChange(e.target.value)}
            className="ram-select"
            style={{ padding: '3px 6px', fontSize: '0.75rem' }}
          >
            <option value="rip_first">Length Rip-Cut First</option>
            <option value="cross_first">Width Cross-Cut First</option>
          </select>
        </div>

      </div>

    </div>
  );
}
