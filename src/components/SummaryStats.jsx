import React from 'react';
import { Layers, TrendingUp, AlertTriangle, CheckCircle2, Scissors } from 'lucide-react';

export default function SummaryStats({ result, totalRequestedParts }) {
  if (!result || result.sheets.length === 0) return null;

  const { totalSheetsCount, overallEfficiency, unplacedParts, sheets } = result;

  const placedCount = sheets.reduce((sum, s) => sum + s.placements.length, 0);
  const kerfPercent  = Math.max(0, result.totalKerfArea / result.totalSheetArea * 100);
  const scrapPercent = Math.max(0, 100 - overallEfficiency - kerfPercent);
  const partsOk      = unplacedParts.length === 0;

  const metrics = [
    {
      label: 'Required Sheets',
      value: totalSheetsCount,
      unit:  totalSheetsCount === 1 ? 'Sheet' : 'Sheets',
      icon:  Layers,
      bar:   null,
    },
    {
      label: 'Material Yield',
      value: overallEfficiency.toFixed(1),
      unit:  '%',
      icon:  TrendingUp,
      bar:   { pct: overallEfficiency, cls: '' },
    },
    {
      label: 'Waste / Offcuts',
      value: scrapPercent.toFixed(1),
      unit:  '%',
      icon:  AlertTriangle,
      cls:   'secondary',
      bar:   { pct: scrapPercent, cls: 'secondary' },
    },
    {
      label: 'Blade Kerf Loss',
      value: kerfPercent.toFixed(1),
      unit:  '%',
      icon:  Scissors,
      cls:   'tertiary',
      bar:   { pct: kerfPercent, cls: 'tertiary' },
    },
    {
      label: 'Parts Cut',
      value: placedCount,
      unit:  `/ ${totalRequestedParts}`,
      icon:  CheckCircle2,
      cls:   partsOk ? '' : 'secondary',
      bar:   { pct: totalRequestedParts ? placedCount / totalRequestedParts * 100 : 0, cls: partsOk ? '' : 'secondary' },
    },
  ];

  return (
    <div className="ws-metrics-grid" style={{ marginBottom: 'var(--ws-space-md)' }}>
      {metrics.map(({ label, value, unit, icon: Icon, cls = '', bar }) => (
        <div className="ws-metric-card" key={label}>
          <div className="ws-metric-label" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Icon size={13} />
            {label}
          </div>
          <div className={`ws-metric-value${cls ? ` ${cls}` : ''}`}>
            {value}
            <span className="ws-metric-unit">{unit}</span>
          </div>
          {bar && (
            <div className="ws-progress-bar">
              <div
                className={`ws-progress-fill${bar.cls ? ` ${bar.cls}` : ''}`}
                style={{ width: `${Math.min(100, bar.pct)}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
