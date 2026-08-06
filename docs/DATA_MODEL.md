# WoodCut Studio Data Model

**Status:** Canonical model with Phase 4 manual costing slice
**Date:** 2026-08-03

## 1. Conventions

- Internal dimensions use millimetres.
- Currency defaults to AUD.
- Quantities are explicit and non-negative.
- Dates and timestamps use ISO 8601.
- Every persisted entity has a stable internal ID.
- External IDs are stored separately from internal IDs.
- Imported data retains its source and confidence state.

## 2. Core relationships

```text
Project
 ├── DesignRevision
 │    └── Part[]
 ├── MaterialRequirement[]
 ├── HardwareRequirement[]
 ├── FinishRequirement[]
 ├── BuildMethod[]
 │    └── BuildStep[]
 ├── InventoryReservation[]
 ├── PurchaseList[]
 └── JournalEntry[]

WorkshopInventory
 ├── Tool[]
 ├── MaterialStock[]
 ├── HardwareStock[]
 └── FinishStock[]
```

The current Phase 2 implementation uses `SupplyRequirement[]` as the generic project-level shape for hardware, adhesives, finishes, abrasives and consumables, plus `ToolRequirement[]` for normalised project capability needs. The specialised `HardwareRequirement[]` and `FinishRequirement[]` relationships remain available for future build-method detail.

## 3. Project

```json
{
  "id": "project_01",
  "name": "C-shaped sofa side table",
  "status": "planning",
  "description": "Side table built from available hardwood and sheet stock.",
  "units": "mm",
  "currency": "AUD",
  "activeRevisionId": "revision_01",
  "designRevisionIds": ["revision_01"],
  "materialRequirementIds": [],
  "hardwareRequirementIds": [],
  "finishRequirementIds": [],
  "supplyRequirementIds": [],
  "toolRequirementIds": [],
  "buildMethodIds": [],
  "costItemIds": [],
  "journalEntryIds": [],
  "createdAt": "2026-07-31T00:00:00Z",
  "updatedAt": "2026-07-31T00:00:00Z"
}
```

## 4. Design revision

```json
{
  "id": "revision_01",
  "projectId": "project_01",
  "revisionNumber": 1,
  "source": {
    "type": "manual",
    "name": "Initial plan",
    "externalId": null,
    "fileHash": null
  },
  "status": "draft",
  "partIds": ["part_01", "part_02"],
  "importedAt": "2026-07-31T00:00:00Z",
  "approvedAt": null,
  "warnings": []
}
```

Possible source types are `manual`, `woodcut-studio`, `sketchup`, `trimble-connect`, `csv` and `json`.

## 5. Part

```json
{
  "id": "part_01",
  "revisionId": "revision_01",
  "name": "Left side",
  "partCode": "SIDE_LEFT",
  "quantity": 1,
  "dimensions": {
    "length": 720,
    "width": 300,
    "thickness": 18
  },
  "shape": "rectangular",
  "materialRequirementId": "material_req_01",
  "grainDirection": "length",
  "edgeTreatment": {
    "top": "none",
    "bottom": "none",
    "left": "none",
    "right": "none"
  },
  "cutAllowance": 0,
  "machiningNotes": "Confirm final dimension after glue-up.",
  "sourceEntityId": null,
  "confidence": "confirmed",
  "status": "active"
}
```

`shape` may later include `angled`, `curved`, `irregular` or `unknown`. Non-rectangular parts should trigger a review state before optimisation.

## 6. Material requirement and stock

A requirement describes what the project needs. Stock describes what the user owns or can purchase.

```json
{
  "id": "material_req_01",
  "category": "solid-timber",
  "species": "Tasmanian oak",
  "thickness": 18,
  "requiredArea": 216000,
  "preferredGrain": "length",
  "stockSource": "owned-or-purchase",
  "status": "needs-review"
}
```

