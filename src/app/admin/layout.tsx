'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BukLogo } from '@/components/BukLogo';
import {
  LayoutDashboard,
  Building2,
  BookOpen,
  Layers,
  MapPin,
  UserCheck,
  GraduationCap,
  Camera,
  Link2,
  LogOut,
  Menu,
  X,
  ShieldAlert,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    { name: 'Faculties', href: '/admin/faculties', icon: Building2 },
    { name: 'Programmes', href: '/admin/courses', icon: BookOpen },
    { name: 'Course Units', href: '/admin/units', icon: Layers },
    { name: 'Venues & Theatres', href: '/admin/venues', icon: MapPin },
    { name: 'Lecturers', href: '/admin/lecturers', icon: UserCheck },
    { name: 'Students', href: '/admin/students', icon: GraduationCap },
    { name: 'Face Enrollment', href: '/admin/students/enroll', icon: Camera },
    { name: 'Course Assignments', href: '/admin/assignments', icon: Link2 },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Header */}
      <div className="lg:hidden bg-buk-navy text-white px-4 py-3 flex items-center justify-between border-b-2 border-buk-gold">
        <BukLogo lightText size="sm" />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-buk-navy-light"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-buk-navy text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-0 max-lg:-translate-x-full'
        } border-r-2 border-buk-gold/60 shadow-xl`}
      >
        <div className="flex flex-col h-full">
          {/* Logo Area */}
          <div className="p-5 border-b border-buk-gold/30">
            <BukLogo lightText size="md" />
            <div className="mt-3 px-2 py-1 rounded bg-buk-gold/15 border border-buk-gold/30 inline-flex items-center gap-1.5 text-[11px] font-semibold text-buk-gold-light">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Admin Control Room</span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    active
                      ? 'bg-buk-gold text-buk-navy shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-buk-navy' : 'text-buk-gold'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User & Logout Footer */}
          <div className="p-4 border-t border-buk-gold/30 bg-buk-navy-dark/70">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Administrator</span>
                <span className="text-[10px] text-slate-400">admin@buk.edu.ng</span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/5 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Bayero University Kano Attendance Management
            </h1>
            <p className="text-xs text-slate-500">
              Session 2025/2026 &bull; Central Biometric Registry
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-buk-green animate-pulse" />
            <span className="text-xs font-medium text-slate-600">Vercel Serverless Ready</span>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
