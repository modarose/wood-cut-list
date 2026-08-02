import React from 'react';
import { ClipboardList, FolderOpen, HelpCircle, LayoutGrid, Package, Ruler, Settings, Wrench } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'optimizer', label: 'Optimizer', icon: LayoutGrid, enabled: true },
  { id: 'projects', label: 'Projects', icon: FolderOpen, enabled: true },
  { id: 'inventory', label: 'Inventory', icon: Package, enabled: true },
  { id: 'workshop', label: 'Workshop', icon: Wrench, enabled: true },
  { id: 'build-planner', label: 'Build planner', icon: ClipboardList, enabled: true },
];

export default function Sidebar({ activeSection, projectName, onNavigate }) {
  return (
    <aside className="ws-sidebar no-print">
      <div className="ws-sidebar-brand">
        <div className="ws-sidebar-logo">
          <div className="ws-project-mark" aria-hidden="true">
            <Ruler size={21} strokeWidth={2.4} />
          </div>
          <div className="ws-project-copy">
            <div className="ws-project-title">WoodCut <span>Studio</span></div>
            <div className="ws-project-subtitle">PLAN // CUT // CRAFT</div>
          </div>
        </div>
        <div className="ws-sidebar-subtitle">{projectName || 'Current project'}</div>
      </div>

      <nav className="ws-sidebar-nav" aria-label="WoodCut Studio sections">
        {NAV_ITEMS.map(({ id, label, icon: Icon, enabled }) => (
          <button
            key={id}
            type="button"
            className={`ws-nav-item${activeSection === id ? ' active' : ''}`}
            onClick={() => enabled && onNavigate(id)}
            disabled={!enabled}
            aria-current={activeSection === id ? 'page' : undefined}
            title={enabled ? `Open ${label}` : `${label} is coming soon`}
          >
            <Icon size={18} />
            <span>{label}</span>
            {!enabled && <span className="ws-nav-item-status">Soon</span>}
          </button>
        ))}
      </nav>

      <div className="ws-sidebar-footer">
        <button type="button" className="ws-nav-item" disabled title="Settings are coming soon">
          <Settings size={18} />
          <span>Settings</span>
          <span className="ws-nav-item-status">Soon</span>
        </button>
        <button type="button" className="ws-nav-item" disabled title="Support is coming soon">
          <HelpCircle size={18} />
          <span>Support</span>
          <span className="ws-nav-item-status">Soon</span>
        </button>
      </div>
    </aside>
  );
}
