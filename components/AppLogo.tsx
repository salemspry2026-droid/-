import React from 'react';

export function AppLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`relative ${className} flex items-center justify-center shrink-0`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-lg">
        {/* The 'ف' Dot */}
        <circle cx="28" cy="24" r="7" fill="#163C85" />
        
        {/* Main body of 'ف' composed of flowing curves */}
        {/* Top curve */}
        <path d="M 50 15 C 65 15, 80 20, 85 25 C 75 35, 60 30, 45 35 C 38 37, 40 50, 45 60 C 50 70, 45 90, 35 90 C 25 90, 20 80, 20 70 C 20 60, 30 55, 38 60 C 45 65, 52 50, 45 40 C 35 25, 40 15, 50 15 Z" fill="url(#blue-gradient)" />
        
        {/* Side flowing ribbons mimicking the design */}
        <path d="M 45 35 C 60 30, 75 35, 90 25 C 85 35, 75 40, 60 40 C 50 40, 45 35, 45 35 Z" fill="#41CAE6" />
        <path d="M 45 60 C 60 55, 80 50, 90 60 C 80 65, 65 65, 45 60 Z" fill="#7209b7" />
        
        <defs>
          <linearGradient id="blue-gradient" x1="20" y1="15" x2="90" y2="90" gradientUnits="userSpaceOnUse">
            <stop stopColor="#41CAE6" />
            <stop offset="0.5" stopColor="#0066ff" />
            <stop offset="1" stopColor="#163C85" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export function AppLogoText({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight flex items-center ${className}`}>
      <span className="text-[#163C85]">Flowe</span>
      <span className="text-[#0066ff]">x</span>
      <span className="text-[#163C85]">a</span>
    </span>
  );
}
