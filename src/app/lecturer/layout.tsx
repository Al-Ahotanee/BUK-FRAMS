'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BukLogo } from '@/components/BukLogo';
import { 
  LayoutDashboard, 
  Camera, 
  FileSpreadsheet, 
  AlertTriangle, 
  LogOut,
  UserCheck
} from 'lucide-react';

export default function LecturerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { name: 'Dashboard', href: '/lecturer', icon: LayoutDashboard },
    { name: 'Live Face Scanner', href: '/lecturer/attendance', icon: Camera },
    { name: 'Attendance Records', href: '/lecturer/reports', icon: FileSpreadsheet },
    { name: 'Defaulter Alerts', href: '/lecturer/notifications', icon: AlertTriangle },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Banner */}
      <div className="bg-buk-navy-dark text-slate-300 py-1 px-4 text-xs border-b border-buk-gold/30">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <span className="font-serif italic text-buk-gold-light text-[11px]">
            Bayero University Kano &bull; Academic Lecturer Portal
          </span>
          <span className="text-[10px] text-slate-400">
            Smart Attendance Terminal v2.0
          </span>
        </div>
      </div>

      {/* Main Header */}
      <header className="bg-buk-navy text-white shadow-md border-b-2 border-buk-gold sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between">
          <BukLogo lightText size="md" />

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                    active
                      ? 'bg-buk-gold text-buk-navy shadow-sm'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* User & Logout */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-white">Dr. Mark Ibrahim</span>
              <span className="text-[10px] text-slate-300">lecturer@buk.edu.ng</span>
            </div>
            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Bar */}
        <div className="md:hidden border-t border-buk-gold/30 flex overflow-x-auto py-2 px-3 gap-2 bg-buk-navy-dark">
          {navItems.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
                  active ? 'bg-buk-gold text-buk-navy' : 'text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        {children}
      </main>
    </div>
  );
}
