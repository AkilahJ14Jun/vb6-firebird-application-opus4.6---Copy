/**
 * ============================================================================
 * WEIGH-OUT PAGE
 * ============================================================================
 * Replaces: frmWeighOut from VB6
 *
 * ORIGINAL VB6 BEHAVIOR:
 *   1. Operator selects an open ticket from list/combo
 *   2. Scale reads tare weight (empty vehicle)
 *   3. System calculates: Net Weight = Gross Weight - Tare Weight
 *   4. System calculates: Total Amount = Net Weight × Unit Price
 *   5. Ticket status changes to CLOSED
 *   6. SP_CLOSE_TICKET creates a TRANSACTION record
 *   7. Ticket prints with all weights and amount
 *
 * MODERN IMPLEMENTATION:
 *   - Shows all open tickets in a selectable list
 *   - Live scale display for tare weight capture
 *   - Auto-calculates net weight and total amount
 *   - Option to use vehicle's known tare weight
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';
import type { Ticket } from '@/types';
// formatNow would be used in production for timestamp recording
import { Scale, CheckCircle2, Zap, AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

interface WeighOutPageProps {
  /** Only open tickets can be weighed out */
  tickets: Ticket[];
  onComplete: (ticketId: number, tareWeight: number) => void;
}

export function WeighOutPage({ tickets, onComplete }: WeighOutPageProps) {
  const openTickets = tickets.filter(t => t.status === 'open');
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);

  /* ── Simulated Scale (same approach as WeighIn) ───────────────────── */
  const [liveWeight, setLiveWeight] = useState(0);
  const [scaleStable, setScaleStable] = useState(false);
  const [capturedTare, setCapturedTare] = useState<number | null>(null);

  useEffect(() => {
    // Simulate a tare weight (lighter vehicle without cargo)
    const targetWeight = 4000 + Math.random() * 6000;
    let currentWeight = 0;
    const interval = setInterval(() => {
      if (currentWeight < targetWeight) {
        currentWeight += targetWeight / 15 + (Math.random() - 0.5) * 300;
        if (currentWeight > targetWeight) currentWeight = targetWeight;
        setScaleStable(false);
      } else {
        currentWeight = targetWeight + (Math.random() - 0.5) * 15;
        setScaleStable(true);
      }
      setLiveWeight(Math.round(currentWeight));
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const captureWeight = useCallback(() => {
    setCapturedTare(liveWeight);
  }, [liveWeight]);

  const selectedTicket = openTickets.find(t => t.id === selectedTicketId);
  const netWeight = selectedTicket && capturedTare
    ? (selectedTicket.grossWeight || 0) - capturedTare
    : null;
  const totalAmount = netWeight && selectedTicket?.unitPrice
    ? Math.round(netWeight * selectedTicket.unitPrice * 100) / 100
    : null;

  const handleComplete = () => {
    if (!selectedTicketId || !capturedTare) return;
    onComplete(selectedTicketId, capturedTare);
    setCompleted(true);
    setSelectedTicketId(null);
    setCapturedTare(null);
    setTimeout(() => setCompleted(false), 3000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800">Unloading Operations</h2>
            <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
              Formerly Weigh Out
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">
            Before unloading activity: View previous weight, weight offloaded in bay, and gross weight after unloading
          </p>
        </div>
        {completed && (
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-medium">
            ✓ Unloading completed and ticket closed successfully!
          </div>
        )}
      </div>

      {openTickets.length === 0 ? (
        <div className="bg-white rounded-xl shadow border border-slate-200 p-12 text-center">
          <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-600">No Open Tickets for Unloading</h3>
          <p className="text-sm text-slate-400 mt-1">All tickets have been completed. Create a new loading ticket first.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* ── Before Unloading Activity Display (Requirement 7) ────────── */}
          {selectedTicket && (
            <div className="bg-gradient-to-r from-amber-50 via-slate-50 to-purple-50 border border-amber-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-amber-600" />
                  Before Unloading Activity — Weight Calculation & Preview
                </p>
                <span className="text-[11px] text-slate-500 font-medium">
                  Ticket: <strong className="font-mono">{selectedTicket.ticketNo}</strong> ({selectedTicket.vehiclePlateNo})
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-white rounded-lg border border-slate-200 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Previous Weight (Before Unloading)
                  </p>
                  <p className="text-xl font-mono font-black text-slate-800 mt-1">
                    {selectedTicket.grossWeight?.toLocaleString()} kg
                  </p>
                  <p className="text-[10px] text-slate-400">Gross loaded weight</p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-amber-200 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                    Weight Offloaded in Bay
                  </p>
                  <p className="text-xl font-mono font-black text-amber-700 mt-1">
                    -{netWeight ? netWeight.toLocaleString() : (selectedTicket.grossWeight ? (selectedTicket.grossWeight - liveWeight).toLocaleString() : '—')} kg
                  </p>
                  <p className="text-[10px] text-amber-500">Material offloaded / discharged</p>
                </div>

                <div className="p-3 bg-white rounded-lg border border-purple-200 shadow-xs">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-purple-600">
                    Gross Weight After Unloading
                  </p>
                  <p className="text-xl font-mono font-black text-purple-800 mt-1">
                    {(capturedTare ? capturedTare : liveWeight).toLocaleString()} kg
                  </p>
                  <p className="text-[10px] text-purple-500">Previous - Offloaded (Empty Tare)</p>
                </div>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-3 gap-6">
            {/* ── Open Tickets List ────────────────────────────────── */}
            <div className="bg-white rounded-xl shadow border border-slate-200 p-4">
              <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2 text-sm">
                <Scale className="w-4 h-4 text-amber-500" />
                Select Ticket for Unloading ({openTickets.length})
              </h3>
              <div className="space-y-2">
                {openTickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => { setSelectedTicketId(t.id); setCapturedTare(null); }}
                    className={cn(
                      'w-full text-left p-3 rounded-lg border transition',
                      selectedTicketId === t.id
                        ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-800">{t.ticketNo}</span>
                      <span className={cn(
                        'text-[10px] font-bold px-1.5 py-0.5 rounded',
                        t.type === 'purchase' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      )}>
                        {t.type === 'purchase' ? 'BUY' : 'SELL'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{t.vehiclePlateNo} · {t.productName}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Previous Gross: {t.grossWeight?.toLocaleString()} kg · In: {t.weighInAt?.split(' ')[1]}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Scale & Weighing ────────────────────────────────── */}
            <div className="lg:col-span-2 space-y-4">
              {/* Scale Display */}
              <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
                <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Scale className="w-4 h-4 text-emerald-500" />
                  Scale — Unloaded / Tare Weight Reading
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    scaleStable ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
                  )} />
                  <span className="text-xs text-slate-500">{scaleStable ? 'Stable' : 'Stabilizing...'}</span>
                </div>
                <div className={cn(
                  'bg-slate-900 rounded-xl p-6 text-center mb-4',
                  scaleStable ? 'ring-2 ring-emerald-500' : ''
                )}>
                  <p className="text-4xl font-mono font-bold text-emerald-400 tracking-wider">
                    {liveWeight.toLocaleString()}
                  </p>
                  <p className="text-slate-500 text-xs mt-1">kg (Weight After Unloading)</p>
                </div>
                <button
                  onClick={captureWeight}
                  disabled={!selectedTicketId}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                >
                  <Zap className="w-4 h-4" /> Capture Unloaded Tare Weight
                </button>
              </div>

              {/* Calculation Summary — mirrors the summary section in frmWeighOut */}
              {selectedTicket && (
                <div className="bg-white rounded-xl shadow border border-slate-200 p-6">
                  <h3 className="font-bold text-slate-800 mb-4">Unloading Weight Breakdown</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-4 bg-blue-50 rounded-lg text-center border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium">Previous Weight</p>
                      <p className="text-xl font-bold text-blue-800 font-mono mt-1">
                        {selectedTicket.grossWeight?.toLocaleString()}
                      </p>
                      <p className="text-[10px] text-blue-500">kg (Before Unloading)</p>
                    </div>
                    <div className="p-4 bg-amber-50 rounded-lg text-center border border-amber-200">
                      <p className="text-xs text-amber-600 font-medium">Weight Offloaded</p>
                      <p className="text-xl font-bold text-amber-800 font-mono mt-1">
                        {netWeight ? netWeight.toLocaleString() : '—'}
                      </p>
                      <p className="text-[10px] text-amber-500">kg (Offloaded in Bay)</p>
                    </div>
                    <div className={cn(
                      'p-4 rounded-lg text-center border',
                      capturedTare ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'
                    )}>
                      <p className="text-xs text-purple-600 font-medium">Gross After Unloading</p>
                      <p className="text-xl font-bold text-purple-800 font-mono mt-1">
                        {capturedTare ? capturedTare.toLocaleString() : '—'}
                      </p>
                      <p className="text-[10px] text-purple-500">kg (Vehicle Tare)</p>
                    </div>
                  </div>

                  {/* Amount calculation */}
                  {totalAmount !== null && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-xs text-purple-600">Unit Price: ₹ {selectedTicket.unitPrice} / {products_unit(selectedTicket)}</p>
                          <p className="text-xs text-purple-500 mt-0.5">
                            {netWeight?.toLocaleString()} kg × ₹ {selectedTicket.unitPrice}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-purple-600 font-medium">Total Amount</p>
                          <p className="text-2xl font-bold text-purple-800">₹ {totalAmount.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Complete button */}
                  <button
                    onClick={handleComplete}
                    disabled={!capturedTare || !netWeight || netWeight <= 0}
                    className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20"
                  >
                    <CheckCircle2 className="w-5 h-5" /> Complete Unloading & Close Ticket
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Helper to display unit info */
function products_unit(_ticket: Ticket): string {
  return 'kg';
}
