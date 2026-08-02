import React from 'react';
import { Download, FolderOpen, LayoutDashboard, Printer, Save, Trash2 } from 'lucide-react';
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
    <header className="ws-optimizer-heading no-print">
      <div>
        <div className="ws-page-eyebrow">WoodCut Studio workspace</div>
        <h1 className="ws-page-title">Optimizer</h1>
        <p className="ws-page-copy">
          Build a cut list, match it to your stock and review the material yield before heading to the workshop.
        </p>
      </div>

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
    </header>
  );
}
