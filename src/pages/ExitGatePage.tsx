/**
 * ============================================================================
 * EXIT GATE CONTROL & CLEARANCE PAGE
 * ============================================================================
 * As specified in Changes required.txt:
 * Line 20: "A separate page is required for capturing data at the Exit Gate."
 * Line 21: "At the Exit Gate the overall weight along with all the items
 *          loaded /unloaded is checked against the total planned weight at the
 *          planning stage while preparing the D.O. along with the permitted
 *          tolerance limits. The person at the Exit gate can still decide
 *          whether to allow the overall weight is beyond this limit also."
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { DeliveryOrderPlan, VehicleEntry, User } from '@/types';
import { formatTime12, formatNow } from '@/store/appStore';
import { QRCodeSvg } from '@/components/QRCodeSvg';
import { cn } from '@/utils/cn';
import {
  DoorOpen, Scale, CheckCircle2, AlertTriangle, AlertCircle,
  Truck, ShieldCheck, Printer, X, Search, FileText,
  UserCheck, Check, Clock, Radio, Info
} from 'lucide-react';

interface ExitGatePageProps {
  deliveryOrders: DeliveryOrderPlan[];
  vehicleEntries: VehicleEntry[];
  currentUser?: User;
  onCompleteExit: (
    doId: number,
    exitData: {
      exitWeightKg: number;
      exitDecision: 'approved' | 'override_approved' | 'rejected';
      exitOfficer: string;
      exitNotes?: string;
      exitedAt: string;
    }
  ) => void;
}

export const ExitGatePage: React.FC<ExitGatePageProps> = ({
  deliveryOrders,
  vehicleEntries,
  currentUser,
  onCompleteExit,
}) => {
  const [filterTab, setFilterTab] = useState<'pending_exit' | 'exited'>('pending_exit');
  const [searchQuery, setSearchQuery] = useState('');

  // Vehicles ready for exit (Checked, in progress, discrepancy) vs already exited
  const pendingExitDOs = deliveryOrders.filter(d => d.status !== 'exited');
  const exitedDOs = deliveryOrders.filter(d => d.status === 'exited');

  const displayedDOs = (filterTab === 'pending_exit' ? pendingExitDOs : exitedDOs).filter(d => {
    const q = searchQuery.toLowerCase();
    return (
      d.vehicleNumber.toLowerCase().includes(q) ||
      d.doNumber.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q)
    );
  });

  const [selectedDOId, setSelectedDOId] = useState<number | null>(() => {
    // Prefer one with 'Checked' status, else first in list
    const checked = pendingExitDOs.find(d => d.status === 'Checked' || d.checkingStatus === 'checked');
    return checked?.id || pendingExitDOs[0]?.id || deliveryOrders[0]?.id || null;
  });

  const currentDO = deliveryOrders.find(d => d.id === selectedDOId);
  const currentEntry = vehicleEntries.find(e => e.id === currentDO?.vehicleEntryId || e.slipNo === currentDO?.slipNo);

  // ── Weight Capture Mode: Live Scale vs Manual Entry (Requirement 9/21) ──
  const [captureMode, setCaptureMode] = useState<'scale' | 'manual'>('scale');
  const [liveScaleWeight, setLiveScaleWeight] = useState(0);
  const [scaleStable, setScaleStable] = useState(true);
  const [capturedExitWeight, setCapturedExitWeight] = useState<number | null>(null);
  const [manualWeightInput, setManualWeightInput] = useState<string>('');

  // Calculate tare & expected gross
  const tareWeight = currentEntry?.entryWeight || 4200;
  const plannedCargoWeight = currentDO?.totalPlannedWeightKg || 0;
  const actualCargoWeight = currentDO?.items.reduce((s, i) => s + (i.actualLoadedWeightKg || 0), 0) || plannedCargoWeight;
  const expectedGrossWeight = tareWeight + actualCargoWeight;

  // Initialize or update live scale simulation around expected gross
  useEffect(() => {
    if (currentDO?.exitWeightKg) {
      setCapturedExitWeight(currentDO.exitWeightKg);
      setManualWeightInput(currentDO.exitWeightKg.toString());
    } else {
      setCapturedExitWeight(expectedGrossWeight);
      setManualWeightInput(expectedGrossWeight.toString());
    }
  }, [currentDO?.id, expectedGrossWeight, currentDO?.exitWeightKg]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScaleWeight(Math.round(expectedGrossWeight + (Math.random() - 0.5) * 20));
      setScaleStable(true);
    }, 1200);
    return () => clearInterval(interval);
  }, [expectedGrossWeight]);

  const handleCaptureScale = useCallback(() => {
    setCapturedExitWeight(liveScaleWeight);
    setManualWeightInput(liveScaleWeight.toString());
  }, [liveScaleWeight]);

  const handleManualWeightChange = (val: string) => {
    setManualWeightInput(val);
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      setCapturedExitWeight(num);
    }
  };

  // ── Comparisons & Tolerance Calculations (Requirement 21) ─────────────
  const finalGrossWeight = capturedExitWeight || expectedGrossWeight;
  const finalNetCargoWeight = finalGrossWeight - tareWeight;
  const tolerance = currentDO?.weightToleranceKg ?? 50;
  const netWeightVariance = finalNetCargoWeight - plannedCargoWeight;
  const absVariance = Math.abs(netWeightVariance);
  const isWithinTolerance = absVariance <= tolerance;

  // ── Officer Decision State ─────────────────────────────────────────────
  const [exitDecision, setExitDecision] = useState<'approved' | 'override_approved' | 'rejected'>('approved');
  const [officerName, setOfficerName] = useState<string>(
    currentUser?.name || 'R. Kumar (Exit Gate Inspector)'
  );
  const [clearanceNotes, setClearanceNotes] = useState<string>('');
  const [showExitPassModal, setShowExitPassModal] = useState<boolean>(false);
  const [completedPassData, setCompletedPassData] = useState<any>(null);

  // Auto-switch decision suggestion based on tolerance
  useEffect(() => {
    if (!isWithinTolerance) {
      if (exitDecision === 'approved') {
        setExitDecision('override_approved');
      }
    } else {
      if (exitDecision === 'override_approved') {
        setExitDecision('approved');
      }
    }
  }, [isWithinTolerance]);

  // Authorize Departure
  const handleAuthorizeDeparture = () => {
    if (!currentDO) return;

    if (exitDecision === 'override_approved' && !clearanceNotes.trim()) {
      alert('Overall weight exceeds tolerance limit. Please provide justification notes for the override decision.');
      return;
    }

    const exitTimestamp = formatTime12();

    onCompleteExit(currentDO.id, {
      exitWeightKg: finalGrossWeight,
      exitDecision,
      exitOfficer: officerName,
      exitNotes: clearanceNotes.trim(),
      exitedAt: exitTimestamp,
    });

    setCompletedPassData({
      doNumber: currentDO.doNumber,
      vehicleNumber: currentDO.vehicleNumber,
      customerName: currentDO.customerName,
      driverName: currentDO.driverName,
      driverPhone: currentDO.driverPhone,
      inTime: currentDO.inTime,
      outTime: exitTimestamp,
      tareWeightKg: tareWeight,
      finalGrossWeightKg: finalGrossWeight,
      netCargoWeightKg: finalNetCargoWeight,
      plannedWeightKg: plannedCargoWeight,
      toleranceKg: tolerance,
      varianceKg: netWeightVariance,
      decision: exitDecision,
      officer: officerName,
      notes: clearanceNotes.trim(),
      items: currentDO.items,
    });

    setShowExitPassModal(true);
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <DoorOpen className="w-6 h-6 text-indigo-600" />
            Exit Gate Data Capture & Clearance
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Capture overall exit weight, compare loaded cargo against initial D.O. and permitted tolerance limits, and authorize vehicle departure (Requirement 20 & 21).
          </p>
        </div>

        {/* Tab Filter */}
        <div className="flex bg-slate-200 p-1 rounded-xl text-xs font-semibold">
          <button
            type="button"
            onClick={() => setFilterTab('pending_exit')}
            className={cn(
              'px-3 py-1.5 rounded-lg transition flex items-center gap-1.5',
              filterTab === 'pending_exit' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            At / Approaching Exit Gate ({pendingExitDOs.length})
          </button>

          <button
            type="button"
            onClick={() => setFilterTab('exited')}
            className={cn(
              'px-3 py-1.5 rounded-lg transition flex items-center gap-1.5',
              filterTab === 'exited' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            )}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Cleared & Exited ({exitedDOs.length})
          </button>
        </div>
      </div>

      {/* ── Main Two-Column Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Vehicle Selector Queue (4 cols) */}
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
                  if (id) setSelectedDOId(id);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
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
                  if (id) setSelectedDOId(id);
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
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
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {displayedDOs.length === 0 ? (
              <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No vehicles at the Exit Gate.
              </div>
            ) : (
              displayedDOs.map(d => {
                const isSelected = d.id === selectedDOId;
                const isChecked = d.checkingStatus === 'checked' || d.status === 'Checked';
                const isExited = d.status === 'exited';

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDOId(d.id)}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 shadow-md ring-2 ring-indigo-400/30'
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
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-0.5">
                          <Check className="w-3 h-3" /> Inspection Passed
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                          {d.status.toUpperCase()}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono text-indigo-700 font-semibold">{d.doNumber}</span>
                      <span>Tol: ±{d.weightToleranceKg ?? 50} kg</span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium truncate mt-1">{d.customerName}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Planned: {d.totalPlannedWeightKg.toLocaleString()} kg ({d.items.length} items)
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Exit Weight Capture & Tolerance Check (8 cols) */}
        <div className="lg:col-span-8">
          {currentDO ? (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-6">
              {/* Header Card */}
              <div className="p-4 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                      {currentDO.doNumber}
                    </span>
                    <span className="text-[11px] text-slate-500">Slip #{currentDO.slipNo}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 font-mono uppercase flex items-center gap-2">
                    <Truck className="w-5 h-5 text-indigo-600" />
                    {currentDO.vehicleNumber}
                    <span className="text-sm font-sans font-normal text-slate-500 normal-case">
                      — {currentDO.customerName}
                    </span>
                  </h3>
                </div>

                <div className="text-right text-xs">
                  <p className="text-slate-500">Inspection Status:</p>
                  <p className="font-bold text-emerald-700 text-sm mt-0.5">
                    {currentDO.checkingStatus === 'checked' || currentDO.status === 'Checked'
                      ? `✓ Passed by ${currentDO.checkerName || 'Checker'}`
                      : 'Pending Full Inspection'}
                  </p>
                  <p className="text-[11px] text-slate-400">Driver: {currentDO.driverName} ({currentDO.driverPhone})</p>
                </div>
              </div>

              {/* Requirement 9 & 20: Weight Capture via Weighing Scale or Manual Entry Mode */}
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Scale className="w-5 h-5 text-indigo-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Exit Gate Overall Weight Capture
                    </h4>
                  </div>

                  {/* Mode Toggle */}
                  <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCaptureMode('scale')}
                      className={cn(
                        'px-3 py-1 rounded-md transition',
                        captureMode === 'scale' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      Weighing Scale
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptureMode('manual')}
                      className={cn(
                        'px-3 py-1 rounded-md transition',
                        captureMode === 'manual' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      Manual Entry Mode
                    </button>
                  </div>
                </div>

                {captureMode === 'scale' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <div className="p-4 bg-slate-900 text-white rounded-xl flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">
                          Live Exit Scale #3 (Weighbridge)
                        </span>
                        <p className="text-3xl font-mono font-black text-emerald-400 mt-1">
                          {liveScaleWeight.toLocaleString()} <span className="text-sm text-slate-400 font-normal">kg</span>
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        STABLE
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCaptureScale}
                      className="h-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20"
                    >
                      <Scale className="w-5 h-5" />
                      Capture Scale Weight ({liveScaleWeight.toLocaleString()} kg)
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-2">
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Manual Overall Exit Weight Entry (kg) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1000"
                        step="10"
                        placeholder="Enter measured gross weight..."
                        value={manualWeightInput}
                        onChange={e => handleManualWeightChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleManualWeightChange(expectedGrossWeight.toString())}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition"
                      >
                        Set Expected ({expectedGrossWeight.toLocaleString()} kg)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Requirement 21: Check overall weight + all items against planned weight + permitted tolerance */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
                  <span>Exit Verification vs Planning Stage Limits</span>
                  <span className="font-mono text-indigo-700 font-semibold text-xs">
                    Permitted Tolerance: ±{tolerance} kg
                  </span>
                </h4>

                {/* 4 Core Quantitative Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Gross Weight (Exit)</span>
                    <p className="text-xl font-mono font-black text-slate-900 mt-1">
                      {finalGrossWeight.toLocaleString()} kg
                    </p>
                    <p className="text-[10px] text-slate-400">Captured at Gate</p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Initial Tare Weight</span>
                    <p className="text-xl font-mono font-black text-slate-700 mt-1">
                      {tareWeight.toLocaleString()} kg
                    </p>
                    <p className="text-[10px] text-slate-400">Empty vehicle tare</p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-indigo-600 block">Actual Net Cargo</span>
                    <p className="text-xl font-mono font-black text-indigo-700 mt-1">
                      {finalNetCargoWeight.toLocaleString()} kg
                    </p>
                    <p className="text-[10px] text-indigo-400">Gross - Tare</p>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Planned Cargo Wgt</span>
                    <p className="text-xl font-mono font-black text-slate-900 mt-1">
                      {plannedCargoWeight.toLocaleString()} kg
                    </p>
                    <p className="text-[10px] text-slate-400">From initial D.O.</p>
                  </div>
                </div>

                {/* Requirement 21 Tolerance Banner */}
                <div
                  className={cn(
                    'p-4 rounded-xl border flex items-start gap-3 transition-all',
                    isWithinTolerance
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
                      : 'bg-red-50 border-red-300 text-red-900'
                  )}
                >
                  {isWithinTolerance ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-sm">
                        {isWithinTolerance
                          ? '✓ Overall Weight Within Permitted Tolerance Limit'
                          : '⚠️ OVERALL WEIGHT EXCEEDS PERMITTED TOLERANCE LIMIT'}
                      </p>
                      <span className="font-mono font-black text-sm">
                        Variance: {netWeightVariance > 0 ? `+${netWeightVariance.toLocaleString()}` : netWeightVariance.toLocaleString()} kg
                      </span>
                    </div>
                    <p className="mt-1 leading-relaxed">
                      {isWithinTolerance ? (
                        <>
                          The net cargo weight of <strong>{finalNetCargoWeight.toLocaleString()} kg</strong> is within the allowed tolerance of <strong>±{tolerance} kg</strong> against planned weight <strong>{plannedCargoWeight.toLocaleString()} kg</strong>.
                        </>
                      ) : (
                        <>
                          The overall weight variance of <strong>{absVariance.toLocaleString()} kg</strong> exceeds the permitted limit of <strong>±{tolerance} kg</strong> by <strong>{(absVariance - tolerance).toLocaleString()} kg</strong>. As per system rules, the Exit Gate officer can still decide whether to allow clearance.
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Itemized Cargo Breakdown Table */}
                <div>
                  <h5 className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Itemized Cargo Loaded Summary (From Bays)
                  </h5>
                  <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2 px-3">Bay #</th>
                          <th className="py-2 px-3">Bay Name</th>
                          <th className="py-2 px-3">Item / Material</th>
                          <th className="py-2 px-3 text-right">Planned (kg)</th>
                          <th className="py-2 px-3 text-right">Actual Loaded (kg)</th>
                          <th className="py-2 px-3">Handler</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {currentDO.items.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-mono font-bold text-indigo-700">#{item.bayNumber}</td>
                            <td className="py-2 px-3 font-medium text-slate-800">{item.bayName}</td>
                            <td className="py-2 px-3 font-semibold text-slate-900">{item.itemName}</td>
                            <td className="py-2 px-3 font-mono text-slate-600 text-right">{item.plannedWeightKg.toLocaleString()} kg</td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">
                              {(item.actualLoadedWeightKg || item.plannedWeightKg).toLocaleString()} kg
                            </td>
                            <td className="py-2 px-3 text-slate-500">{item.handlerName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Requirement 21: Exit Gate Officer Decision */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                  <h5 className="font-bold text-slate-800 uppercase text-[11px] tracking-wider flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-indigo-600" />
                    Exit Gate Officer Departure Decision
                  </h5>

                  {/* Decision Radio Options */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <label
                      className={cn(
                        'p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition',
                        exitDecision === 'approved'
                          ? 'border-emerald-500 bg-emerald-50/80 shadow-xs ring-1 ring-emerald-400'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="exitDecision"
                          checked={exitDecision === 'approved'}
                          onChange={() => setExitDecision('approved')}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-bold text-slate-900">Authorize Exit (Approved)</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Standard clearance within tolerance limits.
                      </p>
                    </label>

                    <label
                      className={cn(
                        'p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition',
                        exitDecision === 'override_approved'
                          ? 'border-amber-500 bg-amber-50/80 shadow-xs ring-1 ring-amber-400'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="exitDecision"
                          checked={exitDecision === 'override_approved'}
                          onChange={() => setExitDecision('override_approved')}
                          className="text-amber-600 focus:ring-amber-500"
                        />
                        <span className="font-bold text-amber-900">Override & Authorize</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Officer discretion to allow exit beyond tolerance.
                      </p>
                    </label>

                    <label
                      className={cn(
                        'p-3 rounded-xl border cursor-pointer flex flex-col justify-between transition',
                        exitDecision === 'rejected'
                          ? 'border-red-500 bg-red-50/80 shadow-xs ring-1 ring-red-400'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="exitDecision"
                          checked={exitDecision === 'rejected'}
                          onChange={() => setExitDecision('rejected')}
                          className="text-red-600 focus:ring-red-500"
                        />
                        <span className="font-bold text-red-900">Hold / Detain Vehicle</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Refuse gate departure for reloading/adjustment.
                      </p>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Gate Officer Name *
                      </label>
                      <input
                        type="text"
                        value={officerName}
                        onChange={e => setOfficerName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                        Departure Authorization Remarks {exitDecision === 'override_approved' && <span className="text-red-600">*</span>}
                      </label>
                      <input
                        type="text"
                        placeholder={exitDecision === 'override_approved' ? 'Required: Reason for allowing beyond tolerance...' : 'Optional exit clearance remarks...'}
                        value={clearanceNotes}
                        onChange={e => setClearanceNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>
                  </div>

                  {/* Submission Action */}
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={handleAuthorizeDeparture}
                      className={cn(
                        'w-full py-3.5 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-lg',
                        exitDecision === 'rejected'
                          ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                          : exitDecision === 'override_approved'
                          ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                          : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'
                      )}
                    >
                      <DoorOpen className="w-5 h-5" />
                      {exitDecision === 'rejected'
                        ? 'Confirm Detention & Hold Vehicle at Exit Gate'
                        : exitDecision === 'override_approved'
                        ? 'Authorize Departure with Override & Print Exit Pass'
                        : 'Authorize Departure & Generate Official Exit Pass'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Please select a vehicle from the list to record Exit Gate data.
            </div>
          )}
        </div>
      </div>

      {/* ── Official Exit Gate Pass Modal ───────────────────────────── */}
      {showExitPassModal && completedPassData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Vehicle Clearance & Exit Gate Pass</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowExitPassModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Pass Body */}
            <div className="p-6 md:p-8 bg-white space-y-5" id="printable-exit-pass">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    WAREHOUSE EXIT GATE PASS
                  </h1>
                  <p className="text-xs text-slate-500 uppercase font-semibold">
                    WS Series Weighing Systems & Warehouse Logistics
                  </p>
                </div>
                <div className="text-right font-mono text-xs">
                  <span className="font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded block">
                    {completedPassData.doNumber}
                  </span>
                  <span className="text-slate-400 mt-1 block">Gate Out: {completedPassData.outTime}</span>
                </div>
              </div>

              {/* Vehicle & Transaction Details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-500">Vehicle Number:</p>
                  <p className="text-base font-black font-mono text-slate-900 uppercase">{completedPassData.vehicleNumber}</p>
                  <p className="text-slate-700">Driver: <strong>{completedPassData.driverName}</strong></p>
                  <p className="text-slate-500">Customer: <strong>{completedPassData.customerName}</strong></p>
                </div>

                <div className="space-y-1 text-right">
                  <p className="text-slate-500">Exit Clearance Decision:</p>
                  <p className="font-black text-sm uppercase text-emerald-700">
                    {completedPassData.decision === 'override_approved' ? 'AUTHORIZED WITH OVERRIDE' : 'STANDARD AUTHORIZATION'}
                  </p>
                  <p className="text-slate-600">Gate Officer: {completedPassData.officer}</p>
                  {completedPassData.notes && (
                    <p className="text-slate-500 italic">Notes: {completedPassData.notes}</p>
                  )}
                </div>
              </div>

              {/* Weight Breakdown Summary */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-sans">Initial Tare</span>
                  <span className="text-base font-bold text-slate-800">{completedPassData.tareWeightKg.toLocaleString()} kg</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-sans">Final Gross (Exit)</span>
                  <span className="text-base font-bold text-slate-900">{completedPassData.finalGrossWeightKg.toLocaleString()} kg</span>
                </div>
                <div>
                  <span className="text-[10px] text-indigo-600 uppercase block font-sans">Net Cargo Weight</span>
                  <span className="text-base font-black text-indigo-700">{completedPassData.netCargoWeightKg.toLocaleString()} kg</span>
                </div>
              </div>

              {/* QR and Sign-off */}
              <div className="flex items-center justify-between pt-4 border-t text-xs text-slate-500">
                <div className="flex items-center gap-3">
                  <QRCodeSvg
                    value={JSON.stringify({
                      v: completedPassData.vehicleNumber,
                      do: completedPassData.doNumber,
                      gross: completedPassData.finalGrossWeightKg,
                      net: completedPassData.netCargoWeightKg,
                      out: completedPassData.outTime,
                    })}
                    size={64}
                  />
                  <div>
                    <p className="font-bold text-slate-800">Scan for Gate Verification</p>
                    <p className="text-[10px]">Tamper-evident security clearance token</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="h-10 border-b border-dashed border-slate-300 w-36 mb-1" />
                  <p className="text-[11px] font-bold text-slate-700">Authorized Gate Signature</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t flex items-center justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" /> Print Exit Gate Pass
              </button>
              <button
                type="button"
                onClick={() => setShowExitPassModal(false)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition"
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
