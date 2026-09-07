/**
 * ============================================================================
 * WEIGH-IN PAGE
 * ============================================================================
 * Replaces: frmWeighIn from VB6
 *
 * ORIGINAL VB6 BEHAVIOR:
 *   1. Operator selects Product from combo box
 *   2. Operator selects Customer/Supplier
 *   3. Operator enters/selects Vehicle plate number
 *   4. Scale weight is read from MSComm serial port (modSerial.ReadWeight)
 *   5. Weight is displayed in a large label (lblWeight)
 *   6. Operator clicks "Save" button
 *   7. VB6 calls SP_GET_NEXT_TICKET_NO to get sequence
 *   8. INSERT INTO TICKETS with gross weight
 *   9. Ticket prints via modPrint.PrintTicket
 *
 * MODERN IMPLEMENTATION:
 *   - Same workflow but web-based with better UX
 *   - Live weight display via simulated WebSocket stream
 *   - Form validation with clear error messages
 *   - Auto-populated vehicle tare weight
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import type { Product, Customer, Supplier, Vehicle, Ticket } from '@/types';
import { nextId, nextTicketNo, formatNow } from '@/store/appStore';
import { Scale, Save, RotateCcw, Zap } from 'lucide-react';
import { cn } from '@/utils/cn';

interface WeighInPageProps {
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  vehicles: Vehicle[];
  operatorId: number;
  operatorName: string;
  onSave: (ticket: Ticket) => void;
}

export function WeighInPage({
  products, customers, suppliers, vehicles,
  operatorId, operatorName, onSave
}: WeighInPageProps) {
  /* ── Form State ──────────────────────────────────────────────────────── */
  const [ticketType, setTicketType] = useState<'purchase' | 'sale'>('purchase');
  const [productId, setProductId] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [notes, setNotes] = useState('');
  const [saved, setSaved] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /* ── Simulated Live Weight from Scale ──────────────────────────────── */
  /**
   * In the original VB6, weight was read from MSComm control:
   *   MSComm1.Output = "W" + vbCr  ' Send command to scale
   *   weight = Val(MSComm1.Input)    ' Read response
   *
   * In production, this would use:
   *   - Web Serial API (browser): navigator.serial.requestPort()
   *   - Socket.IO stream from Node.js serialport library
   *
   * For this demo, we simulate fluctuating weight readings.
   */
  const [liveWeight, setLiveWeight] = useState(0);
  const [scaleStable, setScaleStable] = useState(false);
  const [scaleConnected] = useState(true);

  useEffect(() => {
    const targetWeight = 15000 + Math.random() * 25000;
    let currentWeight = 0;
    const interval = setInterval(() => {
      if (currentWeight < targetWeight) {
        currentWeight += targetWeight / 20 + (Math.random() - 0.5) * 500;
        if (currentWeight > targetWeight) currentWeight = targetWeight;
        setScaleStable(false);
      } else {
        // Add small fluctuations to simulate real scale behavior
        currentWeight = targetWeight + (Math.random() - 0.5) * 20;
        setScaleStable(true);
      }
      setLiveWeight(Math.round(currentWeight));
    }, 200);

    return () => clearInterval(interval);
  }, []);

  /* ── Capture Weight (freeze the current reading) ─────────────────── */
  const [capturedWeight, setCapturedWeight] = useState<number | null>(null);

  const captureWeight = useCallback(() => {
    setCapturedWeight(liveWeight);
  }, [liveWeight]);

  /* ── Form Validation ─────────────────────────────────────────────── */
  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!productId) errs.product = 'Please select a product';
    if (ticketType === 'sale' && !customerId) errs.customer = 'Please select a customer for sales';
    if (ticketType === 'purchase' && !supplierId) errs.supplier = 'Please select a supplier for purchases';
    if (!vehicleId) errs.vehicle = 'Please select a vehicle';
    if (!capturedWeight || capturedWeight <= 0) errs.weight = 'Please capture weight from scale';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  /* ── Save Ticket (weigh-in) ──────────────────────────────────────── */
  /**
   * Creates a new ticket with status='open' and grossWeight set.
   * This mirrors the VB6 INSERT INTO TICKETS statement in frmWeighIn.cmdSave_Click
   */
  const handleSave = () => {
    if (!validate()) return;

    const product = products.find(p => p.id === Number(productId))!;
    const customer = ticketType === 'sale' ? customers.find(c => c.id === Number(customerId)) : null;
    const supplier = ticketType === 'purchase' ? suppliers.find(s => s.id === Number(supplierId)) : null;
    const vehicle = vehicles.find(v => v.id === Number(vehicleId))!;

    const ticket: Ticket = {
      id: nextId(),
      ticketNo: nextTicketNo(),
      type: ticketType,
      status: 'open',
      productId: product.id,
      productName: product.name,
      customerId: customer?.id ?? null,
      customerName: customer?.name ?? null,
      supplierId: supplier?.id ?? null,
      supplierName: supplier?.name ?? null,
      vehicleId: vehicle.id,
      vehiclePlateNo: vehicle.plateNo,
      grossWeight: capturedWeight!,
      tareWeight: null,
      netWeight: null,
      weighInAt: formatNow(),
      weighOutAt: null,
      unitPrice: product.unitPrice,
      totalAmount: null,
      notes,
      voidReason: null,
      operatorId,
      operatorName,
      createdAt: formatNow(),
    };

    onSave(ticket);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);

    // Reset form
    setProductId('');
    setCustomerId('');
    setSupplierId('');
    setVehicleId('');
    setNotes('');
    setCapturedWeight(null);
  };

  const activeProducts = products.filter(p => p.isActive);
  const activeCustomers = customers.filter(c => c.isActive);
  const activeSuppliers = suppliers.filter(s => s.isActive);
  const activeVehicles = vehicles.filter(v => v.isActive);

  const selectedVehicleObj = activeVehicles.find(v => v.id === Number(vehicleId));
  const prevWeight = selectedVehicleObj?.tareWeight || 0;
  const currentGross = capturedWeight !== null ? capturedWeight : liveWeight;
  const weightAdded = Math.max(0, currentGross - prevWeight);

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Loading Operations</h2>
            <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              Formerly Weigh In
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Before loading activity: View previous weight, weight added in bay, and gross weight
          </p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-medium animate-pulse">
            ✓ Loading record saved successfully!
          </div>
        )}
      </div>

      {/* ── Before Loading Activity Display (Requirement 6) ────────── */}
      <div className="bg-gradient-to-r from-blue-50 via-slate-50 to-emerald-50 border border-blue-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
            <Scale className="w-4 h-4 text-blue-600" />
            Before Loading Activity — Weight Calculation & Preview
          </p>
          <span className="text-[11px] text-slate-500 font-medium">
            Vehicle: {selectedVehicleObj ? selectedVehicleObj.plateNo : 'Select Vehicle below'}
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Previous Weight (Tare)
            </p>
            <p className="text-xl font-mono font-black text-slate-800 mt-1">
              {prevWeight.toLocaleString()} kg
            </p>
            <p className="text-[10px] text-slate-400">Empty vehicle weight</p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-blue-200 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
              Weight Added in Bay
            </p>
            <p className="text-xl font-mono font-black text-blue-700 mt-1">
              +{weightAdded.toLocaleString()} kg
            </p>
            <p className="text-[10px] text-blue-500">Material loaded in bay</p>
          </div>

          <div className="p-3 bg-white rounded-lg border border-emerald-200 shadow-xs">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Gross Weight
            </p>
            <p className="text-xl font-mono font-black text-emerald-800 mt-1">
              {currentGross.toLocaleString()} kg
            </p>
            <p className="text-[10px] text-emerald-500">Previous + Weight Added</p>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ── Live Scale Display ──────────────────────────────────── */}
        <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Scale className="w-4 h-4 text-emerald-500" />
            Live Scale Reading
          </h3>

          {/* Scale status indicator */}
          <div className="flex items-center gap-2 mb-4">
            <span className={cn(
              'w-2 h-2 rounded-full',
              scaleConnected ? (scaleStable ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse') : 'bg-red-500'
            )} />
            <span className="text-xs text-slate-500">
              {scaleConnected ? (scaleStable ? 'Stable' : 'Stabilizing...') : 'Disconnected'}
            </span>
          </div>

          {/* Weight display - mirrors the large lblWeight in VB6 */}
          <div className={cn(
            'bg-slate-900 rounded-xl p-6 text-center mb-4',
            scaleStable ? 'ring-2 ring-emerald-500' : ''
          )}>
            <p className="text-4xl font-mono font-bold text-emerald-400 tracking-wider">
              {liveWeight.toLocaleString()}
            </p>
            <p className="text-slate-500 text-xs mt-1">kg</p>
          </div>

          {/* Capture button - like clicking "Read" in VB6 */}
          <button
            onClick={captureWeight}
            className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2"
          >
            <Zap className="w-4 h-4" /> Capture Loading Weight
          </button>

          {/* Captured weight display */}
          {capturedWeight !== null && (
            <div className="mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <p className="text-xs text-emerald-600 font-medium">Captured Gross Weight</p>
              <p className="text-2xl font-bold text-emerald-800 font-mono">
                {capturedWeight.toLocaleString()} kg
              </p>
            </div>
          )}
          {errors.weight && <p className="text-xs text-red-500 mt-2">{errors.weight}</p>}
        </div>

        {/* ── Ticket Form ────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow border border-slate-200 p-6">
          <h3 className="font-bold text-slate-800 mb-4">Loading Ticket Details</h3>

          <div className="space-y-4">
            {/* Transaction Type */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Transaction Type *</label>
              <div className="grid grid-cols-2 gap-3">
                {(['purchase', 'sale'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTicketType(t)}
                    className={cn(
                      'py-2.5 px-4 rounded-lg border text-sm font-medium transition text-center',
                      ticketType === t
                        ? (t === 'purchase' ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-green-50 border-green-300 text-green-700')
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    )}
                  >
                    {t === 'purchase' ? '⬇️ Purchase (Buying In)' : '⬆️ Sale (Selling Out)'}
                  </button>
                ))}
              </div>
            </div>

            {/* Product Selection - mirrors cboProduct in VB6 */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Product / Commodity *</label>
              <select
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className={cn(
                  'w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none',
                  errors.product ? 'border-red-300' : 'border-slate-300'
                )}
              >
                <option value="">— Select Product —</option>
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} — {p.name} ({p.unit} @ ₹ {p.unitPrice})
                  </option>
                ))}
              </select>
              {errors.product && <p className="text-xs text-red-500 mt-1">{errors.product}</p>}
            </div>

            {/* Customer/Supplier - mirrors cboCustomer / cboSupplier */}
            {ticketType === 'sale' ? (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Customer *</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none',
                    errors.customer ? 'border-red-300' : 'border-slate-300'
                  )}
                >
                  <option value="">— Select Customer —</option>
                  {activeCustomers.map((c) => (
                    <option key={c.id} value={c.id}>{c.code} — {c.name}</option>
                  ))}
                </select>
                {errors.customer && <p className="text-xs text-red-500 mt-1">{errors.customer}</p>}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Supplier *</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none',
                    errors.supplier ? 'border-red-300' : 'border-slate-300'
                  )}
                >
                  <option value="">— Select Supplier —</option>
                  {activeSuppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                  ))}
                </select>
                {errors.supplier && <p className="text-xs text-red-500 mt-1">{errors.supplier}</p>}
              </div>
            )}

            {/* Vehicle - mirrors cboVehicle */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle *</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className={cn(
                  'w-full px-3 py-2.5 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none',
                  errors.vehicle ? 'border-red-300' : 'border-slate-300'
                )}
              >
                <option value="">— Select Vehicle —</option>
                {activeVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.plateNo} — {v.driverName} {v.tareWeight ? `(Tare: ${v.tareWeight.toLocaleString()} kg)` : ''}
                  </option>
                ))}
              </select>
              {errors.vehicle && <p className="text-xs text-red-500 mt-1">{errors.vehicle}</p>}
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optional notes..."
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={handleSave}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <Save className="w-4 h-4" /> Save Loading Ticket
              </button>
              <button
                onClick={() => {
                  setProductId(''); setCustomerId(''); setSupplierId('');
                  setVehicleId(''); setNotes(''); setCapturedWeight(null);
                  setErrors({});
                }}
                className="px-6 py-3 border border-slate-300 text-slate-600 font-medium rounded-lg hover:bg-slate-50 transition flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" /> Clear
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
