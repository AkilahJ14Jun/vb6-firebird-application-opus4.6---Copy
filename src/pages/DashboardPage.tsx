/**
 * ============================================================================
 * DASHBOARD PAGE
 * ============================================================================
 * Replaces: frmMain (MDI parent form) from VB6
 *
 * ORIGINAL VB6 BEHAVIOR:
 *   - MDI form showed a blank workspace with toolbar buttons
 *   - No dashboard/analytics view existed in the legacy app
 *
 * MODERN ENHANCEMENT:
 *   - KPI cards showing today's statistics
 *   - Recent tickets list
 *   - Quick-action buttons for common operations
 *   - Live weight display (simulated)
 *   This is a significant improvement over the blank MDI workspace.
 * ============================================================================
 */

import type { Ticket, DailySummary, User } from '@/types';
import {
  Scale, Ticket as TicketIcon,
  TrendingUp, Users2, Clock, LogIn, ClipboardList, Layers
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface DashboardPageProps {
  tickets: Ticket[];
  summary: DailySummary[];
  user: User;
  onNavigate: (page: string) => void;
  enableUnloading?: boolean;
}

export function DashboardPage({ tickets, summary, user, onNavigate, enableUnloading = true }: DashboardPageProps) {
  const today = new Date().toISOString().split('T')[0];
  const todaySummary = summary.find((s) => s.date === today);
  const openTickets = tickets.filter((t) => t.status === 'open');
  const recentTickets = [...tickets]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8);

  const totalRevenue = summary.reduce((sum, s) => sum + s.totalAmount, 0);
  const totalWeight = summary.reduce((sum, s) => sum + s.totalWeight, 0);

  return (
    <div className="space-y-6">
      {/* ── Welcome Banner ──────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-xl p-6 text-white">
        <h2 className="text-xl font-bold">Welcome back, {user.name}</h2>
        <p className="text-emerald-100 text-sm mt-1">
          Here&apos;s your weighing operations overview for today, {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* ── KPI Cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Today's Tickets",
            value: todaySummary?.totalTickets || 0,
            icon: TicketIcon,
            color: 'bg-blue-50 text-blue-600 border-blue-200',
            iconBg: 'bg-blue-100',
          },
          {
            label: enableUnloading ? 'Open (Pending Unloading)' : 'Open (Pending Completion)',
            value: openTickets.length,
            icon: Clock,
            color: 'bg-amber-50 text-amber-600 border-amber-200',
            iconBg: 'bg-amber-100',
          },
          {
            label: "Today's Weight (kg)",
            value: (todaySummary?.totalWeight || 0).toLocaleString(),
            icon: Scale,
            color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
            iconBg: 'bg-emerald-100',
          },
          {
            label: "Today's Revenue",
            value: `₹ ${(todaySummary?.totalAmount || 0).toLocaleString()}`,
            icon: TrendingUp,
            color: 'bg-purple-50 text-purple-600 border-purple-200',
            iconBg: 'bg-purple-100',
          },
        ].map((kpi) => (
          <div key={kpi.label} className={cn('rounded-xl border p-4', kpi.color)}>
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mb-3', kpi.iconBg)}>
              <kpi.icon className="w-5 h-5" />
            </div>
            <p className="text-xs font-medium opacity-70">{kpi.label}</p>
            <p className="text-2xl font-extrabold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* ── Workflow Operations Quick Actions ───────────────────────── */}
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5">
          End-to-End Warehouse Weighing Workflow
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              step: 'Step 1',
              label: 'Vehicle Entry & Approval',
              desc: 'Capture arrival, check credit, issue entry slip with QR code',
              icon: LogIn,
              page: 'vehicle-entry',
              color: 'from-emerald-600 to-teal-700',
              accent: 'bg-emerald-500/20 text-emerald-200',
            },
            {
              step: 'Step 2',
              label: 'Planning & Delivery Order',
              desc: 'Assign supervisor, bays, handlers & generate Delivery Order',
              icon: ClipboardList,
              page: 'planning',
              color: 'from-blue-600 to-indigo-700',
              accent: 'bg-blue-500/20 text-blue-200',
            },
            {
              step: 'Step 3',
              label: 'Multi-Weighment Console',
              desc: 'Tare, sequential bay weighments, timestamps & warehouse time',
              icon: Layers,
              page: 'multi-weighment',
              color: 'from-purple-600 to-violet-700',
              accent: 'bg-purple-500/20 text-purple-200',
            },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => onNavigate(action.page)}
              className={cn(
                'bg-gradient-to-br text-white rounded-xl p-4 text-left transition-all hover:shadow-lg hover:scale-[1.01] flex flex-col justify-between group',
                action.color
              )}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn('text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full', action.accent)}>
                    {action.step}
                  </span>
                  <action.icon className="w-5 h-5 opacity-80 group-hover:scale-110 transition-transform" />
                </div>
                <p className="font-bold text-sm">{action.label}</p>
                <p className="text-xs text-white/80 mt-1 leading-snug">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Open Tickets (Pending Weigh-Out) ──────────────────────── */}
        <div className="bg-white rounded-xl shadow border border-slate-200">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Open Tickets ({enableUnloading ? 'Awaiting Unloading' : 'Awaiting Completion'})
            </h3>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {openTickets.length}
            </span>
          </div>
          <div className="divide-y divide-slate-50">
            {openTickets.length === 0 ? (
              <p className="p-6 text-sm text-slate-400 text-center">No open tickets</p>
            ) : (
              openTickets.map((t) => (
                <div key={t.id} className="p-3 hover:bg-slate-50 flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                    <Scale className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{t.ticketNo}</p>
                    <p className="text-xs text-slate-500">{t.vehiclePlateNo} · {t.productName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">{t.grossWeight?.toLocaleString()} kg</p>
                    <p className="text-[10px] text-slate-400">{t.weighInAt?.split(' ')[1]}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Recent Tickets ────────────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow border border-slate-200">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TicketIcon className="w-4 h-4 text-blue-500" />
              Recent Tickets
            </h3>
            <button
              onClick={() => onNavigate('tickets')}
              className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentTickets.map((t) => (
              <div key={t.id} className="p-3 hover:bg-slate-50 flex items-center gap-3">
                <div className={cn(
                  'w-2 h-2 rounded-full flex-shrink-0',
                  t.status === 'open' ? 'bg-amber-500' : t.status === 'closed' ? 'bg-emerald-500' : 'bg-red-500'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-800">{t.ticketNo}</p>
                    <span className={cn(
                      'text-[10px] font-bold px-1.5 py-0.5 rounded',
                      t.type === 'purchase' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                    )}>
                      {t.type === 'purchase' ? 'BUY' : 'SELL'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate">
                    {t.vehiclePlateNo} · {t.productName} · {t.customerName || t.supplierName}
                  </p>
                </div>
                <div className="text-right">
                  {t.netWeight ? (
                    <p className="text-sm font-semibold text-slate-700">{t.netWeight.toLocaleString()} kg</p>
                  ) : (
                    <p className="text-xs text-amber-500 font-medium">Pending</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Weekly Summary ────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Users2 className="w-4 h-4 text-indigo-500" />
          7-Day Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-3 py-2 font-semibold text-slate-600 rounded-l-lg">Date</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-center">Total</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-center">Buy</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-center">Sell</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-right">Weight (kg)</th>
                <th className="px-3 py-2 font-semibold text-slate-600 text-right rounded-r-lg">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {summary.slice(0, 7).map((s) => (
                <tr key={s.date} className="hover:bg-slate-50">
                  <td className="px-3 py-2 font-medium text-slate-800">{s.date}</td>
                  <td className="px-3 py-2 text-center">{s.totalTickets}</td>
                  <td className="px-3 py-2 text-center text-blue-600">{s.purchaseTickets}</td>
                  <td className="px-3 py-2 text-center text-green-600">{s.saleTickets}</td>
                  <td className="px-3 py-2 text-right font-mono">{s.totalWeight.toLocaleString()}</td>
                  <td className="px-3 py-2 text-right font-mono font-semibold">{s.totalAmount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50 font-bold">
                <td className="px-3 py-2 rounded-l-lg text-indigo-800">Total</td>
                <td className="px-3 py-2 text-center text-indigo-700">{summary.reduce((s, d) => s + d.totalTickets, 0)}</td>
                <td className="px-3 py-2 text-center text-indigo-700">{summary.reduce((s, d) => s + d.purchaseTickets, 0)}</td>
                <td className="px-3 py-2 text-center text-indigo-700">{summary.reduce((s, d) => s + d.saleTickets, 0)}</td>
                <td className="px-3 py-2 text-right font-mono text-indigo-700">{totalWeight.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono text-indigo-700 rounded-r-lg">{totalRevenue.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
