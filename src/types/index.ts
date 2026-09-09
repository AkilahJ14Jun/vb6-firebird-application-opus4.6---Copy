/**
 * ============================================================================
 * WS SERIES — WEIGHING SCALE MANAGEMENT SYSTEM
 * Type Definitions
 * ============================================================================
 *
 * This file contains all TypeScript type/interface definitions used across
 * the application. Each type maps to a database entity or UI structure from
 * the original VB6 application.
 *
 * LEGACY MAPPING:
 *   - VB6 used untyped Variants and global variables (modGlobal.bas)
 *   - This module replaces those with strongly-typed interfaces
 * ============================================================================
 */

/* ── User & Authentication ─────────────────────────────────────────────────
 * Replaces: frmLogin, frmUserMgmt, modGlobal (g_CurrentUser)
 * Original VB6 stored user info in global variables like g_UserID, g_UserName
 */
export type UserRole =
  | 'system_admin'
  | 'admin'
  | 'planner'
  | 'supervisor'
  | 'handler'
  | 'operator'
  | 'manager'
  | 'viewer'
  | string;

export interface RoleMaster {
  id: number;
  code: string;
  name: string;
  description: string;
  level: number; // 1 = highest (System Admin), 2 = Admin, 3 = Planner, 4 = Supervisor, 5 = Handler, etc.
  isSystem: boolean;
  isActive: boolean;
  createdAt?: string;
}

export interface User {
  /** Unique user identifier (auto-increment, replaces GEN_USER_ID generator) */
  id: number;
  /** Login username */
  username: string;
  /** Display name shown in the UI header */
  name: string;
  /** Email address for notifications and password recovery */
  email: string;
  /** Role determines which screens and actions are accessible */
  role: UserRole;
  /** Whether the account is active (inactive users cannot log in) */
  isActive: boolean;
  /** Timestamp of the last successful login */
  lastLoginAt: string | null;
  /** When this user account was created */
  createdAt: string;
}

/* ── Product / Commodity ───────────────────────────────────────────────────
 * Replaces: frmProduct
 * Original VB6 form had fields: ProductCode, ProductName, Unit, UnitPrice, Category
 */
export interface Product {
  /** Unique product ID (replaces GEN_PRODUCT_ID generator) */
  id: number;
  /** Short code for the product (e.g., "RBR" for rubber) */
  code: string;
  /** Full product name */
  name: string;
  /** Category grouping (e.g., "Agricultural", "Industrial") */
  category: string;
  /** Unit of measure (kg, MT, etc.) */
  unit: string;
  /** Price per unit of measure */
  unitPrice: number;
  /** Whether this product is currently active */
  isActive: boolean;
}

/* ── Customer ──────────────────────────────────────────────────────────────
 * Replaces: frmCustomer
 * Original VB6 form had: CustCode, CustName, Phone, Address, CreditLimit
 */
export interface Customer {
  id: number;
  /** Short customer code (e.g., "CUST001") */
  code: string;
  name: string;
  phone: string;
  address: string;
  /** Maximum credit allowed before payment is required */
  creditLimit: number;
  isActive: boolean;
}

/* ── Supplier ──────────────────────────────────────────────────────────────
 * Replaces: frmSupplier
 * Original VB6 form had: SuppCode, SuppName, Phone, Address
 */
export interface Supplier {
  id: number;
  code: string;
  name: string;
  phone: string;
  address: string;
  isActive: boolean;
}

/* ── Vehicle ───────────────────────────────────────────────────────────────
 * Replaces: frmVehicle
 * Original VB6 form had: PlateNo, TareWeight, DriverName, DriverPhone
 */
export interface Vehicle {
  id: number;
  /** Vehicle registration/plate number */
  plateNo: string;
  /** Known tare weight of the empty vehicle (for quick weighing) */
  tareWeight: number | null;
  driverName: string;
  driverPhone: string;
  isActive: boolean;
}

/* ── Weighing Ticket ───────────────────────────────────────────────────────
 * Replaces: frmWeighIn, frmWeighOut, frmTicket
 * This is the CORE entity of the system.
 *
 * WORKFLOW (same as original VB6):
 *   1. Vehicle arrives → Operator creates ticket (weigh-in, captures gross weight)
 *   2. Vehicle loads/unloads cargo
 *   3. Vehicle returns → Operator completes ticket (weigh-out, captures tare weight)
 *   4. Net weight = Gross weight - Tare weight
 *   5. Total amount = Net weight × Unit price
 */
export type TicketType = 'purchase' | 'sale';
export type TicketStatus = 'open' | 'closed' | 'voided';

