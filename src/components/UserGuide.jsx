import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  FolderOpen,
  Package,
  Printer,
  Save,
  ShoppingCart,
  Wrench,
} from 'lucide-react';

const BOOKSHELF_PARTS = [
  ['Side Panels', '300 × 1800 mm', '2', 'Fixed'],
  ['Top & Bottom', '300 × 840 mm', '2', 'Fixed'],
  ['Adjustable Shelves', '280 × 804 mm', '4', 'Rotate'],
  ['Kick Plate', '100 × 840 mm', '1', 'Rotate'],
  ['Plywood Backing', '840 × 1800 mm', '1', 'Fixed'],
];

function GuideSection({ id, number, icon: Icon, title, intro, children }) {
  return (
    <section className="ws-guide-section" id={id}>
      <div className="ws-guide-section-heading">
        <div className="ws-guide-number">{number}</div>
        <div>
          <div className="ws-page-eyebrow"><Icon size={13} /> WoodCut Studio workflow</div>
          <h2>{title}</h2>
          <p>{intro}</p>
        </div>
      </div>
      <div className="ws-guide-section-body">{children}</div>
    </section>
  );
}

function GuideNote({ children, warning = false }) {
  return (
    <div className={`ws-guide-note${warning ? ' warning' : ''}`}>
      {warning ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
      <span>{children}</span>
    </div>
  );
}

export default function UserGuide({ projectName }) {
  return (
    <main className="ws-main">
      <div className="ws-content ws-guide-content">
        <header className="ws-guide-hero">
          <div>
            <div className="ws-page-eyebrow"><BookOpen size={14} /> WoodCut Studio help</div>
            <h1 className="ws-page-title">User guide</h1>
            <p className="ws-guide-lead">
              Follow one complete woodworking project from the default Custom Bookshelf preset
              through optimisation, inventory, costing, planning and workshop execution.
            </p>
          </div>
          <div className="ws-guide-hero-meta">
            <span className="ws-guide-badge">Example project</span>
            <strong>Custom Bookshelf</strong>
            <small>{projectName ? `Current project: ${projectName}` : 'Start with the default preset'}</small>
          </div>
        </header>

        <nav className="ws-guide-toc" aria-label="User guide sections">
          <a href="#guide-start">Start here</a>
          <a href="#guide-projects">Projects</a>
          <a href="#guide-optimizer">Optimizer</a>
          <a href="#guide-inventory">Inventory</a>
          <a href="#guide-readiness">Readiness</a>
          <a href="#guide-costing">Costing</a>
          <a href="#guide-build">Build planner</a>
          <a href="#guide-workshop">Workshop</a>
          <a href="#guide-storage">Storage &amp; limits</a>
        </nav>

        <GuideSection
          id="guide-start"
          number="01"
          icon={BookOpen}
          title="Start with Custom Bookshelf"
          intro="Use the default preset as a safe tour of the whole application. Load it again from the Optimizer menu whenever you want to restart the example."
        >
          <div className="ws-guide-example">
            <div className="ws-guide-example-heading">
              <div>
                <span className="ws-guide-kicker">Default preset</span>
                <h3>Custom Bookshelf</h3>
              </div>
              <span className="ws-guide-example-status">5 part types · 10 pieces</span>
            </div>
            <div className="ws-guide-data-grid">
              <div><span>Stock</span><strong>1220 × 2440 mm</strong></div>
              <div><span>Kerf</span><strong>3 mm</strong></div>
              <div><span>Edge margin</span><strong>5 mm</strong></div>
              <div><span>Strategy</span><strong>BSSF (Best Fit)</strong></div>
              <div><span>Cut preference</span><strong>Length rip-cut first</strong></div>
            </div>
            <div className="ws-guide-table-wrap">
              <table className="ws-guide-table">
                <thead>
                  <tr><th>Part</th><th>Dimensions</th><th>Qty</th><th>Grain</th></tr>
                </thead>
                <tbody>
                  {BOOKSHELF_PARTS.map(part => (
                    <tr key={part[0]}>
                      <td>{part[0]}</td><td>{part[1]}</td><td>{part[2]}</td><td>{part[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <ol className="ws-guide-steps">
            <li>Open <strong>Presets</strong> from the Optimizer menu.</li>
            <li>Choose <strong>Custom Bookshelf</strong> and confirm that the part list and stock values match the example above.</li>
            <li>Save the project before making major edits. Loading a preset replaces the current Optimizer stock and part values.</li>
          </ol>
          <GuideNote>
            The preset is a cut-list example, not a complete construction specification. Confirm material thickness, joinery, fixings and safe methods before building.
          </GuideNote>
        </GuideSection>

        <GuideSection
          id="guide-projects"
          number="02"
          icon={FolderOpen}
          title="Create and manage projects"
          intro="Projects keep the cut list, requirements, build plan and costing records together in one saved workspace."
        >
          <div className="ws-guide-feature-grid">
            <article><FolderOpen size={18} /><h3>Projects dashboard</h3><p>Open the sidebar's Projects view to create, open, duplicate, archive or restore projects. Use the active and archived filters to find older work.</p></article>
            <article><Save size={18} /><h3>Explicit saving</h3><p>Project details and project-owned records are saved when you choose Save. The current workspace shows an unsaved indicator when changes need saving.</p></article>
            <article><ClipboardCheck size={18} /><h3>Project details</h3><p>Inside Project setup &amp; readiness, edit the name, status and notes. Statuses include Idea, Planning, Ready to buy, Building, Paused and Complete.</p></article>
          </div>
          <div className="ws-guide-flow">
            <span>Draft the bookshelf</span><b>→</b><span>Save project</span><b>→</b><span>Open it later from Projects</span>
          </div>
          <GuideNote>
            Moving between Optimizer, Inventory, Costing, Build Planner and Workshop keeps the current in-memory project edits. Save before closing or refreshing the browser if you want them persisted.
          </GuideNote>
        </GuideSection>

        <GuideSection
          id="guide-optimizer"
          number="03"
          icon={Calculator}
          title="Build and optimise the cut list"
          intro="WoodCut Studio remains the calculation engine. Use it to turn rectangular part requirements into sheet layouts and a practical cut sequence."
        >
          <div className="ws-guide-two-column">
            <div>
              <h3>Set up stock</h3>
              <ul>
                <li>Choose <strong>MM</strong> or <strong>INCHES</strong>. The canonical project data remains metric internally.</li>
                <li>Enter stock width and length, blade <strong>Kerf</strong> and edge <strong>Margin</strong>.</li>
                <li>Choose <strong>BSSF (Best Fit)</strong> or <strong>BAF (Area Priority)</strong>.</li>
                <li>Choose <strong>Length Rip-Cut First</strong> or <strong>Width Cross-Cut First</strong>.</li>
                <li>Use a sheet preset for common stock sizes, or select a material from Inventory to use its usable dimensions.</li>
              </ul>
            </div>
            <div>
              <h3>Edit cut requirements</h3>
              <ul>
                <li>Edit each part name, width, length, quantity and colour.</li>
                <li><strong>Rotate</strong> permits a 90° turn; <strong>Fixed</strong> preserves the entered orientation for grain-sensitive parts.</li>
                <li>Add a new part, duplicate a row or delete a row. The total piece count updates immediately.</li>
                <li>For the bookshelf example, the five rows represent ten individual pieces.</li>
              </ul>
            </div>
          </div>
          <div className="ws-guide-feature-grid">
            <article><Calculator size={18} /><h3>Read the result</h3><p>Review required sheets, material yield, waste/offcuts, blade kerf loss and the Parts Cut count. Unplaced parts remain visible for review.</p></article>
            <article><Package size={18} /><h3>Inspect diagrams</h3><p>Use the interactive sheet diagrams to zoom, pan, fit the layout and inspect part placement, rotation and scrap regions.</p></article>
            <article><Printer size={18} /><h3>Take it to the workshop</h3><p>Use Print / PDF for the cut report with one diagram per page, or Export CSV for the part schedule.</p></article>
          </div>
          <GuideNote warning>
            Optimisation is a dimensional 2D planning result. It does not confirm material grade, thickness, board allocation, structural suitability or workshop safety.
          </GuideNote>
        </GuideSection>

        <GuideSection
          id="guide-inventory"
          number="04"
          icon={Package}
          title="Record materials and workshop supplies"
          intro="Inventory describes what exists in the workshop or what you intend to buy. Costing and project checks can reference these records without copying them."
        >
          <div className="ws-guide-two-column">
            <div>
              <h3>Material inventory</h3>
              <ol className="ws-guide-compact-list">
                <li>Open Inventory and choose the materials view.</li>
                <li>Add a sheet-good record such as 18 mm plywood. Enter overall length, width and thickness, then usable dimensions and quantity.</li>
                <li>Set Source to <strong>Owned</strong> for stock you have or <strong>Planned purchase</strong> for stock you expect to buy.</li>
                <li>Record condition, location, notes and any existing reservation.</li>
                <li>Use <strong>Use as stock</strong> to apply available usable dimensions to the Optimizer.</li>
              </ol>
              <p>Material matching is dimensional screening. A record can be a potential fit without proving that every part can be allocated from it.</p>
            </div>
            <div>
              <h3>Workshop supplies</h3>
              <ol className="ws-guide-compact-list">
                <li>Switch to Supplies from the Inventory view.</li>
                <li>Add hardware, adhesive, finish, abrasive or consumable records.</li>
                <li>Enter a quantity with an explicit unit such as each, pack, box, bottle, tube, litre or metre.</li>
                <li>Set source, brand, reference, location, notes and last-checked date.</li>
              </ol>
              <p>Supply records do not contain project prices or inferred demand. Use Costing for a project-specific estimate.</p>
            </div>
          </div>
          <GuideNote>
            Material reservations are explicit and whole-sheet based. Only owned material can be reserved, and a reservation cannot exceed the available quantity. Release a reservation when the project no longer needs it.
          </GuideNote>
        </GuideSection>

        <GuideSection
          id="guide-readiness"
          number="05"
          icon={ClipboardCheck}
          title="Check project readiness"
          intro="The Projects view contains an expandable Project setup & readiness panel. Use it to compare the bookshelf requirements with your recorded resources."
        >
          <div className="ws-guide-feature-grid">
            <article><Package size={18} /><h3>Material check</h3><p>See owned dimension fits, planned candidates, unresolved part types and rows needing review. If stock is selected, compare available quantity with required sheets.</p></article>
            <article><ShoppingCart size={18} /><h3>Supply requirements</h3><p>Add project requirements for hardware, glue, finish, abrasives and consumables. Matching is exact by category, name and unit, with an optional reference match.</p></article>
            <article><Wrench size={18} /><h3>Tool requirements</h3><p>Add capability requirements such as a cutting or sanding capability. The check distinguishes owned available tools from planned, unavailable or uncertain matches.</p></article>
          </div>
          <p className="ws-guide-paragraph">Use the status as a planning signal, not a construction approval. A green or potentially covered result does not allocate individual boards, reserve supplies or certify that a tool setup is safe.</p>
        </GuideSection>

        <GuideSection
          id="guide-costing"
          number="06"
          icon={ShoppingCart}
          title="Estimate project cost and purchases"
          intro="Costing is a manual AUD estimate. It records project-specific price snapshots and produces a shopping list without claiming live supplier availability."
        >
          <div className="ws-guide-two-column">
            <div>
              <h3>Add a cost item</h3>
              <ul>
                <li>Choose a category such as Sheet goods, Solid timber, Hardware, Adhesive, Finish, Abrasive or Consumable.</li>
                <li>Enter name, quantity, unit and status: <strong>Owned</strong>, <strong>Planned purchase</strong> or <strong>Needs sourcing</strong>.</li>
                <li>Add an optional AUD unit cost. The line total is quantity multiplied by unit cost.</li>
                <li>Record supplier, product reference, URL, checked-at date and notes for traceability.</li>
              </ul>
            </div>
            <div>
              <h3>Connect inventory</h3>
              <ul>
                <li>Use the link button on a cost item to choose a compatible material or supply record.</li>
                <li>New links adopt the Inventory source status. A planned inventory record therefore appears as Planned, not Owned.</li>
                <li>A deliberate Costing override is allowed but flagged as a status mismatch.</li>
                <li>Use <strong>Adopt Inventory status</strong> to reconcile an older link after the Inventory source changes.</li>
              </ul>
            </div>
          </div>
          <div className="ws-guide-feature-grid">
            <article><Calculator size={18} /><h3>Review totals</h3><p>Purchase estimate covers non-owned priced items. Owned value shows priced owned items. Estimated total combines both, while unknown prices remain a review condition.</p></article>
            <article><ShoppingCart size={18} /><h3>Shopping list</h3><p>Every planned or needs-sourcing item appears in the shopping list, including items without a known price.</p></article>
            <article><Printer size={18} /><h3>Export and print</h3><p>Open Costing's Menu to export CSV or print a report containing the estimate and a separate shopping-list page.</p></article>
          </div>
          <GuideNote warning>
            Costing is an estimate, not inventory planning or ordering. Inventory remains the source of truth for quantities, dimensions, condition and availability.
          </GuideNote>
        </GuideSection>

        <GuideSection
          id="guide-build"
          number="07"
          icon={ClipboardList}
          title="Plan the build sequence"
          intro="Build Planner turns the bookshelf cut list into user-authored stages and steps. It helps you organise work without inventing a construction method."
        >
          <ol className="ws-guide-steps">
            <li>Open <strong>Build Planner</strong> and add stages such as Preparation, Cutting, Joinery, Assembly, Sanding and Finishing.</li>
            <li>Add steps inside each stage. Give each step a type, work duration, optional wait time and progress status.</li>
            <li>Add dependencies so later work waits for the required earlier step.</li>
            <li>Link a step to the relevant cut-list parts, project tool requirements and supply requirements.</li>
            <li>Record notes and safety reminders. Save the project to keep the plan.</li>
          </ol>
          <div className="ws-guide-status-row">
            <span><strong>Ready</strong> all current checks pass</span>
            <span><strong>Needs review</strong> a planned or uncertain resource is involved</span>
            <span><strong>Blocked</strong> a dependency or required resource is missing</span>
          </div>
          <GuideNote>
            Build Planner does not automatically generate methods, allocate tools, reserve supplies or certify safe operations. Treat every step as a plan to review and confirm yourself.
          </GuideNote>
        </GuideSection>

        <GuideSection
          id="guide-workshop"
          number="08"
          icon={Wrench}
          title="Prepare the workshop and track progress"
          intro="Workshop combines tool inventory with a large-control execution view for the saved build plan."
        >
          <div className="ws-guide-two-column">
            <div>
              <h3>Tool inventory</h3>
              <ul>
                <li>Add tools with name, category, brand, model, ownership and location.</li>
                <li>Record availability, condition, capabilities, accessories and maintenance details.</li>
                <li>Search by name, brand, location or capability and filter by category or availability.</li>
                <li>Keep borrowed, hired, unavailable, damaged or maintenance items clearly marked.</li>
              </ul>
            </div>
            <div>
              <h3>Workshop mode</h3>
              <ul>
                <li>Select a current build step from the sequence.</li>
                <li>Review readiness issues, linked parts and resource status before starting.</li>
                <li>Use <strong>Start this step</strong> and <strong>Mark step complete</strong> as work progresses.</li>
                <li>Review the complete cut sequence below the tool inventory when the Optimizer has generated cuts.</li>
              </ul>
            </div>
          </div>
          <GuideNote warning>
            Capability tags and readiness states are planning aids, not safety certification. Follow the relevant tool manuals, training, supervision and workshop procedures before every operation.
          </GuideNote>
        </GuideSection>

        <GuideSection
          id="guide-storage"
          number="09"
          icon={Save}
          title="Understand saving, storage and limits"
          intro="WoodCut Studio is currently local-first. Knowing what is saved, and when, prevents surprises when changing browsers or devices."
        >
          <div className="ws-guide-data-grid ws-guide-storage-grid">
            <div><span>Projects</span><strong>Saved with Save project</strong><small>Projects, requirements, build plans and costing records</small></div>
            <div><span>Materials</span><strong>Saved as inventory changes</strong><small>Sheet goods, timber, offcuts and reservations</small></div>
            <div><span>Supplies</span><strong>Saved as inventory changes</strong><small>Hardware, adhesives, finishes and consumables</small></div>
            <div><span>Tools</span><strong>Saved as inventory changes</strong><small>Tool records and capability metadata</small></div>
          </div>
          <ul>
            <li>Data is kept in this browser's local storage, not in a server database.</li>
            <li>Clearing site data, changing browser profiles or using another device will not carry records across.</li>
            <li>CSV exports are working documents, not a full project backup. Cloud sync, accounts and project JSON import/export are not implemented yet.</li>
            <li>Settings, Support, SketchUp import, supplier APIs, journaling and creator workflows are future features.</li>
          </ul>
          <GuideNote warning>
            Before a significant change, save the project and keep any important CSV or printed reports. This app does not replace design review, supplier confirmation or safe workshop practice.
          </GuideNote>
        </GuideSection>

        <section className="ws-guide-final-checklist">
          <div className="ws-page-eyebrow"><CheckCircle2 size={14} /> Bookshelf walkthrough</div>
          <h2>A practical end-to-end order</h2>
          <div className="ws-guide-flow ws-guide-flow-wrap">
            <span>Load Custom Bookshelf</span><b>→</b>
            <span>Save project</span><b>→</b>
            <span>Check stock and parts</span><b>→</b>
            <span>Add material inventory</span><b>→</b>
            <span>Review readiness</span><b>→</b>
            <span>Add costs and shopping items</span><b>→</b>
            <span>Plan build stages</span><b>→</b>
            <span>Execute in Workshop</span>
          </div>
        </section>
      </div>
    </main>
  );
}
