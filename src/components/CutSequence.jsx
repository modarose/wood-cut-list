import React, { useState } from 'react';
import { formatDimension } from '../utils/unitConverter';
import { ListOrdered, CheckCircle2, Circle, ArrowRight, Ruler } from 'lucide-react';

export default function CutSequence({ result, unit, preview = false, onOpenWorkshop }) {
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const sheetsWithCuts = result?.sheets?.filter(sheet => sheet.cuts?.length > 0) ?? [];

  if (sheetsWithCuts.length === 0) return null;

  const displayedSheets = preview ? sheetsWithCuts.slice(0, 1) : sheetsWithCuts;
  const totalCutCount = sheetsWithCuts.reduce((sum, sheet) => sum + sheet.cuts.length, 0);
  const previewCutLimit = 3;
  const displayedCutCount = displayedSheets.reduce(
    (sum, sheet) => sum + (preview ? Math.min(sheet.cuts.length, previewCutLimit) : sheet.cuts.length),
    0,
  );

  const toggleStep = (key) => {
    const next = new Set(completedSteps);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setCompletedSteps(next);
  };

  return (
    <section className={`ws-card${preview ? ' ws-sequence-preview no-print' : ''}`}>
      <div className="ws-card-header">
        <div className="ws-card-title">
          <ListOrdered size={18} />
          Cut Sequence
        </div>
        {preview && onOpenWorkshop ? (
          <button type="button" className="ws-btn ws-btn-sm" onClick={onOpenWorkshop}>
            Open Workshop
          </button>
        ) : (
          <span className="ws-card-badge">Workshop Instructions</span>
        )}
      </div>

      <div className="ws-sequence-body">
        {displayedSheets.map((sheet, sheetIdx) => {
          const displayedCuts = preview ? sheet.cuts.slice(0, previewCutLimit) : sheet.cuts;
          return (
            <div className="ws-sequence-sheet" key={sheetIdx}>
              <div className="ws-sequence-sheet-header">
                <div>
                  <div className="ws-sequence-sheet-label">Sheet #{sheetIdx + 1}</div>
                  <div className="ws-sequence-sheet-count">{sheet.cuts.length} cut passes · complete in order</div>
                </div>
                <div className="ws-sequence-sheet-note">
                  <ArrowRight size={14} />
                  Start at the trimmed edge; use each new cut edge as the next reference.
                </div>
              </div>

              <div className="ws-sequence-strip">
                {displayedCuts.map((cut, cutIdx) => {
                  const key = `s${sheetIdx}_c${cutIdx}`;
                  const done = completedSteps.has(key);
                  const label = cut.type === 'vertical' ? 'Cross Cut' : 'Rip Cut';
                  const fence = cut.cutSize || (cut.type === 'vertical' ? cut.x : cut.y);
                  const isFirstCut = cutIdx === 0;
                  const length = cut.type === 'vertical'
                    ? (cut.y2 - cut.y1)
                    : (cut.x2 - cut.x1);

                  return (
                    <div
                      key={cutIdx}
                      className={`ws-sequence-card${done ? ' done' : ''}`}
                      onClick={() => toggleStep(key)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleStep(key);
                        }
                      }}
                      aria-pressed={done}
                    >
                      <div className="ws-sequence-card-topline">
                        <div className="ws-sequence-card-num">{cutIdx + 1}</div>
                        <div className="ws-sequence-card-type">{isFirstCut ? 'Start here' : `Step ${cutIdx + 1}`} · {label}</div>
                      </div>

                      <div className="ws-sequence-card-title">
                        {cut.type === 'vertical' ? 'Cross-cut at' : 'Set rip fence to'} {formatDimension(fence, unit)}
                      </div>

                      <div className="ws-sequence-card-desc">
                        {isFirstCut
                          ? (cut.type === 'vertical'
                            ? 'Reference the trimmed sheet edge, then cross-cut through the marked section.'
                            : 'Reference the trimmed sheet edge, set the fence, then rip through the marked section.')
                          : (cut.type === 'vertical'
                            ? 'Reference the edge created by the previous pass, then cross-cut this section.'
                            : 'Move the fence from the previous setup, then rip the remaining section.')}
                      </div>

                      <div className="ws-sequence-card-footer">
                        <span className="ws-sequence-card-data"><Ruler size={13} /> Cut travel: {formatDimension(length, unit)}</span>
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

        {preview && displayedCutCount < totalCutCount && (
          <div className="ws-sequence-preview-more">
            Showing {displayedCutCount} of {totalCutCount} cut passes across {sheetsWithCuts.length} sheet{sheetsWithCuts.length === 1 ? '' : 's'}.
            Open Workshop for the complete sequence.
          </div>
        )}
      </div>
    </section>
  );
}
