# BenchMate

BenchMate is a local-first woodworking project and workshop planner built around the existing WoodCut Studio cut-list engine.

WoodCut Studio remains the specialised 2D cut-list and sheet-optimisation capability. BenchMate adds the surrounding project, material inventory, tool inventory, build-planning, costing and journaling workflows incrementally.

## Current status

Phase 4 manual-costing work is in progress. The current application provides:

- The WoodCut Studio optimiser.
- A project workspace with save and reopen behaviour.
- Material inventory for sheet goods, solid timber and offcuts.
- Stock selection and bounded reservations for the current project.
- Workshop tool inventory with capability and availability metadata.
- Workshop supplies inventory for hardware, adhesives, finishes, abrasives and other consumables.
- Project-specific supply requirements with exact owned, planned and missing-item matching.
- Project-specific tool requirements with capability and availability feasibility matching.
- A project-level resource check separating owned-stock candidates, planned purchases, unresolved parts and review rows, with quantity checks for the selected stock record and supply requirements.
- A saved Build planner with ordered stages, steps, dependencies, durations, completion status, notes and links to project parts, tool requirements and supply requirements.
- Manual project Costing with AUD estimates, shopping lists, inventory links, CSV export and print/PDF reports.
- An in-app User Guide with a complete Custom Bookshelf walkthrough.

Phase 2 is complete at the inventory-screening level. Phase 3 build-planner work is established and Phase 4 costing is underway; broader UI improvements and deeper integrations will follow. See the [roadmap](docs/ROADMAP.md) for the planned sequence.

## What is available

### WoodCut Studio optimiser

- Deterministic 2D guillotine cut optimisation using Best Short Side First and Best Area First strategies.
- Metric and imperial display units, with dimensions represented in millimetres in the canonical data.
- Kerf and edge-margin compensation.
- Per-part grain-direction and rotation controls.
- Interactive SVG layouts with zoom, pan, fit-to-screen, part details and scrap areas.
- Workshop-oriented cut sequence instructions with check-off controls.
- Project and stock presets, CSV export, and browser print/PDF output.

### BenchMate project workspace

- Sidebar navigation for Optimizer, Projects, Inventory, Costing, Build Planner, Workshop and User Guide.
- Create, open, duplicate, archive and restore projects.
- Project name, status and notes.
- Explicit project save/reopen using the canonical BenchMate project envelope.

### Material inventory

- Record sheet goods, solid timber and offcuts.
- Store overall and usable dimensions, quantity, condition, source, location and notes.
- Use available stock as the optimiser's stock template while preserving the material reference on the project.
- Reserve and release whole-sheet quantities for the active project without allowing reservations to exceed available stock.
- Distinguish owned stock from planned purchases.

Material matching currently performs dimensional screening. It does not claim to allocate individual boards across every part or replace the cut optimiser.

### Workshop inventory

- Record tools with category, ownership, availability, condition and location.
- Add capability tags, accessories and maintenance notes.
- Search and filter the workshop collection.
- Add project-specific capability requirements and screen owned available matches.

Capability tags are planning metadata, not safety certification or a guarantee that a substitution is suitable.

### Workshop supplies

- Record hardware, adhesives, finishes, abrasives and other consumables.
- Store quantity with an explicit unit such as each, pack, bottle, sheet, metre or litre.
- Record source, location, brand, reference, notes and last-checked date.
- Search and filter records without inventing prices, supplier availability or project demand.
- Add project-specific supply requirements and compare them with exact category, name, unit and optional reference matches.

### Build planner

- Create a saved plan with ordered stages and steps.
- Record step type, work and wait time, notes and safety reminders.
- Link steps to cut-list parts, project tool requirements and supply requirements.
- Add dependencies and see which steps are ready, complete or waiting on earlier work.
- Mark step progress while keeping the plan user-authored and separate from automatic safety certification.

### Costing

- Record manual AUD price snapshots for materials, hardware, finishes and consumables.
- Link compatible cost items to material and supplies inventory without copying stock records.
- Review purchase estimate, owned value, estimated total and price-review conditions.
- Export the estimate to CSV or print a report with a separate shopping-list page.

## Deferred work and current limitations

The following are planned rather than implemented:

- Step-level tool assignment and feasibility decisions, automatic plan generation, readiness checks and workshop execution mode refinements.
- Supplier integrations, including store-aware pricing and availability.
- SketchUp import and review.
- Journal, photos and creator-workflow features.
- Authentication, cloud persistence and multi-device synchronisation.

The application currently has no backend, database, account system or supplier API integration.

## Quick start

### Prerequisites

Install Node.js 20.19 or newer, or Node.js 22.12 or newer, plus npm. These versions match the current Vite requirement.

### Install and run

From the repository root:

~~~sh
npm install
npm run dev
~~~

Open http://localhost:5173 in a browser.

### Verification and production preview

~~~sh
npm run lint
npm run test
npm run build
npm run preview
~~~

The production build is written to dist/.

## Data and persistence

Current saved data is kept in the browser's local storage. It is not stored in source files or a server-side database.

| Data | Storage key | Behaviour |
| --- | --- | --- |
| Projects, project requirements and build plans | benchmate.projects.v1 | Written when a project is explicitly saved; supply, tool and build-planner data are stored inside the project envelope; the first non-archived project is reopened on application start. |
| Material inventory | benchmate.materials.v1 | Updated when materials or reservations are added, edited, removed or released. |
| Workshop tools | benchmate.tools.v1 | Updated when tools are added, edited or removed. |
| Workshop supplies | benchmate.supplies.v1 | Updated when supplies are added, edited or removed; project requirements remain inside their saved project. |

Storage is specific to the browser profile and application origin. Clearing site data, changing browsers or using another device will not carry these records across. Cloud backup, account sync and project JSON import/export are not implemented yet.

## Architecture

- Framework and build tool: React 19 with Vite 8.
- Package manager: npm.
- Entry point: index.html -> src/main.jsx -> src/App.jsx.
- UI: React components in src/components and application styling in src/index.css and src/App.css.
- Calculation logic: src/utils/cutOptimizer.js and src/utils/unitConverter.js.
- BenchMate adapter and persistence: src/utils/benchmateAdapter.js, src/utils/projectStorage.js, src/utils/materialInventory.js, src/utils/toolInventory.js, src/utils/supplyInventory.js, src/utils/supplyRequirements.js and src/utils/buildPlanner.js.
- Tests: tests/ using Node's built-in test runner.
- Routing: there is currently no router; the single-page shell switches sections through application state.

The project keeps calculation logic separate from UI components and uses a versioned canonical project envelope so the existing WoodCut session can remain the optimiser's input shape.

## Data and safety conventions

- Dimensions are stored internally in millimetres; the UI can display millimetres or inches.
- Australian dollars are the costing currency for manual project estimates; live supplier pricing is not implemented yet.
- External supplier information will need a source and checked-at timestamp when integrations are added.
- Tool and material records describe workshop planning information. They do not replace manufacturer instructions, training, supervision or safe workshop practice.

## Deployment and environment

The app builds as a static Vite site. No deployment provider configuration or environment variables are currently required by the repository. Keep future API credentials and OAuth secrets in a server-side integration layer; they must not be placed in browser code.

## Documentation

- [BenchMate project plan](docs/BENCHMATE_PROJECT_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Data model](docs/DATA_MODEL.md)
- [Roadmap](docs/ROADMAP.md)
- [Integration notes](docs/INTEGRATIONS.md)
- [User guide](docs/USER_GUIDE.md)

## License

No license file is currently checked in. Treat the repository as unlicensed until a license is added.
