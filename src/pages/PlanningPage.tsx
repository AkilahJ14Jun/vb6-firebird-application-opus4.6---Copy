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
  CheckCircle2
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

  // Approved vehicles that don't have a delivery order yet
  const plannedVehicleEntryIds = new Set(deliveryOrders.map(d => d.vehicleEntryId));
  const queueVehicles = entries.filter(
    e => e.approvalStatus === 'Approved' && !plannedVehicleEntryIds.has(e.id)
  );

  // Currently selected vehicle for planning
  const [selectedEntryId, setSelectedEntryId] = useState<number | null>(
    selectedVehicleEntryId || queueVehicles[0]?.id || null
  );

  useEffect(() => {
    if (selectedVehicleEntryId) {
      setSelectedEntryId(selectedVehicleEntryId);
    }
  }, [selectedVehicleEntryId]);

  const currentVehicle = entries.find(e => e.id === selectedEntryId);

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
      baysCount: bays.length,
      items: plannedItems,
      totalPlannedWeightKg: totalPlannedWeight,
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

      {/* ── Vehicle Selection Queue ─────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
            <Truck className="w-4 h-4 text-blue-500" />
            Vehicles Awaiting Planning ({queueVehicles.length})
          </h3>
          <span className="text-xs text-slate-400">Click a vehicle to begin planning</span>
        </div>

        {queueVehicles.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs border border-dashed rounded-lg">
            No approved vehicles in the queue. New arrivals at the Entry Gate will appear here automatically.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {queueVehicles.map(v => {
              const isSelected = v.id === selectedEntryId;
              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedEntryId(v.id)}
                  className={cn(
                    'p-3.5 rounded-xl border text-left transition-all relative overflow-hidden',
                    isSelected
                      ? 'border-blue-500 bg-blue-50/70 shadow-md ring-2 ring-blue-400/20'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.5 rounded">
                      {v.slipNo}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">{v.entryTime}</span>
                  </div>
                  <p className="font-black text-sm text-slate-900 tracking-tight uppercase">
                    {v.vehicleNumber}
                  </p>
                  <p className="text-xs text-slate-600 truncate mt-0.5">{v.customerName}</p>
                  <p className="text-[11px] text-slate-400 truncate">{v.material}</p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Active Planning Phase Form ──────────────────────────────── */}
      {currentVehicle ? (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6 space-y-6">
          {/* Header Summary for Current Vehicle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b gap-3">
            <div>
              <span className="text-xs text-blue-600 font-bold uppercase tracking-wider">
                Active Planning Task
              </span>
              <h3 className="text-lg font-black text-slate-900 uppercase">
                {currentVehicle.vehicleNumber} — {currentVehicle.customerName}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Driver: {currentVehicle.driverName} ({currentVehicle.mobileNumber}) | Cargo: {currentVehicle.material}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 rounded-lg text-xs font-mono">
                <span className="text-slate-400 block text-[10px]">IN TIME (GATE)</span>
                <span className="font-bold text-slate-800">{currentVehicle.entryTime}</span>
              </div>
              <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg text-xs font-mono">
                <span className="text-blue-600 block text-[10px]">PLANNING STARTED</span>
                <span className="font-bold text-blue-900">{planningStartTime}</span>
              </div>
            </div>
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