export interface Ticket {
  /** Unique ticket ID */
  id: number;
  /** Sequential ticket number (replaces GEN_TICKET_NO / SP_GET_NEXT_TICKET_NO) */
  ticketNo: string;
  /** Purchase = buying goods IN, Sale = selling goods OUT */
  type: TicketType;
  /** Open = awaiting weigh-out, Closed = complete, Voided = cancelled */
  status: TicketStatus;
  /** The product being weighed */
  productId: number;
  productName: string;
  /** Customer (for sales) or Supplier (for purchases) */
  customerId: number | null;
  customerName: string | null;
  supplierId: number | null;
  supplierName: string | null;
  /** Vehicle being weighed */
  vehicleId: number | null;
  vehiclePlateNo: string | null;
  /** First weight captured (vehicle + cargo) */
  grossWeight: number | null;
  /** Second weight captured (vehicle without cargo, or known tare) */
  tareWeight: number | null;
  /** Calculated: grossWeight - tareWeight */
  netWeight: number | null;
  /** When the first weighing occurred */
  weighInAt: string | null;
  /** When the second weighing occurred */
  weighOutAt: string | null;
  /** Price per unit at time of transaction */
  unitPrice: number | null;
  /** Calculated: netWeight × unitPrice */
  totalAmount: number | null;
  /** Operator notes */
  notes: string;
  /** Reason if ticket was voided */
  voidReason: string | null;
  /** Who created/operated this ticket */
  operatorId: number;
  operatorName: string;
  createdAt: string;
}

/* ── Transaction ───────────────────────────────────────────────────────────
 * Replaces: implicit transaction creation in frmWeighOut when ticket closes
 * Links a closed ticket to a financial transaction with payment tracking
 */
export type TransactionStatus = 'unpaid' | 'partial' | 'paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'cheque' | 'bank_transfer';

export interface Transaction {
  id: number;
  /** Sequential transaction number (replaces GEN_TRANS_NO) */
  transNo: string;
  type: TicketType;
  ticketId: number;
  ticketNo: string;
  customerName: string | null;
  supplierName: string | null;
  totalWeight: number;
  totalAmount: number;
  paidAmount: number;
  status: TransactionStatus;
  createdAt: string;
}

export interface Payment {
  id: number;
  transactionId: number;
  amount: number;
  method: PaymentMethod;
  reference: string;
  paidAt: string;
}

/* ── Settings ──────────────────────────────────────────────────────────────
 * Replaces: frmSettings
 * Original VB6 stored these in SETTINGS table and modGlobal variables
 */
export interface IpCameraConfig {
  id: string;
  name: string; // e.g., "Weighbridge #1 Inbound Plate Camera"
  ipAddress: string; // e.g., "192.168.1.121"
  port: number; // e.g., 554 or 8080
  rtspUrl?: string; // e.g., "rtsp://admin:pass@192.168.1.121:554/ch0"
  httpSnapshotUrl?: string; // e.g., "http://192.168.1.121:80/snapshot.jpg"
  location: string; // e.g., "Entrance Weighbridge (Scale #1)"
  channel: number;
  status: 'online' | 'offline' | 'testing';
  captureTrigger: 'manual' | 'scale_stabilized' | 'entry_slip';
  isEnabled: boolean;
}

export interface AppSettings {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  /** COM port for scale connection (e.g., "COM3") */
  scalePort: string;
  /** Baud rate for serial communication */
  scaleBaudRate: number;
  /** Scale protocol/brand */
  scaleProtocol: string;
  /** Printer name for ticket printing */
  printerName: string;
  /** Ticket number prefix (e.g., "TKT-") */
  ticketPrefix: string;
  /** Currency symbol */
  currency: string;
  /** Decimal places for weight display */
  weightDecimals: number;
  /** Whether the Unloading module/option is enabled (configured by Admin) */
  enableUnloading: boolean;
  /** Configured IP-based cameras for weighbridge data and plate capturing */
  ipCameras?: IpCameraConfig[];
}

/* ── Audit Log ─────────────────────────────────────────────────────────────
 * Replaces: AUDIT_LOG table + TRG_AUDIT_LOG trigger
 * Tracks every data change for accountability
 */
export interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  /** What action was performed */
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'void';
  /** Which data entity was affected */
  entity: string;
  entityId: number;
  /** Human-readable description of what changed */
  description: string;
  createdAt: string;
}

/* ── Daily Summary ─────────────────────────────────────────────────────────
 * Replaces: frmDailySummary, SP_DAILY_SUMMARY stored procedure
 */
export interface DailySummary {
  date: string;
  totalTickets: number;
  purchaseTickets: number;
  saleTickets: number;
  totalWeight: number;
  totalAmount: number;
  topProduct: string;
  topCustomer: string;
}

