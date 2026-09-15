/**
 * ============================================================================
 * WS SERIES — WEIGHING SCALE MANAGEMENT SYSTEM
 * Main Application Entry Point (App.tsx)
 * ============================================================================
 *
 * PURPOSE:
 *   This is the root component that orchestrates the entire application.
 *   It manages:
 *     - Authentication state (logged-in user)
 *     - Navigation (which page is currently displayed)
 *     - Application data (tickets, master data, transactions, etc.)
 *
 * REPLACES (from VB6):
 *   - frmMain (MDI parent form) — the main window container
 *   - modGlobal.bas — global variables for user, company, settings
 *   - The VB6 project's Sub Main() entry point
 *
 * ARCHITECTURE:
 *   LoginPage (if not authenticated)
 *     └── Sidebar + Active Page (if authenticated)
 *           ├── DashboardPage    (new — no VB6 equivalent, enhancement)
 *           ├── WeighInPage      (frmWeighIn)
 *           ├── WeighOutPage     (frmWeighOut)
 *           ├── TicketsPage      (frmTicket)
 *           ├── ProductsPage     (frmProduct)
 *           ├── CustomersPage    (frmCustomer)
 *           ├── SuppliersPage    (frmSupplier)
 *           ├── VehiclesPage     (frmVehicle)
 *           ├── TransactionsPage (implicit in VB6)
 *           ├── DailySummaryPage (frmDailySummary)
 *           ├── ReportsPage      (frmReport)
 *           ├── UsersPage        (frmUserMgmt)
 *           ├── SettingsPage     (frmSettings)
 *           ├── AuditLogPage     (AUDIT_LOG viewer)
 *           ├── BackupPage       (frmBackup)
 *           └── AboutPage        (frmAbout)
 *
 * DATA FLOW:
 *   In this demo, all data is held in React state (useState).
 *   In the production NestJS backend version, this would be replaced by:
 *     - TanStack Query hooks fetching from REST APIs
 *     - Zustand stores for client-only state
 *     - Socket.IO connections for real-time scale data
 * ============================================================================
 */

import { useState, useMemo, useEffect } from 'react';
import type {
  User, Ticket, AppSettings, PageId,
  VehicleEntry, DeliveryOrderPlan, MultiWeighmentSession,
  WarehouseEmployee, RoleMaster, BayMaster,
} from './types';
import {
  sampleUsers, sampleProducts, sampleCustomers,
  sampleSuppliers, sampleVehicles, defaultSettings,
  generateSampleTickets, generateTransactions,
  generateAuditLog, generateDailySummary, formatNow,
  initialVehicleEntries, initialDeliveryOrders,
  initialMultiWeighmentSessions, sampleWarehouseEmployees,
  sampleRoles, sampleBays,
} from './store/appStore';

// ── Page Components ─────────────────────────────────────────────────────
import { ErrorBoundary } from './components/ErrorBoundary';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { VehicleEntryPage } from './pages/VehicleEntryPage';
import { PlanningPage } from './pages/PlanningPage';
import { MultiWeighmentPage } from './pages/MultiWeighmentPage';
import { WeighInPage } from './pages/WeighInPage';
import { WeighOutPage } from './pages/WeighOutPage';
import { CheckingPage } from './pages/CheckingPage';
import { ExitGatePage } from './pages/ExitGatePage';
import { BayMasterPage } from './pages/BayMasterPage';
import { ProductsPage, CustomersPage, SuppliersPage, VehiclesPage } from './pages/MasterDataPage';
import {
  TicketsPage, TransactionsPage, DailySummaryPage,
  ReportsPage, RolesPage, UsersPage, SettingsPage, AuditLogPage,
  BackupPage, AboutPage,
} from './pages/OtherPages';