```json
{
  "id": "stock_01",
  "category": "solid-timber",
  "species": "Tasmanian oak",
  "dimensions": {
    "length": 1800,
    "width": 400,
    "thickness": 18
  },
  "quantity": 1,
  "usableLength": 1780,
  "usableWidth": 390,
  "condition": "good",
  "location": "garage-rack-a",
  "reservedQuantity": 0,
  "source": "owned",
  "notes": "Small edge defect on one end."
}
```

## 7. Tool

```json
{
  "id": "tool_01",
  "name": "Low-angle jack plane",
  "category": "hand-plane",
  "brand": "Veritas",
  "model": "Low-angle jack plane",
  "owned": true,
  "condition": "good",
  "location": "tool-cabinet-1",
  "capabilities": ["surface-flattening", "edge-jointing", "dimensioning"],
  "accessories": ["PM-V11 blade"],
  "maintenanceNotes": "Keep blade sharp and protected.",
  "lastMaintenanceAt": null
}
```

Tool capabilities should be normalised so the planner can match requirements without relying only on free-text names.

## 8. Build method and step

Build methods are the target domain relationship for a project's construction process. The first repository implementation uses the concrete `buildMethods[]` envelope described in [Phase 3 build planner](#18-phase-3-build-planner): stages and steps are stored as separate arrays, and steps reference project-level tool and supply requirements rather than copying inventory records. Production IDs must be generated consistently and validated.

## 9. Supplier product and price snapshot

```json
{
  "id": "supplier_product_01",
  "supplier": "bunnings",
  "externalItemNumber": "example-item-number",
  "name": "Example product",
  "category": "hardware",
  "url": null,
  "priceSnapshot": {
    "amount": 12.95,
    "currency": "AUD",
    "storeId": "example-store",
    "checkedAt": "2026-07-31T00:00:00Z",
    "availability": "unknown"
  }
}
```

Prices and availability must show their source and timestamp. A stale or failed lookup must not silently appear current.

## 10. Import mapping from WoodCut Studio

The first integration should use an adapter rather than a rewrite:

| Optimiser concept | Project workspace concept |
|---|---|
| Cut-list row | `Part` |
| Material/board definition | `MaterialRequirement` or `MaterialStock` |
| Optimisation input | `Part[]` plus selected stock |
| Cutting layout | WoodCut calculation result attached to revision |
| Exported CSV/JSON | Import adapter payload |

The repository audit must identify the actual existing field names before implementing this mapping.

## 11. Validation rules

- Length, width and thickness must be positive when present.
- Quantity must be a non-negative integer unless fractional material is explicitly supported.
- A part cannot be approved if required material mapping is missing.
- A cut list cannot reserve more stock than is available.
- A project cannot report “ready” if a required tool or material is unresolved.
- Imported parts with unknown units must be blocked until units are confirmed.
- Supplier prices must have a source and checked-at timestamp.
- Revisions must not mutate approved historical revisions.

## 12. Phase 0 repository envelope

The first repository integration uses a versioned JSON envelope rather than changing the existing WoodCut Studio row shape in place:

```json
{
  "schemaVersion": 1,
  "project": {},
  "designRevisions": [],
  "parts": [],
  "materialRequirements": [],
  "materialStock": [],
  "supplyRequirements": [],
  "toolRequirements": [],
  "buildMethods": [],
  "costItems": [],
  "cutStock": {},
  "cutSettings": {}
}
```

`cutStock` is deliberately separate from `materialStock`. The existing application provides a sheet template for optimisation, but does not provide ownership, available quantity or material thickness. Treating that template as inventory would invent facts.

The initial adapter maps the existing fields as follows:

| Existing field | Canonical field | Normalisation |
|---|---|---|
| `unit` | `project.units`, `sourceUnit` | Canonical storage is `mm`; original unit is retained. |
| `stock.width` | `cutStock.dimensions.width` | Converted to millimetres. |
| `stock.height` | `cutStock.dimensions.length` | Converted to millimetres. |
| `stock.kerf`, `stock.margin` | `cutStock.kerf`, `cutStock.margin` | Converted to millimetres and validated as non-negative. |
| `part.width`, `part.height` | `Part.dimensions.width`, `Part.dimensions.length` | Converted to millimetres. |
| `part.qty` | `Part.quantity` | Must be a non-negative integer; missing or invalid values become `0` with a warning. |
| `part.allowRotation` | `Part.rotationAllowed` | Preserved without claiming a specific grain direction. |
| `part.id` | `Part.sourceEntityId` | Preserved alongside a generated stable internal ID. |

