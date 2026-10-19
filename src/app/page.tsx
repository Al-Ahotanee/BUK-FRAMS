import React from 'react';
import Link from 'next/link';
import { BukLogo } from '@/components/BukLogo';
import { 
  Camera, 
  ShieldCheck, 
  BarChart3, 
  Users, 
  BookOpen, 
  Clock, 
  ArrowRight, 
  CheckCircle2, 
  Sparkles, 
  GraduationCap
} from 'lucide-react';

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Banner / University Motto Bar */}
      <div className="bg-buk-navy-dark text-slate-300 py-1.5 px-4 text-xs border-b border-buk-gold/30">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <span className="font-serif italic tracking-wide text-buk-gold-light">
            &ldquo;Wa fawqa kulli dzi &apos;ilmin &apos;alim&rdquo; &mdash; &ldquo;...and above every possessor of knowledge there is one more well-informed&rdquo;
          </span>
          <span className="text-[11px] text-slate-400">
            Bayero University Kano &bull; Kano State, Nigeria
          </span>
        </div>
      </div>

      {/* Main Navbar */}
      <header className="bg-buk-navy text-white sticky top-0 z-50 shadow-lg border-b-2 border-buk-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <BukLogo lightText size="lg" />

          <nav className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-200">
            <Link href="#features" className="hover:text-buk-gold transition-colors">Features</Link>
            <Link href="#faculties" className="hover:text-buk-gold transition-colors">Faculties</Link>
            <Link href="#about" className="hover:text-buk-gold transition-colors">About System</Link>
            <Link 
              href="/login" 
              className="bg-buk-gold hover:bg-buk-gold-dark text-buk-navy font-semibold px-5 py-2.5 rounded-full transition-all shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span>Portal Sign In</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>

          <div className="md:hidden">
            <Link 
              href="/login" 
              className="bg-buk-gold text-buk-navy font-semibold text-xs px-4 py-2 rounded-full"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-buk-navy via-buk-navy-light/95 to-slate-900 text-white py-20 lg:py-28">
        {/* Subtle decorative background pattern */}
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#C5A059_1px,transparent_1px)] [background-size:24px_24px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-buk-gold/15 border border-buk-gold/40 text-buk-gold-light text-xs font-semibold uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>Next-Gen Academic Verification</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight">
              Facial Recognition <br />
              <span className="text-buk-gold">Attendance System</span>
            </h1>

            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Empowering Bayero University Kano with automated biometric attendance tracking.
              Powered by deep convolutional neural networks for instantaneous face detection,
              foolproof proxy prevention, and comprehensive compliance analytics.
            </p>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
              <Link
                href="/login?role=student"
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm"
              >
                <GraduationCap className="w-5 h-5 text-emerald-200" />
                <span>Student Portal</span>
              </Link>
              <Link
                href="/login?role=lecturer"
                className="bg-buk-gold hover:bg-buk-gold-dark text-buk-navy font-bold px-6 py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2.5 text-sm"
              >
                <Camera className="w-5 h-5" />
                <span>Lecturer Scanner</span>
              </Link>
              <Link
                href="/login?role=admin"
                className="bg-white/10 hover:bg-white/15 text-white border border-white/20 font-semibold px-6 py-3.5 rounded-xl transition-all flex items-center justify-center gap-2.5 text-sm"
              >
                <ShieldCheck className="w-5 h-5 text-buk-gold" />
                <span>Admin Suite</span>
              </Link>
            </div>

            {/* Micro stats banner */}
            <div className="pt-8 grid grid-cols-3 gap-4 border-t border-white/10">
              <div>
                <p className="text-2xl lg:text-3xl font-extrabold text-buk-gold">99.4%</p>
                <p className="text-xs text-slate-400">Match Accuracy</p>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-extrabold text-white">&lt; 300ms</p>
                <p className="text-xs text-slate-400">Recognition Latency</p>
              </div>
              <div>
                <p className="text-2xl lg:text-3xl font-extrabold text-buk-green-light">Zero</p>
                <p className="text-xs text-slate-400">Proxy Attendance</p>
              </div>
            </div>
          </div>

          {/* Quick Access Card Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-900 border-2 border-buk-gold/50 relative">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-buk-green animate-pulse" />
                  <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">BUK-FRAS Live Terminal</span>
                </div>
                <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">v2.0</span>
              </div>

              <div className="mt-4 space-y-3">
                <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white shrink-0">
                    <GraduationCap className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Student Portal</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">Track attendance, submit absence excuse waivers, and print exam passes.</p>
                    <Link href="/login?role=student" className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 hover:underline mt-1">
                      Sign in as Student &rarr;
                    </Link>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-buk-navy/5 border border-buk-navy/10 flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-buk-navy text-buk-gold shrink-0">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Lecturer Terminal</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">Conduct live classroom attendance with instantaneous facial matching.</p>
                    <Link href="/login?role=lecturer" className="inline-flex items-center gap-1 text-[11px] font-bold text-buk-navy hover:text-buk-gold-dark mt-1">
                      Sign in as Lecturer &rarr;
                    </Link>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-start gap-3.5">
                  <div className="p-2 rounded-lg bg-buk-gold text-buk-navy shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">Administrative Control Room</h4>
                    <p className="text-[11px] text-slate-600 mt-0.5">Biometric enrollment, absence waiver review, and compliance audit trail.</p>
                    <Link href="/login?role=admin" className="inline-flex items-center gap-1 text-[11px] font-bold text-buk-navy hover:text-buk-gold-dark mt-1">
                      Sign in as Administrator &rarr;
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Demo Accounts pre-loaded &bull; Default credentials in documentation
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <h2 className="text-xs font-bold uppercase tracking-wider text-buk-gold-dark">
              Engineered For Institutional Excellence
            </h2>
            <p className="mt-2 text-3xl font-extrabold text-buk-navy sm:text-4xl">
              Why Bayero University Kano Relies on BUK-FRAS
            </p>
            <p className="mt-4 text-slate-600 text-base">
              Replacing pen-and-paper registers and vulnerable proxy signing with instant, tamper-proof facial recognition.
            </p>
          </div>

          <div className="mt-16 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-buk-navy text-buk-gold flex items-center justify-center mb-5">
                <Camera className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Real-Time Facial Matching</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Utilizes SSD MobileNet & 68-point facial landmarks to verify student identities within fractions of a second directly inside modern browsers.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-buk-gold text-buk-navy flex items-center justify-center mb-5">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Attendance Defaulter Alerts</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Automated tracking of the university&apos;s 70% minimum attendance threshold. Flag and notify students before semester examination clearance.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-buk-green text-white flex items-center justify-center mb-5">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Faculty & Course Granularity</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Hierarchical management structuring BUK Faculties, Departments, Academic Programmes, Course Units, and Venues across campuses.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-buk-navy-light text-white flex items-center justify-center mb-5">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Multi-Angle Enrollment</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Guided student onboarding capturing 5 high-resolution face profiles to ensure high recognition accuracy under diverse lighting conditions.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-slate-800 text-buk-gold flex items-center justify-center mb-5">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Instant Export to CSV / Excel</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                One-click attendance sheet compilation for senate meetings, departmental boards, and continuous assessment accreditation.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-buk-navy text-white flex items-center justify-center mb-5">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Stateless Serverless Architecture</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                Refactored specifically for Vercel deployment with Prisma ORM, lightweight vector storage, and zero serverless runtime bottlenecks.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* University Footer */}
      <footer className="mt-auto bg-buk-navy-dark text-slate-300 border-t-4 border-buk-gold">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4 md:col-span-2">
              <BukLogo lightText size="lg" />
              <p className="text-xs text-slate-400 max-w-sm mt-3 leading-relaxed">
                Bayero University Kano is a leading federal university committed to excellence in learning, research, and character.
              </p>
              <p className="text-xs text-buk-gold-light italic">
                PMB 3011, Gwarzo Road, Kano, Nigeria
              </p>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">System Portals</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/login?role=lecturer" className="hover:text-buk-gold transition-colors">Lecturer Terminal</Link></li>
                <li><Link href="/login?role=admin" className="hover:text-buk-gold transition-colors">Administrator Central</Link></li>
                <li><Link href="/login" className="hover:text-buk-gold transition-colors">Unified Login</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white uppercase tracking-wider mb-3">Key Campuses</h4>
              <ul className="space-y-2 text-xs text-slate-400">
                <li>BUK New Campus (Gwarzo Road)</li>
                <li>BUK Old Campus (Bayero Way)</li>
                <li>Aminu Kano Teaching Hospital (AKTH)</li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
            <p>&copy; {new Date().getFullYear()} Bayero University Kano (BUK). All rights reserved.</p>
            <p className="text-slate-400 font-mono text-[11px]">BUK-FRAS &bull; Refactored for Vercel</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
