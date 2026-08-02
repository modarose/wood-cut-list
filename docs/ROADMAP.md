# BenchMate Roadmap

**Foundation:** Existing WoodCut Studio application  
**Roadmap status:** Phase 3 build-planner initial slice in progress
**Date:** 2026-08-02

## Product strategy

Build the smallest useful workshop planner around the existing WoodCut Studio engine. Validate the project and inventory workflow before investing in external integrations.

## Phase 0 — Repository audit and foundation

### Objectives

- Understand the current WoodCut Studio implementation.
- Preserve a known-good baseline.
- Define the adapter boundary around the existing cut-list logic.
- Confirm available scripts and verification commands.

### Deliverables

- Repository audit notes.
- Baseline Git tag or branch.
- Canonical project/parts schema.
- Initial import/export format.
- Updated architecture documentation.

### Exit criteria

- Existing cut-list workflow works unchanged.
- Codex can start from the repository and read the project rules.
- A sample project can be represented in the new schema.

### Phase 0 implementation notes

- The baseline branch is `codex/benchmate-phase0`.
- The canonical project envelope and WoodCut adapter are implemented in `src/utils/benchmateAdapter.js`.
- JSON serialization/parsing and validation are covered by the repository's dependency-free Node test suite.
- A representative review-state payload is checked in at `docs/examples/benchmate-project.json`.
- The existing WoodCut Studio UI and optimisation algorithm remain unchanged.

### Phase 1 implementation notes

- The existing WoodCut workspace remains the default working view.
- `ProjectDashboard` provides new, open, duplicate, archive and restore actions.
- `ProjectDetails` provides project name, status and notes editing.
- Explicit save/reopen uses the canonical envelope in browser-local storage.
- The restored desktop sidebar connects the Optimizer, Projects and Inventory views while clearly marking future modules as unavailable.
- The shell currently persists one active draft revision per project; revision comparison and approval history remain future work.

## Phase 1 — BenchMate project shell

### Objectives

- Add project creation and project dashboard features.
- Wrap the existing WoodCut Studio workflow in a project record.
- Add project status, notes and save/reopen behaviour.

### Deliverables

- Project list.
- Project detail view.
- Project metadata.
- Project status.
- Existing cut-list view accessible from a project.

### Exit criteria

- A user can create, reopen, duplicate and archive a project.
- Existing WoodCut Studio functionality can be used from that project.

## Phase 2 — Workshop inventory

### Objectives

- Record tools and their capabilities.
- Record boards, sheets, offcuts and consumables.
- Compare project requirements against owned inventory.

### Deliverables

- Tool inventory.
- Material inventory.
- Hardware and finish inventory.
- Missing-item report.
- Inventory reservation model.

### Exit criteria

- The app can show what the user already has and what is missing for a sample project.
- Existing stock can be selected as an input to the cut-list workflow.

### Phase 2 implementation notes

- Material, tool and supplies inventory are the first Phase 2 vertical slices; project-specific supply requirements now extend the same project resource check.
- `MaterialInventory` supports local add, edit and remove workflows for sheet goods, solid timber and offcuts.
- Inventory records use metric dimensions and persist under `benchmate.materials.v1`.
- Owned or planned records can be selected as the optimizer stock template; the selected source is retained when the project is saved.
- Owned stock can be explicitly reserved for the current project's calculated sheet requirement, with bounded quantity and release support.
- The current cut-list check reports potential owned-stock dimensional candidates and planned-purchase candidates separately. It does not claim board allocation or optimisation results.
- The optimizer now shows a project-level resource check that reuses the material matcher, separates owned candidates, planned purchases, unresolved parts and review rows, and compares the selected stock record's available quantity with the optimizer's required sheet count. It remains dimensional screening plus a stock-quantity check for materials.
- `ToolInventory` supports local add, edit, remove, search and category/availability filtering under `benchmate.tools.v1`.
- Tool capabilities use a normalised vocabulary for future build-step matching; the records do not make safety or substitution claims.
- `SupplyInventory` supports local add, edit, remove, search and category/source filtering for hardware, adhesives, finishes, abrasives and other consumables under `benchmate.supplies.v1`.
- Supply quantities retain an explicit unit and are validated as non-negative numbers. Project-specific supply requirements are stored in the project envelope and matched exactly by category, name, unit and optional reference; prices, supplier availability and reservations remain deferred.
- Project tool requirements are stored in the project envelope as normalised capability needs and matched against owned available tools. Unavailable, maintenance, damaged, unknown-condition and non-owned candidates remain visible for review; the report does not assign or certify tools.

