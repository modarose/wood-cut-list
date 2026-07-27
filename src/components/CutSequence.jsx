import React, { useState } from 'react';
import { formatDimension, UNITS } from '../utils/unitConverter';
import { ListOrdered, ChevronRight, CheckSquare, Square, Wrench } from 'lucide-react';

export default function CutSequence({ result, unit }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());

  if (!result || !result.sheets || result.sheets.length === 0) {
    return null;
  }

  const toggleStep = (stepKey) => {
    const next = new Set(completedSteps);
    if (next.has(stepKey)) {
      next.delete(stepKey);
    } else {
      next.add(stepKey);
    }
    setCompletedSteps(next);
  };

  return (
    <div className="ram-card no-print" style={{ marginTop: '1.5rem' }}>
      <div className="ram-card-header">
        <div className="ram-card-title">
          3. SHOP FLOOR CUTTING SEQUENCE GUIDE
        </div>
        <span className="ram-label" style={{ fontSize: '0.68rem', color: '#2E7D32' }}>
          WORKSHOP INSTRUCTIONS
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {result.sheets.map((sheet, sheetIdx) => (
          <div key={sheetIdx} style={{ background: '#FFFFFF', padding: '1rem', borderRadius: '4px', border: '1px solid var(--ram-border-medium)' }}>
            
            <div style={{ fontWeight: '700', fontSize: '0.9rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1C1D1F' }}>
              <Wrench size={16} color="#FF4500" />
              SHEET #{sheetIdx + 1} CUT STEPS ({sheet.cuts.length} CUT PASSES)
            </div>

            {sheet.cuts.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--ram-text-muted)' }}>
                Single panel placement without splits needed.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {sheet.cuts.map((cut, cutIdx) => {
                  const stepKey = `s${sheetIdx}_c${cutIdx}`;
                  const isDone = completedSteps.has(stepKey);

                  const cutTypeLabel = cut.type === 'vertical' ? 'VERTICAL CROSS-CUT' : 'HORIZONTAL RIP-CUT';
                  const positionVal = cut.type === 'vertical' ? cut.x : cut.y;
                  const lengthVal = cut.type === 'vertical' ? (cut.y2 - cut.y1) : (cut.x2 - cut.x1);

                  return (
                    <div
                      key={cutIdx}
                      onClick={() => toggleStep(stepKey)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justify: 'space-between',
                        padding: '0.6rem 0.85rem',
                        background: isDone ? '#F0F9F4' : 'var(--ram-surface)',
                        border: `1px solid ${isDone ? '#A7F3D0' : 'var(--ram-border-light)'}`,
                        borderRadius: '3px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        opacity: isDone ? 0.75 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {isDone ? (
                          <CheckSquare size={18} color="#10B981" />
                        ) : (
                          <Square size={18} color="var(--ram-border-medium)" />
                        )}
                        <div>
                          <div style={{
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            textDecoration: isDone ? 'line-through' : 'none',
                            color: isDone ? '#065F46' : '#1C1D1F'
                          }}>
                            PASS #{cutIdx + 1}: {cutTypeLabel}
                          </div>
                          <div className="num-tabular" style={{ fontSize: '0.75rem', color: 'var(--ram-text-muted)' }}>
                            Set table saw fence to <strong>{formatDimension(positionVal, unit)}</strong> (Cut distance length: {formatDimension(lengthVal, unit)})
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <span className="ram-btn ram-btn-sm" style={{ padding: '2px 6px', fontSize: '0.68rem', background: '#EAE8E1' }}>
                          {cut.type.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        ))}
      </div>
    </div>
  );
}
