/**
 * ============================================================================
 * LOADING OPERATIONS PAGE
 * ============================================================================
 * Fulfills Requirements 9, 10, 11, 14, 15 from Changes required.txt:
 * - Line 9: "In 'Loading' page the user should be able to capture weight
 *           via weighing scale or manual entry mode also."
 * - Line 10: "This page should allow the user to select from a list of
 *            vehicle number or D.O number for the loading activity."
 * - Line 11: "This page should allow the user to select bay and the item
 *            being loaded based on data from bay master table. Time on entry
 *            into and exit from each bay after loading activity should be
 *            captured automatically."
 * - Line 14: "Both on 'Loading' page and 'Unloading' page the 'Finish Loading'
 *            / 'Finish Unloading' checkbox should be visible for the user to
 *            mark the completion of all tasks for a given D.O"
 * - Line 15: "Once loading or unloading activity is marked as finished then
 *            it has to go the checking section."
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type {
  Product, Customer, Supplier, Vehicle, Ticket,
  DeliveryOrderPlan, BayMaster
} from '@/types';
import { formatTime12, formatDuration, formatNow, sampleBays } from '@/store/appStore';
import { cn } from '@/utils/cn';
import {
  Scale, ArrowDownToLine, CheckCircle2, Clock, Truck, Layers,
  Check, AlertTriangle, ArrowRight, UserCheck, Package,
  RotateCcw, MapPin, Search, Plus, CheckSquare, Square
} from 'lucide-react';

interface WeighInPageProps {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  vehicles: Vehicle[];
  deliveryOrders?: DeliveryOrderPlan[];
  bays?: BayMaster[];
  operatorId: number;
  operatorName: string;
  onSave?: (ticket: Ticket) => void;
  onUpdateDeliveryOrder?: (order: DeliveryOrderPlan) => void;
  onNavigateToChecking?: (deliveryOrderId: number) => void;
}

export function WeighInPage({
  products: _products,
  customers: _customers,
  suppliers: _suppliers,
  vehicles: _vehicles,
  deliveryOrders = [],
  bays = sampleBays,
  operatorId: _operatorId,
  operatorName: _operatorName,
  onSave: _onSave,
  onUpdateDeliveryOrder,
  onNavigateToChecking,
}: WeighInPageProps) {
  const availableBays = bays && bays.length > 0 ? bays : sampleBays;

  // Filter DOs for loading operations (not exited)
  const activeDOs = deliveryOrders.filter(d => d.status !== 'exited');

  // Requirement 10: Select from list of vehicle number or D.O number
  const [selectedDOId, setSelectedDOId] = useState<number | null>(() => {
    return activeDOs[0]?.id || null;
  });
  const [searchFilter, setSearchFilter] = useState('');

  const currentDO = deliveryOrders.find(d => d.id === selectedDOId);

  // Derive unique bays associated with the selected D.O
  const doBays = useMemo(() => {
    if (!currentDO || !currentDO.items || currentDO.items.length === 0) return [];
    const map = new Map<number, { bayNumber: number; bayName: string; handlerName: string }>();
    for (const item of currentDO.items) {
      if (!map.has(item.bayNumber)) {
        map.set(item.bayNumber, {
          bayNumber: item.bayNumber,
          bayName: item.bayName || `Bay #${item.bayNumber}`,
          handlerName: item.handlerName || '',
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.bayNumber - b.bayNumber);
  }, [currentDO]);

  // Check if all items in a particular bay for current D.O are loaded
  const isBayComplete = useCallback((bayNum: number) => {
    if (!currentDO || !currentDO.items || currentDO.items.length === 0) return false;
    const itemsInBay = currentDO.items.filter(i => i.bayNumber === bayNum);
    return itemsInBay.length > 0 && itemsInBay.every(i => (i.actualLoadedWeightKg || 0) > 0);
  }, [currentDO]);

  // Requirement 11: Select bay and item being loaded based on D.O plan
  const [selectedBayNumber, setSelectedBayNumber] = useState<number>(() => {
    return currentDO?.items[0]?.bayNumber || doBays[0]?.bayNumber || availableBays[0]?.bayNumber || 1;
  });

  // Items associated with the selected Bay for this D.O
  const doBayItems = useMemo(() => {
    if (!currentDO || !currentDO.items) return [];
    return currentDO.items.filter(i => i.bayNumber === selectedBayNumber);
  }, [currentDO, selectedBayNumber]);

  const activeBayMaster = availableBays.find(b => b.bayNumber === selectedBayNumber) || {
    id: selectedBayNumber,
    bayNumber: selectedBayNumber,
    bayName: doBays.find(b => b.bayNumber === selectedBayNumber)?.bayName || `Bay #${selectedBayNumber}`,
    items: doBayItems.map(i => i.itemName),
    handlerName: doBayItems[0]?.handlerName || 'Assigned Handler',
    isActive: true,
  };

  const [selectedItemName, setSelectedItemName] = useState<string>(() => {
    return doBayItems[0]?.itemName || currentDO?.items[0]?.itemName || 'River Sand';
  });

  // When selected DO changes, synchronize bay & item selection to remaining items
  useEffect(() => {
    if (currentDO && currentDO.items.length > 0) {
      // Find first incomplete bay or fallback to first bay
      const firstIncompleteBay = currentDO.items.find(i => !((i.actualLoadedWeightKg || 0) > 0))?.bayNumber;
      const targetBay = firstIncompleteBay ?? currentDO.items[0].bayNumber;
      setSelectedBayNumber(targetBay);

      const itemsInTargetBay = currentDO.items.filter(i => i.bayNumber === targetBay);
      const firstIncompleteItem = itemsInTargetBay.find(i => !((i.actualLoadedWeightKg || 0) > 0))?.itemName;
      setSelectedItemName(firstIncompleteItem || itemsInTargetBay[0]?.itemName || '');
    }
  }, [currentDO?.id]);

  // When bay changes, pick first incomplete item for that bay if possible
  const handleSelectBay = (bayNum: number) => {
    setSelectedBayNumber(bayNum);
    if (currentDO && currentDO.items.length > 0) {
      const itemsInThisBay = currentDO.items.filter(i => i.bayNumber === bayNum);
      if (itemsInThisBay.length > 0) {
        const firstIncomplete = itemsInThisBay.find(i => !((i.actualLoadedWeightKg || 0) > 0));
        setSelectedItemName(firstIncomplete?.itemName || itemsInThisBay[0]?.itemName || '');
      }
    }
  };

  // Requirement 9: Capture weight via weighing scale or manual entry mode
  const [captureMode, setCaptureMode] = useState<'scale' | 'manual'>('scale');
  const [liveScaleWeight, setLiveScaleWeight] = useState(6500);
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);
  const [manualWeightInput, setManualWeightInput] = useState<string>('6500');

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

  // Requirement 11: Automated Entry & Exit Time in each Bay
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

  // Record Bay Entry
  const handleRecordBayEntry = () => {
    const entryNow = formatTime12();
    setBayEntryTime(entryNow);
    setBayDurationSecs(0);
    setIsInsideBay(true);
  };

  // Record Item Weight
  const handleRecordItemWeight = (weightOverride?: number) => {
    if (!currentDO) return;
    const finalWeight = weightOverride ?? capturedWeight ?? Number(manualWeightInput) ?? 5000;

    // Update the item in D.O plan
    const updatedItems = currentDO.items.map(item => {
      if (item.bayNumber === selectedBayNumber && item.itemName === selectedItemName) {
        return {
          ...item,
          actualLoadedWeightKg: finalWeight,
          pendingWeightKg: Math.max(0, item.plannedWeightKg - finalWeight),
          notes: `Loaded at ${activeBayMaster?.bayName}`,
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
    alert(`✓ Weight recorded. Loaded ${finalWeight.toLocaleString()} kg of ${selectedItemName}.`);
  };

  // Record Bay Exit
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
  const [finishLoadingChecked, setFinishLoadingChecked] = useState(false);
  const [loadingCompletedSuccess, setLoadingCompletedSuccess] = useState(false);

  const handleCompleteFinishLoading = () => {
    if (!currentDO) return;
    if (!preFinalCheck) {
      alert('Please complete the pre-final check first.');
      return;
    }
    if (!finishLoadingChecked) {
      alert('Please check the "Finish Loading" checkbox to confirm completion of all tasks.');
      return;
    }

    const updatedDO: DeliveryOrderPlan = {
      ...currentDO,
      status: 'awaiting_check',
      checkingStatus: 'pending',
      currentLocation: 'At Checking Area',
    };

    onUpdateDeliveryOrder?.(updatedDO);
    setLoadingCompletedSuccess(true);
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
              <ArrowDownToLine className="w-6 h-6 text-emerald-600" />
              Loading Operations
            </h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Bay Loading Activity
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Select vehicle/D.O, capture weight via scale or manual mode, track bay entry/exit times, and mark loading finish (Requirements 9, 10, 11, 14, 15).
          </p>
        </div>

        {currentDO && (
          <div className="flex items-center gap-2 font-mono text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs">
            <span className="text-slate-400">Tolerance:</span>
            <span className="font-bold text-amber-700">±{currentDO.weightToleranceKg ?? 50} kg</span>
          </div>
        )}
      </div>

      {loadingCompletedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>
              ✓ Loading finished for D.O {currentDO?.doNumber}! The vehicle has been transferred to the <strong>Checking Section</strong>.
            </span>
          </div>
          {onNavigateToChecking && currentDO && (
            <button
              type="button"
              onClick={() => onNavigateToChecking(currentDO.id)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-sm"
            >
              Go to Checking Section →
            </button>
          )}
        </div>
      )}

      {/* ── Main Two-Column Layout ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Requirement 10: Left Column - Vehicle or D.O Selection (4 cols) */}
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
                    setLoadingCompletedSuccess(false);
                    setFinishLoadingChecked(false);
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
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
                    setLoadingCompletedSuccess(false);
                    setFinishLoadingChecked(false);
                  }
                }}
                className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold uppercase text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
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

          {/* Search Box */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Or search by Vehicle / D.O / Customer..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
            />
          </div>

          <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
            {filteredDOs.length === 0 ? (
              <div className="p-6 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                No active loading orders found.
              </div>
            ) : (
              filteredDOs.map(d => {
                const isSelected = d.id === selectedDOId;
                const itemsCount = d.items.length;
                const loadedCount = d.items.filter(i => (i.actualLoadedWeightKg || 0) > 0).length;

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setSelectedDOId(d.id);
                      setLoadingCompletedSuccess(false);
                      setFinishLoadingChecked(false);
                    }}
                    className={cn(
                      'w-full p-3 rounded-xl border text-left transition-all',
                      isSelected
                        ? 'bg-emerald-50/90 border-emerald-500 shadow-md ring-2 ring-emerald-400/30'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 shadow-xs'
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-mono text-xs font-bold text-slate-900 uppercase">
                        {d.vehicleNumber}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                        {loadedCount}/{itemsCount} Loaded
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-mono text-emerald-700 font-semibold">{d.doNumber}</span>
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

        {/* Right Column: Loading Activity Details (8 cols) */}
        <div className="lg:col-span-8">
          {currentDO ? (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-6">
              {/* Selected Order Summary Card */}
              <div className="p-4 bg-gradient-to-r from-emerald-50/50 via-slate-50 to-blue-50/40 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {currentDO.doNumber}
                    </span>
                    <span className="text-xs text-slate-500">Slip #{currentDO.slipNo}</span>
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
                  <p className="text-slate-500">Location:</p>
                  <p className="font-bold text-blue-700 text-sm mt-0.5">{currentDO.currentLocation}</p>
                  <p className="text-[11px] text-slate-400">Supervisor: {currentDO.supervisorName}</p>
                </div>
              </div>

              {/* Requirement 11 & Updated Requirements: Select Bay & Item associated with D.O only */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-600" />
                    Bays & Items for D.O {currentDO.doNumber}
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-500">
                    {doBays.filter(b => isBayComplete(b.bayNumber)).length}/{doBays.length} Bays Completed
                  </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  {/* Select Bay Column */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                        Loading Bay (Associated with D.O) *
                      </label>
                      <select
                        value={selectedBayNumber}
                        onChange={e => handleSelectBay(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {doBays.length === 0 ? (
                          <option value="">No bays assigned for this D.O</option>
                        ) : (
                          doBays.map(b => {
                            const complete = isBayComplete(b.bayNumber);
                            return (
                              <option key={b.bayNumber} value={b.bayNumber}>
                                Bay #{b.bayNumber}: {b.bayName} {complete ? '— [✓ Complete]' : '— [Pending]'}
                              </option>
                            );
                          })
                        )}
                      </select>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                        <span>Handler Assigned: <strong>{activeBayMaster?.handlerName || 'Assigned Handler'}</strong></span>
                      </div>
                    </div>

                    {/* Associated Bays List & Remaining/Completion Status below Bay Dropdown */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase">
                        <span>Bays for this D.O</span>
                        <span>Status</span>
                      </div>

                      <div className="space-y-2">
                        {doBays.map(bay => {
                          const complete = isBayComplete(bay.bayNumber);
                          const itemsInBay = currentDO.items.filter(i => i.bayNumber === bay.bayNumber);
                          const isSelected = selectedBayNumber === bay.bayNumber;
                          const remainingItems = itemsInBay.filter(i => !((i.actualLoadedWeightKg || 0) > 0));

                          return (
                            <div
                              key={bay.bayNumber}
                              onClick={() => handleSelectBay(bay.bayNumber)}
                              className={cn(
                                'p-2.5 rounded-lg border text-left cursor-pointer transition-all',
                                isSelected
                                  ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-300'
                                  : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                  <span className="font-bold text-xs text-slate-900">
                                    Bay #{bay.bayNumber}: {bay.bayName}
                                  </span>
                                  <p className="text-[10px] text-slate-500">
                                    {itemsInBay.length} planned item{itemsInBay.length > 1 ? 's' : ''} • Handler: {bay.handlerName || 'Assigned Handler'}
                                  </p>
                                </div>
                                {isSelected && (
                                  <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">
                                    Selected
                                  </span>
                                )}
                              </div>

                              {/* Bay Completion indicator with checkbox with tick below the bay */}
                              <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                                {complete ? (
                                  <label className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={true}
                                      readOnly
                                      className="w-3.5 h-3.5 text-emerald-600 rounded accent-emerald-600 cursor-pointer"
                                    />
                                    <span>Complete (All items loaded) ✓</span>
                                  </label>
                                ) : (
                                  <label className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={false}
                                      readOnly
                                      className="w-3.5 h-3.5 text-slate-300 rounded cursor-pointer"
                                    />
                                    <span>Remaining to load ({remainingItems.length} item{remainingItems.length > 1 ? 's' : ''})</span>
                                  </label>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Remaining Bays Quick Helper */}
                      {doBays.some(b => !isBayComplete(b.bayNumber)) ? (
                        <div className="p-2 bg-amber-50/80 border border-amber-200 rounded-lg text-[11px] text-amber-900">
                          <span className="font-bold">Bays remaining to load: </span>
                          <span className="font-medium">
                            {doBays
                              .filter(b => !isBayComplete(b.bayNumber))
                              .map(b => `Bay #${b.bayNumber} (${b.bayName})`)
                              .join(', ')}
                          </span>
                        </div>
                      ) : (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 font-bold flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>All bays completed for D.O {currentDO.doNumber}!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Select Item Column */}
                  <div className="space-y-3">
                    <div>
                      <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">
                        Item to be Loaded in Bay #{selectedBayNumber} *
                      </label>
                      <select
                        value={selectedItemName}
                        onChange={e => setSelectedItemName(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {doBayItems.length === 0 ? (
                          <option value="">No items planned for this Bay in D.O</option>
                        ) : (
                          doBayItems.map((item, idx) => {
                            const isLoaded = (item.actualLoadedWeightKg || 0) > 0;
                            return (
                              <option key={idx} value={item.itemName}>
                                {item.itemName} — {item.plannedWeightKg.toLocaleString()} kg {isLoaded ? '(✓ Loaded)' : '(Pending)'}
                              </option>
                            );
                          })
                        )}
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Showing only items planned for Bay #{selectedBayNumber} in D.O {currentDO.doNumber}.
                      </p>
                    </div>

                    {/* Associated Items List & Remaining Status below Item Dropdown */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-600 uppercase">
                        <span>Items in Bay #{selectedBayNumber}</span>
                        <span>Load Status</span>
                      </div>

                      <div className="space-y-2">
                        {doBayItems.length === 0 ? (
                          <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-400 text-center">
                            No planned items found for Bay #{selectedBayNumber}.
                          </div>
                        ) : (
                          doBayItems.map((item, idx) => {
                            const isLoaded = (item.actualLoadedWeightKg || 0) > 0;
                            const isSelected = selectedItemName === item.itemName;

                            return (
                              <div
                                key={idx}
                                onClick={() => setSelectedItemName(item.itemName)}
                                className={cn(
                                  'p-2.5 rounded-lg border text-left cursor-pointer transition-all',
                                  isSelected
                                    ? 'bg-emerald-50/80 border-emerald-400 ring-1 ring-emerald-300'
                                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                                )}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="min-w-0">
                                    <span className="font-bold text-xs text-slate-900">
                                      {item.itemName}
                                    </span>
                                    <p className="text-[10px] font-mono text-slate-500">
                                      Planned: {item.plannedWeightKg.toLocaleString()} kg
                                    </p>
                                  </div>
                                  {isSelected && (
                                    <span className="text-[10px] bg-emerald-600 text-white font-bold px-1.5 py-0.5 rounded">
                                      Selected
                                    </span>
                                  )}
                                </div>

                                <div className="mt-2 pt-1.5 border-t border-slate-100 flex items-center justify-between">
                                  {isLoaded ? (
                                    <label className="inline-flex items-center gap-1.5 text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2 py-0.5 rounded text-[11px] font-bold cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={true}
                                        readOnly
                                        className="w-3.5 h-3.5 text-emerald-600 rounded accent-emerald-600 cursor-pointer"
                                      />
                                      <span>Loaded: {item.actualLoadedWeightKg?.toLocaleString()} kg ✓</span>
                                    </label>
                                  ) : (
                                    <label className="inline-flex items-center gap-1.5 text-amber-800 bg-amber-100/70 border border-amber-300 px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={false}
                                        readOnly
                                        className="w-3.5 h-3.5 text-slate-300 rounded cursor-pointer"
                                      />
                                      <span>Remaining to load: {item.plannedWeightKg.toLocaleString()} kg</span>
                                    </label>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Items Remaining in this Bay or other Bays */}
                      {currentDO.items.some(i => !((i.actualLoadedWeightKg || 0) > 0)) ? (
                        <div className="p-2 bg-blue-50/80 border border-blue-200 rounded-lg text-[11px] text-blue-900">
                          <span className="font-bold">Total remaining items for D.O: </span>
                          <span className="font-medium">
                            {currentDO.items
                              .filter(i => !((i.actualLoadedWeightKg || 0) > 0))
                              .map(i => `${i.itemName} in Bay #${i.bayNumber} (${i.plannedWeightKg.toLocaleString()} kg)`)
                              .join(', ')}
                          </span>
                        </div>
                      ) : (
                        <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] text-emerald-900 font-bold flex items-center gap-1.5">
                          <Check className="w-4 h-4 text-emerald-600" />
                          <span>All items loaded for D.O {currentDO.doNumber}!</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Requirement 11: Automated Entry into and Exit from each Bay */}
              <div className="p-4 bg-gradient-to-r from-blue-50/50 to-indigo-50/40 border border-blue-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600" />
                    Automated Bay Entry & Exit Time Tracking
                  </h4>
                  {isInsideBay && (
                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-mono font-bold text-xs flex items-center gap-1 border border-amber-300">
                      <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      Inside Bay: {formatDuration(bayDurationSecs)}
                    </span>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  {!isInsideBay ? (
                    <button
                      type="button"
                      onClick={handleRecordBayEntry}
                      className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition flex items-center justify-center gap-2 shadow-xs"
                    >
                      <Clock className="w-4 h-4" />
                      Record Entry into {activeBayMaster?.bayName}
                    </button>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white border border-blue-200 rounded-lg text-xs">
                        <span className="text-[10px] uppercase text-slate-400 block font-bold">Bay Entry Time</span>
                        <span className="font-mono font-bold text-blue-900">{bayEntryTime}</span>
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

              {/* Requirement 9: Weight Capture via Weighing Scale or Manual Entry Mode */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-emerald-600" />
                    Weight Capture Mode (Scale vs Manual)
                  </h4>

                  {/* Mode Toggle */}
                  <div className="flex bg-slate-200 p-0.5 rounded-lg text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setCaptureMode('scale')}
                      className={cn(
                        'px-3 py-1 rounded-md transition',
                        captureMode === 'scale' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                      )}
                    >
                      Weighing Scale
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptureMode('manual')}
                      className={cn(
                        'px-3 py-1 rounded-md transition',
                        captureMode === 'manual' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
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
                        <p className="text-3xl font-mono font-black text-emerald-400 mt-1">
                          {liveScaleWeight.toLocaleString()} <span className="text-sm text-slate-400 font-normal">kg</span>
                        </p>
                      </div>
                      <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-bold">
                        STABLE
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={handleCaptureFromScale}
                      className="h-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                    >
                      <Scale className="w-5 h-5" />
                      Capture Weight from Scale ({liveScaleWeight.toLocaleString()} kg)
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-white border border-slate-300 rounded-xl space-y-2">
                    <label className="block text-xs font-bold uppercase text-slate-600">
                      Manual Loaded Weight Entry (kg) *
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        step="10"
                        placeholder="Enter weight loaded..."
                        value={manualWeightInput}
                        onChange={e => handleManualWeightChange(e.target.value)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg font-mono text-base font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleManualWeightChange('8500')}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold"
                      >
                        +8,500 kg
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRecordItemWeight()}
                      className="w-full mt-2 py-3 px-6 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition flex items-center justify-center gap-2 shadow-md"
                    >
                      <Scale className="w-5 h-5" />
                      Record Manual Weight
                    </button>
                  </div>
                )}
              </div>

              {/* Items & Loaded Records Table */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  D.O Items & Loaded Weights Progress
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3">Bay #</th>
                        <th className="py-2.5 px-3">Bay Name</th>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3 text-right">Planned (kg)</th>
                        <th className="py-2.5 px-3 text-right">Actual Loaded (kg)</th>
                        <th className="py-2.5 px-3">Loading Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {currentDO.items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono font-bold text-emerald-700">#{item.bayNumber}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{item.bayName}</td>
                          <td className="py-2 px-3 font-semibold text-slate-900">{item.itemName}</td>
                          <td className="py-2 px-3 font-mono text-slate-600 text-right">{item.plannedWeightKg.toLocaleString()} kg</td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-900 text-right">
                            {(item.actualLoadedWeightKg || 0) > 0 ? (
                              <span className="text-emerald-700">{item.actualLoadedWeightKg?.toLocaleString()} kg</span>
                            ) : (
                              <span className="text-slate-400 italic">0 kg</span>
                            )}
                          </td>
                          <td className="py-2 px-3">
                            {(item.actualLoadedWeightKg || 0) > 0 ? (
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                                ✓ Loaded
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

              {/* Requirement 14 & 15: Finish Loading Checkbox & Dispatch to Checking Section */}
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
                    Pre-final Check — Verify all loading items are complete for D.O {currentDO.doNumber}
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="finishLoadingCheckbox"
                    checked={finishLoadingChecked}
                    onChange={e => setFinishLoadingChecked(e.target.checked)}
                    disabled={!preFinalCheck}
                    className="w-5 h-5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:opacity-40"
                  />
                  <label htmlFor="finishLoadingCheckbox" className={cn("text-xs font-bold cursor-pointer", preFinalCheck ? "text-slate-800" : "text-slate-400")}>
                    Finish Loading — Mark completion of all loading tasks for D.O {currentDO.doNumber}
                  </label>
                </div>
                <p className="text-[11px] text-slate-500 pl-8">
                  Once loading is marked finished, the vehicle and Delivery Order will automatically transition to the <strong>Checking Section</strong> for physical verification (Requirement 15).
                </p>

                <div className="pt-1 pl-8">
                  <button
                    type="button"
                    onClick={handleCompleteFinishLoading}
                    disabled={!finishLoadingChecked || !preFinalCheck}
                    className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs transition flex items-center gap-2 shadow-md shadow-emerald-700/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Submit & Send to Checking Section
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow border border-slate-200 p-12 text-center text-slate-400 text-sm">
              Please select a vehicle or D.O from the list to begin loading operations.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
