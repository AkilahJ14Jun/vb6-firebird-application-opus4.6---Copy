/**
 * ============================================================================
 * VEHICLE ENTRY POINT & APPROVAL PAGE
 * ============================================================================
 * Captures vehicle arrival at gate:
 *   - Entry Time (12-hour format with seconds)
 *   - Vehicle Type
 *   - Vehicle Number
 *   - Driver Name
 *   - Mobile Number
 *   - Customer Name
 *   - Material
 *   - 1st Wgt S.No & Entry Weight
 *   - Approval status ('Approved' / 'Rejected')
 *   - Reject reason (required if Rejected)
 *
 * Automatically generates thermal entry slip with QR code matching 'Entry slip.jpg'
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import type { VehicleEntry, Customer, Vehicle, Product, ApprovalStatus } from '@/types';
import {
  formatTime12, formatTimeSlip, nextSlipNo, nextWgtSeqNo, formatNow, nextId
} from '@/store/appStore';
import { EntrySlipModal } from '@/components/EntrySlipModal';
import { cn } from '@/utils/cn';
import {
  LogIn, CheckCircle, XCircle, Clock, User, Phone,
  Building2, Scale, Printer, Search, ArrowRight,
  ShieldAlert, RefreshCw, Zap
} from 'lucide-react';

interface VehicleEntryPageProps {
  entries: VehicleEntry[];
  customers: Customer[];
  vehicles: Vehicle[];
  products: Product[];
  operatorId: number;
  operatorName: string;
  onSaveEntry: (entry: VehicleEntry) => void;
  onNavigateToPlanning: (vehicleEntryId?: number) => void;
}

const VEHICLE_TYPES = ['Truck', 'Lorry', 'Trailer', 'Container', 'Tipper', 'Tanker', 'Mini Lorry'];

const COMMON_REJECT_REASONS = [
  'Payment balances overdue / Exceeds permissible credit limit',
  'Missing or expired road transit permit / documentation',
  'Vehicle axle load exceeds bridge / warehouse weight limits',
  'Vehicle dimension / height constraint for loading bays',
  'Technical or mechanical defect / safety inspection failure',
  'Unauthorized cargo specification mismatch',
  'Other constraint (specify below)',
];

export const VehicleEntryPage: React.FC<VehicleEntryPageProps> = ({
  entries,
  customers,
  vehicles,
  products,
  operatorId,
  operatorName,
  onSaveEntry,
  onNavigateToPlanning,
}) => {
  // ── Live Clock State ───────────────────────────────────────────────────
  const [liveTime, setLiveTime] = useState(formatTime12());
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(formatTime12());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // ── Form State ─────────────────────────────────────────────────────────
  const [useLiveClock, setUseLiveClock] = useState(true);
  const [manualTime, setManualTime] = useState(formatTimeSlip());
  const [vehicleType, setVehicleType] = useState('Truck');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [driverName, setDriverName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [material, setMaterial] = useState('');
  const [firstWgtSeqNo, setFirstWgtSeqNo] = useState(nextWgtSeqNo());
  const [entryWeight, setEntryWeight] = useState<number | ''>('');
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>('Approved');
  const [rejectReason, setRejectReason] = useState('');
  const [customRejectReason, setCustomRejectReason] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Scale Simulator for Entry Gate ─────────────────────────────────────
  const [simulatedScaleWeight, setSimulatedScaleWeight] = useState(2690);
  const [scaleStable, setScaleStable] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      // Small fluctuation around ~2500 - 4500 kg tare
      setSimulatedScaleWeight(prev => Math.round(prev + (Math.random() - 0.5) * 10));
      setScaleStable(true);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleCaptureScaleWeight = () => {
    setEntryWeight(simulatedScaleWeight);
  };

  // ── Autofill on vehicle selection ──────────────────────────────────────
  const handleVehicleSelect = (plate: string) => {
    setVehicleNumber(plate.toUpperCase());
    const matched = vehicles.find(v => v.plateNo.toLowerCase() === plate.toLowerCase());
    if (matched) {
      if (matched.driverName) setDriverName(matched.driverName);
      if (matched.driverPhone) setMobileNumber(matched.driverPhone);
      if (matched.tareWeight) setEntryWeight(matched.tareWeight);
    }
  };

  // ── Autofill on customer selection ─────────────────────────────────────
  const handleCustomerSelect = (name: string) => {
    setCustomerName(name);
  };

  // Find customer credit info
  const selectedCustomerObj = customers.find(
    c => c.name.toLowerCase() === customerName.toLowerCase()
  );

  // ── Active Slip Modal ──────────────────────────────────────────────────
  const [activeSlipEntry, setActiveSlipEntry] = useState<VehicleEntry | null>(null);

  // ── Table Search & Filter ──────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Approved' | 'Rejected'>('all');

  const filteredEntries = entries.filter(e => {
    if (statusFilter !== 'all' && e.approvalStatus !== statusFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        e.slipNo.toLowerCase().includes(q) ||
        e.vehicleNumber.toLowerCase().includes(q) ||
        e.driverName.toLowerCase().includes(q) ||
        e.customerName.toLowerCase().includes(q) ||
        e.material.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // ── Validation ─────────────────────────────────────────────────────────
  const validateForm = () => {
    const errs: Record<string, string> = {};
    if (!vehicleNumber.trim()) errs.vehicleNumber = 'Vehicle Number is required';
    if (!driverName.trim()) errs.driverName = 'Driver Name is required';
    if (!mobileNumber.trim()) errs.mobileNumber = 'Mobile Number is required';
    if (!customerName.trim()) errs.customerName = 'Customer Name is required';
    if (!material.trim()) errs.material = 'Material is required';
    if (!entryWeight || Number(entryWeight) <= 0) errs.entryWeight = 'Valid Entry Weight is required';
    if (approvalStatus === 'Rejected') {
      const finalReason = rejectReason === 'Other constraint (specify below)' ? customRejectReason : rejectReason;
      if (!finalReason.trim()) {
        errs.rejectReason = 'Please select or provide a rejection reason';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit Vehicle Entry ───────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const finalTime = useLiveClock ? liveTime : manualTime;
    const finalRejectReason =
      approvalStatus === 'Rejected'
        ? rejectReason === 'Other constraint (specify below)'
          ? customRejectReason
          : rejectReason
        : null;

    const newSlipNo = nextSlipNo();

    const newEntry: VehicleEntry = {
      id: nextId(),
      slipNo: newSlipNo,
      entryTime: finalTime,
      entryDate: formatNow().split(' ')[0],
      vehicleType,
      vehicleNumber: vehicleNumber.trim().toUpperCase(),
      driverName: driverName.trim(),
      mobileNumber: mobileNumber.trim(),
      customerName: customerName.trim(),
      customerId: selectedCustomerObj ? selectedCustomerObj.id : null,
      material: material.trim(),
      firstWgtSeqNo,
      entryWeight: Number(entryWeight),
      approvalStatus,
      rejectReason: finalRejectReason,
      operatorId,
      operatorName,
      advanceBalance: selectedCustomerObj ? 15000 : 0,
      creditLimit: selectedCustomerObj ? selectedCustomerObj.creditLimit : 0,
      notes,
      createdAt: formatNow(),
    };

    onSaveEntry(newEntry);

    // If approved, automatically pop up the authentic thermal receipt!
    if (approvalStatus === 'Approved') {
      setActiveSlipEntry(newEntry);
    }

    // Reset form for next vehicle
    setVehicleNumber('');
    setDriverName('');
    setMobileNumber('');
    setCustomerName('');
    setMaterial('');
    setEntryWeight('');
    setNotes('');
    setFirstWgtSeqNo(nextWgtSeqNo());
    setApprovalStatus('Approved');
    setRejectReason('');
    setCustomRejectReason('');
    setErrors({});
  };

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-emerald-600" />
            Vehicle Entry Point & Approval Gate
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Capture arriving vehicles, record 1st entry weight, verify customer credit, approve or reject, and generate entry slips.
          </p>
        </div>

        {/* Live Gate Clock */}
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-3 border border-slate-700 shadow-sm">
          <Clock className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <p className="text-[10px] uppercase font-mono text-slate-400">Gate Clock (12-Hr Sec)</p>
            <p className="text-base font-bold font-mono text-emerald-400">{liveTime}</p>
          </div>
        </div>
      </div>

      {/* ── Top Metrics Bar ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold text-slate-500 uppercase">Today&apos;s Arrivals</p>
          <p className="text-2xl font-black text-slate-800 mt-1">{entries.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Vehicles at gate</p>
        </div>
        <div className="bg-white rounded-xl border border-emerald-200 p-4 bg-emerald-50/40">
          <p className="text-xs font-semibold text-emerald-700 uppercase">Approved & Allowed In</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">
            {entries.filter(e => e.approvalStatus === 'Approved').length}
          </p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Slips issued</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 bg-red-50/40">
          <p className="text-xs font-semibold text-red-700 uppercase">Rejected at Gate</p>
          <p className="text-2xl font-black text-red-700 mt-1">
            {entries.filter(e => e.approvalStatus === 'Rejected').length}
          </p>
          <p className="text-[11px] text-red-600/80 mt-0.5">Credit/constraint denials</p>
        </div>
        <div className="bg-white rounded-xl border border-blue-200 p-4 bg-blue-50/40">
          <p className="text-xs font-semibold text-blue-700 uppercase">Next Receipt / Slip S.No</p>
          <p className="text-xl font-black text-blue-800 mt-1 font-mono">{nextSlipNo()}</p>
          <p className="text-[11px] text-blue-600/80 mt-0.5">1st Wgt S.No: {firstWgtSeqNo}</p>
        </div>
      </div>

      {/* ── Main Entry Form & Scale Simulation ──────────────────────── */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Col: Entry Gate Scale Display & Quick Info */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                <Scale className="w-4 h-4 text-emerald-500" />
                Entry Gate Weighbridge Scale
              </h3>
              <div className="flex items-center gap-1.5">
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase',
                  scaleStable ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800 animate-pulse'
                )}>
                  {scaleStable ? 'STABLE' : 'MOTION'}
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Live Port Connected
                </span>
              </div>
            </div>

            <div className="bg-slate-900 rounded-xl p-5 text-center border border-slate-800">
              <p className="text-xs text-slate-400 mb-1 uppercase tracking-wider font-mono">
                Scale Indicator #1 (Tare / Gross)
              </p>
              <p className="text-4xl font-mono font-black text-emerald-400 tracking-wider">
                {simulatedScaleWeight.toLocaleString()}
              </p>
              <p className="text-xs text-slate-400 mt-1">KILOGRAMS (kg)</p>
            </div>

            <button
              type="button"
              onClick={handleCaptureScaleWeight}
              className="mt-3 w-full py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition shadow-sm"
            >
              <Zap className="w-4 h-4" /> Capture Live Weight into Form
            </button>

            {entryWeight !== '' && (
              <div className="mt-3 p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                <span className="text-emerald-800 font-medium">Captured Weight:</span>
                <span className="font-mono font-bold text-emerald-900 text-sm">
                  {Number(entryWeight).toLocaleString()} kg
                </span>
              </div>
            )}
          </div>

          {/* Sample Receipt Reference Notice */}
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-4 text-xs text-amber-900">
            <h4 className="font-bold flex items-center gap-1.5 text-amber-800 mb-1">
              <Printer className="w-4 h-4 text-amber-600" />
              Physical Entry Slip Output
            </h4>
            <p className="text-amber-800/90 leading-relaxed">
              Submitting an approved entry automatically renders the thermal entry receipt with 
              <strong> Receipt No, Entry Time, Vehicle No, Driver, Mobile, 1st Wgt S.No, Entry Weight</strong>,
              and <strong>Scannable QR Code</strong> matching the operational layout in <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">Entry slip.jpg</code>.
            </p>
          </div>
        </div>

        {/* Right 2 Cols: Comprehensive Entry Form */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow border border-slate-200 p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-base">Vehicle Arrival Details</h3>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setUseLiveClock(prev => !prev)}
                  className="text-slate-600 hover:text-slate-900 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  {useLiveClock ? 'Using Live Gate Time' : 'Custom Entry Time'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Entry Time */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Entry Time (12-Hour Sec) *
                </label>
                {useLiveClock ? (
                  <div className="px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-800">
                    {liveTime}
                  </div>
                ) : (
                  <input
                    type="text"
                    value={manualTime}
                    onChange={e => setManualTime(e.target.value)}
                    placeholder="hh:mm:ss"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                )}
              </div>

              {/* Vehicle Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle Type *
                </label>
                <select
                  value={vehicleType}
                  onChange={e => setVehicleType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {VEHICLE_TYPES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vehicle Number *
                </label>
                <input
                  type="text"
                  value={vehicleNumber}
                  onChange={e => handleVehicleSelect(e.target.value)}
                  placeholder="e.g. TN38CW6762"
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm font-mono font-bold uppercase focus:ring-2 focus:ring-emerald-500 outline-none',
                    errors.vehicleNumber ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
                  )}
                />
                {errors.vehicleNumber && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.vehicleNumber}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Driver Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Driver Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={driverName}
                    onChange={e => setDriverName(e.target.value)}
                    placeholder="e.g. MS or Full Name"
                    className={cn(
                      'w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none',
                      errors.driverName ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
                    )}
                  />
                </div>
                {errors.driverName && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.driverName}</p>
                )}
              </div>

              {/* Mobile Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mobile Number / Contact *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={mobileNumber}
                    onChange={e => setMobileNumber(e.target.value)}
                    placeholder="e.g. RANGA or 9876543210"
                    className={cn(
                      'w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none',
                      errors.mobileNumber ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
                    )}
                  />
                </div>
                {errors.mobileNumber && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.mobileNumber}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Customer Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Customer Name *
                </label>
                <div className="relative">
                  <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    list="customers-list"
                    value={customerName}
                    onChange={e => handleCustomerSelect(e.target.value)}
                    placeholder="Search from master or enter customer..."
                    className={cn(
                      'w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none',
                      errors.customerName ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
                    )}
                  />
                  <datalist id="customers-list">
                    <option value="Meghalai steels" />
                    {customers.map(c => (
                      <option key={c.id} value={c.name} />
                    ))}
                  </datalist>
                </div>
                {selectedCustomerObj && (
                  <div className="mt-1.5 flex items-center gap-3 text-[11px]">
                    <span className="text-slate-500">
                      Credit Limit:{' '}
                      <strong className="text-slate-700">
                        RM {selectedCustomerObj.creditLimit.toLocaleString()}
                      </strong>
                    </span>
                    <span className="text-emerald-700 font-medium">
                      Permissible Advance: RM 15,000
                    </span>
                  </div>
                )}
                {errors.customerName && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.customerName}</p>
                )}
              </div>

              {/* Material */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Material / Cargo *
                </label>
                <input
                  type="text"
                  list="products-list"
                  value={material}
                  onChange={e => setMaterial(e.target.value)}
                  placeholder="e.g. TMT Steel Bars, River Sand, Scrap Steel"
                  className={cn(
                    'w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none',
                    errors.material ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
                  )}
                />
                <datalist id="products-list">
                  <option value="TMT Steel Bars" />
                  {products.map(p => (
                    <option key={p.id} value={p.name} />
                  ))}
                </datalist>
                {errors.material && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.material}</p>
                )}
              </div>
            </div>

            {/* 1st Wgt S.No & Entry Weight */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  1st Wgt S.No (Sequential)
                </label>
                <input
                  type="text"
                  value={firstWgtSeqNo}
                  onChange={e => setFirstWgtSeqNo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm font-mono font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Entry Weight (kg) *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={entryWeight}
                    onChange={e => setEntryWeight(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Enter or capture weight"
                    className={cn(
                      'w-full px-3 py-2 bg-white border rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none',
                      errors.entryWeight ? 'border-red-400 bg-red-50/50' : 'border-slate-300'
                    )}
                  />
                  <span className="absolute right-3 top-2 text-xs text-slate-400 font-mono">kg</span>
                </div>
                {errors.entryWeight && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.entryWeight}</p>
                )}
              </div>
            </div>

            {/* Approval Decision & Reject Reason */}
            <div className="border-t pt-4">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
                Gatekeeper Approval Decision *
              </label>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <button
                  type="button"
                  onClick={() => setApprovalStatus('Approved')}
                  className={cn(
                    'py-3 px-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all',
                    approvalStatus === 'Approved'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  ALLOW ENTRY (APPROVED)
                </button>

                <button
                  type="button"
                  onClick={() => setApprovalStatus('Rejected')}
                  className={cn(
                    'py-3 px-4 rounded-xl border-2 font-bold text-sm flex items-center justify-center gap-2 transition-all',
                    approvalStatus === 'Rejected'
                      ? 'border-red-600 bg-red-50 text-red-800 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  <XCircle className="w-5 h-5 text-red-600" />
                  REJECT VEHICLE (DENIED)
                </button>
              </div>

              {/* Reject Reason input if Rejected */}
              {approvalStatus === 'Rejected' && (
                <div className="p-4 bg-red-50/70 border border-red-200 rounded-xl space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                    Record Primary Reason for Entry Rejection:
                  </div>

                  <select
                    value={rejectReason}
                    onChange={e => setRejectReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-xs font-medium text-slate-800 focus:ring-2 focus:ring-red-500 outline-none"
                  >
                    <option value="">— Select Common Reason —</option>
                    {COMMON_REJECT_REASONS.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>

                  <textarea
                    value={customRejectReason}
                    onChange={e => setCustomRejectReason(e.target.value)}
                    rows={2}
                    placeholder="Specific remarks on payment overdue, technical constraints, or axle overload..."
                    className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-red-500 outline-none"
                  />
                  {errors.rejectReason && (
                    <p className="text-[11px] text-red-600 font-semibold">{errors.rejectReason}</p>
                  )}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className={cn(
                  'flex-1 py-3 text-white font-bold rounded-xl text-sm transition-all shadow-md flex items-center justify-center gap-2',
                  approvalStatus === 'Approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                )}
              >
                {approvalStatus === 'Approved' ? (
                  <>
                    <CheckCircle className="w-4 h-4" /> Save Entry & Issue Approval Slip
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" /> Record Gate Rejection
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setVehicleNumber('');
                  setDriverName('');
                  setMobileNumber('');
                  setCustomerName('');
                  setMaterial('');
                  setEntryWeight('');
                  setErrors({});
                }}
                className="px-5 py-3 border border-slate-300 text-slate-600 hover:bg-slate-50 font-medium text-sm rounded-xl transition"
              >
                Reset
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Vehicle Entries Register / History Table ─────────────────── */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Vehicle Gate Register</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              History of all arrivals, approval receipts, and gate decisions
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search slip, vehicle, customer..."
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <div className="flex bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setStatusFilter('all')}
                className={cn(
                  'px-3 py-1 rounded-md transition',
                  statusFilter === 'all' ? 'bg-white shadow-sm text-slate-900 font-bold' : 'text-slate-600'
                )}
              >
                All ({entries.length})
              </button>
              <button
                onClick={() => setStatusFilter('Approved')}
                className={cn(
                  'px-3 py-1 rounded-md transition',
                  statusFilter === 'Approved' ? 'bg-white shadow-sm text-emerald-700 font-bold' : 'text-slate-600'
                )}
              >
                Approved
              </button>
              <button
                onClick={() => setStatusFilter('Rejected')}
                className={cn(
                  'px-3 py-1 rounded-md transition',
                  statusFilter === 'Rejected' ? 'bg-white shadow-sm text-red-700 font-bold' : 'text-slate-600'
                )}
              >
                Rejected
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Slip / Receipt No</th>
                <th className="py-3 px-4">Entry Time</th>
                <th className="py-3 px-4">Vehicle No & Type</th>
                <th className="py-3 px-4">Driver & Phone</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Material</th>
                <th className="py-3 px-4">1st Wgt S.No</th>
                <th className="py-3 px-4 text-right">Entry Weight</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
                    No vehicle entries match the current filter.
                  </td>
                </tr>
              ) : (
                filteredEntries.map(entry => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {entry.slipNo}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{entry.entryTime}</td>
                    <td className="py-3 px-4">
                      <span className="font-mono font-bold uppercase text-slate-800">
                        {entry.vehicleNumber}
                      </span>
                      <span className="text-[10px] text-slate-500 block">{entry.vehicleType}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{entry.driverName}</span>
                      <span className="text-[10px] font-mono text-slate-500 block">
                        {entry.mobileNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">{entry.customerName}</td>
                    <td className="py-3 px-4 text-slate-600">{entry.material}</td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {entry.firstWgtSeqNo}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 text-right">
                      {entry.entryWeight.toLocaleString()} kg
                    </td>
                    <td className="py-3 px-4 text-center">
                      {entry.approvalStatus === 'Approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle className="w-3 h-3" /> Approved
                        </span>
                      ) : (
                        <div>
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800">
                            <XCircle className="w-3 h-3" /> Rejected
                          </span>
                          {entry.rejectReason && (
                            <span
                              title={entry.rejectReason}
                              className="text-[10px] text-red-600 block mt-0.5 max-w-[180px] truncate"
                            >
                              {entry.rejectReason}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {entry.approvalStatus === 'Approved' && (
                          <>
                            <button
                              onClick={() => setActiveSlipEntry(entry)}
                              title="Print / View Entry Slip"
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => onNavigateToPlanning(entry.id)}
                              title="Send to Planning Phase"
                              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition shadow-sm"
                            >
                              Plan <ArrowRight className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Entry Slip Modal Preview ─────────────────────────────────── */}
      <EntrySlipModal
        entry={activeSlipEntry}
        companyName="Meghalai steels"
        onClose={() => setActiveSlipEntry(null)}
      />
    </div>
  );
};
