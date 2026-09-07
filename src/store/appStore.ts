/**
 * ============================================================================
 * WS SERIES — APPLICATION STATE STORE
 * ============================================================================
 *
 * Centralized state management for the entire application.
 * This replaces the VB6 approach of using:
 *   - modGlobal.bas global variables (g_CurrentUser, g_CompanyName, etc.)
 *   - Form-level variables
 *   - Direct database reads for every screen refresh
 *
 * ARCHITECTURE:
 *   In the full production app, this would be split into:
 *     - Zustand stores for client state (auth, UI preferences)
 *     - TanStack Query for server state (products, tickets, etc.)
 *   For this demo, we use React state via a context provider.
 *
 * DATA NOTES:
 *   All sample data below mirrors what would exist in the Firebird 2.5
 *   database tables (PRODUCTS, CUSTOMERS, SUPPLIERS, VEHICLES, TICKETS, etc.)
 * ============================================================================
 */

import type {
  User, Product, Customer, Supplier, Vehicle,
  Ticket, Transaction, AppSettings, AuditLog, DailySummary,
  VehicleEntry, WarehouseEmployee, DeliveryOrderPlan,
  MultiWeighmentSession, RoleMaster,
} from '../types';

// ── Helper: generate sequential IDs ───────────────────────────────────────
let _nextId = 1000;
/** Generates a unique auto-increment ID (replaces Firebird GENERATORs) */
export function nextId(): number {
  return _nextId++;
}

// ── Helper: format date for display ───────────────────────────────────────
export function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}
export function formatDateTime(d: Date): string {
  return d.toISOString().replace('T', ' ').substring(0, 19);
}
export function formatNow(): string {
  return formatDateTime(new Date());
}

/** 12-hour format with seconds (e.g. "08:29:20 AM") as per requirement */
export function formatTime12(d: Date = new Date()): string {
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes}:${seconds} ${ampm}`;
}

/** 12-hour format matching thermal entry slip (e.g. "08:29:20") */
export function formatTimeSlip(d: Date = new Date()): string {
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${String(hours).padStart(2, '0')}:${minutes}:${seconds}`;
}

