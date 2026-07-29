import React from 'react';
import { UNITS } from '../utils/unitConverter';
import { Download, Printer, FolderOpen, Trash2 } from 'lucide-react';

export default function Header({
  unit,
  onUnitChange,
  onOpenPresets,
  onExportCSV,
  onPrint,
  onClearAll,
  strategy,
  onStrategyChange,
  stock,
  onStockChange,
}) {
  return (
    <header className="ws-appbar no-print">

      <div className="ws-project-identity">
        <div className="ws-project-title">WoodCut Studio</div>
        <div className="ws-project-subtitle">Project Alpha</div>
      </div>

      {/* Left: unit pill + kerf inline */}
      <div className="ws-appbar-left" style={{ flexWrap: 'wrap', gap: '12px' }}>

        {/* MM / INCHES pill toggle */}
        <div className="ws-pill-group">
          <button
            className={`ws-pill-btn${unit === UNITS.MM ? ' active' : ''}`}
            onClick={() => onUnitChange(UNITS.MM)}
          >
            MM
          </button>
          <button
            className={`ws-pill-btn${unit === UNITS.INCH ? ' active' : ''}`}
            onClick={() => onUnitChange(UNITS.INCH)}
          >
            INCHES
          </button>
        </div>

        {/* Kerf inline */}
        <div className="ws-appbar-stat">
          <label htmlFor="header-kerf">KERF:</label>
          <input
            id="header-kerf"
            className="ws-appbar-input"
            type="number"
            step={unit === UNITS.INCH ? '0.03125' : '0.5'}
            value={stock.kerf}
            onChange={e => onStockChange({ ...stock, kerf: parseFloat(e.target.value) || 0 })}
          />
          <label htmlFor="header-kerf" style={{ fontFamily: 'var(--ws-font-mono)', fontSize: '11px', fontWeight: 500 }}>
            {unit}
          </label>
        </div>

        {/* Strategy selector */}
        <div className="ws-appbar-stat">
          <label style={{ fontFamily: 'var(--ws-font-mono)', fontSize: '11px', fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            STRATEGY:
          </label>
          <select
            value={strategy}
            onChange={e => onStrategyChange(e.target.value)}
            className="ws-select-inline"
          >
            <option value="bssf">BSSF (Best Fit)</option>
            <option value="baf">BAF (Area Priority)</option>
          </select>
        </div>

      </div>

      {/* Right: action buttons */}
      <div className="ws-appbar-right">
        <button onClick={onOpenPresets} className="ws-btn ws-btn-sm" title="Load Woodworking Presets">
          <FolderOpen size={14} />
          Presets
        </button>
        <button onClick={onExportCSV} className="ws-btn ws-btn-sm" title="Export Cut List CSV">
          <Download size={14} />
          CSV
        </button>
        <button onClick={onPrint} className="ws-btn ws-btn-primary ws-btn-sm" title="Print Cut Sheet PDF">
          <Printer size={14} />
          Print / PDF
        </button>
        <button
          onClick={onClearAll}
          className="ws-btn-icon"
          style={{ color: 'var(--ws-error)' }}
          title="Reset All Data"
        >
          <Trash2 size={16} />
        </button>
      </div>

    </header>
  );
}
