# BenchMate / WoodCut Studio user guide

BenchMate is a local-first woodworking project planner built around the existing WoodCut Studio cut-list optimiser. WoodCut Studio calculates rectangular sheet layouts; BenchMate keeps the surrounding project, inventory, cost, build-planning and workshop information together.

This guide uses the default **Custom Bookshelf** preset so the workflow can be followed without designing a project first.

## 1. Start with the Custom Bookshelf example

On a fresh browser profile, the Optimizer opens with the Custom Bookshelf example. If an active saved project opens instead, use the Optimizer menu and select **Presets > Custom Bookshelf**. Loading a preset replaces the current Optimizer stock and part values, so save important work first.

The example contains five part types and ten pieces:

| Part | Dimensions | Quantity | Rotation |
| --- | ---: | ---: | --- |
| Side Panels | 300 x 1800 mm | 2 | Fixed |
| Top & Bottom | 300 x 840 mm | 2 | Fixed |
| Adjustable Shelves | 280 x 804 mm | 4 | Rotate |
| Kick Plate | 100 x 840 mm | 1 | Rotate |
| Plywood Backing | 840 x 1800 mm | 1 | Fixed |

The default stock setup is:

- Sheet: 1220 x 2440 mm
- Kerf: 3 mm
- Edge margin: 5 mm
- Strategy: BSSF (Best Fit)
- Cut preference: Length Rip-Cut First

The preset is an example cut list, not a complete construction specification. Confirm thickness, joinery, fixings, material grade and safe workshop methods before building.

## 2. Projects

Use **Projects** in the sidebar to keep a project and its related records together.

### Project dashboard

- **New project** creates a new project workspace.
- **Open** loads a saved project into the current workspace.
- **Duplicate** creates a separate copy to use for another design or revision.
- **Archive** removes a project from the active list without deleting it.
- **Restore** returns an archived project to the active list.
- Use the active/archived toggle to find older projects.

### Project details

Open **Project setup & readiness** in the Projects view to edit:

- Project name
- Status: Idea, Planning, Ready to buy, Building, Paused or Complete
- Project notes

Project changes show as unsaved until **Save** is used. Moving between sections keeps current in-memory edits, but a browser refresh or close can lose unsaved project changes.

## 3. Optimizer

The Optimizer is the original WoodCut Studio workflow.

### Stock Boards

Set the stock used by the calculation:

- Switch display units between **MM** and **INCHES**. Canonical project dimensions remain millimetres internally.
- Enter stock **Width**, **Length**, **Kerf** and **Margin**.
- Choose **BSSF (Best Fit)** or **BAF (Area Priority)**.
- Choose **Length Rip-Cut First** or **Width Cross-Cut First**.
- Select a common size from **Sheet Presets**.
- When a material inventory record is selected, its usable dimensions become the Optimizer stock template.

Kerf represents material removed by the blade. Margin keeps cuts away from the sheet edge. Use measurements appropriate to the actual saw, blade and stock.

### Cut Requirements

Each row represents a part type:

- Edit the part name, dimensions and quantity.
- Use the colour swatch to identify the part in diagrams.
- **Rotate** allows a 90-degree rotation; **Fixed** preserves the entered orientation for grain-sensitive parts.
- **Add Part** creates a new requirement.
- Duplicate or delete a row from its actions.

The total piece count is the sum of all quantities. A part can be dimensionally valid and still need review if its material, thickness or grain requirements are not confirmed.

### Results and diagrams

The result cards show:

- Required sheets
- Material yield
- Waste / offcuts
- Blade kerf loss
- Parts cut compared with parts requested

The SVG sheet diagrams show placed parts, rotations, cut lines and scrap regions. Use the diagram controls to zoom, pan and fit the layout. Hovering a part provides more detail.

The **Cut Sequence** gives ordered rip-cut and cross-cut instructions. The Optimizer shows a short preview; open **Workshop** for the complete sequence and check-off controls.

### Optimizer exports

Open the Optimizer menu for:

- **Export CSV**: downloads the part schedule.
- **Print / PDF**: opens the browser print dialog with the cut report. The report contains the schedule and one cut diagram per page.

## 4. Inventory

Inventory is split into material stock and workshop supplies. Inventory records are global to the browser and can be referenced by projects.

### Material inventory

Use materials for sheet goods, solid timber and offcuts.

When adding a material, record:

- Name and category
- Species or material description
- Overall length, width and thickness in millimetres
- Usable length and width
- Quantity and any existing reserved quantity
- Source: **Owned** or **Planned purchase**
- Condition, location and notes

Use **Use as stock** to apply an available material's usable dimensions to the Optimizer. The project keeps a source reference while the inventory record remains authoritative for its dimensions and quantity.

The material check is dimensional screening. It identifies potential individual stock candidates; it does not allocate every board to every part.

### Reservations

When an owned material is selected as Optimizer stock, the Stock Boards panel can reserve the required whole-sheet quantity for the current project. Reservations:

- Are available only for owned stock.
- Cannot exceed available quantity.
- Are separate from the optimiser calculation.
- Can be released when the project no longer needs them.

Planned purchase stock can be used as a planning template, but it is not stock currently owned and cannot be reserved as owned material.

### Workshop supplies

Switch to Supplies from the Inventory view to record:

- Hardware
- Adhesives
- Finishes
- Abrasives
- Other consumables

Each supply has a category, name, quantity, explicit unit, source, location and optional brand, reference, notes and last-checked date. Units can include each, pack, box, bottle, tube, litre and metre. Supplies are not priced automatically and do not infer project demand.

## 5. Project resource check

Open **Project setup & readiness** in Projects. The resource check combines the cut-list requirements with the current inventory and project requirements.

### Materials

The check separates:

