import React, { useEffect, useRef, useState } from 'react';
import { Download, FolderOpen, LayoutDashboard, Menu, Printer, Ruler, Save, Trash2, X } from 'lucide-react';

export default function Header({
  onOpenPresets,
  onOpenProjects,
  onSaveProject,
  isDirty,
  onExportCSV,
  onPrint,
  onClearAll,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handlePointerDown = event => {
      if (!menuRef.current?.contains(event.target)) setIsMenuOpen(false);
    };
    const handleKeyDown = event => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  const runAction = action => {
    setIsMenuOpen(false);
    action();
  };

  return (
    <header className="ws-appbar no-print">

      <div className="ws-project-identity">
        <div className="ws-project-mark" aria-hidden="true">
          <Ruler size={21} strokeWidth={2.4} />
        </div>
        <div className="ws-project-copy">
          <div className="ws-project-title">WoodCut <span>Studio</span></div>
          <div className="ws-project-subtitle">Plan it. Cut it. Craft it.</div>
        </div>
      </div>

      <div className="ws-appbar-right">
        <div className="ws-action-menu" ref={menuRef}>
          <button
            type="button"
            className="ws-btn ws-btn-sm ws-action-menu-toggle"
            onClick={() => setIsMenuOpen(value => !value)}
            aria-expanded={isMenuOpen}
            aria-haspopup="true"
            aria-label={isMenuOpen ? 'Close optimizer actions menu' : 'Open optimizer actions menu'}
            title="Optimizer actions"
          >
            {isMenuOpen ? <X size={15} /> : <Menu size={15} />}
            Menu
          </button>

          {isMenuOpen && (
            <div className="ws-action-menu-panel" aria-label="Optimizer actions">
              <button type="button" className="ws-action-menu-item" onClick={() => runAction(onOpenProjects)}>
                <LayoutDashboard size={15} />
                Projects
              </button>
              <button
                type="button"
                className="ws-action-menu-item"
                onClick={() => runAction(onSaveProject)}
                title={isDirty ? 'Save project' : 'Project is already saved'}
                disabled={!isDirty}
              >
                <Save size={15} />
                Save
              </button>
              <button type="button" className="ws-action-menu-item" onClick={() => runAction(onOpenPresets)}>
                <FolderOpen size={15} />
                Presets
              </button>
              <button type="button" className="ws-action-menu-item" onClick={() => runAction(onExportCSV)}>
                <Download size={15} />
                Export CSV
              </button>
              <button type="button" className="ws-action-menu-item" onClick={() => runAction(onPrint)}>
                <Printer size={15} />
                Print / PDF
              </button>
              <button type="button" className="ws-action-menu-item danger" onClick={() => runAction(onClearAll)}>
                <Trash2 size={15} />
                Reset all data
              </button>
            </div>
          )}
        </div>
      </div>

    </header>
  );
}
