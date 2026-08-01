import React, { useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Package,
  Wrench,
} from 'lucide-react';
import { getProjectResourceCheck } from '../utils/projectReadiness.js';
import { getSupplyRequirementCheck } from '../utils/supplyRequirements.js';
import ProjectSupplyRequirements from './ProjectSupplyRequirements.jsx';
import ProjectToolRequirements from './ProjectToolRequirements.jsx';

function StatusIcon({ status }) {
  return status === 'potential' ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />;
}

function statusClass(status) {
  if (status === 'screened' || status === 'quantity-covered') return 'ws-readiness-status screened';
  if (status === 'not-started') return 'ws-readiness-status not-started';
  return 'ws-readiness-status attention';
}

function formatPartSummary(row) {
  const quantityLabel = `${row.quantity} required`;
  const dimensionLabel = [row.dimensions.width, row.dimensions.length]
    .filter(Number.isFinite)
    .map(value => `${value} mm`)
    .join(' × ');

  return dimensionLabel ? `${quantityLabel} · ${dimensionLabel}` : quantityLabel;
}

function rowResult(row) {
  if (row.status === 'planned') {
    return `Planned purchase candidate${row.plannedCandidates.length === 1 ? '' : 's'}`;
  }
  if (row.status === 'needs-review') return row.reason;
  return row.reason || 'No available owned or planned stock passed screening.';
}

function getOverallStatus(materialCheck, supplyCheck, toolCheck) {
  if (toolCheck.status === 'needs-attention') {
    return { status: 'needs-review', statusLabel: 'Tool gaps' };
  }
  if (supplyCheck.status === 'needs-attention') {
    return { status: 'needs-review', statusLabel: 'Supply gaps' };
  }
  if (materialCheck.status === 'needs-review'
    || materialCheck.status === 'material-gap'
    || materialCheck.status === 'quantity-gap') {
    return { status: materialCheck.status, statusLabel: materialCheck.statusLabel };
  }
  if (materialCheck.status === 'planned' || supplyCheck.status === 'planned') {
    return { status: 'planned', statusLabel: 'Purchase planned' };
  }
  if (materialCheck.status === 'not-started' && supplyCheck.status === 'not-started') {
    return { status: 'not-started', statusLabel: 'No resources yet' };
  }
  return { status: 'screened', statusLabel: 'Potentially covered' };
}

export default function ProjectReadiness({
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
  const check = useMemo(
    () => getProjectResourceCheck(parts, unit, materials, {
      selectedMaterialId,
      requiredStockQuantity,
      toolRequirements,
      tools,
    }),
    [materials, parts, requiredStockQuantity, selectedMaterialId, toolRequirements, tools, unit],
  );
  const supplyCheck = useMemo(
    () => getSupplyRequirementCheck(supplyRequirements, supplies),
    [supplies, supplyRequirements],
  );
  const overallStatus = getOverallStatus(check, supplyCheck, check.toolRequirements);

  return (
    <section className="ws-card no-print ws-readiness-card">
      <div className="ws-card-header">
        <div className="ws-card-title">
          <ClipboardCheck size={18} />
          Project resource check
        </div>
        <span className={statusClass(overallStatus.status)}>{overallStatus.statusLabel}</span>
      </div>

      <div className="ws-card-body">
        <div className="ws-metrics-grid ws-readiness-metrics">
          <div className="ws-metric-card">
            <div className="ws-metric-label"><Package size={13} /> Owned dimension fits</div>
            <div className="ws-metric-value">
              {check.matchedPartTypes}<span className="ws-metric-unit"> / {check.totalPartTypes} types</span>
            </div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><Package size={13} /> Planned candidates</div>
            <div className={`ws-metric-value${check.plannedPartTypes ? ' secondary' : ''}`}>
              {check.plannedPartTypes}<span className="ws-metric-unit"> types</span>
            </div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><AlertTriangle size={13} /> Unresolved</div>
            <div className={`ws-metric-value${check.unmatchedPartTypes ? ' secondary' : ''}`}>
              {check.unmatchedPartTypes}<span className="ws-metric-unit"> types</span>
            </div>
          </div>
          <div className="ws-metric-card">
            <div className="ws-metric-label"><AlertTriangle size={13} /> Needs review</div>
            <div className={`ws-metric-value${check.reviewPartTypes ? ' secondary' : ''}`}>
              {check.reviewPartTypes}<span className="ws-metric-unit"> types</span>
            </div>
          </div>
        </div>

        <p className="ws-readiness-note">
          This is dimensional screening for individual stock records. It does not allocate boards,
          replace WoodCut optimisation or confirm that a project is safe to build.
        </p>

        {check.selectedStockCheck.status !== 'not-selected' && (
          <div className={`ws-readiness-stock ${check.selectedStockCheck.status}`}>
            <div className="ws-readiness-stock-heading">
              <Package size={16} />
              <div>
                <strong>Selected stock: {check.selectedStockCheck.name}</strong>
                <span>{check.selectedStockCheck.source === 'planned' ? 'Planned purchase' : 'Owned inventory'}</span>
              </div>
            </div>
            <div className="ws-readiness-stock-quantity">
              <strong>{check.selectedStockCheck.availableQuantity ?? 0}</strong>
              <span>available</span>
              <span aria-hidden="true">·</span>
              <strong>{check.selectedStockCheck.requiredQuantity ?? 0}</strong>
              <span>required</span>
            </div>
            <div className="ws-readiness-stock-message">{check.selectedStockCheck.message}</div>
          </div>
        )}

        {check.attentionRows.length > 0 ? (
          <div className="ws-readiness-list" aria-label="Project resource items needing attention">
            {check.attentionRows.map(row => (
              <div className={`ws-inventory-match-row ${row.status}`} key={row.id}>
                <div className="ws-inventory-match-status" title={row.status}>
                  <StatusIcon status={row.status} />
                </div>
                <div className="ws-inventory-match-main">
                  <strong>{row.name}</strong>
                  <span>{formatPartSummary(row)}</span>
                </div>
                <div className="ws-inventory-match-result">{rowResult(row)}</div>
              </div>
            ))}
          </div>
        ) : check.status === 'screened' || check.status === 'quantity-gap' ? (
          <div className={`ws-readiness-confirmation${check.status === 'quantity-gap' ? ' attention' : ''}`}>
            {check.status === 'quantity-gap' ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            <span>
              {check.status === 'quantity-gap'
                ? 'Every active part type has a dimensional candidate, but the selected stock quantity is insufficient.'
                : 'Every active part type has at least one potential owned-stock candidate.'}
            </span>
          </div>
        ) : (
          <div className="ws-inventory-empty ws-inventory-empty-compact">
            <span>Add cut-list parts to begin the resource check.</span>
          </div>
        )}

        <ProjectSupplyRequirements
          projectId={projectId}
          requirements={supplyRequirements}
          supplies={supplies}
          check={supplyCheck}
          onChange={onSupplyRequirementsChange}
        />

        <ProjectToolRequirements
          projectId={projectId}
          requirements={toolRequirements}
          tools={tools}
          check={check.toolRequirements}
          onChange={onToolRequirementsChange}
        />

        <div className="ws-readiness-boundaries">
          <div>
            <Wrench size={15} />
            <span><strong>Tool matching:</strong> capability coverage does not assign tools or certify a safe setup.</span>
          </div>
          <div>
            <Package size={15} />
            <span><strong>Supply matching:</strong> exact inventory matches are planning data and do not reserve or price stock.</span>
          </div>
        </div>
      </div>
    </section>
  );
}