- Owned dimension fits
- Planned purchase candidates
- Unresolved part types
- Rows that need review

If Optimizer stock is linked to a material, the check also compares available quantity with the calculated required sheet quantity.

### Supply requirements

Add project requirements for items such as screws, glue or finish. Matching is exact by category, name and unit. If a requirement includes a reference, the inventory reference must also match. The check reports owned, planned and missing quantities without consuming or reserving supply records.

### Tool requirements

Add project capability requirements and compare them with the tool inventory. A tool is considered ready only when it is owned, available and not marked damaged or uncertain. The check does not assign a physical tool to a step or certify a safe setup.

## 6. Costing

Costing is a manual project estimate in AUD. It records a price snapshot rather than live supplier truth.

### Add cost items

For each item, record:

- Category: sheet goods, solid timber, hardware, adhesive, finish, abrasive, consumable or other
- Name, quantity and unit
- Status: **Owned**, **Planned purchase** or **Needs sourcing**
- Optional AUD unit cost
- Supplier, product reference, URL, checked-at date and notes

The page calculates:

- **Purchase estimate** for priced non-owned items
- **Owned value** for priced owned items
- **Estimated total** combining both
- **Price review** count for shopping items without a price

The shopping list includes every planned or needs-sourcing item, including items whose price is still unknown.

### Link Costing to Inventory

Use the link button on a cost item to select a compatible material or supplies record.

- The link is a reference; it does not copy inventory or reserve stock.
- A new link adopts the Inventory source status. A planned purchase record therefore appears as Planned in Costing.
- You may deliberately override the Costing status for project-specific planning; the mismatch is shown for review.
- Use **Adopt Inventory status** to reconcile an older linked item after the Inventory source changes.
- A compatible supply can be created from Costing with **Add to supplies**. Materials must be entered deliberately in Inventory because their dimensions are required.

### Costing exports

Open Costing's **Menu** for:

- **Export CSV** with item, quantity, status, supplier, reference, checked date, prices, totals, shopping-list classification, review notes and product URL.
- **Print / PDF** with the estimate and a separate shopping-list page when purchases exist.

## 7. Build Planner

Use Build Planner to turn the bookshelf cut list into a user-authored sequence of workshop work.

1. Add stages such as Preparation, Cutting, Joinery, Assembly, Sanding and Finishing.
2. Add steps inside each stage.
3. Give each step a type, work duration, optional wait duration and status.
4. Add dependencies so later steps wait for earlier steps.
5. Link steps to cut-list parts, tool requirements and supply requirements.
6. Add notes and safety reminders.
7. Save the project to persist the plan.

The planner derives readiness from dependencies and current resource checks:

- **Ready**: current dependencies and linked resources pass the check.
- **Needs review**: a planned purchase or unresolved resource is involved.
- **Blocked**: a dependency, part, material, tool or supply is missing, or the step is user-marked blocked.
- **Complete**: the step has been completed, subject to current review conditions.

The planner does not automatically generate construction methods, allocate tools, reserve supplies or certify safety.

## 8. Workshop

Workshop contains the tool inventory and Workshop mode.

### Tool inventory

Add tools with:

- Name, category, brand and model
- Owned or reference-only status
- Availability: available, unavailable or maintenance
- Condition
- Location
- Capability tags
- Accessories
- Maintenance date and notes

Search by tool name, brand, model, location or capability. Filter by category or availability. Capability tags are planning metadata, not a guarantee that a tool or substitution is suitable for an operation.

### Workshop mode

When a saved build plan has steps, Workshop mode presents:

- The active step and its stage
- Work and wait durations
- Linked resource issues
- Ready, review, blocked and complete status
- The next actionable control: **Start this step** or **Mark step complete**

Select another step from the sequence when needed. Resolve blocked or review conditions before starting work. The complete Optimizer cut sequence appears below the tool inventory when cuts are available.

Always follow the relevant manufacturer instructions, training, supervision and safe workshop procedures.

## 9. Saving and local storage

The current application has no account, backend database or cloud synchronisation.

| Data | Storage behaviour |
| --- | --- |
| Projects, requirements, build plans and Costing records | Saved in `benchmate.projects.v1` when the project is explicitly saved |
| Material inventory and reservations | Saved in `benchmate.materials.v1` as inventory changes |
| Supplies inventory | Saved in `benchmate.supplies.v1` as inventory changes |
| Tool inventory | Saved in `benchmate.tools.v1` as inventory changes |

Records belong to the current browser profile and application origin. Clearing site data, changing browsers or using another device will not carry them across. CSV and printed reports are useful working records, but they are not a complete project backup.

## 10. Features not available yet

The following sidebar items or product areas are planned future work rather than current features:

- Settings and Support
- Supplier APIs and live store availability
- SketchUp import
- Cloud persistence, accounts and multi-device synchronisation
- Journal, photos and creator workflow
- Automatic construction-method generation and tool allocation

## Recommended Custom Bookshelf walkthrough

1. Load **Custom Bookshelf** from Optimizer presets.
2. Save the project and update its name, status and notes in Projects.
3. Review the five part types, stock size, kerf, margin, strategy and cut preference.
4. Add a plywood sheet to Material inventory with its actual dimensions, usable dimensions, quantity and source.
5. Use it as Optimizer stock and review the Project resource check, including required versus available sheets.
6. Add a supply requirement for screws or glue and a tool requirement for the operations you expect to perform.
7. Record actual tools and supplies in Inventory, then review owned, planned and missing matches.
8. Add Costing records for sheet goods, hardware and finishes; link compatible inventory and enter price snapshots.
9. Export the Costing CSV or print the estimate and shopping list.
10. Create Build Planner stages and steps, link resources and dependencies, then use Workshop mode while building.
11. Save after each meaningful planning milestone and keep the printed/CSV reports with the project notes.
