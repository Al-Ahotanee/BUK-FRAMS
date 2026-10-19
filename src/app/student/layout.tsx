'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { BukLogo } from '@/components/BukLogo';
import {
  LayoutDashboard,
  BookOpen,
  CalendarCheck2,
  FileQuestion,
  FileCheck,
  LogOut,
  Menu,
  X,
  GraduationCap,
  Bell,
  Sparkles,
} from 'lucide-react';

interface StudentInfo {
  name: string;
  regNo: string;
  email: string;
  faculty?: string;
}

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [student, setStudent] = useState<StudentInfo | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.status === 'success' && data.user) {
          setStudent({
            name: data.user.name,
            regNo: data.user.regNo || 'CST/21/COM/00101',
            email: data.user.email,
            faculty: data.user.faculty || 'FCSIT',
          });
        }
      })
      .catch(() => {});
  }, []);

  const navItems = [
    { name: 'Dashboard', href: '/student', icon: LayoutDashboard },
    { name: 'My Courses & Units', href: '/student/courses', icon: BookOpen },
    { name: 'Attendance Ledger', href: '/student/attendance', icon: CalendarCheck2 },
    { name: 'Absence Excuses & Waivers', href: '/student/excuses', icon: FileQuestion },
    { name: 'Exam Clearance Slip', href: '/student/clearance', icon: FileCheck },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login?role=student');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Top Header */}
      <div className="lg:hidden bg-buk-navy text-white px-4 py-3 flex items-center justify-between border-b-2 border-buk-gold shadow-md">
        <BukLogo lightText size="sm" />
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10"
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-buk-navy text-white flex flex-col justify-between transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } border-r-2 border-buk-gold/60 shadow-xl`}
      >
        <div className="flex flex-col h-full">
          {/* Logo & Student Identity Header */}
          <div className="p-5 border-b border-white/20">
            <BukLogo lightText size="md" />

            <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/20">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center text-white">
                  <GraduationCap className="w-5 h-5 text-white" />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-white truncate">
                    {student?.name || 'Student Portal'}
                  </p>
                  <p className="text-[10px] text-white/90 font-mono truncate">
                    {student?.regNo || 'CST/21/COM/00101'}
                  </p>
                </div>
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

          {/* Academic Session & Sign Out Footer */}
          <div className="p-4 border-t border-white/20 bg-buk-navy-dark/80">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-[10px] font-semibold text-white/80 uppercase tracking-wider">
                  Session 2025/2026
                </span>
                <span className="text-[11px] text-white">First Semester</span>
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
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200">
          <div>
            <h1 className="text-lg font-bold text-slate-900">
              Bayero University Kano &bull; Student Attendance Terminal
            </h1>
            <p className="text-xs text-slate-500">
              Biometric Presence Records & Exam Eligibility Clearance
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[11px] font-medium text-amber-800">
              <Sparkles className="w-3.5 h-3.5 text-buk-gold" />
              <span>70% Attendance Required for Examination Clearance</span>
            </div>
            <Link
              href="/student/excuses"
              className="p-2 rounded-lg text-slate-500 hover:text-buk-navy hover:bg-slate-100 transition-colors relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
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
