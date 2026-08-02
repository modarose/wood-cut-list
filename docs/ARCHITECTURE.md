# BenchMate Architecture

**Status:** Incremental Phase 3 build-planner slice implemented
**Foundation:** Existing WoodCut Studio application

## 1. Architectural decision

BenchMate will be built by extending the existing WoodCut Studio project. It is not a copied second application.

The current WoodCut Studio experience should remain usable while new BenchMate modules are added around it.

## 2. Conceptual layers

```text
Presentation layer
  Project dashboard, cut list, inventory, costing, build mode, journal

Application layer
  Project workflows, import review, readiness checks, reservations, revisions

Domain layer
  Parts, materials, tools, build methods, calculations, validation, costing rules

Integration layer
  WoodCut adapter, SketchUp bridge, Bunnings connector, future suppliers

Persistence layer
  Local project storage first; server/cloud persistence later if required
```

## 3. Suggested feature boundaries

The exact directory names should follow the existing repository after inspection. Conceptually, the application should move towards boundaries like:

```text
src/
├── app/
├── features/
│   ├── projects/
│   ├── designs/
│   ├── cutlist/          # Existing WoodCut Studio capability
│   ├── inventory/
│   │   ├── tools/
│   │   └── materials/
│   ├── build-planner/
│   ├── costing/
│   ├── journal/
│   └── creator-mode/
├── domain/
│   ├── project/
│   ├── parts/
│   ├── inventory/
│   └── validation/
├── integrations/
│   ├── woodcut-studio/
│   ├── sketchup/
│   └── suppliers/
└── shared/
```

This is a target, not a requirement to reorganise the repository immediately.

## 4. WoodCut Studio boundary

WoodCut Studio should own:

- Part dimensions and quantities.
- Stock selection inputs.
- Kerf, trim and waste settings.
- Board or sheet optimisation.
- Cutting layouts and output representations.

BenchMate should own:

- Project identity and revisions.
- Tool and material inventory.
- Procurement and supplier data.
- Build methods and stages.
- Reservations and project status.
- Journal and creator workflows.

The two areas communicate through a stable parts and stock contract. Avoid duplicating cut calculations in project UI components.

## 5. Recommended data flow

```text
Manual input or SketchUp manifest
        ↓
Import normalisation and validation
        ↓
Project revision
        ↓
Parts and material mapping
        ↓
WoodCut optimisation
        ↓
Inventory reservation and procurement gap
        ↓
Tool feasibility and build plan
        ↓
Workshop execution and journal
```

Every imported design should pass through a review state before it can overwrite an approved project revision.

## 6. Import normalisation

All sources should be converted into the canonical model described in `DATA_MODEL.md`.

The normaliser should:

- Convert dimensions to millimetres.
- Preserve the original source units.
- Generate stable internal IDs.
- Map materials to the user's material library.
- Record source entity IDs where available.
- Mark missing, ambiguous or unsupported values.
- Preserve the original import payload for troubleshooting.

## 7. Provider adapter pattern

Supplier integrations should implement a common internal interface rather than being embedded in costing components.

Conceptual interface:

```text
SupplierProvider
  searchProducts(query)
  getProduct(productId)
  getPrice(productId, location)
  getAvailability(productId, location)
  getLocations()
```

The UI should not need to know whether data came from Bunnings, a manual record or a future supplier.

## 8. Persistence strategy

Start with the least complex persistence that protects the user's work:

1. Use the existing WoodCut Studio persistence approach after audit.
2. Add versioned project records rather than scattered independent state.
3. Export/import project JSON early.
4. Add cloud sync or authentication only when the single-user workflow is stable.

Project data should be exportable so the user is not trapped in the application.

Phase 1 establishes browser-local persistence under the `benchmate.projects.v1` local storage key. Saved records use the canonical project envelope, invalid records are ignored when loaded, and saving is explicit from the workspace. Cloud sync, authentication and cross-device persistence remain deferred.

## 9. Server boundary

A backend or serverless function will eventually be needed for:

- Bunnings OAuth and API calls.
- Secure supplier credentials.
- Optional AI calls.
- Future cloud persistence.

Do not place Bunnings client secrets, OAuth secrets or other provider credentials in browser-delivered JavaScript.

## 10. Revision and synchronisation model

Each project may have multiple design revisions. A revision should record:

- Source type and source identifier.
- Import date.
- Source revision or file hash when available.
- Parts added, removed or changed.
- Whether the revision has been approved for cutting.

Re-import should produce a comparison rather than silently modifying an active cut list.

## 11. Error and uncertainty states

Important states should be explicit:

- `ready`
- `needs-review`
- `missing-data`
- `unsupported-geometry`
- `price-stale`
- `availability-unknown`
- `tool-missing`
- `material-missing`
- `blocked`

Avoid hiding uncertainty behind a green “ready” status.

## 12. Repository audit checklist

Before refactoring, record:

