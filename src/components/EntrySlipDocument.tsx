/**
 * ============================================================================
 * ENTRY SLIP DOCUMENT COMPONENT
 * ============================================================================
 * Exactly mirrors the physical thermal receipt sample from 'Entry slip.jpg':
 *
 * Header: Meghalai steels (or Customer Name)
 * ┌─────────────────┬──────────────────┐
 * │ Receipt No      │ SR27G010         │
 * │ Entry Time      │ 08:29:20         │
 * │ Vehicle Number  │ TN38CW6762       │
 * │ Driver name     │ MS               │
 * │ Mobile Number   │ RANGA            │
 * │ 1st Wgt S.No    │ 908              │
 * │ Entry Weight    │ 2690 kg          │
 * └─────────────────┴──────────────────┘
 * QR Code at bottom
 * ============================================================================
 */

import React from 'react';
import type { VehicleEntry } from '@/types';
import { QRCodeSvg } from './QRCodeSvg';

interface EntrySlipDocumentProps {
  entry: VehicleEntry;
  companyName?: string;
  id?: string;
  className?: string;
}

export const EntrySlipDocument: React.FC<EntrySlipDocumentProps> = ({
  entry,
  companyName = 'Meghalai steels',
  id = 'printable-entry-slip',
  className = '',
}) => {
  // Construct QR Payload text matching the physical entry QR structure
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
    <div
      id={id}
      className={`bg-white text-slate-900 w-full max-w-[290px] border-2 border-slate-900 p-3 shadow-sm font-sans ${className}`}
    >
      {/* Header: Customer Name or Company Name */}
      <div className="text-center pb-2 border-b-2 border-slate-900">
        <h1 className="text-lg font-bold tracking-tight text-slate-900 uppercase leading-snug">
          {entry.customerName || companyName}
        </h1>
        <p className="text-[10px] text-slate-600 font-mono font-semibold">GATE ENTRY & WEIGHMENT SLIP</p>
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
  );
};
