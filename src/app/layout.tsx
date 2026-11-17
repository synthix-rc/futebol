import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Resenha • SESI, SENAI e Amigos | Gestão da Pelada',
  description: 'Gestão de Pelada, Magic Link, Sorteio de Quadros e Caixa — Resenha SESI, SENAI e Amigos',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.className} antialiased selection:bg-[#142F47] selection:text-[#F4F0E8]`}>
        {children}
      </body>
    </html>
  );
}