- Current framework and package manager.
- Existing application entry points.
- Existing WoodCut Studio components and services.
- Current data storage and import/export behaviour.
- Calculation functions and their consumers.
- Existing lint, test and build commands.
- Deployment and environment-variable conventions.

Only then should the target structure be mapped onto the actual repository.

## 13. Repository audit findings (2026-07-31)

The current repository is a single-page React 19 application built with Vite 8 and npm. The browser entry point is `index.html` -> `src/main.jsx` -> `src/App.jsx`. There is no router, backend, serverless function, database, authentication flow or supplier integration.

The existing WoodCut Studio boundary is:

- `src/App.jsx`: owns the active unit, stock settings, cut-list parts, strategy and UI orchestration.
- `src/components/`: owns the existing input, visualization, statistics, preset and cut-sequence presentation.
- `src/utils/cutOptimizer.js`: owns the deterministic guillotine packing calculation and cutting-layout output.
- `src/utils/unitConverter.js`: owns metric/imperial conversion and display formatting.
- `src/utils/presets.js`: owns static stock and project presets.

Current state is in-memory React state. The application supports static preset loading, CSV export and browser print/PDF output, but not project persistence or JSON import/export. The repository has `dev`, `lint`, `test`, `build` and `preview` scripts after Phase 0; the test suite uses Node's built-in test runner and adds no dependency. The README recommends Vercel, but no deployment configuration or environment-variable convention exists in the repository.

The current `main` baseline was commit `85e8b90`. Phase 0 work is being performed on the `codex/benchmate-phase0` branch. The planning documents and `AGENTS.md` were already present as untracked files before implementation.

## 14. Phase 0 adapter boundary

Phase 0 adds `src/utils/benchmateAdapter.js` without changing the existing UI or optimizer. It defines a versioned, JSON-serializable envelope:

```text
BenchMate project envelope
  project
  designRevisions[]
  parts[]
  materialRequirements[]
  materialStock[]
  cutStock
  cutSettings
```

The adapter converts the current WoodCut session into canonical millimetres and preserves the original display unit in `sourceUnit`. The legacy fields map as follows:

| WoodCut Studio | BenchMate Phase 0 |
|---|---|
| `stock.width` | `cutStock.dimensions.width` |
| `stock.height` | `cutStock.dimensions.length` |
| `stock.kerf` / `stock.margin` | `cutStock.kerf` / `cutStock.margin` |
| `part.width` | `Part.dimensions.width` |
| `part.height` | `Part.dimensions.length` |
| `part.qty` | `Part.quantity` |
| `part.allowRotation` | `Part.rotationAllowed` |
| `part.id` | `Part.sourceEntityId` plus generated stable internal ID |
| `part.color` | `Part.presentation.color` |

The current stock settings are treated as a cut-stock template, not owned inventory, because the existing application does not know stock quantity, ownership or material thickness. Missing thickness, material mapping, grain direction, units, dimensions or quantities are represented as warnings and move the revision to `needs-review`; the adapter does not invent those values. The original WoodCut payload is retained on the design revision for traceability.

`createBenchMateProjectFromWoodCut`, `toWoodCutSession`, `validateBenchMateProject`, `serializeBenchMateProject` and `parseBenchMateProject` form the initial import/export contract. A representative payload is checked in at `docs/examples/benchmate-project.json`.

## 15. Phase 1 project shell

The project shell is implemented around the existing single-page workspace without adding a router:

- The workspace loads the first active saved project when browser-local storage contains one; otherwise it opens the existing WoodCut Studio preset workflow as an unsaved draft.
- The shared desktop sidebar provides functional Optimizer, Projects, Inventory and Workshop navigation; Settings and Support remain visible as explicitly disabled future sections.
- `ProjectDetails` owns editable project name, status and notes while `Header` exposes project navigation and explicit save.
- `ProjectDashboard` provides new, open, duplicate, archive and restore actions.
- Archiving sets `project.archivedAt` and keeps the canonical record available for restoration.
- Opening and saving convert through the Phase 0 adapter, so the optimizer continues to consume the existing WoodCut session shape.

Phase 1 intentionally does not add cloud persistence, authentication, supplier data, inventory reservations or a second route tree. Historical approved-revision comparison remains a later slice; the current shell saves one active draft revision per project.

## 16. Phase 2 material inventory

The first inventory slice is a browser-local workshop collection rather than project-owned stock:

