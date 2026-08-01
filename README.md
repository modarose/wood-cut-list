# BenchMate

BenchMate is a local-first woodworking project and workshop planner built around the existing WoodCut Studio cut-list engine.

WoodCut Studio remains the specialised 2D cut-list and sheet-optimisation capability. BenchMate adds the surrounding project, material inventory, tool inventory, build-planning, costing and journaling workflows incrementally.

## Current status

Phase 2 is in progress. The current application provides:

- The WoodCut Studio optimiser.
- A project workspace with save and reopen behaviour.
- Material inventory for sheet goods, solid timber and offcuts.
- Stock selection and bounded reservations for the current project.
- Workshop tool inventory with capability and availability metadata.

The next major slice is the build planner. See the [roadmap](docs/ROADMAP.md) for the planned sequence.

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

- Sidebar navigation for Optimizer, Projects, Inventory and Workshop.
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

Capability tags are planning metadata, not safety certification or a guarantee that a substitution is suitable.

## Deferred work and current limitations

The following are planned rather than implemented:

- Hardware and finish inventory.
- Build stages, dependencies, readiness checks and workshop execution mode.
- Costing, shopping lists and manual supplier records.
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
| Projects | benchmate.projects.v1 | Written when a project is explicitly saved; the first non-archived project is reopened on application start. |
| Material inventory | benchmate.materials.v1 | Updated when materials or reservations are added, edited, removed or released. |
| Workshop tools | benchmate.tools.v1 | Updated when tools are added, edited or removed. |

Storage is specific to the browser profile and application origin. Clearing site data, changing browsers or using another device will not carry these records across. Cloud backup, account sync and project JSON import/export are not implemented yet.

## Architecture

- Framework and build tool: React 19 with Vite 8.
- Package manager: npm.
- Entry point: index.html -> src/main.jsx -> src/App.jsx.
- UI: React components in src/components and application styling in src/index.css and src/App.css.
- Calculation logic: src/utils/cutOptimizer.js and src/utils/unitConverter.js.
- BenchMate adapter and persistence: src/utils/benchmateAdapter.js, src/utils/projectStorage.js, src/utils/materialInventory.js and src/utils/toolInventory.js.
- Tests: tests/ using Node's built-in test runner.
- Routing: there is currently no router; the single-page shell switches sections through application state.

The project keeps calculation logic separate from UI components and uses a versioned canonical project envelope so the existing WoodCut session can remain the optimiser's input shape.

## Data and safety conventions

- Dimensions are stored internally in millimetres; the UI can display millimetres or inches.
- Australian dollars are the planned costing currency; costing is not implemented yet.
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

## License

No license file is currently checked in. Treat the repository as unlicensed until a license is added.
