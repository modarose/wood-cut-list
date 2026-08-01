# BenchMate Data Model

**Status:** Initial canonical model  
**Date:** 2026-07-31

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
  "buildMethodIds": [],
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

```json
{
  "id": "method_01",
  "projectId": "project_01",
  "name": "Pocket-hole construction",
  "status": "selected",
  "requiredToolIds": ["tool_pocket_hole_jig", "tool_drill_driver"],
  "steps": [
    {
      "id": "step_01",
      "sequence": 1,
      "name": "Prepare and label parts",
      "type": "preparation",
      "dependsOn": [],
      "partIds": ["part_01", "part_02"],
      "toolIds": ["tool_tape_measure", "tool_pencil"],
      "materialIds": [],
      "estimatedMinutes": 20,
      "status": "not-started",
      "safetyNotes": []
    }
  ]
}
```

The example IDs are illustrative. Production IDs must be generated consistently and validated.

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

| WoodCut Studio concept | BenchMate concept |
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

Project records are persisted as complete canonical envelopes in browser-local storage under `benchmate.projects.v1`. Persistence is explicit; editing the workspace marks the draft as dirty until the user saves it.

## 14. Phase 2 material inventory

The first inventory slice uses the existing `MaterialStock` shape as a separate workshop collection. It is stored in browser-local storage under `benchmate.materials.v1`. A project stores an optional `cutStock.sourceMaterialStockId` reference when an inventory item is selected as the optimizer stock template; the full workshop collection remains separate from the project envelope.

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

Tool records are stored separately from project envelopes in browser-local storage under `benchmate.tools.v1`:

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
