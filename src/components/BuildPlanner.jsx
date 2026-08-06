import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Clock3,
  Edit3,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import ActionMenu from './ActionMenu';
import {
  addBuildStage,
  addBuildStep,
  BUILD_PLAN_STATUSES,
  BUILD_STEP_STATUSES,
  BUILD_STEP_TYPES,
  createBuildPlan,
  getBuildPlanSummary,
  removeBuildStage,
  removeBuildStep,
  updateBuildStage,
  updateBuildStep,
} from '../utils/buildPlanner.js';
import { getBuildPlanReadiness } from '../utils/buildReadiness.js';

const EMPTY_STAGE_FORM = { id: null, name: '' };

function createEmptyStepForm(stageId = '') {
  return {
    id: null,
    stageId,
    name: '',
    type: 'other',
    dependsOn: [],
    partIds: [],
    toolRequirementIds: [],
    supplyRequirementIds: [],
    estimatedMinutes: '0',
    waitMinutes: '0',
    status: 'not-started',
    notes: '',
    safetyNotes: '',
  };
}

function toStepForm(step) {
  return {
    id: step.id,
    stageId: step.stageId,
    name: step.name,
    type: step.type,
    dependsOn: [...step.dependsOn],
    partIds: [...step.partIds],
    toolRequirementIds: [...step.toolRequirementIds],
    supplyRequirementIds: [...step.supplyRequirementIds],
    estimatedMinutes: String(step.estimatedMinutes),
    waitMinutes: String(step.waitMinutes),
    status: step.status,
    notes: step.notes,
    safetyNotes: step.safetyNotes.join('\n'),
  };
}

function optionLabel(options, value) {
  return options.find(option => option.value === value)?.label ?? value;
}

