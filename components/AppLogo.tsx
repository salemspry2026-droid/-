import React from 'react';

export function AppLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`relative ${className} flex items-center justify-center shrink-0`}>
      <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full drop-shadow-sm transition-transform duration-300">
        <defs>
          <linearGradient id="blueGlow" x1="45" y1="20" x2="85" y2="35" gradientUnits="userSpaceOnUse">
             <stop stopColor="#014db5" />
             <stop offset="1" stopColor="#013b8c" />
          </linearGradient>
          <linearGradient id="greenGlow" x1="43" y1="35" x2="80" y2="50" gradientUnits="userSpaceOnUse">
             <stop stopColor="#14a34b" />
             <stop offset="1" stopColor="#0a7a33" />
          </linearGradient>
          <linearGradient id="purpleGlow" x1="40" y1="50" x2="75" y2="80" gradientUnits="userSpaceOnUse">
             <stop stopColor="#6711ab" />
             <stop offset="1" stopColor="#430773" />
          </linearGradient>
          <linearGradient id="darkBlueBase" x1="15" y1="40" x2="45" y2="65" gradientUnits="userSpaceOnUse">
             <stop stopColor="#113375" />
             <stop offset="1" stopColor="#051638" />
          </linearGradient>
        </defs>

        {/* The 'ف' Dot */}
        <circle cx="34" cy="38" r="4.5" fill="#014db5" />
        
        {/* The 'ف' Body */}
        <path d="M 37 54 C 37 45 50 45 50 54 C 50 63 35 73 22 73 C 14 73 12 60 12 60 L 19 56 C 19 56 21 65 24 65 C 32 65 41 61 41 54 C 41 49 37 49 37 54 Z" fill="url(#darkBlueBase)" />
        
        {/* The F Top Stroke - Blue */}
        <path d="M 47 48 C 47 25 65 20 88 20 C 88 20 88 32 72 32 C 60 32 55 35 52 48 Z" fill="url(#blueGlow)" />
        
        {/* The F Middle Stroke - Green */}
        <path d="M 44 63 C 44 40 60 36 82 36 C 82 36 82 48 68 48 C 55 48 51 51 49 63 Z" fill="url(#greenGlow)" />

        {/* The F Bottom Vertebrae / Stroke - Purple */}
        <path d="M 40 80 C 43 55 58 52 75 52 C 75 52 75 64 64 64 C 53 64 48 68 47 80 Z" fill="url(#purpleGlow)" />
      </svg>
    </div>
  );
}

export function AppLogoText({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-black tracking-tight flex items-center gap-[2px] ${className}`}>
      <span className="text-[#014db5]">Flow</span>
      <span className="text-[#14a34b]">e</span>
      <span className="text-[#6711ab]">x</span>
      <span className="text-[#051638]">a</span>
    </span>
  );
}
