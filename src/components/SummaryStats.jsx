import React from 'react';
import { Layers, PieChart, AlertTriangle, CheckCircle2, Scissors } from 'lucide-react';

export default function SummaryStats({ result, totalRequestedParts }) {
  if (!result || result.sheets.length === 0) {
    return null;
  }

  const {
    totalSheetsCount,
    overallEfficiency,
    unplacedParts,
    sheets
  } = result;

  // Aggregate placed parts count
  const placedCount = sheets.reduce((sum, s) => sum + s.placements.length, 0);

  // Total scrap & kerf percent
  const scrapPercent = Math.max(0, 100 - overallEfficiency - (result.totalKerfArea / result.totalSheetArea * 100));
  const kerfPercent = Math.max(0, (result.totalKerfArea / result.totalSheetArea * 100));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.85rem', marginBottom: '1.5rem' }}>
      
      {/* 1. Sheets Needed */}
      <div className="ram-lcd-box">
        <div className="ram-lcd-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Layers size={13} color="#FF4500" /> REQUIRED SHEETS
        </div>
        <div className="ram-lcd-value">
          {totalSheetsCount} <span className="ram-lcd-unit">{totalSheetsCount === 1 ? 'SHEET' : 'SHEETS'}</span>
        </div>
      </div>

      {/* 2. Material Yield % */}
      <div className="ram-lcd-box">
        <div className="ram-lcd-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <PieChart size={13} color="#10B981" /> MATERIAL YIELD
        </div>
        <div className="ram-lcd-value" style={{ color: '#10B981' }}>
          {overallEfficiency.toFixed(1)}<span className="ram-lcd-unit">%</span>
        </div>
      </div>

      {/* 3. Offcut Scrap % */}
      <div className="ram-lcd-box">
        <div className="ram-lcd-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <AlertTriangle size={13} color="#D97706" /> SCRAP OFFCUTS
        </div>
        <div className="ram-lcd-value amber">
          {scrapPercent.toFixed(1)}<span className="ram-lcd-unit">%</span>
        </div>
      </div>

      {/* 4. Saw Kerf Loss % */}
      <div className="ram-lcd-box">
        <div className="ram-lcd-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Scissors size={13} color="#65676B" /> BLADE KERF LOSS
        </div>
        <div className="ram-lcd-value">
          {kerfPercent.toFixed(1)}<span className="ram-lcd-unit">%</span>
        </div>
      </div>

      {/* 5. Parts Placed */}
      <div className="ram-lcd-box">
        <div className="ram-lcd-label" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <CheckCircle2 size={13} color={unplacedParts.length === 0 ? '#10B981' : '#D97706'} /> PARTS CUT
        </div>
        <div className="ram-lcd-value" style={{ color: unplacedParts.length === 0 ? 'var(--ram-text-main)' : '#D97706' }}>
          {placedCount} <span className="ram-lcd-unit">/ {totalRequestedParts}</span>
        </div>
      </div>

    </div>
  );
}
