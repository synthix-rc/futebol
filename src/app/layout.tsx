import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { PeladaProvider } from '@/context/PeladaContext';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: 'Resenha • SESI, SENAI e Amigos | Gestão da Pelada',
  description: 'Gestão de Pelada, Magic Link, Sorteio de Quadros e Caixa — Resenha SESI, SENAI e Amigos',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/icon.png', type: 'image/png', sizes: '256x256' },
    ],
    apple: [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased selection:bg-[#142F47] selection:text-[#F4F0E8]`}>
        <PeladaProvider>{children}</PeladaProvider>
      </body>
    </html>
  );
}
