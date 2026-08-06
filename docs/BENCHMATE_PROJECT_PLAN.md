# WoodCut Studio Project Plan

**Status:** Draft foundation plan  
**Date:** 2026-07-31  
**Product:** WoodCut Studio
**Foundation:** Existing WoodCut Studio application

> Historical note: BenchMate was the early working name for the planned expansion. WoodCut Studio is the product name used throughout the application.

## 1. Product direction

WoodCut Studio is a personal woodworking project planner that connects design, cut-list optimisation, workshop inventory, material sourcing, costing and the actual build process.

The existing WoodCut Studio cut-list capability remains part of the same application.

The product should answer one practical question:

> Can I build this project with the tools and materials I have, and what exactly do I need to buy or do next?

## 2. User problem

Woodworking projects often spread information across SketchUp, handwritten notes, spreadsheets, browser tabs, supplier websites and memory. This creates avoidable friction:

- Designs do not automatically become trustworthy parts lists.
- Existing boards and offcuts are forgotten.
- Tool requirements are discovered too late.
- Hardware, glue, finish and abrasives are omitted from budgets.
- Prices and stock availability are difficult to keep current.
- Build steps, changes and lessons are not recorded consistently.

WoodCut Studio brings those decisions into one project workspace.

## 3. Goals

### Primary goals

- Preserve and strengthen the current WoodCut Studio cut-list workflow.
- Wrap cut lists in a complete project record.
- Track the user's tools, materials, hardware and finishes.
- Identify whether a design is feasible with the available workshop.
- Produce a practical build sequence and shopping list.
- Support supplier pricing and store availability, beginning with Bunnings where access permits.
- Import structured parts information from SketchUp without relying on unreliable geometry guesses.
- Work well on a workshop laptop, desktop or iPad-sized screen.

### Secondary goals

- Record build progress, photos, revisions and lessons learned.
- Reuse offcuts and leftover materials across projects.
- Generate printable build sheets and cut labels.
- Support a creator workflow for the user's woodworking channel.

## 4. Non-goals for the first release

- Replacing SketchUp as a 3D modeller.
- Automatically understanding every arbitrary SketchUp model with perfect accuracy.
- Building a public 3D Warehouse catalogue or redistributing third-party models.
- Placing orders or handling payment at Bunnings.
- Supporting every Australian supplier at launch.
- Providing professional structural engineering or safety certification.
- Adding complex team collaboration before the single-user workflow is useful.

## 5. Product structure

WoodCut Studio should be organised into focused modules:

| Module | Responsibility |
|---|---|
| Projects | Project identity, status, revisions and workspace navigation |
| Design import | Manual entry, WoodCut import and SketchUp import |
| WoodCut Studio | Parts, cut lists, stock allocation and cutting optimisation |
| Workshop inventory | Tools, accessories, consumables and maintenance information |
| Material inventory | Boards, sheets, offcuts, hardware, finishes and quantities |
| Build planner | Methods, dependencies, tool checks, stages and progress |
| Costing | Estimates, supplier products, price snapshots and shopping lists |
| Journal | Notes, photos, revisions, measurements and lessons learned |
| Creator mode | Optional build-video outline, shot list and project summary |

## 6. Core user journeys

### Journey A: Start a project manually

1. Create a project.
2. Enter the design dimensions and intended construction method.
3. Add or generate parts.
4. Select available stock from material inventory.
5. Run WoodCut Studio optimisation.
6. Review missing materials, tools and hardware.
7. Generate a build plan and shopping list.

### Journey B: Start from SketchUp

1. Model the project in SketchUp using WoodCut Studio-friendly components.
2. Export or send a structured design manifest.
3. Review imported parts and resolve warnings.
4. Map components to materials, stock and joinery methods.
5. Send the approved parts to WoodCut Studio.
6. Continue through costing, procurement and build planning.

### Journey C: Build from existing materials

1. Select a project idea or imported design.
2. Filter designs by available stock and tools.
3. Ask WoodCut Studio to identify feasible construction methods.
4. Prioritise existing boards and offcuts.
5. Show what must be purchased.
6. Adjust the design if stock or tools are insufficient.

### Journey D: Record the build

1. Start workshop mode.
2. Complete staged build steps.
3. Record measurements, changes and photos.
4. Mark material usage and leftover stock.
5. Save the final result and lessons learned.
6. Optionally generate a YouTube project outline.

