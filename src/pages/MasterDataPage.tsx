/**
 * ============================================================================
 * MASTER DATA PAGES
 * ============================================================================
 * Replaces: frmProduct, frmCustomer, frmSupplier, frmVehicle from VB6
 *
 * ORIGINAL VB6 BEHAVIOR:
 *   Each form had:
 *   - A DataGrid/MSFlexGrid showing all records
 *   - Text fields for Add/Edit
 *   - Buttons: Add New, Save, Delete, Close
 *   - Data loaded via modDatabase: "SELECT * FROM PRODUCTS ORDER BY NAME"
 *
 * MODERN IMPLEMENTATION:
 *   - Unified table component with search and filtering
 *   - Inline status toggle
 *   - Modal dialogs for Add/Edit (replaces separate form windows)
 *   - All four master data entities use the same layout pattern
 * ============================================================================
 */

import { useState } from 'react';
import type { Product, Customer, Supplier, Vehicle } from '@/types';
// cn utility available for conditional styling
import {
  Plus, Search, Edit2, ToggleLeft, ToggleRight,
  Package, Users2, Building2, Truck
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════════════════
 * PRODUCTS PAGE — replaces frmProduct
 * ═══════════════════════════════════════════════════════════════════════════ */
interface ProductsPageProps {
  products: Product[];
  onUpdate: (products: Product[]) => void;
}

export function ProductsPage({ products, onUpdate }: ProductsPageProps) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Product | null>(null);

  const filtered = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
  );

  const toggleActive = (id: number) => {
    onUpdate(products.map(p => p.id === id ? { ...p, isActive: !p.isActive } : p));
  };

  const handleSave = (item: Product) => {
    if (editItem) {
      onUpdate(products.map(p => p.id === item.id ? item : p));
    } else {
      onUpdate([...products, { ...item, id: Math.max(...products.map(p => p.id)) + 1 }]);
    }
    setShowForm(false);
    setEditItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" /> Products
          </h2>
          <p className="text-sm text-slate-500">Manage product catalog (replaces frmProduct)</p>
        </div>
        <button
          onClick={() => { setEditItem(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
        >
          <Plus className="w-4 h-4" /> Add Product
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Search by code, name, or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 font-semibold text-slate-600">Code</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Category</th>
                <th className="px-4 py-3 font-semibold text-slate-600">Unit</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-right">Price (₹)</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-slate-600 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs">{p.code}</td>
                  <td className="px-4 py-3 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.category}</td>
                  <td className="px-4 py-3">{p.unit}</td>
                  <td className="px-4 py-3 text-right font-mono">{p.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggleActive(p.id)} title="Toggle status">
                      {p.isActive ? (
                        <ToggleRight className="w-6 h-6 text-emerald-500 mx-auto" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-slate-300 mx-auto" />
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => { setEditItem(p); setShowForm(true); }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-xs text-slate-500">
          Showing {filtered.length} of {products.length} products
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <ProductForm
          item={editItem}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditItem(null); }}
        />
      )}
    </div>
  );
}

