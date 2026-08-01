import React from 'react';
import { Download, FolderOpen, LayoutDashboard, Printer, Ruler, Save, Trash2 } from 'lucide-react';
import ActionMenu from './ActionMenu';

export default function Header({
  onOpenPresets,
  onOpenProjects,
  onSaveProject,
  isDirty,
  onExportCSV,
  onPrint,
  onClearAll,
}) {
  return (
    <header className="ws-appbar no-print">

      <div className="ws-mobile-brand">
        <div className="ws-project-mark" aria-hidden="true">
          <Ruler size={19} strokeWidth={2.4} />
        </div>
        <div className="ws-project-copy">
          <div className="ws-project-title">WoodCut <span>Studio</span></div>
          <div className="ws-project-subtitle">PLAN // CUT // CRAFT</div>
        </div>
      </div>

      <div className="ws-appbar-right">
        <ActionMenu
          ariaLabel="Optimizer actions"
          items={[
            { key: 'projects', label: 'Projects', icon: LayoutDashboard, onClick: onOpenProjects },
            {
              key: 'save',
              label: 'Save',
              icon: Save,
              onClick: onSaveProject,
              title: isDirty ? 'Save project' : 'Project is already saved',
              disabled: !isDirty,
            },
            { key: 'presets', label: 'Presets', icon: FolderOpen, onClick: onOpenPresets },
            { key: 'csv', label: 'Export CSV', icon: Download, onClick: onExportCSV },
            { key: 'print', label: 'Print / PDF', icon: Printer, onClick: onPrint },
            { key: 'reset', label: 'Reset all data', icon: Trash2, onClick: onClearAll, variant: 'danger' },
          ]}
        />
      </div>

    </header>
  );
}
