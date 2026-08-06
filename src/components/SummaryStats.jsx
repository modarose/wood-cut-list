import React from 'react';
import { Layers, TrendingUp, AlertTriangle, CheckCircle2, Scissors } from 'lucide-react';

export default function SummaryStats({ result, totalRequestedParts }) {
  if (!result) return null;

  const { totalSheetsCount, overallEfficiency } = result;
  const sheets = result.sheets ?? [];
  const unplacedParts = result.unplacedParts ?? [];
  const invalidParts = result.invalidParts ?? [];
  const validationErrors = result.validationErrors ?? [];
  const hasIssues = validationErrors.length > 0 || invalidParts.length > 0 || unplacedParts.length > 0;

  if (sheets.length === 0 && !hasIssues) return null;

  const placedCount = sheets.reduce((sum, s) => sum + s.placements.length, 0);
  const kerfPercent  = sheets.length > 0
    ? Math.max(0, result.totalKerfArea / result.totalSheetArea * 100)
    : 0;
  const scrapPercent = sheets.length > 0 ? Math.max(0, 100 - overallEfficiency - kerfPercent) : 0;
  const partsOk      = invalidParts.length === 0 && unplacedParts.length === 0;

  const issueLines = [
    ...validationErrors,
    ...invalidParts.map(part => `${part.name}: ${part.reason}`),
    ...(unplacedParts.length > 0
      ? [`${unplacedParts.length} valid part instance${unplacedParts.length === 1 ? '' : 's'} do not fit on the available stock.`]
      : []),
  ];

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
    <div className="ws-summary-block" style={{ marginBottom: 'var(--ws-space-md)' }}>
      {hasIssues && (
        <div className="ws-optimization-warning" role="alert">
          <AlertTriangle size={16} />
          <div>
            <strong>Layout needs attention before stock can be reserved.</strong>
            <ul>
              {issueLines.map((issue, index) => <li key={`${issue}-${index}`}>{issue}</li>)}
            </ul>
          </div>
        </div>
      )}
      {sheets.length > 0 && (
        <div className="ws-metrics-grid">
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
      )}
    </div>
  );
}
