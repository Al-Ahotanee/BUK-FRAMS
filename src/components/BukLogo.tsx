import React from 'react';

interface BukLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showText?: boolean;
  lightText?: boolean;
}

export function BukLogo({
  className = '',
  size = 'md',
  showText = true,
  lightText = false,
}: BukLogoProps) {
  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Official Authentic BUK Emblem Seal */}
      <div
        className={`relative flex items-center justify-center rounded-2xl bg-white border-2 border-buk-gold shadow-md ${sizeMap[size]} shrink-0 overflow-hidden p-0.5`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/buk-logo.jpg"
          alt="Bayero University Kano Emblem"
          className="w-full h-full object-contain filter drop-shadow-sm"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tracking-tight text-lg leading-tight ${lightText ? 'text-white' : 'text-slate-900'}`}>
              BAYERO UNIVERSITY KANO
            </span>
          </div>
          <span className={`text-[10px] tracking-wider font-medium uppercase ${lightText ? 'text-white/80' : 'text-slate-500'}`}>
            Facial Recognition Attendance System
          </span>
        </div>
      )}
    </div>
  );
}