/** Formats elapsed seconds to "Xm Ys" or "X mins Y secs" */
export function formatDuration(seconds: number): string {
  if (seconds < 0) seconds = 0;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${String(secs).padStart(2, '0')}s`;
}

/** Determines whether duration exceeds standard time limit (normal, minor yellow, major red) */
export function getDeviationStatus(durationSeconds: number, standardMinutes: number): 'normal' | 'minor' | 'major' {
  const standardSecs = standardMinutes * 60;
  if (durationSeconds <= standardSecs) return 'normal';
  if (durationSeconds <= standardSecs * 1.25) return 'minor';
  return 'major';
}

// ── Helper: generate sequence numbers ────────────────────────────────────
let _ticketSeq = 1001;
export function nextTicketNo(prefix: string = 'TKT-'): string {
  return `${prefix}${String(_ticketSeq++).padStart(6, '0')}`;
}

let _transSeq = 5001;
export function nextTransNo(): string {
  return `TRN-${String(_transSeq++).padStart(6, '0')}`;
}

let _slipSeq = 11;
export function nextSlipNo(): string {
  return `SR27G${String(_slipSeq++).padStart(3, '0')}`;
}

let _wgtSeq = 910;
export function nextWgtSeqNo(): string {
  return `${_wgtSeq++}`;
}

let _doSeq = 102;
export function nextDONo(): string {
  return `DO-2026-${String(_doSeq++).padStart(5, '0')}`;
}

// ═══════════════════════════════════════════════════════════════════════════
// SAMPLE DATA — mirrors Firebird 2.5 database content
// ═══════════════════════════════════════════════════════════════════════════

/** Sample roles master table (replaces ROLES master table) */
export const sampleRoles: RoleMaster[] = [
  {
    id: 1,
    code: 'system_admin',
    name: 'System Administrator',
    description: 'Highest level of control on the application. Full support access, system configuration, role and user management.',
    level: 1,
    isSystem: true,
    isActive: true,
  },
  {
    id: 2,
    code: 'admin',
    name: 'Administrator',
    description: 'Administrative access for business settings, master data, report auditing, and enabling/disabling unloading operations.',
    level: 2,
    isSystem: true,
    isActive: true,
  },
  {
    id: 3,
    code: 'planner',
    name: 'Planner',
    description: 'Plans vehicle loading/unloading orders, assigns vehicles to supervisors, allocates bays and planned weights.',
    level: 3,
    isSystem: true,
    isActive: true,
  },
  {
    id: 4,
    code: 'supervisor',
    name: 'Warehouse Supervisor',
    description: 'Responsible for ensuring required items in required weights are loaded/unloaded from specific assigned bays.',
    level: 4,
    isSystem: true,
    isActive: true,
  },
  {
    id: 5,
    code: 'handler',
    name: 'Bay Handler',
    description: 'In-charge of handling loading and unloading activity at specific bays and inspecting physical clearances.',
    level: 5,
    isSystem: true,
    isActive: true,
  },
  {
    id: 6,
    code: 'operator',
    name: 'Weighbridge Operator',
    description: 'Gate entry verification, initial tare/gross scale weighment, ticket capture, and billing collection.',
    level: 6,
    isSystem: true,
    isActive: true,
  },
  {
    id: 7,
    code: 'manager',
    name: 'Operations Manager',
    description: 'Daily transaction reviews, financial summaries, supplier/customer limits, and operational oversight.',
    level: 7,
    isSystem: true,
    isActive: true,
  },
  {
    id: 8,
    code: 'viewer',
    name: 'Auditor / Viewer',
    description: 'Read-only access to view daily summaries, weighing tickets, logs, and stage reports.',
    level: 8,
    isSystem: true,
    isActive: true,
  },
];

/** Sample users (replaces USERS table) */
export const sampleUsers: User[] = [
  { id: 0, username: 'sysadmin', name: 'System Support Admin', email: 'sysadmin@wsscale.com', role: 'system_admin', isActive: true, lastLoginAt: '2026-09-07 09:15:00', createdAt: '2024-01-01' },
  { id: 1, username: 'admin', name: 'Administrator', email: 'admin@wsscale.com', role: 'admin', isActive: true, lastLoginAt: '2024-12-01 08:30:00', createdAt: '2024-01-01' },
  { id: 2, username: 'manager1', name: 'Ahmad Razak', email: 'ahmad@wsscale.com', role: 'manager', isActive: true, lastLoginAt: '2024-12-01 07:45:00', createdAt: '2024-01-15' },
  { id: 3, username: 'operator1', name: 'Siti Aminah', email: 'siti@wsscale.com', role: 'operator', isActive: true, lastLoginAt: '2024-12-01 06:00:00', createdAt: '2024-02-01' },
  { id: 4, username: 'operator2', name: 'Muthu Kumar', email: 'muthu@wsscale.com', role: 'operator', isActive: true, lastLoginAt: '2024-11-30 14:00:00', createdAt: '2024-03-01' },
  { id: 5, username: 'viewer1', name: 'Lee Wei Ming', email: 'lee@wsscale.com', role: 'viewer', isActive: false, lastLoginAt: null, createdAt: '2024-06-01' },
  { id: 6, username: 'planner1', name: 'N. Rajesh (Planner)', email: 'rajesh@wsscale.com', role: 'planner', isActive: true, lastLoginAt: '2026-09-07 08:30:00', createdAt: '2024-04-01' },
];

/** Sample products (replaces PRODUCTS table) */
export const sampleProducts: Product[] = [
  { id: 1, code: 'RBR-01', name: 'Natural Rubber (SMR 20)', category: 'Agricultural', unit: 'kg', unitPrice: 5.80, isActive: true },
  { id: 2, code: 'PLM-01', name: 'Palm Oil (Crude)', category: 'Agricultural', unit: 'MT', unitPrice: 3200.00, isActive: true },
  { id: 3, code: 'PLM-02', name: 'Palm Kernel', category: 'Agricultural', unit: 'MT', unitPrice: 1800.00, isActive: true },
  { id: 4, code: 'RCE-01', name: 'White Rice (Grade A)', category: 'Agricultural', unit: 'kg', unitPrice: 2.80, isActive: true },
  { id: 5, code: 'SND-01', name: 'River Sand', category: 'Construction', unit: 'MT', unitPrice: 45.00, isActive: true },
  { id: 6, code: 'GRV-01', name: 'Gravel (20mm)', category: 'Construction', unit: 'MT', unitPrice: 65.00, isActive: true },
  { id: 7, code: 'STL-01', name: 'Scrap Steel', category: 'Industrial', unit: 'MT', unitPrice: 850.00, isActive: true },
  { id: 8, code: 'WOD-01', name: 'Timber Logs', category: 'Agricultural', unit: 'MT', unitPrice: 420.00, isActive: true },
  { id: 9, code: 'FRT-01', name: 'NPK Fertilizer', category: 'Agricultural', unit: 'kg', unitPrice: 1.20, isActive: false },
  { id: 10, code: 'CCN-01', name: 'Coconut (Fresh)', category: 'Agricultural', unit: 'kg', unitPrice: 1.50, isActive: true },
];

/** Sample customers (replaces CUSTOMERS table) */
export const sampleCustomers: Customer[] = [
  { id: 1, code: 'C001', name: 'Syarikat Pembinaan Maju', phone: '03-8888 1234', address: '12, Jalan Industri 3, Shah Alam', creditLimit: 50000, isActive: true },
  { id: 2, code: 'C002', name: 'Kilang Getah Bersatu', phone: '06-7777 5678', address: '45, Kawasan Perindustrian, Melaka', creditLimit: 100000, isActive: true },
  { id: 3, code: 'C003', name: 'Ladang Kelapa Sawit Utara', phone: '04-6666 9012', address: 'Lot 200, Sungai Petani, Kedah', creditLimit: 200000, isActive: true },
  { id: 4, code: 'C004', name: 'Restoran Nasi Kandar Penang', phone: '04-5555 3456', address: '88, Lebuh Chulia, Penang', creditLimit: 10000, isActive: true },
  { id: 5, code: 'C005', name: 'Wong Brothers Construction', phone: '07-4444 7890', address: '33, Jalan Skudai, JB', creditLimit: 75000, isActive: true },
];

/** Sample suppliers (replaces SUPPLIERS table) */
export const sampleSuppliers: Supplier[] = [
  { id: 1, code: 'S001', name: 'Ladang Felda Jengka', phone: '09-3333 1111', address: 'Felda Jengka 25, Pahang', isActive: true },
  { id: 2, code: 'S002', name: 'Kuari Bukit Beruntung', phone: '03-2222 2222', address: 'Lot 50, Bukit Beruntung, Selangor', isActive: true },
  { id: 3, code: 'S003', name: 'Pekebun Kecil Raub', phone: '09-1111 3333', address: 'Kampung Sungai Klau, Raub', isActive: true },
  { id: 4, code: 'S004', name: 'Syarikat Besi Buruk KL', phone: '03-4444 4444', address: '5, Jalan Chan Sow Lin, KL', isActive: true },
  { id: 5, code: 'S005', name: 'Pembalak Terengganu', phone: '09-5555 5555', address: 'Lot 12, Kuala Berang, Terengganu', isActive: true },
];

/** Sample vehicles (replaces VEHICLES table) */
export const sampleVehicles: Vehicle[] = [
  { id: 1, plateNo: 'WA 1234 B', tareWeight: 5200, driverName: 'Abu Bakar', driverPhone: '012-345 6789', isActive: true },
  { id: 2, plateNo: 'BDG 5678 C', tareWeight: 7800, driverName: 'Raju a/l Mani', driverPhone: '013-456 7890', isActive: true },
  { id: 3, plateNo: 'JHR 9012 A', tareWeight: 6100, driverName: 'Ah Kow', driverPhone: '014-567 8901', isActive: true },
  { id: 4, plateNo: 'PKN 3456 D', tareWeight: 8500, driverName: 'Ismail bin Osman', driverPhone: '015-678 9012', isActive: true },
  { id: 5, plateNo: 'KDH 7890 E', tareWeight: null, driverName: 'Suresh Kumar', driverPhone: '016-789 0123', isActive: true },
  { id: 6, plateNo: 'MLK 2345 F', tareWeight: 4800, driverName: 'Lim Ah Seng', driverPhone: '017-890 1234', isActive: true },
];

/**
 * Generate sample tickets (replaces TICKETS table)
 * Creates a mix of open, closed, and voided tickets to demonstrate all states
 */
export function generateSampleTickets(): Ticket[] {
  const now = new Date();
  const tickets: Ticket[] = [];

  // Closed tickets from past days
  for (let d = 7; d >= 1; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);
    const count = 3 + Math.floor(Math.random() * 4);

    for (let i = 0; i < count; i++) {
      const isPurchase = Math.random() > 0.4;
      const product = sampleProducts[Math.floor(Math.random() * 8)];
      const vehicle = sampleVehicles[Math.floor(Math.random() * 6)];
      const gross = 10000 + Math.floor(Math.random() * 30000);
      const tare = vehicle.tareWeight || (4000 + Math.floor(Math.random() * 4000));
      const net = gross - tare;
      const amount = net * product.unitPrice / (product.unit === 'MT' ? 1000 : 1);

      const customer = isPurchase ? null : sampleCustomers[Math.floor(Math.random() * 5)];
      const supplier = isPurchase ? sampleSuppliers[Math.floor(Math.random() * 5)] : null;
      const operator = sampleUsers[2 + Math.floor(Math.random() * 2)];

      const weighInTime = new Date(date);
      weighInTime.setHours(6 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60));
      const weighOutTime = new Date(weighInTime);
      weighOutTime.setMinutes(weighOutTime.getMinutes() + 30 + Math.floor(Math.random() * 120));

      tickets.push({
        id: nextId(),
        ticketNo: nextTicketNo(),
        type: isPurchase ? 'purchase' : 'sale',
        status: 'closed',
        productId: product.id,
        productName: product.name,
        customerId: customer?.id ?? null,
        customerName: customer?.name ?? null,
        supplierId: supplier?.id ?? null,
        supplierName: supplier?.name ?? null,
        vehicleId: vehicle.id,
        vehiclePlateNo: vehicle.plateNo,
        grossWeight: gross,
        tareWeight: tare,
        netWeight: net,
        weighInAt: formatDateTime(weighInTime),
        weighOutAt: formatDateTime(weighOutTime),
        unitPrice: product.unitPrice,
        totalAmount: Math.round(amount * 100) / 100,
        notes: '',
        voidReason: null,
        operatorId: operator.id,
        operatorName: operator.name,
        createdAt: formatDateTime(weighInTime),
      });
    }
  }

  // A couple of open tickets (awaiting weigh-out) for today
  for (let i = 0; i < 3; i++) {
    const product = sampleProducts[i];
    const vehicle = sampleVehicles[i];
    const supplier = sampleSuppliers[i];
    const gross = 15000 + Math.floor(Math.random() * 20000);
    const weighInTime = new Date(now);
    weighInTime.setHours(weighInTime.getHours() - 2 + i);

    tickets.push({
      id: nextId(),
      ticketNo: nextTicketNo(),
      type: 'purchase',
      status: 'open',
      productId: product.id,
      productName: product.name,
      customerId: null,
      customerName: null,
      supplierId: supplier.id,
      supplierName: supplier.name,
      vehicleId: vehicle.id,
      vehiclePlateNo: vehicle.plateNo,
      grossWeight: gross,
      tareWeight: null,
      netWeight: null,
      weighInAt: formatDateTime(weighInTime),
      weighOutAt: null,
      unitPrice: product.unitPrice,
      totalAmount: null,
      notes: '',
      voidReason: null,
      operatorId: 3,
      operatorName: 'Siti Aminah',
      createdAt: formatDateTime(weighInTime),
    });
  }

  // One voided ticket
  tickets.push({
    id: nextId(),
    ticketNo: nextTicketNo(),
    type: 'sale',
    status: 'voided',
    productId: 5,
    productName: 'River Sand',
    customerId: 1,
    customerName: 'Syarikat Pembinaan Maju',
    supplierId: null,
    supplierName: null,
    vehicleId: 3,
    vehiclePlateNo: 'JHR 9012 A',
    grossWeight: 22000,
    tareWeight: 6100,
    netWeight: 15900,
    weighInAt: formatDateTime(new Date(now.getTime() - 86400000 * 3)),
    weighOutAt: formatDateTime(new Date(now.getTime() - 86400000 * 3 + 3600000)),
    unitPrice: 45,
    totalAmount: 715.50,
    notes: 'Wrong product selected',
    voidReason: 'Incorrect product — customer wanted Gravel not Sand',
    operatorId: 3,
    operatorName: 'Siti Aminah',
    createdAt: formatDateTime(new Date(now.getTime() - 86400000 * 3)),
  });

  return tickets;
}

/** Generate transactions from closed tickets (replaces SP_CLOSE_TICKET) */
export function generateTransactions(tickets: Ticket[]): Transaction[] {
  return tickets
    .filter(t => t.status === 'closed')
    .map(t => ({
      id: nextId(),
      transNo: nextTransNo(),
      type: t.type,
      ticketId: t.id,
      ticketNo: t.ticketNo,
      customerName: t.customerName,
      supplierName: t.supplierName,
      totalWeight: t.netWeight!,
      totalAmount: t.totalAmount!,
      paidAmount: Math.random() > 0.3 ? t.totalAmount! : Math.round(t.totalAmount! * Math.random() * 100) / 100,
      status: Math.random() > 0.3 ? 'paid' : Math.random() > 0.5 ? 'partial' : 'unpaid',
      createdAt: t.weighOutAt!,
    }));
}

/** Default application settings (replaces SETTINGS + COMPANY tables) */
export const defaultSettings: AppSettings = {
  companyName: 'WS Series Weighing Services Pvt Ltd',
  companyAddress: 'Plot No. 42, Industrial Estate Phase II,\nAmbattur, Chennai,\nTamil Nadu 600058',
  companyPhone: '+91 44 2828 1234',
  scalePort: 'COM3',
  scaleBaudRate: 9600,
  scaleProtocol: 'Generic ASCII',
  printerName: 'EPSON TM-T82',
  ticketPrefix: 'TKT-',
  currency: '₹',
  weightDecimals: 2,
  enableUnloading: true,
};

/** Generate sample audit log entries */
export function generateAuditLog(_users: User[]): AuditLog[] {
  const actions: AuditLog[] = [];
  const now = new Date();
  let id = 1;

  for (let d = 5; d >= 0; d--) {
    const date = new Date(now);
    date.setDate(date.getDate() - d);

    // Login events
    actions.push({
      id: id++, userId: 3, userName: 'Siti Aminah',
      action: 'login', entity: 'session', entityId: 0,
      description: 'User logged in from 192.168.1.50',
      createdAt: formatDateTime(new Date(date.setHours(6, 0))),
    });

    // Data operations
    actions.push({
      id: id++, userId: 3, userName: 'Siti Aminah',
      action: 'create', entity: 'ticket', entityId: 1000 + d,
      description: `Created ticket TKT-${1000 + d} — Purchase of Natural Rubber`,
      createdAt: formatDateTime(new Date(date.setHours(7, 30))),
    });

    actions.push({
      id: id++, userId: 3, userName: 'Siti Aminah',
      action: 'update', entity: 'ticket', entityId: 1000 + d,
      description: `Completed weigh-out for TKT-${1000 + d} — Net weight: 12,500 kg`,
      createdAt: formatDateTime(new Date(date.setHours(9, 15))),
    });

    if (d === 3) {
      actions.push({
        id: id++, userId: 1, userName: 'Administrator',
        action: 'void', entity: 'ticket', entityId: 1003,
        description: 'Voided ticket TKT-001003 — Reason: Incorrect product selected',
        createdAt: formatDateTime(new Date(date.setHours(10, 0))),
      });
    }
  }

  // Admin activities
  actions.push({
    id: id++, userId: 1, userName: 'Administrator',
    action: 'update', entity: 'settings', entityId: 0,
    description: 'Updated company address and phone number',
    createdAt: formatDateTime(new Date(now.setHours(8, 0))),
  });

  actions.push({
    id: id++, userId: 1, userName: 'Administrator',
    action: 'create', entity: 'user', entityId: 5,
    description: 'Created new user account: Lee Wei Ming (viewer)',
    createdAt: formatDateTime(new Date(now.setHours(8, 30))),
  });

  return actions.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Generate daily summary data (replaces SP_DAILY_SUMMARY) */
export function generateDailySummary(tickets: Ticket[]): DailySummary[] {
  const grouped = new Map<string, Ticket[]>();

  for (const t of tickets) {
    if (t.status === 'voided') continue;
    const date = t.createdAt.split(' ')[0];
    if (!grouped.has(date)) grouped.set(date, []);
    grouped.get(date)!.push(t);
  }

  const summaries: DailySummary[] = [];
  for (const [date, dayTickets] of grouped) {
    const purchases = dayTickets.filter(t => t.type === 'purchase');
    const sales = dayTickets.filter(t => t.type === 'sale');
    const totalWeight = dayTickets.reduce((sum, t) => sum + (t.netWeight || 0), 0);
    const totalAmount = dayTickets.reduce((sum, t) => sum + (t.totalAmount || 0), 0);

    // Find top product
    const productCounts = new Map<string, number>();
    dayTickets.forEach(t => productCounts.set(t.productName, (productCounts.get(t.productName) || 0) + 1));
    const topProduct = [...productCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    // Find top customer/supplier
    const partyCounts = new Map<string, number>();
    dayTickets.forEach(t => {
      const name = t.customerName || t.supplierName || '-';
      partyCounts.set(name, (partyCounts.get(name) || 0) + 1);
    });
    const topCustomer = [...partyCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || '-';

    summaries.push({
      date,
      totalTickets: dayTickets.length,
      purchaseTickets: purchases.length,
      saleTickets: sales.length,
      totalWeight,
      totalAmount: Math.round(totalAmount * 100) / 100,
      topProduct,
      topCustomer,
    });
  }

  return summaries.sort((a, b) => b.date.localeCompare(a.date));
}

// ═══════════════════════════════════════════════════════════════════════════
// WAREHOUSE OPERATIONS & MULTI-WEIGHMENT DATA
// ═══════════════════════════════════════════════════════════════════════════

/** Standard prescribed time limits in minutes (as per Initial Requirement.txt) */
export const standardTimeLimits = {
  planningMinutes: 10,
  bayLoadingMinutes: 20,
  weighmentIntervalMinutes: 15,
  totalWarehouseMinutes: 60,
  billingMinutes: 10,
};

/** Warehouse personnel: Planners, Supervisors and Bay Handlers */
export const sampleWarehouseEmployees: WarehouseEmployee[] = [
  { id: 301, name: 'N. Rajesh', role: 'planner', phone: '98405 67890', isActive: true },
  { id: 302, name: 'K. Senthil', role: 'planner', phone: '98406 78901', isActive: true },
  { id: 101, name: 'K. Murugan', role: 'supervisor', phone: '98401 23456', isActive: true },
  { id: 102, name: 'R. Anand', role: 'supervisor', phone: '98402 34567', isActive: true },
  { id: 103, name: 'V. Selvam', role: 'supervisor', phone: '98403 45678', isActive: true },
  { id: 201, name: 'S. Mani', role: 'handler', phone: '97101 11223', isActive: true },
  { id: 202, name: 'P. Kumar', role: 'handler', phone: '97102 22334', isActive: true },
  { id: 203, name: 'D. Rajesh', role: 'handler', phone: '97103 33445', isActive: true },
  { id: 204, name: 'M. Arumugam', role: 'handler', phone: '97104 44556', isActive: true },
  { id: 205, name: 'T. Saravanan', role: 'handler', phone: '97105 55667', isActive: true },
];

/** Sample Vehicle Entries at Gate / Entry Point */
export const initialVehicleEntries: VehicleEntry[] = [
  {
    id: 1,
    slipNo: 'SR27G010',
    entryTime: '08:29:20 AM',
    entryDate: '2026-09-06',
    vehicleType: 'Truck',
    vehicleNumber: 'TN38CW6762',
    driverName: 'MS',
    mobileNumber: 'RANGA',
    customerName: 'Meghalai steels',
    material: 'TMT Steel Bars',
    firstWgtSeqNo: '908',
    entryWeight: 2690,
    approvalStatus: 'Approved',
    rejectReason: null,
    operatorId: 3,
    operatorName: 'Siti Aminah',
    advanceBalance: 15000,
    creditLimit: 50000,
    notes: 'Pre-inspected. Authorized for high-tensile rebar loading.',
    createdAt: '2026-09-06 08:29:20',
  },
  {
    id: 2,
    slipNo: 'SR27G008',
    entryTime: '07:15:10 AM',
    entryDate: '2026-09-06',
    vehicleType: 'Lorry',
    vehicleNumber: 'TN42DX8819',
    driverName: 'G. Suresh',
    mobileNumber: '98412 88771',
    customerName: 'Syarikat Pembinaan Maju',
    material: 'River Sand & Gravel',
    firstWgtSeqNo: '906',
    entryWeight: 4200,
    approvalStatus: 'Approved',
    rejectReason: null,
    operatorId: 3,
    operatorName: 'Siti Aminah',
    advanceBalance: 8500,
    creditLimit: 50000,
    notes: 'Multi-bay loading order.',
    createdAt: '2026-09-06 07:15:10',
  },
  {
    id: 3,
    slipNo: 'SR27G009',
    entryTime: '07:45:00 AM',
    entryDate: '2026-09-06',
    vehicleType: 'Trailer',
    vehicleNumber: 'KA01MJ4412',
    driverName: 'Ramesh Patel',
    mobileNumber: '97401 55662',
    customerName: 'Wong Brothers Construction',
    material: 'Scrap Steel',
    firstWgtSeqNo: '907',
    entryWeight: 6850,
    approvalStatus: 'Rejected',
    rejectReason: 'Payment balances overdue and exceeds allowable credit limit.',
    operatorId: 3,
    operatorName: 'Siti Aminah',
    advanceBalance: 0,
    creditLimit: 75000,
    notes: 'Rejected at gate. Finance clearance required.',
    createdAt: '2026-09-06 07:45:00',
  },
];

/** Sample Delivery Orders (Generated after Planning phase) */
export const initialDeliveryOrders: DeliveryOrderPlan[] = [
  {
    id: 1,
    doNumber: 'DO-2026-00101',
    vehicleEntryId: 2,
    slipNo: 'SR27G008',
    vehicleNumber: 'TN42DX8819',
    vehicleType: 'Lorry',
    driverName: 'G. Suresh',
    driverPhone: '98412 88771',
    customerName: 'Syarikat Pembinaan Maju',
    material: 'River Sand & Gravel',
    plannerName: 'N. Rajesh',
    plannerId: 301,
    supervisorName: 'K. Murugan',
    supervisorId: 101,
    baysCount: 2,
    items: [
      {
        id: 'p1',
        bayNumber: 1,
        bayName: 'Bay 1 (North Bulk Hopper)',
        handlerName: 'S. Mani',
        handlerId: 201,
        itemCode: 'SND-01',
        itemName: 'River Sand',
        plannedWeightKg: 8500,
        notes: 'Coarse grade river sand',
      },
      {
        id: 'p2',
        bayNumber: 2,
        bayName: 'Bay 2 (Aggregate Chute)',
        handlerName: 'P. Kumar',
        handlerId: 202,
        itemCode: 'GRV-01',
        itemName: 'Gravel (20mm)',
        plannedWeightKg: 6000,
        notes: 'Standard 20mm washed gravel',
      },
    ],
    totalPlannedWeightKg: 14500,
    inTime: '07:15:10 AM',
    planningStartTime: '07:18:00 AM',
    planningEndTime: '07:22:45 AM',
    planningDurationSeconds: 285, // 04m 45s
    outTime: '07:23:00 AM',
    status: 'in_progress',
    createdAt: '2026-09-06 07:22:45',
  },
  {
    id: 2,
    doNumber: 'DO-2026-00102',
    vehicleEntryId: 1,
    slipNo: 'SR27G010',
    vehicleNumber: 'TN38CW6762',
    vehicleType: 'Truck',
    driverName: 'MS',
    driverPhone: '98401 99882',
    customerName: 'Meghalai steels',
    material: 'TMT Steel Bars',
    plannerName: 'N. Rajesh',
    plannerId: 301,
    supervisorName: 'R. Anand',
    supervisorId: 102,
    baysCount: 1,
    items: [
      {
        id: 'p3',
        bayNumber: 3,
        bayName: 'Bay 3 (Steel Gantry)',
        handlerName: 'D. Rajesh',
        handlerId: 203,
        itemCode: 'STL-01',
        itemName: 'Scrap Steel',
        plannedWeightKg: 12000,
        notes: 'Heavy structural scrap steel for unloading',
      },
    ],
    totalPlannedWeightKg: 12000,
    inTime: '08:29:20 AM',
    planningStartTime: '08:31:00 AM',
    planningEndTime: '08:34:30 AM',
    planningDurationSeconds: 210, // 03m 30s
    outTime: '08:35:00 AM',
    status: 'completed',
    createdAt: '2026-09-06 08:34:30',
  },
];

/** Sample Multi-Weighment Sessions with Stage-to-Stage Timestamps */
export const initialMultiWeighmentSessions: MultiWeighmentSession[] = [
  {
    id: 1,
    deliveryOrderId: 1,
    doNumber: 'DO-2026-00101',
    vehicleEntryId: 2,
    slipNo: 'SR27G008',
    vehicleNumber: 'TN42DX8819',
    customerName: 'Syarikat Pembinaan Maju',
    driverName: 'G. Suresh',
    transporterName: 'FastTrack Logistics',
    plannerName: 'N. Rajesh',
    supervisorName: 'K. Murugan',
    operationMode: 'loading',
    tareWeightKg: 4200,
    finalGrossWeightKg: 18780,
    totalNetWeightKg: 14580,
    totalPlannedWeightKg: 14500,
    weightVarianceKg: 80,
    weighments: [
      {
        weighmentIndex: 1,
        stageName: '1st Weighment (Tare / Empty Vehicle)',
        capturedWeightKg: 4200,
        incrementalLoadWeightKg: 0,
        previousWeightKg: 0,
        grossWeightKg: 4200,
        timestamp: '07:25:30 AM',
        timeSinceLastWeighmentSeconds: 0,
        scaleStation: 'Scale #1 (Entrance Weighbridge)',
      },
      {
        weighmentIndex: 2,
        stageName: '2nd Weighment (Bay 1 — River Sand)',
        bayNumber: 1,
        capturedWeightKg: 12720,
        incrementalLoadWeightKg: 8520,
        previousWeightKg: 4200,
        grossWeightKg: 12720,
        timestamp: '07:44:15 AM',
        timeSinceLastWeighmentSeconds: 1125, // 18m 45s
        scaleStation: 'Scale #2 (Intermediate Scale)',
      },
      {
        weighmentIndex: 3,
        stageName: '3rd Weighment (Bay 2 — Gravel 20mm)',
        bayNumber: 2,
        capturedWeightKg: 18780,
        incrementalLoadWeightKg: 6060,
        previousWeightKg: 12720,
        grossWeightKg: 18780,
        timestamp: '08:04:30 AM',
        timeSinceLastWeighmentSeconds: 1215, // 20m 15s
        scaleStation: 'Scale #3 (Exit Weighbridge)',
      },
    ],
    bayLoadings: [
      {
        bayNumber: 1,
        bayName: 'Bay 1 (North Bulk Hopper)',
        handlerName: 'S. Mani',
        itemName: 'River Sand',
        plannedWeightKg: 8500,
        actualLoadedWeightKg: 8520,
        previousWeightKg: 4200,
        grossWeightKg: 12720,
        timeBeforeLoading: '07:27:00 AM',
        loadStartTime: '07:29:10 AM',
        loadEndTime: '07:41:20 AM',
        timeAfterLoading: '07:43:00 AM',
        loadingDurationSeconds: 730, // 12m 10s
        deviationStatus: 'normal',
        activityType: 'loading',
      },
      {
        bayNumber: 2,
        bayName: 'Bay 2 (Aggregate Chute)',
        handlerName: 'P. Kumar',
        itemName: 'Gravel (20mm)',
        plannedWeightKg: 6000,
        actualLoadedWeightKg: 6060,
        previousWeightKg: 12720,
        grossWeightKg: 18780,
        timeBeforeLoading: '07:47:00 AM',
        loadStartTime: '07:49:00 AM',
        loadEndTime: '08:01:45 AM',
        timeAfterLoading: '08:03:15 AM',
        loadingDurationSeconds: 765, // 12m 45s
        deviationStatus: 'normal',
        activityType: 'loading',
      },
    ],
    inTime: '07:15:10 AM',
    planningTime: '04m 45s',
    planningDurationSeconds: 285,
    outTime: '07:23:00 AM',
    warehouseStartTime: '07:25:30 AM',
    warehouseEndTime: '08:08:10 AM',
    warehouseTimeSeconds: 2560, // 42m 40s
    billingStartTime: '08:08:30 AM',
    billingEndTime: '08:12:15 AM',
    billingTimeSeconds: 225, // 03m 45s
    weighingCharges: 60.00,
    paymentMode: 'GPay',
    billingStatus: 'completed',
    exitTime: '08:14:00 AM',
    totalTurnaroundSeconds: 3530, // 58m 50s
    status: 'billed',
    createdAt: '2026-09-06 07:25:30',
  },
  {
    id: 2,
    deliveryOrderId: 2,
    doNumber: 'DO-2026-00102',
    vehicleEntryId: 1,
    slipNo: 'SR27G010',
    vehicleNumber: 'TN38CW6762',
    customerName: 'Meghalai steels',
    driverName: 'MS',
    transporterName: 'Meghalai Transports',
    plannerName: 'N. Rajesh',
    supervisorName: 'R. Anand',
    operationMode: 'unloading',
    tareWeightKg: 2690,
    finalGrossWeightKg: 14750,
    totalNetWeightKg: 12060,
    totalPlannedWeightKg: 12000,
    weightVarianceKg: 60,
    weighments: [
      {
        weighmentIndex: 1,
        stageName: '1st Weighment (Initial Gross Weight)',
        capturedWeightKg: 14750,
        incrementalLoadWeightKg: 0,
        previousWeightKg: 0,
        grossWeightKg: 14750,
        timestamp: '08:36:10 AM',
        timeSinceLastWeighmentSeconds: 0,
        scaleStation: 'Scale #1 (Entrance Weighbridge)',
      },
      {
        weighmentIndex: 2,
        stageName: '2nd Weighment (Bay 3 — Unloaded Weight)',
        bayNumber: 3,
        capturedWeightKg: 2690,
        incrementalLoadWeightKg: 12060,
        previousWeightKg: 14750,
        grossWeightKg: 2690,
        timestamp: '08:58:30 AM',
        timeSinceLastWeighmentSeconds: 1340, // 22m 20s
        scaleStation: 'Scale #3 (Exit Weighbridge)',
      },
    ],
    bayLoadings: [
      {
        bayNumber: 3,
        bayName: 'Bay 3 (Steel Gantry)',
        handlerName: 'D. Rajesh',
        itemName: 'Scrap Steel',
        plannedWeightKg: 12000,
        actualLoadedWeightKg: 12060,
        previousWeightKg: 14750,
        grossWeightKg: 2690,
        timeBeforeLoading: '08:38:00 AM',
        loadStartTime: '08:40:15 AM',
        loadEndTime: '08:54:30 AM',
        timeAfterLoading: '08:56:45 AM',
        loadingDurationSeconds: 855, // 14m 15s
        deviationStatus: 'normal',
        activityType: 'unloading',
      },
    ],
    inTime: '08:29:20 AM',
    planningTime: '03m 30s',
    planningDurationSeconds: 210,
    outTime: '08:35:00 AM',
    warehouseStartTime: '08:36:10 AM',
    warehouseEndTime: '09:00:20 AM',
    warehouseTimeSeconds: 1450, // 24m 10s
    billingStartTime: '09:01:00 AM',
    billingEndTime: '09:03:45 AM',
    billingTimeSeconds: 165, // 02m 45s
    weighingCharges: 80.00,
    paymentMode: 'Net Banking',
    billingStatus: 'completed',
    exitTime: '09:05:30 AM',
    totalTurnaroundSeconds: 2170, // 36m 10s
    status: 'billed',
    createdAt: '2026-09-06 08:36:10',
  },
];

