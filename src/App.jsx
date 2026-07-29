import React, { useState, useMemo } from 'react';
import Header from './components/Header';
import SheetSettings from './components/SheetSettings';
import CutListInput from './components/CutListInput';
import SummaryStats from './components/SummaryStats';
import Visualizer from './components/Visualizer';
import CutSequence from './components/CutSequence';
import PresetsModal from './components/PresetsModal';

import { UNITS, convertDimension } from './utils/unitConverter';
import { optimizeCutList, STRATEGIES, CUT_PREFERENCES } from './utils/cutOptimizer';
import { PROJECT_PRESETS } from './utils/presets';

export default function App() {
  // Global App States
  const [unit, setUnit] = useState(UNITS.MM);
  const [strategy, setStrategy] = useState(STRATEGIES.BSSF);
  const [cutPreference, setCutPreference] = useState(CUT_PREFERENCES.RIP_FIRST);

  // Stock Sheet Configuration
  const [stock, setStock] = useState({
    width: 1220,
    height: 2440,
    kerf: 3,
    margin: 5,
  });

  // Cut List Parts
  const [parts, setParts] = useState(PROJECT_PRESETS[0].parts);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  // Handle Unit Switching (MM <-> Inches) with automatic dimension recalculation
  const handleUnitChange = (newUnit) => {
    if (newUnit === unit) return;
    const convertedStock = {
      width: Math.round(convertDimension(stock.width, unit, newUnit) * 10) / 10,
      height: Math.round(convertDimension(stock.height, unit, newUnit) * 10) / 10,
      kerf: Math.round(convertDimension(stock.kerf, unit, newUnit) * 100) / 100,
      margin: Math.round(convertDimension(stock.margin, unit, newUnit) * 10) / 10,
    };
    const convertedParts = parts.map(p => ({
      ...p,
      width: Math.round(convertDimension(p.width, unit, newUnit) * 10) / 10,
      height: Math.round(convertDimension(p.height, unit, newUnit) * 10) / 10,
    }));
    setStock(convertedStock);
    setParts(convertedParts);
    setUnit(newUnit);
  };

  // Run Real-time Cut List Optimization
  const optimizationResult = useMemo(() => {
    return optimizeCutList(stock, parts, {
      kerf: stock.kerf,
      margin: stock.margin,
      strategy,
      cutPreference,
    });
  }, [stock, parts, strategy, cutPreference]);

  // Load Preset Project
  const handleLoadPreset = (preset) => {
    setUnit(preset.unit);
    setStock(preset.stock);
    setParts(preset.parts);
  };

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = `data:text/csv;charset=utf-8,Part Name,Width (${unit}),Length (${unit}),Quantity,Allow Rotation,Color\n`;
    parts.forEach(p => {
      csvContent += `"${p.name}",${p.width},${p.height},${p.qty},${p.allowRotation ? 'Yes' : 'No'},${p.color}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wood_cut_list_${unit}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  const handleClearAll = () => {
    if (window.confirm('Clear all cut list parts?')) setParts([]);
  };

  const totalRequestedPartsCount = parts.reduce((sum, p) => sum + (parseInt(p.qty) || 0), 0);

  return (
    <div className="ws-shell">

      {/* ── Main scrollable area ── */}
      <main className="ws-main">

        {/* Top App Bar */}
        <Header
          unit={unit}
          onUnitChange={handleUnitChange}
          onOpenPresets={() => setIsPresetsOpen(true)}
          onExportCSV={handleExportCSV}
          onPrint={handlePrint}
          onClearAll={handleClearAll}
          strategy={strategy}
          onStrategyChange={setStrategy}
          stock={stock}
          onStockChange={setStock}
        />

        {/* Workspace content */}
        <div className="ws-content">

          {/* Metric Cards Row */}
          <div className="no-print">
            <SummaryStats
              result={optimizationResult}
              totalRequestedParts={totalRequestedPartsCount}
            />
          </div>

          {/* Main Workspace Grid */}
          <div className="ws-workspace-grid">

            {/* Left: inputs column */}
            <div className="ws-inputs-col no-print">
              <SheetSettings
                stock={stock}
                onStockChange={setStock}
                unit={unit}
                cutPreference={cutPreference}
                onCutPreferenceChange={setCutPreference}
              />
              <CutListInput
                parts={parts}
                onPartsChange={setParts}
                unit={unit}
              />
            </div>

            {/* Right: Visualizer */}
            <div>
              <Visualizer
                result={optimizationResult}
                unit={unit}
                stock={stock}
              />
            </div>

          </div>

          {/* Cut Sequence */}
          <div className="no-print">
            <CutSequence result={optimizationResult} unit={unit} />
          </div>

        </div>

        {/* Footer */}
        <footer className="ws-footer no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-md)' }}>
            <span className="ws-footer-brand">WoodCut Studio</span>
            <span style={{ color: 'var(--ws-outline-variant)' }}>|</span>
            <span className="ws-footer-copy">© 2024 · Precision Workshop Tools</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--ws-space-lg)' }}>
            {['Privacy', 'Terms', 'Docs'].map(l => (
              <a key={l} href="#" style={{ fontFamily: 'var(--ws-font-mono)', fontSize: '12px', color: 'var(--ws-outline)', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = 'var(--ws-primary)'}
                onMouseLeave={e => e.target.style.color = 'var(--ws-outline)'}>
                {l}
              </a>
            ))}
          </div>
        </footer>

      </main>

      {/* Presets Modal */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onLoadPreset={handleLoadPreset}
      />

    </div>
  );
}