function ProductForm({ item, onSave, onClose }: { item: Product | null; onSave: (p: Product) => void; onClose: () => void }) {
  const [form, setForm] = useState<Product>(
    item || { id: 0, code: '', name: '', category: 'Agricultural', unit: 'kg', unitPrice: 0, isActive: true }
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-slate-800 mb-4">{item ? 'Edit Product' : 'Add Product'}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
            <input value={form.code} onChange={e => setForm({ ...form, code: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Name</label>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Category</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option>Agricultural</option>
                <option>Construction</option>
                <option>Industrial</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
              <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option>kg</option>
                <option>MT</option>
                <option>ton</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Unit Price (₹)</label>
            <input type="number" step="0.01" value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: parseFloat(e.target.value) || 0 })} className="w-full px-3 py-2 border rounded-lg text-sm" />
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSave(form)} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Save</button>
          <button onClick={onClose} className="px-6 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * CUSTOMERS PAGE — replaces frmCustomer
 * ═══════════════════════════════════════════════════════════════════════════ */
interface CustomersPageProps { customers: Customer[]; onUpdate: (items: Customer[]) => void; }
export function CustomersPage({ customers, onUpdate }: CustomersPageProps) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Customer | null>(null);
  const filtered = customers.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase()));

  const handleSave = (item: Customer) => {
    if (editItem) { onUpdate(customers.map(c => c.id === item.id ? item : c)); }
    else { onUpdate([...customers, { ...item, id: Math.max(...customers.map(c => c.id)) + 1 }]); }
    setShowForm(false); setEditItem(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Users2 className="w-5 h-5 text-blue-500" /> Customers</h2>
          <p className="text-sm text-slate-500">Manage customer directory (replaces frmCustomer)</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          <Plus className="w-4 h-4" /> Add Customer
        </button>
      </div>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input type="text" placeholder="Search customers..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
      </div>
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left">
            <th className="px-4 py-3 font-semibold text-slate-600">Code</th>
            <th className="px-4 py-3 font-semibold text-slate-600">Name</th>
            <th className="px-4 py-3 font-semibold text-slate-600">Phone</th>
            <th className="px-4 py-3 font-semibold text-slate-600">Address</th>
            <th className="px-4 py-3 font-semibold text-slate-600 text-right">Credit Limit (₹)</th>
            <th className="px-4 py-3 font-semibold text-slate-600 text-center">Status</th>
            <th className="px-4 py-3 font-semibold text-slate-600 text-center">Actions</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{c.code}</td>
                <td className="px-4 py-3 font-medium">{c.name}</td>
                <td className="px-4 py-3 text-slate-500">{c.phone}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-[200px] truncate">{c.address}</td>
                <td className="px-4 py-3 text-right font-mono font-bold text-slate-800">₹ {c.creditLimit.toLocaleString('en-IN')}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => onUpdate(customers.map(x => x.id === c.id ? {...x, isActive: !x.isActive} : x))}>
                    {c.isActive ? <ToggleRight className="w-6 h-6 text-emerald-500 mx-auto" /> : <ToggleLeft className="w-6 h-6 text-slate-300 mx-auto" />}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => { setEditItem(c); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 bg-slate-50 border-t text-xs text-slate-500">Showing {filtered.length} of {customers.length} customers</div>
      </div>
      {showForm && <CustomerForm item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} />}
    </div>
  );
}

