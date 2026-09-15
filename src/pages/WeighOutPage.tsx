/**
 * ============================================================================
 * UNLOADING OPERATIONS PAGE
 * ============================================================================
 * Fulfills Requirements 12, 13, 14, 15 from Changes required.txt:
 * - Line 12: "Similaryly in 'Unloading' page the user should be able to
 *            select from a list of vehicle number or D.O number for the
 *            unloading activity. Here also time has to be captured in each
 *            bay for the unloading activity."
 * - Line 13: "This 'Unloading' page the user should be able to select each
 *            bay and item being loaded [unloaded]."
 * - Line 14: "Both on 'Loading' page and 'Unloading' page the 'Finish Loading'
 *            / 'Finish Unloading' checkbox should be visible for the user to
 *            mark the completion of all tasks for a given D.O"
 * - Line 15: "Once loading or unloading activity is marked as finished then
 *            it has to go the checking section."
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import type { Ticket, DeliveryOrderPlan, BayMaster } from '@/types';
import { formatTime12, formatDuration, sampleBays } from '@/store/appStore';
import { cn } from '@/utils/cn';
import {
  Scale, ArrowUpFromLine, CheckCircle2, Clock, Truck, Layers,
  Check, AlertTriangle, ArrowRight, UserCheck, Package,
  RotateCcw, MapPin, Search
} from 'lucide-react';

interface WeighOutPageProps {
  tickets?: Ticket[];
  deliveryOrders?: DeliveryOrderPlan[];
  bays?: BayMaster[];
  onComplete?: (ticketId: number, tareWeight: number) => void;
  onUpdateDeliveryOrder?: (order: DeliveryOrderPlan) => void;
  onNavigateToChecking?: (deliveryOrderId: number) => void;
}

export function WeighOutPage({
  tickets: _tickets = [],
  deliveryOrders = [],
  bays = sampleBays,
  onComplete: _onComplete,
  onUpdateDeliveryOrder,
  onNavigateToChecking,
}: WeighOutPageProps) {
  const availableBays = bays && bays.length > 0 ? bays : sampleBays;

  // Active delivery orders
  const activeDOs = deliveryOrders.filter(d => d.status !== 'exited');

  // Requirement 12: Select from a list of vehicle number or D.O number
  const [selectedDOId, setSelectedDOId] = useState<number | null>(() => {
    return activeDOs[0]?.id || null;
  });
  const [searchFilter, setSearchFilter] = useState('');

  const currentDO = deliveryOrders.find(d => d.id === selectedDOId);

  // Requirement 13: Select each bay and item being unloaded
  const [selectedBayNumber, setSelectedBayNumber] = useState<number>(() => {
    return currentDO?.items[0]?.bayNumber || availableBays[0]?.bayNumber || 1;
  });

  const activeBayMaster = availableBays.find(b => b.bayNumber === selectedBayNumber) || availableBays[0];

  const [selectedItemName, setSelectedItemName] = useState<string>(() => {
    return activeBayMaster?.items[0] || 'Scrap Steel';
  });

  useEffect(() => {
    if (currentDO && currentDO.items.length > 0) {
      const firstBay = currentDO.items[0].bayNumber;
      setSelectedBayNumber(firstBay);
      const bayData = availableBays.find(b => b.bayNumber === firstBay);
      setSelectedItemName(currentDO.items[0].itemName || bayData?.items[0] || 'Scrap Steel');
    }
  }, [currentDO?.id]);

  const handleSelectBay = (bayNum: number) => {
    setSelectedBayNumber(bayNum);
    const bayData = availableBays.find(b => b.bayNumber === bayNum);
    if (bayData && bayData.items.length > 0) {
      const plannedForThisBay = currentDO?.items.find(i => i.bayNumber === bayNum);
      setSelectedItemName(plannedForThisBay?.itemName || bayData.items[0]);
    }
  };

  // Weight capture via weighing scale or manual entry mode
  const [captureMode, setCaptureMode] = useState<'scale' | 'manual'>('scale');
  const [liveScaleWeight, setLiveScaleWeight] = useState(4500);
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);
  const [manualWeightInput, setManualWeightInput] = useState<string>('4500');

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveScaleWeight(prev => Math.round(prev + (Math.random() - 0.5) * 15));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleCaptureFromScale = useCallback(() => {
    setCapturedWeight(liveScaleWeight);
    setManualWeightInput(liveScaleWeight.toString());
    handleRecordItemWeight(liveScaleWeight);
  }, [liveScaleWeight, currentDO, selectedBayNumber, selectedItemName, activeBayMaster]);

  const handleManualWeightChange = (val: string) => {
    setManualWeightInput(val);
    const num = Number(val);
    if (!isNaN(num) && num >= 0) {
      setCapturedWeight(num);
    }
  };

  // Requirement 12: Automated Bay Entry & Exit Time for Unloading Activity
  const [isInsideBay, setIsInsideBay] = useState(false);
  const [bayEntryTime, setBayEntryTime] = useState<string>('');
  const [bayDurationSecs, setBayDurationSecs] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isInsideBay) {
      timer = setInterval(() => {
        setBayDurationSecs(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isInsideBay]);

  const handleRecordBayEntry = () => {
    const entryNow = formatTime12();
    setBayEntryTime(entryNow);
    setBayDurationSecs(0);
    setIsInsideBay(true);
  };

  const handleRecordItemWeight = (weightOverride?: number) => {
    if (!currentDO) return;
    const finalWeight = weightOverride ?? capturedWeight ?? Number(manualWeightInput) ?? 5000;

    const updatedItems = currentDO.items.map(item => {
      if (item.bayNumber === selectedBayNumber && item.itemName === selectedItemName) {
        return {
          ...item,
          actualLoadedWeightKg: finalWeight,
          pendingWeightKg: 0,
          notes: `Unloaded at ${activeBayMaster?.bayName}`,
        };
      }
      return item;
    });

    const updatedDO: DeliveryOrderPlan = {
      ...currentDO,
      items: updatedItems,
      status: 'in_progress',
    };

    onUpdateDeliveryOrder?.(updatedDO);
    alert(`✓ Weight recorded. Offloaded ${finalWeight.toLocaleString()} kg of ${selectedItemName}.`);
  };

  const handleRecordBayExit = () => {
    if (!currentDO) return;
    const exitNow = formatTime12();

    const updatedDO: DeliveryOrderPlan = {
      ...currentDO,
      currentLocation: `Departed ${activeBayMaster?.bayName} at ${exitNow}`,
    };

    onUpdateDeliveryOrder?.(updatedDO);
    setIsInsideBay(false);
    alert(`✓ Bay exit recorded at ${exitNow}.`);
  };

  // Requirement 14 & 15 & Pre-Final Check
  const [preFinalCheck, setPreFinalCheck] = useState(false);
  const [finishUnloadingChecked, setFinishUnloadingChecked] = useState(false);
  const [unloadingCompletedSuccess, setUnloadingCompletedSuccess] = useState(false);

  const handleCompleteFinishUnloading = () => {
    if (!currentDO) return;
    if (!preFinalCheck) {
      alert('Please complete the pre-final check first.');
      return;
    }
    if (!finishUnloadingChecked) {
      alert('Please check the "Finish Unloading" checkbox to confirm completion of all tasks.');
      return;
    }

    const updatedDO: DeliveryOrderPlan = {
      ...currentDO,
      status: 'awaiting_check',
      checkingStatus: 'pending',
      currentLocation: 'At Checking Area',
    };

    onUpdateDeliveryOrder?.(updatedDO);
    setUnloadingCompletedSuccess(true);
  };

  const filteredDOs = activeDOs.filter(d => {
    const q = searchFilter.toLowerCase();
    return (
      d.vehicleNumber.toLowerCase().includes(q) ||
      d.doNumber.toLowerCase().includes(q) ||
      d.customerName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ArrowUpFromLine className="w-6 h-6 text-purple-600" />
              Unloading Operations
            </h2>
            <span className="text-xs bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded-full">
              Bay Unloading Activity
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Select vehicle/D.O, capture weight via scale or manual mode, track bay entry/exit times, and mark unloading finish (Requirements 12, 13, 14, 15).
          </p>
        </div>

        {currentDO && (
          <div className="flex items-center gap-2 font-mono text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
            <span className="text-slate-400">Tolerance:</span>
            <span className="font-bold text-amber-700">±{currentDO.weightToleranceKg ?? 50} kg</span>
          </div>
        )}
      </div>

      {unloadingCompletedSuccess && (
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-purple-800 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
            <span>
              ✓ Unloading finished for D.O {currentDO?.doNumber}! The vehicle has been transferred to the <strong>Checking Section</strong>.
            </span>
          </div>
          {onNavigateToChecking && currentDO && (
            <button
              type="button"
              onClick={() => onNavigateToChecking(currentDO.id)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              Go to Checking Section →
            </button>
          )}
        </div>
      )}

      {/* ── Main Two-Column Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Requirement 12: Left Column - Vehicle or D.O Selection List (4 cols) */}
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
                  if (id) {
                    setSelectedDOId(id);
                    setUnloadingCompletedSuccess(false);
                    setFinishUnloadingChecked(false);
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">-- Select D.O Number --</option>
                {activeDOs.map(d => (
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
                  if (id) {
                    setSelectedDOId(id);
                    setUnloadingCompletedSuccess(false);
                    setFinishUnloadingChecked(false);
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
              >
                <option value="">-- Select Vehicle Number --</option>
                {activeDOs.map(d => (
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
              placeholder="Search by Vehicle No or D.O No..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-500 outline-none"
            />
          </div>

          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {filteredDOs.length === 0 ? (
              <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No active unloading orders found.
              </div>
            ) : (
              filteredDOs.map(d => {
                const isSelected = d.id === selectedDOId;
                const itemsCount = d.items.length;
                const unloadedCount = d.items.filter(i => (i.actualLoadedWeightKg || 0) > 0).length;

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDOId(d.id);
                      setUnloadingCompletedSuccess(false);
                      setFinishUnloadingChecked(false);
                    }}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'bg-purple-50/90 border-purple-500 shadow-md ring-2 ring-purple-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                        {d.vehicleNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800 border border-purple-200">
                        {unloadedCount}/{itemsCount} Unloaded
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono text-purple-700 font-semibold">{d.doNumber}</span>
                      <span className="font-mono">Planned: {d.totalPlannedWeightKg.toLocaleString()} kg</span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium truncate mt-1">{d.customerName}</p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      Driver: {d.driverName} | Supervisor: {d.supervisorName}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Unloading Activity Details (8 cols) */}
        <div className="lg:col-span-8">
          {currentDO ? (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-6">
              {/* Selected Order Summary Card */}
              <div className="p-4 bg-gradient-to-r from-purple-50/50 via-slate-50 to-indigo-50/40 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded">
                      {currentDO.doNumber}
                    </span>
                    <span className="text-xs text-slate-500">Slip #{currentDO.slipNo}</span>
                  </div>
                  <h3 className="text-xl font-black text-slate-900 font-mono uppercase flex items-center gap-2">
                    <Truck className="w-5 h-5 text-purple-600" />
                    {currentDO.vehicleNumber}
                    <span className="text-sm font-sans font-normal text-slate-500 normal-case">
                      ({currentDO.customerName})
                    </span>
                  </h3>
                </div>

                <div className="text-right text-xs">
                  <p className="text-slate-500">Location:</p>
                  <p className="font-bold text-purple-700 text-sm mt-0.5">{currentDO.currentLocation}</p>
                  <p className="text-[11px] text-slate-400">Supervisor: {currentDO.supervisorName}</p>
                </div>
              </div>

              {/* Requirement 13: Select Bay & Item for Unloading based on Bay Master */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Bay & Item Selection (Unloading Master)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Select Bay */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Unloading Bay *
                    </label>
                    <select
                      value={selectedBayNumber}
                      onChange={e => handleSelectBay(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      {availableBays.map(b => (
                        <option key={b.id} value={b.bayNumber}>
                          Bay #{b.bayNumber}: {b.bayName}
                        </option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                      <UserCheck className="w-3.5 h-3.5 text-purple-600" />
                      <span>Handler Assigned: <strong>{activeBayMaster?.handlerName}</strong></span>
                    </div>
                  </div>

                  {/* Select Item */}
                  <div>
                    <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">
                      Item Being Discharged / Unloaded *
                    </label>
                    <select
                      value={selectedItemName}
                      onChange={e => setSelectedItemName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      {activeBayMaster?.items.map((item, idx) => (
                        <option key={idx} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Select item designated for offloading at Bay #{activeBayMaster?.bayNumber}.
                    </p>
                  </div>
                </div>
              </div>

              {/* Requirement 12: Automated Bay Entry & Exit Time for Unloading */}
              <div className="p-4 bg-gradient-to-r from-purple-50/50 to-indigo-50/40 border border-purple-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-purple-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600" />
                    Automated Bay Entry & Exit Time (Unloading Activity)
                  </h4>
                  {isInsideBay && (
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-mono font-bold text-xs flex items-center gap-1 border border-purple-300">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
                      Inside Bay: {formatDuration(bayDurationSecs)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {!isInsideBay ? (
                    <button
                      type="button"
                      onClick={handleRecordBayEntry}
                      className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Clock className="w-4 h-4" />
                      Record Entry into {activeBayMaster?.bayName}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white border border-purple-200 rounded-lg text-xs">
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Bay Entry Time</span>
                        <span className="font-mono font-bold text-purple-900">{bayEntryTime}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleRecordBayExit}
                        className="px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition flex items-center gap-2 shadow-xs"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Exit Bay
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Weight Capture via Weighing Scale or Manual Entry Mode */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-purple-600" />
                    Weight Capture Mode (Scale vs Manual)
                  </h4>

                  <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCaptureMode('scale')}
                      className={cn(
                        'px-3 py-1 rounded-md transition',
                        captureMode === 'scale' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      Weighing Scale
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptureMode('manual')}
                      className={cn(
                        'px-3 py-1 rounded-md transition',
                        captureMode === 'manual' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                          Scale Port COM3 (Live Weight)
                        </span>
                        <p className="text-3xl font-mono font-black text-purple-400 mt-1">
                          {liveScaleWeight.toLocaleString()} <span className="text-sm text-slate-400 font-normal">kg</span>
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs font-bold">
                        STABLE
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCaptureFromScale}
                      className="h-full py-4 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-purple-600/20"
                    >
                      <Scale className="w-5 h-5" />
                      Capture Weight from Scale ({liveScaleWeight.toLocaleString()} kg)
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-2">
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Manual Discharged Weight Entry (kg) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        step="10"
                        placeholder="Enter weight offloaded..."
                        value={manualWeightInput}
                        onChange={e => handleManualWeightChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-purple-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleManualWeightChange('12000')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        +12,000 kg
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRecordItemWeight()}
                      className="w-full mt-2 py-3 px-6 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
                    >
                      <Scale className="w-5 h-5" />
                      Record Manual Weight
                    </button>
                  </div>
                )}
              </div>

              {/* Items & Unloaded Records Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  D.O Items & Unloaded Weights Progress
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Bay #</th>
                        <th className="py-2.5 px-3">Bay Name</th>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3 text-right">Planned (kg)</th>
                        <th className="py-2.5 px-3 text-right">Actual Unloaded (kg)</th>
                        <th className="py-2.5 px-3">Unloading Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentDO.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-purple-700">#{item.bayNumber}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{item.bayName}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{item.itemName}</td>
                          <td className="py-2 px-3 font-mono text-slate-600 text-right">{item.plannedWeightKg.toLocaleString()} kg</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">
                            {(item.actualLoadedWeightKg || 0) > 0 ? (
                              <span className="text-purple-700">{item.actualLoadedWeightKg?.toLocaleString()} kg</span>
                            ) : (
                              <span className="text-slate-400 italic">0 kg</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {(item.actualLoadedWeightKg || 0) > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">
                                ✓ Unloaded
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                                Pending
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Requirement 14 & 15: Finish Unloading Checkbox & Dispatch to Checking Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="preFinalCheckbox"
                    checked={preFinalCheck}
                    onChange={e => setPreFinalCheck(e.target.checked)}
                    className="w-5 h-5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="preFinalCheckbox" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Pre-final Check — Verify all unloading items are complete for D.O {currentDO.doNumber}
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="finishUnloadingCheckbox"
                    checked={finishUnloadingChecked}
                    onChange={e => setFinishUnloadingChecked(e.target.checked)}
                    disabled={!preFinalCheck}
                    className="w-5 h-5 text-purple-600 rounded border-slate-300 focus:ring-purple-500 cursor-pointer disabled:opacity-40"
                  />
                  <label htmlFor="finishUnloadingCheckbox" className={cn("text-xs font-bold cursor-pointer", preFinalCheck ? "text-slate-800" : "text-slate-400")}>
                    Finish Unloading — Mark completion of all tasks for D.O {currentDO.doNumber}
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 pl-8">
                  Once unloading is marked finished, the vehicle and Delivery Order will transition to the <strong>Checking Section</strong> for item and quantity verification (Requirement 15).
                </p>

                <div className="pt-1 pl-8">
                  <button
                    type="button"
                    onClick={handleCompleteFinishUnloading}
                    disabled={!finishUnloadingChecked || !preFinalCheck}
                    className="py-3 px-6 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-purple-700/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Submit & Send to Checking Section
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Please select a vehicle or D.O from the list to begin unloading operations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
