import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  Pencil,
  Plus,
  Search,
  Settings,
  Trash2,
  Wrench,
  X,
} from 'lucide-react';
import ActionMenu from './ActionMenu';
import {
  createTool,
  TOOL_AVAILABILITIES,
  TOOL_CAPABILITIES,
  TOOL_CATEGORIES,
  TOOL_CONDITIONS,
} from '../utils/toolInventory.js';

const EMPTY_FORM = {
  name: '',
  category: 'other',
  brand: '',
  model: '',
  owned: true,
  availability: 'available',
  condition: 'good',
  location: '',
  capabilities: [],
  accessories: '',
  maintenanceNotes: '',
  lastMaintenanceAt: '',
};

function optionLabel(options, value) {
  return options.find(option => option.value === value)?.label ?? value;
}

function toForm(tool) {
  return {
    name: tool.name,
    category: tool.category,
    brand: tool.brand ?? '',
    model: tool.model ?? '',
    owned: tool.owned,
    availability: tool.availability,
    condition: tool.condition,
    location: tool.location ?? '',
    capabilities: [...tool.capabilities],
    accessories: tool.accessories.join(', '),
    maintenanceNotes: tool.maintenanceNotes ?? '',
    lastMaintenanceAt: tool.lastMaintenanceAt ?? '',
  };
}

function availabilityClass(tool) {
  if (!tool.owned || tool.availability === 'unavailable') return 'unavailable';
  if (tool.availability === 'maintenance' || tool.condition === 'damaged') return 'maintenance';
  return 'available';
}

