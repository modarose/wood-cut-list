import React, { useState } from 'react';
import { STOCK_PRESETS } from '../utils/presets';
import { convertDimension, UNITS } from '../utils/unitConverter';
import { getAvailableQuantity } from '../utils/materialInventory.js';
import { AlertTriangle, CheckCircle2, LayoutGrid, Maximize2, Scissors, ShieldAlert } from 'lucide-react';

export default function SheetSettings({
  stock,
  onStockChange,
  unit,
  cutPreference,
  onCutPreferenceChange,
  selectedMaterial,
  hasMaterialMappings,
  requiredStockQuantity,
  projectReservation,
  onReserveMaterial,
  onReleaseMaterial,
}) {
  const [reservationError, setReservationError] = useState('');
  const handleWidthChange  = val => onStockChange({ ...stock, width:  parseFloat(val) || 0 });
  const handleHeightChange = val => onStockChange({ ...stock, height: parseFloat(val) || 0 });
  const handleKerfChange   = val => onStockChange({ ...stock, kerf:   parseFloat(val) || 0 });
  const handleMarginChange = val => onStockChange({ ...stock, margin: parseFloat(val) || 0 });

  const handleReserveMaterial = () => {
    setReservationError('');
    const result = onReserveMaterial();
    if (!result.saved) setReservationError(result.error);
  };

  const handleReleaseMaterial = () => {
    setReservationError('');
    const result = onReleaseMaterial();
    if (!result.saved) setReservationError(result.error);
  };

  const handlePresetSelect = (preset) => {
    let w = preset.width, h = preset.height, k = preset.kerf, m = preset.margin;
    if (preset.unit !== unit) {
      w = convertDimension(w, preset.unit, unit);
      h = convertDimension(h, preset.unit, unit);
      k = convertDimension(k, preset.unit, unit);
      m = convertDimension(m, preset.unit, unit);
    }
    onStockChange({
      ...stock,
      width:  Math.round(w * 10) / 10,
      height: Math.round(h * 10) / 10,
      kerf:   Math.round(k * 100) / 100,
      margin: Math.round(m * 10) / 10,
    });
  };

  const step = unit === UNITS.INCH ? '0.125' : '1';
  const kerfStep = unit === UNITS.INCH ? '0.03125' : '0.5';
  const additionalReservationQuantity = requiredStockQuantity - (projectReservation?.quantity ?? 0);

  return (
    <section className="ws-card">
      <div className="ws-card-header">
        <div className="ws-card-title">
          <LayoutGrid size={18} />
          Stock Boards
        </div>
      </div>

      <div className="ws-card-body">

        {/* 4 dimension inputs */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '16px' }}>

          <div className="ws-input-group" style={{ flex: '1 1 80px' }}>
            <label className="ws-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Maximize2 size={10} /> Width ({unit})
            </label>
            <input
              type="number"
              step={step}
              value={stock.width}
              onChange={e => handleWidthChange(e.target.value)}
              className="ws-input"
            />
          </div>

          <div className="ws-input-group" style={{ flex: '1 1 80px' }}>
            <label className="ws-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Maximize2 size={10} style={{ transform: 'rotate(90deg)' }} /> Length ({unit})
            </label>
            <input
              type="number"
              step={step}
              value={stock.height}
              onChange={e => handleHeightChange(e.target.value)}
              className="ws-input"
            />
          </div>

          <div className="ws-input-group" style={{ flex: '1 1 65px' }}>
            <label className="ws-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Scissors size={10} /> Kerf ({unit})
            </label>
            <input
              type="number"
              step={kerfStep}
              value={stock.kerf}
              onChange={e => handleKerfChange(e.target.value)}
              className="ws-input"
            />
          </div>

          <div className="ws-input-group" style={{ flex: '1 1 65px' }}>
            <label className="ws-label" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <ShieldAlert size={10} /> Margin ({unit})
            </label>
            <input
              type="number"
              step={step}
              value={stock.margin}
              onChange={e => handleMarginChange(e.target.value)}
              className="ws-input"
            />
          </div>

        </div>

        {/* Dimension summary chip */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'var(--ws-surface-container)',
          borderRadius: 'var(--ws-radius)',
          padding: '4px 10px',
          marginBottom: '16px',
          fontFamily: 'var(--ws-font-mono)',
          fontSize: '13px',
          fontWeight: 600,
          color: 'var(--ws-on-surface)',
        }}>
          {stock.width} × {stock.height} {unit}
          <span style={{ fontSize: '11px', fontWeight: 400, color: 'var(--ws-on-surface-variant)' }}>
            Kerf {stock.kerf} · Margin {stock.margin}
          </span>
        </div>

        <div className={`ws-stock-source${selectedMaterial ? ' linked' : ' unlinked'}`}>
          <div className="ws-stock-source-heading">
            {selectedMaterial ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
            {selectedMaterial ? 'Inventory source linked' : 'Manual stock template'}
          </div>
          {selectedMaterial ? (
            <>
              <strong>{selectedMaterial.name}</strong>
              <span className="ws-stock-source-meta">
                {selectedMaterial.source === 'owned' ? 'Owned' : 'Planned purchase'}
                {selectedMaterial.location ? ` · ${selectedMaterial.location}` : ''}
                <span> · {selectedMaterial.dimensions.thickness} mm thick</span>
              </span>
              {selectedMaterial.source === 'planned' && (
                <div className="ws-stock-source-warning">
                  <AlertTriangle size={13} /> This is planned stock, not material currently owned.
                </div>
              )}
              {!hasMaterialMappings && (
                <div className="ws-stock-source-warning">
                  <AlertTriangle size={13} /> Cut-list parts do not identify a material mapping; thickness fit still needs review.
                </div>
              )}
              <div className="ws-stock-source-actions">
                <button
                  type="button"
                  className="ws-btn ws-btn-sm"
                  onClick={handleReserveMaterial}
                  disabled={selectedMaterial.source !== 'owned'
                    || getAvailableQuantity(selectedMaterial) <= 0
                    || requiredStockQuantity <= 0
                    || additionalReservationQuantity <= 0}
                  title={selectedMaterial.source !== 'owned' ? 'Only owned stock can be reserved' : undefined}
                >
                  {projectReservation
                    ? additionalReservationQuantity > 0
                      ? `Reserve ${additionalReservationQuantity} more sheets`
                      : `Reserved ${projectReservation.quantity} / ${requiredStockQuantity}`
                    : requiredStockQuantity > 0 ? `Reserve ${requiredStockQuantity} sheets` : 'Add parts to reserve'}
                </button>
                {projectReservation && (
                  <button type="button" className="ws-btn ws-btn-sm" onClick={handleReleaseMaterial}>
                    Release reservation
                  </button>
                )}
              </div>
              {reservationError && <div className="ws-stock-source-warning" role="alert">{reservationError}</div>}
            </>
          ) : (
            <>
              <span className="ws-stock-source-meta">Current dimensions are not linked to workshop inventory.</span>
              <div className="ws-stock-source-warning">
                <AlertTriangle size={13} /> Material source, thickness and owned quantity are unverified.
              </div>
            </>
          )}
        </div>

        {/* Preset + cut preference */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', paddingTop: '12px', borderTop: '1px solid var(--ws-outline-variant)' }}>

          <div className="ws-input-group" style={{ flex: '1 1 160px' }}>
            <label className="ws-label">Sheet Presets</label>
            <select
              onChange={e => {
                if (e.target.value !== '') handlePresetSelect(STOCK_PRESETS[parseInt(e.target.value)]);
              }}
              defaultValue=""
              className="ws-select"
            >
              <option value="" disabled>Select Preset Size…</option>
              {STOCK_PRESETS.map((p, idx) => (
                <option key={idx} value={idx}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="ws-input-group" style={{ flex: '1 1 160px' }}>
            <label className="ws-label">Cut Preference</label>
            <select
              value={cutPreference}
              onChange={e => onCutPreferenceChange(e.target.value)}
              className="ws-select"
            >
              <option value="rip_first">Length Rip-Cut First</option>
              <option value="cross_first">Width Cross-Cut First</option>
            </select>
          </div>

        </div>

      </div>
    </section>
  );
}