- `src/utils/materialInventory.js` owns the metric material-stock schema, validation, storage and dimensional screening matcher.
- `src/components/MaterialInventory.jsx` provides add, edit and remove workflows for sheet goods, solid timber and offcuts.
- Records are stored under `benchmate.materials.v1`, separately from project envelopes under `benchmate.projects.v1`.
- Stock records retain canonical fields for dimensions, usable dimensions, quantity, reserved quantity, source, condition, location and notes.
- Inventory quantities and reservations are validated before persistence; invalid or negative records are not silently accepted.
- An owned or planned material can be selected as the optimizer's stock template; the selection uses usable dimensions and preserves the existing kerf and margin settings.
- A selected source reference is persisted as `cutStock.sourceMaterialStockId` when the project is saved. Manual stock edits clear that source link when dimensions no longer match.
- The current cut-list check identifies potential individual owned-stock dimensional matches and reports planned-purchase candidates separately. It does not replace the existing WoodCut optimisation calculation.
- An explicit reservation action can reserve the optimizer's required sheet count against an owned material for the current project. Reservations are bounded by available quantity and can be released.

## 17. Phase 2 tool inventory

The Workshop view provides a separate browser-local tool collection:

- `src/utils/toolInventory.js` owns the tool schema, validation, capability vocabulary and storage under `benchmate.tools.v1`.
- `src/components/ToolInventory.jsx` provides add, edit, remove, search and category/availability filtering.
- Tool records preserve ownership, availability, condition, location, accessories and maintenance notes.
- Capabilities are selected from a normalised vocabulary so a future build planner can match requirements consistently.
- The inventory records workshop facts only; capability tags do not certify a safe setup or automatically approve tool substitutions.

## 18. Phase 2 project resource check

The optimizer workspace now includes a project-level resource check:

- `src/utils/projectReadiness.js` derives a deterministic summary from the existing material matcher without changing the WoodCut part or stock shapes.
- `src/components/ProjectReadiness.jsx` shows potential owned-stock candidates, planned purchase candidates, unresolved rows and rows requiring review. When a material is selected for the optimizer, it also compares that record's available quantity with `optimizationResult.totalSheetsCount`.
- The report is deliberately a dimensional screening and stock-quantity result. It does not allocate individual boards, replace cut optimisation or infer tool, hardware or finish requirements.
- Project-level tool capability requirements are now screened separately from build-step assignments; the build planner will decide which tool is used at each step later.

## 19. Phase 2 supplies inventory

Hardware, adhesives, finishes, abrasives and other workshop consumables are stored as a separate browser-local collection:

- `src/utils/supplyInventory.js` owns the validated supply schema and storage under `benchmate.supplies.v1`.
- `src/components/SupplyInventory.jsx` provides local add, edit, remove, search and category/source filtering workflows.
- Each record has an explicit category, quantity, quantity unit, source, location and optional brand/reference/notes fields.
- Quantities may be fractional for units such as litres or metres, but cannot be negative. The collection does not infer prices, supplier availability or project demand.

## 20. Phase 2 project supply requirements

Project supply requirements are stored inside the canonical project envelope rather than as a second global inventory collection:

- `src/utils/supplyRequirements.js` owns the validated requirement schema and deterministic matcher.
- `src/components/ProjectSupplyRequirements.jsx` provides add, edit and remove controls inside the existing `ProjectReadiness` panel.
- A requirement records a project ID, category, name, optional reference, explicit unit, positive quantity and notes.
- Matching is exact by category, normalised name and unit. When a requirement includes a reference, the inventory reference must also match; fuzzy substitutions are not inferred.
- Owned and planned quantities are reported separately. A report does not consume, reserve, price or certify that a supply is suitable.

## 21. Phase 2 project tool requirements

Project tool requirements use the normalised capability vocabulary from the workshop tool inventory:

- `src/utils/toolRequirements.js` owns the validated capability requirement schema and deterministic feasibility matcher.
- `src/components/ProjectToolRequirements.jsx` provides add, edit and remove controls inside the existing `ProjectReadiness` panel.
- A requirement records a project ID, one capability, a positive integer quantity and optional notes.
- A tool is counted as ready only when it is owned, marked available, and not marked damaged or unknown condition. Maintenance, unavailable, non-owned and uncertain tools remain visible as review candidates.
- The screen does not allocate the same tool across steps, assign a tool to a cut, or certify a safe workshop setup.

## 22. Phase 3 build planner

The first build-planner slice extends the existing single-page shell rather than creating a second application or route tree:

- `src/utils/buildPlanner.js` owns the validated build-plan model, stage/step operations, dependency-cycle checks and derived progress summary.
- `src/components/BuildPlanner.jsx` provides the saved stages and steps workspace from the sidebar.
- The project envelope stores the current plan in `buildMethods[]` and references it through `project.buildMethodIds`.
- A step may reference existing `Part` IDs, `ToolRequirement` IDs and `SupplyRequirement` IDs. It does not copy inventory records or claim that a resource is allocated.
- Plan status is derived from step status: a draft has no completed or active work, an in-progress plan has started work, and a complete plan has all steps complete.
- Dependencies are validated as a directed acyclic graph. Progress reports identify incomplete dependencies, but do not schedule work automatically.

This slice deliberately leaves automatic method generation, step-level tool allocation, full material readiness, costing and large-control workshop mode for later work. Safety notes are user-authored reminders and never replace tool manuals, training or supervision.
