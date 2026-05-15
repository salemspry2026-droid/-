import type {Metadata} from 'next';
import './globals.css';
import { Cairo } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuthProvider } from '@/components/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { SpeedInsights } from '@vercel/speed-insights/next';

const cairo = Cairo({subsets:['arabic', 'latin'], variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'OrderFlow',
  description: 'B2B Customer Order Registration and Management System',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl" className={cn("font-sans", cairo.variable)}>
      <body suppressHydrationWarning className="bg-[#F0F2F5]">
        <ErrorBoundary>
          <AuthProvider>
            {children}
            <Toaster />
          </AuthProvider>
        </ErrorBoundary>
        <SpeedInsights />
      </body>
    </html>
  );
}
