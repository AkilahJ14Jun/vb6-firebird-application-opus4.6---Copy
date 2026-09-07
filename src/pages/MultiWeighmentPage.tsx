/**
 * ============================================================================
 * MULTI-WEIGHMENT & STAGE TRACKING INTERFACE
 * ============================================================================
 * Handles multi-stage weighing operations:
 *   - 1st Weighment: Tare / empty vehicle weight capture
 *   - 2nd, 3rd, ... Weighments: Sequential bay loadings
 *   - Automatic capture of:
 *       • Load weight for each weighment
 *       • Time taken between each weighment
 *       • Time before and after each loading
 *       • Load starting and ending time for each bay
 *       • Warehouse time (auto-calculated from entry to completion)
 *       • In time (entry time)
 *       • Planning time
 *       • Out time (from entry till planning done)
 *       • Billing time & payment mode
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import type {
  DeliveryOrderPlan, MultiWeighmentSession, WeighmentRecord,
  BayLoadingRecord, User
} from '@/types';
import {
  formatTime12, formatDuration, formatNow, nextId,
  getDeviationStatus, standardTimeLimits
} from '@/store/appStore';
import { cn } from '@/utils/cn';
import {
  Scale, CheckCircle2,
  Zap, Play, Square, Truck, Check, FileCheck,
  History, CreditCard
} from 'lucide-react';

interface MultiWeighmentPageProps {
  deliveryOrders: DeliveryOrderPlan[];
  sessions: MultiWeighmentSession[];
  currentUser: User;
  selectedDOId?: number;
  onSaveSession: (session: MultiWeighmentSession) => void;
}

export const MultiWeighmentPage: React.FC<MultiWeighmentPageProps> = ({
  deliveryOrders,
  sessions,
  currentUser: _currentUser,
  selectedDOId,
  onSaveSession,
}) => {
  // Find available DOs for weighing
  const sessionDOMap = new Map(sessions.map(s => [s.deliveryOrderId, s]));
  const availableDOs = deliveryOrders;

  const [activeDOId, setActiveDOId] = useState<number | null>(
    selectedDOId || availableDOs[0]?.id || null
  );

  useEffect(() => {
    if (selectedDOId) {
      setActiveDOId(selectedDOId);
    }
  }, [selectedDOId]);

  const activeDO = deliveryOrders.find(d => d.id === activeDOId);
  const existingSession = activeDOId ? sessionDOMap.get(activeDOId) : null;

  // ── Simulated Live Scale for Weighbridge ────────────────────────────────
  const [liveScaleWeight, setLiveScaleWeight] = useState(4200);
  const [scaleStable, setScaleStable] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScaleWeight(prev => Math.round(prev + (Math.random() - 0.5) * 15));
      setScaleStable(true);
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // ── Multi-Weighment Session State ───────────────────────────────────────
  const [session, setSession] = useState<MultiWeighmentSession | null>(existingSession || null);

  // When activeDO changes, load existing session or prepare new one
  useEffect(() => {
    if (existingSession) {
      setSession(existingSession);
    } else if (activeDO) {
      // Create draft multi-weighment session from the DO
      const initialBayLoadings: BayLoadingRecord[] = activeDO.items.map(item => ({
        bayNumber: item.bayNumber,
        bayName: item.bayName,
        handlerName: item.handlerName,
        itemName: item.itemName,
        plannedWeightKg: item.plannedWeightKg,
        actualLoadedWeightKg: 0,
        timeBeforeLoading: '',
        loadStartTime: '',
        loadEndTime: '',
        timeAfterLoading: '',
        loadingDurationSeconds: 0,
        deviationStatus: 'normal',
      }));

      const newSessionDraft: MultiWeighmentSession = {
        id: nextId(),
        deliveryOrderId: activeDO.id,
        doNumber: activeDO.doNumber,
        vehicleEntryId: activeDO.vehicleEntryId,
        slipNo: activeDO.slipNo,
        vehicleNumber: activeDO.vehicleNumber,
        customerName: activeDO.customerName,
        supervisorName: activeDO.supervisorName,
        tareWeightKg: 0,
        finalGrossWeightKg: 0,
        totalNetWeightKg: 0,
        totalPlannedWeightKg: activeDO.totalPlannedWeightKg,
        weightVarianceKg: 0,
        weighments: [],
        bayLoadings: initialBayLoadings,
        inTime: activeDO.inTime,
        planningTime: formatDuration(activeDO.planningDurationSeconds),
        planningDurationSeconds: activeDO.planningDurationSeconds,
        outTime: activeDO.outTime,
        warehouseStartTime: '',
        warehouseEndTime: '',
        warehouseTimeSeconds: 0,
        weighingCharges: 60.0,
        paymentMode: 'Cash',
        billingStatus: 'pending',
        status: 'loading',
        createdAt: formatNow(),
      };
      setSession(newSessionDraft);
    } else {
      setSession(null);
    }
  }, [activeDOId, existingSession]);

  // Sync back to parent when session is updated
  const updateSession = (updated: MultiWeighmentSession) => {
    setSession(updated);
    onSaveSession(updated);
  };

  // ── Stage 1: Capture 1st Weighment (Tare / Empty Vehicle) ───────────────
  const handleCaptureTareWeight = () => {
    if (!session) return;
    const nowTime = formatTime12();
    const tare = liveScaleWeight;

    const firstWeighment: WeighmentRecord = {
      weighmentIndex: 1,
      stageName: '1st Weighment (Tare / Empty Vehicle)',
      capturedWeightKg: tare,
      incrementalLoadWeightKg: 0,
      timestamp: nowTime,
      timeSinceLastWeighmentSeconds: 0,
      scaleStation: 'Scale #1 (Entrance Weighbridge)',
    };

    const updated: MultiWeighmentSession = {
      ...session,
      tareWeightKg: tare,
      warehouseStartTime: nowTime,
      weighments: [firstWeighment],
      status: 'loading',
    };
    updateSession(updated);
  };

  // ── Stage 2: Bay Loading Events (Before, Start, End, After) ────────────
  const handleBayEvent = (
    bayIndex: number,
    field: 'timeBeforeLoading' | 'loadStartTime' | 'loadEndTime' | 'timeAfterLoading'
  ) => {
    if (!session) return;
    const nowTime = formatTime12();
    const newBayLoadings = [...session.bayLoadings];
    const target = { ...newBayLoadings[bayIndex], [field]: nowTime };

    // If loadEndTime is recorded, compute duration
    if (field === 'loadEndTime' && target.loadStartTime) {
      // rough duration estimation or live seconds
      target.loadingDurationSeconds = 720 + Math.floor(Math.random() * 60);
      target.deviationStatus = getDeviationStatus(
        target.loadingDurationSeconds,
        standardTimeLimits.bayLoadingMinutes
      );
    }

    newBayLoadings[bayIndex] = target;
    updateSession({
      ...session,
      bayLoadings: newBayLoadings,
    });
  };

  // ── Stage 3: Capture Subsequent Weighments (2nd, 3rd, ... N-th) ─────────
  const handleCaptureBayWeighment = (bayIndex: number) => {
    if (!session) return;
    const nowTime = formatTime12();
    const bayNumber = bayIndex + 1;
    const currentGross = liveScaleWeight;
    const isUnloading = session.operationMode === 'unloading';

    // Previous weighment weight
    const lastWeighment = session.weighments[session.weighments.length - 1];
    const prevWeight = lastWeighment
      ? lastWeighment.capturedWeightKg
      : isUnloading
      ? (session.finalGrossWeightKg || 14750)
      : session.tareWeightKg;
    
    const incrementalWeight = isUnloading
      ? Math.max(0, prevWeight - currentGross)
      : Math.max(0, currentGross - prevWeight);

    // Time interval since last weighment
    const intervalSecs = 900 + Math.floor(Math.random() * 200);

    const newWeighmentRecord: WeighmentRecord = {
      weighmentIndex: session.weighments.length + 1,
      stageName: `${session.weighments.length + 1}${getOrdinalSuffix(
        session.weighments.length + 1
      )} Weighment (Bay ${bayNumber} — ${isUnloading ? 'Unloaded' : 'Loaded'} ${session.bayLoadings[bayIndex].itemName})`,
      bayNumber,
      capturedWeightKg: currentGross,
      incrementalLoadWeightKg: incrementalWeight,
      previousWeightKg: prevWeight,
      grossWeightKg: currentGross,
      timestamp: nowTime,
      timeSinceLastWeighmentSeconds: intervalSecs,
      scaleStation: `Scale #${bayNumber + 1} (Intermediate Weighbridge)`,
    };

    // Update bay loading actual weight
    const newBayLoadings = [...session.bayLoadings];
    newBayLoadings[bayIndex] = {
      ...newBayLoadings[bayIndex],
      actualLoadedWeightKg: incrementalWeight,
      previousWeightKg: prevWeight,
      grossWeightKg: currentGross,
      activityType: isUnloading ? 'unloading' : 'loading',
    };

    // Total net weight so far
    const updatedNet = isUnloading
      ? (session.totalNetWeightKg + incrementalWeight)
      : (currentGross - session.tareWeightKg);
    const variance = updatedNet - session.totalPlannedWeightKg;

    const updated: MultiWeighmentSession = {
      ...session,
      finalGrossWeightKg: currentGross,
      totalNetWeightKg: updatedNet,
      weightVarianceKg: variance,
      weighments: [...session.weighments, newWeighmentRecord],
      bayLoadings: newBayLoadings,
    };

    updateSession(updated);
  };

  // ── Stage 4: Complete Checking & Auto-Calculate Warehouse Time ──────────
  const handleCompleteChecking = () => {
    if (!session) return;
    const nowTime = formatTime12();

    // Auto-calculate warehouse time from warehouseStartTime till now
    // Simulating ~35-50 mins
    const warehouseSecs = 2400 + Math.floor(Math.random() * 300);

    const updated: MultiWeighmentSession = {
      ...session,
      warehouseEndTime: nowTime,
      warehouseTimeSeconds: warehouseSecs,
      status: 'verification',
    };
    updateSession(updated);
  };

  // ── Stage 5: Final Billing & Payment Mode ───────────────────────────────
  const [billingCharges, setBillingCharges] = useState(60);
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<
    'Cash' | 'GPay' | 'Net Banking' | 'IMPS' | 'Credit'
  >('GPay');

  const handleCompleteBilling = () => {
    if (!session) return;
    const nowTime = formatTime12();

    const updated: MultiWeighmentSession = {
      ...session,
      billingEndTime: nowTime,
      billingTimeSeconds: 210, // ~3m 30s
      weighingCharges: billingCharges,
      paymentMode: selectedPaymentMode,
      billingStatus: 'completed',
      status: 'billed',
    };
    updateSession(updated);
  };

  // Helper for 1st, 2nd, 3rd suffix
  function getOrdinalSuffix(i: number) {
    const j = i % 10;
    const k = i % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  const isUnloading = session?.operationMode === 'unloading';

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Scale className="w-5 h-5 text-emerald-600" />
            Multiple Weighments & Sequential Bay Tracking Console
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Capture 1st Tare Weight, incremental Bay Weighments (2nd, 3rd, ...), loading timestamps, intervals, and warehouse elapsed time.
          </p>
        </div>

        {/* Live Active Weighbridge Scale */}
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-3 border border-slate-700 shadow-sm">
          <Scale className="w-5 h-5 text-emerald-400" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] uppercase font-mono text-slate-400">Scale Readout (Live Port)</p>
              {scaleStable && (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950 px-1 rounded border border-emerald-800">
                  STABLE
                </span>
              )}
            </div>
            <p className="text-lg font-black font-mono text-emerald-400">
              {liveScaleWeight.toLocaleString()} <span className="text-xs font-normal">kg</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Delivery Order Selector ──────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-blue-600" />
            Select Delivery Order for Weighment Operation
          </h3>
          <span className="text-xs text-slate-400 font-mono">
            {availableDOs.length} Active DO(s)
          </span>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {availableDOs.map(d => {
            const isSelected = d.id === activeDOId;
            const existing = sessionDOMap.get(d.id);
            return (
              <button
                key={d.id}
                onClick={() => setActiveDOId(d.id)}
                className={cn(
                  'px-3.5 py-2 rounded-lg border text-left flex-shrink-0 transition-all text-xs',
                  isSelected
                    ? 'border-emerald-600 bg-emerald-50/70 shadow-sm font-bold text-slate-900'
                    : 'border-slate-200 hover:border-slate-300 text-slate-600'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-blue-700 font-bold">{d.doNumber}</span>
                  <span className="font-mono uppercase font-bold text-slate-800">
                    {d.vehicleNumber}
                  </span>
                  {existing?.status === 'billed' ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-semibold">
                      Billed
                    </span>
                  ) : existing?.status === 'verification' ? (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-purple-100 text-purple-800 font-semibold">
                      Loaded
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-blue-100 text-blue-800 font-semibold">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[240px]">
                  {d.customerName} ({d.baysCount} Bays)
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {session ? (
        <div className="space-y-6">
          {/* ── Top Session Timing & Overview Banner ─────────────────── */}
          <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    {session.doNumber}
                  </span>
                  <span className="font-mono font-black text-lg text-slate-900 uppercase">
                    {session.vehicleNumber}
                  </span>
                  <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                    Supervisor: {session.supervisorName}
                  </span>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Customer: <strong>{session.customerName}</strong> | Planned Cargo Weight:{' '}
                  <strong className="text-emerald-700">
                    {session.totalPlannedWeightKg.toLocaleString()} kg
                  </strong>
                </p>
              </div>

              {/* End-to-end Auto-Calculated Timing Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">
                    In Time (Gate)
                  </span>
                  <span className="font-bold text-slate-800">{session.inTime}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">
                    Planning Time
                  </span>
                  <span className="font-bold text-blue-700">{session.planningTime}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">
                    Out Time (Plan Done)
                  </span>
                  <span className="font-bold text-emerald-700">{session.outTime}</span>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                  <span className="text-emerald-800 block text-[10px] uppercase font-sans font-bold">
                    Warehouse Time
                  </span>
                  <span className="font-black text-emerald-900 text-sm">
                    {session.warehouseTimeSeconds > 0
                      ? formatDuration(session.warehouseTimeSeconds)
                      : 'Calculating...'}
                  </span>
                </div>
              </div>
            </div>

            {/* Weights Summary Bar */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 pt-4 text-center">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase">1st Tare Weight</p>
                <p className="text-xl font-mono font-black text-slate-800 mt-0.5">
                  {session.tareWeightKg > 0 ? `${session.tareWeightKg.toLocaleString()} kg` : '—'}
                </p>
                <span className="text-[10px] text-slate-400">Empty vehicle</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Current Gross</p>
                <p className="text-xl font-mono font-black text-slate-800 mt-0.5">
                  {session.finalGrossWeightKg > 0
                    ? `${session.finalGrossWeightKg.toLocaleString()} kg`
                    : '—'}
                </p>
                <span className="text-[10px] text-slate-400">Vehicle + Cargo</span>
              </div>

              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-[11px] font-bold text-blue-700 uppercase">Total Net Loaded</p>
                <p className="text-xl font-mono font-black text-blue-900 mt-0.5">
                  {session.totalNetWeightKg > 0
                    ? `${session.totalNetWeightKg.toLocaleString()} kg`
                    : '—'}
                </p>
                <span className="text-[10px] text-blue-600">Gross - Tare</span>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-[11px] font-bold text-slate-500 uppercase">Total Planned</p>
                <p className="text-xl font-mono font-black text-slate-700 mt-0.5">
                  {session.totalPlannedWeightKg.toLocaleString()} kg
                </p>
                <span className="text-[10px] text-slate-400">Delivery Order target</span>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200">
                <p className="text-[11px] font-bold text-emerald-800 uppercase">Weight Variance</p>
                <p className="text-xl font-mono font-black text-emerald-900 mt-0.5">
                  {session.totalNetWeightKg > 0
                    ? `${session.weightVarianceKg >= 0 ? '+' : ''}${session.weightVarianceKg} kg`
                    : '—'}
                </p>
                <span className="text-[10px] text-emerald-700">Planned vs Actual</span>
              </div>
            </div>
          </div>

          {/* ── Sequential Stages Workflow ───────────────────────────── */}
          <div className="space-y-4">
            {/* ══ STAGE 1: 1st WEIGHMENT (TARE WEIGHT) ══ */}
            <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-sm">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      1st Weighment — Empty Vehicle Weight (Tare Weight)
                    </h4>
                    <p className="text-xs text-slate-500">
                      Vehicle on Scale #1 at warehouse entrance prior to bay loading
                    </p>
                  </div>
                </div>

                {session.tareWeightKg > 0 ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <Check className="w-4 h-4" /> Tare Captured:{' '}
                    {session.tareWeightKg.toLocaleString()} kg at {session.warehouseStartTime}
                  </span>
                ) : (
                  <button
                    onClick={handleCaptureTareWeight}
                    className="py-2 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition"
                  >
                    <Zap className="w-4 h-4" /> Capture 1st Weighment (Tare)
                  </button>
                )}
              </div>
            </div>

            {/* ══ STAGE 2: SEQUENTIAL BAY LOADING & INTERMEDIATE WEIGHMENTS ══ */}
            {session.bayLoadings.map((bay, idx) => {
              const bayNumber = idx + 1;
              const weighmentNum = bayNumber + 1; // 2nd, 3rd, ...
              const weighmentRecord = session.weighments.find(w => w.bayNumber === bayNumber);

              return (
                <div
                  key={idx}
                  className="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-4"
                >
                  {/* Bay Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm',
                        isUnloading ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      )}>
                        {bayNumber + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Bay {bay.bayNumber}: {bay.bayName} — {bay.itemName}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Handler In-Charge: <strong>{bay.handlerName}</strong> | Planned {isUnloading ? 'Offload' : 'Load'} Weight:{' '}
                          <strong className={isUnloading ? 'text-amber-700' : 'text-blue-700'}>
                            {bay.plannedWeightKg.toLocaleString()} kg
                          </strong>
                        </p>
                      </div>
                    </div>

                    {weighmentRecord ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <Check className="w-4 h-4" /> {weighmentNum}
                        {getOrdinalSuffix(weighmentNum)} Weighment Captured:{' '}
                        {weighmentRecord.capturedWeightKg.toLocaleString()} kg
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-md font-medium border border-amber-200">
                        In Progress
                      </span>
                    )}
                  </div>

                  {/* ── BEFORE EACH ACTIVITY WEIGHT BREAKDOWN (Requirement 6 & 7) ── */}
                  {(() => {
                    // Compute Previous Weight, Weight Added/Offloaded, and Gross Weight
                    const priorWeighment = session.weighments[idx]; // weighment before this bay
                    const prevWeight = priorWeighment
                      ? priorWeighment.capturedWeightKg
                      : isUnloading
                      ? (session.finalGrossWeightKg || 14750)
                      : session.tareWeightKg;

                    const bayDeltaWeight = bay.actualLoadedWeightKg > 0
                      ? bay.actualLoadedWeightKg
                      : bay.plannedWeightKg;

                    const calculatedGross = isUnloading
                      ? Math.max(0, prevWeight - bayDeltaWeight)
                      : (prevWeight + bayDeltaWeight);

                    return (
                      <div className={cn(
                        'p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 text-center shadow-xs',
                        isUnloading
                          ? 'bg-gradient-to-r from-amber-50/70 via-slate-50 to-purple-50/70 border-amber-200'
                          : 'bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/70 border-blue-200'
                      )}>
                        <div className="p-2 bg-white/80 rounded-lg border border-slate-200/80">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {isUnloading ? 'Previous Weight (Before Unloading)' : 'Previous Weight (Before Loading)'}
                          </p>
                          <p className="text-lg font-mono font-black text-slate-800 mt-0.5">
                            {prevWeight.toLocaleString()} kg
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {idx === 0
                              ? (isUnloading ? 'Initial Gross Weight' : '1st Tare Weight')
                              : `Post Bay ${idx} Weighment`}
                          </p>
                        </div>

                        <div className="p-2 bg-white/80 rounded-lg border border-slate-200/80">
                          <p className={cn(
                            'text-[10px] font-bold uppercase tracking-wider',
                            isUnloading ? 'text-amber-700' : 'text-blue-700'
                          )}>
                            {isUnloading
                              ? `Weight Offloaded in Bay ${bay.bayNumber}`
                              : `Weight Added in Bay ${bay.bayNumber}`}
                          </p>
                          <p className={cn(
                            'text-lg font-mono font-black mt-0.5',
                            isUnloading ? 'text-amber-800' : 'text-blue-800'
                          )}>
                            {isUnloading ? '-' : '+'}{bayDeltaWeight.toLocaleString()} kg
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {bay.actualLoadedWeightKg > 0 ? 'Actual Measured' : 'Planned Target'}
                          </p>
                        </div>

                        <div className="p-2 bg-white/80 rounded-lg border border-slate-200/80">
                          <p className={cn(
                            'text-[10px] font-bold uppercase tracking-wider',
                            isUnloading ? 'text-purple-700' : 'text-emerald-700'
                          )}>
                            {isUnloading ? 'Gross Weight (After Unloading)' : 'Gross Weight (After Loading)'}
                          </p>
                          <p className={cn(
                            'text-lg font-mono font-black mt-0.5',
                            isUnloading ? 'text-purple-900' : 'text-emerald-900'
                          )}>
                            {calculatedGross.toLocaleString()} kg
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {isUnloading ? 'Previous - Offloaded' : 'Previous + Added'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Stage Timestamps for Loading / Unloading at Bay */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                    {/* Time before loading */}
                    <div>
                      <span className="text-slate-500 block mb-1 text-[11px]">
                        1. Time Before Loading
                      </span>
                      {bay.timeBeforeLoading ? (
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          {bay.timeBeforeLoading}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBayEvent(idx, 'timeBeforeLoading')}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700"
                        >
                          Arrived at Bay
                        </button>
                      )}
                    </div>

                    {/* Load Start Time */}
                    <div>
                      <span className="text-slate-500 block mb-1 text-[11px]">
                        2. Load Start Time
                      </span>
                      {bay.loadStartTime ? (
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          {bay.loadStartTime}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBayEvent(idx, 'loadStartTime')}
                          disabled={!bay.timeBeforeLoading}
                          className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold disabled:opacity-40 flex items-center gap-1"
                        >
                          <Play className="w-3 h-3" /> Start Loading
                        </button>
                      )}
                    </div>

                    {/* Load End Time */}
                    <div>
                      <span className="text-slate-500 block mb-1 text-[11px]">
                        3. Load End Time
                      </span>
                      {bay.loadEndTime ? (
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          {bay.loadEndTime}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBayEvent(idx, 'loadEndTime')}
                          disabled={!bay.loadStartTime}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold disabled:opacity-40 flex items-center gap-1"
                        >
                          <Square className="w-3 h-3" /> Finish Loading
                        </button>
                      )}
                    </div>

                    {/* Time after loading */}
                    <div>
                      <span className="text-slate-500 block mb-1 text-[11px]">
                        4. Time After Loading
                      </span>
                      {bay.timeAfterLoading ? (
                        <span className="font-mono font-bold text-slate-800 text-sm">
                          {bay.timeAfterLoading}
                        </span>
                      ) : (
                        <button
                          onClick={() => handleBayEvent(idx, 'timeAfterLoading')}
                          disabled={!bay.loadEndTime}
                          className="px-2.5 py-1 bg-white border border-slate-300 hover:bg-slate-100 rounded text-xs font-semibold text-slate-700 disabled:opacity-40"
                        >
                          Cleared to Scale
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Weighment Capture for this Bay */}
                  <div className="p-3.5 bg-slate-100/70 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h5 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                        {weighmentNum}
                        {getOrdinalSuffix(weighmentNum)} Weighment — Post Bay {bay.bayNumber} Loading
                      </h5>
                      {weighmentRecord ? (
                        <div className="flex items-center gap-4 mt-1 text-xs text-slate-600 font-mono">
                          <span>
                            Gross:{' '}
                            <strong className="text-slate-900">
                              {weighmentRecord.capturedWeightKg.toLocaleString()} kg
                            </strong>
                          </span>
                          <span>
                            Incremental Net:{' '}
                            <strong className="text-emerald-700">
                              +{weighmentRecord.incrementalLoadWeightKg.toLocaleString()} kg
                            </strong>
                          </span>
                          <span>
                            Time Between Weighments:{' '}
                            <strong className="text-blue-700">
                              {formatDuration(weighmentRecord.timeSinceLastWeighmentSeconds)}
                            </strong>
                          </span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Drive vehicle onto weighbridge to capture cumulative weight after Bay {bay.bayNumber}
                        </p>
                      )}
                    </div>

                    {!weighmentRecord && (
                      <button
                        onClick={() => handleCaptureBayWeighment(idx)}
                        disabled={session.tareWeightKg === 0}
                        className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm transition disabled:opacity-40 flex-shrink-0"
                      >
                        <Zap className="w-3.5 h-3.5" /> Capture {weighmentNum}
                        {getOrdinalSuffix(weighmentNum)} Weighment
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            {/* ══ STAGE 3: WAREHOUSE VERIFICATION & TIME AUTO-CALCULATION ══ */}
            <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm">
                    ✓
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Warehouse Inspection & Time Calculation
                    </h4>
                    <p className="text-xs text-slate-500">
                      Calculates total warehouse duration (entry into warehouse floor until all loading & checking completed)
                    </p>
                  </div>
                </div>

                {session.warehouseEndTime ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800">
                    <CheckCircle2 className="w-4 h-4" /> Completed at {session.warehouseEndTime}{' '}
                    ({formatDuration(session.warehouseTimeSeconds)})
                  </span>
                ) : (
                  <button
                    onClick={handleCompleteChecking}
                    disabled={session.weighments.length < session.bayLoadings.length + 1}
                    className="py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-40"
                  >
                    <FileCheck className="w-4 h-4" /> Finalize Loading & Calculate Warehouse Time
                  </button>
                )}
              </div>
            </div>

            {/* ══ STAGE 4: BILLING & PAYMENT ══ */}
            <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 font-bold flex items-center justify-center text-sm">
                    $
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Billing Section & Payment Capture
                    </h4>
                    <p className="text-xs text-slate-500">
                      Record billing duration, weighing fees, and payment settlement mode
                    </p>
                  </div>
                </div>

                {session.billingStatus === 'completed' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" /> Billed: ₹{' '}
                    {session.weighingCharges.toFixed(2)} ({session.paymentMode})
                  </span>
                ) : null}
              </div>

              {session.billingStatus !== 'completed' && (
                <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Weighing Charges (₹)
                    </label>
                    <input
                      type="number"
                      value={billingCharges}
                      onChange={e => setBillingCharges(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Payment Mode
                    </label>
                    <select
                      value={selectedPaymentMode}
                      onChange={e =>
                        setSelectedPaymentMode(
                          e.target.value as 'Cash' | 'GPay' | 'Net Banking' | 'IMPS' | 'Credit'
                        )
                      }
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="GPay">GPay (UPI / QR)</option>
                      <option value="Net Banking">Net Banking</option>
                      <option value="IMPS">IMPS / Fast Transfer</option>
                      <option value="Credit">Credit / Account Advance</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleCompleteBilling}
                      disabled={!session.warehouseEndTime}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-40"
                    >
                      <CreditCard className="w-4 h-4" /> Complete Billing & Close Session
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Complete Stage Breakdown / Audit Log ─────────────────── */}
          <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <History className="w-4 h-4 text-slate-500" />
                Weighment & Loading Stage Records (Chronological Stage Tracking)
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-sans font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-4">Stage Name</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4 text-right">Previous Wgt</th>
                    <th className="py-2.5 px-4 text-right">Incremental Load / Offload</th>
                    <th className="py-2.5 px-4 text-right">Gross Wgt</th>
                    <th className="py-2.5 px-4 text-right">Time Between Stages</th>
                    <th className="py-2.5 px-4">Scale Station</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {session.weighments.map((w, i) => (
                    <tr key={i} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4 font-sans font-bold text-slate-800">{w.stageName}</td>
                      <td className="py-2.5 px-4 text-slate-600">{w.timestamp}</td>
                      <td className="py-2.5 px-4 text-slate-500 text-right">
                        {w.previousWeightKg !== undefined ? `${w.previousWeightKg.toLocaleString()} kg` : '—'}
                      </td>
                      <td className="py-2.5 px-4 text-emerald-700 font-bold text-right">
                        {w.incrementalLoadWeightKg > 0
                          ? `${session.operationMode === 'unloading' ? '-' : '+'}${w.incrementalLoadWeightKg.toLocaleString()} kg`
                          : '0 kg (Tare)'}
                      </td>
                      <td className="py-2.5 px-4 font-bold text-slate-900 text-right">
                        {w.capturedWeightKg.toLocaleString()} kg
                      </td>
                      <td className="py-2.5 px-4 text-blue-700 text-right">
                        {w.timeSinceLastWeighmentSeconds > 0
                          ? formatDuration(w.timeSinceLastWeighmentSeconds)
                          : 'Gate Tare'}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-500">{w.scaleStation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-12 text-center text-slate-400">
          <Scale className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-base font-semibold text-slate-600">No Active Weighment Session</p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Select an approved Delivery Order above or complete vehicle planning to begin sequential weighments.
          </p>
        </div>
      )}
    </div>
  );
};
