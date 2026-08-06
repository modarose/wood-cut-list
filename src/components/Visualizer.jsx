import React, { useState, useRef, useEffect, useCallback } from 'react';
import { formatDimension, UNITS } from '../utils/unitConverter';
import { ZoomIn, ZoomOut, RotateCcw, Layers, AlertTriangle } from 'lucide-react';

const SheetDiagram = ({ sheet, unit, svgPadding = 40, isPrint = false, onPartHover }) => {
  const { width: sheetW, height: sheetH, margin, kerf, placements, freeRects, cuts } = sheet;
  const viewBoxW = sheetW + svgPadding * 2;
  const viewBoxH = sheetH + svgPadding * 2;

  return (
    <svg
      width="100%"
      height={isPrint ? "auto" : "100%"}
      viewBox={`0 0 ${viewBoxW} ${viewBoxH}`}
      preserveAspectRatio="xMidYMid meet"
      style={!isPrint ? {
        transition: 'transform 0.15s ease-out'
      } : { maxWidth: '100%', height: 'auto', display: 'block', margin: '0 auto' }}
    >
      <defs>
        {/* Minimalist Scrap Hatch Pattern */}
        <pattern id={`scrapHatch${isPrint ? '_print' : ''}`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="12" stroke="#CBD2D0" strokeWidth="2" />
        </pattern>
        {/* Grid Pattern */}
        <pattern id={`sheetGrid${isPrint ? '_print' : ''}`} width={unit === UNITS.MM ? 100 : 12} height={unit === UNITS.MM ? 100 : 12} patternUnits="userSpaceOnUse">
          <path d={`M ${unit === UNITS.MM ? 100 : 12} 0 L 0 0 0 ${unit === UNITS.MM ? 100 : 12}`} fill="none" stroke="#E2DEC" strokeWidth="0.5" />
        </pattern>
      </defs>

      <g transform={`translate(${svgPadding}, ${svgPadding})`}>

        {/* Outer Stock Sheet Background */}
        <rect
          x="0"
          y="0"
          width={sheetW}
          height={sheetH}
          fill="#FFFFFF"
          stroke="#242526"
          strokeWidth="2"
        />
        {/* Inner Grid */}
        <rect
          x="0"
          y="0"
          width={sheetW}
          height={sheetH}
          fill={`url(#sheetGrid${isPrint ? '_print' : ''})`}
        />

        {/* Edge Trim Margin Line */}
        {margin > 0 && (
          <rect
            x={margin}
            y={margin}
            width={sheetW - margin * 2}
            height={sheetH - margin * 2}
            fill="none"
            stroke="#FF4500"
            strokeWidth="1"
            strokeDasharray="4,4"
          />
        )}

        {/* Offcut Scrap Areas */}
        {freeRects.map((free, idx) => (
          <g key={`free_${idx}`}>
            <rect
              x={free.x}
              y={free.y}
              width={free.width}
              height={free.height}
              fill={`url(#scrapHatch${isPrint ? '_print' : ''})`}
              stroke="#A8B0AD"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            {/* Scrap Label if big enough */}
            {free.width > (sheetW * 0.1) && free.height > (sheetH * 0.1) && (
              <text
                x={free.x + free.width / 2}
                y={free.y + free.height / 2}
                fill="#788280"
                fontSize={Math.min(free.width, free.height) * 0.15}
                fontWeight="600"
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="var(--ram-font-mono)"
              >
                SCRAP ({formatDimension(free.width, unit, false)} × {formatDimension(free.height, unit, false)})
              </text>
            )}
          </g>
        ))}

        {/* Blade Cut Lines */}
        {cuts.map((cut, idx) => (
          cut.type === 'vertical' ? (
            <line
              key={`cut_${idx}`}
              x={cut.x}
              y1={cut.y1}
              x2={cut.x}
              y2={cut.y2}
              stroke="#FF4500"
              strokeWidth={Math.max(1.5, kerf)}
              strokeOpacity="0.8"
            />
          ) : (
            <line
              key={`cut_${idx}`}
              x1={cut.x1}
              y1={cut.y}
              x2={cut.x2}
              y2={cut.y}
              stroke="#FF4500"
              strokeWidth={Math.max(1.5, kerf)}
              strokeOpacity="0.8"
            />
          )
        ))}

        {/* Placed Parts */}
        {placements.map((p) => {
          const textFitW = p.width > 40;
          const textFitH = p.height > 25;

          return (
            <g
              key={p.id}
              onMouseEnter={() => onPartHover?.(p)}
              onMouseLeave={() => onPartHover?.(null)}
              style={!isPrint ? { cursor: 'help' } : undefined}
            >
              {/* Part Block */}
              <rect
                x={p.x}
                y={p.y}
                width={p.width}
                height={p.height}
                fill={p.color || '#3B82F6'}
                // Parts must be opaque so the scrap hatch pattern underneath
                // cannot show through as diagonal lines.
                fillOpacity="1"
                stroke="#1E2022"
                strokeWidth="1.5"
                rx="2"
              />

              {/* Part Text & Dimension Overlays */}
              {textFitW && textFitH && (
                <g pointerEvents="none">
                  {/* Name */}
                  <text
                    x={p.x + p.width / 2}
                    y={p.y + p.height / 2 - 4}
                    fill="#FFFFFF"
                    fontSize={Math.max(10, Math.min(16, p.width * 0.08))}
                    fontWeight="700"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="var(--ram-font-sans)"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}
                  >
                    {p.name}
                  </text>

                  {/* Dimensions */}
                  <text
                    x={p.x + p.width / 2}
                    y={p.y + p.height / 2 + 12}
                    fill="rgba(255,255,255,0.95)"
                    fontSize={Math.max(8, Math.min(12, p.width * 0.06))}
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="var(--ram-font-mono)"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.6)' }}
                  >
                    {formatDimension(p.width, unit)} × {formatDimension(p.height, unit)}
                  </text>

                  {/* Rotation Icon Tag */}
                  {p.rotated && (
                    <text
                      x={p.x + p.width - 12}
                      y={p.y + 12}
                      fill="#FF4500"
                      fontSize="10"
                      fontWeight="bold"
                      textAnchor="middle"
                    >
                      ↻
                    </text>
                  )}
                </g>
              )}
            </g>
          );
        })}

        {/* Sheet Dimension Outer Labels */}
        {/* Top Width Ruler */}
        <text x={sheetW / 2} y="-12" fill="#1C1D1F" fontSize="12" fontWeight="700" textAnchor="middle" fontFamily="var(--ram-font-mono)">
          {formatDimension(sheetW, unit)}
        </text>
        {/* Left Height Ruler */}
        <text x="-12" y={sheetH / 2} fill="#1C1D1F" fontSize="12" fontWeight="700" textAnchor="middle" transform={`rotate(-90, -12, ${sheetH / 2})`} fontFamily="var(--ram-font-mono)">
          {formatDimension(sheetH, unit)}
        </text>

      </g>
    </svg>
  );
};

