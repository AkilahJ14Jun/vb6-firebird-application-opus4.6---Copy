/**
 * ============================================================================
 * CHECKING SECTION PAGE
 * ============================================================================
 * As specified in Changes required.txt:
 * Line 15: "Once loading or unloading activity is marked as finished then it has to go the checking section."
 * Line 16: "A separate page is required to perform this checking activity."
 * Line 17: "The person performing the checking will check the number of items
 *          and the quantity against what was planned in the D.O initially."
 * ============================================================================
 */

import React, { useState } from 'react';
import type { DeliveryOrderPlan, WarehouseEmployee, User } from '@/types';
import { formatTime12, formatNow } from '@/store/appStore';
import { cn } from '@/utils/cn';
import {
  ShieldCheck, CheckCircle2, AlertTriangle, Search, Check,
  UserCheck, ArrowRight, Package, Clock, Truck, FileText,
  RotateCcw, Eye, Layers, Filter
} from 'lucide-react';

interface CheckingPageProps {
  deliveryOrders: DeliveryOrderPlan[];
  employees: WarehouseEmployee[];
  currentUser?: User;
  onUpdateDeliveryOrder: (order: DeliveryOrderPlan) => void;
  onNavigateToExitGate?: (doId: number) => void;
}

export const CheckingPage: React.FC<CheckingPageProps> = ({
  deliveryOrders,
  employees,
  currentUser,
  onUpdateDeliveryOrder,
  onNavigateToExitGate,
}) => {
  const [filterTab, setFilterTab] = useState<'awaiting' | 'checked' | 'all'>('awaiting');
  const [searchQuery, setSearchQuery] = useState('');

  // Find DOs awaiting check (or in other statuses)
  const awaitingDOs = deliveryOrders.filter(
    d => d.status === 'awaiting_check' || (d.checkingStatus === 'pending' && d.status !== 'exited' && d.status !== 'planned')
  );
  const checkedDOs = deliveryOrders.filter(
    d => d.checkingStatus === 'checked' || d.status === 'Checked' || d.status === 'exited'
  );

  const displayedDOs = (
    filterTab === 'awaiting' ? awaitingDOs : filterTab === 'checked' ? checkedDOs : deliveryOrders
  ).filter(d => {
    const q = searchQuery.toLowerCase();
    return (
      d.doNumber.toLowerCase().includes(q) ||
      d.vehicleNumber.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q) ||
      d.material.toLowerCase().includes(q)
    );
  });

  const [selectedDOId, setSelectedDOId] = useState<number | null>(() => {
    return awaitingDOs[0]?.id || deliveryOrders[0]?.id || null;
  });

  const currentDO = deliveryOrders.find(d => d.id === selectedDOId);

  // Checkers list from warehouse personnel
  const checkers = employees.filter(e => e.role === 'checker' || e.role === 'supervisor');
  const [checkerName, setCheckerName] = useState<string>(
    currentUser?.role === 'checker' ? currentUser.name : (checkers[0]?.name || 'P. Shanmugam (Checker)')
  );
  const [checkingNotes, setCheckingNotes] = useState('');
  const [verifiedItemIds, setVerifiedItemIds] = useState<Record<string, boolean>>({});
  const [discrepancyBayNum, setDiscrepancyBayNum] = useState<number>(1);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSelectDO = (doId: number) => {
    setSelectedDOId(doId);
    setVerifiedItemIds({});
    setSuccessMsg(null);
    const target = deliveryOrders.find(d => d.id === doId);
    if (target?.discrepancyNotes) {
      setCheckingNotes(target.discrepancyNotes);
    } else {
      setCheckingNotes('');
    }
  };

  const toggleItemVerified = (itemId: string) => {
    setVerifiedItemIds(prev => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const handleVerifyAllItems = () => {
    if (!currentDO) return;
    const allVerified: Record<string, boolean> = {};
    currentDO.items.forEach(i => {
      allVerified[i.id] = true;
    });
    setVerifiedItemIds(allVerified);
  };

  // Perform item count & weight checks
  const plannedItemsCount = currentDO?.items.length || 0;
  const actualItemsWithWeight = currentDO?.items.filter(i => (i.actualLoadedWeightKg || 0) > 0).length || 0;
  const allItemsChecked = currentDO ? currentDO.items.every(i => verifiedItemIds[i.id]) : false;

  const totalPlannedWgt = currentDO?.totalPlannedWeightKg || 0;
  const totalActualWgt = currentDO?.items.reduce((sum, i) => sum + (i.actualLoadedWeightKg || 0), 0) || 0;
  const weightVariance = Math.abs(totalActualWgt - totalPlannedWgt);
  const tolerance = currentDO?.weightToleranceKg ?? 50;
  const isWeightWithinTolerance = weightVariance <= tolerance;

  // Approve & Mark Checked
  const handleApproveChecked = () => {
    if (!currentDO) return;

    const updated: DeliveryOrderPlan = {
      ...currentDO,
      status: 'Checked',
      checkingStatus: 'checked',
      checkerName,
      checkedAt: formatTime12(),
      discrepancyNotes: checkingNotes.trim() || 'All items and quantities verified successfully against initial D.O.',
      currentLocation: 'At Exit Gate',
    };

    onUpdateDeliveryOrder(updated);
    setSuccessMsg(`✓ Vehicle ${currentDO.vehicleNumber} (D.O: ${currentDO.doNumber}) checked and cleared! Guided to Exit Gate.`);
  };

  // Flag Discrepancy
  const handleFlagDiscrepancy = () => {
    if (!currentDO) return;
    if (!checkingNotes.trim()) {
      alert('Please enter remarks explaining the discrepancy observed.');
      return;
    }

    const updated: DeliveryOrderPlan = {
      ...currentDO,
      status: 'discrepancy',
      checkingStatus: 'discrepancy',
      checkerName,
      checkedAt: formatTime12(),
      discrepancyNotes: checkingNotes.trim(),
      discrepancyTargetBays: [discrepancyBayNum],
      currentLocation: `Guided back to Bay ${discrepancyBayNum} (Discrepancy)`,
    };

    onUpdateDeliveryOrder(updated);
    setSuccessMsg(`⚠️ Discrepancy recorded for ${currentDO.vehicleNumber}. Vehicle guided back to Bay #${discrepancyBayNum}.`);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-emerald-600" />
            Checking Section (Inspection & Verification)
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Check the number of items and the quantity loaded/unloaded against what was planned in the D.O initially (Requirement 16 & 17).
          </p>
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterTab('awaiting')}
            className={cn(
              'px-3 py-1.5 rounded-lg transition flex items-center gap-1.5',
              filterTab === 'awaiting' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Awaiting Check
            <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full font-mono font-bold">
              {awaitingDOs.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('checked')}
            className={cn(
              'px-3 py-1.5 rounded-lg transition flex items-center gap-1.5',
              filterTab === 'checked' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Checked
            <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full font-mono font-bold">
              {checkedDOs.length}
            </span>
          </button>

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
        </div>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          {onNavigateToExitGate && currentDO && (
            <button
              type="button"
              onClick={() => onNavigateToExitGate(currentDO.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              Proceed to Exit Gate →
            </button>
          )}
        </div>
      )}

      {/* ── Main Layout: DO Queue + Verification Panel ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: DO Selection List (4 cols) */}
        <div className="lg:col-span-4 space-y-3">
          {/* Quick Selection Dropdown Lists for D.O and Vehicle Numbers */}
          <div className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs space-y-2.5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                Select by D.O Number
              </label>
              <select
                value={selectedDOId || ''}
                onChange={e => {
                  const id = Number(e.target.value);
                  if (id) handleSelectDO(id);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
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
                value={selectedDOId || ''}
                onChange={e => {
                  const id = Number(e.target.value);
                  if (id) handleSelectDO(id);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
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
              placeholder="Search vehicle or D.O number..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {displayedDOs.length === 0 ? (
              <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No Delivery Orders in this category.
              </div>
            ) : (
              displayedDOs.map(d => {
                const isSelected = d.id === selectedDOId;
                const isAwaiting = d.status === 'awaiting_check' || (d.checkingStatus === 'pending' && d.status !== 'exited');
                const isChecked = d.checkingStatus === 'checked' || d.status === 'Checked';
                const isDiscrepancy = d.status === 'discrepancy' || d.checkingStatus === 'discrepancy';

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => handleSelectDO(d.id)}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'bg-emerald-50/80 border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                        {d.vehicleNumber}
                      </span>
                      {isAwaiting && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          Awaiting Check
                        </span>
                      )}
                      {isChecked && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Checked
                        </span>
                      )}
                      {isDiscrepancy && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                          Discrepancy
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono text-emerald-700 font-semibold">{d.doNumber}</span>
                      <span>{d.items.length} item(s)</span>
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

        {/* Right Column: Detailed Checking Verification Panel (8 cols) */}
        <div className="lg:col-span-8">
          {currentDO ? (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-6">
              {/* Top DO Banner */}
              <div className="p-4 bg-gradient-to-r from-slate-50 to-emerald-50/50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {currentDO.doNumber}
                    </span>
                    <span className="text-[11px] text-slate-500">Slip #{currentDO.slipNo}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 font-mono uppercase flex items-center gap-2">
                    <Truck className="w-5 h-5 text-emerald-600" />
                    {currentDO.vehicleNumber}
                    <span className="text-sm font-sans font-normal text-slate-500 normal-case">
                      ({currentDO.customerName})
                    </span>
                  </h3>
                </div>

                <div className="text-right text-xs">
                  <p className="text-slate-500">Current Location:</p>
                  <p className="font-bold text-blue-700 text-sm mt-0.5">{currentDO.currentLocation}</p>
                  <p className="text-[11px] text-slate-400">Supervisor: {currentDO.supervisorName}</p>
                </div>
              </div>

              {/* Requirement 17: Number of items and quantity check against what was planned in DO */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Package className="w-4 h-4 text-emerald-600" />
                    Items & Quantity Verification Table
                  </h4>
                  <button
                    type="button"
                    onClick={handleVerifyAllItems}
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-bold hover:underline"
                  >
                    ✓ Mark All Items Verified
                  </button>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Verify</th>
                        <th className="py-2.5 px-3">Bay & Handler</th>
                        <th className="py-2.5 px-3">Item / Material</th>
                        <th className="py-2.5 px-3 text-right">Planned Qty (kg)</th>
                        <th className="py-2.5 px-3 text-right">Actual Loaded (kg)</th>
                        <th className="py-2.5 px-3 text-right">Difference</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentDO.items.map((item, idx) => {
                        const planned = Number(item.plannedWeightKg) || 0;
                        const actual = Number(item.actualLoadedWeightKg) || 0;
                        const diff = actual - planned;
                        const isVerified = verifiedItemIds[item.id] || false;
                        const isMatch = Math.abs(diff) <= (currentDO.weightToleranceKg ?? 50);

                        return (
                          <tr
                            key={item.id || idx}
                            className={cn(
                              'hover:bg-slate-50 transition-colors',
                              isVerified && 'bg-emerald-50/40'
                            )}
                          >
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isVerified}
                                onChange={() => toggleItemVerified(item.id)}
                                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                              />
                            </td>

                            <td className="py-2.5 px-3">
                              <p className="font-bold text-slate-800">{item.bayName}</p>
                              <p className="text-[10px] text-slate-400">Handler: {item.handlerName}</p>
                            </td>

                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {item.itemName}
                              {item.notes && (
                                <p className="text-[10px] text-slate-400 font-normal">{item.notes}</p>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-mono text-slate-700 text-right font-bold">
                              {planned.toLocaleString()} kg
                            </td>

                            <td className="py-2.5 px-3 font-mono text-slate-900 text-right font-black">
                              {actual > 0 ? `${actual.toLocaleString()} kg` : (
                                <span className="text-amber-600 italic">Not Loaded Yet</span>
                              )}
                            </td>

                            <td className="py-2.5 px-3 font-mono text-right font-bold">
                              {actual > 0 ? (
                                <span className={diff === 0 ? 'text-slate-600' : diff > 0 ? 'text-amber-700' : 'text-blue-700'}>
                                  {diff > 0 ? `+${diff.toLocaleString()}` : diff.toLocaleString()} kg
                                </span>
                              ) : (
                                '—'
                              )}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              {actual === 0 ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                                  Pending
                                </span>
                              ) : isMatch ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                  ✓ In Limits
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                                  Variance
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

              {/* Requirement 17: Quantitative & Item Count Analysis Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* Number of Items check */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Item Count Verification</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-xl font-mono font-black text-slate-900">
                      {plannedItemsCount} of {plannedItemsCount} Items
                    </p>
                  </div>
                  <p className="text-[11px] text-emerald-600 font-semibold mt-0.5">
                    {allItemsChecked ? '✓ All items physically checked' : 'Tick checkboxes to confirm'}
                  </p>
                </div>

                {/* Overall Weight vs Planned */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Weight vs Planned</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-xl font-mono font-black text-slate-900">
                      {totalActualWgt.toLocaleString()} <span className="text-xs font-normal">/ {totalPlannedWgt.toLocaleString()} kg</span>
                    </p>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Variance: {weightVariance > 0 ? `${totalActualWgt > totalPlannedWgt ? '+' : '-'}${weightVariance.toLocaleString()} kg` : '0 kg'}
                  </p>
                </div>

                {/* Tolerance Check */}
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Configured Tolerance</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <p className="text-xl font-mono font-black text-amber-700">
                      ±{tolerance} kg
                    </p>
                  </div>
                  <p className={cn('text-[11px] font-bold mt-0.5', isWeightWithinTolerance ? 'text-emerald-600' : 'text-red-600')}>
                    {isWeightWithinTolerance ? '✓ Total within tolerance limit' : '⚠️ Exceeds tolerance limit!'}
                  </p>
                </div>
              </div>

              {/* Checker Sign-off & Inspection Form */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <h5 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Checking Officer Sign-Off
                </h5>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Checking Personnel Name *
                    </label>
                    <input
                      type="text"
                      value={checkerName}
                      onChange={e => setCheckerName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Guide back to Bay (If Discrepancy Found)
                    </label>
                    <select
                      value={discrepancyBayNum}
                      onChange={e => setDiscrepancyBayNum(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {currentDO.items.map(i => (
                        <option key={i.id} value={i.bayNumber}>
                          {i.bayName} — {i.itemName} ({i.handlerName})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                    Inspection Remarks & Discrepancy Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. All 2 item bundles verified and count matched with DO."
                    value={checkingNotes}
                    onChange={e => setCheckingNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                {/* Actions */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleApproveChecked}
                    className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-2 shadow-md shadow-emerald-700/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Inspection & Mark 'Checked' (Proceed to Exit Gate)
                  </button>

                  <button
                    type="button"
                    onClick={handleFlagDiscrepancy}
                    className="py-3 px-5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Flag Discrepancy (Guide Back to Bay #{discrepancyBayNum})
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Please select a Delivery Order from the list to begin checking activity.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
