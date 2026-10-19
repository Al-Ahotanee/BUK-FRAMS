'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BukLogo } from '@/components/BukLogo';
import { Shield, Camera, GraduationCap, Lock, Mail, AlertCircle, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRoleParam = searchParams.get('role');
  const initialRole: 'student' | 'lecturer' | 'admin' = 
    initialRoleParam === 'admin' ? 'admin' : 
    initialRoleParam === 'student' ? 'student' : 'lecturer';

  const [role, setRole] = useState<'student' | 'lecturer' | 'admin'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Automatically update suggested credentials when switching tabs
  useEffect(() => {
    if (role === 'student') {
      setEmail('CST/21/COM/00101');
      setPassword('@student123');
    } else if (role === 'admin') {
      setEmail('admin@buk.edu.ng');
      setPassword('@admin_');
    } else {
      setEmail('lecturer@buk.edu.ng');
      setPassword('@lecturer_');
    }
    setError('');
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok || data.status === 'error') {
        setError(data.message || 'Authentication failed. Please verify credentials.');
        setLoading(false);
        return;
      }

      // Route according to authenticated user role
      if (data.role === 'admin') {
        router.push('/admin');
      } else if (data.role === 'student') {
        router.push('/student');
      } else {
        router.push('/lecturer');
      }
    } catch {
      setError('An unexpected network error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-gradient-to-br from-slate-100 via-buk-slate-50 to-amber-50/40 p-4 sm:p-6">
      {/* Return to home link */}
      <div className="w-full max-w-lg mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-buk-navy hover:text-buk-gold-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to BUK-FRAS Portal Home</span>
        </Link>
      </div>

      <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header Bar */}
        <div className="bg-buk-navy p-6 sm:p-8 text-center border-b-2 border-buk-gold">
          <div className="flex justify-center">
            <BukLogo lightText size="lg" />
          </div>
          <p className="mt-3 text-xs text-slate-300 font-medium">
            Bayero University Kano &bull; Identity & Attendance Gateway
          </p>
        </div>

        {/* 3-Role Tab Selector */}
        <div className="grid grid-cols-3 p-1.5 bg-slate-100 border-b border-slate-200 text-xs font-bold gap-1">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              role === 'student'
                ? 'bg-white text-buk-navy shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <GraduationCap className="w-4 h-4 text-buk-gold" />
            <span>Student</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('lecturer')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              role === 'lecturer'
                ? 'bg-white text-buk-navy shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4 text-buk-gold" />
            <span>Lecturer</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-all ${
              role === 'admin'
                ? 'bg-white text-buk-navy shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-buk-navy" />
            <span>Admin</span>
          </button>
        </div>

        {/* Login Form */}
        <div className="p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {role === 'student' ? 'Registration Number or Email' : 'Official Email Address'}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  {role === 'student' ? <GraduationCap className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
                </div>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={
                    role === 'student'
                      ? 'CST/21/COM/00101 or student@buk.edu.ng'
                      : role === 'admin'
                      ? 'admin@buk.edu.ng'
                      : 'lecturer@buk.edu.ng'
                  }
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-buk-navy focus:border-transparent text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-buk-navy focus:border-transparent text-slate-800 placeholder-slate-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-buk-navy bg-buk-gold hover:bg-buk-gold-dark transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>
                  Sign In to{' '}
                  {role === 'student'
                    ? 'Student Dashboard'
                    : role === 'admin'
                    ? 'Administrator Suite'
                    : 'Lecturer Terminal'}
                </span>
              )}
            </button>
          </form>

          {/* Institutional Fast-Fill Demo Badges */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2.5">
              Quick One-Click Test Accounts:
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  setRole('student');
                  setEmail('CST/21/COM/00101');
                  setPassword('@student123');
                }}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-buk-navy">
                  <CheckCircle2 className="w-3 h-3 text-buk-gold" />
                  <span>Student</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">CST/21/COM/00101</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole('lecturer');
                  setEmail('lecturer@buk.edu.ng');
                  setPassword('@lecturer_');
                }}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-buk-navy">
                  <CheckCircle2 className="w-3 h-3 text-buk-gold" />
                  <span>Lecturer</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">Dr. Mark Ibrahim</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setRole('admin');
                  setEmail('admin@buk.edu.ng');
                  setPassword('@admin_');
                }}
                className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left transition-colors"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-buk-navy">
                  <CheckCircle2 className="w-3 h-3 text-buk-gold" />
                  <span>Admin</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate">Control Room</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <Loader2 className="w-8 h-8 text-buk-navy animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
