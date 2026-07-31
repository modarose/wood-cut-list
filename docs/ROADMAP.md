# BenchMate Roadmap

**Foundation:** Existing WoodCut Studio application  
**Roadmap status:** Phase 0 foundation implemented  
**Date:** 2026-07-31

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
