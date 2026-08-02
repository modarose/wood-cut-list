import React from 'react';
import ProjectDetails from './ProjectDetails';
import ProjectReadiness from './ProjectReadiness';

export default function ProjectWorkspace({
  name,
  status,
  description,
  isDirty,
  lastSavedAt,
  saveError,
  onNameChange,
  onStatusChange,
  onDescriptionChange,
  parts,
  materials,
  unit,
  selectedMaterialId,
  requiredStockQuantity,
  projectId,
  supplyRequirements,
  supplies,
  onSupplyRequirementsChange,
  toolRequirements,
  tools,
  onToolRequirementsChange,
}) {
  return (
    <section className="ws-project-workspace">
      <details className="ws-project-workspace-details">
        <summary className="ws-project-workspace-summary">
          <div>
            <div className="ws-page-eyebrow">Current project</div>
            <h2>Project setup &amp; readiness</h2>
            <p>Update the project brief and review material, supply and tool gaps before cutting.</p>
          </div>
          <span className="ws-project-workspace-summary-hint">Open details</span>
        </summary>

        <div className="ws-project-workspace-content">
          <ProjectDetails
            name={name}
            status={status}
            description={description}
            isDirty={isDirty}
            lastSavedAt={lastSavedAt}
            saveError={saveError}
            onNameChange={onNameChange}
            onStatusChange={onStatusChange}
            onDescriptionChange={onDescriptionChange}
          />

          <ProjectReadiness
            parts={parts}
            materials={materials}
            unit={unit}
            selectedMaterialId={selectedMaterialId}
            requiredStockQuantity={requiredStockQuantity}
            projectId={projectId}
            supplyRequirements={supplyRequirements}
            supplies={supplies}
            onSupplyRequirementsChange={onSupplyRequirementsChange}
            toolRequirements={toolRequirements}
            tools={tools}
            onToolRequirementsChange={onToolRequirementsChange}
          />
        </div>
      </details>
    </section>
  );
}
