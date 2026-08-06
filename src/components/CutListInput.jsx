import React from 'react';
import { UNITS } from '../utils/unitConverter';
import { Plus, Trash2, Copy, Lock, Unlock, Ruler } from 'lucide-react';

const COLOR_SWATCHES = [
  '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6',
  '#EC4899', '#06B6D4', '#F97316', '#64748B',
];

export default function CutListInput({ parts, onPartsChange, unit }) {

  const handleAddPart = () => {
    const newId = (parts.length + 1).toString();
    const color = COLOR_SWATCHES[parts.length % COLOR_SWATCHES.length];
    onPartsChange([...parts, {
      id: Date.now().toString(),
      name: `Part ${newId}`,
      width: unit === UNITS.MM ? 300 : 12,
      height: unit === UNITS.MM ? 600 : 24,
      qty: 1,
      allowRotation: true,
      color,
    }]);
  };

  const handlePartChange = (id, field, value) =>
    onPartsChange(parts.map(p => p.id === id ? { ...p, [field]: value } : p));

  const handleDuplicate = part =>
    onPartsChange([...parts, { ...part, id: Date.now().toString(), name: `${part.name} (Copy)` }]);

  const handleDelete = id =>
    onPartsChange(parts.filter(p => p.id !== id));

  const totalCount = parts.reduce((sum, p) => sum + (parseInt(p.qty) || 0), 0);

  return (
    <section className="ws-card">
      <div className="ws-card-header">
        <div className="ws-card-title">
          <Ruler size={18} />
          Cut Requirements
          <span style={{ fontFamily: 'var(--ws-font-mono)', fontSize: '12px', fontWeight: 500, color: 'var(--ws-on-surface-variant)' }}>
            ({totalCount} pcs)
          </span>
        </div>
        <button onClick={handleAddPart} className="ws-btn ws-btn-sm ws-btn-primary">
          <Plus size={13} />
          Add Part
        </button>
      </div>

      <div className="ws-card-body" style={{ padding: parts.length ? 0 : 'var(--ws-space-md)' }}>
        {parts.length === 0 ? (
          <div style={{
            padding: '2rem',
            textAlign: 'center',
            color: 'var(--ws-on-surface-variant)',
            background: 'var(--ws-surface-container-low)',
            borderRadius: 'var(--ws-radius-lg)',
            border: '1px dashed var(--ws-outline-variant)',
            fontSize: '14px',
          }}>
            No parts yet — click <strong>Add Part</strong> or load a Preset.
          </div>
        ) : (
          <div className="ws-cut-table-scroll">
            <table className="ws-table ws-cut-table" style={{ minWidth: '480px' }}>
              <thead>
                <tr>
                  <th style={{ width: '24px' }}></th>
                  <th>Part Name</th>
                  <th>Dimensions ({unit})</th>
                  <th style={{ width: '48px' }}>Qty</th>
                  <th style={{ width: '90px', textAlign: 'center' }}>Grain</th>
                  <th style={{ width: '70px', textAlign: 'right' }}></th>
                </tr>
              </thead>
              <tbody>
                {parts.map(part => (
                  <tr key={part.id}>

                    {/* Color dot */}
                    <td style={{ paddingRight: '8px' }}>
                      <input
                        type="color"
                        value={part.color}
                        onChange={e => handlePartChange(part.id, 'color', e.target.value)}
                        className="ws-part-color"
                        style={{
                          width: '20px', height: '20px', border: 'none', borderRadius: '50%',
                          cursor: 'pointer', background: 'none', padding: 0, display: 'block',
                        }}
                        title="Change part color"
                      />
                    </td>

                    {/* Name */}
                    <td style={{ paddingRight: '8px' }}>
                      <input
                        type="text"
                        value={part.name}
                        onChange={e => handlePartChange(part.id, 'name', e.target.value)}
                        className="ws-input"
                        style={{ width: '100%', minWidth: '80px' }}
                      />
                    </td>

                    {/* W × H inline */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <input
                          type="number"
                          step={unit === UNITS.INCH ? '0.125' : '1'}
                          value={part.width}
                          onChange={e => handlePartChange(part.id, 'width', parseFloat(e.target.value) || 0)}
                          className="ws-input ws-dimension-input num-tabular"
                          style={{ width: '5ch' }}
                        />
                        <span style={{ color: 'var(--ws-outline)', fontSize: '13px' }}>×</span>
                        <input
                          type="number"
                          step={unit === UNITS.INCH ? '0.125' : '1'}
                          value={part.height}
                          onChange={e => handlePartChange(part.id, 'height', parseFloat(e.target.value) || 0)}
                          className="ws-input ws-dimension-input num-tabular"
                          style={{ width: '5ch' }}
                        />
                      </div>
                    </td>

                    {/* Qty */}
                    <td>
                      <input
                        type="number"
                        min="1"
                        value={part.qty}
                        onChange={e => handlePartChange(
                          part.id,
                          'qty',
                          e.target.value === '' ? '' : Number(e.target.value),
                        )}
                        className="ws-input ws-qty-input num-tabular"
                        style={{ width: '3ch', textAlign: 'center', fontWeight: 600 }}
                      />
                    </td>

                    {/* Grain toggle */}
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => handlePartChange(part.id, 'allowRotation', !part.allowRotation)}
                        className="ws-btn ws-btn-sm"
                        style={{
                          padding: '4px 8px',
                          fontSize: '11px',
                          color: part.allowRotation ? 'var(--ws-primary)' : 'var(--ws-secondary)',
                          borderColor: part.allowRotation ? 'var(--ws-primary-fixed-dim)' : 'var(--ws-secondary-container)',
                          background: part.allowRotation ? 'var(--ws-primary-fixed)' : 'var(--ws-error-container)',
                        }}
                        title={part.allowRotation ? 'Grain flexible — can rotate 90°' : 'Grain locked — fixed orientation'}
                      >
                        {part.allowRotation
                          ? <><Unlock size={11} /> Rotate</>
                          : <><Lock size={11} /> Fixed</>
                        }
                      </button>
                    </td>

                    {/* Actions */}
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '2px' }}>
                        <button
                          onClick={() => handleDuplicate(part)}
                          className="ws-btn-icon"
                          title="Duplicate row"
                          style={{ padding: '6px' }}
                        >
                          <Copy size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(part.id)}
                          className="ws-btn-icon ws-btn-danger"
                          title="Delete row"
                          style={{ padding: '6px' }}
                        >
                          <Trash2 size={14} />
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
    </section>
  );
}
