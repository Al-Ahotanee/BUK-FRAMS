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
      {/* Official BUK Stylized Seal SVG */}
      <div className={`relative flex items-center justify-center rounded-full bg-buk-navy border-2 border-buk-gold shadow-md ${sizeMap[size]} shrink-0 overflow-hidden`}>
        <svg viewBox="0 0 100 100" className="w-full h-full p-1" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Outer circle with gold border */}
          <circle cx="50" cy="50" r="46" stroke="#C5A059" strokeWidth="3" fill="#002147" />
          <circle cx="50" cy="50" r="39" stroke="#C5A059" strokeWidth="1" strokeDasharray="3 2" />
          
          {/* Stylized Quran/Book & Torch of Knowledge in center */}
          <path d="M50 24 L50 72" stroke="#C5A059" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M30 38 Q50 48 50 68 Q50 48 70 38 L68 72 Q50 62 50 68 Q50 62 32 72 Z" fill="#C5A059" fillOpacity="0.85" />
          
          {/* Torch flame symbolizing enlightenment */}
          <path d="M50 18 Q55 24 50 28 Q45 24 50 18 Z" fill="#006837" stroke="#C5A059" strokeWidth="1" />
          
          {/* Star motifs */}
          <circle cx="28" cy="50" r="2" fill="#C5A059" />
          <circle cx="72" cy="50" r="2" fill="#C5A059" />
          
          {/* BUK Monogram at base */}
          <text x="50" y="86" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="bold" fontFamily="sans-serif">
            BUK
          </text>
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className={`font-bold tracking-tight text-lg leading-tight ${lightText ? 'text-white' : 'text-buk-navy'}`}>
              BAYERO UNIVERSITY
            </span>
            <span className="font-extrabold text-lg text-buk-gold leading-tight">
              KANO
            </span>
          </div>
          <span className={`text-[10px] tracking-wider font-medium uppercase ${lightText ? 'text-buk-gold-light' : 'text-slate-500'}`}>
            Facial Recognition Attendance System
          </span>
        </div>
      )}
    </div>
  );
}
