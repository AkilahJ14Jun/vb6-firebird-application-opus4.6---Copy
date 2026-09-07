/**
 * ============================================================================
 * ENTRY SLIP MODAL & PRINT RECEIPT
 * ============================================================================
 * Exactly mirrors the physical thermal receipt sample from 'Entry slip.jpg':
 *
 * Header: Meghalai steels (or Company Name)
 * ┌─────────────────┬──────────────────┐
 * │ Receipt No      │ SR27G010         │
 * │ Entry Time      │ 08:29:20         │
 * │ Vehicle Number  │ TN38CW6762       │
 * │ Driver name     │ MS               │
 * │ Mobile Number   │ RANGA            │
 * │ 1st Wgt S.No    │ 908              │
 * │ Entry Weight    │ 2690             │
 * └─────────────────┴──────────────────┘
 * QR Code at bottom
 * ============================================================================
 */

import React, { useRef } from 'react';
import type { VehicleEntry } from '@/types';
import { QRCodeSvg } from './QRCodeSvg';
import { Printer, X, CheckCircle2 } from 'lucide-react';

interface EntrySlipModalProps {
  entry: VehicleEntry | null;
  companyName?: string;
  onClose: () => void;
}

export const EntrySlipModal: React.FC<EntrySlipModalProps> = ({
  entry,
  companyName = 'Meghalai steels',
  onClose,
}) => {
  const slipRef = useRef<HTMLDivElement>(null);

  if (!entry) return null;

  const handlePrint = () => {
    window.print();
  };

  // Construct QR Payload text
  const qrPayload = JSON.stringify({
    slip: entry.slipNo,
    time: entry.entryTime,
    veh: entry.vehicleNumber,
    drv: entry.driverName,
    mob: entry.mobileNumber,
    seq: entry.firstWgtSeqNo,
    wgt: entry.entryWeight,
    cust: entry.customerName,
    mat: entry.material,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Printable CSS injected for high precision thermal print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-entry-slip, #printable-entry-slip * {
            visibility: visible !important;
          }
          #printable-entry-slip {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between no-print">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm">Vehicle Entry Slip</h3>
              <p className="text-xs text-slate-400">Entry Gate Approval Receipt</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - Physical Slip Preview */}
        <div className="p-6 bg-slate-100 flex flex-col items-center">
          <div
            id="printable-entry-slip"
            ref={slipRef}
            className="bg-white text-slate-900 w-[300px] border-2 border-slate-900 p-3 shadow-md font-sans"
          >
            {/* Header: Company Name */}
            <div className="text-center pb-2 border-b-2 border-slate-900">
              <h1 className="text-lg font-bold tracking-tight text-slate-900 uppercase">
                {entry.customerName || companyName}
              </h1>
              <p className="text-[10px] text-slate-600 font-mono">GATE ENTRY & WEIGHMENT SLIP</p>
            </div>

            {/* Receipt Table matching Entry slip.jpg */}
            <table className="w-full border-collapse text-xs mt-1 border-b-2 border-slate-900">
              <tbody>
                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-2 font-medium border-r-2 border-slate-900 text-slate-800 w-[45%]">
                    Receipt No
                  </td>
                  <td className="py-1.5 px-2 font-black text-sm text-slate-950 font-mono">
                    {entry.slipNo}
                  </td>
                </tr>

                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-2 font-medium border-r-2 border-slate-900 text-slate-800">
                    Entry Time
                  </td>
                  <td className="py-1.5 px-2 font-semibold text-slate-900 font-mono">
                    {entry.entryTime}
                  </td>
                </tr>

                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-2 font-medium border-r-2 border-slate-900 text-slate-800">
                    Vehicle Number
                  </td>
                  <td className="py-1.5 px-2 font-bold text-slate-900 font-mono uppercase tracking-wider">
                    {entry.vehicleNumber}
                  </td>
                </tr>

                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-2 font-medium border-r-2 border-slate-900 text-slate-800">
                    Driver name
                  </td>
                  <td className="py-1.5 px-2 font-semibold text-slate-900 uppercase">
                    {entry.driverName}
                  </td>
                </tr>

                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-2 font-medium border-r-2 border-slate-900 text-slate-800">
                    Mobile Number
                  </td>
                  <td className="py-1.5 px-2 font-semibold text-slate-900 font-mono">
                    {entry.mobileNumber}
                  </td>
                </tr>

                <tr className="border-b border-slate-900">
                  <td className="py-1.5 px-2 font-medium border-r-2 border-slate-900 text-slate-800">
                    1st Wgt S.No
                  </td>
                  <td className="py-1.5 px-2 font-bold text-slate-900 font-mono">
                    {entry.firstWgtSeqNo}
                  </td>
                </tr>

                <tr>
                  <td className="py-1.5 px-2 font-medium border-r-2 border-slate-900 text-slate-800">
                    Entry Weight
                  </td>
                  <td className="py-1.5 px-2 font-bold text-base text-slate-900 font-mono">
                    {entry.entryWeight.toLocaleString()} <span className="text-[10px] font-normal">kg</span>
                  </td>
                </tr>
              </tbody>
            </table>

            {/* QR Code Section */}
            <div className="pt-3 pb-1 flex flex-col items-center justify-center">
              <div className="p-1 border border-slate-800 rounded bg-white">
                <QRCodeSvg value={qrPayload} size={118} />
              </div>
              <p className="text-[9px] text-slate-500 font-mono mt-1 text-center">
                Scan QR at weighbridge / planning station
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-slate-200 flex gap-3 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg transition flex items-center justify-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" /> Print Slip (Thermal / Standard)
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-medium text-sm rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