/* ── Vehicle Entry Point & Approval ────────────────────────────────────────
 * As required by 'Changes required.txt' and 'Entry slip.jpg':
 * Captures Entry time, Vehicle type, Vehicle Number, Driver Name, Mobile Number,
 * Customer Name, Material, Approval status, Reject reason, 1st Wgt S.No, Entry Weight.
 */
export type ApprovalStatus = 'Approved' | 'Rejected' | 'Pending';
export type VehicleLifecycleStatus = 'unplanned' | 'planned' | 'in_progress' | 'awaiting_check' | 'Checked' | 'discrepancy' | 'billing' | 'billed' | 'completed' | 'exited';

export interface VehicleEntry {
  id: number;
  slipNo: string; // e.g. "SR27G010"
  entryTime: string; // 12-hour format with seconds, e.g. "08:29:20 AM"
  entryDate: string; // "2026-09-06"
  vehicleType: string; // e.g. "Truck", "Lorry", "Trailer", "Tipper", "Tanker"
  vehicleNumber: string; // e.g. "TN38CW6762"
  driverName: string; // e.g. "MS"
  mobileNumber: string; // e.g. "RANGA" or "9876543210"
  customerName: string; // e.g. "Meghalai steels"
  customerId?: number | null;
  material: string; // e.g. "Steel Bars", "Scrap Steel"
  firstWgtSeqNo: string; // e.g. "908" (from Entry slip sample)
  entryWeight: number; // e.g. 2690 kg
  approvalStatus: ApprovalStatus;
  /** Status before D.O generation is 'unplanned', then 'planned' once D.O is generated */
  vehicleStatus?: 'unplanned' | 'planned' | 'in_progress' | 'checked' | 'billed' | 'exited';
  currentLocation?: string;
  rejectReason?: string | null;
  operatorId: number;
  operatorName: string;
  advanceBalance?: number;
  creditLimit?: number;
  notes?: string;
  createdAt: string;
}

/* ── Warehouse Personnel & Planning ────────────────────────────────────────
 * Operator decides on supervisor, number of bays, each bay handler, items to be loaded in each bay.
 * Delivery Order is generated upon planning completion.
 */
export interface WarehouseEmployee {
  id: number;
  name: string;
  role: 'supervisor' | 'handler' | 'operator' | 'planner' | 'checker';
  phone: string;
  isActive: boolean;
}

export interface PlannedBayItem {
  id: string;
  bayNumber: number;
  bayName: string;
  handlerName: string;
  handlerId?: number;
  itemCode: string;
  itemName: string;
  plannedWeightKg: number;
  actualLoadedWeightKg?: number;
  pendingWeightKg?: number;
  notes?: string;
}

export interface DeliveryOrderPlan {
  id: number;
  doNumber: string; // e.g. "DO-2026-00101"
  vehicleEntryId: number;
  slipNo: string;
  vehicleNumber: string;
  vehicleType: string;
  driverName: string;
  driverPhone: string;
  customerName: string;
  material: string;
  plannerName?: string; // Person with planner role who plans and assigns vehicle
  plannerId?: number;
  supervisorName: string; // Supervisor responsible for ensuring items & weights loaded from specific bays
  supervisorId?: number;
  baysCount: number;
  items: PlannedBayItem[];
  totalPlannedWeightKg: number;
  
  // Real-time tracking of vehicle location and checking
  currentLocation: string; // e.g. "Entry Gate", "Waiting for Bay 1", "At Bay 1 (North Bulk Hopper)", "At Checking Area", "Billing Section", "Exit Gate", "Exited Warehouse"
  checkingStatus?: 'pending' | 'checked' | 'discrepancy';
  checkerName?: string;
  checkedAt?: string;
  discrepancyNotes?: string;
  discrepancyTargetBays?: number[];
  billingSettled?: boolean;
  exitedAt?: string;

  // Timestamps & durations (12-hour format with seconds)
  inTime: string; // Entry gate time, e.g. "08:29:20 AM"
  planningStartTime: string;
  planningEndTime: string;
  planningDurationSeconds: number; // planning time
  outTime: string; // From entry till planning done
  
  status: 'planned' | 'in_progress' | 'awaiting_check' | 'Checked' | 'discrepancy' | 'billing' | 'billed' | 'completed' | 'exited';
  createdAt: string;
}

/* ── Multiple Weighments & Workflow Stages ─────────────────────────────────
 * 1st weighment = tare/empty vehicle weight.
 * 2nd, 3rd, ... weighments = sequential bay loadings.
 * Captures load weight, time between weighments, time before/after loading,
 * load start & end times, warehouse time, billing time.
 */
