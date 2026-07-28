import React, { useState } from 'react';
import { formatDimension } from '../utils/unitConverter';
import { ListOrdered, CheckCircle2, Circle } from 'lucide-react';

export default function CutSequence({ result, unit }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());

  if (!result || !result.sheets || result.sheets.length === 0) return null;

  const toggleStep = (key) => {
    const next = new Set(completedSteps);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCompletedSteps(next);
  };

  return (
    <section className="ws-card no-print">
      <div className="ws-card-header">
        <div className="ws-card-title">
          <ListOrdered size={18} />
          Cut Sequence
        </div>
        <span className="ws-card-badge">Workshop Instructions</span>
      </div>

      <div style={{ paddingTop: 'var(--ws-space-md)', paddingBottom: 'var(--ws-space-sm)' }}>
        {result.sheets.map((sheet, sheetIdx) => {
          if (!sheet.cuts || sheet.cuts.length === 0) return null;

          return (
            <div key={sheetIdx} style={{ marginBottom: 'var(--ws-space-md)' }}>
              {result.sheets.length > 1 && (
                <div style={{
                  padding: '4px var(--ws-space-md)',
                  fontFamily: 'var(--ws-font-mono)',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ws-on-surface-variant)',
                  marginBottom: '12px',
                }}>
                  Sheet #{sheetIdx + 1} — {sheet.cuts.length} cut passes
                </div>
              )}

              <div className="ws-sequence-strip">
                {sheet.cuts.map((cut, cutIdx) => {
                  const key = `s${sheetIdx}_c${cutIdx}`;
                  const done = completedSteps.has(key);
                  const label = cut.type === 'vertical' ? 'Cross Cut' : 'Rip Cut';
                  const fence = cut.cutSize || (cut.type === 'vertical' ? cut.x : cut.y);
                  const length = cut.type === 'vertical'
                    ? (cut.y2 - cut.y1)
                    : (cut.x2 - cut.x1);

                  return (
                    <div
                      key={cutIdx}
                      className={`ws-sequence-card${done ? ' done' : ''}`}
                      onClick={() => toggleStep(key)}
                    >
                      <div className="ws-sequence-card-num">{cutIdx + 1}</div>

                      <div className="ws-sequence-card-type">{label}</div>

                      <div className="ws-sequence-card-title">
                        Fence: {formatDimension(fence, unit)}
                      </div>

                      <div className="ws-sequence-card-desc">
                        {cut.type === 'vertical'
                          ? 'Cross-cut through the sheet at this position.'
                          : 'Set table saw fence and rip the full length.'}
                      </div>

                      <div className="ws-sequence-card-footer">
                        <span className="ws-sequence-card-data">
                          Length: {formatDimension(length, unit)}
                        </span>
                        {done
                          ? <CheckCircle2 size={18} color="var(--ws-primary)" />
                          : <Circle size={18} color="var(--ws-outline)" />
                        }
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