## 7. Functional requirements

### Project management

- Create, rename, archive and duplicate projects.
- Track project status: idea, planning, ready to buy, building, paused, complete.
- Store target dimensions, design notes, estimated budget and target completion date.
- Support project revisions without destroying earlier cut lists.

### Parts and cut lists

- Represent each cuttable part with an ID, name, quantity and dimensions.
- Track material, thickness, grain direction, edge treatment and machining notes.
- Preserve existing WoodCut Studio calculations and cutting diagrams.
- Show parts that were imported, manually created or modified.
- Identify incomplete or ambiguous parts before optimisation.

### Workshop inventory

- Record tools and their capabilities.
- Record accessories, blades, bits, jigs and consumables.
- Record condition, location and maintenance notes.
- Allow a tool to support multiple operations.
- Allow a project to specify a preferred or required tool.

### Material inventory

- Record boards, sheet goods and offcuts with dimensions and quantity.
- Track hardware, glue, finish, abrasives and other consumables.
- Reserve stock for a project before cutting.
- Return usable leftovers to inventory after completion.
- Distinguish owned stock, planned purchases and unavailable items.

### Build planning

- Generate stages such as design, stock preparation, cutting, joinery, dry fit, glue-up, sanding, finishing and assembly.
- Attach tools, materials, parts and safety notes to each step.
- Express dependencies between steps.
- Estimate duration and waiting time, especially for glue and finish curing.
- Provide a readiness report before the build begins.

### Costing and sourcing

- Calculate required quantities and estimated cost.
- Prefer owned inventory where suitable.
- Record supplier, product ID, URL, price, unit and checked-at timestamp.
- Support manual supplier records even when an API is unavailable.
- Group purchases by supplier and store.
- Show a cost range or confidence state when prices or quantities are uncertain.

### Design import

- Accept manual, CSV, JSON and future SketchUp manifests.
- Preserve the source model and revision information.
- Present an import review screen before changing the project.
- Report missing names, dimensions, material mappings and unsupported geometry.

## 8. Product principles

- **Useful before clever:** deterministic cut lists and honest gaps matter more than flashy AI.
- **Inventory-aware:** the planner should use what the user already owns.
- **Human-reviewed:** imported designs and tool recommendations require confirmation when uncertain.
- **Provider-neutral:** Bunnings is the first supplier connector, not the only possible supplier.
- **Reversible:** design revisions, stock reservations and project changes should be undoable or auditable.
- **Workshop-friendly:** large controls, clear statuses and minimal typing while building.

## 9. AI use

AI can be useful for:

- Turning free-text project ideas into a draft project brief.
- Suggesting build stages from an approved parts list.
- Explaining missing information and asking targeted questions.
- Drafting alternative construction methods for user review.
- Generating build notes, video outlines and project descriptions.

AI should not be the source of truth for:

- Exact dimensions extracted from a design.
- Cut optimisation.
- Supplier price or stock data.
- Tool safety.
- Structural adequacy.

## 10. Technical direction

The first implementation should remain in the existing WoodCut Studio repository. New code should be added as modular features around the current cut-list workflow.

The project should eventually have:

- A canonical project and parts schema.
- A reusable cut-list calculation layer.
- A persistence layer that can begin locally and later support accounts or cloud sync.
- Provider adapters for Bunnings and future suppliers.
- A SketchUp bridge that sends structured data rather than raw geometry whenever possible.

## 11. Definition of a useful MVP

The MVP is complete when a user can:

1. Create a project.
2. Use the existing WoodCut Studio cut-list workflow.
3. Record tools and available materials.
4. See which project requirements are already satisfied.
5. See missing tools, materials and hardware.
6. Generate a staged build plan.
7. Produce a shopping list and estimated cost.
8. Save the project and reopen it without losing data.

SketchUp and live Bunnings access are valuable later milestones, but they are not required to validate the core product.

## 12. Open decisions for repository audit

Before implementation decisions are finalised, inspect the existing WoodCut Studio repository and record:

- Framework and build tool.
- Current routes and component structure.
- Existing cut-list data shape.
- Persistence approach.
- Current calculation and optimisation boundaries.
- Existing tests and lint/build commands.
- Deployment target.
- Whether a backend or serverless function already exists.

Do not answer these by assumption. Add the findings to `docs/ARCHITECTURE.md` after the audit.
