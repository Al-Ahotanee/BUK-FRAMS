'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BukLogo } from '@/components/BukLogo';
import {
  LayoutDashboard,
  Camera,
  FileSpreadsheet,
  AlertTriangle,
  FileQuestion,
  LogOut,
  Menu,
  X,
  UserCheck,
  Search,
  Sparkles,
} from 'lucide-react';

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { name: 'Dashboard', href: '/lecturer', icon: LayoutDashboard },
    { name: 'Live Face Scanner', href: '/lecturer/attendance', icon: Camera },
    { name: 'Attendance Records', href: '/lecturer/reports', icon: FileSpreadsheet },
    { name: 'Defaulter Alerts', href: '/lecturer/notifications', icon: AlertTriangle },
    { name: 'Absence Waivers', href: '/admin/excuses', icon: FileQuestion },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login?role=lecturer');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-buk-navy text-white px-4 py-3 flex items-center justify-between border-b-2 border-buk-gold shadow-md">
        <BukLogo lightText size="sm" />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-white hover:bg-white/10"
        >
          {mobileOpen ? <X className="w-6 h-6 text-white" /> : <Menu className="w-6 h-6 text-white" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-buk-navy text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } border-r-2 border-buk-gold/60 shadow-xl`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Lecturer Identity Header */}
          <div className="p-5 border-b border-white/20">
            <BukLogo lightText size="md" />

            <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  <UserCheck className="w-5 h-5 text-white" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">
                    Dr. Mark Ibrahim
                  </p>
                  <p className="text-[10px] text-white/90 font-mono truncate">
                    lecturer@buk.edu.ng
                  </p>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between text-[10px] font-bold text-white uppercase tracking-wider">
                <span>Teaching Faculty</span>
                <span>FCSIT</span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
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
                      ? 'bg-buk-gold text-buk-navy shadow-md font-bold'
                      : 'text-white/90 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-buk-navy' : 'text-white'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Session & Sign Out Footer */}
          <div className="p-4 border-t border-white/20 bg-buk-navy-dark/80">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">
                  Session 2025/2026
                </span>
                <span className="text-[11px] text-white font-medium">First Semester</span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-lg text-white/80 hover:text-red-400 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4 text-white hover:text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="hidden lg:flex items-center justify-between px-8 py-3.5 bg-white border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search registered students, units..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-buk-navy text-slate-800"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
              <Sparkles className="w-3.5 h-3.5 text-buk-navy" />
              <span>Bayero University Kano &bull; Academic Lecturer Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-buk-green animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">AI Face Recognition Online</span>
            </div>

            <Link
              href="/lecturer/attendance"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-buk-gold text-buk-navy font-bold text-xs hover:bg-buk-gold-dark transition-all shadow-sm"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Scanner</span>
            </Link>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {children}
        </div>
      </main>
    </div>
  );
}
