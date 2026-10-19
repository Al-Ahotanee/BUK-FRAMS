import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';

export const metadata: Metadata = {
  title: 'BUK-FRAS | Bayero University Kano Attendance System',
  description: 'AI-Powered Facial Recognition Attendance Management System for Bayero University Kano, Nigeria.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Load face-api.min.js locally from public folder */}
        <Script src="/vendor/face-api.min.js" strategy="beforeInteractive" />
      </head>
      <body className="antialiased bg-slate-50 text-slate-900 selection:bg-buk-gold selection:text-white">
        {children}
      </body>
    </html>
  );
}
