# BenchMate Integrations

**Status:** Integration strategy  
**Date:** 2026-07-31

## 1. Integration priorities

Integrations should be added in this order:

1. Existing WoodCut Studio functionality.
2. Manual JSON/CSV import and export.
3. Manual supplier product records.
4. Bunnings API connector.
5. SketchUp Desktop extension.
6. Trimble Connect or other cloud model workflows.

This order validates the product before external credentials and model APIs become critical dependencies.

## 2. WoodCut Studio

### Recommendation

Keep WoodCut Studio in the existing repository and treat it as the cut-list engine inside BenchMate.

### Integration approach

Start with an adapter that converts the current WoodCut Studio data into the canonical BenchMate `DesignRevision` and `Part` structures.

Possible stages:

1. Identify the existing cut-list data shape.
2. Add an explicit export function if one does not exist.
3. Add a BenchMate import adapter.
4. Confirm calculation results match before and after integration.
5. Move shared calculation logic behind a stable domain boundary only when needed.

Do not duplicate the optimisation algorithm in the BenchMate project layer.

## 3. SketchUp

### Preferred first route: SketchUp Desktop extension

Build a small Ruby extension that runs inside SketchUp Desktop and sends a structured manifest to BenchMate or exports JSON.

The extension can eventually:

- Traverse groups and components.
- Read dimensions, materials, tags and names.
- Read BenchMate custom attributes.
- Add a “Send to BenchMate” command.
- Export a project thumbnail and source metadata.

SketchUp provides official extension APIs, including a Ruby API for desktop extensions. Its developer documentation also describes attaching custom data to model entities. [SketchUp Developer Center](https://developer.sketchup.com/), [SketchUp Entity Overview](https://developer.sketchup.com/article-entity-overview)

### Modeling convention

For dependable extraction:

- Each cuttable piece should be a component.
- Component names should include a stable part code.
- Material and thickness should be explicit.
- Grain direction and edge treatment should be recorded where relevant.
- Construction geometry should be separated from cuttable geometry.

### Import review

The importer must show:

- Imported part count.
- Units.
- Missing names or dimensions.
- Unrecognised materials.
- Unsupported geometry.
- Parts that changed since the previous revision.

The user must approve the import before it becomes the active cut-list revision.

### SketchUp for Web and Trimble Connect

SketchUp for Web stores models in Trimble Connect. Trimble Connect provides APIs for files and model metadata, including hierarchies, entities and properties. This may support a later cloud workflow but should not be the first integration target. [Trimble Connect Model API](https://developer.trimble.com/docs/connect/tools/api/model/), [SketchUp Web model saving](https://help.sketchup.com/en/sketchup-web/saving-models)

### 3D Warehouse boundary

Do not create a public BenchMate catalogue that copies or aggregates third-party 3D Warehouse models. SketchUp’s official terms FAQ states that incorporating 3D Warehouse models into a website for members is impermissible aggregation. [3D Warehouse Terms FAQ](https://help.sketchup.com/en/3d-warehouse/3d-warehouse-terms-use-faq)

The supported product direction is user-owned models, manually downloaded files, or designs explicitly licensed for the workflow.

## 4. Bunnings

### Intended capabilities

Use Bunnings data to support:

- Product/item lookup.
- Product pricing.
- Store locations.
- Store-level inventory or availability where exposed.
- Store-aware shopping lists.

Bunnings documents Query Item, Query Pricing, Query Inventory and Query Location APIs. The pricing API returns catalogue unit prices, while inventory queries use item and location information. [Bunnings Query Item](https://developer.sandbox.bunnings.com.au/explore/query-item), [Bunnings Query Pricing](https://developer.sandbox.bunnings.com.au/explore/query-pricing), [Bunnings Query Inventory](https://developer.sandbox.bunnings.com.au/explore/query-inventory), [Bunnings Query Location](https://developer.sandbox.bunnings.com.au/explore/query-location)

### Access constraints

Bunnings API access uses OAuth 2.0. Developer registration and app creation are required; test and live products may require manual approval. Partner APIs require an appropriate product access code. [Bunnings API access](https://developer.sandbox.bunnings.com.au/working-with-bunnings-apis/accessing-the-apis), [Bunnings Partner APIs](https://developer.sandbox.bunnings.com.au/working-with-bunnings-apis/partner-apis)

### Implementation rules

- Put OAuth and client secrets in a backend or serverless function.
- Keep the browser dependent on a small internal supplier API.
- Cache responses where permitted.
- Store `checkedAt`, supplier, store and external item number.
- Display stale or unavailable states clearly.
- Preserve manual product links as a fallback.
- Do not assume price lookup implies checkout or ordering capability.

### Provider interface

```text
searchProducts(query)
getProduct(itemNumber)
getPrice(itemNumber, storeId)
getAvailability(itemNumber, storeId)
getLocations()
```

The provider adapter should return normalised `SupplierProduct` data to the application.

## 5. Manual supplier fallback

BenchMate must remain useful without live Bunnings access.

Manual supplier records should support:

- Supplier name.
- Product name and category.
- Product URL.
- SKU or item number.
- Price and unit.
- Store or delivery note.
- Checked-at date.
- User notes.

This also allows future Mitre 10, specialty timber, hardware or finishing suppliers without changing the core costing model.

## 6. Optional AI integration

AI should be accessed through a server-side boundary when API credentials or user data require protection.

Good uses include:

- Drafting a project brief.
- Suggesting build stages from approved data.
- Explaining missing information.
- Generating creator-mode text.

AI output should be stored as a draft with a source, timestamp and user approval state. It must not overwrite authoritative dimensions, prices or inventory quantities.

## 7. Integration failure handling

Every integration should support:

- Timeout.
- Authentication failure.
- Rate limit.
- Invalid response.
- Missing mapping.
- Stale data.
- Partial success.

The application should preserve the last known valid data and show the failure state rather than clearing the project.
