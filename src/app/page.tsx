// @ts-nocheck
'use client';

import React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Flame,
  Shuffle,
  Users,
  Share2,
  Cake,
  Trophy
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import { usePelada, POSITION_LABELS } from '@/context/PeladaContext';

export default function HomeDashboardPage() {
  const {
    matchConfig,
    matchNumber,
    confirmedOutfield,
    confirmedGoalkeepers,
    waitingList,
    benchQueue,
    liveScore,
    financialSummary,
    currentMonthName,
    monthlyBirthdays,
    topScorers,
    openWhatsAppList,
    openWhatsAppBirthdays
  } = usePelada();

  return (
    <AppShell>
      <div className="space-y-5">
        {/* Card Principal da Próxima Pelada */}
        <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#142F47] bg-[#EBF2F7] border border-[#C5D7E5] px-3 py-1 rounded-lg">
                <Calendar className="w-4 h-4 text-[#31688E]" />
                <span>{matchConfig.date}</span>
              </span>
              {matchConfig.isBbqDay && (
                <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-[#7A5220] bg-[#F9F3EB] border border-[#E3D1B4] px-3 py-1 rounded-lg">
                  <Flame className="w-4 h-4 text-[#8C5E2A]" />
                  <span>Dia de Churrasco</span>
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#142F47] pt-1">
              {matchConfig.location}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <Link
              href="/jogo"
              className="min-h-[50px] px-4 py-3 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm"
            >
              <Shuffle className="w-5 h-5 text-[#9CC2DC]" />
              <span>Ir para o Jogo (#{matchNumber})</span>
            </Link>
            <Link
              href="/lista"
              className="min-h-[50px] px-4 py-3 rounded-xl bg-[#EBF2F7] hover:bg-[#DCE9F2] text-[#142F47] border border-[#C5D7E5] font-bold text-base flex items-center justify-center gap-2"
            >
              <Users className="w-5 h-5 text-[#31688E]" />
              <span>Check-in ({confirmedOutfield.length}/{matchConfig.maxOutfield})</span>
            </Link>
            <button
              type="button"
              onClick={openWhatsAppList}
              className="min-h-[50px] px-4 py-3 rounded-xl bg-[#FAF8F4] hover:bg-[#EAE3D5] text-[#142F47] border border-[#DDD5C7] font-bold text-base flex items-center justify-center gap-2"
            >
              <Share2 className="w-5 h-5 text-[#31688E]" />
              <span>Enviar Lista WhatsApp</span>
            </button>
          </div>
        </div>

        {/* 4 Indicadores Principais */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <Link
            href="/lista"
            className="text-left bg-white border border-[#DDD5C7] hover:border-[#31688E] rounded-2xl p-4 sm:p-5 shadow-sm transition"
          >
            <span className="text-xs sm:text-sm font-bold text-[#5A6E82] block">
              Confirmados
            </span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-2xl sm:text-3xl font-black text-[#142F47] tabular-nums">
                {confirmedOutfield.length}
              </span>
              <span className="text-sm font-semibold text-[#5A6E82]">
                / {matchConfig.maxOutfield}
              </span>
            </div>
            <span className="mt-1 block text-xs sm:text-sm font-medium text-[#31688E]">
              {confirmedGoalkeepers.length} goleiros • {waitingList.length} espera
            </span>
          </Link>

          <Link
            href="/jogo"
            className="text-left bg-white border border-[#DDD5C7] hover:border-[#31688E] rounded-2xl p-4 sm:p-5 shadow-sm transition"
          >
            <span className="text-xs sm:text-sm font-bold text-[#5A6E82] block">
              Placar Atual
            </span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black text-[#142F47] tabular-nums">
                {liveScore.score1} x {liveScore.score2}
              </span>
            </div>
            <span className="mt-1 block text-xs sm:text-sm font-medium text-[#31688E]">
              Jogo #{matchNumber} • {benchQueue.length} na fila
            </span>
          </Link>

          <Link
            href="/caixa"
            className="text-left bg-white border border-[#DDD5C7] hover:border-[#31688E] rounded-2xl p-4 sm:p-5 shadow-sm transition"
          >
            <span className="text-xs sm:text-sm font-bold text-[#5A6E82] block">
              Caixa Pelada
            </span>
            <div className="mt-1">
              <span className="text-2xl sm:text-3xl font-black text-[#142F47] tabular-nums">
                R$ {financialSummary.peladaBalance.toFixed(0)}
              </span>
            </div>
            <span className="mt-1 block text-xs sm:text-sm font-semibold text-[#7A5220]">
              {financialSummary.pendingMensalistas > 0
                ? `${financialSummary.pendingMensalistas} pendentes`
                : 'Tudo em dia'}
            </span>
          </Link>

          <Link
            href="/caixa"
            className="text-left bg-white border border-[#DDD5C7] hover:border-[#8C5E2A] rounded-2xl p-4 sm:p-5 shadow-sm transition"
          >
            <span className="text-xs sm:text-sm font-bold text-[#7A5220] block">
              Caixa Churrasco
            </span>
            <div className="mt-1">
              <span className="text-2xl sm:text-3xl font-black text-[#7A5220] tabular-nums">
                R$ {financialSummary.bbqBalance.toFixed(0)}
              </span>
            </div>
            <span className="mt-1 block text-xs sm:text-sm font-medium text-[#5A6E82]">
              {financialSummary.bbqPaidCount}/{financialSummary.bbqConfirmedCount} pagos
            </span>
          </Link>
        </div>

        {/* Grid Principal: Aniversariantes do Mês + Top 3 Artilharia */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* ANIVERSARIANTES DO MÊS (OBRIGATÓRIO) */}
          <div className="lg:col-span-2 bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#EAE3D5]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-[#F9F3EB] border border-[#E3D1B4] flex items-center justify-center shrink-0">
                  <Cake className="w-6 h-6 text-[#8C5E2A]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#142F47]">
                    Aniversariantes de {currentMonthName}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5A6E82]">
                    {monthlyBirthdays.length} atletas comemoram neste mês
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openWhatsAppBirthdays}
                disabled={monthlyBirthdays.length === 0}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#FAF8F4] hover:bg-[#EAE3D5] text-[#142F47] border border-[#DDD5C7] text-sm font-bold flex items-center gap-2"
              >
                <Share2 className="w-4 h-4 text-[#31688E]" />
                <span>Parabéns no Grupo</span>
              </button>
            </div>

            {monthlyBirthdays.length === 0 ? (
              <p className="py-6 text-center text-sm text-[#5A6E82]">
                Nenhum aniversariante em {currentMonthName}.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {monthlyBirthdays.map((player) => (
                  <div
                    key={player.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-3 ${
                      player.isToday
                        ? 'bg-[#F9F3EB] border-[#8C5E2A]'
                        : 'bg-[#FAF8F4] border-[#E2DBD0]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 border ${
                          player.isToday
                            ? 'bg-[#8C5E2A] text-white border-[#8C5E2A]'
                            : 'bg-white text-[#142F47] border-[#DDD5C7]'
                        }`}
                      >
                        <span className="text-base font-black leading-none">
                          {String(player.birthDay).padStart(2, '0')}
                        </span>
                        <span className="text-[10px] uppercase font-bold mt-0.5">
                          {currentMonthName.slice(0, 3)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[#142F47] truncate">
                          {player.name}
                        </p>
                        <span className="text-xs font-semibold text-[#5A6E82]">
                          {POSITION_LABELS[player.position].label}
                        </span>
                      </div>
                    </div>

                    {player.isToday && (
                      <span className="px-3 py-1 rounded-full bg-[#8C5E2A] text-white text-xs font-bold shrink-0">
                        Hoje! 🎉
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 3 Artilheiros */}
          <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE3D5]">
              <h3 className="text-base sm:text-lg font-extrabold text-[#142F47] flex items-center gap-2">
                <Trophy className="w-5 h-5 text-[#8C5E2A]" />
                Top Artilheiros
              </h3>
              <Link href="/ranking" className="text-sm font-bold text-[#31688E] hover:underline">
                Ver todos
              </Link>
            </div>

            <div className="space-y-3">
              {topScorers.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-[#FAF8F4] border border-[#E2DBD0] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-lg bg-[#142F47] text-white text-sm font-bold flex items-center justify-center shrink-0">
                      {idx + 1}º
                    </span>
                    <div className="min-w-0">
                      <p className="text-base font-bold text-[#142F47] truncate">{p.name}</p>
                      <span className="text-xs text-[#5A6E82]">{p.stats.assists} assistências</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-lg font-black text-[#142F47] tabular-nums">
                      {p.stats.goals}
                    </span>
                    <span className="text-xs text-[#5A6E82] block">gols</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
