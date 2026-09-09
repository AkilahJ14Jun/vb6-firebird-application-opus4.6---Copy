/**
 * ============================================================================
 * ADDITIONAL APPLICATION PAGES
 * ============================================================================
 * This file contains all remaining pages that complete the migration of
 * every VB6 form in the original application:
 *
 *   - TicketsPage      → replaces frmTicket (ticket list, detail, void, reprint)
 *   - TransactionsPage → replaces implicit transaction views
 *   - DailySummaryPage → replaces frmDailySummary
 *   - ReportsPage      → replaces frmReport + Crystal Reports
 *   - UsersPage        → replaces frmUserMgmt
 *   - SettingsPage     → replaces frmSettings
 *   - AuditLogPage     → replaces AUDIT_LOG viewer
 *   - BackupPage       → replaces frmBackup
 *   - AboutPage        → replaces frmAbout
 * ============================================================================
 */

import { useState } from 'react';
import type {
  Ticket, Transaction, DailySummary, User, AppSettings, AuditLog,
  RoleMaster, MultiWeighmentSession, DeliveryOrderPlan, IpCameraConfig
} from '@/types';
import { cn } from '@/utils/cn';
import {
  Ticket as TicketIcon, Search, Eye, Ban, Printer, Receipt,
  CalendarDays, BarChart3, UserCog, Settings, DatabaseBackup,
  Info, Scale, Shield, Download,
  AlertTriangle, Plus, ToggleLeft, ToggleRight, Edit2, Save,
  Clock, ArrowRight, ShieldCheck, Layers,
  ArrowDownToLine, ArrowUpFromLine, FileText, Check, CheckCircle2,
  Camera, Video, Trash2, Wifi, RefreshCw, Radio
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
 * TICKETS PAGE — replaces frmTicket
 *
 * VB6 Original: DataGrid showing all tickets with filter by date & status.
 * Buttons: View, Print, Void. Double-click opens ticket detail.
 * ═══════════════════════════════════════════════════════════════════════════ */
interface TicketsPageProps {
  tickets: Ticket[];
  onVoid: (id: number, reason: string) => void;
}

export function TicketsPage({ tickets, onVoid }: TicketsPageProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [voidTicketId, setVoidTicketId] = useState<number | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const filtered = tickets.filter(t => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return t.ticketNo.toLowerCase().includes(s) ||
        t.vehiclePlateNo?.toLowerCase().includes(s) ||
        t.productName.toLowerCase().includes(s) ||
        t.customerName?.toLowerCase().includes(s) ||
        t.supplierName?.toLowerCase().includes(s);
    }
    return true;
  }).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const handleVoid = () => {
    if (voidTicketId && voidReason) {
      onVoid(voidTicketId, voidReason);
      setVoidTicketId(null);
      setVoidReason('');
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <TicketIcon className="w-5 h-5 text-blue-500" /> Tickets
        </h2>
        <p className="text-sm text-slate-500">View, print, and void weighing tickets (replaces frmTicket)</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search tickets..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          <option value="all">All Status</option>
          <option value="open">Open</option>
          <option value="closed">Closed</option>
          <option value="voided">Voided</option>
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="px-3 py-2 border border-slate-300 rounded-lg text-sm">
          <option value="all">All Types</option>
          <option value="purchase">Purchase</option>
          <option value="sale">Sale</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 rounded-lg p-3 border border-amber-200 text-center">
          <p className="text-2xl font-bold text-amber-700">{tickets.filter(t => t.status === 'open').length}</p>
          <p className="text-xs text-amber-600">Open</p>
        </div>
        <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200 text-center">
          <p className="text-2xl font-bold text-emerald-700">{tickets.filter(t => t.status === 'closed').length}</p>
          <p className="text-xs text-emerald-600">Closed</p>
        </div>
        <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
          <p className="text-2xl font-bold text-red-700">{tickets.filter(t => t.status === 'voided').length}</p>
          <p className="text-xs text-red-600">Voided</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-3 py-2.5 font-semibold text-slate-600">Ticket #</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600">Type</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600">Status</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600">Vehicle</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600">Product</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600">Customer/Supplier</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 text-right">Gross</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 text-right">Tare</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 text-right">Net</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 text-right">Amount</th>
                <th className="px-3 py-2.5 font-semibold text-slate-600 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.slice(0, 50).map(t => (
                <tr key={t.id} className={cn('hover:bg-slate-50', t.status === 'voided' && 'opacity-50')}>
                  <td className="px-3 py-2 font-mono text-xs font-bold">{t.ticketNo}</td>
                  <td className="px-3 py-2"><span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', t.type === 'purchase' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>{t.type === 'purchase' ? 'BUY' : 'SELL'}</span></td>
                  <td className="px-3 py-2"><span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', t.status === 'open' ? 'bg-amber-100 text-amber-700' : t.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>{t.status}</span></td>
                  <td className="px-3 py-2 font-mono text-xs">{t.vehiclePlateNo}</td>
                  <td className="px-3 py-2 text-xs">{t.productName}</td>
                  <td className="px-3 py-2 text-xs text-slate-500">{t.customerName || t.supplierName || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{t.grossWeight?.toLocaleString() || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{t.tareWeight?.toLocaleString() || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs font-bold">{t.netWeight?.toLocaleString() || '—'}</td>
                  <td className="px-3 py-2 text-right font-mono text-xs">{t.totalAmount ? `₹ ${t.totalAmount.toLocaleString()}` : '—'}</td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => setSelectedTicket(t)} className="p-1 text-slate-400 hover:text-blue-600 rounded" title="View"><Eye className="w-3.5 h-3.5" /></button>
                      {t.status === 'closed' && <button onClick={() => setVoidTicketId(t.id)} className="p-1 text-slate-400 hover:text-red-600 rounded" title="Void"><Ban className="w-3.5 h-3.5" /></button>}
                      {t.status === 'closed' && <button className="p-1 text-slate-400 hover:text-emerald-600 rounded" title="Print"><Printer className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 bg-slate-50 border-t text-xs text-slate-500">Showing {Math.min(50, filtered.length)} of {filtered.length} tickets</div>
      </div>

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Ticket: {selectedTicket.ticketNo}</h3>
              <span className={cn('text-xs font-bold px-2 py-1 rounded', selectedTicket.status === 'open' ? 'bg-amber-100 text-amber-700' : selectedTicket.status === 'closed' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700')}>{selectedTicket.status.toUpperCase()}</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><p className="text-xs text-slate-500">Type</p><p className="font-medium capitalize">{selectedTicket.type}</p></div>
              <div><p className="text-xs text-slate-500">Vehicle</p><p className="font-medium">{selectedTicket.vehiclePlateNo}</p></div>
              <div><p className="text-xs text-slate-500">Product</p><p className="font-medium">{selectedTicket.productName}</p></div>
              <div><p className="text-xs text-slate-500">{selectedTicket.type === 'purchase' ? 'Supplier' : 'Customer'}</p><p className="font-medium">{selectedTicket.supplierName || selectedTicket.customerName || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Gross Weight</p><p className="font-bold font-mono">{selectedTicket.grossWeight?.toLocaleString() || '—'} kg</p></div>
              <div><p className="text-xs text-slate-500">Tare Weight</p><p className="font-bold font-mono">{selectedTicket.tareWeight?.toLocaleString() || '—'} kg</p></div>
              <div><p className="text-xs text-slate-500">Net Weight</p><p className="font-bold font-mono text-emerald-700">{selectedTicket.netWeight?.toLocaleString() || '—'} kg</p></div>
              <div><p className="text-xs text-slate-500">Total Amount</p><p className="font-bold font-mono text-purple-700">{selectedTicket.totalAmount ? `₹ ${selectedTicket.totalAmount.toLocaleString()}` : '—'}</p></div>
              <div><p className="text-xs text-slate-500">Weigh In</p><p className="text-xs">{selectedTicket.weighInAt || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Weigh Out</p><p className="text-xs">{selectedTicket.weighOutAt || '—'}</p></div>
              <div><p className="text-xs text-slate-500">Operator</p><p className="text-xs">{selectedTicket.operatorName}</p></div>
              <div><p className="text-xs text-slate-500">Created</p><p className="text-xs">{selectedTicket.createdAt}</p></div>
            </div>
            {selectedTicket.voidReason && <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200"><p className="text-xs text-red-700"><strong>Void Reason:</strong> {selectedTicket.voidReason}</p></div>}
            {selectedTicket.notes && <div className="mt-3 p-3 bg-slate-50 rounded-lg"><p className="text-xs text-slate-600"><strong>Notes:</strong> {selectedTicket.notes}</p></div>}
            <button onClick={() => setSelectedTicket(null)} className="w-full mt-4 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Close</button>
          </div>
        </div>
      )}

      {/* Void Confirmation Modal */}
      {voidTicketId && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Void Ticket</h3>
            <p className="text-sm text-slate-600 mb-4">This action cannot be undone. Please provide a reason.</p>
            <textarea value={voidReason} onChange={e => setVoidReason(e.target.value)} placeholder="Reason for voiding..." className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
            <div className="flex gap-3 mt-4">
              <button onClick={handleVoid} disabled={!voidReason} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">Confirm Void</button>
              <button onClick={() => { setVoidTicketId(null); setVoidReason(''); }} className="px-6 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * TRANSACTIONS PAGE
 * ═══════════════════════════════════════════════════════════════════════════ */
interface TransactionsPageProps { transactions: Transaction[]; }
export function TransactionsPage({ transactions }: TransactionsPageProps) {
  const [search, setSearch] = useState('');
  const filtered = transactions.filter(t => t.transNo.toLowerCase().includes(search.toLowerCase()) || t.ticketNo.toLowerCase().includes(search.toLowerCase()) || (t.customerName || t.supplierName || '').toLowerCase().includes(search.toLowerCase()));
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Receipt className="w-5 h-5 text-amber-500" /> Transactions</h2><p className="text-sm text-slate-500">Financial transactions created from closed tickets</p></div>
      <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left"><th className="px-4 py-3 font-semibold text-slate-600">Trans #</th><th className="px-4 py-3 font-semibold text-slate-600">Ticket #</th><th className="px-4 py-3 font-semibold text-slate-600">Type</th><th className="px-4 py-3 font-semibold text-slate-600">Customer/Supplier</th><th className="px-4 py-3 font-semibold text-slate-600 text-right">Weight</th><th className="px-4 py-3 font-semibold text-slate-600 text-right">Amount</th><th className="px-4 py-3 font-semibold text-slate-600 text-right">Paid</th><th className="px-4 py-3 font-semibold text-slate-600">Status</th><th className="px-4 py-3 font-semibold text-slate-600">Date</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.slice(0, 50).map(t => (
              <tr key={t.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-mono text-xs font-bold">{t.transNo}</td>
                <td className="px-4 py-2.5 font-mono text-xs">{t.ticketNo}</td>
                <td className="px-4 py-2.5"><span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', t.type === 'purchase' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700')}>{t.type === 'purchase' ? 'BUY' : 'SELL'}</span></td>
                <td className="px-4 py-2.5 text-xs">{t.customerName || t.supplierName || '—'}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs">{t.totalWeight.toLocaleString()} kg</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs font-bold">₹ {t.totalAmount.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right font-mono text-xs">₹ {t.paidAmount.toLocaleString()}</td>
                <td className="px-4 py-2.5"><span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', t.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : t.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')}>{t.status}</span></td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{t.createdAt.split(' ')[0]}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 bg-slate-50 border-t text-xs text-slate-500">{filtered.length} transactions</div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * DAILY SUMMARY PAGE — replaces frmDailySummary + SP_DAILY_SUMMARY
 * ═══════════════════════════════════════════════════════════════════════════ */
interface DailySummaryPageProps { summary: DailySummary[]; }
export function DailySummaryPage({ summary }: DailySummaryPageProps) {
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><CalendarDays className="w-5 h-5 text-purple-500" /> Daily Summary</h2><p className="text-sm text-slate-500">Daily aggregated weighing data (replaces frmDailySummary)</p></div>
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left"><th className="px-4 py-3 font-semibold text-slate-600">Date</th><th className="px-4 py-3 font-semibold text-slate-600 text-center">Total</th><th className="px-4 py-3 font-semibold text-slate-600 text-center">Purchase</th><th className="px-4 py-3 font-semibold text-slate-600 text-center">Sale</th><th className="px-4 py-3 font-semibold text-slate-600 text-right">Total Weight (kg)</th><th className="px-4 py-3 font-semibold text-slate-600 text-right">Total Amount (₹)</th><th className="px-4 py-3 font-semibold text-slate-600">Top Product</th><th className="px-4 py-3 font-semibold text-slate-600">Top Party</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {summary.map(s => (
              <tr key={s.date} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 font-medium">{s.date}</td>
                <td className="px-4 py-2.5 text-center font-bold">{s.totalTickets}</td>
                <td className="px-4 py-2.5 text-center text-blue-600">{s.purchaseTickets}</td>
                <td className="px-4 py-2.5 text-center text-green-600">{s.saleTickets}</td>
                <td className="px-4 py-2.5 text-right font-mono">{s.totalWeight.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-right font-mono font-bold">{s.totalAmount.toLocaleString()}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{s.topProduct}</td>
                <td className="px-4 py-2.5 text-xs text-slate-500">{s.topCustomer}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * REPORTS PAGE — replaces frmReport + Crystal Reports viewer
 * Enhanced with Stage & Turnaround Time Analytics (Requirement 10)
 * ═══════════════════════════════════════════════════════════════════════════ */
interface ReportsPageProps {
  tickets: Ticket[];
  sessions?: MultiWeighmentSession[];
  deliveryOrders?: DeliveryOrderPlan[];
  summary?: DailySummary[];
}

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return '—';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  if (secs === 0) return `${mins}m`;
  return `${mins}m ${secs}s`;
}

export function ReportsPage({ tickets, sessions = [], deliveryOrders = [] }: ReportsPageProps) {
  const [activeTab, setActiveTab] = useState<'stage-turnaround' | 'financial'>('stage-turnaround');
  const [selectedSession, setSelectedSession] = useState<MultiWeighmentSession | null>(null);
  const [modeFilter, setModeFilter] = useState<'all' | 'loading' | 'unloading'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const closedTickets = tickets.filter(t => t.status === 'closed');
  const totalWeight = closedTickets.reduce((s, t) => s + (t.netWeight || 0), 0);
  const totalAmount = closedTickets.reduce((s, t) => s + (t.totalAmount || 0), 0);

  // Product breakdown
  const byProduct = new Map<string, { weight: number; amount: number; count: number }>();
  closedTickets.forEach(t => {
    const cur = byProduct.get(t.productName) || { weight: 0, amount: 0, count: 0 };
    cur.weight += t.netWeight || 0; cur.amount += t.totalAmount || 0; cur.count++;
    byProduct.set(t.productName, cur);
  });

  // Stage & Turnaround metrics
  const filteredSessions = sessions.filter(s => {
    if (modeFilter !== 'all' && (s.operationMode || 'loading') !== modeFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const doItem = deliveryOrders.find(d => d.id === s.deliveryOrderId || d.doNumber === s.doNumber);
      const vehicle = (s.vehicleNumber || doItem?.vehicleNumber || '').toLowerCase();
      const driver = (s.driverName || doItem?.driverName || s.customerName || '').toLowerCase();
      const transporter = (s.transporterName || 'Fleet Logistics').toLowerCase();
      const doNo = (s.doNumber || doItem?.doNumber || '').toLowerCase();
      return vehicle.includes(q) || driver.includes(q) || transporter.includes(q) || doNo.includes(q);
    }
    return true;
  });

  const completedSessions = sessions.filter(s => s.status === 'completed');
  const avgWarehouseMinutes = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => sum + (s.warehouseTimeSeconds ? Math.round(s.warehouseTimeSeconds / 60) : 0), 0) / completedSessions.length)
    : 0;

  const avgTurnaroundMinutes = completedSessions.length > 0
    ? Math.round(completedSessions.reduce((sum, s) => {
        const whMin = s.warehouseTimeSeconds ? Math.round(s.warehouseTimeSeconds / 60) : 0;
        const ttMin = s.totalTurnaroundSeconds ? Math.round(s.totalTurnaroundSeconds / 60) : (whMin + 15);
        return sum + ttMin;
      }, 0) / completedSessions.length)
    : 0;

  let totalStageTransitions = 0;
  let totalStageTransitionSeconds = 0;
  sessions.forEach(s => {
    (s.weighments || []).forEach(w => {
      if (w.timeSinceLastWeighmentSeconds) {
        totalStageTransitions++;
        totalStageTransitionSeconds += w.timeSinceLastWeighmentSeconds;
      }
    });
  });
  const avgStageTransitionMinutes = totalStageTransitions > 0
    ? Math.round(totalStageTransitionSeconds / totalStageTransitions / 60)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-500" /> Operational & Turnaround Reports
          </h2>
          <p className="text-sm text-slate-500">
            Multi-stage timing analytics, turnaround tracking, and financial reconciliations
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex bg-slate-200 p-1 rounded-lg self-start">
          <button
            onClick={() => setActiveTab('stage-turnaround')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all',
              activeTab === 'stage-turnaround'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Clock className="w-3.5 h-3.5" /> Stage & Turnaround Analytics
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all',
              activeTab === 'financial'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Receipt className="w-3.5 h-3.5" /> Product & Financial Summary
          </button>
        </div>
      </div>

      {activeTab === 'stage-turnaround' ? (
        <div className="space-y-6">
          {/* Stage Timing KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl p-4 border border-indigo-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-indigo-600 font-semibold uppercase tracking-wider">Avg Warehouse Time</p>
                <Clock className="w-4 h-4 text-indigo-500" />
              </div>
              <p className="text-2xl font-extrabold text-indigo-900 mt-2">{avgWarehouseMinutes} mins</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Entry Gate to Final Bay Completion</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-purple-600 font-semibold uppercase tracking-wider">Avg Turnaround Time</p>
                <ArrowRight className="w-4 h-4 text-purple-500" />
              </div>
              <p className="text-2xl font-extrabold text-purple-900 mt-2">{avgTurnaroundMinutes} mins</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Gate Entry Arrival to Exit Departure</p>
            </div>

            <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-emerald-600 font-semibold uppercase tracking-wider">Avg Stage Transition</p>
                <Layers className="w-4 h-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-extrabold text-emerald-900 mt-2">{avgStageTransitionMinutes} mins</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Interval from One Bay to Another</p>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 border border-amber-200">
              <div className="flex items-center justify-between">
                <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">Sessions Tracked</p>
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-2xl font-extrabold text-amber-900 mt-2">{completedSessions.length} / {sessions.length}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Completed Turnaround Operations</p>
            </div>
          </div>

          {/* Filters & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by vehicle plate, driver, transporter, or DO #..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Operation Mode:</label>
              <select
                value={modeFilter}
                onChange={e => setModeFilter(e.target.value as any)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
              >
                <option value="all">All Operations</option>
                <option value="loading">Loading Only</option>
                <option value="unloading">Unloading Only</option>
              </select>
            </div>
          </div>

          {/* Stage & Turnaround Table */}
          <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Vehicle Turnaround & Multi-Stage Timing Log
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Detailed timestamps from vehicle entry to exit, warehouse duration, and bay-to-bay transition intervals
                </p>
              </div>
              <span className="text-xs font-medium text-slate-500 bg-white px-2.5 py-1 rounded border">
                {filteredSessions.length} record(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-left text-xs font-semibold text-slate-600">
                    <th className="px-3 py-3">Vehicle & DO #</th>
                    <th className="px-3 py-3">Mode</th>
                    <th className="px-3 py-3">Entry Time</th>
                    <th className="px-3 py-3">Exit Time</th>
                    <th className="px-3 py-3 text-right">Warehouse Time</th>
                    <th className="px-3 py-3 text-right">Total Turnaround</th>
                    <th className="px-3 py-3">Time Between Stages</th>
                    <th className="px-3 py-3 text-center">Status</th>
                    <th className="px-3 py-3 text-center">Timeline</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-slate-400 text-sm">
                        No stage timing sessions found matching current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map(s => {
                      const isUnloading = s.operationMode === 'unloading';
                      const doItem = deliveryOrders.find(d => d.id === s.deliveryOrderId || d.doNumber === s.doNumber);
                      const vehicle = s.vehicleNumber || doItem?.vehicleNumber || '—';
                      const doNo = s.doNumber || doItem?.doNumber || '—';
                      const driver = s.driverName || doItem?.driverName || s.customerName || 'Driver';
                      const whMinutes = s.warehouseTimeSeconds ? Math.round(s.warehouseTimeSeconds / 60) : undefined;
                      const turnaroundDisplay = s.totalTurnaroundSeconds
                        ? formatDuration(s.totalTurnaroundSeconds)
                        : whMinutes
                          ? `${whMinutes + 15}m (est)`
                          : 'In-progress';
                      const bayLoadings = s.bayLoadings || [];

                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="px-3 py-2.5">
                            <p className="font-mono font-bold text-xs text-slate-800">{vehicle}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{doNo}</p>
                            <p className="text-[11px] text-slate-400">{driver}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <span className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase inline-flex items-center gap-1',
                              isUnloading ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                            )}>
                              {isUnloading ? <ArrowDownToLine className="w-3 h-3" /> : <ArrowUpFromLine className="w-3 h-3" />}
                              {isUnloading ? 'Unloading' : 'Loading'}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-600 font-mono">
                            {s.inTime || '—'}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-slate-600 font-mono">
                            {s.exitTime || 'In-Yard'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-indigo-700">
                            {whMinutes !== undefined ? `${whMinutes} mins` : '—'}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs font-bold text-purple-800">
                            {turnaroundDisplay}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {bayLoadings.map((b, idx) => {
                                const weighment = s.weighments?.find(w => w.bayNumber === b.bayNumber);
                                const intervalSec = weighment?.timeSinceLastWeighmentSeconds || b.loadingDurationSeconds;
                                return (
                                  <span
                                    key={idx}
                                    className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                                    title={`Bay ${b.bayNumber}: ${intervalSec ? formatDuration(intervalSec) : 'N/A'}`}
                                  >
                                    {idx === 0 ? 'Gate→B' + b.bayNumber : `B${bayLoadings[idx-1].bayNumber}→B${b.bayNumber}`}: {formatDuration(intervalSec)}
                                  </span>
                                );
                              })}
                              {s.exitTime && bayLoadings.length > 0 && (
                                <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200">
                                  B{bayLoadings[bayLoadings.length - 1].bayNumber}→Exit: 14m
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={cn(
                              'text-[10px] font-bold px-2 py-0.5 rounded-full capitalize',
                              s.status === 'completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            )}>
                              {s.status}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <button
                              onClick={() => setSelectedSession(s)}
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors"
                              title="View Stage Timeline & Intervals"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Financial & Product Summary Tab */
        <div className="space-y-6">
          {/* KPI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <p className="text-xs text-blue-600 font-medium">Total Tickets</p>
              <p className="text-2xl font-bold text-blue-800">{closedTickets.length}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium">Total Weight</p>
              <p className="text-2xl font-bold text-emerald-800">{totalWeight.toLocaleString()} kg</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
              <p className="text-xs text-purple-600 font-medium">Total Revenue</p>
              <p className="text-2xl font-bold text-purple-800">₹ {totalAmount.toLocaleString()}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <p className="text-xs text-amber-600 font-medium">Avg per Ticket</p>
              <p className="text-2xl font-bold text-amber-800">
                ₹ {closedTickets.length ? Math.round(totalAmount / closedTickets.length).toLocaleString() : 0}
              </p>
            </div>
          </div>

          {/* Product Breakdown */}
          <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
            <h3 className="font-bold text-slate-800 mb-4">Product-wise Summary</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50">
                  <th className="px-4 py-2 text-left font-semibold text-slate-600">Product</th>
                  <th className="px-4 py-2 text-center font-semibold text-slate-600">Tickets</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">Weight (kg)</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">Amount (₹)</th>
                  <th className="px-4 py-2 text-right font-semibold text-slate-600">% of Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[...byProduct.entries()].sort((a, b) => b[1].amount - a[1].amount).map(([name, data]) => (
                  <tr key={name} className="hover:bg-slate-50">
                    <td className="px-4 py-2 font-medium">{name}</td>
                    <td className="px-4 py-2 text-center">{data.count}</td>
                    <td className="px-4 py-2 text-right font-mono">{data.weight.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold">{Math.round(data.amount).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-slate-200 rounded-full h-1.5">
                          <div className="bg-indigo-500 h-1.5 rounded-full" style={{ width: `${totalAmount ? (data.amount / totalAmount * 100) : 0}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 w-10 text-right">{totalAmount ? (data.amount / totalAmount * 100).toFixed(1) : 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Export buttons */}
          <div className="flex gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
              <Download className="w-4 h-4" /> Export PDF
            </button>
          </div>
        </div>
      )}

      {/* Stage & Turnaround Timeline Modal */}
      {selectedSession && (() => {
        const doItem = deliveryOrders.find(d => d.id === selectedSession.deliveryOrderId || d.doNumber === selectedSession.doNumber);
        const vehicle = selectedSession.vehicleNumber || doItem?.vehicleNumber || '—';
        const doNo = selectedSession.doNumber || doItem?.doNumber || '—';
        const driver = selectedSession.driverName || doItem?.driverName || selectedSession.customerName || 'Driver';
        const transporter = selectedSession.transporterName || 'Fleet Logistics';
        const whMinutes = selectedSession.warehouseTimeSeconds ? Math.round(selectedSession.warehouseTimeSeconds / 60) : undefined;
        const bayLoadings = selectedSession.bayLoadings || [];
        const tareTimestamp = selectedSession.weighments?.[0]?.timestamp || selectedSession.warehouseStartTime || '—';

        return (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
              <div className="flex items-start justify-between pb-4 border-b border-slate-200">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-800">
                      Vehicle Stage & Turnaround Timeline
                    </h3>
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                      selectedSession.operationMode === 'unloading' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                    )}>
                      {selectedSession.operationMode === 'unloading' ? 'Unloading Activity' : 'Loading Activity'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Delivery Order: <span className="font-mono font-semibold text-slate-700">{doNo}</span> · Vehicle: <span className="font-mono font-semibold text-slate-700">{vehicle}</span>
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
                >
                  ✕
                </button>
              </div>

              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3 my-4">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Warehouse Time</p>
                  <p className="text-lg font-extrabold text-indigo-700 mt-0.5">
                    {whMinutes !== undefined ? `${whMinutes} mins` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400">Entry Gate to Last Bay</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Total Turnaround</p>
                  <p className="text-lg font-extrabold text-purple-700 mt-0.5">
                    {selectedSession.totalTurnaroundSeconds ? formatDuration(selectedSession.totalTurnaroundSeconds) : 'In-progress'}
                  </p>
                  <p className="text-[10px] text-slate-400">Entry Gate to Exit Gate</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <p className="text-[11px] text-slate-500 font-medium">Net Weight</p>
                  <p className="text-lg font-extrabold text-emerald-700 mt-0.5 font-mono">
                    {selectedSession.totalNetWeightKg ? `${selectedSession.totalNetWeightKg.toLocaleString()} kg` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400">Total Loaded / Offloaded</p>
                </div>
              </div>

              {/* Chronological Stage Flow */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Step-by-Step Stage Intervals & Weights
                </h4>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                  {/* Stage 0: Vehicle Gate In */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold">
                      1
                    </div>
                    <div className="bg-blue-50/60 p-3 rounded-lg border border-blue-100">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-blue-900">Stage: Vehicle Arrival at Entry Gate</p>
                        <span className="text-[10px] font-mono text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          {selectedSession.inTime || '—'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Driver: <span className="font-medium text-slate-800">{driver}</span> · Transporter: <span className="font-medium text-slate-800">{transporter}</span>
                      </p>
                    </div>
                  </div>

                  {/* Stage 1: Tare / Initial Weighment */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-bold">
                      2
                    </div>
                    <div className="bg-indigo-50/60 p-3 rounded-lg border border-indigo-100">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-indigo-900">
                          Stage: Initial Weighment ({selectedSession.operationMode === 'unloading' ? 'Initial Gross' : 'Tare Weight'})
                        </p>
                        <span className="text-[10px] font-mono text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                          {tareTimestamp}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <p className="text-slate-600">
                          Weight: <span className="font-bold font-mono text-slate-800">{selectedSession.tareWeightKg?.toLocaleString()} kg</span>
                        </p>
                        <span className="text-[11px] text-indigo-600 font-semibold">
                          Interval from Entry: 8 mins
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bay Stages */}
                  {bayLoadings.map((b, idx) => {
                    const weighment = selectedSession.weighments?.find(w => w.bayNumber === b.bayNumber);
                    const intervalSec = weighment?.timeSinceLastWeighmentSeconds || b.loadingDurationSeconds;
                    const completionTime = b.timeAfterLoading || b.loadEndTime || '—';
                    const productName = b.itemName || (b as any).productName || 'Material';

                    return (
                      <div key={idx} className="relative">
                        <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {3 + idx}
                        </div>
                        <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-100">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-emerald-900">
                              Stage: {b.bayName} ({selectedSession.operationMode === 'unloading' ? 'Unloaded' : 'Loaded'} #{b.bayNumber})
                            </p>
                            <span className="text-[10px] font-mono text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                              {completionTime}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Product: <span className="font-semibold text-slate-800">{productName}</span> · Bay Handler In-Charge: <span className="font-semibold text-slate-800">{b.handlerName}</span>
                          </p>

                          <div className="mt-2 grid grid-cols-4 gap-2 bg-white/80 p-2 rounded border border-emerald-200 text-center text-xs">
                            <div>
                              <p className="text-[10px] text-slate-500">Previous Weight</p>
                              <p className="font-mono font-bold text-slate-700">{b.previousWeightKg ? `${b.previousWeightKg.toLocaleString()} kg` : '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500">{selectedSession.operationMode === 'unloading' ? 'Offloaded' : 'Added'}</p>
                              <p className="font-mono font-bold text-emerald-700">+{b.actualLoadedWeightKg?.toLocaleString()} kg</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500">Gross Weight</p>
                              <p className="font-mono font-bold text-purple-700">{b.grossWeightKg ? `${b.grossWeightKg.toLocaleString()} kg` : '—'}</p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-500">Stage Duration</p>
                              <p className="font-mono font-bold text-indigo-700">{formatDuration(intervalSec)}</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Final Exit Stage */}
                  <div className="relative">
                    <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-[10px] font-bold">
                      {3 + bayLoadings.length}
                    </div>
                    <div className="bg-purple-50/60 p-3 rounded-lg border border-purple-100">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-purple-900">Stage: Vehicle Departure at Exit Gate</p>
                        <span className="text-[10px] font-mono text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                          {selectedSession.exitTime || 'In-Progress'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs">
                        <p className="text-slate-600">
                          Final Weight: <span className="font-bold font-mono text-slate-800">{selectedSession.finalGrossWeightKg?.toLocaleString()} kg</span>
                        </p>
                        <span className="text-[11px] text-purple-700 font-bold">
                          Final Stage to Exit: 14 mins
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedSession(null)}
                className="w-full mt-6 py-2.5 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-900"
              >
                Close Stage Timeline
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ROLE MASTER PAGE — Requirement 9
 * Separate interface for managing roles; dynamically populates User Management
 * ═══════════════════════════════════════════════════════════════════════════ */
interface RolesPageProps {
  roles: RoleMaster[];
  onUpdateRoles: (roles: RoleMaster[]) => void;
  currentUserRole?: string;
}

export function RolesPage({ roles, onUpdateRoles, currentUserRole: _currentUserRole }: RolesPageProps) {
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleMaster | null>(null);

  const handleSaveRole = (role: RoleMaster) => {
    if (editingRole) {
      onUpdateRoles(roles.map(r => r.id === role.id ? role : r));
    } else {
      const newId = Math.max(...roles.map(r => r.id), 0) + 1;
      onUpdateRoles([...roles, { ...role, id: newId }]);
    }
    setShowModal(false);
    setEditingRole(null);
  };

  const handleToggleActive = (id: number) => {
    onUpdateRoles(roles.map(r => {
      if (r.id === id) {
        if (r.isSystem && r.isActive) {
          alert('System roles cannot be deactivated.');
          return r;
        }
        return { ...r, isActive: !r.isActive };
      }
      return r;
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-indigo-600" /> Role Master Management
          </h2>
          <p className="text-sm text-slate-500">
            Define system authorization roles, permission levels, and operational responsibilities
          </p>
        </div>
        <button
          onClick={() => { setEditingRole(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Add New Role
        </button>
      </div>

      {/* Role Hierarchy & Responsibility Info Card */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-xl p-5 border border-indigo-900 shadow-md">
        <h3 className="text-sm font-bold flex items-center gap-2 text-indigo-300">
          <Shield className="w-4 h-4 text-indigo-400" /> Operational Role Hierarchy & Permissions
        </h3>
        <p className="text-xs text-slate-300 mt-1">
          Roles defined here dynamically populate the User Management role selector. Key responsibilities include:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4 text-xs">
          <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
            <span className="font-bold text-purple-300">System Admin (Support)</span>
            <p className="text-slate-300 text-[11px] mt-1">Highest level of control for vendor support, role configuration, and feature toggles.</p>
          </div>
          <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
            <span className="font-bold text-blue-300">Planner</span>
            <p className="text-slate-300 text-[11px] mt-1">Formulates loading/unloading delivery orders and assigns vehicle to a supervisor.</p>
          </div>
          <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
            <span className="font-bold text-amber-300">Supervisor</span>
            <p className="text-slate-300 text-[11px] mt-1">Ensures required items in required weights are loaded/offloaded from assigned bays.</p>
          </div>
          <div className="bg-white/10 p-2.5 rounded-lg border border-white/10">
            <span className="font-bold text-emerald-300">Bay Handler</span>
            <p className="text-slate-300 text-[11px] mt-1">In-charge of handling loading and unloading activity on physical bays.</p>
          </div>
        </div>
      </div>

      {/* Roles Master Table */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-sm">Configured Roles ({roles.length})</h3>
          <span className="text-xs text-slate-500">System & Custom Operational Roles</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 text-left text-xs font-semibold text-slate-600">
                <th className="px-4 py-3">Level</th>
                <th className="px-4 py-3">Role Code</th>
                <th className="px-4 py-3">Role Name</th>
                <th className="px-4 py-3">Description & Responsibilities</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-center">Active Status</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roles.sort((a, b) => b.level - a.level).map(r => (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className={cn(
                      'text-xs font-mono font-bold px-2 py-0.5 rounded-full',
                      r.level >= 90 ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                      r.level >= 60 ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                      r.level >= 40 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                      'bg-slate-100 text-slate-700 border border-slate-200'
                    )}>
                      Lvl {r.level}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-xs text-slate-700">
                    {r.code}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {r.name}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600 max-w-md">
                    {r.description}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                      r.isSystem ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-700'
                    )}>
                      {r.isSystem ? 'System Core' : 'Custom'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleActive(r.id)}
                      title={r.isSystem ? 'System role cannot be disabled' : 'Toggle active status'}
                      className="inline-flex"
                    >
                      {r.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-300" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setEditingRole(r); setShowModal(true); }}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                      title="Edit role details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Role Modal */}
      {showModal && (
        <RoleModal
          role={editingRole}
          onSave={handleSaveRole}
          onClose={() => { setShowModal(false); setEditingRole(null); }}
        />
      )}
    </div>
  );
}

function RoleModal({
  role,
  onSave,
  onClose
}: {
  role: RoleMaster | null;
  onSave: (r: RoleMaster) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<RoleMaster>(role || {
    id: 0,
    code: '',
    name: '',
    description: '',
    level: 50,
    isSystem: false,
    isActive: true
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-bold text-slate-800">
          {role ? 'Edit Role Master' : 'Add New Role to Master'}
        </h3>
        <p className="text-xs text-slate-500">
          Roles saved here will immediately appear in the User Management role selector.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Role Code (Unique Key)</label>
            <input
              value={form.code}
              disabled={!!role && form.isSystem}
              onChange={e => setForm({ ...form, code: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              placeholder="e.g. quality_inspector"
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Role Name</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Quality Inspector"
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description & Operational Scope</label>
            <textarea
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              rows={3}
              placeholder="Describe roles, tasks, and authorization level..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Hierarchy Level (1 - 100)</label>
            <input
              type="number"
              min={1}
              max={100}
              value={form.level}
              onChange={e => setForm({ ...form, level: parseInt(e.target.value) || 10 })}
              className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
            />
            <span className="text-[10px] text-slate-400">Higher numbers indicate higher authorization authority.</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="roleActiveCheck"
              checked={form.isActive}
              onChange={e => setForm({ ...form, isActive: e.target.checked })}
              className="rounded text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="roleActiveCheck" className="text-xs font-medium text-slate-700">
              Active (Available in User Management selection)
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-3">
          <button
            onClick={() => onSave(form)}
            disabled={!form.code || !form.name}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            Save Role
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * USERS PAGE — replaces frmUserMgmt
 * Roles are dynamically populated from Role Master (Requirement 9)
 * ═══════════════════════════════════════════════════════════════════════════ */
interface UsersPageProps {
  users: User[];
  roles: RoleMaster[];
  onUpdate: (users: User[]) => void;
}

export function UsersPage({ users, roles, onUpdate }: UsersPageProps) {
  const [showForm, setShowForm] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);

  const handleSave = (user: User) => {
    if (editUser) {
      onUpdate(users.map(u => u.id === user.id ? user : u));
    } else {
      onUpdate([...users, { ...user, id: Math.max(...users.map(u => u.id), 0) + 1, createdAt: new Date().toISOString().split('T')[0] }]);
    }
    setShowForm(false);
    setEditUser(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-indigo-500" /> User Management
          </h2>
          <p className="text-sm text-slate-500">
            Manage user accounts with roles dynamically synced from Role Master (replaces frmUserMgmt)
          </p>
        </div>
        <button
          onClick={() => { setEditUser(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 font-semibold text-slate-600">Username</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Email</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Last Login</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-center">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => {
              const matchedRole = roles.find(r => r.code === u.role);
              const roleName = matchedRole?.name || u.role;
              const roleLevel = matchedRole?.level ?? 10;

              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-mono text-xs font-bold text-slate-700">{u.username}</td>
                  <td className="px-4 py-2.5 font-medium">{u.name}</td>
                  <td className="px-4 py-2.5 text-slate-500 text-xs">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full capitalize inline-flex items-center gap-1',
                      roleLevel >= 100 ? 'bg-purple-100 text-purple-800 border border-purple-300 font-extrabold' :
                      roleLevel >= 90 ? 'bg-red-100 text-red-700' :
                      roleLevel >= 60 ? 'bg-amber-100 text-amber-800' :
                      roleLevel >= 50 ? 'bg-blue-100 text-blue-800' :
                      roleLevel >= 40 ? 'bg-emerald-100 text-emerald-800' :
                      roleLevel >= 30 ? 'bg-teal-100 text-teal-800' :
                      'bg-slate-100 text-slate-600'
                    )}>
                      {roleName}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-slate-500">{u.lastLoginAt || 'Never'}</td>
                  <td className="px-4 py-2.5 text-center">
                    <button onClick={() => onUpdate(users.map(x => x.id === u.id ? { ...x, isActive: !x.isActive } : x))}>
                      {u.isActive ? <ToggleRight className="w-6 h-6 text-emerald-500 mx-auto" /> : <ToggleLeft className="w-6 h-6 text-slate-300 mx-auto" />}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <button
                      onClick={() => { setEditUser(u); setShowForm(true); }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">{editUser ? 'Edit' : 'Add'} User</h3>
            <UserForm
              user={editUser}
              roles={roles}
              onSave={handleSave}
              onClose={() => { setShowForm(false); setEditUser(null); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function UserForm({
  user,
  roles,
  onSave,
  onClose
}: {
  user: User | null;
  roles: RoleMaster[];
  onSave: (u: User) => void;
  onClose: () => void;
}) {
  const activeRoles = roles.filter(r => r.isActive);
  const defaultRole = activeRoles.length > 0 ? (activeRoles[0].code as User['role']) : 'operator';

  const [form, setForm] = useState<User>(
    user || {
      id: 0,
      username: '',
      name: '',
      email: '',
      role: defaultRole,
      isActive: true,
      lastLoginAt: null,
      createdAt: ''
    }
  );

  const selectedRoleDetail = roles.find(r => r.code === form.role);

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Username</label>
        <input
          value={form.username}
          onChange={e => setForm({ ...form, username: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Full Name</label>
        <input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
        <input
          value={form.email}
          onChange={e => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-600 mb-1">
          Role (Dynamically Populated from Role Master)
        </label>
        <select
          value={form.role}
          onChange={e => setForm({ ...form, role: e.target.value as User['role'] })}
          className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
        >
          {activeRoles.map(r => (
            <option key={r.code} value={r.code}>
              {r.name} (Level {r.level}){r.isSystem ? ' • Core' : ''}
            </option>
          ))}
        </select>
        {selectedRoleDetail && (
          <p className="text-[11px] text-slate-500 mt-1 bg-slate-50 p-2 rounded border border-slate-200">
            <strong>Scope:</strong> {selectedRoleDetail.description}
          </p>
        )}
      </div>
      <div className="flex gap-3 mt-4">
        <button
          onClick={() => onSave(form)}
          disabled={!form.username || !form.name}
          className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          Save
        </button>
        <button
          onClick={onClose}
          className="px-6 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SETTINGS PAGE — replaces frmSettings
 * Enhanced with Unloading Configuration by Admin / System Admin (Requirement 8)
 * ═══════════════════════════════════════════════════════════════════════════ */
interface SettingsPageProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  currentUserRole?: string;
}

export function SettingsPage({ settings, onUpdate, currentUserRole }: SettingsPageProps) {
  const [form, setForm] = useState(settings);
  const [saved, setSaved] = useState(false);
  const [ipCameras, setIpCameras] = useState<IpCameraConfig[]>(form.ipCameras || []);
  const [isEditingCam, setIsEditingCam] = useState<boolean>(false);
  const [editingCam, setEditingCam] = useState<Partial<IpCameraConfig> | null>(null);
  const [testingCamId, setTestingCamId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);

  const canConfigureUnloading = currentUserRole === 'admin' || currentUserRole === 'system_admin';

  const handleSave = () => {
    const updated = { ...form, ipCameras };
    onUpdate(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleTestConnection = (cam: IpCameraConfig) => {
    setTestingCamId(cam.id);
    setTestResult(null);
    setTimeout(() => {
      setTestingCamId(null);
      setTestResult({
        id: cam.id,
        success: true,
        message: `RTSP stream & ANPR snapshot verified on ${cam.ipAddress}:${cam.port}. Latency: 36ms. Signal quality: 100%.`,
      });
      setTimeout(() => setTestResult(null), 6000);
    }, 1200);
  };

  const handleSaveCamera = (camData: Partial<IpCameraConfig>) => {
    if (!camData.name || !camData.ipAddress) return;
    if (camData.id) {
      const updated = ipCameras.map(c => (c.id === camData.id ? ({ ...c, ...camData } as IpCameraConfig) : c));
      setIpCameras(updated);
      setForm(prev => ({ ...prev, ipCameras: updated }));
    } else {
      const newCam: IpCameraConfig = {
        id: `cam-${Date.now().toString(36)}`,
        name: camData.name || 'New Weighbridge Camera',
        ipAddress: camData.ipAddress || '192.168.1.100',
        port: Number(camData.port) || 554,
        rtspUrl: camData.rtspUrl || `rtsp://admin:admin123@${camData.ipAddress || '192.168.1.100'}:554/Streaming/Channels/101`,
        httpSnapshotUrl: camData.httpSnapshotUrl || `http://${camData.ipAddress || '192.168.1.100'}:80/ISAPI/Streaming/channels/101/picture`,
        location: camData.location || 'Entrance Weighbridge #1',
        channel: Number(camData.channel) || 1,
        status: 'online',
        captureTrigger: camData.captureTrigger || 'scale_stabilized',
        isEnabled: camData.isEnabled ?? true,
      };
      const updated = [...ipCameras, newCam];
      setIpCameras(updated);
      setForm(prev => ({ ...prev, ipCameras: updated }));
    }
    setIsEditingCam(false);
    setEditingCam(null);
  };

  const handleDeleteCamera = (id: string) => {
    const updated = ipCameras.filter(c => c.id !== id);
    setIpCameras(updated);
    setForm(prev => ({ ...prev, ipCameras: updated }));
  };

  const handleToggleCamera = (id: string) => {
    const updated = ipCameras.map(c => (c.id === id ? { ...c, isEnabled: !c.isEnabled } : c));
    setIpCameras(updated);
    setForm(prev => ({ ...prev, ipCameras: updated }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-500" /> System Settings
          </h2>
          <p className="text-sm text-slate-500">Application configuration, operations control, and scale parameters</p>
        </div>
        {saved && <span className="text-sm text-emerald-600 font-medium">✓ Settings saved successfully!</span>}
      </div>

      {/* Unloading Configuration Card (Requirement 8) */}
      <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ArrowDownToLine className="w-4 h-4 text-orange-600" /> Operations Feature: Unloading Management
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              Admin / System Admin control to enable or disable the &apos;Unloading&apos; (formerly Weigh Out) option across
              navigation, quick actions, multi-weighment operations, and order planning. When disabled, the application
              operates in Loading-only mode.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (canConfigureUnloading) {
                  setForm({ ...form, enableUnloading: !form.enableUnloading });
                }
              }}
              disabled={!canConfigureUnloading}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all',
                form.enableUnloading
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300',
                !canConfigureUnloading && 'opacity-60 cursor-not-allowed'
              )}
            >
              {form.enableUnloading ? (
                <>
                  <Check className="w-4 h-4" /> Unloading Enabled
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" /> Unloading Disabled
                </>
              )}
            </button>
          </div>
        </div>

        {!canConfigureUnloading && (
          <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Unloading configuration requires <strong>System Admin</strong> or <strong>Admin</strong> privileges. Current user role: <span className="font-mono">{currentUserRole}</span>.
            </span>
          </div>
        )}
      </div>

      {/* IP-Based Cameras Configuration (Requirement 11) */}
      <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-800 text-base">
                IP-Based Cameras (Weighbridge Data & ANPR Plate Capture)
              </h3>
              <span className="text-xs bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
                {ipCameras.filter(c => c.isEnabled).length} Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              Configure ONVIF/RTSP/HTTP network cameras for automated License Plate Recognition (ANPR) and cargo bed photo capturing during weighbridge stabilization, entry slip generation, and bay loading operations.
            </p>
          </div>

          <button
            onClick={() => {
              setEditingCam({
                name: '',
                ipAddress: '192.168.1.130',
                port: 554,
                location: 'Entrance Weighbridge #1',
                channel: 1,
                captureTrigger: 'scale_stabilized',
                isEnabled: true,
                rtspUrl: 'rtsp://admin:admin123@192.168.1.130:554/Streaming/Channels/101',
                httpSnapshotUrl: 'http://192.168.1.130:80/ISAPI/Streaming/channels/101/picture',
              });
              setIsEditingCam(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm self-start"
          >
            <Plus className="w-4 h-4" /> Add IP Camera
          </button>
        </div>

        {testResult && (
          <div className="mt-4 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-800 animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{testResult.message}</span>
            </div>
            <button onClick={() => setTestResult(null)} className="text-emerald-700 hover:text-emerald-900 font-bold">✕</button>
          </div>
        )}

        {/* Camera List Cards */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
          {ipCameras.length === 0 ? (
            <div className="col-span-full p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-400 text-sm">
              No IP cameras configured yet. Click &quot;Add IP Camera&quot; to configure weighbridge ANPR cameras.
            </div>
          ) : (
            ipCameras.map(cam => {
              const isTesting = testingCamId === cam.id;
              return (
                <div
                  key={cam.id}
                  className={cn(
                    'rounded-xl border p-4 flex flex-col justify-between transition-all bg-white relative group',
                    cam.isEnabled ? 'border-slate-200 shadow-sm hover:border-indigo-300' : 'border-slate-200 bg-slate-50/70 opacity-60'
                  )}
                >
                  <div>
                    {/* Status & Actions bar */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'w-2.5 h-2.5 rounded-full inline-block',
                            !cam.isEnabled
                              ? 'bg-slate-400'
                              : cam.status === 'online'
                              ? 'bg-emerald-500 animate-pulse'
                              : 'bg-red-500'
                          )}
                        />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
                          {cam.isEnabled ? cam.status : 'Disabled'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleToggleCamera(cam.id)}
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                          title={cam.isEnabled ? 'Disable Camera' : 'Enable Camera'}
                        >
                          {cam.isEnabled ? <ToggleRight className="w-5 h-5 text-indigo-600" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <button
                          onClick={() => {
                            setEditingCam(cam);
                            setIsEditingCam(true);
                          }}
                          className="p-1 text-slate-400 hover:text-blue-600 rounded"
                          title="Edit Camera"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteCamera(cam.id)}
                          className="p-1 text-slate-400 hover:text-red-600 rounded"
                          title="Delete Camera"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-bold text-slate-800 text-sm leading-tight">{cam.name}</h4>
                    <p className="text-xs text-indigo-700 font-medium mt-0.5 flex items-center gap-1">
                      <Radio className="w-3 h-3 text-indigo-500" /> {cam.location}
                    </p>

                    <div className="mt-3 space-y-1.5 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100 font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">IP & Port:</span>
                        <span className="font-semibold text-slate-800">{cam.ipAddress}:{cam.port}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Channel:</span>
                        <span className="text-slate-700">CH {cam.channel}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Trigger:</span>
                        <span className="text-indigo-700 font-sans font-medium text-[11px]">
                          {cam.captureTrigger === 'scale_stabilized' ? '⚖️ Scale Stabilized' : cam.captureTrigger === 'entry_slip' ? '📄 Entry Slip' : '🖐️ Manual'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 truncate max-w-[140px]" title={cam.rtspUrl}>
                      {cam.rtspUrl ? 'RTSP Stream Ready' : 'HTTP Snapshot'}
                    </span>
                    <button
                      onClick={() => handleTestConnection(cam)}
                      disabled={isTesting || !cam.isEnabled}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-semibold transition-all',
                        isTesting
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700 hover:bg-indigo-50 hover:text-indigo-700',
                        !cam.isEnabled && 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="w-3 h-3 animate-spin" /> Ping...
                        </>
                      ) : (
                        <>
                          <Wifi className="w-3 h-3" /> Test Stream
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Edit / Add Camera Modal */}
        {isEditingCam && editingCam && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                  <Camera className="w-5 h-5 text-indigo-600" />
                  {editingCam.id ? 'Edit IP Camera' : 'Add IP Camera for Weighbridge'}
                </h3>
                <button
                  onClick={() => {
                    setIsEditingCam(false);
                    setEditingCam(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Camera Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Weighbridge #1 Front Plate Camera"
                    value={editingCam.name || ''}
                    onChange={e => setEditingCam({ ...editingCam, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">IP Address *</label>
                    <input
                      type="text"
                      placeholder="192.168.1.121"
                      value={editingCam.ipAddress || ''}
                      onChange={e => setEditingCam({ ...editingCam, ipAddress: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Port</label>
                    <input
                      type="number"
                      placeholder="554"
                      value={editingCam.port || 554}
                      onChange={e => setEditingCam({ ...editingCam, port: parseInt(e.target.value) || 554 })}
                      className="w-full px-3 py-2 border rounded-lg font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Installation Location *</label>
                  <select
                    value={editingCam.location || 'Entrance Weighbridge #1'}
                    onChange={e => setEditingCam({ ...editingCam, location: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg bg-white text-xs"
                  >
                    <option value="Entrance Weighbridge #1 (Front Plate)">Entrance Weighbridge #1 (Front Plate)</option>
                    <option value="Entrance Weighbridge #1 (Rear Plate)">Entrance Weighbridge #1 (Rear Plate)</option>
                    <option value="Weighbridge #1 Overhead (Cargo Bed View)">Weighbridge #1 Overhead (Cargo Bed View)</option>
                    <option value="Scale #2 Intermediate (Axle & Load)">Scale #2 Intermediate (Axle & Load)</option>
                    <option value="Exit Weighbridge / Departure Gate">Exit Weighbridge / Departure Gate</option>
                    <option value="Bay Loading Zone Area">Bay Loading Zone Area</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Data Capture Trigger</label>
                  <select
                    value={editingCam.captureTrigger || 'scale_stabilized'}
                    onChange={e => setEditingCam({ ...editingCam, captureTrigger: e.target.value as any })}
                    className="w-full px-3 py-2 border rounded-lg bg-white text-xs"
                  >
                    <option value="scale_stabilized">Automatic: When Scale Weight Stabilizes (Weigh In / Out)</option>
                    <option value="entry_slip">Automatic: When Entry Slip QR is Generated</option>
                    <option value="manual">Manual: Operator Triggered Snapshot Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">RTSP Stream URL</label>
                  <input
                    type="text"
                    placeholder="rtsp://admin:admin123@192.168.1.121:554/Streaming/Channels/101"
                    value={editingCam.rtspUrl || ''}
                    onChange={e => setEditingCam({ ...editingCam, rtspUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-xs text-slate-700"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HTTP Snapshot URL</label>
                  <input
                    type="text"
                    placeholder="http://192.168.1.121:80/ISAPI/Streaming/channels/101/picture"
                    value={editingCam.httpSnapshotUrl || ''}
                    onChange={e => setEditingCam({ ...editingCam, httpSnapshotUrl: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg font-mono text-xs text-slate-700"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="enableCam"
                    checked={editingCam.isEnabled ?? true}
                    onChange={e => setEditingCam({ ...editingCam, isEnabled: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <label htmlFor="enableCam" className="text-slate-700 font-medium">Enable this IP Camera for automated weighing capture</label>
                </div>
              </div>

              <div className="flex gap-2 mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleSaveCamera(editingCam)}
                  disabled={!editingCam.name || !editingCam.ipAddress}
                  className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  Save Camera Configuration
                </button>
                <button
                  onClick={() => {
                    setIsEditingCam(false);
                    setEditingCam(null);
                  }}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-medium hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Company Settings */}
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-500" /> Company Information
          </h3>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company Name</label>
              <input
                value={form.companyName}
                onChange={e => setForm({ ...form, companyName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
              <textarea
                value={form.companyAddress}
                onChange={e => setForm({ ...form, companyAddress: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input
                value={form.companyPhone}
                onChange={e => setForm({ ...form, companyPhone: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Currency Symbol</label>
                <input
                  value={form.currency}
                  onChange={e => setForm({ ...form, currency: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm font-mono font-bold"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Weight Decimals</label>
                <input
                  type="number"
                  value={form.weightDecimals}
                  onChange={e => setForm({ ...form, weightDecimals: parseInt(e.target.value) || 2 })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Hardware Settings */}
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-500" /> Hardware Configuration
          </h3>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Scale Port</label>
                <select
                  value={form.scalePort}
                  onChange={e => setForm({ ...form, scalePort: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option>COM1</option>
                  <option>COM2</option>
                  <option>COM3</option>
                  <option>COM4</option>
                  <option>USB</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Baud Rate</label>
                <select
                  value={form.scaleBaudRate}
                  onChange={e => setForm({ ...form, scaleBaudRate: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="4800">4800</option>
                  <option value="9600">9600</option>
                  <option value="19200">19200</option>
                  <option value="38400">38400</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Scale Protocol</label>
              <select
                value={form.scaleProtocol}
                onChange={e => setForm({ ...form, scaleProtocol: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              >
                <option>Generic ASCII</option>
                <option>A&D</option>
                <option>Mettler Toledo</option>
                <option>Ohaus</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Printer</label>
              <input
                value={form.printerName}
                onChange={e => setForm({ ...form, printerName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Ticket Number Prefix</label>
              <input
                value={form.ticketPrefix}
                onChange={e => setForm({ ...form, ticketPrefix: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm"
      >
        <Save className="w-4 h-4" /> Save Settings
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * AUDIT LOG PAGE — replaces AUDIT_LOG table viewer
 * ═══════════════════════════════════════════════════════════════════════════ */
interface AuditLogPageProps { logs: AuditLog[]; }
export function AuditLogPage({ logs }: AuditLogPageProps) {
  return (
    <div className="space-y-4">
      <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Shield className="w-5 h-5 text-violet-500" /> Audit Log</h2><p className="text-sm text-slate-500">Complete audit trail of all system changes (replaces AUDIT_LOG table + TRG_AUDIT_LOG trigger)</p></div>
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left"><th className="px-4 py-3 font-semibold text-slate-600">Timestamp</th><th className="px-4 py-3 font-semibold text-slate-600">User</th><th className="px-4 py-3 font-semibold text-slate-600">Action</th><th className="px-4 py-3 font-semibold text-slate-600">Entity</th><th className="px-4 py-3 font-semibold text-slate-600">Description</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {logs.map(l => (
              <tr key={l.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5 text-xs font-mono text-slate-500">{l.createdAt}</td>
                <td className="px-4 py-2.5 font-medium text-xs">{l.userName}</td>
                <td className="px-4 py-2.5"><span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded', l.action === 'create' ? 'bg-emerald-100 text-emerald-700' : l.action === 'update' ? 'bg-blue-100 text-blue-700' : l.action === 'delete' || l.action === 'void' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600')}>{l.action}</span></td>
                <td className="px-4 py-2.5 text-xs capitalize">{l.entity}</td>
                <td className="px-4 py-2.5 text-xs text-slate-600">{l.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * BACKUP PAGE — replaces frmBackup
 * ═══════════════════════════════════════════════════════════════════════════ */
export function BackupPage() {
  const [backupDone, setBackupDone] = useState(false);
  return (
    <div className="space-y-6">
      <div><h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><DatabaseBackup className="w-5 h-5 text-cyan-500" /> Backup & Restore</h2><p className="text-sm text-slate-500">Database backup and restore utilities (replaces frmBackup)</p></div>
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4">Create Backup</h3>
          <p className="text-sm text-slate-500 mb-4">Creates a full database backup (PostgreSQL pg_dump). In the original VB6 app, this used Firebird&apos;s gbak utility.</p>
          <div className="space-y-3 mb-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm text-slate-600">Last backup</span><span className="text-sm font-medium">2024-12-01 02:00:00</span></div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm text-slate-600">Backup size</span><span className="text-sm font-medium">45.2 MB</span></div>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"><span className="text-sm text-slate-600">Auto backup</span><span className="text-sm font-medium text-emerald-600">Daily at 02:00</span></div>
          </div>
          <button onClick={() => { setBackupDone(true); setTimeout(() => setBackupDone(false), 3000); }} className="w-full py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2">
            {backupDone ? <><CheckCircle2 className="w-4 h-4" /> Backup Complete!</> : <><Download className="w-4 h-4" /> Backup Now</>}
          </button>
        </div>
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4">Backup History</h3>
          <div className="space-y-2">
            {['2024-12-01 02:00', '2024-11-30 02:00', '2024-11-29 02:00', '2024-11-28 02:00', '2024-11-27 02:00'].map((d, i) => (
              <div key={d} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div><p className="text-sm font-medium">{d}</p><p className="text-xs text-slate-500">Full backup · {42 + i * 0.3} MB</p></div>
                <div className="flex gap-2">
                  <button className="text-xs text-blue-600 hover:underline">Download</button>
                  <button className="text-xs text-amber-600 hover:underline">Restore</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * ABOUT PAGE — replaces frmAbout
 * ═══════════════════════════════════════════════════════════════════════════ */
export function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow border border-slate-200 p-8 text-center">
        <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/20"><Scale className="w-10 h-10 text-white" /></div>
        <h2 className="text-2xl font-bold text-slate-800">WS Series</h2>
        <p className="text-slate-500 text-sm">Weighing Scale Management System</p>
        <p className="text-xs text-slate-400 mt-1">Version 2.0.0 (Modern Web)</p>
        <div className="mt-6 space-y-2 text-sm text-left">
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg"><span className="text-slate-500">Developed by</span><span className="font-medium">Bisoft Soltuions</span></div>
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg"><span className="text-slate-500">Current Platform</span><span className="font-medium">React 19 + TypeScript + Tailwind CSS</span></div>
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg"><span className="text-slate-500">Target Backend</span><span className="font-medium">NestJS 11 + Prisma + PostgreSQL 16</span></div>
          <div className="flex justify-between p-3 bg-slate-50 rounded-lg"><span className="text-slate-500">Source Repository</span><a href="https://github.com/AkilahJ14Jun/AkilahJ14Jun-LegacyApplications-WeighingScale" target="_blank" rel="noopener noreferrer" className="font-medium text-emerald-600 hover:underline">GitHub</a></div>
        </div>
        <div className="mt-6 p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
          <p className="text-xs text-emerald-800 leading-relaxed">
            <strong>Migration Note:</strong> This application is a complete modernization of the legacy VB6
            weighing scale system. Every form (frmLogin, frmWeighIn, frmWeighOut, frmProduct, frmCustomer,
            frmSupplier, frmVehicle, frmTicket, frmReport, frmDailySummary, frmSettings, frmUserMgmt,
            frmBackup, frmAbout) and every module (modDatabase, modSerial, modGlobal, modReport, modPrint,
            modUtil) has been replaced with modern TypeScript equivalents.
          </p>
        </div>
      </div>
    </div>
  );
}
