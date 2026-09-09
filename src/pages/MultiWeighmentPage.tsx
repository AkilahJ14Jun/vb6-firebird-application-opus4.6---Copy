/**
 * ============================================================================
 * MULTI-WEIGHMENT & STAGE TRACKING INTERFACE
 * ============================================================================
 * Handles multi-stage weighing operations:
 *   - Selection of incomplete Delivery Orders (D.O) at any stage
 *   - Real-time tracking of vehicle location within warehouse
 *   - Real-time calculation of pending loading/unloading activity
 *   - Associated Bay Handlers for each bay
 *   - 1st Weighment: Tare / empty vehicle weight capture
 *   - 2nd, 3rd, ... Weighments: Sequential bay loadings
 *   - Checking Stage:
 *       • Independent inspection by checking personnel
 *       • Discrepancy flow guiding vehicle back to designated bay(s)
 *       • Verification marking status as 'Checked'
 *   - Billing Section: Settlement according to payment and credit limit terms
 *   - Exit Gate: Authorization of vehicle departure from warehouse
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import type {
  DeliveryOrderPlan, MultiWeighmentSession, WeighmentRecord,
  BayLoadingRecord, User
} from '@/types';
import {
  formatTime12, formatDuration, formatNow, nextId,
  getDeviationStatus, standardTimeLimits, sampleWarehouseEmployees
} from '@/store/appStore';
import { cn } from '@/utils/cn';
import {
  Scale, CheckCircle2, Zap, Play, Square, Truck, Check, FileCheck,
  History, CreditCard, MapPin, AlertTriangle, AlertCircle, ArrowRight,
  ShieldCheck, UserCheck, RotateCcw, LogOut, Info, Clock,
  DoorOpen, Package, ArrowDownToLine, ArrowUpFromLine, Layers
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
  // ── DO Filter: Active Incomplete DOs vs All DOs ─────────────────────────
  const [filterTab, setFilterTab] = useState<'incomplete' | 'all'>('incomplete');
  
  const incompleteDOs = deliveryOrders.filter(d => d.status !== 'exited');
  const completedDOs = deliveryOrders.filter(d => d.status === 'exited');
  const displayedDOs = filterTab === 'incomplete' ? incompleteDOs : deliveryOrders;

  // Session DO lookup map
  const sessionDOMap = new Map(sessions.map(s => [s.deliveryOrderId, s]));

  const [activeDOId, setActiveDOId] = useState<number | null>(() => {
    if (selectedDOId) return selectedDOId;
    if (incompleteDOs.length > 0) return incompleteDOs[0].id;
    return deliveryOrders[0]?.id || null;
  });

  useEffect(() => {
    if (selectedDOId) {
      setActiveDOId(selectedDOId);
    }
  }, [selectedDOId]);

  // Keep selection valid if displayed DOs change
  useEffect(() => {
    if (activeDOId) {
      const existsInDisplayed = displayedDOs.some(d => d.id === activeDOId);
      if (!existsInDisplayed && displayedDOs.length > 0) {
        setActiveDOId(displayedDOs[0].id);
      }
    }
  }, [filterTab, displayedDOs.length]);

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

  // ── Checking Stage Personnel & Discrepancy Modal State ─────────────────
  const checkingPersonnel = sampleWarehouseEmployees.filter(
    e => e.role === 'checker' || e.role === 'supervisor'
  );
  const [selectedChecker, setSelectedChecker] = useState<string>(
    checkingPersonnel[0]?.name || 'P. Shanmugam'
  );
  const [showDiscrepancyModal, setShowDiscrepancyModal] = useState(false);
  const [discrepancyBayNum, setDiscrepancyBayNum] = useState<number>(1);
  const [discrepancyReasonText, setDiscrepancyReasonText] = useState(
    'Cargo weight short by 250 kg. Guide vehicle back for additional loading.'
  );

  // ── Multi-Weighment Session State ───────────────────────────────────────
  const [session, setSession] = useState<MultiWeighmentSession | null>(existingSession || null);

  // When activeDO changes, load existing session or prepare new one
  useEffect(() => {
    if (existingSession) {
      setSession(existingSession);
    } else if (activeDO) {
      const initialBayLoadings: BayLoadingRecord[] = activeDO.items.map(item => ({
        bayNumber: item.bayNumber,
        bayName: item.bayName,
        handlerName: item.handlerName,
        itemName: item.itemName,
        plannedWeightKg: item.plannedWeightKg,
        actualLoadedWeightKg: item.actualLoadedWeightKg || 0,
        previousWeightKg: 0,
        grossWeightKg: 0,
        timeBeforeLoading: '',
        loadStartTime: '',
        loadEndTime: '',
        timeAfterLoading: '',
        loadingDurationSeconds: 0,
        deviationStatus: 'normal',
        hasDiscrepancy: false,
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
        currentLocation: activeDO.currentLocation || `Waiting for ${activeDO.items[0]?.bayName || 'Scale #1'}`,
        checkingStatus: activeDO.checkingStatus || 'pending',
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
        paymentMode: 'GPay',
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

  // ── Bay Entry & D.O Selection State & Helpers ───────────────────────────
  const [bayEntryModalOpen, setBayEntryModalOpen] = useState(false);
  const [bayEntryTargetBay, setBayEntryTargetBay] = useState<number | null>(null);
  const [bayEntryNotification, setBayEntryNotification] = useState<{
    bayNumber: number;
    message: string;
  } | null>(null);

  // Helper to get all pending DOs for a specific bay
  const getPendingDOsForBay = (bayNumber: number) => {
    return deliveryOrders
      .filter(d => d.status !== 'completed' && d.status !== 'exited')
      .map(d => {
        const sess = sessionDOMap.get(d.id);
        const bayItem = d.items?.find(it => it.bayNumber === bayNumber);
        if (!bayItem) return null;

        const sessionBay = sess?.bayLoadings.find(b => b.bayNumber === bayNumber);
        const loadedKg = sessionBay?.actualLoadedWeightKg ?? (bayItem.actualLoadedWeightKg || 0);
        const plannedKg = bayItem.plannedWeightKg || 0;
        const pendingKg = Math.max(0, plannedKg - loadedKg);
        const isLoaded = loadedKg > 0 && pendingKg === 0 && !sessionBay?.hasDiscrepancy;

        return {
          order: d,
          session: sess,
          bayItem,
          plannedKg,
          loadedKg,
          pendingKg,
          isLoaded,
          hasDiscrepancy: sessionBay?.hasDiscrepancy ?? false,
          timeBeforeLoading: sessionBay?.timeBeforeLoading,
          loadStartTime: sessionBay?.loadStartTime,
          loadEndTime: sessionBay?.loadEndTime,
        };
      })
      .filter(Boolean) as Array<{
        order: DeliveryOrderPlan;
        session?: MultiWeighmentSession;
        bayItem: any;
        plannedKg: number;
        loadedKg: number;
        pendingKg: number;
        isLoaded: boolean;
        hasDiscrepancy: boolean;
        timeBeforeLoading?: string;
        loadStartTime?: string;
        loadEndTime?: string;
      }>;
  };

  const handleSelectDOForBayEntry = (orderId: number, bayNumber: number) => {
    setActiveDOId(orderId);
    const targetDO = deliveryOrders.find(d => d.id === orderId);
    if (!targetDO) return;

    const existingSess = sessionDOMap.get(orderId);
    const nowTime = formatTime12();
    const bayItem = targetDO.items?.find(it => it.bayNumber === bayNumber);
    const bayName = bayItem?.bayName || `Bay ${bayNumber}`;
    const handlerName = bayItem?.handlerName || 'Bay Handler';
    const updatedLocation = `At Bay ${bayNumber} (${bayName}) — Handler: ${handlerName}`;

    if (existingSess) {
      const bayIndex = existingSess.bayLoadings.findIndex(b => b.bayNumber === bayNumber);
      const updatedBayLoadings = [...existingSess.bayLoadings];

      if (bayIndex >= 0) {
        if (!updatedBayLoadings[bayIndex].timeBeforeLoading) {
          updatedBayLoadings[bayIndex] = {
            ...updatedBayLoadings[bayIndex],
            timeBeforeLoading: nowTime,
          };
        }
      }

      const updated: MultiWeighmentSession = {
        ...existingSess,
        currentLocation: updatedLocation,
        bayLoadings: updatedBayLoadings,
        status: existingSess.status === 'planned' ? 'loading' : existingSess.status,
      };
      updateSession(updated);
    } else {
      const initialBayLoadings: BayLoadingRecord[] = targetDO.items.map(item => ({
        bayNumber: item.bayNumber,
        bayName: item.bayName,
        handlerName: item.handlerName,
        itemName: item.itemName,
        plannedWeightKg: item.plannedWeightKg,
        actualLoadedWeightKg: item.actualLoadedWeightKg || 0,
        previousWeightKg: 0,
        grossWeightKg: 0,
        timeBeforeLoading: item.bayNumber === bayNumber ? nowTime : '',
        loadStartTime: '',
        loadEndTime: '',
        timeAfterLoading: '',
        loadingDurationSeconds: 0,
        deviationStatus: 'normal',
        hasDiscrepancy: false,
      }));

      const newSessionDraft: MultiWeighmentSession = {
        id: nextId(),
        deliveryOrderId: targetDO.id,
        doNumber: targetDO.doNumber,
        vehicleEntryId: targetDO.vehicleEntryId,
        slipNo: targetDO.slipNo,
        vehicleNumber: targetDO.vehicleNumber,
        customerName: targetDO.customerName,
        supervisorName: targetDO.supervisorName,
        currentLocation: updatedLocation,
        checkingStatus: targetDO.checkingStatus || 'pending',
        tareWeightKg: 0,
        finalGrossWeightKg: 0,
        totalNetWeightKg: 0,
        totalPlannedWeightKg: targetDO.totalPlannedWeightKg,
        weightVarianceKg: 0,
        weighments: [],
        bayLoadings: initialBayLoadings,
        inTime: targetDO.inTime,
        planningTime: formatDuration(targetDO.planningDurationSeconds),
        planningDurationSeconds: targetDO.planningDurationSeconds,
        outTime: targetDO.outTime,
        warehouseStartTime: '',
        warehouseEndTime: '',
        warehouseTimeSeconds: 0,
        status: 'loading',
        operationMode: 'loading',
        billingStatus: 'pending',
      };
      updateSession(newSessionDraft);
    }

    setBayEntryNotification({
      bayNumber,
      message: `Vehicle ${targetDO.vehicleNumber} (DO: ${targetDO.doNumber}) confirmed entry into Bay ${bayNumber} at ${nowTime}. Handler: ${handlerName}.`,
    });
    setBayEntryModalOpen(false);
    setBayEntryTargetBay(null);
    setTimeout(() => setBayEntryNotification(null), 6000);
  };

  // ── Pending Activity Calculations ──────────────────────────────────────
  const totalPlannedKg = session ? session.totalPlannedWeightKg : 0;
  const totalLoadedKg = session
    ? session.bayLoadings.reduce((sum, b) => sum + (b.actualLoadedWeightKg || 0), 0)
    : 0;
  const pendingKg = Math.max(0, totalPlannedKg - totalLoadedKg);
  const pendingItemsCount = session
    ? session.bayLoadings.filter(b => (b.actualLoadedWeightKg || 0) === 0).length
    : 0;
  const completionPercent =
    totalPlannedKg > 0 ? Math.min(100, Math.round((totalLoadedKg / totalPlannedKg) * 100)) : 0;

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

    const firstBay = session.bayLoadings[0];
    const updatedLocation = firstBay
      ? `Tare Captured ➔ En Route to Bay ${firstBay.bayNumber} (${firstBay.bayName})`
      : 'Tare Captured at Scale #1';

    const updated: MultiWeighmentSession = {
      ...session,
      tareWeightKg: tare,
      warehouseStartTime: nowTime,
      currentLocation: updatedLocation,
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
      target.loadingDurationSeconds = 720 + Math.floor(Math.random() * 60);
      target.deviationStatus = getDeviationStatus(
        target.loadingDurationSeconds,
        standardTimeLimits.bayLoadingMinutes
      );
    }

    newBayLoadings[bayIndex] = target;

    // Update real-time location as vehicle moves through the bay stages
    let updatedLocation = session.currentLocation;
    if (field === 'timeBeforeLoading') {
      updatedLocation = `At Bay ${target.bayNumber} (${target.bayName}) — Handler: ${target.handlerName}`;
    } else if (field === 'loadStartTime') {
      updatedLocation = `Loading in Bay ${target.bayNumber} (${target.bayName}) — Handler: ${target.handlerName}`;
    } else if (field === 'loadEndTime') {
      updatedLocation = `Finished loading Bay ${target.bayNumber} — Inspection Clearance`;
    } else if (field === 'timeAfterLoading') {
      updatedLocation = `Cleared from Bay ${target.bayNumber} ➔ Heading to Scale`;
    }

    updateSession({
      ...session,
      currentLocation: updatedLocation,
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

    // Update bay loading actual weight & clear any discrepancy flag
    const newBayLoadings = [...session.bayLoadings];
    newBayLoadings[bayIndex] = {
      ...newBayLoadings[bayIndex],
      actualLoadedWeightKg: incrementalWeight,
      previousWeightKg: prevWeight,
      grossWeightKg: currentGross,
      activityType: isUnloading ? 'unloading' : 'loading',
      hasDiscrepancy: false,
      discrepancyNote: undefined,
    };

    // Total net weight so far
    const updatedNet = isUnloading
      ? session.totalNetWeightKg + incrementalWeight
      : currentGross - session.tareWeightKg;
    const variance = updatedNet - session.totalPlannedWeightKg;

    // Check if all bays have now recorded weights
    const allBaysWeighed = newBayLoadings.every(b => (b.actualLoadedWeightKg || 0) > 0);
    const nextBay = newBayLoadings.find(b => (b.actualLoadedWeightKg || 0) === 0);

    let nextLocation = session.currentLocation;
    let nextStatus = session.status;

    if (allBaysWeighed) {
      nextLocation = 'At Checking Station (All items loaded, awaiting checker inspection)';
      nextStatus = 'awaiting_check';
    } else if (nextBay) {
      nextLocation = `Post Bay ${bayNumber} Weighment ➔ En Route to Bay ${nextBay.bayNumber} (${nextBay.bayName})`;
    }

    const updated: MultiWeighmentSession = {
      ...session,
      finalGrossWeightKg: currentGross,
      totalNetWeightKg: updatedNet,
      weightVarianceKg: variance,
      weighments: [...session.weighments, newWeighmentRecord],
      bayLoadings: newBayLoadings,
      currentLocation: nextLocation,
      status: nextStatus,
    };

    updateSession(updated);
  };

  // ── Stage 4: Checking Stage — Discrepancy Guidance or Verification ─────
  const handleReportDiscrepancy = () => {
    if (!session) return;
    const targetBay = session.bayLoadings.find(b => b.bayNumber === discrepancyBayNum);
    const updatedBayLoadings = session.bayLoadings.map(b =>
      b.bayNumber === discrepancyBayNum
        ? {
            ...b,
            hasDiscrepancy: true,
            discrepancyNote: discrepancyReasonText,
          }
        : b
    );

    const guidanceLocation = `Guided to Bay ${discrepancyBayNum} (${targetBay?.bayName || 'Loading Bay'}) by Checker ${selectedChecker}: ${discrepancyReasonText}`;

    const updated: MultiWeighmentSession = {
      ...session,
      status: 'discrepancy',
      checkingStatus: 'discrepancy',
      discrepancyNotes: discrepancyReasonText,
      discrepancyTargetBays: [discrepancyBayNum],
      currentLocation: guidanceLocation,
      bayLoadings: updatedBayLoadings,
    };

    updateSession(updated);
    setShowDiscrepancyModal(false);
  };

  const handleVerifyAndMarkChecked = () => {
    if (!session) return;
    const nowTime = formatTime12();
    const warehouseSecs = 2400 + Math.floor(Math.random() * 300);

    const updated: MultiWeighmentSession = {
      ...session,
      status: 'Checked',
      checkingStatus: 'checked',
      checkerName: selectedChecker,
      checkedAt: nowTime,
      warehouseEndTime: nowTime,
      warehouseTimeSeconds: warehouseSecs,
      currentLocation: 'Billing Section (Inspection Verified by Checker)',
    };

    updateSession(updated);
  };

  // ── Stage 5: Final Billing & Payment Settlement ────────────────────────
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
      currentLocation: 'Exit Gate (Bill Settled, Cleared for Departure)',
    };
    updateSession(updated);
  };

  // ── Stage 6: Authorize Exit from Warehouse ─────────────────────────────
  const handleAuthorizeExit = () => {
    if (!session) return;
    const nowTime = formatTime12();
    const totalTurnaround = (session.warehouseTimeSeconds || 2400) + 390;

    const updated: MultiWeighmentSession = {
      ...session,
      exitTime: nowTime,
      status: 'exited',
      currentLocation: 'Exited Warehouse (Departure Completed)',
      totalTurnaroundSeconds: totalTurnaround,
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
  const allBaysLoaded = session?.bayLoadings.every(b => (b.actualLoadedWeightKg || 0) > 0);

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
            Select an incomplete Delivery Order at any stage. Monitor vehicle location, pending loading activity, assigned bay handlers, checking inspection, and billing exit.
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

      {/* ── Delivery Order Selector (Requirement 10: Select DO at each stage from incomplete list) ── */}
      <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 mb-3">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              Delivery Order Selection at Current Stage
            </h3>
            <span className="text-xs font-bold text-blue-800 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              {incompleteDOs.length} Incomplete DO(s) Pending
            </span>
          </div>

          {/* Filter toggle: Incomplete (Active) vs All DOs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-medium">
            <button
              onClick={() => setFilterTab('incomplete')}
              className={cn(
                'px-3 py-1 rounded-md transition font-semibold',
                filterTab === 'incomplete'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              Incomplete DOs ({incompleteDOs.length})
            </button>
            <button
              onClick={() => setFilterTab('all')}
              className={cn(
                'px-3 py-1 rounded-md transition font-semibold',
                filterTab === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              )}
            >
              All Orders ({deliveryOrders.length})
            </button>
          </div>
        </div>

        {displayedDOs.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs border border-dashed rounded-lg">
            No delivery orders available in this view.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {displayedDOs.map(d => {
              const isSelected = d.id === activeDOId;
              const sess = sessionDOMap.get(d.id);
              const isComplete = d.status === 'exited' || sess?.status === 'exited';

              // Calculate pending weight for this DO card
              const dTotalPlanned = d.totalPlannedWeightKg;
              const dTotalLoaded = sess
                ? sess.bayLoadings.reduce((sum, b) => sum + (b.actualLoadedWeightKg || 0), 0)
                : 0;
              const dPending = Math.max(0, dTotalPlanned - dTotalLoaded);

              return (
                <button
                  key={d.id}
                  onClick={() => setActiveDOId(d.id)}
                  className={cn(
                    'p-3 rounded-xl border text-left transition-all text-xs relative overflow-hidden',
                    isSelected
                      ? 'border-blue-600 bg-blue-50/80 shadow-md ring-2 ring-blue-500/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-blue-700 font-bold">{d.doNumber}</span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                        isComplete
                          ? 'bg-slate-100 text-slate-600'
                          : sess?.status === 'Checked'
                          ? 'bg-emerald-100 text-emerald-800'
                          : sess?.status === 'discrepancy'
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : sess?.status === 'billed'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-blue-100 text-blue-800'
                      )}
                    >
                      {sess?.status === 'Checked'
                        ? 'Checked'
                        : sess?.status === 'discrepancy'
                        ? 'Discrepancy Bay'
                        : sess?.status === 'billed'
                        ? 'Billed'
                        : isComplete
                        ? 'Exited'
                        : 'In Progress'}
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="font-mono font-black text-sm uppercase text-slate-900">
                      {d.vehicleNumber}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Supervisor: <strong>{d.supervisorName}</strong>
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 truncate mt-0.5">{d.customerName}</p>

                  <div className="mt-2 pt-2 border-t border-slate-200/70 flex items-center justify-between text-[10px] text-slate-500">
                    <span className="flex items-center gap-1 font-medium text-slate-700 truncate max-w-[170px]">
                      <MapPin className="w-3 h-3 text-red-500 flex-shrink-0" />
                      {sess?.currentLocation || d.currentLocation || 'In Warehouse'}
                    </span>
                    <span
                      className={cn(
                        'font-mono font-bold',
                        dPending > 0 ? 'text-amber-700' : 'text-emerald-700'
                      )}
                    >
                      {dPending > 0 ? `${dPending.toLocaleString()} kg pending` : 'All items loaded'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {session ? (
        <div className="space-y-6">
          {/* ── REAL-TIME LOCATION & PENDING ACTIVITY MONITOR (Requirements 10, 11) ── */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-xl border border-slate-700 space-y-5">
            {/* Top Row: Vehicle Location Pin & Live Status */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-700/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded bg-blue-500/20 text-blue-300 font-mono font-bold text-xs border border-blue-400/30">
                    {session.doNumber}
                  </span>
                  <h3 className="text-xl font-black font-mono uppercase tracking-wider text-white">
                    {session.vehicleNumber}
                  </h3>
                  <span className="text-xs bg-slate-700/80 text-slate-300 px-2.5 py-0.5 rounded-full font-medium">
                    Supervisor: {session.supervisorName}
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Customer: <strong className="text-white">{session.customerName}</strong> | Driver:{' '}
                  <strong className="text-white">{session.driverName || 'Designated Driver'}</strong>
                </p>
              </div>

              {/* Current Warehouse Location Card with Pulsing Indicator */}
              <div className="bg-slate-800/90 border border-slate-600/80 rounded-xl p-3.5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center flex-shrink-0 relative">
                  <MapPin className="w-5 h-5 text-red-400 animate-bounce" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-mono">
                    Current Location Within Warehouse
                  </span>
                  <p className="text-sm font-bold text-white leading-tight">
                    {session.currentLocation}
                  </p>
                </div>
              </div>
            </div>

            {/* Warehouse Stepper Trail: Step-by-Step Location Pipeline */}
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-2 font-mono">
                Warehouse Milestone Workflow Pipeline:
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-center text-xs">
                {[
                  {
                    step: 1,
                    title: 'Gate Entry',
                    desc: session.inTime,
                    active: true,
                    complete: true,
                  },
                  {
                    step: 2,
                    title: 'Planned (D.O)',
                    desc: session.outTime,
                    active: true,
                    complete: true,
                  },
                  {
                    step: 3,
                    title: '1st Tare Scale',
                    desc: session.tareWeightKg > 0 ? `${session.tareWeightKg.toLocaleString()} kg` : 'Pending',
                    active: true,
                    complete: session.tareWeightKg > 0,
                  },
                  {
                    step: 4,
                    title: 'Bay Loadings',
                    desc: `${totalLoadedKg.toLocaleString()} / ${totalPlannedKg.toLocaleString()} kg`,
                    active: session.tareWeightKg > 0,
                    complete: allBaysLoaded,
                  },
                  {
                    step: 5,
                    title: 'Inspection Check',
                    desc: session.checkingStatus === 'checked' ? 'Checked' : session.checkingStatus === 'discrepancy' ? 'Discrepancy' : 'Pending',
                    active: allBaysLoaded,
                    complete: session.checkingStatus === 'checked',
                  },
                  {
                    step: 6,
                    title: 'Billing Section',
                    desc: session.billingStatus === 'completed' ? 'Settled' : 'Pending',
                    active: session.checkingStatus === 'checked',
                    complete: session.billingStatus === 'completed',
                  },
                  {
                    step: 7,
                    title: 'Exit Gate',
                    desc: session.exitTime || 'Awaiting Departure',
                    active: session.billingStatus === 'completed',
                    complete: session.status === 'exited',
                  },
                ].map(item => (
                  <div
                    key={item.step}
                    className={cn(
                      'p-2.5 rounded-xl border text-center transition-all',
                      item.complete
                        ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                        : item.active
                        ? 'bg-blue-950/60 border-blue-500/60 text-blue-200 shadow-sm ring-1 ring-blue-400/30'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-500'
                    )}
                  >
                    <span className="text-[10px] font-bold block opacity-70">
                      Step {item.step}
                    </span>
                    <p className="font-bold text-xs mt-0.5">{item.title}</p>
                    <p className="text-[10px] opacity-80 font-mono mt-0.5 truncate">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Real-Time Pending Loading/Unloading Activity Gauge */}
            <div className="bg-slate-800/70 border border-slate-700 rounded-xl p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-400" />
                    Loading / Unloading Activity Progress for {session.doNumber}
                  </h4>
                  <p className="text-xs text-slate-400">
                    Tracks pending weight and completed items in real-time across assigned bays.
                  </p>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-slate-400">Activity Completion:</span>{' '}
                  <span className="text-sm font-black text-emerald-400">{completionPercent}%</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-700/80 rounded-full h-3 overflow-hidden p-0.5">
                <div
                  className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${completionPercent}%` }}
                />
              </div>

              {/* Metric Breakdown Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs font-mono">
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-700">
                  <span className="text-slate-400 text-[10px] block uppercase font-sans">Total Planned</span>
                  <span className="font-bold text-white text-sm">{totalPlannedKg.toLocaleString()} kg</span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-700">
                  <span className="text-slate-400 text-[10px] block uppercase font-sans">Loaded So Far</span>
                  <span className="font-bold text-emerald-400 text-sm">{totalLoadedKg.toLocaleString()} kg</span>
                </div>
                <div className="p-2 bg-amber-950/40 rounded-lg border border-amber-700/50">
                  <span className="text-amber-300 text-[10px] block uppercase font-sans font-bold">
                    Pending Activity
                  </span>
                  <span className="font-black text-amber-300 text-sm">{pendingKg.toLocaleString()} kg</span>
                </div>
                <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-700">
                  <span className="text-slate-400 text-[10px] block uppercase font-sans">Remaining Bays</span>
                  <span className="font-bold text-white text-sm">{pendingItemsCount} Bay(s)</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── TOP TIMING & WEIGHT OVERVIEW BANNER ────────────────────── */}
          <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-4 border-b border-slate-100 gap-4">
              <div>
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Session Durations & Timing Metrics
                </span>
                <p className="text-xs text-slate-500 mt-0.5">
                  Automated chronological tracking in 12-hour format with seconds.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">In Time (Gate)</span>
                  <span className="font-bold text-slate-800">{session.inTime}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">Planning Duration</span>
                  <span className="font-bold text-blue-700">{session.planningTime}</span>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px] uppercase font-sans">Out Time (Plan Done)</span>
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
                <span className="text-[10px] text-slate-400">Empty vehicle tare</span>
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
                <span className="text-[10px] text-slate-400">D.O Order Target</span>
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

          {/* ── SEQUENTIAL STAGES WORKFLOW ───────────────────────────── */}
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

            {/* Bay Entry Notification Banner */}
            {bayEntryNotification && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between shadow-xs animate-fadeIn">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-semibold">{bayEntryNotification.message}</span>
                </div>
                <button
                  onClick={() => setBayEntryNotification(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold"
                >
                  ✕
                </button>
              </div>
            )}

            {/* ══ BAY ARRIVAL & D.O SELECTION STATION ══ */}
            <div className="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                    <DoorOpen className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">
                      Warehouse Bay Arrival & D.O Selection Station
                    </h4>
                    <p className="text-xs text-slate-500">
                      When a vehicle enters each bay, select the D.O number from the list of pending D.Os for loading or unloading activity:
                    </p>
                  </div>
                </div>
                <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-200 self-start">
                  Multi-Bay Dispatch
                </span>
              </div>

              {/* Bay station cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                {(() => {
                  const bayNums = Array.from(
                    new Set(deliveryOrders.flatMap(d => (d.items || []).map(i => i.bayNumber)))
                  ).sort((a, b) => a - b);
                  const displayBays = bayNums.length > 0 ? bayNums : [1, 2, 3];

                  return displayBays.map(bNum => {
                    const pendingForBay = getPendingDOsForBay(bNum);
                    const isVehicleAtThisBay = session.currentLocation.includes(`Bay ${bNum}`);
                    const bayName =
                      session.bayLoadings.find(b => b.bayNumber === bNum)?.bayName ||
                      deliveryOrders.flatMap(d => d.items).find(i => i.bayNumber === bNum)?.bayName ||
                      `Bay ${bNum}`;
                    const handlerName =
                      session.bayLoadings.find(b => b.bayNumber === bNum)?.handlerName ||
                      deliveryOrders.flatMap(d => d.items).find(i => i.bayNumber === bNum)?.handlerName ||
                      'Bay Handler';

                    return (
                      <div
                        key={bNum}
                        className={cn(
                          'p-3.5 rounded-xl border flex flex-col justify-between gap-3 text-xs transition-all',
                          isVehicleAtThisBay
                            ? 'border-indigo-400 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-400/20'
                            : 'border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300'
                        )}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                              <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold inline-flex items-center justify-center">
                                B{bNum}
                              </span>
                              Bay {bNum}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] font-bold px-2 py-0.5 rounded-full',
                                pendingForBay.length > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              )}
                            >
                              {pendingForBay.length} Pending D.O{pendingForBay.length === 1 ? '' : 's'}
                            </span>
                          </div>

                          <p className="text-[11px] text-slate-600 font-medium truncate">{bayName}</p>
                          <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <UserCheck className="w-3 h-3 text-blue-600" /> Handler: <strong>{handlerName}</strong>
                          </p>

                          {isVehicleAtThisBay && (
                            <div className="mt-2 p-1.5 bg-indigo-100/70 rounded-lg text-[11px] text-indigo-900 font-semibold flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                              Active: {session.vehicleNumber} ({session.doNumber})
                            </div>
                          )}
                        </div>

                        <div className="space-y-1.5 pt-2 border-t border-slate-200/70">
                          <label className="block text-[10px] uppercase font-bold text-slate-500">
                            Select D.O Entering Bay {bNum}:
                          </label>
                          <div className="flex items-center gap-1.5">
                            <select
                              value=""
                              onChange={e => {
                                if (e.target.value) handleSelectDOForBayEntry(Number(e.target.value), bNum);
                              }}
                              className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                              <option value="">-- Choose Pending D.O --</option>
                              {pendingForBay.map(p => (
                                <option key={p.order.id} value={p.order.id}>
                                  {p.order.doNumber} ({p.order.vehicleNumber}) — {p.bayItem.itemName} ({p.pendingKg.toLocaleString()} kg)
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => {
                                setBayEntryTargetBay(bNum);
                                setBayEntryModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0"
                              title={`View pending D.Os for Bay ${bNum}`}
                            >
                              <DoorOpen className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>

            {/* ══ STAGE 2: SEQUENTIAL BAY LOADING & WEIGHMENTS (Associated Handlers) ══ */}
            {session.bayLoadings.map((bay, idx) => {
              const bayNumber = idx + 1;
              const weighmentNum = bayNumber + 1; // 2nd, 3rd, ...
              const weighmentRecord = session.weighments.find(w => w.bayNumber === bayNumber);
              const pendingBayWeight = Math.max(0, bay.plannedWeightKg - (bay.actualLoadedWeightKg || 0));

              return (
                <div
                  key={idx}
                  className={cn(
                    'bg-white rounded-xl shadow border p-5 space-y-4 transition-all',
                    bay.hasDiscrepancy
                      ? 'border-amber-400 ring-2 ring-amber-400/30 bg-amber-50/20'
                      : 'border-slate-200'
                  )}
                >
                  {/* Discrepancy Guidance Alert Banner if vehicle was guided back here */}
                  {bay.hasDiscrepancy && (
                    <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 animate-bounce" />
                      <div>
                        <p className="font-bold text-amber-950 flex items-center gap-1.5">
                          <RotateCcw className="w-4 h-4 text-amber-700" />
                          Vehicle Guided Back to Bay {bay.bayNumber} by Checker:
                        </p>
                        <p className="text-amber-800 mt-0.5">{bay.discrepancyNote}</p>
                        <p className="text-[11px] text-amber-700 mt-1 font-medium">
                          Handler <strong>{bay.handlerName}</strong> must perform loading adjustment, then capture updated weighment below.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Bay Header with Associated Handler */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm',
                          isUnloading ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        )}
                      >
                        {bayNumber + 1}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Bay {bay.bayNumber}: {bay.bayName} — {bay.itemName}
                        </h4>
                        <p className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                          <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-semibold flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Associated Bay Handler: {bay.handlerName}
                          </span>
                          <span>| Planned: <strong>{bay.plannedWeightKg.toLocaleString()} kg</strong></span>
                          {pendingBayWeight > 0 ? (
                            <span className="text-amber-700 font-mono font-bold">
                              ({pendingBayWeight.toLocaleString()} kg pending)
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-bold">✓ Loaded</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {weighmentRecord && !bay.hasDiscrepancy ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                        <Check className="w-4 h-4" /> {weighmentNum}
                        {getOrdinalSuffix(weighmentNum)} Weighment Captured:{' '}
                        {weighmentRecord.capturedWeightKg.toLocaleString()} kg
                      </span>
                    ) : (
                      <span className="text-xs text-amber-700 bg-amber-50 px-3 py-1 rounded-md font-medium border border-amber-200">
                        {bay.hasDiscrepancy ? 'Adjustment Required' : 'In Progress'}
                      </span>
                    )}
                  </div>

                  {/* Vehicle Entry at This Bay — Select Pending D.O */}
                  {(() => {
                    const pendingForThisBay = getPendingDOsForBay(bay.bayNumber);
                    const isCurrentDOForThisBay = activeDO?.items.some(it => it.bayNumber === bay.bayNumber);

                    return (
                      <div className="p-3.5 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-blue-50/40 rounded-xl border border-indigo-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                            <Truck className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                              Vehicle Entering Bay {bay.bayNumber} ({bay.bayName})
                              <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100 px-2 py-0.5 rounded-full font-mono">
                                {pendingForThisBay.length} Pending D.O{pendingForThisBay.length === 1 ? '' : 's'}
                              </span>
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Select D.O number from pending list for loading or unloading activity:
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                          <select
                            value={isCurrentDOForThisBay ? activeDO?.id : ''}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleSelectDOForBayEntry(Number(e.target.value), bay.bayNumber);
                              }
                            }}
                            className="px-3 py-1.5 bg-white border border-indigo-300 rounded-lg text-xs font-mono font-semibold text-indigo-900 focus:ring-2 focus:ring-indigo-500 shadow-xs outline-none min-w-[260px] max-w-[360px]"
                          >
                            <option value="">-- Select Pending D.O for Bay {bay.bayNumber} --</option>
                            {pendingForThisBay.map(p => (
                              <option key={p.order.id} value={p.order.id}>
                                {p.order.doNumber} ({p.order.vehicleNumber}) — {p.bayItem.itemName} ({p.pendingKg.toLocaleString()} kg pending)
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => {
                              setBayEntryTargetBay(bay.bayNumber);
                              setBayEntryModalOpen(true);
                            }}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition shrink-0"
                          >
                            <DoorOpen className="w-3.5 h-3.5" /> Pick D.O
                          </button>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Weight Breakdown Before/After Loading */}
                  {(() => {
                    const priorWeighment = session.weighments[idx];
                    const prevWeight = priorWeighment
                      ? priorWeighment.capturedWeightKg
                      : isUnloading
                      ? session.finalGrossWeightKg || 14750
                      : session.tareWeightKg;

                    const bayDeltaWeight =
                      bay.actualLoadedWeightKg > 0 ? bay.actualLoadedWeightKg : bay.plannedWeightKg;

                    const calculatedGross = isUnloading
                      ? Math.max(0, prevWeight - bayDeltaWeight)
                      : prevWeight + bayDeltaWeight;

                    return (
                      <div
                        className={cn(
                          'p-4 rounded-xl border grid grid-cols-1 sm:grid-cols-3 gap-3 text-center shadow-xs',
                          isUnloading
                            ? 'bg-gradient-to-r from-amber-50/70 via-slate-50 to-purple-50/70 border-amber-200'
                            : 'bg-gradient-to-r from-blue-50/70 via-slate-50 to-emerald-50/70 border-blue-200'
                        )}
                      >
                        <div className="p-2 bg-white/80 rounded-lg border border-slate-200/80">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {isUnloading ? 'Previous Weight (Before Offloading)' : 'Previous Weight (Before Loading)'}
                          </p>
                          <p className="text-lg font-mono font-black text-slate-800 mt-0.5">
                            {prevWeight.toLocaleString()} kg
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {idx === 0
                              ? isUnloading
                                ? 'Initial Gross Weight'
                                : '1st Tare Weight'
                              : `Post Bay ${idx} Weighment`}
                          </p>
                        </div>

                        <div className="p-2 bg-white/80 rounded-lg border border-slate-200/80">
                          <p
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider',
                              isUnloading ? 'text-amber-700' : 'text-blue-700'
                            )}
                          >
                            {isUnloading
                              ? `Weight Offloaded in Bay ${bay.bayNumber}`
                              : `Weight Added in Bay ${bay.bayNumber}`}
                          </p>
                          <p
                            className={cn(
                              'text-lg font-mono font-black mt-0.5',
                              isUnloading ? 'text-amber-800' : 'text-blue-800'
                            )}
                          >
                            {isUnloading ? '-' : '+'}{bayDeltaWeight.toLocaleString()} kg
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {bay.actualLoadedWeightKg > 0 ? 'Actual Measured' : 'Planned Target'}
                          </p>
                        </div>

                        <div className="p-2 bg-white/80 rounded-lg border border-slate-200/80">
                          <p
                            className={cn(
                              'text-[10px] font-bold uppercase tracking-wider',
                              isUnloading ? 'text-purple-700' : 'text-emerald-700'
                            )}
                          >
                            {isUnloading ? 'Gross Weight (After Offloading)' : 'Gross Weight (After Loading)'}
                          </p>
                          <p
                            className={cn(
                              'text-lg font-mono font-black mt-0.5',
                              isUnloading ? 'text-purple-900' : 'text-emerald-900'
                            )}
                          >
                            {calculatedGross.toLocaleString()} kg
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {isUnloading ? 'Previous - Offloaded' : 'Previous + Added'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Stage Timestamps for Loading at Bay */}
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
                          className="px-2.5 py-1 bg-white border border-indigo-300 hover:bg-indigo-50 rounded text-xs font-semibold text-indigo-700 flex items-center gap-1 shadow-xs"
                        >
                          <DoorOpen className="w-3.5 h-3.5" /> Vehicle Entered Bay
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
                      {weighmentRecord && !bay.hasDiscrepancy ? (
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
                            Interval:{' '}
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

                    {(!weighmentRecord || bay.hasDiscrepancy) && (
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

            {/* ══ STAGE 3: CHECKING & DISCREPANCY FLOW (Requirement 11) ══ */}
            <div className="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm',
                      session.checkingStatus === 'checked'
                        ? 'bg-emerald-100 text-emerald-700'
                        : session.checkingStatus === 'discrepancy'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-purple-100 text-purple-700'
                    )}
                  >
                    ✓
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      Stage 3: Independent Checking & Verification Stage
                      {session.checkingStatus === 'checked' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Status: Checked
                        </span>
                      )}
                      {session.checkingStatus === 'discrepancy' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                          Status: Discrepancy Directive Active
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Once all items from relevant bays are loaded, a designated checker inspects cargo and verified weights. If discrepancy exists, checker guides vehicle back to specific bay(s).
                    </p>
                  </div>
                </div>

                {/* Checker Personnel Assignment */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500 font-medium">Checking Personnel:</span>
                  <select
                    value={selectedChecker}
                    onChange={e => setSelectedChecker(e.target.value)}
                    disabled={session.checkingStatus === 'checked'}
                    className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 outline-none"
                  >
                    {checkingPersonnel.map(c => (
                      <option key={c.id} value={c.name}>
                        {c.name} ({c.role.toUpperCase()})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status Outcome Banner */}
              {session.checkingStatus === 'checked' ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-emerald-950">
                        Cargo Verified & Status Marked as &apos;Checked&apos;
                      </p>
                      <p className="text-emerald-800 mt-0.5">
                        Verified by <strong>{session.checkerName || selectedChecker}</strong> at{' '}
                        <strong>{session.checkedAt || session.warehouseEndTime}</strong>. All items and weights match specifications.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-xs bg-white/80 px-3 py-1.5 rounded-lg border border-emerald-300/80">
                    <ArrowRight className="w-4 h-4 text-emerald-600" />
                    <span>Vehicle Directed to <strong>Billing Section</strong></span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Checking Comparison Summary */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <p className="font-bold text-slate-700 mb-2">
                      Checker Verification Breakdown:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-2.5 bg-white rounded-lg border">
                        <span className="text-slate-400 block text-[10px] uppercase">Total Planned Weight</span>
                        <span className="font-bold text-slate-800 text-sm">{totalPlannedKg.toLocaleString()} kg</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border">
                        <span className="text-slate-400 block text-[10px] uppercase">Actual Loaded Weight</span>
                        <span className="font-bold text-blue-700 text-sm">{totalLoadedKg.toLocaleString()} kg</span>
                      </div>
                      <div className="p-2.5 bg-white rounded-lg border">
                        <span className="text-slate-400 block text-[10px] uppercase">Variance</span>
                        <span
                          className={cn(
                            'font-bold text-sm',
                            session.weightVarianceKg === 0
                              ? 'text-emerald-700'
                              : Math.abs(session.weightVarianceKg) <= 100
                              ? 'text-amber-700'
                              : 'text-red-700'
                          )}
                        >
                          {session.weightVarianceKg >= 0 ? '+' : ''}{session.weightVarianceKg} kg
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Guide to Bay(s) for Discrepancy OR Mark as Checked */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowDiscrepancyModal(true)}
                      disabled={!allBaysLoaded}
                      className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-40"
                    >
                      <AlertTriangle className="w-4 h-4" />
                      Discrepancy Found — Guide Vehicle to Bay(s)
                    </button>

                    <button
                      type="button"
                      onClick={handleVerifyAndMarkChecked}
                      disabled={!allBaysLoaded}
                      className="w-full sm:flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition disabled:opacity-40"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Verify All Items & Mark Status as &apos;Checked&apos;
                    </button>
                  </div>

                  {!allBaysLoaded && (
                    <p className="text-[11px] text-slate-400 text-center">
                      * All planned bay loadings must be completed before inspection checking can be performed.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ══ STAGE 4: BILLING SECTION (Settlement & Agreed Credit Terms) ══ */}
            <div className="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                    ₹
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      Stage 4: Warehouse Billing Section & Payment Settlement
                      {session.billingStatus === 'completed' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          Billed
                        </span>
                      )}
                    </h4>
                    <p className="text-xs text-slate-500">
                      Vehicle enters billing section after being verified &apos;Checked&apos;. Settle weighing charges or apply agreed customer credit terms.
                    </p>
                  </div>
                </div>

                {session.billingStatus === 'completed' && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4" /> Bill Settled: ₹ {session.weighingCharges.toFixed(2)} ({session.paymentMode})
                  </span>
                )}
              </div>

              {session.checkingStatus !== 'checked' ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                  <Info className="w-4 h-4 mx-auto mb-1 text-slate-400" />
                  Vehicle has not yet reached the Billing Section. It must be inspected and marked as &apos;Checked&apos; first.
                </div>
              ) : session.billingStatus !== 'completed' ? (
                <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Customer Credit Limit</span>
                      <span className="text-sm font-bold text-slate-900 font-mono">₹ 1,50,000</span>
                      <span className="text-[10px] text-emerald-700 block mt-0.5">Agreed terms: 30 days net</span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Advance / Balance</span>
                      <span className="text-sm font-bold text-emerald-700 font-mono">₹ 15,000 Available</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Cleared at Gate</span>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-slate-500 block text-[11px]">Weighing Fee (₹)</span>
                      <input
                        type="number"
                        value={billingCharges}
                        onChange={e => setBillingCharges(Number(e.target.value))}
                        className="w-full px-2 py-1 border rounded text-sm font-mono font-bold mt-1 outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                        Settlement / Payment Mode *
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
                        <option value="Cash">Cash (Immediate Settlement)</option>
                        <option value="GPay">GPay (UPI / QR Code Scan)</option>
                        <option value="Net Banking">Net Banking (NEFT / RTGS)</option>
                        <option value="IMPS">IMPS / Fast Transfer</option>
                        <option value="Credit">Customer Credit Terms (Adjust Against Balance)</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handleCompleteBilling}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition"
                    >
                      <CreditCard className="w-4 h-4" /> Settle Bill & Clear Vehicle for Exit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
                  <span>
                    Payment settled according to agreed terms. Bill completed at{' '}
                    <strong>{session.billingEndTime}</strong>.
                  </span>
                  <span className="font-bold text-emerald-800">Clearance Granted for Exit</span>
                </div>
              )}
            </div>

            {/* ══ STAGE 5: EXIT GATE DEPARTURE ══ */}
            <div className="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full font-bold flex items-center justify-center text-sm',
                      session.status === 'exited' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                    )}
                  >
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      Stage 5: Warehouse Exit Gate Authorization
                    </h4>
                    <p className="text-xs text-slate-500">
                      Once the bill amount is settled according to agreed terms, the vehicle is let to exit the warehouse.
                    </p>
                  </div>
                </div>

                {session.status === 'exited' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-900 text-white">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Exited at {session.exitTime} (Turnaround: {formatDuration(session.totalTurnaroundSeconds || 0)})
                  </span>
                ) : (
                  <button
                    onClick={handleAuthorizeExit}
                    disabled={session.billingStatus !== 'completed'}
                    className="py-2.5 px-5 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition disabled:opacity-40"
                  >
                    <LogOut className="w-4 h-4 text-emerald-400" /> Let Vehicle Exit Warehouse
                  </button>
                )}
              </div>

              {session.billingStatus !== 'completed' && (
                <p className="text-[11px] text-amber-700">
                  * Vehicle exit gate is locked. Bill settlement or credit authorization is mandatory prior to exit.
                </p>
              )}
            </div>
          </div>

          {/* ── COMPLETE STAGE BREAKDOWN / AUDIT LOG ─────────────────── */}
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
            Select an incomplete Delivery Order above or complete vehicle planning to begin sequential weighments.
          </p>
        </div>
      )}

      {/* ── DISCREPANCY GUIDANCE MODAL ──────────────────────────────── */}
      {showDiscrepancyModal && session && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-amber-600 border-b pb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Checker Discrepancy Directive
                </h3>
                <p className="text-xs text-slate-500">
                  Direct vehicle back to specific bay(s) for loading / offloading adjustment
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Designated Checking Inspector:
                </label>
                <input
                  type="text"
                  value={selectedChecker}
                  readOnly
                  className="w-full px-3 py-2 bg-slate-100 border rounded-lg font-medium text-slate-700"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Select Bay where Vehicle Must Return for Correction: *
                </label>
                <select
                  value={discrepancyBayNum}
                  onChange={e => setDiscrepancyBayNum(Number(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg font-semibold text-slate-800"
                >
                  {session.bayLoadings.map(b => (
                    <option key={b.bayNumber} value={b.bayNumber}>
                      Bay {b.bayNumber}: {b.bayName} — {b.itemName} (Handler: {b.handlerName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">
                  Checker Instructions & Discrepancy Reason: *
                </label>
                <textarea
                  rows={3}
                  value={discrepancyReasonText}
                  onChange={e => setDiscrepancyReasonText(e.target.value)}
                  placeholder="Explain the discrepancy and exact weight adjustment required..."
                  className="w-full px-3 py-2 border rounded-lg text-slate-800 font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDiscrepancyModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReportDiscrepancy}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
              >
                <RotateCcw className="w-4 h-4" /> Issue Directive & Guide Vehicle to Bay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── BAY ENTRY D.O SELECTION MODAL ── */}
      {bayEntryModalOpen && bayEntryTargetBay !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4 animate-fadeIn">
            <div className="flex items-start justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <DoorOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-800">
                    Vehicle Entering Bay {bayEntryTargetBay}: Select Pending D.O
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Select a Delivery Order from the queue to confirm bay entry and initiate loading or unloading activity:
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setBayEntryModalOpen(false);
                  setBayEntryTargetBay(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* List of pending DOs for this bay */}
            {(() => {
              const pendingList = getPendingDOsForBay(bayEntryTargetBay);
              if (pendingList.length === 0) {
                return (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                    <Truck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No pending Delivery Orders assigned to Bay {bayEntryTargetBay}</p>
                    <p className="text-slate-400 mt-1">All planned items for this bay have already been loaded or no orders are scheduled.</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {pendingList.map(item => {
                    const isCurrent = item.order.id === activeDOId;
                    return (
                      <div
                        key={item.order.id}
                        className={cn(
                          'p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                          isCurrent
                            ? 'border-indigo-500 bg-indigo-50/50 shadow-sm ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'
                        )}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-indigo-700 text-sm">
                              {item.order.doNumber}
                            </span>
                            <span className="font-mono font-extrabold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {item.order.vehicleNumber}
                            </span>
                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              {item.order.vehicleType}
                            </span>
                            {item.hasDiscrepancy && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Discrepancy Return
                              </span>
                            )}
                          </div>

                          <p className="text-xs text-slate-700">
                            <strong>{item.bayItem.itemName}</strong> · Customer: <span className="text-slate-600">{item.order.customerName}</span> · Driver: <span className="text-slate-600">{item.order.driverName} ({item.order.driverPhone})</span>
                          </p>

                          <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                            <span className="flex items-center gap-1">
                              <UserCheck className="w-3 h-3 text-blue-600" /> Handler: <strong>{item.bayItem.handlerName}</strong>
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-600" /> {item.order.currentLocation}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col sm:items-end justify-between gap-2 shrink-0">
                          <div className="sm:text-right">
                            <p className="text-sm font-black font-mono text-amber-700">
                              {item.pendingKg.toLocaleString()} kg pending
                            </p>
                            <p className="text-[10px] text-slate-400">
                              Target: {item.plannedKg.toLocaleString()} kg
                            </p>
                          </div>

                          <button
                            onClick={() => handleSelectDOForBayEntry(item.order.id, bayEntryTargetBay)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition"
                          >
                            <DoorOpen className="w-3.5 h-3.5" /> Confirm Vehicle Entered Bay
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setBayEntryModalOpen(false);
                  setBayEntryTargetBay(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
