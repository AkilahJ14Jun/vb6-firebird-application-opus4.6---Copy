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

import React from 'react';
import type { VehicleEntry } from '@/types';
import { EntrySlipDocument } from './EntrySlipDocument';
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
  if (!entry) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      {/* Printable CSS injected for high precision thermal print */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-modal-slip, #printable-modal-slip * {
            visibility: visible !important;
          }
          #printable-modal-slip {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            margin: 0 !important;
            padding: 4mm !important;
            box-shadow: none !important;
            border: 1.5px solid #000 !important;
            background: #fff !important;
            color: #000 !important;
            z-index: 999999 !important;
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
          <EntrySlipDocument
            entry={entry}
            companyName={companyName}
            id="printable-modal-slip"
          />
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