export interface BayLoadingRecord {
  bayNumber: number;
  bayName: string;
  handlerName: string; // Handler in-charge of handling loading and unloading activity at this bay
  itemName: string;
  plannedWeightKg: number;
  actualLoadedWeightKg: number;
  previousWeightKg?: number; // Weight before loading/unloading at this bay
  grossWeightKg?: number; // Resulting gross weight after loading/unloading
  timeBeforeLoading: string; // arrival at bay (12-hr with seconds)
  loadStartTime: string; // loading begins
  loadEndTime: string; // loading ends
  timeAfterLoading: string; // loading finished & clearance
  loadingDurationSeconds: number;
  deviationStatus: 'normal' | 'minor' | 'major';
  activityType?: 'loading' | 'unloading';
  hasDiscrepancy?: boolean;
  discrepancyNote?: string;
}

export interface WeighmentRecord {
  weighmentIndex: number; // 1 = Tare/empty, 2 = Bay 1, 3 = Bay 2, etc.
  stageName: string; // "1st Weighment (Tare)", "2nd Weighment (Bay 1 Loaded)", etc.
  bayNumber?: number;
  capturedWeightKg: number;
  incrementalLoadWeightKg: number; // incremental weight added or offloaded in this step
  previousWeightKg?: number; // previous weight before this weighment
  grossWeightKg?: number; // gross weight after this weighment
  timestamp: string; // 12-hr with seconds: "08:45:12 AM"
  timeSinceLastWeighmentSeconds: number; // time taken between each weighment
  scaleStation: string;
}

export interface MultiWeighmentSession {
  id: number;
  deliveryOrderId: number;
  doNumber: string;
  vehicleEntryId: number;
  slipNo: string;
  vehicleNumber: string;
  customerName: string;
  driverName?: string;
  transporterName?: string;
  plannerName?: string;
  supervisorName: string;
  operationMode?: 'loading' | 'unloading';
  
  // Real-time location within warehouse
  currentLocation: string; // e.g. "At Bay 1 (North Bulk Hopper)", "At Checking Station", "Guided back to Bay 2 (Discrepancy)", "At Billing Counter", "At Exit Gate", "Exited Warehouse"
  checkingStatus?: 'pending' | 'checked' | 'discrepancy';
  checkerName?: string;
  checkedAt?: string;
  discrepancyNotes?: string;
  discrepancyTargetBays?: number[];

  // Weights breakdown
  tareWeightKg: number; // 1st weighment (empty vehicle or final tare)
  finalGrossWeightKg: number;
  totalNetWeightKg: number;
  totalPlannedWeightKg: number;
  weightVarianceKg: number; // actual net - planned
  
  // Stage records
  weighments: WeighmentRecord[];
  bayLoadings: BayLoadingRecord[];
  
  // End-to-end timing tracking
  inTime: string; // Vehicle entry time (12-hr with seconds)
  planningTime: string; // Formatted planning duration (e.g. "04m 32s")
  planningDurationSeconds: number;
  outTime: string; // From entry till planning done
  warehouseStartTime: string; // Warehouse entry / 1st weighment start
  warehouseEndTime: string; // All loading and checking completed
  warehouseTimeSeconds: number; // Auto calculated from entry into warehouse till all loading & checking completed
  
  // Billing stage
  billingStartTime?: string;
  billingEndTime?: string;
  billingTimeSeconds?: number;
  weighingCharges: number;
  paymentMode: 'Cash' | 'GPay' | 'Net Banking' | 'IMPS' | 'Credit';
  billingStatus: 'pending' | 'completed';

  // Exit stage & turnaround
  exitTime?: string; // Final gate exit timestamp
  totalTurnaroundSeconds?: number; // Complete time from inTime to exitTime
  
  status: 'tare_captured' | 'loading' | 'verification' | 'awaiting_check' | 'Checked' | 'discrepancy' | 'billing' | 'billed' | 'completed' | 'exited';
  createdAt: string;
}

/* ── Navigation ────────────────────────────────────────────────────────────
 * Defines the sidebar menu structure (replaces MDI form menu bar)
 */
export type PageId =
  | 'dashboard'
  | 'vehicle-entry'
  | 'planning'
  | 'multi-weighment'
  | 'weigh-in'
  | 'weigh-out'
  | 'tickets'
  | 'products'
  | 'customers'
  | 'suppliers'
  | 'vehicles'
  | 'transactions'
  | 'reports'
  | 'daily-summary'
  | 'users'
  | 'roles'
  | 'settings'
  | 'audit-log'
  | 'backup'
  | 'about';

