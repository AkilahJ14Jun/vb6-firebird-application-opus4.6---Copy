# Graph Report - vb6-firebird-application-opus4.6 - Copy  (2026-09-06)

## Corpus Check
- Corpus is ~15,920 words - fits in a single context window. You may not need a graph.

## Summary
- 219 nodes · 350 edges · 14 communities (10 shown, 4 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.81)
- Token cost: 88,173 input · 0 output

## Community Hubs (Navigation)
- UI Pages & Shared Types
- TypeScript Config
- App Bootstrap & State Store
- Weighment & Billing Workflow
- Runtime Dependencies
- Weighing Transaction Fields & Hardware
- Build Tooling & Dev Dependencies
- Master Data Management
- Warehouse Roles & Infrastructure
- Admin Master Data Config
- Vite Config Module
- Error Logging
- Loader Role
- Single Session Login

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 19 edges
2. `cn()` - 14 edges
3. `Ticket` - 12 edges
4. `Weighing Transaction (Tare + Loaded Capture)` - 12 edges
5. `User` - 9 edges
6. `App()` - 7 edges
7. `DailySummary` - 7 edges
8. `WeighInPageProps` - 6 edges
9. `WeighInPage()` - 6 edges
10. `formatNow()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Out Time (Entry Till Planning Done)` --semantically_similar_to--> `Planning Activity (Entry to Fully Loaded)`  [AMBIGUOUS] [semantically similar]
  Changes required.txt → Initial Requirement.txt
- `Entry Point Data Capture` --semantically_similar_to--> `Entry Slip (Receipt No, Entry Time, Vehicle No, Driver, Mobile, 1st Weight)`  [INFERRED] [semantically similar]
  Changes required.txt → Initial Requirement.txt
- `Approval Receipt at Entry Point` --semantically_similar_to--> `Entry Point Approval/Rejection Decision`  [INFERRED] [semantically similar]
  Changes required.txt → Initial Requirement.txt
- `Delivery Order / Planning Phase` --semantically_similar_to--> `Planning Activity (Entry to Fully Loaded)`  [INFERRED] [semantically similar]
  Changes required.txt → Initial Requirement.txt
- `Sequential Weighment Stages` --semantically_similar_to--> `First/Second/Third Weighment Sequence per Bay`  [INFERRED] [semantically similar]
  Changes required.txt → Initial Requirement.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Warehouse Vehicle Processing Role Chain** — initial_requirement_role_operator, initial_requirement_role_planner, initial_requirement_role_supervisor, initial_requirement_role_handler, initial_requirement_role_loader [INFERRED 0.85]
- **Configurable Master Data Tables** — initial_requirement_customer_master, initial_requirement_employee_master, initial_requirement_role_master, initial_requirement_time_limit_table, initial_requirement_color_configuration_table [EXTRACTED 1.00]
- **End-to-End Vehicle Time Tracking Flow** — changes_required_in_time, changes_required_planning_time, changes_required_billing_time, changes_required_warehouse_time, initial_requirement_step_time_tracking [INFERRED 0.85]

## Communities (14 total, 4 thin omitted)

### Community 0 - "UI Pages & Shared Types"
Cohesion: 0.08
Nodes (40): MenuGroup, menuGroups, MenuItem, Sidebar(), SidebarProps, DashboardPage(), DashboardPageProps, AboutPage() (+32 more)

### Community 1 - "TypeScript Config"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 2 - "App Bootstrap & State Store"
Cohesion: 0.20
Nodes (19): App(), LoginPage(), LoginPageProps, WeighInPage(), defaultSettings, formatDateTime(), formatNow(), generateAuditLog() (+11 more)

### Community 3 - "Weighment & Billing Workflow"
Cohesion: 0.12
Nodes (21): Approval Receipt at Entry Point, Billing Time, Delivery Order / Planning Phase, Entry Point Data Capture, In Time (Entry Time), Out Time (Entry Till Planning Done), Planning Time, Warehouse Time (Auto-Calculated) (+13 more)

### Community 4 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (19): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+11 more)

### Community 5 - "Weighing Transaction Fields & Hardware"
Cohesion: 0.11
Nodes (19): Customer Location, Customer Name (Searchable/New Entry), On-Premise and Cloud Deployment, Hardware/Payment Mode Configuration per Station, IP Camera, Loaded Weight, Material Loaded, API-Driven Independently Deployable Modules (+11 more)

### Community 6 - "Build Tooling & Dev Dependencies"
Cohesion: 0.11
Nodes (19): devDependencies, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, typescript, vite (+11 more)

### Community 7 - "Master Data Management"
Cohesion: 0.16
Nodes (13): CustomersPage(), CustomersPageProps, ProductsPage(), ProductsPageProps, SuppliersPage(), SuppliersPageProps, VehiclesPage(), VehiclesPageProps (+5 more)

### Community 8 - "Warehouse Roles & Infrastructure"
Cohesion: 0.22
Nodes (9): WS Series App Shell (index.html), Loading Bay, Role: Handler, Role: Operator, Role: Planner, Role: Supervisor, Warehouse, Modular Multi-User Web and Mobile App (+1 more)

### Community 9 - "Admin Master Data Config"
Cohesion: 0.25
Nodes (8): Admin-Level-Only Configuration Control, Color Configuration Table, Customer Master Table, Legacy Excel/Manual Data Import on Changeover, Employee Master Table, Roles Table, Tare Weight Validity Period (Configurable per Customer/Vehicle), Prescribed Time Limit Table

## Ambiguous Edges - Review These
- `Out Time (Entry Till Planning Done)` → `Planning Activity (Entry to Fully Loaded)`  [AMBIGUOUS]
  Changes required.txt · relation: semantically_similar_to

## Knowledge Gaps
- **75 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+70 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Out Time (Entry Till Planning Done)` and `Planning Activity (Entry to Fully Loaded)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `devDependencies` connect `Build Tooling & Dev Dependencies` to `Runtime Dependencies`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _75 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `UI Pages & Shared Types` be split into smaller, more focused modules?**
  _Cohesion score 0.07955596669750231 - nodes in this community are weakly interconnected._
- **Should `TypeScript Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07407407407407407 - nodes in this community are weakly interconnected._
- **Should `Weighment & Billing Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.11904761904761904 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._