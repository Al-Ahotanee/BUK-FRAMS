'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { BukLogo } from '@/components/BukLogo';
import { Shield, Camera, Lock, Mail, AlertCircle, ArrowLeft, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') === 'admin' ? 'admin' : 'lecturer';

  const [role, setRole] = useState<'admin' | 'lecturer'>(initialRole);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Automatically update suggested email when switching tabs if default is untouched
  useEffect(() => {
    if (role === 'admin') {
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
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-buk-navy hover:text-buk-gold-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to BUK-FRAS Portal Home</span>
        </Link>
      </div>

      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
        {/* Header Bar */}
        <div className="bg-buk-navy p-6 sm:p-8 text-center border-b-2 border-buk-gold">
          <div className="flex justify-center">
            <BukLogo lightText size="lg" />
          </div>
          <p className="mt-3 text-xs text-slate-300 font-medium">
            Authorized Personnel Authentication
          </p>
        </div>

        {/* Role Tab Selector */}
        <div className="grid grid-cols-2 p-2 bg-slate-100/90 border-b border-slate-200 text-xs font-bold">
          <button
            type="button"
            onClick={() => setRole('lecturer')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              role === 'lecturer'
                ? 'bg-white text-buk-navy shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Camera className="w-4 h-4 text-buk-gold" />
            <span>Lecturer Sign In</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('admin')}
            className={`py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all ${
              role === 'admin'
                ? 'bg-white text-buk-navy shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4 text-buk-navy" />
            <span>Admin Sign In</span>
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
                Official Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={role === 'admin' ? 'admin@buk.edu.ng' : 'lecturer@buk.edu.ng'}
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
                <span>Access {role === 'admin' ? 'Administrator' : 'Lecturer'} Terminal</span>
              )}
            </button>
          </form>

          {/* Quick test account helper */}
          <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50/70 -mx-6 -mb-6 p-4 sm:p-5 text-center text-xs text-slate-500 rounded-b-3xl">
            <p className="font-semibold text-slate-700">Pre-Configured Demo Credentials:</p>
            <p className="mt-1 font-mono text-[11px] text-slate-600">
              {role === 'admin' ? (
                <>admin@buk.edu.ng &bull; @admin_</>
              ) : (
                <>lecturer@buk.edu.ng &bull; @lecturer_</>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-xs text-slate-500">Loading BUK Portal...</div>}>
      <LoginForm />
    </Suspense>
  );
}
