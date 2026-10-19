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
  FileQuestion,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ShieldAlert,
  Search,
  Bell,
  Sparkles,
} from 'lucide-react';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navSections = [
    {
      title: 'Core Control',
      items: [
        { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Academic Structure',
      items: [
        { name: 'Faculties', href: '/admin/faculties', icon: Building2 },
        { name: 'Programmes', href: '/admin/courses', icon: BookOpen },
        { name: 'Course Units', href: '/admin/units', icon: Layers },
        { name: 'Venues & Theatres', href: '/admin/venues', icon: MapPin },
      ],
    },
    {
      title: 'People & Biometrics',
      items: [
        { name: 'Lecturers', href: '/admin/lecturers', icon: UserCheck },
        { name: 'Students Registry', href: '/admin/students', icon: GraduationCap },
        { name: 'Facial AI Enrollment', href: '/admin/students/enroll', icon: Camera },
        { name: 'Course Allocations', href: '/admin/assignments', icon: Link2 },
      ],
    },
    {
      title: 'Compliance & Waivers',
      items: [
        { name: 'Absence Waivers', href: '/admin/excuses', icon: FileQuestion },
        { name: 'Audit Compliance', href: '/admin/audit', icon: ShieldCheck },
      ],
    },
  ];

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login?role=admin');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Mobile Header */}
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
          {/* Logo Area */}
          <div className="p-5 border-b border-buk-gold/30">
            <BukLogo lightText size="md" />
            <div className="mt-3 px-2.5 py-1 rounded-lg bg-buk-gold/15 border border-buk-gold/30 inline-flex items-center gap-1.5 text-[11px] font-bold text-buk-gold-light">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Institutional Control Room</span>
            </div>
          </div>

          {/* Grouped Navigation Links */}
          <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
            {navSections.map((section) => (
              <div key={section.title} className="space-y-1">
                <p className="px-3 text-[10px] font-bold text-buk-gold-light uppercase tracking-wider">
                  {section.title}
                </p>
                {section.items.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        active
                          ? 'bg-buk-gold text-buk-navy shadow-sm font-bold'
                          : 'text-slate-300 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-buk-navy' : 'text-buk-gold'}`} />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* User & Logout Footer */}
          <div className="p-4 border-t border-buk-gold/30 bg-buk-navy-dark/80">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Administrator</span>
                <span className="text-[10px] text-slate-400">admin@buk.edu.ng</span>
              </div>
              <button
                onClick={handleLogout}
                title="Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-white/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
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
                placeholder="Search students, staff, units..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-buk-navy text-slate-800"
              />
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-buk-navy/5 border border-buk-navy/15 text-[11px] font-semibold text-buk-navy">
              <Sparkles className="w-3.5 h-3.5 text-buk-gold" />
              <span>Session 2025/2026 &bull; First Semester</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-buk-green animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">Cloud Database Online</span>
            </div>

            <Link
              href="/admin/excuses"
              className="p-2 rounded-xl text-slate-500 hover:text-buk-navy hover:bg-slate-100 transition-colors relative"
              title="Absence Requests"
            >
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-buk-gold" />
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
