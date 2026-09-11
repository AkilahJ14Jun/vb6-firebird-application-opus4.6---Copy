/**
 * ============================================================================
 * DELIVERY ORDER MODAL & PRINT VIEW
 * ============================================================================
 * Displays official Delivery Order (DO) generated upon completion of the
 * planning task, recording planning time, bay handlers, items, and planned weights.
 * ============================================================================
 */

import React from 'react';
import type { DeliveryOrderPlan } from '@/types';
import { QRCodeSvg } from './QRCodeSvg';
import { Printer, X, FileText, User, ShieldCheck } from 'lucide-react';
import { formatDuration } from '@/store/appStore';

interface DeliveryOrderModalProps {
  order: DeliveryOrderPlan | null;
  onClose: () => void;
}

export const DeliveryOrderModal: React.FC<DeliveryOrderModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  const handlePrint = () => {
    window.print();
  };

  const qrData = JSON.stringify({
    do: order.doNumber,
    veh: order.vehicleNumber,
    cust: order.customerName,
    sup: order.supervisorName,
    wgt: order.totalPlannedWeightKg,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-do, #printable-do * {
            visibility: visible !important;
          }
          #printable-do {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 10mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Delivery Order — {order.doNumber}</h3>
              <p className="text-xs text-slate-400">Warehouse Planning Completion Document</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Printable Document */}
        <div className="p-6 md:p-8 bg-white" id="printable-do">
          {/* Document Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">DELIVERY ORDER</h1>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-semibold mt-0.5">
                WAREHOUSE LOADING AUTHORIZATION
              </p>
            </div>
            <div className="text-right flex items-center sm:flex-col sm:items-end gap-3 sm:gap-1">
              <div className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md font-mono text-sm font-bold">
                {order.doNumber}
              </div>
              <p className="text-xs text-slate-500">Date: {order.createdAt}</p>
            </div>
          </div>

          {/* Time Tracking & Planning Phase Summary (as required) */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 my-4 p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
            <div>
              <span className="text-slate-500 block">In Time (Entry):</span>
              <span className="font-bold text-slate-800 font-mono text-sm">{order.inTime}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Planning Duration:</span>
              <span className="font-bold text-blue-700 font-mono text-sm">
                {formatDuration(order.planningDurationSeconds)}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Out Time (Plan Done):</span>
              <span className="font-bold text-emerald-700 font-mono text-sm">{order.outTime}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Assigned By (Planner):</span>
              <span className="font-bold text-indigo-900 text-sm flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                {order.plannerName || 'N. Rajesh'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 block">Supervisor In-Charge:</span>
              <span className="font-bold text-slate-900 text-sm flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                {order.supervisorName}
              </span>
            </div>
          </div>

          {/* Vehicle & Customer Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2 border-b text-sm">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Vehicle & Driver
              </h4>
              <div className="space-y-1">
                <p className="text-slate-700">
                  <span className="text-slate-500 w-28 inline-block">Vehicle No:</span>
                  <span className="font-mono font-bold text-slate-900 uppercase">
                    {order.vehicleNumber}
                  </span>{' '}
                  ({order.vehicleType})
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-500 w-28 inline-block">Driver Name:</span>
                  <span className="font-medium text-slate-900">{order.driverName}</span>
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-500 w-28 inline-block">Mobile:</span>
                  <span className="font-mono text-slate-900">{order.driverPhone}</span>
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-500 w-28 inline-block">Entry Slip No:</span>
                  <span className="font-mono text-slate-900">{order.slipNo}</span>
                </p>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                Customer & Cargo
              </h4>
              <div className="space-y-1">
                <p className="text-slate-700">
                  <span className="text-slate-500 w-28 inline-block">Customer:</span>
                  <span className="font-bold text-slate-900">{order.customerName}</span>
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-500 w-28 inline-block">Material Category:</span>
                  <span className="font-medium text-slate-900">{order.material}</span>
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-500 w-28 inline-block">Assigned Bays:</span>
                  <span className="font-bold text-slate-900">{order.baysCount} Bay(s)</span>
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-500 w-28 inline-block">Total Planned Wgt:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {order.totalPlannedWeightKg.toLocaleString()} kg
                  </span>
                </p>
                <p className="text-slate-700">
                  <span className="text-slate-500 w-28 inline-block">Weight Tolerance:</span>
                  <span className="font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    ±{order.weightToleranceKg ?? 50} kg
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Bay Allocations Table */}
          <div className="mt-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Bay Loading Plan & Handler Assignments
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-semibold uppercase">
                  <tr>
                    <th className="py-2.5 px-3">Bay #</th>
                    <th className="py-2.5 px-3">Bay Description</th>
                    <th className="py-2.5 px-3">Assigned Handler</th>
                    <th className="py-2.5 px-3">Item / Material</th>
                    <th className="py-2.5 px-3 text-right">Planned Weight</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {order.items.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80">
                      <td className="py-2.5 px-3 font-bold text-slate-800">
                        Bay {item.bayNumber}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{item.bayName}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">{item.handlerName}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {item.itemName}{' '}
                        {item.itemCode && (
                          <span className="text-slate-400 font-mono text-[11px]">({item.itemCode})</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                        {item.plannedWeightKg.toLocaleString()} kg
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-bold border-t border-slate-200 text-sm">
                    <td colSpan={4} className="py-2.5 px-3 text-right text-slate-700">
                      TOTAL PLANNED WEIGHT:
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                      {order.totalPlannedWeightKg.toLocaleString()} kg
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer with QR Code & Authorization Signatures */}
          <div className="mt-6 pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="p-1 border border-slate-200 rounded-lg bg-white shadow-sm">
                <QRCodeSvg value={qrData} size={84} />
              </div>
              <div className="text-[11px] text-slate-500 max-w-[220px]">
                <p className="font-semibold text-slate-700">Scan at Loading Bay</p>
                <p>Handlers must verify DO before opening loading chutes or loading bays.</p>
              </div>
            </div>

            <div className="flex gap-4 sm:gap-6 text-center text-xs">
              <div className="w-28 sm:w-32 pt-8 border-t border-slate-300">
                <p className="font-medium text-slate-800">{order.plannerName || 'N. Rajesh'}</p>
                <p className="text-[10px] text-slate-400 uppercase">Planner Signature</p>
              </div>
              <div className="w-28 sm:w-32 pt-8 border-t border-slate-300">
                <p className="font-medium text-slate-800">{order.supervisorName}</p>
                <p className="text-[10px] text-slate-400 uppercase">Supervisor Signature</p>
              </div>
              <div className="w-28 sm:w-32 pt-8 border-t border-slate-300">
                <p className="font-medium text-slate-800">{order.driverName}</p>
                <p className="text-[10px] text-slate-400 uppercase">Driver Acknowledgment</p>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Delivery Order
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 hover:bg-white text-slate-700 font-medium text-sm rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