export default function ToolInventory({
  tools,
  onSaveTool,
  onDeleteTool,
  onBack,
}) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTool, setEditingTool] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [pageError, setPageError] = useState('');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');

  const filteredTools = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tools.filter(tool => {
      const searchable = [
        tool.name,
        tool.brand,
        tool.model,
        tool.location,
        ...tool.capabilities,
      ].join(' ').toLowerCase();
      const matchesQuery = !normalizedQuery || searchable.includes(normalizedQuery);
      const matchesCategory = categoryFilter === 'all' || tool.category === categoryFilter;
      const matchesAvailability = availabilityFilter === 'all'
        || tool.availability === availabilityFilter;
      return matchesQuery && matchesCategory && matchesAvailability;
    });
  }, [availabilityFilter, categoryFilter, query, tools]);

  const ownedAvailableCount = tools.filter(
    tool => tool.owned && tool.availability === 'available',
  ).length;
  const maintenanceCount = tools.filter(
    tool => tool.availability === 'maintenance' || tool.condition === 'damaged',
  ).length;
  const capabilityCount = new Set(tools.flatMap(tool => tool.capabilities)).size;

  const openNewForm = () => {
    setEditingTool(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setPageError('');
    setIsFormOpen(true);
  };

  const openEditForm = tool => {
    setEditingTool(tool);
    setForm(toForm(tool));
    setFormError('');
    setPageError('');
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingTool(null);
    setFormError('');
  };

  const handleFormChange = event => {
    const { name, value, type, checked } = event.target;
    setForm(current => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
    setFormError('');
  };

  const handleCapabilityChange = capability => {
    setForm(current => ({
      ...current,
      capabilities: current.capabilities.includes(capability)
        ? current.capabilities.filter(value => value !== capability)
        : [...current.capabilities, capability],
    }));
    setFormError('');
  };

  const handleSubmit = event => {
    event.preventDefault();
    setPageError('');

    try {
      createTool(form, {
        id: editingTool?.id,
        createdAt: editingTool?.createdAt,
      });
    } catch (error) {
      setFormError(error.message);
      return;
    }

    const result = onSaveTool(form, editingTool);
    if (!result.saved) {
      setFormError(result.error || 'The tool could not be saved.');
      return;
    }

    closeForm();
  };

  const handleDelete = tool => {
    if (!window.confirm(`Remove ${tool.name} from tool inventory?`)) return;
    const result = onDeleteTool(tool);
    if (!result.saved) setPageError(result.error || 'The tool could not be removed.');
  };

  return (
    <main className="ws-main">
      <div className="ws-content ws-tool-content">
        <div className="ws-tool-heading">
          <div>
            <div className="ws-page-eyebrow">WoodCut Studio workshop</div>
            <h1 className="ws-page-title">Tool inventory</h1>
            <p className="ws-page-copy">
              Keep capabilities and availability clear before a build plan depends on a tool.
            </p>
          </div>
          <ActionMenu
            ariaLabel="Workshop actions"
            items={[
              { key: 'optimizer', label: 'Optimizer', icon: ArrowLeft, onClick: onBack },
            ]}
          />
        </div>

        <div className="ws-tool-toolbar">
          <div>
            <strong>{tools.length ? `${tools.length} tool${tools.length === 1 ? '' : 's'} recorded` : 'No tools recorded'}</strong>
            <span className="ws-tool-toolbar-copy">Capabilities are normalised for future build-step matching</span>
          </div>
          <button type="button" className="ws-btn ws-btn-primary" onClick={openNewForm}>
            <Plus size={15} />
            Add tool
          </button>
        </div>

        {pageError && <div className="ws-form-error" role="alert">{pageError}</div>}

        <div className="ws-metrics-grid ws-tool-metrics">
          <div className="ws-metric-card">
            <div className="ws-metric-label"><Wrench size={13} /> Tools recorded</div>
            <div className="ws-metric-value">{tools.length}</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><CheckCircle2 size={13} /> Owned and available</div>
            <div className="ws-metric-value">{ownedAvailableCount}</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><AlertTriangle size={13} /> Needs attention</div>
            <div className={`ws-metric-value${maintenanceCount ? ' secondary' : ''}`}>{maintenanceCount}</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><Settings size={13} /> Capability tags</div>
            <div className="ws-metric-value">{capabilityCount}</div>
          </div>
        </div>

        {isFormOpen && (
          <form className="ws-card ws-tool-form" onSubmit={handleSubmit}>
            <div className="ws-card-header">
              <div className="ws-card-title"><Wrench size={17} /> {editingTool ? 'Edit tool' : 'Add tool'}</div>
              <button type="button" className="ws-btn ws-btn-icon" onClick={closeForm} title="Close form"><X size={17} /></button>
            </div>
            <div className="ws-card-body">
              {formError && <div className="ws-form-error" role="alert">{formError}</div>}
              <div className="ws-tool-form-grid">
                <label className="ws-input-group ws-tool-field-wide">
                  <span className="ws-label">Tool name</span>
                  <input className="ws-input" name="name" value={form.name} onChange={handleFormChange} placeholder="Track saw" autoFocus />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Category</span>
                  <select className="ws-select" name="category" value={form.category} onChange={handleFormChange}>
                    {TOOL_CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Availability</span>
                  <select className="ws-select" name="availability" value={form.availability} onChange={handleFormChange}>
                    {TOOL_AVAILABILITIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Brand</span>
                  <input className="ws-input" name="brand" value={form.brand} onChange={handleFormChange} placeholder="Makita" />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Model</span>
                  <input className="ws-input" name="model" value={form.model} onChange={handleFormChange} placeholder="SP6000" />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Condition</span>
                  <select className="ws-select" name="condition" value={form.condition} onChange={handleFormChange}>
                    {TOOL_CONDITIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group ws-tool-field-wide">
                  <span className="ws-label">Location</span>
                  <input className="ws-input" name="location" value={form.location} onChange={handleFormChange} placeholder="Workshop wall A" />
                </label>
                <label className="ws-tool-owned-toggle ws-tool-field-wide">
                  <input type="checkbox" name="owned" checked={form.owned} onChange={handleFormChange} />
                  <span>
                    <strong>Owned workshop tool</strong>
                    <small>Uncheck for a borrowed, hired or reference-only tool.</small>
                  </span>
                </label>

                <div className="ws-tool-section-label ws-tool-field-full">Capabilities</div>
                <div className="ws-tool-capability-grid ws-tool-field-full">
                  {TOOL_CAPABILITIES.map(option => (
                    <label className="ws-tool-capability-option" key={option.value}>
                      <input
                        type="checkbox"
                        checked={form.capabilities.includes(option.value)}
                        onChange={() => handleCapabilityChange(option.value)}
                      />
                      <span>{option.label}</span>
                    </label>
                  ))}
                </div>

                <label className="ws-input-group ws-tool-field-wide">
                  <span className="ws-label">Accessories</span>
                  <input className="ws-input" name="accessories" value={form.accessories} onChange={handleFormChange} placeholder="Guide rail, dust bag" />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Last maintenance</span>
                  <input className="ws-input" type="date" name="lastMaintenanceAt" value={form.lastMaintenanceAt} onChange={handleFormChange} />
                </label>
                <label className="ws-input-group ws-tool-field-full">
                  <span className="ws-label">Maintenance notes</span>
                  <textarea className="ws-input ws-tool-notes" name="maintenanceNotes" value={form.maintenanceNotes} onChange={handleFormChange} placeholder="Blade condition, service notes or missing accessories" rows="3" />
                </label>
              </div>
              <div className="ws-tool-form-actions">
                <button type="button" className="ws-btn" onClick={closeForm}>Cancel</button>
                <button type="submit" className="ws-btn ws-btn-primary">{editingTool ? 'Save changes' : 'Add to inventory'}</button>
              </div>
            </div>
          </form>
        )}

        <section className="ws-card">
          <div className="ws-card-header">
            <div className="ws-card-title"><Wrench size={17} /> Workshop tools</div>
            <span className="ws-card-badge">{filteredTools.length} shown</span>
          </div>
          <div className="ws-tool-filter-bar">
            <label className="ws-tool-search">
              <Search size={15} />
              <input className="ws-input" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search tools, brands or capabilities" aria-label="Search tools" />
            </label>
            <select className="ws-select" value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)} aria-label="Filter by category">
              <option value="all">All categories</option>
              {TOOL_CATEGORIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className="ws-select" value={availabilityFilter} onChange={event => setAvailabilityFilter(event.target.value)} aria-label="Filter by availability">
              <option value="all">All availability</option>
              {TOOL_AVAILABILITIES.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>
          <div className="ws-tool-table-wrap">
            {tools.length === 0 ? (
              <div className="ws-inventory-empty">
                <Wrench size={28} />
                <strong>Your tool inventory is empty.</strong>
                <span>Add the tools you own and what each one can safely do.</span>
                <button type="button" className="ws-btn ws-btn-primary" onClick={openNewForm}><Plus size={15} /> Add first tool</button>
              </div>
            ) : filteredTools.length === 0 ? (
              <div className="ws-inventory-empty ws-inventory-empty-compact">
                <span>No tools match the current filters.</span>
              </div>
            ) : (
              <table className="ws-table ws-tool-table">
                <thead>
                  <tr>
                    <th>Tool</th>
                    <th>Capabilities</th>
                    <th>Status</th>
                    <th>Location</th>
                    <th>Maintenance</th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {filteredTools.map(tool => (
                    <tr key={tool.id}>
                      <td>
                        <div className="ws-tool-name">{tool.name}</div>
                        <div className="ws-inventory-meta">{[tool.brand, tool.model].filter(Boolean).join(' · ') || optionLabel(TOOL_CATEGORIES, tool.category)}</div>
                      </td>
                      <td>
                        <div className="ws-tool-capability-list">
                          {tool.capabilities.length > 0 ? tool.capabilities.map(capability => (
                            <span className="ws-tool-capability" key={capability}>{optionLabel(TOOL_CAPABILITIES, capability)}</span>
                          )) : <span className="ws-inventory-meta">No capabilities recorded</span>}
                        </div>
                      </td>
                      <td>
                        <div className={`ws-tool-status ${availabilityClass(tool)}`}>
                          {tool.owned && tool.availability === 'available' ? <CheckCircle2 size={13} /> : <AlertTriangle size={13} />}
                          {tool.owned ? optionLabel(TOOL_AVAILABILITIES, tool.availability) : 'Not owned'}
                        </div>
                        <div className="ws-inventory-meta">{optionLabel(TOOL_CONDITIONS, tool.condition)}</div>
                      </td>
                      <td>
                        <div className="ws-inventory-location"><MapPin size={13} /> {tool.location || 'No location'}</div>
                      </td>
                      <td>
                        <div>{tool.lastMaintenanceAt || 'Not recorded'}</div>
                        <div className="ws-inventory-meta">{tool.accessories.length} {tool.accessories.length === 1 ? 'accessory' : 'accessories'}</div>
                      </td>
                      <td>
                        <div className="ws-inventory-actions">
                          <button type="button" className="ws-btn ws-btn-icon" onClick={() => openEditForm(tool)} title={`Edit ${tool.name}`}><Pencil size={15} /></button>
                          <button type="button" className="ws-btn ws-btn-icon ws-btn-danger" onClick={() => handleDelete(tool)} title={`Remove ${tool.name}`}><Trash2 size={15} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <div className="ws-tool-safety-note">
          <AlertTriangle size={15} />
          Capability tags describe your recorded workshop inventory; they do not certify that a tool, setup or substitution is safe for a particular operation.
        </div>
      </div>
    </main>
  );
}
