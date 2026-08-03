import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Play,
} from 'lucide-react';
import {
  BUILD_STEP_TYPES,
  updateBuildStep,
} from '../utils/buildPlanner.js';
import { getBuildPlanReadiness } from '../utils/buildReadiness.js';

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

function toneClass(status) {
  return status === 'ready' || status === 'complete' ? 'screened' : 'attention';
}

export default function WorkshopMode({
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
}) {
  const readiness = useMemo(
    () => getBuildPlanReadiness(buildPlan, {
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
      buildPlan,
      materials,
      parts,
      requiredStockQuantity,
      selectedMaterialId,
      supplies,
      supplyRequirements,
      toolRequirements,
      tools,
      unit,
    ],
  );
  const firstIncompleteStepId = useMemo(
    () => readiness.steps.find(item => item.step.status !== 'complete')?.step.id ?? null,
    [readiness.steps],
  );
  const [activeStepId, setActiveStepId] = useState(null);
  const [updateError, setUpdateError] = useState('');

  useEffect(() => {
    const activeStepExists = readiness.steps.some(item => item.step.id === activeStepId);
    if (!activeStepExists || readiness.steps.find(item => item.step.id === activeStepId)?.step.status === 'complete') {
      setActiveStepId(firstIncompleteStepId);
    }
  }, [activeStepId, firstIncompleteStepId, readiness.steps]);

  const activeItem = readiness.steps.find(item => item.step.id === activeStepId)
    ?? readiness.steps.find(item => item.step.status !== 'complete')
    ?? readiness.steps[0]
    ?? null;

  const handleStatusChange = status => {
    if (!activeItem || !buildPlan) return;

    try {
      onChange(updateBuildStep(buildPlan, activeItem.step.id, { status }));
      setUpdateError('');
    } catch (error) {
      setUpdateError(error.message);
    }
  };

  if (!buildPlan || readiness.totalSteps === 0) {
    return (
      <section className="ws-card ws-workshop-mode">
        <div className="ws-card-header">
          <div className="ws-card-title"><ClipboardCheck size={18} /> Workshop mode</div>
          <span className="ws-readiness-status not-started">No build steps</span>
        </div>
        <div className="ws-card-body ws-workshop-empty">
          <strong>Create a build plan before starting workshop mode.</strong>
          <span>The saved stages and steps will appear here with large controls for workshop use.</span>
        </div>
      </section>
    );
  }

  const activeStepIndex = readiness.steps.findIndex(item => item.step.id === activeItem.step.id);
  const canStart = activeItem.status === 'ready' && activeItem.step.status === 'not-started';
  const canComplete = activeItem.status === 'ready' && activeItem.step.status === 'in-progress';

  return (
    <section className="ws-card ws-workshop-mode">
      <div className="ws-card-header">
        <div className="ws-card-title"><ClipboardCheck size={18} /> Workshop mode</div>
        <span className={`ws-readiness-status ${toneClass(readiness.status)}`}>{readiness.statusLabel}</span>
      </div>
      <div className="ws-card-body">
        <div className="ws-workshop-summary">
          <div>
            <span className="ws-page-eyebrow">Execution sequence</span>
            <strong>{readiness.completedSteps} of {readiness.totalSteps} steps complete</strong>
          </div>
          <div className="ws-workshop-summary-stats">
            <span><CheckCircle2 size={14} /> {readiness.readySteps} ready</span>
            <span><AlertTriangle size={14} /> {readiness.blockedSteps + readiness.reviewSteps} need attention</span>
          </div>
        </div>

        {updateError && <div className="ws-form-error" role="alert">{updateError}</div>}

        <div className={`ws-workshop-current ${activeItem.status}`}>
          <div className="ws-workshop-current-heading">
            <div>
              <span className="ws-page-eyebrow">Step {activeStepIndex + 1} of {readiness.totalSteps} · {activeItem.stageName}</span>
              <h2>{activeItem.step.name}</h2>
              <div className="ws-workshop-step-meta">
                <span>{optionLabel(BUILD_STEP_TYPES, activeItem.step.type)}</span>
                <span><Clock3 size={14} /> {formatDuration(activeItem.step.estimatedMinutes)} work</span>
                {activeItem.step.waitMinutes > 0 && <span><Clock3 size={14} /> {formatDuration(activeItem.step.waitMinutes)} wait</span>}
              </div>
            </div>
            <span className={`ws-build-readiness-badge ${activeItem.status}`}>{activeItem.statusLabel}</span>
          </div>

          {activeItem.issues.length > 0 && (
            <ul className="ws-workshop-issues">
              {activeItem.issues.map((issue, index) => <li key={`${issue.type}-${index}`}><AlertTriangle size={14} /> {issue.message}</li>)}
            </ul>
          )}

          <div className="ws-workshop-actions">
            {canStart && (
              <button type="button" className="ws-btn ws-btn-primary ws-workshop-primary-action" onClick={() => handleStatusChange('in-progress')}>
                <Play size={17} /> Start this step
              </button>
            )}
            {canComplete && (
              <button type="button" className="ws-btn ws-btn-primary ws-workshop-primary-action" onClick={() => handleStatusChange('complete')}>
                <CheckCircle2 size={17} /> Mark step complete
              </button>
            )}
            {!canStart && !canComplete && activeItem.step.status === 'complete' && (
              <div className="ws-workshop-complete"><CheckCircle2 size={17} /> This step is complete.</div>
            )}
            {!canStart && !canComplete && activeItem.step.status !== 'complete' && (
              <div className="ws-workshop-blocked"><AlertTriangle size={17} /> Resolve the readiness issues before starting this step.</div>
            )}
          </div>
        </div>

        <div className="ws-workshop-step-list" aria-label="Workshop build steps">
          {readiness.steps.map((item, index) => (
            <button
              type="button"
              className={`ws-workshop-step-option${item.step.id === activeItem.step.id ? ' active' : ''}`}
              key={item.step.id}
              onClick={() => setActiveStepId(item.step.id)}
            >
              <span className="ws-workshop-step-number">{index + 1}</span>
              <span className="ws-workshop-step-option-text">
                <strong>{item.step.name}</strong>
                <small>{item.stageName}</small>
              </span>
              <span className={`ws-build-readiness-badge ${item.status}`}>{item.statusLabel}</span>
            </button>
          ))}
        </div>

        <p className="ws-build-readiness-boundary">
          Workshop mode records progress against your build plan. Follow the manufacturer instructions and confirm the setup is safe before each operation.
        </p>
      </div>
    </section>
  );
}
