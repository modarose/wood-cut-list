import React from 'react';
import { UNITS, formatDimension } from '../utils/unitConverter';
import { Plus, Trash2, Copy, Lock, Unlock, Palette } from 'lucide-react';

const COLOR_SWATCHES = [
  '#3B82F6', // Blue
  '#10B981', // Emerald Green
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#64748B', // Slate
];

export default function CutListInput({ parts, onPartsChange, unit }) {

  const handleAddPart = () => {
    const newId = (parts.length + 1).toString();
    const randomColor = COLOR_SWATCHES[parts.length % COLOR_SWATCHES.length];
    
    const newPart = {
      id: Date.now().toString(),
      name: `Part ${newId}`,
      width: unit === UNITS.MM ? 300 : 12,
      height: unit === UNITS.MM ? 600 : 24,
      qty: 1,
      allowRotation: true,
      color: randomColor,
    };
    onPartsChange([...parts, newPart]);
  };

  const handlePartChange = (id, field, value) => {
    const updated = parts.map(p => {
      if (p.id === id) {
        return { ...p, [field]: value };
      }
      return p;
    });
    onPartsChange(updated);
  };

  const handleDuplicate = (part) => {
    const duplicated = {
      ...part,
      id: Date.now().toString(),
      name: `${part.name} (Copy)`,
    };
    onPartsChange([...parts, duplicated]);
  };

  const handleDelete = (id) => {
    onPartsChange(parts.filter(p => p.id !== id));
  };

  const totalPartItemsCount = parts.reduce((sum, p) => sum + (parseInt(p.qty) || 0), 0);

  return (
    <div className="ram-card">
      <div className="ram-card-header">
        <div className="ram-card-title">
          2. CUT LIST PARTS ({totalPartItemsCount} TOTAL PIECES)
        </div>
        <button onClick={handleAddPart} className="ram-btn ram-btn-orange ram-btn-sm">
          <Plus size={14} /> ADD PART
        </button>
      </div>

      {parts.length === 0 ? (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ram-text-muted)', background: 'var(--ram-bg-subtle)', borderRadius: 'var(--ram-radius-sm)', border: '1px dashed var(--ram-border-medium)' }}>
          No cut list pieces added yet. Click <strong>ADD PART</strong> or load a Preset.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', borderRadius: 'var(--ram-radius-sm)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--ram-bg-subtle)', textAlign: 'left' }}>
                <th style={{ padding: '0.5rem 0.2rem', width: '28px' }}></th>
                <th className="ram-label" style={{ padding: '0.5rem 0.3rem' }}>PART NAME</th>
                <th className="ram-label" style={{ padding: '0.5rem 0.3rem', width: '4.8rem' }}>WIDTH ({unit})</th>
                <th className="ram-label" style={{ padding: '0.5rem 0.3rem', width: '4.8rem' }}>LENGTH ({unit})</th>
                <th className="ram-label" style={{ padding: '0.5rem 0.3rem', width: '3.8rem' }}>QTY</th>
                <th className="ram-label" style={{ padding: '0.5rem 0.3rem', width: '85px', textAlign: 'center' }}>GRAIN</th>
                <th className="ram-label" style={{ padding: '0.5rem 0.3rem', width: '65px', textAlign: 'right' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {parts.map((part) => (
                <tr key={part.id} style={{ borderBottom: '1px solid var(--ram-bg-subtle)' }}>
                  
                  {/* Color Swatch */}
                  <td style={{ padding: '0.4rem 0.1rem', textAlign: 'center', verticalAlign: 'middle' }}>
                    <input
                      type="color"
                      value={part.color}
                      onChange={(e) => handlePartChange(part.id, 'color', e.target.value)}
                      style={{
                        width: '18px',
                        height: '18px',
                        border: 'none',
                        borderRadius: '50%',
                        cursor: 'pointer',
                        background: 'none',
                        verticalAlign: 'middle'
                      }}
                      title="Change part color"
                    />
                  </td>

                  {/* Part Name */}
                  <td style={{ padding: '0.3rem' }}>
                    <input
                      type="text"
                      value={part.name}
                      onChange={(e) => handlePartChange(part.id, 'name', e.target.value)}
                      className="ram-input"
                      style={{ width: '100%', minWidth: '90px', padding: '4px 6px', fontSize: '0.85rem' }}
                    />
                  </td>

                  {/* Width (4 chars) */}
                  <td style={{ padding: '0.3rem' }}>
                    <input
                      type="number"
                      step={unit === UNITS.INCH ? '0.125' : '1'}
                      value={part.width}
                      onChange={(e) => handlePartChange(part.id, 'width', parseFloat(e.target.value) || 0)}
                      className="ram-input num-tabular"
                      style={{ width: '4.5rem', padding: '4px 6px', fontSize: '0.85rem' }}
                    />
                  </td>

                  {/* Length (4 chars) */}
                  <td style={{ padding: '0.3rem' }}>
                    <input
                      type="number"
                      step={unit === UNITS.INCH ? '0.125' : '1'}
                      value={part.height}
                      onChange={(e) => handlePartChange(part.id, 'height', parseFloat(e.target.value) || 0)}
                      className="ram-input num-tabular"
                      style={{ width: '4.5rem', padding: '4px 6px', fontSize: '0.85rem' }}
                    />
                  </td>

                  {/* Qty (3 chars) */}
                  <td style={{ padding: '0.3rem' }}>
                    <input
                      type="number"
                      min="1"
                      value={part.qty}
                      onChange={(e) => handlePartChange(part.id, 'qty', Math.max(1, parseInt(e.target.value) || 1))}
                      className="ram-input num-tabular"
                      style={{ width: '3.5rem', padding: '4px 4px', fontSize: '0.85rem', fontWeight: 'bold', textAlign: 'center' }}
                    />
                  </td>

                  {/* Grain Lock (Allow Rotation vs Fixed) */}
                  <td style={{ padding: '0.3rem', textAlign: 'center' }}>
                    <button
                      type="button"
                      onClick={() => handlePartChange(part.id, 'allowRotation', !part.allowRotation)}
                      className={`ram-btn ram-btn-sm ${part.allowRotation ? '' : 'ram-btn-dark'}`}
                      style={{ padding: '3px 5px', fontSize: '0.68rem', width: '100%', whiteSpace: 'nowrap' }}
                      title={part.allowRotation ? 'Grain Flexible: Can rotate 90°' : 'Grain Locked: Fixed orientation'}
                    >
                      {part.allowRotation ? (
                        <>
                          <Unlock size={10} color="#10B981" /> ROTATE
                        </>
                      ) : (
                        <>
                          <Lock size={10} color="#FF4500" /> FIXED
                        </>
                      )}
                    </button>
                  </td>

                  {/* Actions */}
                  <td style={{ padding: '0.4rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.3rem' }}>
                      <button
                        onClick={() => handleDuplicate(part)}
                        className="ram-btn ram-btn-sm ram-btn-icon"
                        title="Duplicate row"
                        style={{ padding: '5px' }}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        onClick={() => handleDelete(part.id)}
                        className="ram-btn ram-btn-sm ram-btn-icon"
                        style={{ padding: '5px', color: '#D32F2F', borderColor: '#EF9A9A' }}
                        title="Delete row"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