The adapter emits explicit warning objects for missing thickness, material mappings, ambiguous grain direction, unsupported geometry and invalid source values. A revision with warnings remains reviewable but is not considered ready for cutting. See `src/utils/benchmateAdapter.js` and the sample payload in `docs/examples/benchmate-project.json`.

## 13. Phase 1 project shell fields

The project shell adds two workflow fields without changing the cut-list part contract:

```json
{
  "readiness": "needs-review",
  "archivedAt": null
}
```

`readiness` describes whether the current revision still has unresolved review warnings. `archivedAt` is an ISO 8601 timestamp when a project is archived, or `null`/absent while active. Archived projects remain stored and can be restored.

Project records are persisted as complete canonical envelopes in browser-local storage under the legacy `benchmate.projects.v1` key. Persistence is explicit; editing the workspace marks the draft as dirty until the user saves it.

## 14. Phase 2 material inventory

The first inventory slice uses the existing `MaterialStock` shape as a separate workshop collection. It is stored in browser-local storage under the legacy `benchmate.materials.v1` key. A project stores an optional `cutStock.sourceMaterialStockId` reference when an inventory item is selected as the optimizer stock template; the full workshop collection remains separate from the project envelope.

Each stored record includes:

```json
{
  "id": "stock_01",
  "category": "sheet-goods",
  "name": "18 mm plywood",
  "species": "Birch plywood",
  "dimensions": {
    "length": 2440,
    "width": 1220,
    "thickness": 18
  },
  "usableLength": 2440,
  "usableWidth": 1220,
  "quantity": 1,
  "reservedQuantity": 0,
  "source": "owned",
  "condition": "good",
  "location": "Garage rack A",
  "notes": ""
}
```

Dimensions are stored in millimetres. Quantity and reserved quantity must be non-negative integers, and reserved quantity cannot exceed quantity. A reservation record identifies the project and quantity that caused the reserved total; the sum of reservation records must equal `reservedQuantity`. The current material check compares each active WoodCut part against owned stock dimensions and thickness, reports planned-purchase candidates separately and flags unmatched rows. It is deliberately a screening result rather than a cutting allocation claim.

## 15. Phase 2 tool inventory

Tool records are stored separately from project envelopes in browser-local storage under the legacy `benchmate.tools.v1` key:

```json
{
  "id": "tool_track_saw_01",
  "name": "Track saw",
  "category": "saw",
  "brand": "Makita",
  "model": "SP6000",
  "owned": true,
  "availability": "available",
  "condition": "good",
  "location": "Workshop wall A",
  "capabilities": ["cross-cutting", "rip-cutting"],
  "accessories": ["Guide rail", "Dust bag"],
  "maintenanceNotes": "",
  "lastMaintenanceAt": null
}
```

Categories, availability values and capabilities are validated against the vocabulary in `src/utils/toolInventory.js`. A tool can be recorded for reference without being owned, and unavailable or maintenance states must remain visible rather than being treated as ready. Capability tags are planning metadata, not safety certification.

## 16. Phase 2 supplies inventory

Supplies are stored separately from dimensional material stock and project envelopes under the legacy `benchmate.supplies.v1` key:

```json
{
  "id": "supply_finish_01",
  "category": "finish",
  "name": "Water-based clear coat",
  "brand": "Example brand",
  "reference": "Satin",
  "unit": "litre",
  "quantity": 1.5,
  "source": "owned",
  "location": "Finish shelf",
  "notes": "",
  "lastCheckedAt": "2026-07-31"
}
```

