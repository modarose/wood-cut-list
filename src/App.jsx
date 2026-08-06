import React, { useEffect, useState, useMemo } from 'react';
import Header from './components/Header';
import SheetSettings from './components/SheetSettings';
import CutListInput from './components/CutListInput';
import SummaryStats from './components/SummaryStats';
import Visualizer from './components/Visualizer';
import CutSequence from './components/CutSequence';
import PresetsModal from './components/PresetsModal';
import ProjectDashboard from './components/ProjectDashboard';
import MaterialInventory from './components/MaterialInventory';
import SupplyInventory from './components/SupplyInventory';
import ToolInventory from './components/ToolInventory';
import BuildPlanner from './components/BuildPlanner';
import Costing from './components/Costing';
import Sidebar from './components/Sidebar';
import UserGuide from './components/UserGuide';

import { UNITS, convertDimension } from './utils/unitConverter';
import { optimizeCutList, STRATEGIES, CUT_PREFERENCES } from './utils/cutOptimizer';
import { PROJECT_PRESETS } from './utils/presets';
import { createBenchMateProjectFromWoodCut, toWoodCutSession } from './utils/benchmateAdapter.js';
import { createProjectBudget } from './utils/budget.js';
import { cloneBuildPlan } from './utils/buildPlanner.js';
import { createProjectId, loadStoredProjects, saveStoredProjects, upsertStoredProject } from './utils/projectStorage.js';
import {
  createMaterialStock,
  getAvailableQuantity,
  getProjectReservation,
  loadStoredMaterials,
  removeStoredMaterial,
  releaseMaterialStock,
  reserveMaterialStock,
  updateMaterialStock,
  upsertStoredMaterial,
} from './utils/materialInventory.js';
import {
  createSupply,
  loadStoredSupplies,
  removeStoredSupply,
  SUPPLY_CATEGORIES,
  SUPPLY_UNITS,
  updateSupply,
  upsertStoredSupply,
} from './utils/supplyInventory.js';
import {
  createTool,
  loadStoredTools,
  removeStoredTool,
  updateTool,
  upsertStoredTool,
} from './utils/toolInventory.js';

function createDefaultSession() {
  const preset = PROJECT_PRESETS[0];
  return {
    unit: preset.unit,
    stock: { ...preset.stock },
    parts: preset.parts.map(part => ({ ...part })),
    strategy: STRATEGIES.BSSF,
    cutPreference: CUT_PREFERENCES.RIP_FIRST,
  };
}

function getInitialProjectState() {
  const savedProjects = loadStoredProjects();
  const initialProject = savedProjects.find(record => !record.project.archivedAt) ?? null;
  const session = initialProject ? toWoodCutSession(initialProject) : createDefaultSession();

  return {
    savedProjects,
    initialProject,
    session,
  };
}

function stockSizeMatchesMaterial(material, stock, unit) {
  if (!material || !stock) return false;
  const displayDimension = value => Math.round(convertDimension(value, UNITS.MM, unit) * 10) / 10;
  return Math.abs(stock.width - displayDimension(material.usableWidth)) < 0.05
    && Math.abs(stock.height - displayDimension(material.usableLength)) < 0.05;
}

