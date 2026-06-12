import React from 'react';
import Image from 'next/image';

export function AppLogo({ className = "w-10 h-10" }: { className?: string }) {
  return (
    <div className={`relative ${className} flex items-center justify-center shrink-0 rounded-[22%] overflow-hidden shadow-md ring-1 ring-black/5 bg-white transition-all duration-300 hover:shadow-lg hover:scale-105`}>
      <Image
        src="/logo.jpg"
        alt="Flowexa Logo"
        fill
        className="object-cover"
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

export function AppLogoText({ className = "text-2xl" }: { className?: string }) {
  return (
    <span dir="ltr" className={`font-black tracking-tight flex items-center gap-[2px] ${className}`}>
      <span className="text-[#014db5]">Flow</span>
      <span className="text-[#14a34b]">e</span>
      <span className="text-[#6711ab]">x</span>
      <span className="text-[#051638]">a</span>
    </span>
  );
}
