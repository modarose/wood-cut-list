import React from 'react';
import { UNITS } from '../utils/unitConverter';
import { Sliders, Download, Printer, FolderOpen, Trash2, Scissors } from 'lucide-react';

export default function Header({
  unit,
  onUnitChange,
  onOpenPresets,
  onExportCSV,
  onPrint,
  onClearAll,
  strategy,
  onStrategyChange
}) {
  return (
    <header className="ram-card no-print" style={{ borderRadius: 0, borderTop: 0, borderLeft: 0, borderRight: 0, marginBottom: '1.5rem', background: '#F8F7F4' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        
        {/* Dieter Rams Braun Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '38px',
            height: '38px',
            backgroundColor: '#1E2022',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 0 0 #000000',
            position: 'relative'
          }}>
            <Scissors size={20} color="#FF4500" />
            <div style={{
              position: 'absolute',
              top: '4px',
              right: '4px',
              width: '5px',
              height: '5px',
              borderRadius: '50%',
              backgroundColor: '#FF4500',
              boxShadow: '0 0 6px #FF4500'
            }} />
          </div>
          <div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', letterSpacing: '0.08em', textTransform: 'uppercase', color: '#1C1D1F', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              CUT <span style={{ color: '#FF4500' }}>//</span> LIST <span style={{ fontSize: '0.7rem', background: '#242526', color: '#FFF', padding: '1px 5px', borderRadius: '2px', fontFamily: 'var(--ram-font-mono)' }}>8000</span>
            </div>
            <div style={{ fontSize: '0.7rem', fontWeight: '500', color: '#65676B', letterSpacing: '0.04em' }}>
              MINIMALIST WOODWORKING 2D OPTIMIZER
            </div>
          </div>
        </div>

        {/* Unit Selector & Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          
          {/* MM / INCH Toggle Switch */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: '#E6E3DB', padding: '4px 8px', borderRadius: '4px', border: '1px solid #B8B3A6' }}>
            <span style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', color: '#65676B' }}>UNIT:</span>
            <button
              onClick={() => onUnitChange(UNITS.MM)}
              className={`ram-btn ram-btn-sm ${unit === UNITS.MM ? 'ram-btn-orange' : ''}`}
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
            >
              MM
            </button>
            <button
              onClick={() => onUnitChange(UNITS.INCH)}
              className={`ram-btn ram-btn-sm ${unit === UNITS.INCH ? 'ram-btn-orange' : ''}`}
              style={{ padding: '2px 8px', fontSize: '0.75rem' }}
            >
              INCHES
            </button>
          </div>

          {/* Strategy Selector */}
          <div className="ram-input-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.4rem' }}>
            <span className="ram-label" style={{ fontSize: '0.7rem' }}>STRATEGY:</span>
            <select
              value={strategy}
              onChange={(e) => onStrategyChange(e.target.value)}
              className="ram-select"
              style={{ padding: '4px 8px', fontSize: '0.78rem' }}
            >
              <option value="bssf">BSSF (Best Fit)</option>
              <option value="baf">BAF (Area Priority)</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <button onClick={onOpenPresets} className="ram-btn ram-btn-sm" title="Load Woodworking Presets">
              <FolderOpen size={14} />
              PRESETS
            </button>
            <button onClick={onExportCSV} className="ram-btn ram-btn-sm" title="Export Cut List CSV">
              <Download size={14} />
              CSV
            </button>
            <button onClick={onPrint} className="ram-btn ram-btn-sm ram-btn-dark" title="Print Cut Sheet PDF">
              <Printer size={14} />
              PRINT / PDF
            </button>
            <button onClick={onClearAll} className="ram-btn ram-btn-sm" style={{ color: '#D32F2F', borderColor: '#E57373' }} title="Reset All Data">
              <Trash2 size={14} />
            </button>
          </div>

        </div>

      </div>
    </header>
  );
}