export default function Visualizer({ result, unit }) {
  const [activeSheetIdx, setActiveSheetIdx] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredPart, setHoveredPart] = useState(null);

  const containerRef = useRef(null);

  // Zoom / Pan handlers
  const handleZoomIn = () => setZoom(z => Math.min(z + 0.25, 6));
  const handleZoomOut = () => setZoom(z => Math.max(z - 0.25, 0.25));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => setIsDragging(false);

  // Mouse wheel zoom centered on cursor position
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    // Cursor position relative to container center
    const cursorX = e.clientX - rect.left - rect.width / 2;
    const cursorY = e.clientY - rect.top - rect.height / 2;

    const zoomFactor = e.deltaY < 0 ? 1.12 : 1 / 1.12;

    setZoom(prevZoom => {
      const newZoom = Math.min(Math.max(prevZoom * zoomFactor, 0.25), 6);
      // Adjust pan so zoom centres on the cursor
      setPan(prevPan => ({
        x: cursorX - (cursorX - prevPan.x) * (newZoom / prevZoom),
        y: cursorY - (cursorY - prevPan.y) * (newZoom / prevZoom),
      }));
      return newZoom;
    });
  }, []);

  // Attach wheel listener as non-passive to allow preventDefault
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const validationErrors = result?.validationErrors ?? [];
  const invalidParts = result?.invalidParts ?? [];
  const unplacedParts = result?.unplacedParts ?? [];
  const hasIssues = validationErrors.length > 0 || invalidParts.length > 0 || unplacedParts.length > 0;

  if (!result || !result.sheets || result.sheets.length === 0) {
    return (
      <div className="ram-card" style={{ minHeight: '350px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--ram-text-muted)', background: 'var(--ram-surface)' }}>
        <Layers size={36} color="var(--ram-border-medium)" style={{ marginBottom: '0.75rem' }} />
        <div style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>NO CUT LAYOUT GENERATED</div>
        {!hasIssues && (
          <div style={{ fontSize: '0.8rem', marginTop: '0.25rem' }}>Add parts to your cut list to calculate sheet layout.</div>
        )}
        {hasIssues && (
          <div className="ws-optimization-warning" style={{ maxWidth: '520px', margin: 'var(--ws-space-md)', textAlign: 'left' }}>
            <AlertTriangle size={16} />
            <div>
              <strong>Resolve the issues below to generate a layout.</strong>
              <ul>
                {validationErrors.map((error, index) => <li key={`validation-${index}`}>{error}</li>)}
                {invalidParts.map((part, index) => <li key={`invalid-${part.id}-${index}`}>{part.name}: {part.reason}</li>)}
                {unplacedParts.length > 0 && (
                  <li>{unplacedParts.length} valid part instance{unplacedParts.length === 1 ? '' : 's'} do not fit on the available stock.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentSheet = result.sheets[activeSheetIdx] || result.sheets[0];
  const { placements } = currentSheet;

  // SVG viewBox aspect setup
  const svgPadding = 40;

  return (
    <div className="ram-card" style={{ padding: 0, overflow: 'hidden' }}>

      {/* Visualizer Top Bar / Sheet Tabs */}
      <div className="no-print" style={{
        display: 'flex',
        alignItems: 'center',
        justify: 'space-between',
        padding: '0.75rem 1.25rem',
        background: '#EAE8E1',
        borderBottom: '1px solid var(--ram-border-medium)',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>

        {/* Sheet Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', overflowX: 'auto' }}>
          {result.sheets.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setActiveSheetIdx(idx)}
              className={`ram-btn ram-btn-sm ${idx === activeSheetIdx ? 'ram-btn-orange' : ''}`}
              style={{ fontSize: '0.72rem', padding: '4px 10px' }}
            >
              SHEET {idx + 1} ({s.placements.length} PARTS)
            </button>
          ))}
        </div>

        {/* Pan & Zoom Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <button onClick={handleZoomIn} className="ram-btn ram-btn-sm ram-btn-icon" title="Zoom In">
            <ZoomIn size={14} />
          </button>
          <button onClick={handleZoomOut} className="ram-btn ram-btn-sm ram-btn-icon" title="Zoom Out">
            <ZoomOut size={14} />
          </button>
          <button onClick={handleReset} className="ram-btn ram-btn-sm" style={{ padding: '4px 8px', fontSize: '0.7rem' }} title="Reset View">
            <RotateCcw size={12} /> RESET
          </button>
        </div>

      </div>

      {/* Interactive SVG Sheet Workspace */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="no-print"
        style={{
          width: '100%',
          height: '660px',
          background: '#F0EEE8',
          cursor: isDragging ? 'grabbing' : 'grab',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <div style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <SheetDiagram
            sheet={currentSheet}
            unit={unit}
            svgPadding={svgPadding}
            onPartHover={setHoveredPart}
          />
        </div>

        {/* Hover Tooltip Overlay */}
        {hoveredPart && (
          <div style={{
            position: 'absolute',
            bottom: '12px',
            left: '12px',
            background: 'var(--ram-dark-surface)',
            color: 'var(--ram-text-on-dark)',
            padding: '12px 16px',
            borderRadius: '8px',
            fontSize: '0.9rem',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 10,
            borderLeft: `5px solid ${hoveredPart.color || '#3B82F6'}`,
            pointerEvents: 'none',
            minWidth: '220px'
          }}>
            <div style={{ fontWeight: '700', textTransform: 'uppercase', marginBottom: '5px', fontSize: '0.95rem' }}>
              {hoveredPart.name} {hoveredPart.rotated && <span style={{ color: '#FF4500' }}>(ROTATED 90°)</span>}
            </div>
            <div style={{ fontFamily: 'var(--ram-font-mono)', fontSize: '0.85rem', opacity: 0.95 }}>
              Size: <strong>{formatDimension(hoveredPart.width, unit)}</strong> × <strong>{formatDimension(hoveredPart.height, unit)}</strong>
            </div>
            <div style={{ fontFamily: 'var(--ram-font-mono)', fontSize: '0.78rem', color: '#9CA3AF', marginTop: '4px' }}>
              Position X: {formatDimension(hoveredPart.x, unit)}, Y: {formatDimension(hoveredPart.y, unit)}
            </div>
          </div>
        )}

      </div>

      {/* Sheet Parts Inventory Footer */}
      <div className="no-print" style={{ padding: '0.85rem 1.25rem', background: '#F8F7F4', borderTop: '1px solid var(--ram-border-light)' }}>
        <div className="ram-label" style={{ marginBottom: '0.5rem' }}>
          PARTS ON SHEET {activeSheetIdx + 1}:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {placements.map((p, i) => (
            <div key={i} style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              background: '#FFFFFF',
              border: '1px solid var(--ram-border-medium)',
              padding: '3px 8px',
              borderRadius: '3px',
              fontSize: '0.75rem'
            }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: p.color || '#3B82F6' }} />
              <span style={{ fontWeight: '600' }}>{p.name}:</span>
              <span className="num-tabular" style={{ color: 'var(--ram-text-muted)' }}>
                {formatDimension(p.width, unit)} × {formatDimension(p.height, unit)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="print-only print-report">
        {/* The report index is intentionally separate from the diagrams so it can
            flow over multiple pages without splitting a diagram page. */}
        <section className="print-page print-summary">
          <div className="print-report-kicker">WOODCUT STUDIO · CUT REPORT</div>
          <h1>Cut List &amp; Sheet Schedule</h1>
          <p className="print-report-subtitle">
            {result.sheets.length} sheet{result.sheets.length === 1 ? '' : 's'} · {unit.toUpperCase()} ·
            {' '}generated from the current optimized layout
          </p>

          <div className="print-summary-grid">
            <div><span>STOCK SHEET</span><strong>{formatDimension(result.sheets[0].width, unit)} × {formatDimension(result.sheets[0].height, unit)}</strong></div>
            <div><span>EDGE MARGIN</span><strong>{formatDimension(result.sheets[0].margin, unit)}</strong></div>
            <div><span>KERF</span><strong>{formatDimension(result.sheets[0].kerf, unit)}</strong></div>
            <div><span>MATERIAL YIELD</span><strong>{result.overallEfficiency.toFixed(1)}%</strong></div>
          </div>

          <h2>Sheet &amp; Part Schedule</h2>
          <table className="print-parts-table">
            <thead>
              <tr>
                <th>Sheet</th>
                <th>Part</th>
                <th>Dimensions</th>
                <th>Position</th>
                <th>Orientation</th>
              </tr>
            </thead>
            <tbody>
              {result.sheets.flatMap((sheet, sheetIdx) => sheet.placements.map((p, partIdx) => (
                <tr key={`${sheetIdx}-${p.id || partIdx}`}>
                  <td className="print-nowrap">#{sheetIdx + 1}</td>
                  <td><span className="print-color-dot" style={{ backgroundColor: p.color || '#3B82F6' }} />{p.name}</td>
                  <td className="print-nowrap">{formatDimension(p.width, unit)} × {formatDimension(p.height, unit)}</td>
                  <td className="print-nowrap">{formatDimension(p.x, unit, false)} × {formatDimension(p.y, unit, false)}</td>
                  <td>{p.rotated ? 'Rotated 90°' : 'As entered'}</td>
                </tr>
              )))}
              {result.unplacedParts?.map((p, idx) => (
                <tr key={`unplaced-${p.id || idx}`} className="print-unplaced-row">
                  <td>—</td>
                  <td>{p.name}</td>
                  <td className="print-nowrap">{formatDimension(p.width, unit)} × {formatDimension(p.height, unit)}</td>
                  <td>—</td>
                  <td>Not placed</td>
                </tr>
              ))}
            </tbody>
          </table>
          {result.unplacedParts?.length > 0 && (
            <p className="print-warning">Unplaced parts are shown without a sheet assignment and must be reviewed before cutting.</p>
          )}
        </section>

        {result.sheets.map((s, idx) => (
          <section key={idx} className="print-page print-diagram-page">
            <div className="print-diagram-header">
              <div>
                <div className="print-report-kicker">CUT DIAGRAM</div>
                <h2>Sheet {idx + 1} of {result.sheets.length}</h2>
              </div>
              <div className="print-diagram-meta">{s.placements.length} part{s.placements.length === 1 ? '' : 's'} · {formatDimension(s.width, unit)} × {formatDimension(s.height, unit)}</div>
            </div>
            <SheetDiagram sheet={s} unit={unit} svgPadding={svgPadding} isPrint={true} />
          </section>
        ))}
      </div>

    </div>
  );
}
