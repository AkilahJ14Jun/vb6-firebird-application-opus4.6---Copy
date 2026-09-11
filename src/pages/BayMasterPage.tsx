/**
 * ============================================================================
 * BAY MASTER PAGE (ADMINISTRATION SECTION)
 * ============================================================================
 * As specified in Changes required.txt (Requirement 7):
 * "Another page in 'Administration' section to be added for adding bays to a
 * separate master table which will have bay number, bay name, items avaliable
 * in that bay and handler assigned for that bay."
 * ============================================================================
 */

import { useState } from 'react';
import type { BayMaster, WarehouseEmployee, Product } from '@/types';
import {
  Layers, Plus, Search, Edit2, Trash2, ToggleLeft, ToggleRight,
  ShieldCheck, X, Check, Package, MapPin, UserCheck
} from 'lucide-react';
import { cn } from '@/utils/cn';

interface BayMasterPageProps {
  bays: BayMaster[];
  handlers: WarehouseEmployee[];
  products: Product[];
  onUpdateBays: (bays: BayMaster[]) => void;
  currentUserRole?: string;
}

export function BayMasterPage({
  bays,
  handlers,
  products,
  onUpdateBays,
  currentUserRole,
}: BayMasterPageProps) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editBay, setEditBay] = useState<BayMaster | null>(null);

  // Form states
  const [bayNumber, setBayNumber] = useState<number>(1);
  const [bayName, setBayName] = useState('');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [customItemInput, setCustomItemInput] = useState('');
  const [selectedHandlerName, setSelectedHandlerName] = useState('');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const activeHandlers = handlers.filter(h => h.role === 'handler' || h.role === 'supervisor');

  const filteredBays = bays.filter(b => {
    const q = search.toLowerCase();
    return (
      b.bayName.toLowerCase().includes(q) ||
      b.bayNumber.toString().includes(q) ||
      b.handlerName.toLowerCase().includes(q) ||
      b.items.some(item => item.toLowerCase().includes(q))
    );
  });

  const openAddModal = () => {
    const nextBayNumber = bays.length > 0 ? Math.max(...bays.map(b => b.bayNumber)) + 1 : 1;
    setEditBay(null);
    setBayNumber(nextBayNumber);
    setBayName(`Bay ${nextBayNumber} (${products[0]?.category || 'General Cargo'})`);
    setSelectedItems(products.slice(0, 2).map(p => p.name));
    setCustomItemInput('');
    setSelectedHandlerName(activeHandlers[0]?.name || 'S. Mani');
    setDescription('');
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (bay: BayMaster) => {
    setEditBay(bay);
    setBayNumber(bay.bayNumber);
    setBayName(bay.bayName);
    setSelectedItems([...bay.items]);
    setCustomItemInput('');
    setSelectedHandlerName(bay.handlerName);
    setDescription(bay.description || '');
    setFormError(null);
    setShowModal(true);
  };

  const toggleBayActive = (id: number) => {
    onUpdateBays(bays.map(b => (b.id === id ? { ...b, isActive: !b.isActive } : b)));
  };

  const handleDeleteBay = (id: number) => {
    if (confirm('Are you sure you want to delete this bay from the master table?')) {
      onUpdateBays(bays.filter(b => b.id !== id));
    }
  };

  const handleAddItem = (itemName: string) => {
    const trimmed = itemName.trim();
    if (!trimmed) return;
    if (!selectedItems.includes(trimmed)) {
      setSelectedItems(prev => [...prev, trimmed]);
    }
    setCustomItemInput('');
  };

  const handleRemoveItem = (itemName: string) => {
    setSelectedItems(prev => prev.filter(i => i !== itemName));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bayName.trim()) {
      setFormError('Please enter a valid bay name.');
      return;
    }
    if (selectedItems.length === 0) {
      setFormError('Please assign at least one item available in this bay.');
      return;
    }
    if (!selectedHandlerName) {
      setFormError('Please assign a handler for this bay.');
      return;
    }

    const matchedHandler = activeHandlers.find(h => h.name === selectedHandlerName);

    if (editBay) {
      onUpdateBays(
        bays.map(b =>
          b.id === editBay.id
            ? {
                ...b,
                bayNumber,
                bayName: bayName.trim(),
                items: selectedItems,
                handlerId: matchedHandler?.id,
                handlerName: selectedHandlerName,
                description: description.trim(),
              }
            : b
        )
      );
    } else {
      const newBay: BayMaster = {
        id: bays.length > 0 ? Math.max(...bays.map(b => b.id)) + 1 : 1,
        bayNumber,
        bayName: bayName.trim(),
        items: selectedItems,
        handlerId: matchedHandler?.id,
        handlerName: selectedHandlerName,
        description: description.trim(),
        isActive: true,
      };
      onUpdateBays([...bays, newBay]);
    }

    setShowModal(false);
  };

  const isAdmin = currentUserRole === 'admin' || currentUserRole === 'system_admin' || !currentUserRole;

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            Bay Master Management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Configure warehouse loading bays, available items per bay, and assigned Bay Handlers (Administration Section).
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add New Bay
          </button>
        )}
      </div>

      {/* ── Summary Stats ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bays</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">{bays.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Bays</p>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">
              {bays.filter(b => b.isActive).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Handlers</p>
            <p className="text-2xl font-black text-blue-600 font-mono mt-1">
              {new Set(bays.map(b => b.handlerName)).size}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Unique Items Mapped</p>
            <p className="text-2xl font-black text-purple-600 font-mono mt-1">
              {new Set(bays.flatMap(b => b.items)).size}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
            <Package className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ── Search Bar ──────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search bays by number, name, handler, or items available..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-xs"
        />
      </div>

      {/* ── Master Data Table ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase text-xs tracking-wider">
              <tr>
                <th className="py-3 px-4 w-20">Bay #</th>
                <th className="py-3 px-4 min-w-[200px]">Bay Name & Location</th>
                <th className="py-3 px-4 min-w-[280px]">Items Available in Bay</th>
                <th className="py-3 px-4 min-w-[180px]">Assigned Handler</th>
                <th className="py-3 px-4 text-center w-24">Status</th>
                {isAdmin && <th className="py-3 px-4 text-right w-28">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBays.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="py-8 text-center text-slate-400">
                    No bays found matching your search. Click "Add New Bay" to register one.
                  </td>
                </tr>
              ) : (
                filteredBays.map(bay => (
                  <tr key={bay.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-black text-indigo-700">
                      #{bay.bayNumber}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        {bay.bayName}
                      </div>
                      {bay.description && (
                        <p className="text-xs text-slate-500 mt-0.5">{bay.description}</p>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1.5">
                        {bay.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            <Package className="w-3 h-3 text-slate-400" />
                            {item}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        {bay.handlerName}
                      </div>
                      <span className="text-[11px] text-slate-400">Bay Handler In-Charge</span>
                    </td>

                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => toggleBayActive(bay.id)}
                        title="Toggle Active Status"
                        className="inline-flex items-center gap-1 text-xs font-semibold focus:outline-none"
                      >
                        {bay.isActive ? (
                          <span className="flex items-center text-emerald-600">
                            <ToggleRight className="w-6 h-6 mr-1" />
                            Active
                          </span>
                        ) : (
                          <span className="flex items-center text-slate-400">
                            <ToggleLeft className="w-6 h-6 mr-1" />
                            Inactive
                          </span>
                        )}
                      </button>
                    </td>

                    {isAdmin && (
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEditModal(bay)}
                            title="Edit Bay"
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteBay(bay.id)}
                            title="Delete Bay"
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Add / Edit Bay Modal ─────────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">
                  {editBay ? `Edit Bay #${editBay.bayNumber}` : 'Add New Warehouse Bay'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-semibold">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Bay Number *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={bayNumber}
                    onChange={e => setBayNumber(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                    Bay Name / Descriptor *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bay 1 (North Bulk Hopper)"
                    value={bayName}
                    onChange={e => setBayName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              {/* Handler Assigned */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Handler Assigned for that Bay *
                </label>
                <select
                  value={selectedHandlerName}
                  onChange={e => setSelectedHandlerName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {activeHandlers.map(h => (
                    <option key={h.id} value={h.name}>
                      {h.name} ({h.phone}) — {h.role.toUpperCase()}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  This handler will be automatically allocated during DO planning and loading/unloading.
                </p>
              </div>

              {/* Items Available in that Bay */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Items Available in this Bay *
                </label>

                {/* Badges of selected items */}
                <div className="min-h-[42px] p-2 bg-slate-50 border border-slate-200 rounded-lg flex flex-wrap gap-1.5 mb-2">
                  {selectedItems.length === 0 ? (
                    <span className="text-slate-400 text-xs italic">No items selected yet</span>
                  ) : (
                    selectedItems.map((item, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-100 text-indigo-800 text-xs font-medium"
                      >
                        {item}
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item)}
                          className="text-indigo-600 hover:text-indigo-900 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))
                  )}
                </div>

                {/* Quick select from product catalogue */}
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">
                    Quick Pick from Product Catalog:
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto p-1.5 border border-slate-200 rounded bg-white">
                    {products.map(p => {
                      const isSelected = selectedItems.includes(p.name);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => (isSelected ? handleRemoveItem(p.name) : handleAddItem(p.name))}
                          className={cn(
                            'px-2 py-0.5 rounded text-[11px] transition font-medium border',
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                          )}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Or add custom item */}
                <div className="flex gap-2 mt-2">
                  <input
                    type="text"
                    placeholder="Or type custom item name..."
                    value={customItemInput}
                    onChange={e => setCustomItemInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddItem(customItemInput);
                      }
                    }}
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddItem(customItemInput)}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded font-semibold text-xs transition"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Description / Notes */}
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">
                  Description / Equipment Details (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Overhead crane gantry for billets, scrap steel, and rebar bundles"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm"
                >
                  {editBay ? 'Save Changes' : 'Create Bay'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