export default function App() {
  const [initialState] = useState(() => getInitialProjectState());
  const initialProject = initialState.initialProject;

  // BenchMate project shell state
  const [savedProjects, setSavedProjects] = useState(initialState.savedProjects);
  const [projectId, setProjectId] = useState(() => initialProject?.project.id ?? createProjectId());
  const [revisionId, setRevisionId] = useState(() => initialProject?.project.activeRevisionId ?? null);
  const [projectName, setProjectName] = useState(() => initialProject?.project.name ?? PROJECT_PRESETS[0].name);
  const [projectStatus, setProjectStatus] = useState(() => initialProject?.project.status ?? 'planning');
  const [projectDescription, setProjectDescription] = useState(() => initialProject?.project.description ?? PROJECT_PRESETS[0].description);
  const [lastSavedAt, setLastSavedAt] = useState(() => initialProject?.project.updatedAt ?? null);
  const [isDirty, setIsDirty] = useState(() => !initialProject);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [isInventoryOpen, setIsInventoryOpen] = useState(false);
  const [isSuppliesOpen, setIsSuppliesOpen] = useState(false);
  const [isWorkshopOpen, setIsWorkshopOpen] = useState(false);
  const [isBuildPlannerOpen, setIsBuildPlannerOpen] = useState(false);
  const [isCostingOpen, setIsCostingOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [materials, setMaterials] = useState(() => loadStoredMaterials());
  const [supplies, setSupplies] = useState(() => loadStoredSupplies());
  const [supplyRequirements, setSupplyRequirements] = useState(
    () => initialProject?.supplyRequirements ?? [],
  );
  const [toolRequirements, setToolRequirements] = useState(
    () => initialProject?.toolRequirements ?? [],
  );
  const [buildPlan, setBuildPlan] = useState(
    () => initialProject?.buildMethods?.[0] ?? null,
  );
  const [costItems, setCostItems] = useState(
    () => initialProject?.costItems ?? [],
  );
  const [budget, setBudget] = useState(
    () => initialProject?.project.budget ?? null,
  );
  const [tools, setTools] = useState(() => loadStoredTools());
  const [selectedMaterialId, setSelectedMaterialId] = useState(
    () => initialProject?.cutStock?.sourceMaterialStockId ?? null,
  );
  const [saveError, setSaveError] = useState('');

  // Existing WoodCut Studio state
  const [unit, setUnit] = useState(initialState.session.unit);
  const [strategy, setStrategy] = useState(initialState.session.strategy);
  const [cutPreference, setCutPreference] = useState(initialState.session.cutPreference);
  const [stock, setStock] = useState(initialState.session.stock);
  const [parts, setParts] = useState(initialState.session.parts);
  const [isPresetsOpen, setIsPresetsOpen] = useState(false);

  const selectedMaterial = materials.find(material => material.id === selectedMaterialId) ?? null;

  const markDirty = () => {
    setIsDirty(true);
    setSaveError('');
  };

  useEffect(() => {
    const handleBeforeUnload = event => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // Handle Unit Switching (MM <-> Inches) with automatic dimension recalculation
  const handleUnitChange = (newUnit) => {
    if (newUnit === unit) return;
    const convertedStock = {
      width: Math.round(convertDimension(stock.width, unit, newUnit) * 10) / 10,
      height: Math.round(convertDimension(stock.height, unit, newUnit) * 10) / 10,
      kerf: Math.round(convertDimension(stock.kerf, unit, newUnit) * 100) / 100,
      margin: Math.round(convertDimension(stock.margin, unit, newUnit) * 10) / 10,
    };
    const convertedParts = parts.map(p => ({
      ...p,
      width: Math.round(convertDimension(p.width, unit, newUnit) * 10) / 10,
      height: Math.round(convertDimension(p.height, unit, newUnit) * 10) / 10,
    }));
    setStock(convertedStock);
    setParts(convertedParts);
    setUnit(newUnit);
    markDirty();
  };

  const handleStockChange = (nextStock) => {
    setStock(nextStock);
    if (selectedMaterialId && !stockSizeMatchesMaterial(selectedMaterial, nextStock, unit)) {
      setSelectedMaterialId(null);
    }
    markDirty();
  };

  const handleUseMaterial = (material) => {
    if (!material || getAvailableQuantity(material) <= 0) {
      return { used: false, error: 'This material has no available quantity to use.' };
    }

    setStock(currentStock => ({
      ...currentStock,
      width: Math.round(convertDimension(material.usableWidth, UNITS.MM, unit) * 10) / 10,
      height: Math.round(convertDimension(material.usableLength, UNITS.MM, unit) * 10) / 10,
    }));
    setSelectedMaterialId(material.id);
    setIsProjectsOpen(false);
    setIsInventoryOpen(false);
    markDirty();
    return { used: true, error: '' };
  };

  const handlePartsChange = (nextParts) => {
    setParts(nextParts);
    markDirty();
  };

  const handleStrategyChange = (nextStrategy) => {
    setStrategy(nextStrategy);
    markDirty();
  };

  const handleCutPreferenceChange = (nextPreference) => {
    setCutPreference(nextPreference);
    markDirty();
  };

  // Run Real-time Cut List Optimization
  const optimizationResult = useMemo(() => {
    return optimizeCutList(stock, parts, {
      kerf: stock.kerf,
      margin: stock.margin,
      strategy,
      cutPreference,
    });
  }, [stock, parts, strategy, cutPreference]);

  // Load Preset Project
  const handleLoadPreset = (preset) => {
    setUnit(preset.unit);
    setStock({ ...preset.stock });
    setParts(preset.parts.map(part => ({ ...part })));
    setSelectedMaterialId(null);
    markDirty();
  };

  const canReplaceProject = () => {
    if (!isDirty) return true;
    return window.confirm('You have unsaved project changes. Replace them without saving?');
  };

  const handleOpenProjects = () => {
    setIsInventoryOpen(false);
    setIsWorkshopOpen(false);
    setIsBuildPlannerOpen(false);
    setIsCostingOpen(false);
    setIsUserGuideOpen(false);
    setIsProjectsOpen(true);
  };

  const handleOpenInventory = () => {
    setIsProjectsOpen(false);
    setIsWorkshopOpen(false);
    setIsBuildPlannerOpen(false);
    setIsCostingOpen(false);
    setIsUserGuideOpen(false);
    setIsInventoryOpen(true);
    setIsSuppliesOpen(false);
  };

  const handleCloseInventory = () => {
    setIsInventoryOpen(false);
    setIsSuppliesOpen(false);
  };

  const handleOpenSupplies = () => {
    setIsProjectsOpen(false);
    setIsWorkshopOpen(false);
    setIsBuildPlannerOpen(false);
    setIsCostingOpen(false);
    setIsUserGuideOpen(false);
    setIsInventoryOpen(true);
    setIsSuppliesOpen(true);
  };

  const handleOpenMaterials = () => {
    setIsSuppliesOpen(false);
  };

  const handleOpenWorkshop = () => {
    setIsProjectsOpen(false);
    setIsInventoryOpen(false);
    setIsSuppliesOpen(false);
    setIsBuildPlannerOpen(false);
    setIsCostingOpen(false);
    setIsUserGuideOpen(false);
    setIsWorkshopOpen(true);
  };

  const handleCloseWorkshop = () => {
    setIsWorkshopOpen(false);
  };

  const handleOpenBuildPlanner = () => {
    setIsProjectsOpen(false);
    setIsInventoryOpen(false);
    setIsSuppliesOpen(false);
    setIsWorkshopOpen(false);
    setIsCostingOpen(false);
    setIsUserGuideOpen(false);
    setIsBuildPlannerOpen(true);
  };

  const handleCloseBuildPlanner = () => {
    setIsBuildPlannerOpen(false);
  };

  const handleOpenCosting = () => {
    setIsProjectsOpen(false);
    setIsInventoryOpen(false);
    setIsSuppliesOpen(false);
    setIsWorkshopOpen(false);
    setIsBuildPlannerOpen(false);
    setIsUserGuideOpen(false);
    setIsCostingOpen(true);
  };

  const handleCloseCosting = () => {
    setIsCostingOpen(false);
  };

  const handleOpenUserGuide = () => {
    setIsProjectsOpen(false);
    setIsInventoryOpen(false);
    setIsSuppliesOpen(false);
    setIsWorkshopOpen(false);
    setIsBuildPlannerOpen(false);
    setIsCostingOpen(false);
    setIsUserGuideOpen(true);
  };

  const handleCloseUserGuide = () => {
    setIsUserGuideOpen(false);
  };

  const handleSidebarNavigate = (section) => {
    if (section === 'user-guide') {
      handleOpenUserGuide();
      return;
    }

    if (section === 'projects') {
      handleOpenProjects();
      return;
    }

    if (section === 'inventory') {
      handleOpenInventory();
      return;
    }

    if (section === 'workshop') {
      handleOpenWorkshop();
      return;
    }

    if (section === 'build-planner') {
      handleOpenBuildPlanner();
      return;
    }

    if (section === 'costing') {
      handleOpenCosting();
      return;
    }

    if (section === 'optimizer') {
      if (isProjectsOpen) setIsProjectsOpen(false);
      if (isInventoryOpen) handleCloseInventory();
      if (isWorkshopOpen) handleCloseWorkshop();
      if (isBuildPlannerOpen) handleCloseBuildPlanner();
      if (isCostingOpen) handleCloseCosting();
      if (isUserGuideOpen) handleCloseUserGuide();
    }
  };

  const handleSaveProject = () => {
    const now = new Date().toISOString();
    const record = createBenchMateProjectFromWoodCut({
      unit,
      stock,
      parts,
      strategy,
      cutPreference,
    }, {
      projectId,
      revisionId: revisionId ?? undefined,
      name: projectName.trim() || 'Untitled project',
      status: projectStatus,
      description: projectDescription,
      sourceName: 'WoodCut Studio project workspace',
      sourceMaterialStockId: selectedMaterialId,
      supplyRequirements,
      toolRequirements,
      buildPlan,
      costItems,
      budget,
      now,
    });
    const result = upsertStoredProject(record, savedProjects);

    if (!result.saved) {
      setSaveError('The project could not be saved in this browser. Check local storage permissions and try again.');
      return;
    }

    setSavedProjects(result.projects);
    setProjectId(record.project.id);
    setRevisionId(record.project.activeRevisionId);
    setProjectName(record.project.name);
    setLastSavedAt(record.project.updatedAt);
    setIsDirty(false);
    setSaveError('');
  };

  const handleOpenProject = (record) => {
    if (!canReplaceProject()) return;

    try {
      const session = toWoodCutSession(record);
      setProjectId(record.project.id);
      setRevisionId(record.project.activeRevisionId);
      setProjectName(record.project.name);
      setProjectStatus(record.project.status ?? 'planning');
      setProjectDescription(record.project.description ?? '');
      setLastSavedAt(record.project.updatedAt ?? null);
      setUnit(session.unit);
      setStock(session.stock);
      setParts(session.parts);
      setSelectedMaterialId(record.cutStock?.sourceMaterialStockId ?? null);
      setSupplyRequirements(record.supplyRequirements ?? []);
      setToolRequirements(record.toolRequirements ?? []);
      setBuildPlan(record.buildMethods?.[0] ?? null);
      setCostItems(record.costItems ?? []);
      setBudget(record.project.budget ?? null);
      setStrategy(session.strategy ?? STRATEGIES.BSSF);
      setCutPreference(session.cutPreference ?? CUT_PREFERENCES.RIP_FIRST);
      setIsDirty(false);
      setSaveError('');
      setIsProjectsOpen(false);
    } catch {
      setSaveError('This project could not be opened because its saved data is invalid.');
    }
  };

  const handleCreateProject = () => {
    if (!canReplaceProject()) return;

    const preset = PROJECT_PRESETS[0];
    setProjectId(createProjectId());
    setRevisionId(null);
    setProjectName('Untitled project');
    setProjectStatus('idea');
    setProjectDescription('');
    setLastSavedAt(null);
    setUnit(UNITS.MM);
    setStock({ ...preset.stock });
    setParts([]);
    setSelectedMaterialId(null);
    setSupplyRequirements([]);
    setToolRequirements([]);
      setBuildPlan(null);
      setCostItems([]);
      setBudget(null);
      setStrategy(STRATEGIES.BSSF);
    setCutPreference(CUT_PREFERENCES.RIP_FIRST);
    setIsDirty(true);
    setSaveError('');
    setIsProjectsOpen(false);
  };

  const handleDuplicateProject = (record) => {
    if (!canReplaceProject()) return;

    try {
      const session = toWoodCutSession(record);
      const now = new Date().toISOString();
      const duplicateProjectId = createProjectId();
      const duplicate = createBenchMateProjectFromWoodCut(session, {
        projectId: duplicateProjectId,
        name: `${record.project.name} (Copy)`,
        status: 'planning',
        description: record.project.description ?? '',
        sourceName: 'WoodCut Studio project duplicate',
        sourceMaterialStockId: record.cutStock?.sourceMaterialStockId ?? null,
        supplyRequirements: (record.supplyRequirements ?? []).map(requirement => ({
          ...requirement,
          id: undefined,
          projectId: undefined,
        })),
        toolRequirements: (record.toolRequirements ?? []).map(requirement => ({
          ...requirement,
          id: undefined,
          projectId: undefined,
        })),
        buildPlan: cloneBuildPlan(record.buildMethods?.[0], duplicateProjectId, { now }),
        costItems: (record.costItems ?? []).map(item => ({
          ...item,
          id: undefined,
          projectId: undefined,
        })),
        budget: record.project.budget ?? null,
        now,
      });
      const result = upsertStoredProject(duplicate, savedProjects);

      if (!result.saved) {
        window.alert('The duplicate could not be saved in this browser.');
        return;
      }

      setSavedProjects(result.projects);
      setProjectId(duplicate.project.id);
      setRevisionId(duplicate.project.activeRevisionId);
      setProjectName(duplicate.project.name);
      setProjectStatus(duplicate.project.status);
      setProjectDescription(duplicate.project.description);
      setLastSavedAt(duplicate.project.updatedAt);
      setUnit(session.unit);
      setStock(session.stock);
      setParts(session.parts);
      setSelectedMaterialId(record.cutStock?.sourceMaterialStockId ?? null);
      setSupplyRequirements(duplicate.supplyRequirements ?? []);
      setToolRequirements(duplicate.toolRequirements ?? []);
      setBuildPlan(duplicate.buildMethods?.[0] ?? null);
      setCostItems(duplicate.costItems ?? []);
      setBudget(duplicate.project.budget ?? null);
      setStrategy(session.strategy ?? STRATEGIES.BSSF);
      setCutPreference(session.cutPreference ?? CUT_PREFERENCES.RIP_FIRST);
      setIsDirty(false);
      setSaveError('');
      setIsProjectsOpen(false);
    } catch {
      window.alert('The project could not be duplicated because its saved data is invalid.');
    }
  };

  const handleArchiveProject = (record) => {
    const archivedAt = new Date().toISOString();
    const archived = {
      ...record,
      project: {
        ...record.project,
        archivedAt,
        updatedAt: archivedAt,
      },
    };
    const nextProjects = savedProjects.map(candidate => (
      candidate.project.id === record.project.id ? archived : candidate
    ));

    if (!saveStoredProjects(nextProjects)) {
      window.alert('The project could not be archived in this browser.');
      return;
    }

    setSavedProjects(nextProjects);
  };

  const handleRestoreProject = (record) => {
    const restored = {
      ...record,
      project: {
        ...record.project,
        archivedAt: null,
        updatedAt: new Date().toISOString(),
      },
    };
    const nextProjects = savedProjects.map(candidate => (
      candidate.project.id === record.project.id ? restored : candidate
    ));

    if (!saveStoredProjects(nextProjects)) {
      window.alert('The project could not be restored in this browser.');
      return;
    }

    setSavedProjects(nextProjects);
  };

  const handleSaveMaterial = (input, existingMaterial) => {
    try {
      const material = existingMaterial
        ? updateMaterialStock(existingMaterial, input)
        : createMaterialStock(input);
      const result = upsertStoredMaterial(material, materials);

      if (!result.saved) {
        return { saved: false, error: result.error || 'The material could not be saved in this browser.' };
      }

      setMaterials(result.materials);
      if (selectedMaterialId === material.id && !stockSizeMatchesMaterial(material, stock, unit)) {
        setSelectedMaterialId(null);
      }
      return { saved: true, error: '' };
    } catch (error) {
      return { saved: false, error: error.message };
    }
  };

  const handleDeleteMaterial = (material) => {
    const result = removeStoredMaterial(material.id, materials);
    if (!result.saved) {
      return { saved: false, error: 'The material could not be removed in this browser.' };
    }

    setMaterials(result.materials);
    if (selectedMaterialId === material.id) setSelectedMaterialId(null);
    return { saved: true, error: '' };
  };

  const handleSaveSupply = (input, existingSupply) => {
    try {
      const supply = existingSupply
        ? updateSupply(existingSupply, input)
        : createSupply(input);
      const result = upsertStoredSupply(supply, supplies);

      if (!result.saved) {
        return { saved: false, error: result.error || 'The supply could not be saved in this browser.' };
      }

      setSupplies(result.supplies);
      return { saved: true, error: '' };
    } catch (error) {
      return { saved: false, error: error.message };
    }
  };

  const handleCreateSupplyFromCostItem = (item) => {
    try {
      const category = SUPPLY_CATEGORIES.some(option => option.value === item.category)
        ? item.category
        : 'consumable';
      const unit = SUPPLY_UNITS.some(option => option.value === item.unit)
        ? item.unit
        : 'other';
      const source = item.status === 'owned' ? 'owned' : 'planned';
      const notes = [
        item.supplier ? 'Supplier: ' + item.supplier : '',
        item.notes || '',
      ].filter(Boolean).join('\n');
      const supply = createSupply({
        category,
        name: item.name,
        reference: item.productReference,
        unit,
        quantity: item.quantity,
        source,
        notes,
        lastCheckedAt: item.checkedAt,
      });
      const result = upsertStoredSupply(supply, supplies);

      if (!result.saved) {
        return {
          saved: false,
          error: result.error || 'The supply could not be added to inventory.',
        };
      }

      setSupplies(result.supplies);
      return {
        saved: true,
        error: '',
        inventoryLink: { type: 'supply', id: supply.id },
      };
    } catch (error) {
      return { saved: false, error: error.message };
    }
  };

  const handleDeleteSupply = (supply) => {
    const result = removeStoredSupply(supply.id, supplies);
    if (!result.saved) {
      return { saved: false, error: 'The supply could not be removed in this browser.' };
    }

    setSupplies(result.supplies);
    return { saved: true, error: '' };
  };

  const handleSupplyRequirementsChange = (nextRequirements) => {
    setSupplyRequirements(nextRequirements);
    markDirty();
  };

  const handleToolRequirementsChange = (nextRequirements) => {
    setToolRequirements(nextRequirements);
    markDirty();
  };

  const handleBuildPlanChange = (nextPlan) => {
    setBuildPlan(nextPlan);
    markDirty();
  };

  const handleCostItemsChange = (nextItems) => {
    setCostItems(nextItems);
    markDirty();
  };

  const handleBudgetChange = (nextBudget) => {
    try {
      setBudget(createProjectBudget(nextBudget));
      markDirty();
    } catch (error) {
      setSaveError(error.message);
    }
  };

  const handleSaveTool = (input, existingTool) => {
    try {
      const tool = existingTool ? updateTool(existingTool, input) : createTool(input);
      const result = upsertStoredTool(tool, tools);
      if (!result.saved) {
        return { saved: false, error: result.error || 'The tool could not be saved in this browser.' };
      }

      setTools(result.tools);
      return { saved: true, error: '' };
    } catch (error) {
      return { saved: false, error: error.message };
    }
  };

  const handleDeleteTool = (tool) => {
    const result = removeStoredTool(tool.id, tools);
    if (!result.saved) {
      return { saved: false, error: 'The tool could not be removed in this browser.' };
    }

    setTools(result.tools);
    return { saved: true, error: '' };
  };

  const handleReserveSelectedMaterial = () => {
    const currentMaterial = materials.find(material => material.id === selectedMaterialId) ?? null;
    const requiredQuantity = optimizationResult?.totalSheetsCount ?? 0;
    if (!currentMaterial) {
      return { saved: false, error: 'Select an inventory material before reserving stock.' };
    }
    if (requiredQuantity <= 0) {
      return { saved: false, error: 'Add valid cut-list parts before reserving stock.' };
    }

    const existingReservation = getProjectReservation(currentMaterial, projectId);
    const additionalQuantity = requiredQuantity - (existingReservation?.quantity ?? 0);
    if (additionalQuantity <= 0) return { saved: true, error: '' };

    try {
      const reservedMaterial = reserveMaterialStock(
        currentMaterial,
        projectId,
        additionalQuantity,
      );
      const result = upsertStoredMaterial(reservedMaterial, materials);
      if (!result.saved) {
        return { saved: false, error: 'The reservation could not be saved in this browser.' };
      }
      setMaterials(result.materials);
      return { saved: true, error: '' };
    } catch (error) {
      return { saved: false, error: error.message };
    }
  };

  const handleReleaseSelectedMaterial = () => {
    const currentMaterial = materials.find(material => material.id === selectedMaterialId) ?? null;
    if (!currentMaterial) {
      return { saved: false, error: 'The selected inventory material is no longer available.' };
    }

    try {
      const releasedMaterial = releaseMaterialStock(currentMaterial, projectId);
      const result = upsertStoredMaterial(releasedMaterial, materials);
      if (!result.saved) {
        return { saved: false, error: 'The reservation could not be released in this browser.' };
      }
      setMaterials(result.materials);
      return { saved: true, error: '' };
    } catch (error) {
      return { saved: false, error: error.message };
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    let csvContent = `data:text/csv;charset=utf-8,Part Name,Width (${unit}),Length (${unit}),Quantity,Allow Rotation,Color\n`;
    parts.forEach(p => {
      csvContent += `"${p.name}",${p.width},${p.height},${p.qty},${p.allowRotation ? 'Yes' : 'No'},${p.color}\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `wood_cut_list_${unit}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => window.print();

  const handleClearAll = () => {
    if (window.confirm('Clear all cut list parts?')) {
      setParts([]);
      markDirty();
    }
  };

  const totalRequestedPartsCount = parts.reduce((sum, p) => sum + (parseInt(p.qty) || 0), 0);

  if (isUserGuideOpen) {
    return (
      <div className="ws-shell">
        <Sidebar
          activeSection="user-guide"
          projectName={projectName}
          onNavigate={handleSidebarNavigate}
        />
        <UserGuide projectName={projectName} />
      </div>
    );
  }

  if (isProjectsOpen) {
    return (
      <div className="ws-shell">
        <Sidebar
          activeSection="projects"
          projectName={projectName}
          onNavigate={handleSidebarNavigate}
        />
        <ProjectDashboard
          projects={savedProjects}
          onCreate={handleCreateProject}
          onOpen={handleOpenProject}
          onDuplicate={handleDuplicateProject}
          onArchive={handleArchiveProject}
          onRestore={handleRestoreProject}
          onSaveProject={handleSaveProject}
          isDirty={isDirty}
          workspace={{
            name: projectName,
            status: projectStatus,
            description: projectDescription,
            isDirty,
            lastSavedAt,
            saveError,
            onNameChange: value => {
              setProjectName(value);
              markDirty();
            },
            onStatusChange: value => {
              setProjectStatus(value);
              markDirty();
            },
            onDescriptionChange: value => {
              setProjectDescription(value);
              markDirty();
            },
            parts,
            materials,
            unit,
            selectedMaterialId,
            requiredStockQuantity: optimizationResult?.totalSheetsCount ?? 0,
            projectId,
            supplyRequirements,
            supplies,
            onSupplyRequirementsChange: handleSupplyRequirementsChange,
            toolRequirements,
            tools,
            onToolRequirementsChange: handleToolRequirementsChange,
          }}
        />
      </div>
    );
  }

  if (isInventoryOpen) {
    return (
      <div className="ws-shell">
        <Sidebar
          activeSection="inventory"
          projectName={projectName}
          onNavigate={handleSidebarNavigate}
        />
        {isSuppliesOpen ? (
          <SupplyInventory
            supplies={supplies}
            onSaveSupply={handleSaveSupply}
            onDeleteSupply={handleDeleteSupply}
            onOpenMaterials={handleOpenMaterials}
          />
        ) : (
          <MaterialInventory
            materials={materials}
            parts={parts}
            unit={unit}
            selectedMaterialId={selectedMaterialId}
            onSaveMaterial={handleSaveMaterial}
            onDeleteMaterial={handleDeleteMaterial}
            onUseMaterial={handleUseMaterial}
            onOpenSupplies={handleOpenSupplies}
          />
        )}
      </div>
    );
  }

  if (isCostingOpen) {
    return (
      <div className="ws-shell">
        <Sidebar
          activeSection="costing"
          projectName={projectName}
          onNavigate={handleSidebarNavigate}
        />
        <Costing
          projectId={projectId}
          projectName={projectName}
          costItems={costItems}
          budget={budget}
          materials={materials}
          supplies={supplies}
          onChange={handleCostItemsChange}
          onBudgetChange={handleBudgetChange}
          onSaveProject={handleSaveProject}
          isDirty={isDirty}
          onCreateSupply={handleCreateSupplyFromCostItem}
          onOpenInventory={handleOpenInventory}
          onPrint={handlePrint}
        />
      </div>
    );
  }

  if (isBuildPlannerOpen) {
    return (
      <div className="ws-shell">
        <Sidebar
          activeSection="build-planner"
          projectName={projectName}
          onNavigate={handleSidebarNavigate}
        />
        <BuildPlanner
          projectId={projectId}
          projectName={projectName}
          buildPlan={buildPlan}
          parts={parts}
          materials={materials}
          unit={unit}
          selectedMaterialId={selectedMaterialId}
          requiredStockQuantity={optimizationResult?.totalSheetsCount ?? 0}
          toolRequirements={toolRequirements}
          tools={tools}
          supplyRequirements={supplyRequirements}
          supplies={supplies}
          onChange={handleBuildPlanChange}
          onSaveProject={handleSaveProject}
          isDirty={isDirty}
        />
      </div>
    );
  }

  if (isWorkshopOpen) {
    return (
      <div className="ws-shell">
        <Sidebar
          activeSection="workshop"
          projectName={projectName}
          onNavigate={handleSidebarNavigate}
        />
          <ToolInventory
            tools={tools}
            onSaveTool={handleSaveTool}
            onDeleteTool={handleDeleteTool}
            cutResult={optimizationResult}
            cutUnit={unit}
            buildPlan={buildPlan}
            parts={parts}
            materials={materials}
            unit={unit}
            selectedMaterialId={selectedMaterialId}
            requiredStockQuantity={optimizationResult?.totalSheetsCount ?? 0}
            toolRequirements={toolRequirements}
            supplyRequirements={supplyRequirements}
            supplies={supplies}
            onBuildPlanChange={handleBuildPlanChange}
          />
      </div>
    );
  }

  return (
    <div className="ws-shell">

      <Sidebar
        activeSection="optimizer"
        projectName={projectName}
        onNavigate={handleSidebarNavigate}
      />

      {/* ── Main scrollable area ── */}
      <main className="ws-main">

        {/* Workspace content */}
        <div className="ws-content ws-optimizer-content">

          <Header
            onOpenPresets={() => setIsPresetsOpen(true)}
            onSaveProject={handleSaveProject}
            isDirty={isDirty}
            onExportCSV={handleExportCSV}
            onPrint={handlePrint}
            onClearAll={handleClearAll}
          />

          {/* Metric Cards Row */}
          <div className="no-print">
            <SummaryStats
              result={optimizationResult}
              totalRequestedParts={totalRequestedPartsCount}
            />
          </div>

          {/* Main Workspace Grid */}
          <div className="ws-workspace-grid">

            {/* Left: inputs column */}
            <div className="ws-inputs-col no-print">
              <SheetSettings
                stock={stock}
                onStockChange={handleStockChange}
                unit={unit}
                onUnitChange={handleUnitChange}
                strategy={strategy}
                onStrategyChange={handleStrategyChange}
                cutPreference={cutPreference}
                onCutPreferenceChange={handleCutPreferenceChange}
                selectedMaterial={selectedMaterial}
                hasMaterialMappings={parts.length > 0 && parts.every(part => (
                  part.materialRequirementId || part.material || part.materialName
                ))}
                requiredStockQuantity={optimizationResult?.totalSheetsCount ?? 0}
                projectReservation={getProjectReservation(selectedMaterial, projectId)}
                onReserveMaterial={handleReserveSelectedMaterial}
                onReleaseMaterial={handleReleaseSelectedMaterial}
              />
              <CutListInput
                parts={parts}
                onPartsChange={handlePartsChange}
                unit={unit}
              />
            </div>

            {/* Right: Visualizer */}
            <div>
              <Visualizer
                result={optimizationResult}
                unit={unit}
                stock={stock}
              />
            </div>

          </div>

          {/* Cut Sequence preview; the complete sequence lives in Workshop. */}
          <CutSequence
            result={optimizationResult}
            unit={unit}
            preview
            onOpenWorkshop={handleOpenWorkshop}
          />

        </div>

        {/* Footer */}
        <footer className="ws-footer no-print">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--ws-space-md)' }}>
            <span className="ws-footer-brand">WoodCut Studio</span>
            <span style={{ color: 'var(--ws-outline-variant)' }}>|</span>
            <span className="ws-footer-copy">© 2024 · Precision Workshop Tools</span>
          </div>
          <div style={{ display: 'flex', gap: 'var(--ws-space-lg)' }}>
            {['Privacy', 'Terms', 'Docs'].map(l => (
              <a key={l} href="#" style={{ fontFamily: 'var(--ws-font-mono)', fontSize: '12px', color: 'var(--ws-outline)', textDecoration: 'none' }}
                onMouseEnter={e => e.target.style.color = 'var(--ws-primary)'}
                onMouseLeave={e => e.target.style.color = 'var(--ws-outline)'}>
                {l}
              </a>
            ))}
          </div>
        </footer>

      </main>

      {/* Presets Modal */}
      <PresetsModal
        isOpen={isPresetsOpen}
        onClose={() => setIsPresetsOpen(false)}
        onLoadPreset={handleLoadPreset}
      />

    </div>
  );
}
