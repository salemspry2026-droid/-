import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Cairo } from "next/font/google";
import { cn } from "@/lib/utils";
import { AuthProvider } from '@/components/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { Toaster } from '@/components/ui/sonner';
import { ServiceWorkerRegister } from '@/components/ServiceWorkerRegister';

const cairo = Cairo({subsets:['arabic', 'latin'], variable:'--font-sans'});

export const metadata: Metadata = {
  title: 'Flowexa',
  description: 'نُدير أعمالك .. نربط عملاءك .. ننمي مبيعاتك',
  applicationName: 'Flowexa',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Flowexa',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-180.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#163C85',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="ar" dir="rtl" className={cn("font-sans", cairo.variable)}>
      <body suppressHydrationWarning className="bg-[#F0F2F5]">
        <ErrorBoundary>
          <AuthProvider>
            <ServiceWorkerRegister />
            {children}
            <Toaster />
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