Valid categories are hardware, adhesive, finish, abrasive and consumable. Quantities are non-negative numbers with an explicit unit so records such as screws, packs, bottles, sheets, metres and litres are not compared as if they shared a common unit. Project-specific supply requirements are stored inside the project envelope under `supplyRequirements` and referenced by `project.supplyRequirementIds`. Each requirement has an explicit category, name, unit and positive quantity, with an optional reference for exact matching. Owned and planned inventory quantities are compared separately; the matcher does not reserve, price or substitute supplies.

```json
{
  "id": "supply_requirement_01",
  "projectId": "project_01",
  "category": "hardware",
  "name": "50 mm screws",
  "reference": "coarse thread",
  "unit": "each",
  "quantity": 24,
  "notes": "Pocket-hole assembly",
  "createdAt": "2026-07-31T00:00:00Z",
  "updatedAt": "2026-07-31T00:00:00Z"
}
```

## 17. Phase 2 project tool requirements

Tool requirements are stored inside the project envelope under `toolRequirements` and referenced by `project.toolRequirementIds`:

```json
{
  "id": "tool_requirement_01",
  "projectId": "project_01",
  "capability": "cross-cutting",
  "quantity": 1,
  "notes": "A guide rail may be needed for a straight cut.",
  "createdAt": "2026-07-31T00:00:00Z",
  "updatedAt": "2026-07-31T00:00:00Z"
}
```

The matcher uses the normalised capability vocabulary from `src/utils/toolInventory.js`. Only owned tools marked available and not marked damaged or unknown condition count as covered. Other matching tools are shown as review candidates; the result is a feasibility screen rather than a step assignment or safety certification.

## 18. Phase 3 build planner

The first saved build-planner implementation stores one current plan in the project envelope. The project references it through `project.buildMethodIds`, while the complete record is held in `buildMethods[]`:

```json
{
  "id": "build_plan_01",
  "projectId": "project_01",
  "name": "Workshop build plan",
  "status": "in-progress",
  "stages": [
    {
      "id": "build_stage_01",
      "name": "Preparation",
      "sequence": 1,
      "stepIds": ["build_step_01"]
    }
  ],
  "steps": [
    {
      "id": "build_step_01",
      "stageId": "build_stage_01",
      "sequence": 1,
      "name": "Mark cut lines",
      "type": "preparation",
      "dependsOn": [],
      "partIds": ["part_01"],
      "toolRequirementIds": ["tool_requirement_01"],
      "supplyRequirementIds": [],
      "estimatedMinutes": 15,
      "waitMinutes": 0,
      "status": "in-progress",
      "notes": "Confirm dimensions against the active revision.",
      "safetyNotes": ["Verify the workpiece is supported before marking or cutting."]
    }
  ],
  "createdAt": "2026-08-02T00:00:00Z",
  "updatedAt": "2026-08-02T00:00:00Z"
}
```

The canonical step types are `preparation`, `cutting`, `joinery`, `assembly`, `sanding`, `finishing`, `waiting` and `other`. Step status values are `not-started`, `in-progress`, `blocked` and `complete`; plan status is derived from the steps. A dependency must reference another step and the dependency graph cannot contain a cycle. Part, tool-requirement and supply-requirement references are planning links only: they do not allocate inventory, assign a physical tool or certify a safe setup.

## 19. Phase 4 manual cost items

The first costing slice stores project-specific manual price snapshots inside the existing canonical envelope. The project references them through project.costItemIds and the complete records are held in costItems[]. This keeps costing attached to the project without creating a second application or pretending that a global inventory record is a current supplier quote.

Each cost item has an explicit category, quantity unit, ownership/purchase status and AUD currency:

    {
      "id": "cost_item_01",
      "projectId": "project_01",
      "category": "sheet-goods",
      "name": "18 mm plywood sheet",
      "quantity": 2,
      "unit": "sheet",
      "status": "planned",
      "unitCost": 98.5,
      "currency": "AUD",
      "supplier": "Example timber supplier",
      "productReference": "PLY-18-2440",
      "url": "https://example.com/product",
      "checkedAt": "2026-08-03",
      "notes": "Confirm grade and usable dimensions before buying.",
      "inventoryLink": {
        "type": "supply",
        "id": "supply_01"
      },
      "createdAt": "2026-08-03T00:00:00Z",
      "updatedAt": "2026-08-03T00:00:00Z"
    }

