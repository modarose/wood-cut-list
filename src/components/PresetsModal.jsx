import React from 'react';
import { PROJECT_PRESETS } from '../utils/presets';
import { X, FolderOpen, ArrowRight } from 'lucide-react';

export default function PresetsModal({ isOpen, onClose, onLoadPreset }) {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      backdropFilter: 'blur(2px)'
    }}>
      <div className="ram-card" style={{ maxWidth: '540px', width: '100%', padding: '1.5rem', background: '#F8F7F4' }}>
        
        <div className="ram-card-header">
          <div className="ram-card-title" style={{ fontSize: '0.95rem' }}>
            <FolderOpen size={18} color="#FF4500" /> SELECT WOODWORKING PROJECT PRESET
          </div>
          <button onClick={onClose} className="ram-btn ram-btn-sm ram-btn-icon" style={{ border: 'none', background: 'none', boxShadow: 'none' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', margin: '1rem 0' }}>
          {PROJECT_PRESETS.map((preset) => (
            <div
              key={preset.id}
              onClick={() => {
                onLoadPreset(preset);
                onClose();
              }}
              style={{
                padding: '1rem',
                background: '#FFFFFF',
                border: '1px solid var(--ram-border-medium)',
                borderRadius: 'var(--ram-radius-sm)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                justify: 'space-between'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = '#FF4500';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--ram-border-medium)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div>
                <div style={{ fontWeight: '700', fontSize: '0.9rem', color: '#1C1D1F' }}>
                  {preset.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--ram-text-muted)', marginTop: '2px' }}>
                  {preset.description}
                </div>
                <div style={{ fontSize: '0.7rem', fontFamily: 'var(--ram-font-mono)', color: '#FF4500', marginTop: '4px' }}>
                  {preset.parts.length} PARTS LISTED • Stock: {preset.stock.width}×{preset.stock.height} {preset.unit}
                </div>
              </div>

              <div className="ram-btn ram-btn-sm ram-btn-orange" style={{ padding: '6px 10px', fontSize: '0.72rem' }}>
                LOAD <ArrowRight size={12} />
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
          <button onClick={onClose} className="ram-btn ram-btn-sm">
            CANCEL
          </button>
        </div>

      </div>
    </div>
  );
}