function CustomerForm({ item, onSave, onClose }: { item: Customer | null; onSave: (c: Customer) => void; onClose: () => void }) {
  const [form, setForm] = useState<Customer>(item || { id: 0, code: '', name: '', phone: '', address: '', creditLimit: 0, isActive: true });
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-lg font-bold mb-4">{item ? 'Edit' : 'Add'} Customer</h3>
        <div className="space-y-3">
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Code</label><input value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Address</label><textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
          <div><label className="block text-xs font-medium text-slate-600 mb-1">Credit Limit (₹)</label><input type="number" value={form.creditLimit} onChange={e => setForm({...form, creditLimit: parseFloat(e.target.value)||0})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={() => onSave(form)} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Save</button>
          <button onClick={onClose} className="px-6 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * SUPPLIERS PAGE — replaces frmSupplier
 * ═══════════════════════════════════════════════════════════════════════════ */
interface SuppliersPageProps { suppliers: Supplier[]; onUpdate: (items: Supplier[]) => void; }
export function SuppliersPage({ suppliers, onUpdate }: SuppliersPageProps) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Supplier | null>(null);
  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.code.toLowerCase().includes(search.toLowerCase()));
  const handleSave = (item: Supplier) => {
    if (editItem) { onUpdate(suppliers.map(s => s.id === item.id ? item : s)); }
    else { onUpdate([...suppliers, { ...item, id: Math.max(...suppliers.map(s => s.id)) + 1 }]); }
    setShowForm(false); setEditItem(null);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Building2 className="w-5 h-5 text-blue-500" /> Suppliers</h2>
          <p className="text-sm text-slate-500">Manage supplier directory (replaces frmSupplier)</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"><Plus className="w-4 h-4" /> Add Supplier</button>
      </div>
      <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search suppliers..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 text-left"><th className="px-4 py-3 font-semibold text-slate-600">Code</th><th className="px-4 py-3 font-semibold text-slate-600">Name</th><th className="px-4 py-3 font-semibold text-slate-600">Phone</th><th className="px-4 py-3 font-semibold text-slate-600">Address</th><th className="px-4 py-3 font-semibold text-slate-600 text-center">Status</th><th className="px-4 py-3 font-semibold text-slate-600 text-center">Actions</th></tr></thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                <td className="px-4 py-3 font-medium">{s.name}</td>
                <td className="px-4 py-3 text-slate-500">{s.phone}</td>
                <td className="px-4 py-3 text-slate-500 text-xs max-w-[250px] truncate">{s.address}</td>
                <td className="px-4 py-3 text-center"><button onClick={() => onUpdate(suppliers.map(x => x.id === s.id ? {...x, isActive: !x.isActive} : x))}>{s.isActive ? <ToggleRight className="w-6 h-6 text-emerald-500 mx-auto" /> : <ToggleLeft className="w-6 h-6 text-slate-300 mx-auto" />}</button></td>
                <td className="px-4 py-3 text-center"><button onClick={() => { setEditItem(s); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 bg-slate-50 border-t text-xs text-slate-500">Showing {filtered.length} of {suppliers.length} suppliers</div>
      </div>
      {showForm && <SupplierForm item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} />}
    </div>
  );
}

function SupplierForm({ item, onSave, onClose }: { item: Supplier | null; onSave: (s: Supplier) => void; onClose: () => void }) {
  const [form, setForm] = useState<Supplier>(item || { id: 0, code: '', name: '', phone: '', address: '', isActive: true });
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
      <h3 className="text-lg font-bold mb-4">{item ? 'Edit' : 'Add'} Supplier</h3>
      <div className="space-y-3">
        <div><label className="block text-xs font-medium text-slate-600 mb-1">Code</label><input value={form.code} onChange={e => setForm({...form, code: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
        <div><label className="block text-xs font-medium text-slate-600 mb-1">Name</label><input value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
        <div><label className="block text-xs font-medium text-slate-600 mb-1">Phone</label><input value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" /></div>
        <div><label className="block text-xs font-medium text-slate-600 mb-1">Address</label><textarea value={form.address} onChange={e => setForm({...form, address: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" rows={2} /></div>
      </div>
      <div className="flex gap-3 mt-6"><button onClick={() => onSave(form)} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">Save</button><button onClick={onClose} className="px-6 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50">Cancel</button></div>
    </div></div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 * VEHICLES PAGE — replaces frmVehicle
 * ═══════════════════════════════════════════════════════════════════════════ */
interface VehiclesPageProps { vehicles: Vehicle[]; onUpdate: (items: Vehicle[]) => void; }
export function VehiclesPage({ vehicles, onUpdate }: VehiclesPageProps) {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Vehicle | null>(null);
  const filtered = vehicles.filter(v =>
    v.plateNo.toLowerCase().includes(search.toLowerCase()) ||
    v.driverName.toLowerCase().includes(search.toLowerCase()) ||
    (v.companyName && v.companyName.toLowerCase().includes(search.toLowerCase()))
  );
  const handleSave = (item: Vehicle) => {
    if (editItem) { onUpdate(vehicles.map(v => v.id === item.id ? item : v)); }
    else { onUpdate([...vehicles, { ...item, id: Math.max(0, ...vehicles.map(v => v.id)) + 1 }]); }
    setShowForm(false); setEditItem(null);
  };
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Truck className="w-5 h-5 text-blue-500" /> Vehicles</h2>
          <p className="text-sm text-slate-500">Manage vehicle registry and trader/company affiliations (replaces frmVehicle)</p>
        </div>
        <button onClick={() => { setEditItem(null); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 shadow-sm"><Plus className="w-4 h-4" /> Add Vehicle</button>
      </div>
      <div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input type="text" placeholder="Search by plate number, company/trader, or driver..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" /></div>
      <div className="bg-white rounded-xl shadow border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 font-semibold text-slate-600">Plate No</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Company / Trader</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Driver</th>
              <th className="px-4 py-3 font-semibold text-slate-600">Phone</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-right">Tare Weight (kg)</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-center">Status</th>
              <th className="px-4 py-3 font-semibold text-slate-600 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(v => (
              <tr key={v.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-mono font-bold text-slate-900">{v.plateNo}</td>
                <td className="px-4 py-3">
                  {v.companyName ? (
                    <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      {v.companyName}
                    </span>
                  ) : (
                    <span className="text-slate-400 italic">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{v.driverName}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{v.driverPhone}</td>
                <td className="px-4 py-3 text-right font-mono">{v.tareWeight ? v.tareWeight.toLocaleString() : '—'}</td>
                <td className="px-4 py-3 text-center"><button onClick={() => onUpdate(vehicles.map(x => x.id === v.id ? {...x, isActive: !x.isActive} : x))}>{v.isActive ? <ToggleRight className="w-6 h-6 text-emerald-500 mx-auto" /> : <ToggleLeft className="w-6 h-6 text-slate-300 mx-auto" />}</button></td>
                <td className="px-4 py-3 text-center"><button onClick={() => { setEditItem(v); setShowForm(true); }} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 bg-slate-50 border-t text-xs text-slate-500">Showing {filtered.length} of {vehicles.length} vehicles</div>
      </div>
      {showForm && <VehicleForm item={editItem} onSave={handleSave} onClose={() => { setShowForm(false); setEditItem(null); }} />}
    </div>
  );
}

function VehicleForm({ item, onSave, onClose }: { item: Vehicle | null; onSave: (v: Vehicle) => void; onClose: () => void }) {
  const [form, setForm] = useState<Vehicle>(
    item || { id: 0, plateNo: '', companyName: '', tareWeight: null, driverName: '', driverPhone: '', isActive: true }
  );
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
      <h3 className="text-lg font-bold mb-4">{item ? 'Edit' : 'Add'} Vehicle</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Plate Number *</label>
          <input
            value={form.plateNo}
            onChange={e => setForm({...form, plateNo: e.target.value.toUpperCase()})}
            className="w-full px-3 py-2 border rounded-lg text-sm font-mono uppercase focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="e.g. TN 09 AB 1234"
            required
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Company / Trader Name</label>
          <div className="relative">
            <Building2 className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              value={form.companyName || ''}
              onChange={e => setForm({...form, companyName: e.target.value})}
              className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              placeholder="e.g. ABC Logistics / Sri Ram Traders"
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Company, trader, or transporter to which the vehicle belongs</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Driver Name</label>
          <input
            value={form.driverName}
            onChange={e => setForm({...form, driverName: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="e.g. Ramesh Kumar"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Driver Phone</label>
          <input
            value={form.driverPhone}
            onChange={e => setForm({...form, driverPhone: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="e.g. 98401 23456"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Known Tare Weight (kg)</label>
          <input
            type="number"
            value={form.tareWeight ?? ''}
            onChange={e => setForm({...form, tareWeight: e.target.value ? parseFloat(e.target.value) : null})}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            placeholder="Leave blank if unknown"
          />
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button
          onClick={() => {
            if (!form.plateNo.trim()) return;
            onSave(form);
          }}
          disabled={!form.plateNo.trim()}
          className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition"
        >
          Save
        </button>
        <button onClick={onClose} className="px-6 py-2 border border-slate-300 rounded-lg text-sm hover:bg-slate-50 transition">
          Cancel
        </button>
      </div>
    </div></div>
  );
}