Valid categories include sheet goods, solid timber, hardware, adhesive, finish, abrasive, consumable and other. Units are explicit values such as each, sheet, pack, box, bottle, tin, tube, metre, square-metre, litre and kilogram. Status is owned, planned or missing. Quantity must be positive; unitCost may be null when a price is not known, but cannot be negative; checkedAt is the date the manual source was reviewed.

The costing summary uses known prices only. Purchase estimate sums priced planned and missing items, owned value sums priced owned items, and the shopping list contains all non-owned items. Missing items and non-owned items without a price remain visible as review conditions. Supplier, product reference and URL are source notes, not a guarantee of current price or availability.

Cost items are optional for backward compatibility, so existing schema version 1 project records remain valid. The current slice does not call supplier APIs, import live availability, reserve inventory or automatically infer cost items from optimizer output.

An optional inventoryLink points to an existing material or supply record by type and ID. The link is not a copy of that record and does not make Costing authoritative for inventory quantity, reservations, dimensions, condition or availability. Material records must be created in Inventory with their required dimensions; a compatible supply can be deliberately created from the Costing view and then linked.

When a link is created, Costing adopts the linked record's owned or planned source as its initial status. The user may deliberately override that status for project-specific planning, but the Costing view flags the mismatch so it is not mistaken for the inventory source.

Existing links can be reconciled from Costing with an explicit action that adopts the current linked Inventory source status. This updates the project cost snapshot's status only; it does not change the inventory record or reserve stock.

## 20. Phase 5 supplier snapshot metadata

Cost items may carry optional provider-neutral metadata alongside the existing manual price fields. The nested object does not replace the cost item's `supplier`, `productReference`, `unitCost` or `checkedAt` fields; it records how the snapshot was sourced and where availability was checked:

    {
      "supplierSnapshot": {
        "provider": "bunnings",
        "externalItemNumber": "1234567",
        "storeId": "store-001",
        "storeName": "Alexandria",
        "availability": "in-stock"
      }
    }

`provider` is `manual`, `bunnings` or `other`. `availability` is `unknown`, `in-stock`, `limited` or `out-of-stock`. The object is optional so existing Phase 4 cost items and schema version 1 projects remain valid. A selected provider is a source label only; it is not evidence that a live request succeeded.

Costing derives snapshot freshness from the item's `checkedAt` date. The default review window is 14 days. Missing or invalid dates, dates outside the review window and `unknown` availability are shown as review conditions. Freshness is derived at runtime and is never used to invent a price or stock quantity.

The Shopping List derives procurement groups at runtime using supplier name, provider and store identity. Each group reports its item count, known priced total, unpriced-item count and snapshot-review count. Groups are presentation and purchasing aids only; they do not allocate inventory, reserve stock or imply that items from one supplier are interchangeable.

## 21. Optional purchase budget and actual spend

The project envelope may carry an optional purchase budget. It is deliberately separate from material and supplies inventory:

    {
      "project": {
        "budget": {
          "amount": 250,
          "currency": "AUD"
        }
      }
    }

project.budget is optional for backward compatibility. When present, amount must be a non-negative number and currency must be AUD. A null budget means that the project has no purchase target.

Cost items may also carry optional actual-spend fields:

    {
      "actualCost": 24.5,
      "actualCheckedAt": "2026-08-06"
    }

actualCost is the final total paid for that Costing line, not a second unit price. It may be zero or a non-negative number. actualCheckedAt records when the amount was confirmed and is optional. Older cost items without these fields remain valid.

getCostingSummary() derives actual totals, line variance and budget comparison at runtime. Budget comparison uses planned and needs-sourcing items only; owned value is excluded. A budget is within-budget, estimate-over, over-budget, not-set or invalid. Actual spend is a user-entered project snapshot and does not change inventory quantities, reservations, supplier availability or optimiser allocation.
