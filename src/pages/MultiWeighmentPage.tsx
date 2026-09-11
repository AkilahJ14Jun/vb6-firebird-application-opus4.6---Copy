/**
 * ============================================================================
 * MULTI-WEIGHMENT OVERALL STATUS VIEWER
 * ============================================================================
 * Fulfills Requirements 8, 18, 19 from Changes required.txt:
 * - Line 8: "In Multi-Weighment page , the user should be able to select a
 *            particular D.O or vehicle from a list."
 * - Line 18: "In 'Multi-wieghment' page is now only meant for seeing the
 *            overall status for a given D.O or vehicle and no data entry
 *            takes place here."
 * - Line 19: "In this page The 'Billing Section' is not required."
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import type { DeliveryOrderPlan, MultiWeighmentSession, User } from '@/types';
import { formatDuration } from '@/store/appStore';
import { cn } from '@/utils/cn';
import {
  Layers, Truck, Search, CheckCircle2, Clock, MapPin,
  ShieldCheck, DoorOpen, Scale, AlertTriangle, Package,
  UserCheck, FileText, Check
} from 'lucide-react';

interface MultiWeighmentPageProps {
  deliveryOrders: DeliveryOrderPlan[];
  sessions?: MultiWeighmentSession[];
  currentUser?: User;
  selectedDOId?: number;
  onSaveSession?: (session: MultiWeighmentSession) => void;
}

export const MultiWeighmentPage: React.FC<MultiWeighmentPageProps> = ({
  deliveryOrders,
  selectedDOId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'exited'>('all');

  const filteredOrders = deliveryOrders.filter(d => {
    const matchesFilter =
      filterTab === 'all'
        ? true
        : filterTab === 'active'
        ? d.status !== 'exited'
        : d.status === 'exited';

    const q = searchQuery.toLowerCase();
    const matchesSearch =
      d.doNumber.toLowerCase().includes(q) ||
      d.vehicleNumber.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q) ||
      d.material.toLowerCase().includes(q);

    return matchesFilter && matchesSearch;
  });

  const [activeDOId, setActiveDOId] = useState<number | null>(() => {
    if (selectedDOId) return selectedDOId;
    return deliveryOrders[0]?.id || null;
  });

  useEffect(() => {
    if (selectedDOId) {
      setActiveDOId(selectedDOId);
    }
  }, [selectedDOId]);

  const activeDO = deliveryOrders.find(d => d.id === activeDOId) || deliveryOrders[0];

  // Calculated weights & metrics (Read-Only)
  const totalPlannedWgt = activeDO?.totalPlannedWeightKg || 0;
  const totalActualWgt = activeDO?.items.reduce((sum, i) => sum + (i.actualLoadedWeightKg || 0), 0) || 0;
  const tolerance = activeDO?.weightToleranceKg ?? 50;
  const variance = totalActualWgt - totalPlannedWgt;
  const isWithinTolerance = Math.abs(variance) <= tolerance;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-6 h-6 text-blue-600" />
              Multi-Weighment Overall Status
            </h2>
            <span className="text-xs bg-slate-200 text-slate-700 font-bold px-2 py-0.5 rounded-full">
              Status Dashboard (Read-Only)
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Select a Delivery Order or Vehicle to review complete lifecycle status across all warehouse stages (Requirements 8, 18, 19).
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterTab('all')}
            className={cn(
              'px-3 py-1.5 rounded-lg transition',
              filterTab === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            All Orders ({deliveryOrders.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('active')}
            className={cn(
              'px-3 py-1.5 rounded-lg transition',
              filterTab === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Active In-Warehouse ({deliveryOrders.filter(d => d.status !== 'exited').length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab('exited')}
            className={cn(
              'px-3 py-1.5 rounded-lg transition',
              filterTab === 'exited' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            Exited ({deliveryOrders.filter(d => d.status === 'exited').length})
          </button>
        </div>
      </div>

      {/* ── Main Layout: Selector (4 cols) + Details (8 cols) ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Requirement 8 - Select particular D.O or Vehicle from list */}
        <div className="lg:col-span-4 space-y-3">
          {/* Quick Selection Dropdown Lists for D.O and Vehicle Numbers */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select by D.O Number
              </label>
              <select
                value={activeDOId || ''}
                onChange={e => {
                  const id = Number(e.target.value);
                  if (id) setActiveDOId(id);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Select D.O Number --</option>
                {deliveryOrders.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.doNumber} ({d.vehicleNumber} - {d.customerName})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select by Vehicle Number
              </label>
              <select
                value={activeDOId || ''}
                onChange={e => {
                  const id = Number(e.target.value);
                  if (id) setActiveDOId(id);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">-- Select Vehicle Number --</option>
                {deliveryOrders.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.vehicleNumber} (D.O: {d.doNumber})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Vehicle or D.O Number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="space-y-2 max-h-[680px] overflow-y-auto pr-1">
            {filteredOrders.length === 0 ? (
              <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No orders match your filter.
              </div>
            ) : (
              filteredOrders.map(d => {
                const isSelected = d.id === activeDOId;
                const isExited = d.status === 'exited';
                const isChecked = d.checkingStatus === 'checked' || d.status === 'Checked';

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setActiveDOId(d.id)}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 shadow-md ring-2 ring-blue-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                        {d.vehicleNumber}
                      </span>
                      {isExited ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-300">
                          Exited
                        </span>
                      ) : isChecked ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                          Checked
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          {d.status.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono text-blue-700 font-semibold">{d.doNumber}</span>
                      <span className="font-mono">{d.items.length} item(s)</span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium truncate mt-1">{d.customerName}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                      <span>Planned: {d.totalPlannedWeightKg.toLocaleString()} kg</span>
                      <span>Tol: ±{d.weightToleranceKg ?? 50} kg</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Requirement 18 - Overall Status Viewer (NO data entry) */}
        <div className="lg:col-span-8">
          {activeDO ? (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-6">
              {/* Header Overview Card */}
              <div className="p-4 bg-gradient-to-r from-blue-50/50 via-slate-50 to-indigo-50/40 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                      {activeDO.doNumber}
                    </span>
                    <span className="text-xs text-slate-500">Slip #{activeDO.slipNo}</span>
                    <span className="text-xs font-mono font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded">
                      Tol: ±{activeDO.weightToleranceKg ?? 50} kg
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 font-mono uppercase flex items-center gap-2">
                    <Truck className="w-5 h-5 text-blue-600" />
                    {activeDO.vehicleNumber}
                    <span className="text-sm font-sans font-normal text-slate-500 normal-case">
                      — {activeDO.customerName}
                    </span>
                  </h3>
                </div>

                <div className="text-right text-xs">
                  <p className="text-slate-500">Current Warehouse Location:</p>
                  <p className="font-bold text-blue-700 text-sm mt-0.5 flex items-center justify-end gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {activeDO.currentLocation}
                  </p>
                  <p className="text-[11px] text-slate-400">Supervisor: {activeDO.supervisorName}</p>
                </div>
              </div>

              {/* Lifecycle Stage Progression Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-center font-semibold">
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="block text-[10px] uppercase font-bold text-emerald-600">Stage 1</span>
                  <span>✓ Vehicle Entry</span>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="block text-[10px] uppercase font-bold text-emerald-600">Stage 2</span>
                  <span>✓ Planning & D.O</span>
                </div>
                <div
                  className={cn(
                    'p-2.5 rounded-lg border',
                    totalActualWgt > 0
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  )}
                >
                  <span className="block text-[10px] uppercase font-bold text-slate-500">Stage 3</span>
                  <span>{totalActualWgt > 0 ? '✓ Loading Activity' : 'In Progress'}</span>
                </div>
                <div
                  className={cn(
                    'p-2.5 rounded-lg border',
                    activeDO.status === 'exited'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : activeDO.checkingStatus === 'checked'
                      ? 'bg-blue-50 text-blue-800 border-blue-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  )}
                >
                  <span className="block text-[10px] uppercase font-bold text-slate-500">Stage 4 & 5</span>
                  <span>{activeDO.status === 'exited' ? '✓ Cleared & Exited' : activeDO.checkingStatus === 'checked' ? 'At Exit Gate' : 'Awaiting Check'}</span>
                </div>
              </div>

              {/* Key Weights & Timing Statistics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-center">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Planned Cargo</span>
                  <p className="text-xl font-mono font-black text-slate-900 mt-1">
                    {totalPlannedWgt.toLocaleString()} kg
                  </p>
                  <p className="text-[10px] text-slate-400">{activeDO.items.length} item(s)</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Actual Loaded</span>
                  <p className="text-xl font-mono font-black text-blue-700 mt-1">
                    {totalActualWgt > 0 ? `${totalActualWgt.toLocaleString()} kg` : 'In Progress'}
                  </p>
                  <p className="text-[10px] text-slate-400">Total Across Bays</p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Weight Tolerance</span>
                  <p className="text-xl font-mono font-black text-amber-700 mt-1">
                    ±{tolerance} kg
                  </p>
                  <p className={cn('text-[10px] font-bold', isWithinTolerance ? 'text-emerald-600' : 'text-red-600')}>
                    {totalActualWgt > 0 ? (isWithinTolerance ? '✓ In Limits' : 'Exceeds Tolerance') : 'Configured'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Gate In-Time</span>
                  <p className="text-base font-mono font-bold text-slate-800 mt-1">
                    {activeDO.inTime}
                  </p>
                  <p className="text-[10px] text-slate-400">Out: {activeDO.exitedAt || 'In Warehouse'}</p>
                </div>
              </div>

              {/* Items & Bays Status Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Planned vs Actual Loaded Items</span>
                  <span className="text-[11px] font-normal text-slate-400">
                    Allocated across {activeDO.baysCount} bay(s)
                  </span>
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Bay #</th>
                        <th className="py-2.5 px-3">Bay Description</th>
                        <th className="py-2.5 px-3">Item / Material</th>
                        <th className="py-2.5 px-3 text-right">Planned (kg)</th>
                        <th className="py-2.5 px-3 text-right">Actual Loaded (kg)</th>
                        <th className="py-2.5 px-3">Handler In-Charge</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeDO.items.map((item, idx) => {
                        const planned = item.plannedWeightKg;
                        const actual = item.actualLoadedWeightKg || 0;
                        const isLoaded = actual > 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-blue-700">#{item.bayNumber}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-800">{item.bayName}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{item.itemName}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600 text-right">{planned.toLocaleString()} kg</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right">
                              {isLoaded ? `${actual.toLocaleString()} kg` : <span className="text-slate-400 italic">0 kg</span>}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">{item.handlerName}</td>
                            <td className="py-2.5 px-3 text-center">
                              {isLoaded ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  ✓ Completed
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Pending
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Inspection & Exit Gate Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {/* Checking Inspection Status */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      Checking Section Verification
                    </span>
                    <span className={cn('px-2 py-0.5 rounded font-bold text-[10px]', activeDO.checkingStatus === 'checked' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}>
                      {activeDO.checkingStatus ? activeDO.checkingStatus.toUpperCase() : 'PENDING'}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Checker: <strong>{activeDO.checkerName || 'P. Shanmugam (Checker)'}</strong>
                  </p>
                  <p className="text-slate-500">
                    Checked At: {activeDO.checkedAt || 'Awaiting physical count & quantity inspection'}
                  </p>
                  {activeDO.discrepancyNotes && (
                    <p className="p-2 bg-white rounded border border-slate-200 text-slate-700 italic">
                      "{activeDO.discrepancyNotes}"
                    </p>
                  )}
                </div>

                {/* Exit Gate Status */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 uppercase text-[11px] flex items-center gap-1.5">
                      <DoorOpen className="w-4 h-4 text-indigo-600" />
                      Exit Gate Departure Clearance
                    </span>
                    <span className={cn('px-2 py-0.5 rounded font-bold text-[10px]', activeDO.status === 'exited' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700')}>
                      {activeDO.status === 'exited' ? 'EXIT CLEARED' : 'PENDING GATE EXIT'}
                    </span>
                  </div>
                  <p className="text-slate-600">
                    Exit Weight: <strong>{activeDO.exitWeightKg ? `${activeDO.exitWeightKg.toLocaleString()} kg` : 'Pending Scale Capture'}</strong>
                  </p>
                  <p className="text-slate-500">
                    Gate Departure: {activeDO.exitedAt || 'Vehicle still inside premises'}
                  </p>
                  {activeDO.exitGateOfficer && (
                    <p className="text-slate-600">Cleared by: <strong>{activeDO.exitGateOfficer}</strong></p>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Please select a Delivery Order to review overall status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