function formatDuration(minutes) {
  if (!minutes) return '0 min';
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes} min`;
  if (!remainingMinutes) return `${hours} hr`;
  return `${hours} hr ${remainingMinutes} min`;
}

function readSelectedValues(event) {
  return [...event.target.selectedOptions].map(option => option.value);
}

function statusClass(status) {
  return `ws-build-step-status ${status}`;
}

function readinessStatusClass(status) {
  if (status === 'ready' || status === 'complete') return 'screened';
  if (status === 'not-started') return 'not-started';
  return 'attention';
}

function renderResourceChips(ids, lookup, emptyLabel) {
  if (!ids.length) return <span className="ws-build-note">{emptyLabel}</span>;

  return (
    <div className="ws-build-resource-chips">
      {ids.map(id => <span className="ws-build-chip" key={id}>{lookup.get(id) ?? id}</span>)}
    </div>
  );
}

export default function BuildPlanner({
  projectId,
  projectName,
  buildPlan,
  parts,
  materials,
  unit,
  selectedMaterialId,
  requiredStockQuantity,
  toolRequirements,
  tools,
  supplyRequirements,
  supplies,
  onChange,
  onBack,
}) {
  const previewPlan = useMemo(() => createBuildPlan({
    projectId,
    name: `${projectName || 'Project'} build plan`,
  }, { projectId }), [projectId, projectName]);
  const plan = buildPlan ?? previewPlan;
  const summary = useMemo(() => getBuildPlanSummary(plan), [plan]);
  const readiness = useMemo(
    () => getBuildPlanReadiness(plan, {
      parts,
      materials,
      unit,
      selectedMaterialId,
      requiredStockQuantity,
      toolRequirements,
      tools,
      supplyRequirements,
      supplies,
    }),
    [
      materials,
      parts,
      plan,
      requiredStockQuantity,
      selectedMaterialId,
      supplies,
      supplyRequirements,
      toolRequirements,
      tools,
      unit,
    ],
  );
  const progressById = useMemo(
    () => new Map(summary.progress.map(item => [item.step.id, item])),
    [summary],
  );
  const orderedStages = useMemo(
    () => [...plan.stages].sort((a, b) => a.sequence - b.sequence),
    [plan.stages],
  );
  const partNames = useMemo(
    () => new Map(parts.map(part => [part.id, part.name || part.id])),
    [parts],
  );
  const toolNames = useMemo(
    () => new Map(toolRequirements.map(requirement => [
      requirement.id,
      requirement.capability.replaceAll('-', ' '),
    ])),
    [toolRequirements],
  );
  const supplyNames = useMemo(
    () => new Map(supplyRequirements.map(requirement => [requirement.id, requirement.name])),
    [supplyRequirements],
  );

  const [stageForm, setStageForm] = useState(null);
  const [stepForm, setStepForm] = useState(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    setStageForm(null);
    setStepForm(null);
    setFormError('');
  }, [projectId]);

  const beginStageForm = stage => {
    setStepForm(null);
    setFormError('');
    setStageForm(stage ? { id: stage.id, name: stage.name } : { ...EMPTY_STAGE_FORM });
  };

  const beginStepForm = (stageId, step = null) => {
    setStageForm(null);
    setFormError('');
    setStepForm(step ? toStepForm(step) : createEmptyStepForm(stageId));
  };

  const closeForms = () => {
    setStageForm(null);
    setStepForm(null);
    setFormError('');
  };

  const commitPlan = nextPlan => {
    onChange(nextPlan);
    closeForms();
  };

  const handleStageSubmit = event => {
    event.preventDefault();
    if (!stageForm?.name.trim()) {
      setFormError('Give this stage a name before saving it.');
      return;
    }

    try {
      const nextPlan = stageForm.id
        ? updateBuildStage(plan, stageForm.id, { name: stageForm.name })
        : addBuildStage(plan, { name: stageForm.name });
      commitPlan(nextPlan);
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleStepSubmit = event => {
    event.preventDefault();
    if (!stepForm?.name.trim()) {
      setFormError('Give this step a name before saving it.');
      return;
    }
    if (!stepForm.stageId) {
      setFormError('Choose a stage for this step.');
      return;
    }

    const payload = {
      ...stepForm,
      estimatedMinutes: stepForm.estimatedMinutes === '' ? 0 : Number(stepForm.estimatedMinutes),
      waitMinutes: stepForm.waitMinutes === '' ? 0 : Number(stepForm.waitMinutes),
      safetyNotes: stepForm.safetyNotes
        .split('\n')
        .map(note => note.trim())
        .filter(Boolean),
    };

    try {
      const nextPlan = stepForm.id
        ? updateBuildStep(plan, stepForm.id, payload)
        : addBuildStep(plan, stepForm.stageId, payload);
      commitPlan(nextPlan);
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleDeleteStage = stage => {
    if (!window.confirm(`Remove the “${stage.name}” stage and all of its steps?`)) return;
    try {
      commitPlan(removeBuildStage(plan, stage.id));
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleDeleteStep = step => {
    if (!window.confirm(`Remove the “${step.name}” step?`)) return;
    try {
      commitPlan(removeBuildStep(plan, step.id));
    } catch (error) {
      setFormError(error.message);
    }
  };

  const handleStepStatusChange = (step, status) => {
    try {
      onChange(updateBuildStep(plan, step.id, { status }));
    } catch (error) {
      setFormError(error.message);
    }
  };

  return (
    <main className="ws-main">
      <div className="ws-content ws-build-content">
        <div className="ws-build-heading">
          <div>
            <div className="ws-page-eyebrow">WoodCut Studio workshop</div>
            <h1 className="ws-page-title">Build planner</h1>
            <p className="ws-page-copy">
              Turn the cut list into ordered workshop steps for {projectName || 'this project'}.
              Add only what you have confirmed; safety and tool suitability still need human review.
            </p>
          </div>
          <ActionMenu
            ariaLabel="Build planner actions"
            items={[
              { key: 'optimizer', label: 'Optimizer', icon: ArrowLeft, onClick: onBack },
            ]}
          />
        </div>

        <div className="ws-build-toolbar">
          <div>
            <strong>{buildPlan ? plan.name : 'No build plan saved yet'}</strong>
            <span className="ws-tool-toolbar-copy">
              {buildPlan ? `${optionLabel(BUILD_PLAN_STATUSES, summary.status)} · changes are saved with the project` : 'Create a plan by adding your first stage'}
            </span>
          </div>
          <button type="button" className="ws-btn ws-btn-primary" onClick={() => beginStageForm()}>
            <Plus size={15} />
            Add stage
          </button>
        </div>

        {formError && <div className="ws-form-error" role="alert">{formError}</div>}

        <div className="ws-metrics-grid ws-build-metrics">
          <div className="ws-metric-card">
            <div className="ws-metric-label"><ClipboardList size={13} /> Stages</div>
            <div className="ws-metric-value">{summary.totalStages}</div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><CheckCircle2 size={13} /> Steps complete</div>
            <div className="ws-metric-value">{summary.completedSteps}<span className="ws-metric-unit"> / {summary.totalSteps}</span></div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><Clock3 size={13} /> Workshop time</div>
            <div className="ws-metric-value">{formatDuration(summary.estimatedMinutes)}</div>
            <span className="ws-build-metric-note">plus {formatDuration(summary.waitMinutes)} wait</span>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><AlertTriangle size={13} /> Blocked</div>
            <div className={`ws-metric-value${summary.blockedSteps ? ' secondary' : ''}`}>{summary.blockedSteps}</div>
          </div>
        </div>

        <section className="ws-card ws-build-readiness">
          <div className="ws-card-header">
            <div className="ws-card-title"><ClipboardCheck size={18} /> Build readiness</div>
            <span className={`ws-readiness-status ${readinessStatusClass(readiness.status)}`}>
              {readiness.statusLabel}
            </span>
          </div>
          <div className="ws-card-body">
            <div className="ws-metrics-grid ws-build-readiness-metrics">
              <div className="ws-metric-card">
                <div className="ws-metric-label"><CheckCircle2 size={13} /> Ready</div>
                <div className="ws-metric-value">{readiness.readySteps}</div>
              </div>
              <div className="ws-metric-card">
                <div className="ws-metric-label"><AlertTriangle size={13} /> Needs review</div>
                <div className={`ws-metric-value${readiness.reviewSteps ? ' secondary' : ''}`}>{readiness.reviewSteps}</div>
              </div>
              <div className="ws-metric-card">
                <div className="ws-metric-label"><AlertTriangle size={13} /> Blocked</div>
                <div className={`ws-metric-value${readiness.blockedSteps ? ' secondary' : ''}`}>{readiness.blockedSteps}</div>
              </div>
              <div className="ws-metric-card">
                <div className="ws-metric-label"><CheckCircle2 size={13} /> Complete</div>
                <div className="ws-metric-value">{readiness.completedSteps}<span className="ws-metric-unit"> / {readiness.totalSteps}</span></div>
              </div>
            </div>

            {readiness.issueSteps.length > 0 ? (
              <div className="ws-build-readiness-list" aria-label="Build steps needing attention">
                {readiness.issueSteps.map(item => (
                  <article className={`ws-build-readiness-row ${item.status}`} key={item.step.id}>
                    <div className="ws-build-readiness-row-heading">
                      <span className={`ws-build-readiness-badge ${item.status}`}>{item.statusLabel}</span>
                      <div>
                        <strong>{item.stageName}: {item.step.name}</strong>
                        <span>Plan status: {optionLabel(BUILD_STEP_STATUSES, item.step.status)}</span>
                      </div>
                    </div>
                    <ul>
                      {item.issues.map((issue, index) => <li key={`${item.step.id}-${issue.type}-${index}`}>{issue.message}</li>)}
                    </ul>
                  </article>
                ))}
              </div>
            ) : (
              <div className="ws-readiness-confirmation">
                <CheckCircle2 size={16} />
                <span>
                  {readiness.status === 'not-started'
                    ? 'Add build steps to calculate dependency and resource readiness.'
                    : readiness.status === 'complete'
                      ? 'All build steps are complete.'
                      : 'All incomplete steps have their mapped dependencies and resources covered.'}
                </span>
              </div>
            )}

            <p className="ws-build-readiness-boundary">
              Readiness uses the current project inventory screening and explicit step links. It does not allocate stock, assign physical tools or certify a safe workshop setup.
            </p>
          </div>
        </section>

        {stageForm && (
          <form className="ws-card ws-build-form" onSubmit={handleStageSubmit}>
            <div className="ws-card-header">
              <div className="ws-card-title"><ClipboardList size={17} /> {stageForm.id ? 'Edit stage' : 'Add stage'}</div>
              <button type="button" className="ws-btn ws-btn-icon" onClick={closeForms} title="Close form"><X size={17} /></button>
            </div>
            <div className="ws-card-body">
              <div className="ws-build-form-grid">
                <label className="ws-input-group ws-build-field-wide">
                  <span className="ws-label">Stage name</span>
                  <input
                    className="ws-input"
                    value={stageForm.name}
                    onChange={event => setStageForm(current => ({ ...current, name: event.target.value }))}
                    placeholder="Preparation, carcass assembly, finishing"
                    autoFocus
                  />
                </label>
              </div>
              <div className="ws-build-form-actions">
                <button type="button" className="ws-btn" onClick={closeForms}>Cancel</button>
                <button type="submit" className="ws-btn ws-btn-primary">Save stage</button>
              </div>
            </div>
          </form>
        )}

        {stepForm && (
          <form className="ws-card ws-build-form" onSubmit={handleStepSubmit}>
            <div className="ws-card-header">
              <div className="ws-card-title"><ClipboardList size={17} /> {stepForm.id ? 'Edit step' : 'Add step'}</div>
              <button type="button" className="ws-btn ws-btn-icon" onClick={closeForms} title="Close form"><X size={17} /></button>
            </div>
            <div className="ws-card-body">
              <div className="ws-build-form-grid">
                <label className="ws-input-group ws-build-field-wide">
                  <span className="ws-label">Step name</span>
                  <input
                    className="ws-input"
                    value={stepForm.name}
                    onChange={event => setStepForm(current => ({ ...current, name: event.target.value }))}
                    placeholder="Mark cut lines, cut panels, dry fit the frame"
                    autoFocus
                  />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Stage</span>
                  <select
                    className="ws-select"
                    value={stepForm.stageId}
                    onChange={event => setStepForm(current => ({ ...current, stageId: event.target.value }))}
                    disabled={Boolean(stepForm.id)}
                  >
                    <option value="">Choose a stage</option>
                    {orderedStages.map(stage => <option value={stage.id} key={stage.id}>{stage.name}</option>)}
                  </select>
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Step type</span>
                  <select className="ws-select" value={stepForm.type} onChange={event => setStepForm(current => ({ ...current, type: event.target.value }))}>
                    {BUILD_STEP_TYPES.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Estimated minutes</span>
                  <input className="ws-input" type="number" min="0" step="1" value={stepForm.estimatedMinutes} onChange={event => setStepForm(current => ({ ...current, estimatedMinutes: event.target.value }))} />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Wait / cure minutes</span>
                  <input className="ws-input" type="number" min="0" step="1" value={stepForm.waitMinutes} onChange={event => setStepForm(current => ({ ...current, waitMinutes: event.target.value }))} />
                </label>
                <label className="ws-input-group">
                  <span className="ws-label">Status</span>
                  <select className="ws-select" value={stepForm.status} onChange={event => setStepForm(current => ({ ...current, status: event.target.value }))}>
                    {BUILD_STEP_STATUSES.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label className="ws-input-group ws-build-field-wide">
                  <span className="ws-label">Depends on</span>
                  <select className="ws-select ws-build-multiselect" multiple value={stepForm.dependsOn} onChange={event => setStepForm(current => ({ ...current, dependsOn: readSelectedValues(event) }))}>
                    {plan.steps.filter(step => step.id !== stepForm.id).map(step => <option value={step.id} key={step.id}>{step.name}</option>)}
                  </select>
                  <span className="ws-build-help">Use Ctrl / Command to select multiple steps.</span>
                </label>
                <label className="ws-input-group ws-build-field-wide">
                  <span className="ws-label">Cut-list parts</span>
                  <select className="ws-select ws-build-multiselect" multiple value={stepForm.partIds} onChange={event => setStepForm(current => ({ ...current, partIds: readSelectedValues(event) }))}>
                    {parts.length ? parts.map(part => <option value={part.id} key={part.id}>{part.name || part.id}</option>) : <option disabled>No cut-list parts yet</option>}
                  </select>
                </label>
                <label className="ws-input-group ws-build-field-wide">
                  <span className="ws-label">Tool requirements</span>
                  <select className="ws-select ws-build-multiselect" multiple value={stepForm.toolRequirementIds} onChange={event => setStepForm(current => ({ ...current, toolRequirementIds: readSelectedValues(event) }))}>
                    {toolRequirements.length ? toolRequirements.map(requirement => <option value={requirement.id} key={requirement.id}>{requirement.capability.replaceAll('-', ' ')}</option>) : <option disabled>No tool requirements yet</option>}
                  </select>
                </label>
                <label className="ws-input-group ws-build-field-wide">
                  <span className="ws-label">Supply requirements</span>
                  <select className="ws-select ws-build-multiselect" multiple value={stepForm.supplyRequirementIds} onChange={event => setStepForm(current => ({ ...current, supplyRequirementIds: readSelectedValues(event) }))}>
                    {supplyRequirements.length ? supplyRequirements.map(requirement => <option value={requirement.id} key={requirement.id}>{requirement.name}</option>) : <option disabled>No supply requirements yet</option>}
                  </select>
                </label>
                <label className="ws-input-group ws-build-field-wide">
                  <span className="ws-label">Notes</span>
                  <textarea className="ws-input ws-build-textarea" rows="3" value={stepForm.notes} onChange={event => setStepForm(current => ({ ...current, notes: event.target.value }))} placeholder="Measurements, sequence detail or quality checks" />
                </label>
                <label className="ws-input-group ws-build-field-wide">
                  <span className="ws-label">Safety notes</span>
                  <textarea className="ws-input ws-build-textarea" rows="3" value={stepForm.safetyNotes} onChange={event => setStepForm(current => ({ ...current, safetyNotes: event.target.value }))} placeholder="One safety reminder per line; verify against the tool manual" />
                </label>
              </div>
              <div className="ws-build-form-actions">
                <button type="button" className="ws-btn" onClick={closeForms}>Cancel</button>
                <button type="submit" className="ws-btn ws-btn-primary">Save step</button>
              </div>
            </div>
          </form>
        )}

        {!buildPlan && !stageForm && orderedStages.length === 0 && (
          <div className="ws-card ws-build-plan-empty">
            <ClipboardList size={28} />
            <strong>Start with a build stage</strong>
            <p>Stages keep the plan readable. Add steps inside them and connect dependencies as your method becomes clear.</p>
            <button type="button" className="ws-btn ws-btn-primary" onClick={() => beginStageForm()}><Plus size={15} /> Add first stage</button>
          </div>
        )}

        {orderedStages.map(stage => {
          const stageSteps = plan.steps
            .filter(step => step.stageId === stage.id)
            .sort((a, b) => a.sequence - b.sequence);

          return (
            <section className="ws-card ws-build-stage" key={stage.id}>
              <div className="ws-card-header ws-build-stage-header">
                <div>
                  <div className="ws-build-stage-kicker">Stage {stage.sequence}</div>
                  <div className="ws-card-title ws-build-stage-title"><ClipboardList size={17} /> {stage.name}</div>
                </div>
                <div className="ws-build-stage-actions">
                  <button type="button" className="ws-btn ws-btn-sm" onClick={() => beginStepForm(stage.id)}><Plus size={14} /> Add step</button>
                  <button type="button" className="ws-btn ws-btn-icon" onClick={() => beginStageForm(stage)} title="Edit stage"><Edit3 size={16} /></button>
                  <button type="button" className="ws-btn ws-btn-icon ws-btn-danger" onClick={() => handleDeleteStage(stage)} title="Remove stage"><Trash2 size={16} /></button>
                </div>
              </div>
              <div className="ws-build-step-list">
                {stageSteps.length ? stageSteps.map(step => {
                  const progress = progressById.get(step.id);
                  const dependencyNames = progress?.blockingDependencies.map(dependency => dependency.name) ?? [];
                  const stateMessage = step.status === 'complete'
                    ? 'Complete'
                    : dependencyNames.length
                      ? `Waiting on ${dependencyNames.join(', ')}`
                      : step.status === 'blocked' ? 'Marked blocked' : 'Ready to work';

                  return (
                    <article className={`ws-build-step ${step.status}${progress?.isBlocked ? ' dependency-blocked' : ''}`} key={step.id}>
                      <div className="ws-build-step-header">
                        <div>
                          <div className="ws-build-step-kicker">Step {step.sequence} · {optionLabel(BUILD_STEP_TYPES, step.type)}</div>
                          <h3>{step.name}</h3>
                        </div>
                        <div className="ws-build-step-actions">
                          <select className={statusClass(step.status)} value={step.status} onChange={event => handleStepStatusChange(step, event.target.value)} aria-label={`Status for ${step.name}`}>
                            {BUILD_STEP_STATUSES.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
                          </select>
                          <button type="button" className="ws-btn ws-btn-icon" onClick={() => beginStepForm(stage.id, step)} title="Edit step"><Edit3 size={15} /></button>
                          <button type="button" className="ws-btn ws-btn-icon ws-btn-danger" onClick={() => handleDeleteStep(step)} title="Remove step"><Trash2 size={15} /></button>
                        </div>
                      </div>
                      <div className="ws-build-step-meta">
                        <span><Clock3 size={13} /> {formatDuration(step.estimatedMinutes)} work</span>
                        {step.waitMinutes > 0 && <span><Clock3 size={13} /> {formatDuration(step.waitMinutes)} wait</span>}
                        <span className={progress?.isBlocked ? 'is-warning' : 'is-ready'}>{progress?.isBlocked ? <AlertTriangle size={13} /> : <CheckCircle2 size={13} />} {stateMessage}</span>
                      </div>
                      {(step.notes || step.safetyNotes.length > 0) && (
                        <div className="ws-build-step-body">
                          {step.notes && <p>{step.notes}</p>}
                          {step.safetyNotes.length > 0 && <p className="ws-build-safety-note"><AlertTriangle size={14} /> {step.safetyNotes.join(' · ')}</p>}
                        </div>
                      )}
                      <div className="ws-build-step-resources">
                        <div><span className="ws-build-resource-label">Parts</span>{renderResourceChips(step.partIds, partNames, 'None mapped')}</div>
                        <div><span className="ws-build-resource-label">Tools</span>{renderResourceChips(step.toolRequirementIds, toolNames, 'None mapped')}</div>
                        <div><span className="ws-build-resource-label">Supplies</span>{renderResourceChips(step.supplyRequirementIds, supplyNames, 'None mapped')}</div>
                      </div>
                    </article>
                  );
                }) : (
                  <div className="ws-build-stage-empty">No steps yet. Add the first confirmed action for this stage.</div>
                )}
              </div>
            </section>
          );
        })}

        <p className="ws-build-boundary">
          Build planner data is a user-authored plan. It does not certify tool safety, generate a guaranteed method or replace manufacturer instructions and workshop supervision.
        </p>
      </div>
    </main>
  );
}
