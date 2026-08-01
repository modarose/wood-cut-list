# BenchMate / WoodCut Studio

## Project identity

This repository is evolving from **WoodCut Studio**, an existing woodworking cut-list planner, into **BenchMate**, a broader woodworking project and workshop-planning application.

WoodCut Studio remains the specialised cut-list and board-optimisation capability. BenchMate adds the surrounding project, inventory, costing, tooling, build-planning and journal workflows.

Do not create a second copied codebase. Extend the existing application incrementally and preserve the existing WoodCut Studio behaviour unless a change is explicitly agreed.

## Working principles

- Inspect the repository, current routes, components, data structures and scripts before making architectural changes.
- Preserve current functionality and visual behaviour while adding new capability.
- Prefer small, reversible changes over a rewrite.
- Keep calculation logic separate from UI components.
- Use a canonical project/parts schema so WoodCut Studio, SketchUp and supplier integrations can exchange data.
- Treat external supplier data as a dated snapshot, not permanent truth.
- Keep API credentials and OAuth secrets in a server-side or serverless integration layer; never expose them in browser code.
- Never invent dimensions, stock quantities, prices, tool capabilities or product availability.
- Use metric dimensions internally, normally millimetres, and AUD for Australian costing unless a future multi-region requirement is introduced.
- Flag uncertain design imports and unsafe or unverified tool substitutions for manual review.
- Do not build a service that aggregates or republishes third-party SketchUp 3D Warehouse models without confirming the applicable rights and terms.

## Product boundaries

The target product contains these conceptual areas:

- Projects and design revisions
- WoodCut Studio cut-list generation and optimisation
- Workshop tool inventory
- Material, offcut, hardware and finish inventory
- Build methods, tool feasibility and build steps
- Supplier pricing, stock and shopping lists
- SketchUp design import
- Build journal and optional YouTube/content workflow

Keep these areas modular. A user should be able to use the cut-list planner without configuring every other BenchMate feature.

## Development workflow

1. Read `docs/BENCHMATE_PROJECT_PLAN.md` and the relevant supporting document before changing behaviour.
2. Inspect the existing application before deciding where new code belongs.
3. Update the relevant documentation when a product or data-model decision changes.
4. Implement one vertical slice at a time.
5. Run the repository's available lint, test and build commands after changes.
6. Report any unavailable verification command instead of claiming it was run.

Until the repository audit is complete, do not assume the exact current framework, routing structure, persistence layer or deployment target.

## Verification expectations

At minimum, changes should be checked for:

- Existing WoodCut Studio workflows still function.
- Cut-list calculations remain deterministic for the same inputs.
- Dimensions and units are explicit.
- Inventory quantities cannot become negative silently.
- Imported parts with missing or ambiguous data are surfaced to the user.
- Supplier prices show their source and checked-at time.
- No secrets are committed to the repository.
- Responsive use remains practical on a workshop laptop or iPad-sized screen.

## Safety and domain limits

BenchMate may organise woodworking information and suggest possible methods, but it is not a substitute for tool manuals, training, supervision or safe workshop practice. Do not present an automatically generated tool substitution as guaranteed safe. Safety-critical steps require user confirmation and should link to the relevant manufacturer guidance where available.
