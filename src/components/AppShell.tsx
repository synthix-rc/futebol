// @ts-nocheck
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Shuffle,
  Calendar,
  Users,
  Trophy,
  DollarSign,
  Menu,
  X,
  CheckCircle2,
  Copy,
  Check,
  Smartphone
} from 'lucide-react';
import { usePelada } from '@/context/PeladaContext';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    matchNumber,
    confirmedOutfield,
    matchConfig,
    players,
    toast,
    showToast,
    whatsappModal,
    setWhatsappModal
  } = usePelada();

  const navItems = [
    { href: '/', label: 'Início (Dashboard)', icon: LayoutDashboard },
    { href: '/jogo', label: 'Jogo & Quadros (Ao Vivo)', icon: Shuffle, badge: `Jogo #${matchNumber}` },
    { href: '/lista', label: 'Lista & Check-in', icon: Calendar, badge: `${confirmedOutfield.length}/${matchConfig.maxOutfield}` },
    { href: '/elenco', label: 'Elenco de Jogadores', icon: Users, badge: `${players.length}` },
    { href: '/ranking', label: 'Ranking & Artilharia', icon: Trophy },
    { href: '/caixa', label: 'Caixa & Churrasco', icon: DollarSign },
  ];

  const currentNav = navItems.find((i) => i.href === pathname) || navItems[0];

  const copyToClipboard = () => {
    navigator.clipboard.writeText(whatsappModal.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Copiado!');
  };

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#142F47] font-sans pb-12">
      {/* TOAST */}
      {toast && (
        <div className="fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 z-50 flex items-center gap-3 bg-[#142F47] text-white font-semibold px-5 py-4 rounded-2xl shadow-xl border-2 border-[#31688E]">
          <CheckCircle2 className="w-5 h-5 text-[#9CC2DC] shrink-0" />
          <span className="text-sm sm:text-base">{toast}</span>
        </div>
      )}

      {/* CABEÇALHO ÚNICO COM MENU SANDUÍCHE */}
      <header className="sticky top-0 z-30 bg-[#142F47] text-[#F4F0E8] border-b border-[#0E2234] shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3 min-w-0">
            <img
              src="/logo-resenha.jpg"
              alt="Resenha"
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full object-cover border-2 border-[#F4F0E8] shadow-sm shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                  RESENHA
                </h1>
                <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded bg-[#31688E] text-white">
                  SESI, SENAI e Amigos
                </span>
              </div>
              <p className="text-sm font-semibold text-[#9CC2DC] truncate">
                {currentNav.label}
              </p>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir menu"
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0E2234] hover:bg-[#1B3A56] border border-[#31688E] text-white font-bold text-sm active:scale-95 transition shrink-0"
          >
            <Menu className="w-6 h-6 text-[#F4F0E8]" />
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* DRAWER DO MENU SANDUÍCHE */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 bg-[#0E2234]/70 backdrop-blur-xs"
          />
          <div className="relative z-10 w-80 max-w-[85vw] bg-white h-full shadow-2xl border-l border-[#DDD5C7] flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="bg-[#142F47] text-white p-5 flex items-center justify-between border-b border-[#0E2234]">
                <div className="flex items-center gap-3">
                  <img
                    src="/logo-resenha.jpg"
                    alt="Resenha"
                    className="w-11 h-11 rounded-full object-cover border-2 border-[#F4F0E8]"
                  />
                  <div>
                    <p className="text-base font-extrabold leading-tight">RESENHA</p>
                    <p className="text-xs text-[#9CC2DC]">SESI, SENAI e Amigos</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  className="p-2 rounded-xl bg-[#0E2234] text-white hover:bg-[#1B3A56]"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <nav className="p-4 space-y-2">
                <p className="px-2 text-xs font-bold uppercase tracking-wider text-[#5A6E82] mb-2">
                  Páginas do Sistema
                </p>
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={`w-full min-h-[54px] px-4 py-3 rounded-xl flex items-center justify-between font-bold text-base transition ${
                        active
                          ? 'bg-[#142F47] text-white shadow-sm'
                          : 'bg-[#FAF8F4] hover:bg-[#EAE3D5] text-[#142F47] border border-[#EAE3D5]'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-[#9CC2DC]' : 'text-[#31688E]'}`} />
                        <span>{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${
                            active ? 'bg-[#31688E] text-white' : 'bg-[#EBF2F7] text-[#142F47]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-[#EAE3D5] bg-[#FAF8F4] space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-[#5A6E82]">
                Link Público do Grupo
              </p>
              <Link
                href="/convite/semana-47"
                onClick={() => setMenuOpen(false)}
                className="w-full min-h-[50px] px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border bg-white text-[#142F47] border-[#DDD5C7] hover:bg-[#EBF2F7] transition"
              >
                <Smartphone className="w-5 h-5 text-[#31688E]" />
                <span>Abrir Magic Link do Jogador</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CONTEÚDO DA PÁGINA ATUAL */}
      <main className="max-w-7xl mx-auto px-4 pt-5 space-y-6">{children}</main>

      {/* MODAL WHATSAPP COMPARTILHADO */}
      {whatsappModal.open && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD5C7] rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-lg font-extrabold text-[#142F47]">{whatsappModal.title}</h3>
              <button
                onClick={() => setWhatsappModal({ open: false, title: '', text: '' })}
                className="p-1 text-[#5A6E82]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <textarea
              readOnly
              value={whatsappModal.text}
              rows={11}
              className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl p-3.5 text-sm font-mono text-[#142F47] focus:outline-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setWhatsappModal({ open: false, title: '', text: '' })}
                className="min-h-[48px] rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] text-sm font-bold"
              >
                Fechar
              </button>
              <button
                onClick={copyToClipboard}
                className="min-h-[48px] flex items-center justify-center gap-2 rounded-xl bg-[#142F47] text-white text-sm font-bold"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
