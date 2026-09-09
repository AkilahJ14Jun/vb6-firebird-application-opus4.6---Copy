/**
 * ============================================================================
 * VEHICLE PLANNING & DELIVERY ORDER GENERATION PAGE
 * ============================================================================
 * Allows the operator to:
 *   - Select an approved vehicle from the entry gate
 *   - Assign warehouse Supervisor
 *   - Configure number of loading bays (Bay 1, Bay 2, ...)
 *   - Assign Bay Handlers for each bay
 *   - Assign items and planned weights (in Kilograms) to each bay
 *   - Track real-time PLANNING TIME (from selection to DO generation)
 *   - Automatically record OUT TIME (from entry till planning done)
 *   - Generate official DELIVERY ORDER (marking completion of planning task)
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import type {
  VehicleEntry, DeliveryOrderPlan, PlannedBayItem,
  WarehouseEmployee, Product
} from '@/types';
import {
  formatTime12, formatDuration, nextDONo, formatNow, nextId,
  getDeviationStatus, standardTimeLimits
} from '@/store/appStore';
import { DeliveryOrderModal } from '@/components/DeliveryOrderModal';
import { cn } from '@/utils/cn';
import {
  ClipboardList, Clock, Truck, Plus, Trash2,
  FileCheck2, ArrowRight, Printer, AlertTriangle, ShieldCheck,
  CheckCircle2, Search, Check, FileText, Phone, Scale,
  Calendar, Layers, MapPin, ChevronDown, Building2, Eye
} from 'lucide-react';

interface PlanningPageProps {
  entries: VehicleEntry[];
  deliveryOrders: DeliveryOrderPlan[];
  employees: WarehouseEmployee[];
  products: Product[];
  selectedVehicleEntryId?: number;
  onSaveDeliveryOrder: (order: DeliveryOrderPlan) => void;
  onNavigateToWeighment: (deliveryOrderId?: number) => void;
}

interface BayDraft {
  bayNumber: number;
  bayName: string;
  handlerName: string;
  handlerId?: number;
  itemCode: string;
  itemName: string;
  plannedWeightKg: number;
  notes?: string;
}

export const PlanningPage: React.FC<PlanningPageProps> = ({
  entries,
  deliveryOrders,
  employees,
  products,
  selectedVehicleEntryId,
  onSaveDeliveryOrder,
  onNavigateToWeighment,
}) => {
  const planners = employees.filter(e => e.role === 'planner');
  const supervisors = employees.filter(e => e.role === 'supervisor');
  const handlers = employees.filter(e => e.role === 'handler');

  // Approved vehicles that don't have a delivery order yet (Status: Unplanned)
  const plannedVehicleEntryIds = new Set(deliveryOrders.map(d => d.vehicleEntryId));
  const queueVehicles = entries.filter(
    e => e.approvalStatus === 'Approved' && !plannedVehicleEntryIds.has(e.id)
  );
  const allApprovedVehicles = entries.filter(e => e.approvalStatus === 'Approved');

  // Currently selected vehicle for planning
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(
    selectedVehicleEntryId || queueVehicles[0]?.id || null
  );

  // Search filter and view mode
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [viewTab, setViewTab] = useState<'unplanned' | 'all'>('unplanned');

  useEffect(() => {
    if (selectedVehicleEntryId) {
      setSelectedEntryId(selectedVehicleEntryId);
    } else if (selectedEntryId && !queueVehicles.some(v => v.id === selectedEntryId)) {
      setSelectedEntryId(queueVehicles[0]?.id || null);
    } else if (!selectedEntryId && queueVehicles.length > 0) {
      setSelectedEntryId(queueVehicles[0].id);
    }
  }, [selectedVehicleEntryId, queueVehicles, selectedEntryId]);

  const currentVehicle = entries.find(e => e.id === selectedEntryId);

  // Filtered queue of unplanned vehicles
  const filteredQueueVehicles = queueVehicles.filter(v => {
    if (!vehicleSearch.trim()) return true;
    const q = vehicleSearch.toLowerCase();
    return (
      v.vehicleNumber.toLowerCase().includes(q) ||
      v.slipNo.toLowerCase().includes(q) ||
      v.customerName.toLowerCase().includes(q) ||
      v.material.toLowerCase().includes(q) ||
      v.driverName.toLowerCase().includes(q)
    );
  });

  // Filtered list of all approved vehicles
  const filteredAllVehicles = allApprovedVehicles.filter(v => {
    if (!vehicleSearch.trim()) return true;
    const q = vehicleSearch.toLowerCase();
    return (
      v.vehicleNumber.toLowerCase().includes(q) ||
      v.slipNo.toLowerCase().includes(q) ||
      v.customerName.toLowerCase().includes(q) ||
      v.material.toLowerCase().includes(q) ||
      v.driverName.toLowerCase().includes(q)
    );
  });

  // ── Planning Timer ─────────────────────────────────────────────────────
  // Automatically tracks elapsed planning time from vehicle selection until DO generation
  const [planningSeconds, setPlanningSeconds] = useState(0);
  const [planningStartTime, setPlanningStartTime] = useState(formatTime12());
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  useEffect(() => {
    if (currentVehicle) {
      setPlanningSeconds(0);
      setPlanningStartTime(formatTime12());
      setIsTimerRunning(true);
    } else {
      setIsTimerRunning(false);
    }
  }, [currentVehicle?.id]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setPlanningSeconds(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isTimerRunning]);

  // ── Planning Form State ────────────────────────────────────────────────
  const [plannerName, setPlannerName] = useState(planners[0]?.name || 'N. Rajesh');
  const [supervisorName, setSupervisorName] = useState(supervisors[0]?.name || 'K. Murugan');
  const [bays, setBays] = useState<BayDraft[]>([
    {
      bayNumber: 1,
      bayName: 'Bay 1 (North Bulk Hopper)',
      handlerName: handlers[0]?.name || 'S. Mani',
      itemCode: 'SND-01',
      itemName: 'River Sand',
      plannedWeightKg: 8500,
    },
    {
      bayNumber: 2,
      bayName: 'Bay 2 (Aggregate Chute)',
      handlerName: handlers[1]?.name || 'P. Kumar',
      itemCode: 'GRV-01',
      itemName: 'Gravel (20mm)',
      plannedWeightKg: 6000,
    },
  ]);

  const [activeDOModal, setActiveDOModal] = useState<DeliveryOrderPlan | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // ── Bay manipulation ───────────────────────────────────────────────────
  const handleAddBay = () => {
    const nextBayNum = bays.length + 1;
    const defaultHandler = handlers[(nextBayNum - 1) % handlers.length]?.name || 'Handler';
    const defaultProduct = products[(nextBayNum - 1) % products.length];

    setBays(prev => [
      ...prev,
      {
        bayNumber: nextBayNum,
        bayName: `Bay ${nextBayNum} (Loading Deck)`,
        handlerName: defaultHandler,
        itemCode: defaultProduct?.code || '',
        itemName: defaultProduct?.name || 'Material Item',
        plannedWeightKg: 5000,
      },
    ]);
  };

  const handleRemoveBay = (index: number) => {
    if (bays.length <= 1) return;
    setBays(prev =>
      prev
        .filter((_, i) => i !== index)
        .map((b, idx) => ({
          ...b,
          bayNumber: idx + 1,
          bayName: b.bayName.startsWith('Bay ') ? `Bay ${idx + 1} ${b.bayName.slice(5)}` : b.bayName,
        }))
    );
  };

  const handleUpdateBay = (index: number, updates: Partial<BayDraft>) => {
    setBays(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const totalPlannedWeight = bays.reduce((sum, b) => sum + (Number(b.plannedWeightKg) || 0), 0);

  // ── Complete Planning & Generate Delivery Order ─────────────────────────
  const handleGenerateDO = () => {
    if (!currentVehicle) {
      setErrorMsg('Please select a vehicle from the queue to plan.');
      return;
    }
    if (!supervisorName) {
      setErrorMsg('Please assign a Warehouse Supervisor.');
      return;
    }
    if (bays.length === 0 || totalPlannedWeight <= 0) {
      setErrorMsg('Please configure at least one bay with planned weight.');
      return;
    }

    const endTime = formatTime12();
    const finalPlanningSecs = planningSeconds;
    const newDoNo = nextDONo();

    const plannedItems: PlannedBayItem[] = bays.map((b, idx) => ({
      id: `item-${idx + 1}`,
      bayNumber: b.bayNumber,
      bayName: b.bayName,
      handlerName: b.handlerName,
      itemCode: b.itemCode,
      itemName: b.itemName,
      plannedWeightKg: Number(b.plannedWeightKg),
      notes: b.notes,
    }));

    const newDO: DeliveryOrderPlan = {
      id: nextId(),
      doNumber: newDoNo,
      vehicleEntryId: currentVehicle.id,
      slipNo: currentVehicle.slipNo,
      vehicleNumber: currentVehicle.vehicleNumber,
      vehicleType: currentVehicle.vehicleType,
      driverName: currentVehicle.driverName,
      driverPhone: currentVehicle.mobileNumber,
      customerName: currentVehicle.customerName,
      material: currentVehicle.material,
      plannerName,
      plannerId: planners.find(p => p.name === plannerName)?.id,
      supervisorName,
      supervisorId: supervisors.find(s => s.name === supervisorName)?.id,
      baysCount: bays.length,
      items: plannedItems,
      totalPlannedWeightKg: totalPlannedWeight,
      currentLocation: `Waiting for ${bays[0]?.bayName || 'Bay 1'} / Scale #1`,
      checkingStatus: 'pending',
      inTime: currentVehicle.entryTime,
      planningStartTime,
      planningEndTime: endTime,
      planningDurationSeconds: finalPlanningSecs,
      outTime: endTime, // Marks completion of planning / authorization to proceed to warehouse floor
      status: 'planned',
      createdAt: formatNow(),
    };

    setIsTimerRunning(false);
    onSaveDeliveryOrder(newDO);
    setActiveDOModal(newDO);
    setErrorMsg(null);
  };

  const timerDeviation = getDeviationStatus(planningSeconds, standardTimeLimits.planningMinutes);

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-blue-600" />
            Vehicle Planning & Delivery Order Generation
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Planner assigns the vehicle to a Supervisor. The Supervisor oversees loading/unloading from assigned bays with designated Bay Handlers.
          </p>
        </div>

        {/* Live Planning Stopwatch Timer */}
        {currentVehicle && (
          <div
            className={cn(
              'px-4 py-2.5 rounded-xl border flex items-center gap-3 transition-colors shadow-sm',
              timerDeviation === 'normal'
                ? 'bg-blue-50 border-blue-200 text-blue-900'
                : timerDeviation === 'minor'
                ? 'bg-amber-50 border-amber-200 text-amber-900 animate-pulse'
                : 'bg-red-50 border-red-200 text-red-900 animate-pulse'
            )}
          >
            <Clock className="w-5 h-5" />
            <div>
              <p className="text-[10px] uppercase font-mono tracking-wider">
                Planning Phase Timer (Std: 10m)
              </p>
              <p className="text-base font-black font-mono">
                {formatDuration(planningSeconds)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Vehicle Selection Queue & Dropdown ───────────────────────── */}
      <div className="bg-white rounded-xl shadow border border-slate-200 p-5 space-y-4">
        {/* Header & Badges */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="font-black text-base text-slate-800 flex items-center gap-2">
              <Truck className="w-5 h-5 text-blue-600" />
              Vehicle Planning Queue — Select Vehicle for Planning
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Select a vehicle from the list of vehicle numbers. All vehicles awaiting planning show as <strong className="text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded font-bold">Unplanned</strong> until picked up and a Delivery Order is generated.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1.5 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              {queueVehicles.length} Unplanned Vehicles Awaiting DO
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
              {deliveryOrders.length} Planned DOs Issued
            </span>
          </div>
        </div>

        {/* Prominent Vehicle Number Selector & Search Bar */}
        <div className="p-4 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 rounded-xl border border-blue-200/80 flex flex-col md:flex-row md:items-center gap-4 justify-between">
          {/* Main Dropdown */}
          <div className="flex-1">
            <label className="block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-blue-600" />
              Select Vehicle Number for Planning Activity:
            </label>
            <div className="relative">
              <select
                value={selectedEntryId || ''}
                onChange={e => setSelectedEntryId(Number(e.target.value))}
                className="w-full pl-3 pr-10 py-2.5 bg-white border-2 border-blue-500 rounded-lg text-sm font-black font-mono text-slate-900 focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-sm cursor-pointer"
              >
                {queueVehicles.length === 0 ? (
                  <option value="">No unplanned vehicles in queue</option>
                ) : (
                  <>
                    <option value="" disabled>-- Select a Vehicle Number from List --</option>
                    {queueVehicles.map(v => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber}  |  Slip: {v.slipNo}  |  {v.customerName}  ({v.material})  [STATUS: UNPLANNED]
                      </option>
                    ))}
                  </>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-blue-600 absolute right-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Quick Search Filter */}
          <div className="w-full md:w-80">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-slate-500" />
              Search Vehicle / Slip / Customer:
            </label>
            <input
              type="text"
              value={vehicleSearch}
              onChange={e => setVehicleSearch(e.target.value)}
              placeholder="e.g. TN09, Meghalai, Rubber, Sand..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-400 focus:outline-none shadow-sm"
            />
          </div>
        </div>

        {/* View Tabs: Unplanned Queue vs All Vehicles Status Overview */}
        <div className="flex items-center justify-between pt-1 border-b border-slate-200">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewTab('unplanned')}
              className={cn(
                'px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2',
                viewTab === 'unplanned'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Truck className="w-3.5 h-3.5" />
              Unplanned Queue ({queueVehicles.length})
            </button>
            <button
              type="button"
              onClick={() => setViewTab('all')}
              className={cn(
                'px-4 py-2 text-xs font-bold border-b-2 transition-colors flex items-center gap-2',
                viewTab === 'all'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50 rounded-t-lg'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              <Eye className="w-3.5 h-3.5" />
              All Gate Vehicles Status Overview ({allApprovedVehicles.length})
            </button>
          </div>

          <span className="text-[11px] text-slate-400 hidden sm:inline">
            {viewTab === 'unplanned' ? 'Click any card below to load details' : 'Complete status register'}
          </span>
        </div>

        {/* Tab 1: Unplanned Queue Cards */}
        {viewTab === 'unplanned' && (
          <div>
            {filteredQueueVehicles.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs border border-dashed rounded-xl bg-slate-50">
                {queueVehicles.length === 0
                  ? 'All approved gate vehicles have been planned! New arrivals at the Entry Gate will appear here automatically.'
                  : 'No unplanned vehicles match your search filter.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredQueueVehicles.map(v => {
                  const isSelected = v.id === selectedEntryId;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedEntryId(v.id)}
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group',
                        isSelected
                          ? 'border-blue-500 bg-blue-50/80 shadow-md ring-2 ring-blue-400/30'
                          : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/80 bg-white shadow-sm'
                      )}
                    >
                      <div>
                        {/* Top row: Slip No, Status Pill, Entry Time */}
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                            {v.slipNo}
                          </span>
                          <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300 tracking-wider">
                            Unplanned
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{v.entryTime}</span>
                        </div>

                        {/* Vehicle Number */}
                        <p className="font-black text-base text-slate-900 font-mono tracking-tight uppercase group-hover:text-blue-700 transition-colors">
                          {v.vehicleNumber}
                        </p>

                        {/* Customer & Cargo */}
                        <p className="text-xs font-medium text-slate-700 truncate mt-0.5">{v.customerName}</p>
                        <p className="text-[11px] text-slate-500 truncate">{v.material} ({v.vehicleType})</p>
                      </div>

                      {/* Bottom row: Tare weight & Selection indicator */}
                      <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="font-mono text-[11px] text-slate-600">
                          Tare: <strong>{v.entryWeight.toLocaleString()} kg</strong>
                        </span>
                        {isSelected ? (
                          <span className="text-[11px] font-bold text-blue-700 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Selected for Planning
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 group-hover:text-blue-600 font-semibold transition-colors flex items-center gap-0.5">
                            Pick to Plan →
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: All Gate Vehicles Status Overview */}
        {viewTab === 'all' && (
          <div className="overflow-x-auto border rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 px-3">Vehicle Number</th>
                  <th className="py-2.5 px-3">Slip No</th>
                  <th className="py-2.5 px-3">Vehicle Type</th>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Material</th>
                  <th className="py-2.5 px-3">Gate In-Time</th>
                  <th className="py-2.5 px-3 text-right">Tare Weight</th>
                  <th className="py-2.5 px-3 text-center">Planning Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAllVehicles.map(v => {
                  const doRecord = deliveryOrders.find(d => d.vehicleEntryId === v.id);
                  const isPlanned = !!doRecord;
                  const isSelected = v.id === selectedEntryId;

                  return (
                    <tr
                      key={v.id}
                      className={cn(
                        'hover:bg-slate-50/80 transition-colors',
                        isSelected && 'bg-blue-50/60'
                      )}
                    >
                      <td className="py-2.5 px-3 font-mono font-black uppercase text-slate-900">
                        {v.vehicleNumber}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{v.slipNo}</td>
                      <td className="py-2.5 px-3 text-slate-600">{v.vehicleType}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">{v.customerName}</td>
                      <td className="py-2.5 px-3 text-slate-600">{v.material}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{v.entryTime}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 text-right">
                        {v.entryWeight.toLocaleString()} kg
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        {isPlanned ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <CheckCircle2 className="w-3 h-3" /> Planned ({doRecord.doNumber})
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
                            Unplanned
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {!isPlanned ? (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEntryId(v.id);
                              setViewTab('unplanned');
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold transition shadow-sm"
                          >
                            Plan Vehicle
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setActiveDOModal(doRecord)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition"
                          >
                            View DO
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Active Planning Phase Form ──────────────────────────────── */}
      {currentVehicle ? (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-6">
          {/* ── Details Captured at Entry Point Card ──────────────────── */}
          <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50/70 to-white overflow-hidden shadow-sm">
            {/* Top Banner */}
            <div className="p-4 bg-slate-100/80 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] uppercase font-mono font-black tracking-wider px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-200">
                    Captured at Entry Point
                  </span>
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    Status: Unplanned (Will become Planned upon DO generation)
                  </span>
                </div>
                <h3 className="text-lg font-black text-slate-900 uppercase font-mono flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-600" />
                  {currentVehicle.vehicleNumber}
                  <span className="text-sm font-medium font-sans text-slate-500 normal-case">
                    — {currentVehicle.customerName}
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono shadow-xs">
                  <span className="text-slate-400 block text-[10px] uppercase">Gate Slip No</span>
                  <span className="font-bold text-blue-700">{currentVehicle.slipNo}</span>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded-lg text-xs font-mono shadow-xs">
                  <span className="text-slate-400 block text-[10px] uppercase">Gate In-Time</span>
                  <span className="font-bold text-slate-800">{currentVehicle.entryTime}</span>
                </div>
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-mono shadow-xs">
                  <span className="text-blue-600 block text-[10px] uppercase">Planning Started</span>
                  <span className="font-bold text-blue-900">{planningStartTime}</span>
                </div>
              </div>
            </div>

            {/* Structured Details Grid */}
            <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle Plate & Type</span>
                <p className="font-black text-sm text-slate-900 font-mono mt-0.5">{currentVehicle.vehicleNumber}</p>
                <p className="text-[11px] text-slate-500">{currentVehicle.vehicleType}</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Driver Information</span>
                <p className="font-bold text-sm text-slate-900 mt-0.5">{currentVehicle.driverName}</p>
                <p className="text-[11px] text-slate-500 font-mono">Ph: {currentVehicle.mobileNumber}</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Material / Cargo</span>
                <p className="font-bold text-sm text-slate-900 mt-0.5">{currentVehicle.material}</p>
                <p className="text-[11px] text-slate-500">Operation: Inward Cargo</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">First Weight (Tare)</span>
                <p className="font-black text-sm text-slate-900 font-mono mt-0.5">
                  {currentVehicle.entryWeight.toLocaleString()} <span className="text-xs font-normal">kg</span>
                </p>
                <p className="text-[11px] text-slate-500 font-mono">Seq #{currentVehicle.firstWgtSeqNo || '911'}</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Customer / Consignee</span>
                <p className="font-bold text-sm text-slate-900 mt-0.5 truncate">{currentVehicle.customerName}</p>
                <p className="text-[11px] text-emerald-600 font-semibold">Gate Status: Approved</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Gate Operator & Date</span>
                <p className="font-bold text-sm text-slate-900 mt-0.5">{currentVehicle.operatorName}</p>
                <p className="text-[11px] text-slate-500 font-mono">{currentVehicle.entryDate}</p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Financial Clearance</span>
                <p className="font-bold text-sm text-slate-900 mt-0.5 font-mono">
                  Adv: ₹{(currentVehicle.advanceBalance || 0).toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Limit: ₹{(currentVehicle.creditLimit || 0).toLocaleString()}
                </p>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Current Location</span>
                <p className="font-bold text-sm text-blue-700 mt-0.5">{currentVehicle.currentLocation}</p>
                <p className="text-[11px] text-amber-700 font-semibold">Ready for Bay Allocation</p>
              </div>
            </div>

            {/* Gate Notes Callout */}
            {currentVehicle.notes && (
              <div className="mx-4 mb-4 p-2.5 bg-blue-50/50 border border-blue-200/60 rounded-lg text-xs flex items-start gap-2 text-slate-700">
                <FileText className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-800">Gate Inspection Notes: </span>
                  {currentVehicle.notes}
                </div>
              </div>
            )}
          </div>

          {/* Role Chain: Planner -> Supervisor -> Handlers */}
          <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-blue-950">Role Hierarchy & Workflow Responsibilities:</p>
              <p className="mt-0.5 text-blue-800 leading-relaxed">
                <strong>Planner</strong> plans the vehicle loading requirements and assigns the vehicle to a <strong>Supervisor</strong>. The <strong>Supervisor</strong> is responsible for ensuring that required items in required weights are loaded from specific bays. Each bay has an assigned <strong>Bay Handler</strong> in-charge of handling the physical loading and unloading activity.
              </p>
            </div>
          </div>

          {/* Planner, Supervisor & Bay Allocation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Planner Role */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Assigned Planner (Planning Role) *
              </label>
              <select
                value={plannerName}
                onChange={e => setPlannerName(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {planners.length > 0 ? (
                  planners.map(p => (
                    <option key={p.id} value={p.name}>
                      {p.name} (PLANNER) — {p.phone}
                    </option>
                  ))
                ) : (
                  <option value="N. Rajesh">N. Rajesh (PLANNER)</option>
                )}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Assigns vehicle to supervisor and formulates the bay plan.
              </p>
            </div>

            {/* Supervisor Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Designated Warehouse Supervisor *
              </label>
              <select
                value={supervisorName}
                onChange={e => setSupervisorName(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {supervisors.map(s => (
                  <option key={s.id} value={s.name}>
                    {s.name} (SUPERVISOR) — {s.phone}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                Responsible for ensuring items & weights are loaded from specific bays.
              </p>
            </div>

            <div className="flex items-end justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div>
                <p className="text-xs font-bold text-slate-700 uppercase">Configured Bays</p>
                <p className="text-2xl font-black text-blue-700 font-mono mt-0.5">
                  {bays.length} <span className="text-xs font-medium text-slate-500">Bay(s) Assigned</span>
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddBay}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Bay
              </button>
            </div>
          </div>

          {/* Bay Configuration Table */}
          <div>
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Bay Loading Allocation & Handler In-Charge Details
            </h4>

            <div className="space-y-3">
              {bays.map((bay, idx) => (
                <div
                  key={idx}
                  className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 hover:bg-slate-50 transition grid grid-cols-1 md:grid-cols-12 gap-3 items-center"
                >
                  {/* Bay Number & Name */}
                  <div className="md:col-span-3">
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Bay Location
                    </label>
                    <input
                      type="text"
                      value={bay.bayName}
                      onChange={e => handleUpdateBay(idx, { bayName: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-semibold focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Bay Handler */}
                  <div className="md:col-span-3">
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Handler In-Charge (Loading / Unloading)
                    </label>
                    <select
                      value={bay.handlerName}
                      onChange={e => handleUpdateBay(idx, { handlerName: e.target.value })}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      {handlers.map(h => (
                        <option key={h.id} value={h.name}>
                          {h.name} ({h.phone})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Material / Item */}
                  <div className="md:col-span-3">
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Item to Load
                    </label>
                    <input
                      type="text"
                      list={`items-list-${idx}`}
                      value={bay.itemName}
                      onChange={e => {
                        const val = e.target.value;
                        const match = products.find(p => p.name === val);
                        handleUpdateBay(idx, {
                          itemName: val,
                          itemCode: match ? match.code : bay.itemCode,
                        });
                      }}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <datalist id={`items-list-${idx}`}>
                      {products.map(p => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </div>

                  {/* Planned Weight in Kg */}
                  <div className="md:col-span-2">
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-1">
                      Planned Wgt (kg)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={bay.plannedWeightKg}
                        onChange={e =>
                          handleUpdateBay(idx, { plannedWeightKg: Number(e.target.value) })
                        }
                        className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-mono font-bold text-slate-900 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                      <span className="absolute right-2 top-1.5 text-[10px] text-slate-400 font-mono">
                        kg
                      </span>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <div className="md:col-span-1 text-right flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleRemoveBay(idx)}
                      disabled={bays.length <= 1}
                      title="Remove bay"
                      className="p-1.5 text-slate-400 hover:text-red-600 disabled:opacity-30 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Planned Summary Bar */}
            <div className="mt-4 p-4 bg-blue-50/60 border border-blue-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs text-blue-900 font-medium">
                  Total Planned Cargo Weight across {bays.length} Bay(s):
                </p>
                <p className="text-2xl font-mono font-black text-blue-900">
                  {totalPlannedWeight.toLocaleString()} <span className="text-sm font-semibold">kg</span>
                </p>
              </div>

              <div className="text-right text-xs text-slate-500">
                <p>Initial Vehicle Tare Weight: <strong>{currentVehicle.entryWeight.toLocaleString()} kg</strong></p>
                <p>Estimated Gross Post-Loading: <strong>{(currentVehicle.entryWeight + totalPlannedWeight).toLocaleString()} kg</strong></p>
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-medium flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              {errorMsg}
            </div>
          )}

          {/* Action to complete planning and generate DO */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={handleGenerateDO}
              className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold rounded-xl text-sm transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
            >
              <FileCheck2 className="w-5 h-5" />
              Complete Planning & Generate Delivery Order (DO)
            </button>

            <button
              type="button"
              onClick={() => onNavigateToWeighment()}
              className="px-6 py-3.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition flex items-center justify-center gap-2"
            >
              Skip to Weighment Console <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : null}

      {/* ── Delivery Orders Register Table ─────────────────────────── */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Generated Delivery Orders</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Approved planning orders with recorded planning durations and bay breakdown
            </p>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-3 py-1 rounded-lg">
            {deliveryOrders.length} DO(s) Generated
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">DO Number</th>
                <th className="py-3 px-4">Vehicle No</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Supervisor</th>
                <th className="py-3 px-4">Bays</th>
                <th className="py-3 px-4 text-right">Planned Wgt</th>
                <th className="py-3 px-4">In Time</th>
                <th className="py-3 px-4">Planning Time</th>
                <th className="py-3 px-4">Out Time</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {deliveryOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-8 text-center text-slate-400">
                    No Delivery Orders generated yet.
                  </td>
                </tr>
              ) : (
                deliveryOrders.map(doOrder => (
                  <tr key={doOrder.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {doOrder.doNumber}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold uppercase text-slate-800">
                      {doOrder.vehicleNumber}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {doOrder.customerName}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      {doOrder.supervisorName}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {doOrder.baysCount} Bay(s)
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right">
                      {doOrder.totalPlannedWeightKg.toLocaleString()} kg
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{doOrder.inTime}</td>
                    <td className="py-3 px-4 font-mono font-bold text-blue-700">
                      {formatDuration(doOrder.planningDurationSeconds)}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                      {doOrder.outTime}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 capitalize">
                        <CheckCircle2 className="w-3 h-3" /> {doOrder.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setActiveDOModal(doOrder)}
                          title="View / Print DO"
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onNavigateToWeighment(doOrder.id)}
                          title="Proceed to Multi-Weighment"
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                        >
                          Weigh <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── View / Print DO Modal ────────────────────────────────────── */}
      <DeliveryOrderModal order={activeDOModal} onClose={() => setActiveDOModal(null)} />
    </div>
  );
};