## Phase 3 — Build planner

### Objectives

- Convert an approved parts list into a practical staged build plan.
- Make tool and material dependencies visible.
- Add workshop-friendly execution mode.

### Deliverables

- Build stages and steps.
- Tool/material requirements per step.
- Dependencies and estimated duration.
- Readiness report.
- Large-control workshop mode.

### Exit criteria

- A sample project has a complete sequence from stock preparation to finishing.
- Blocked steps are clearly identified.

### Phase 3 initial implementation notes

- `BuildPlanner` is available from the desktop sidebar and is saved as `buildMethods[]` inside the existing project envelope.
- The first slice supports user-authored stages, ordered steps, dependencies, work and wait durations, notes, safety reminders and completion status.
- Steps can reference existing cut-list parts, project tool requirements and project supply requirements without duplicating inventory records.
- Dependency progress is derived deterministically; a step waiting on an incomplete dependency is shown as blocked or not yet ready.
- Automatic build-method generation, step-level tool allocation, full resource readiness and large-control workshop mode remain future work.

## Phase 4 — Costing and manual suppliers

### Objectives

- Produce a realistic estimate before live supplier integrations.
- Support manual supplier items and product links.
- Include glue, finish, abrasives and consumables.

### Deliverables

- Bill of materials.
- Manual product records.
- Cost summary.
- Shopping list.
- Price source and checked-at fields.

### Exit criteria

- A project can produce a transparent estimate and purchase list without relying on external APIs.

## Phase 5 — Bunnings integration

### Objectives

- Connect approved product, pricing, location and inventory APIs.
- Keep authentication server-side.
- Provide store-aware price and availability snapshots.

### Deliverables

- Bunnings provider adapter.
- OAuth token handling.
- Product mapping to hardware/material requirements.
- Store selection.
- Cached snapshots and stale-data handling.

### Exit criteria

- The connector works in the approved environment.
- API failure or unavailable access falls back gracefully to manual product records.

## Phase 6 — SketchUp Desktop bridge

### Objectives

- Send structured design information from SketchUp to BenchMate.
- Reduce manual re-entry without claiming perfect geometry interpretation.

### Deliverables

- SketchUp extension proof of concept.
- BenchMate component naming/metadata convention.
- JSON manifest export.
- Import review and warning screen.
- Revision comparison.

### Exit criteria

- A conventionally modelled sample project imports with correct parts, dimensions and materials.
- Unsupported or ambiguous components are flagged.

## Phase 7 — Advanced integrations and creator workflow

Potential work:

- Trimble Connect integration for cloud-hosted models.
- Additional Australian supplier adapters.
- Printable cut labels and build sheets.
- Photo-based progress journal.
- YouTube project outline and shot list.
- Project templates based on previous builds.
- Better offcut reuse and material optimisation across projects.

## MVP definition

The MVP should be reached by the end of Phase 4:

- Existing WoodCut Studio still works.
- Projects can be saved and reopened.
- Tools and materials can be recorded.
- The planner identifies missing resources.
- A build sequence can be created.
- A transparent cost estimate and shopping list can be exported.

## Explicitly deferred

- Public social network.
- Marketplace for third-party SketchUp models.
- Automatic ordering or checkout.
- Multi-user permissions.
- Full arbitrary-geometry cut-list extraction.
- Mobile-native applications.