export function App() {
  /* ══════════════════════════════════════════════════════════════════════
   * STATE MANAGEMENT
   * Replaces: modGlobal.bas global variables and form-level variables
   * ══════════════════════════════════════════════════════════════════════ */

  /** Currently authenticated user (null = show login screen) */
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  /** Active page/screen (replaces MDI child form activation) */
  const [activePage, setActivePage] = useState<PageId>('vehicle-entry');

  /** Master data state — replaces direct DB reads per form */
  const [products, setProducts] = useState(sampleProducts);
  const [customers, setCustomers] = useState(sampleCustomers);
  const [suppliers, setSuppliers] = useState(sampleSuppliers);
  const [vehicles, setVehicles] = useState(sampleVehicles);
  const [roles, setRoles] = useState<RoleMaster[]>(sampleRoles);
  const [users, setUsers] = useState(sampleUsers);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [bays, setBays] = useState<BayMaster[]>(sampleBays);

  /** Tickets — the core transactional data */
  const [tickets, setTickets] = useState<Ticket[]>(() => generateSampleTickets());

  /** Vehicle Entries, Delivery Orders & Multi-Weighment Sessions */
  const [vehicleEntries, setVehicleEntries] = useState<VehicleEntry[]>(initialVehicleEntries);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrderPlan[]>(initialDeliveryOrders);
  const [multiWeighmentSessions, setMultiWeighmentSessions] = useState<MultiWeighmentSession[]>(initialMultiWeighmentSessions);
  const [warehouseEmployees] = useState<WarehouseEmployee[]>(sampleWarehouseEmployees);

  // Targets passed across pages
  const [targetVehicleEntryId, setTargetVehicleEntryId] = useState<number | undefined>(undefined);
  const [targetDeliveryOrderId, setTargetDeliveryOrderId] = useState<number | undefined>(undefined);

  /** Derived data — computed from tickets (replaces stored procedures) */
  const transactions = useMemo(() => generateTransactions(tickets), [tickets]);
  const dailySummary = useMemo(() => generateDailySummary(tickets), [tickets]);
  const auditLogs = useMemo(() => generateAuditLog(users), [users]);

  const handleUpdateUsers = (newUsers: User[] | ((prev: User[]) => User[])) => {
    setUsers(newUsers);
  };

  useEffect(() => {
    if (currentUser) {
      const updatedUser = users.find((u) => u.id === currentUser.id);
      if (updatedUser && JSON.stringify(updatedUser) !== JSON.stringify(currentUser)) {
        setCurrentUser(updatedUser);
      }
    }
  }, [users, currentUser]);

  const handleSaveVehicleEntry = (entry: VehicleEntry) => {
    setVehicleEntries(prev => [entry, ...prev]);
  };

  const handleSaveDeliveryOrder = (order: DeliveryOrderPlan) => {
    setDeliveryOrders(prev => [order, ...prev]);
    if (order.vehicleEntryId) {
      setVehicleEntries(prev => prev.map(e => e.id === order.vehicleEntryId ? { ...e, vehicleStatus: 'planned' as const, deliveryOrderId: order.id } : e));
    }
  };

  const handleUpdateDeliveryOrder = (updatedOrder: DeliveryOrderPlan) => {
    setDeliveryOrders(prev => prev.map(d => (d.id === updatedOrder.id ? updatedOrder : d)));
    if (updatedOrder.vehicleEntryId) {
      setVehicleEntries(prev =>
        prev.map(e => {
          if (e.id === updatedOrder.vehicleEntryId) {
            return {
              ...e,
              currentLocation: updatedOrder.currentLocation,
              vehicleStatus: (updatedOrder.status === 'exited'
                ? 'exited'
                : updatedOrder.status === 'Checked'
                ? 'checked'
                : 'in_progress') as any,
            };
          }
          return e;
        })
      );
    }
  };

  const handleCompleteExit = (
    doId: number,
    exitData: {
      exitWeightKg: number;
      exitDecision: 'approved' | 'override_approved' | 'rejected';
      exitOfficer: string;
      exitNotes?: string;
      exitedAt: string;
    }
  ) => {
    setDeliveryOrders(prev =>
      prev.map(d => {
        if (d.id === doId) {
          return {
            ...d,
            status: 'exited',
            currentLocation: 'Exited Warehouse Premises',
            exitWeightKg: exitData.exitWeightKg,
            exitGateDecision: exitData.exitDecision,
            exitGateOfficer: exitData.exitOfficer,
            exitGateNotes: exitData.exitNotes,
            exitedAt: exitData.exitedAt,
          };
        }
        return d;
      })
    );

    const targetDO = deliveryOrders.find(d => d.id === doId);
    if (targetDO) {
      setVehicleEntries(prev =>
        prev.map(e => {
          if (e.id === targetDO.vehicleEntryId || e.slipNo === targetDO.slipNo) {
            return {
              ...e,
              vehicleStatus: 'exited',
              currentLocation: 'Exited Warehouse Premises',
            };
          }
          return e;
        })
      );
    }
  };

  const handleSaveMultiWeighmentSession = (sess: MultiWeighmentSession) => {
    setMultiWeighmentSessions(prev => {
      const idx = prev.findIndex(s => s.id === sess.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = sess;
        return copy;
      }
      return [sess, ...prev];
    });

    // Synchronize status, location, checking, and billing with delivery orders
    setDeliveryOrders(prev => prev.map(d => {
      if (d.id === sess.deliveryOrderId || d.doNumber === sess.doNumber) {
        return {
          ...d,
          status: sess.status as any,
          currentLocation: sess.currentLocation || d.currentLocation,
          checkingStatus: sess.checkingStatus || d.checkingStatus,
          checkerName: sess.checkerName || d.checkerName,
          checkedAt: sess.checkedAt || d.checkedAt,
          discrepancyNotes: sess.discrepancyNotes || d.discrepancyNotes,
          billingSettled: sess.billingSettled ?? d.billingSettled,
          exitedAt: sess.exitedAt || d.exitedAt,
        };
      }
      return d;
    }));
  };

  const navigateToPlanning = (entryId?: number) => {
    setTargetVehicleEntryId(entryId);
    setActivePage('planning');
  };

  const navigateToWeighment = (doId?: number) => {
    setTargetDeliveryOrderId(doId);
    setActivePage('multi-weighment');
  };

  /* ══════════════════════════════════════════════════════════════════════
   * EVENT HANDLERS
   * These replace VB6 form event procedures (cmdSave_Click, etc.)
   * ══════════════════════════════════════════════════════════════════════ */

  /**
   * Handle successful login
   * VB6 equivalent: frmLogin.cmdLogin_Click → set modGlobal.g_UserID, etc.
   */
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setActivePage('vehicle-entry');
  };

  /**
   * Handle logout
   * VB6 equivalent: frmMain.mnuFileExit_Click or End statement
   */
  const handleLogout = () => {
    setCurrentUser(null);
    setActivePage('vehicle-entry');
  };

  /**
   * Handle new weigh-in ticket creation
   * VB6 equivalent: frmWeighIn.cmdSave_Click → INSERT INTO TICKETS
   */
  const handleWeighIn = (ticket: Ticket) => {
    setTickets(prev => [...prev, ticket]);
  };

  /**
   * Handle weigh-out completion (close ticket)
   * VB6 equivalent: frmWeighOut.cmdComplete_Click → UPDATE TICKETS + SP_CLOSE_TICKET
   *
   * This function:
   * 1. Records the tare weight
   * 2. Calculates net weight (gross - tare)
   * 3. Calculates total amount (net × unit price)
   * 4. Changes ticket status to 'closed'
   * 5. Records the weigh-out timestamp
   */
  const handleWeighOut = (ticketId: number, tareWeight: number) => {
    setTickets(prev => prev.map(t => {
      if (t.id !== ticketId) return t;
      const netWeight = (t.grossWeight || 0) - tareWeight;
      const totalAmount = Math.round(netWeight * (t.unitPrice || 0) * 100) / 100;
      return {
        ...t,
        tareWeight,
        netWeight,
        totalAmount,
        status: 'closed' as const,
        weighOutAt: formatNow(),
      };
    }));
  };

  /**
   * Handle ticket voiding
   * VB6 equivalent: right-click → Void on ticket grid
   */
  const handleVoidTicket = (ticketId: number, reason: string) => {
    setTickets(prev => prev.map(t =>
      t.id === ticketId ? { ...t, status: 'voided' as const, voidReason: reason } : t
    ));
  };

  /* ══════════════════════════════════════════════════════════════════════
   * PAGE ROUTER
   * Replaces: VB6 MDI child form Show/Hide logic
   *
   * In VB6, opening a screen was done via:
   *   frmProduct.Show vbModal  (or vbModeless)
   *
   * Here we conditionally render the active page component.
   * Each page receives only the data and callbacks it needs.
   * ══════════════════════════════════════════════════════════════════════ */
  const renderPage = () => {
    if (!currentUser) return null;

    switch (activePage) {
      case 'dashboard':
        return (
          <DashboardPage
            tickets={tickets}
            summary={dailySummary}
            user={currentUser}
            onNavigate={(p) => setActivePage(p as PageId)}
            enableUnloading={settings.enableUnloading}
            deliveryOrders={deliveryOrders}
          />
        );

      case 'vehicle-entry':
        return (
          <VehicleEntryPage
            entries={vehicleEntries}
            customers={customers}
            vehicles={vehicles}
            products={products}
            operatorId={currentUser.id}
            operatorName={currentUser.name}
            onSaveEntry={handleSaveVehicleEntry}
            onNavigateToPlanning={navigateToPlanning}
          />
        );

      case 'planning':
        return (
          <PlanningPage
            entries={vehicleEntries}
            deliveryOrders={deliveryOrders}
            employees={warehouseEmployees}
            products={products}
            bays={bays}
            selectedVehicleEntryId={targetVehicleEntryId}
            onSaveDeliveryOrder={handleSaveDeliveryOrder}
            onNavigateToWeighment={navigateToWeighment}
          />
        );

      case 'weigh-in':
        return (
          <WeighInPage
            products={products}
            customers={customers}
            suppliers={suppliers}
            vehicles={vehicles}
            deliveryOrders={deliveryOrders}
            bays={bays}
            operatorId={currentUser.id}
            operatorName={currentUser.name}
            onSave={handleWeighIn}
            onUpdateDeliveryOrder={handleUpdateDeliveryOrder}
            onNavigateToChecking={(doId) => {
              setTargetDeliveryOrderId(doId);
              setActivePage('checking');
            }}
          />
        );

      case 'weigh-out':
        if (!settings.enableUnloading) {
          return (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center max-w-lg mx-auto mt-12">
              <h3 className="text-lg font-bold text-amber-800">Unloading Operations Disabled</h3>
              <p className="text-sm text-slate-600 mt-2">
                Unloading has been disabled in system configuration by the Administrator.
              </p>
              <button
                onClick={() => setActivePage('dashboard')}
                className="mt-4 px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900"
              >
                Return to Dashboard
              </button>
            </div>
          );
        }
        return (
          <WeighOutPage
            tickets={tickets}
            deliveryOrders={deliveryOrders}
            bays={bays}
            onComplete={handleWeighOut}
            onUpdateDeliveryOrder={handleUpdateDeliveryOrder}
            onNavigateToChecking={(doId) => {
              setTargetDeliveryOrderId(doId);
              setActivePage('checking');
            }}
          />
        );

      case 'checking':
        return (
          <CheckingPage
            deliveryOrders={deliveryOrders}
            employees={warehouseEmployees}
            currentUser={currentUser}
            onUpdateDeliveryOrder={handleUpdateDeliveryOrder}
            onNavigateToExitGate={(doId) => {
              setTargetDeliveryOrderId(doId);
              setActivePage('exit-gate');
            }}
          />
        );

      case 'exit-gate':
        return (
          <ExitGatePage
            deliveryOrders={deliveryOrders}
            vehicleEntries={vehicleEntries}
            currentUser={currentUser}
            onCompleteExit={handleCompleteExit}
          />
        );

      case 'multi-weighment':
        return (
          <MultiWeighmentPage
            deliveryOrders={deliveryOrders}
            sessions={multiWeighmentSessions}
            currentUser={currentUser}
            selectedDOId={targetDeliveryOrderId}
            onSaveSession={handleSaveMultiWeighmentSession}
          />
        );

      case 'bay-master':
        return (
          <BayMasterPage
            bays={bays}
            handlers={warehouseEmployees}
            products={products}
            onUpdateBays={setBays}
            currentUserRole={currentUser.role}
          />
        );

      case 'tickets':
        return <TicketsPage tickets={tickets} onVoid={handleVoidTicket} />;

      case 'products':
        return <ProductsPage products={products} onUpdate={setProducts} />;

      case 'customers':
        return <CustomersPage customers={customers} onUpdate={setCustomers} />;

      case 'suppliers':
        return <SuppliersPage suppliers={suppliers} onUpdate={setSuppliers} />;

      case 'vehicles':
        return <VehiclesPage vehicles={vehicles} onUpdate={setVehicles} />;

      case 'transactions':
        return <TransactionsPage transactions={transactions} />;

      case 'daily-summary':
        return <DailySummaryPage summary={dailySummary} />;

      case 'reports':
        return (
          <ReportsPage
            tickets={tickets}
            sessions={multiWeighmentSessions}
            deliveryOrders={deliveryOrders}
            summary={dailySummary}
          />
        );

      case 'roles':
        return (
          <RolesPage
            roles={roles}
            onUpdateRoles={setRoles}
            currentUserRole={currentUser.role}
          />
        );

      case 'users':
        return <UsersPage users={users} roles={roles} onUpdate={handleUpdateUsers} />;

      case 'settings':
        return (
          <SettingsPage
            settings={settings}
            onUpdate={setSettings}
            currentUserRole={currentUser.role}
          />
        );

      case 'audit-log':
        return <AuditLogPage logs={auditLogs} />;

      case 'backup':
        return <BackupPage />;

      case 'about':
        return <AboutPage />;

      default:
        return (
          <DashboardPage
            tickets={tickets}
            summary={dailySummary}
            user={currentUser}
            onNavigate={(p) => setActivePage(p as PageId)}
            enableUnloading={settings.enableUnloading}
          />
        );
    }
  };

  /* ══════════════════════════════════════════════════════════════════════
   * RENDER
   * ══════════════════════════════════════════════════════════════════════ */

  // Not logged in → show login page (replaces frmLogin.Show vbModal)
  if (!currentUser) {
    return <LoginPage users={users} onLogin={handleLogin} />;
  }

  // Logged in → show sidebar + active page (replaces MDI form)
  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar navigation (replaces MDI menu bar) */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
        userName={currentUser.name}
        userRole={currentUser.role}
        enableUnloading={settings.enableUnloading}
      />

      {/* Main content area (replaces MDI client area) */}
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-[1400px] mx-auto">
          <ErrorBoundary>
            {renderPage()}
          </ErrorBoundary>
        </div>
      </main>
    </div>
  );
}
