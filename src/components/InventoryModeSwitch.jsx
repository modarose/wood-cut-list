import React from 'react';
import { Package } from 'lucide-react';

const MODES = [
  { id: 'supplies', label: 'Supplies' },
  { id: 'materials', label: 'Materials' },
];

export default function InventoryModeSwitch({ activeMode, onOpenSupplies, onOpenMaterials }) {
  const handlers = {
    supplies: onOpenSupplies,
    materials: onOpenMaterials,
  };

  return (
    <div className="ws-inventory-mode-switch" role="group" aria-label="Inventory mode">
      <Package size={15} aria-hidden="true" />
      <div className="ws-inventory-mode-options">
        {MODES.map((mode, index) => (
          <React.Fragment key={mode.id}>
            {index > 0 && <span className="ws-inventory-mode-divider" aria-hidden="true">|</span>}
            <button
              type="button"
              className={`ws-inventory-mode-option${activeMode === mode.id ? ' active' : ''}`}
              onClick={handlers[mode.id]}
              aria-current={activeMode === mode.id ? 'page' : undefined}
              title={activeMode === mode.id ? `Currently viewing ${mode.label}` : `Open ${mode.label}`}
            >
              {mode.label}
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
