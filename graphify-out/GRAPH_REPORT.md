# Graph Report - vb6-firebird-application-opus4.6  (2026-09-15)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 290 nodes · 603 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 13 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App.tsx
- cn
- Warehouse Time (Auto-Calculated)
- index.ts
- compilerOptions
- package.json
- Weighing Transaction (Tare + Loaded Capture)
- devDependencies
- MasterDataPage.tsx
- VehicleEntryPage.tsx
- Admin-Level-Only Configuration Control
- ErrorBoundary
- Sidebar.tsx
- vite.config.ts
- Configurable Hardware/Runtime Error Logging
- Role: Loader
- Single-Session Login Restriction

## God Nodes (most connected - your core abstractions)
1. `cn()` - 29 edges
2. `DeliveryOrderPlan` - 21 edges
3. `compilerOptions` - 19 edges
4. `User` - 15 edges
5. `VehicleEntry` - 13 edges
6. `formatTime12()` - 13 edges
7. `Product` - 12 edges
8. `Ticket` - 12 edges
9. `Weighing Transaction (Tare + Loaded Capture)` - 12 edges
10. `BayMaster` - 11 edges

## Surprising Connections (you probably didn't know these)
- `Out Time (Entry Till Planning Done)` --semantically_similar_to--> `Planning Activity (Entry to Fully Loaded)`  [AMBIGUOUS] [semantically similar]
  Changes required.txt → Initial Requirement.txt
- `Approval Receipt at Entry Point` --semantically_similar_to--> `Entry Point Approval/Rejection Decision`  [INFERRED] [semantically similar]
  Changes required.txt → Initial Requirement.txt
- `Billing Time` --semantically_similar_to--> `Billing Section (Final Weight and Charges)`  [INFERRED] [semantically similar]
  Changes required.txt → Initial Requirement.txt
- `Entry Point Data Capture` --semantically_similar_to--> `Entry Slip (Receipt No, Entry Time, Vehicle No, Driver, Mobile, 1st Weight)`  [INFERRED] [semantically similar]
  Changes required.txt → Initial Requirement.txt
- `In Time (Entry Time)` --semantically_similar_to--> `Entry Slip (Receipt No, Entry Time, Vehicle No, Driver, Mobile, 1st Weight)`  [INFERRED] [semantically similar]
  Changes required.txt → Initial Requirement.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Configurable Master Data Tables** — initial_requirement_customer_master, initial_requirement_employee_master, initial_requirement_role_master, initial_requirement_time_limit_table, initial_requirement_color_configuration_table [EXTRACTED 1.00]
- **End-to-End Vehicle Time Tracking Flow** — changes_required_in_time, changes_required_planning_time, changes_required_billing_time, changes_required_warehouse_time, initial_requirement_step_time_tracking [INFERRED 0.85]
- **Warehouse Vehicle Processing Role Chain** — initial_requirement_role_operator, initial_requirement_role_planner, initial_requirement_role_supervisor, initial_requirement_role_handler, initial_requirement_role_loader [INFERRED 0.85]

## Communities (17 total, 4 thin omitted)

### Community 0 - "App.tsx"
Cohesion: 0.09
Nodes (39): App(), AboutPage(), AuditLogPage(), AuditLogPageProps, BackupPage(), DailySummaryPage(), formatDuration(), ReportsPage() (+31 more)

### Community 1 - "cn"
Cohesion: 0.14
Nodes (30): DeliveryOrderModal(), DeliveryOrderModalProps, QRCodeSvg(), QRCodeSvgProps, BayMasterPage(), BayMasterPageProps, CheckingPage(), CheckingPageProps (+22 more)

### Community 2 - "Warehouse Time (Auto-Calculated)"
Cohesion: 0.08
Nodes (30): Approval Receipt at Entry Point, Billing Time, Delivery Order / Planning Phase, Entry Point Data Capture, In Time (Entry Time), Out Time (Entry Till Planning Done), Planning Time, Warehouse Time (Auto-Calculated) (+22 more)

### Community 3 - "index.ts"
Cohesion: 0.10
Nodes (26): DashboardPage(), DashboardPageProps, LoginPage(), LoginPageProps, NOTE: 'sysadmin' role has the highest system privileges (Role Level 1)., MultiWeighmentPage(), MultiWeighmentPageProps, DailySummaryPageProps (+18 more)

### Community 4 - "compilerOptions"
Cohesion: 0.07
Nodes (26): DOM, DOM.Iterable, ES2020, node, src, vite.config.ts, compilerOptions, allowImportingTsExtensions (+18 more)

### Community 5 - "package.json"
Cohesion: 0.10
Nodes (19): clsx, lucide-react, dependencies, clsx, lucide-react, react, react-dom, tailwind-merge (+11 more)

### Community 6 - "Weighing Transaction (Tare + Loaded Capture)"
Cohesion: 0.11
Nodes (19): Customer Location, Customer Name (Searchable/New Entry), On-Premise and Cloud Deployment, Hardware/Payment Mode Configuration per Station, IP Camera, Loaded Weight, Material Loaded, API-Driven Independently Deployable Modules (+11 more)

### Community 7 - "devDependencies"
Cohesion: 0.11
Nodes (19): devDependencies, tailwindcss, @tailwindcss/vite, @types/node, @types/react, @types/react-dom, typescript, vite (+11 more)

### Community 8 - "MasterDataPage.tsx"
Cohesion: 0.15
Nodes (12): CustomersPage(), CustomersPageProps, ProductsPage(), ProductsPageProps, SuppliersPage(), SuppliersPageProps, VehiclesPage(), VehiclesPageProps (+4 more)

### Community 9 - "VehicleEntryPage.tsx"
Cohesion: 0.26
Nodes (11): EntrySlipDocument(), EntrySlipDocumentProps, EntrySlipModal(), EntrySlipModalProps, COMMON_REJECT_REASONS, VEHICLE_TYPES, VehicleEntryPage(), formatTimeSlip() (+3 more)

### Community 10 - "Admin-Level-Only Configuration Control"
Cohesion: 0.25
Nodes (8): Admin-Level-Only Configuration Control, Color Configuration Table, Customer Master Table, Legacy Excel/Manual Data Import on Changeover, Employee Master Table, Roles Table, Tare Weight Validity Period (Configurable per Customer/Vehicle), Prescribed Time Limit Table

### Community 11 - "ErrorBoundary"
Cohesion: 0.25
Nodes (3): ErrorBoundary, Props, State

### Community 12 - "Sidebar.tsx"
Cohesion: 0.43
Nodes (6): getMenuGroups(), MenuGroup, MenuItem, Sidebar(), SidebarProps, PageId

## Ambiguous Edges - Review These
- `Out Time (Entry Till Planning Done)` → `Planning Activity (Entry to Fully Loaded)`  [AMBIGUOUS]
  Changes required.txt · relation: semantically_similar_to

## Knowledge Gaps
- **83 isolated node(s):** `QRCodeSvgProps`, `PlannedItemDraft`, `Props`, `State`, `MenuGroup` (+78 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Out Time (Entry Till Planning Done)` and `Planning Activity (Entry to Fully Loaded)`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **Why does `ErrorBoundary` connect `ErrorBoundary` to `App.tsx`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `devDependencies` to `package.json`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `DeliveryOrderPlan` connect `cn` to `App.tsx`, `index.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **What connects `QRCodeSvgProps`, `PlannedItemDraft`, `Props` to the rest of the system?**
  _83 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Should `cn` be split into smaller, more focused modules?**
  _Cohesion score 0.14304993252361672 - nodes in this community are weakly interconnected._