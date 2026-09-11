/**
 * ============================================================================
 * SIDEBAR NAVIGATION
 * ============================================================================
 * Replaces: MDI form menu bar (frmMain) from VB6
 *
 * The original VB6 application used a standard Windows MDI (Multiple Document
 * Interface) with a menu bar containing items like:
 *   File > Weigh In, Weigh Out, Exit
 *   Master > Product, Customer, Supplier, Vehicle
 *   Reports > Daily Summary, Product Report, etc.
 *   Admin > User Management, Settings, Backup
 *   Help > About
 *
 * This sidebar replaces that menu with a modern, always-visible navigation
 * panel organized into logical groups with icons.
 * ============================================================================
 */

import { cn } from '@/utils/cn';
import type { PageId } from '@/types';
import {
  LayoutDashboard, Scale, ArrowDownToLine, ArrowUpFromLine,
  Ticket, Package, Users2, Truck, Building2, Receipt,
  BarChart3, CalendarDays, UserCog, Settings, DatabaseBackup,
  Info, LogOut, ChevronLeft, ChevronRight, LogIn, ClipboardList, Layers,
  ShieldCheck, DoorOpen, CheckSquare
} from 'lucide-react';
import { useState } from 'react';

/**
 * Menu item configuration
 * Each item defines a page in the application with its icon and label
 */
interface MenuItem {
  id: PageId;
  label: string;
  icon: React.ElementType;
  /** Which user roles can see this menu item */
  roles?: string[];
}

interface MenuGroup {
  title: string;
  items: MenuItem[];
}

/**
 * Menu structure organized into logical groups
 * This mirrors the VB6 MDI menu structure:
 *   File menu → Operations group
 *   Master menu → Master Data group
 *   Reports menu → Reports group
 *   Admin menu → Administration group
 */
const getMenuGroups = (enableUnloading: boolean = true): MenuGroup[] => [
  {
    title: 'Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { id: 'vehicle-entry', label: 'Vehicle Entry', icon: LogIn },
      { id: 'planning', label: 'Planning & DO', icon: ClipboardList },
      { id: 'weigh-in', label: 'Loading', icon: ArrowDownToLine },
      ...(enableUnloading ? [{ id: 'weigh-out' as PageId, label: 'Unloading', icon: ArrowUpFromLine }] : []),
      { id: 'checking', label: 'Checking Section', icon: CheckSquare },
      { id: 'exit-gate', label: 'Exit Gate', icon: DoorOpen },
      { id: 'multi-weighment', label: 'Multi-Weighment', icon: Layers },
      { id: 'tickets', label: 'Tickets', icon: Ticket },
      { id: 'transactions', label: 'Transactions', icon: Receipt },
    ],
  },
  {
    title: 'Master Data',
    items: [
      { id: 'products', label: 'Products', icon: Package },
      { id: 'customers', label: 'Customers', icon: Users2 },
      { id: 'suppliers', label: 'Suppliers', icon: Building2 },
      { id: 'vehicles', label: 'Vehicles', icon: Truck },
    ],
  },
  {
    title: 'Reports',
    items: [
      { id: 'daily-summary', label: 'Daily Summary', icon: CalendarDays },
      { id: 'reports', label: 'Reports', icon: BarChart3 },
    ],
  },
  {
    title: 'Administration',
    items: [
      { id: 'users', label: 'User Management', icon: UserCog },
      { id: 'roles', label: 'Role Master', icon: ShieldCheck },
      { id: 'bay-master', label: 'Bay Master', icon: Layers },
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'audit-log', label: 'Audit Log', icon: DatabaseBackup },
      { id: 'backup', label: 'Backup', icon: DatabaseBackup },
      { id: 'about', label: 'About', icon: Info },
    ],
  },
];

interface SidebarProps {
  /** Currently active page */
  activePage: PageId;
  /** Callback when user clicks a menu item */
  onNavigate: (page: PageId) => void;
  /** Callback when user clicks logout */
  onLogout: () => void;
  /** Name of the currently logged-in user */
  userName: string;
  /** Role of the currently logged-in user */
  userRole: string;
  /** Whether the Unloading module is enabled in admin settings */
  enableUnloading?: boolean;
}

export function Sidebar({ activePage, onNavigate, onLogout, userName, userRole, enableUnloading = true }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const menuGroups = getMenuGroups(enableUnloading);

  return (
    <aside
      className={cn(
        'bg-slate-900 text-white flex flex-col h-screen sticky top-0 transition-all duration-300 z-30',
        collapsed ? 'w-16' : 'w-60'
      )}
    >
      {/* ── App Logo / Brand ─────────────────────────────────────────── */}
      <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <Scale className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="font-bold text-sm leading-tight truncate">WS Series</h1>
            <p className="text-[10px] text-slate-400 truncate">Weighing Scale System</p>
          </div>
        )}
      </div>

      {/* ── Navigation Menu ──────────────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {menuGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-2 mb-1.5">
                {group.title}
              </p>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = activePage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all',
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    )}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User Info & Logout ────────────────────────────────────────── */}
      <div className="border-t border-slate-700/50 p-3 space-y-2">
        {!collapsed && (
          <div className="flex items-center gap-2 px-1">
            <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-emerald-400">
              {userName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium truncate">{userName}</p>
              <p className="text-[10px] text-slate-500 capitalize">{userRole}</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          title="Logout"
          className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* ── Collapse Toggle ──────────────────────────────────────────── */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center border-2 border-slate-900 transition-colors"
      >
        {collapsed ? (
          <ChevronRight className="w-3 h-3 text-slate-300" />
        ) : (
          <ChevronLeft className="w-3 h-3 text-slate-300" />
        )}
      </button>
    </aside>
  );
}
