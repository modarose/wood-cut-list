import React, { useState, useMemo, useEffect } from 'react';
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

    // Convert stock sheet parameters
    const convertedStock = {
      width: Math.round(convertDimension(stock.width, unit, newUnit) * 10) / 10,
      height: Math.round(convertDimension(stock.height, unit, newUnit) * 10) / 10,
      kerf: Math.round(convertDimension(stock.kerf, unit, newUnit) * 100) / 100,
      margin: Math.round(convertDimension(stock.margin, unit, newUnit) * 10) / 10,
    };

    // Convert all parts dimensions
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

  // Print Cut Sheet Layout
  const handlePrint = () => {
    window.print();
  };

  // Clear All Parts
  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all cut list parts?')) {
      setParts([]);
    }
  };

  const totalRequestedPartsCount = parts.reduce((sum, p) => sum + (parseInt(p.qty) || 0), 0);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Header Bar */}
      <Header
        unit={unit}
        onUnitChange={handleUnitChange}
        onOpenPresets={() => setIsPresetsOpen(true)}
        onExportCSV={handleExportCSV}
        onPrint={handlePrint}
        onClearAll={handleClearAll}
        strategy={strategy}
        onStrategyChange={setStrategy}
      />

      {/* Main Layout Grid */}
      <main style={{ maxWidth: '1440px', width: '100%', margin: '0 auto', padding: '0 1.5rem 3rem 1.5rem', flex: 1 }}>
        
        {/* Dieter Rams LCD Stat Indicators */}
        <SummaryStats
          result={optimizationResult}
          totalRequestedParts={totalRequestedPartsCount}
        />

        {/* Row 1: Section 1 & Section 2 side-by-side */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem', alignItems: 'stretch' }}>
          
          {/* Section 1: Sheet & Saw Parameters */}
          <SheetSettings
            stock={stock}
            onStockChange={setStock}
            unit={unit}
            cutPreference={cutPreference}
            onCutPreferenceChange={setCutPreference}
          />

          {/* Section 2: Cut List Table */}
          <CutListInput
            parts={parts}
            onPartsChange={setParts}
            unit={unit}
          />

        </div>

        {/* Row 2: Full-Width Visualized Cutting Diagram */}
        <div style={{ marginBottom: '1.5rem' }}>
          <Visualizer
            result={optimizationResult}
            unit={unit}
            stock={stock}
          />
        </div>

        {/* Row 3: Full-Width Shop Floor Cutting Sequence Guide */}
        <CutSequence
          result={optimizationResult}
          unit={unit}
        />

      </main>

      {/* Dieter Rams Minimalist Footer */}
      <footer className="no-print" style={{ borderTop: '1px solid var(--ram-border-medium)', background: '#F8F7F4', padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: 'var(--ram-text-muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
          <span style={{ width: '6px', height: '6px', backgroundColor: '#FF4500', borderRadius: '50%' }} />
          <strong>BRAUN // DESIGN PRINCIPLE: LESS, BUT BETTER.</strong>
          <span>• 2D Guillotine Cut List Estimator for Woodworking</span>
        </div>
      </footer>

      {/* Presets Modal */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onLoadPreset={handleLoadPreset}
      />

    </div>
  );
}
