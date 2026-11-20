// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { Clock, Share2, X } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { usePelada, POSITION_LABELS } from '@/context/PeladaContext';

export default function ListaCheckinPage() {
  const {
    matchConfig,
    confirmedGoalkeepers,
    confirmedOutfield,
    waitingList,
    absentList,
    handleAttendanceAction,
    handleReleaseWaitingList,
    openWhatsAppList
  } = usePelada();

  const [subTab, setSubTab] = useState<'CONFIRMADOS' | 'ESPERA' | 'FORA'>('CONFIRMADOS');

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#142F47]">
                Lista da Semana & Check-in no Campo
              </h2>
              <p className="text-sm text-[#5A6E82]">
                Toque em <strong>Check-in</strong> quando o jogador chegar ao campo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {matchConfig.windowMode === 'MENSALISTAS' && waitingList.length > 0 && (
                <button
                  onClick={handleReleaseWaitingList}
                  className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#EBF2F7] text-[#142F47] border border-[#C5D7E5] text-sm font-bold flex items-center gap-2"
                >
                  <Clock className="w-4 h-4 text-[#31688E]" />
                  <span>Liberar {waitingList.length} Diaristas</span>
                </button>
              )}

              <button
                onClick={openWhatsAppList}
                className="min-h-[46px] px-4 py-2.5 rounded-xl bg-[#142F47] text-white font-bold text-sm flex items-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Copiar Lista p/ WhatsApp</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#EAE3D5]">
            <button
              type="button"
              onClick={() => setSubTab('CONFIRMADOS')}
              className={`min-h-[48px] rounded-xl font-bold text-sm sm:text-base transition border ${
                subTab === 'CONFIRMADOS'
                  ? 'bg-[#142F47] text-white border-[#142F47]'
                  : 'bg-[#FAF8F4] text-[#4A6075] border-[#DDD5C7]'
              }`}
            >
              Confirmados ({confirmedOutfield.length + confirmedGoalkeepers.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('ESPERA')}
              className={`min-h-[48px] rounded-xl font-bold text-sm sm:text-base transition border ${
                subTab === 'ESPERA'
                  ? 'bg-[#8C5E2A] text-white border-[#8C5E2A]'
                  : 'bg-[#FAF8F4] text-[#4A6075] border-[#DDD5C7]'
              }`}
            >
              Espera ({waitingList.length})
            </button>
            <button
              type="button"
              onClick={() => setSubTab('FORA')}
              className={`min-h-[48px] rounded-xl font-bold text-sm sm:text-base transition border ${
                subTab === 'FORA'
                  ? 'bg-[#31688E] text-white border-[#31688E]'
                  : 'bg-[#FAF8F4] text-[#4A6075] border-[#DDD5C7]'
              }`}
            >
              Ausentes ({absentList.length})
            </button>
          </div>
        </div>

        {subTab === 'CONFIRMADOS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[...confirmedGoalkeepers, ...confirmedOutfield].map((player) => (
              <div
                key={player.id}
                className="bg-white border border-[#DDD5C7] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-extrabold text-[#31688E] bg-[#EBF2F7] px-2 py-0.5 rounded border border-[#C5D7E5]">
                      #{player.arrivalOrder}
                    </span>
                    <p className="text-base font-bold text-[#142F47] truncate">
                      {player.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border ${POSITION_LABELS[player.position].color}`}>
                      {POSITION_LABELS[player.position].short}
                    </span>
                    <span className="text-xs font-semibold text-[#5A6E82]">
                      {player.type}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {matchConfig.isBbqDay && (
                    <button
                      onClick={() => handleAttendanceAction(player.id, 'TOGGLE_BBQ')}
                      className={`min-h-[44px] px-3 rounded-xl text-xs font-bold border transition ${
                        player.bbqConfirmed
                          ? 'bg-[#F9F3EB] text-[#7A5220] border-[#E3D1B4]'
                          : 'bg-[#FAF8F4] text-[#8C9BA8] border-[#E2DBD0]'
                      }`}
                    >
                      🥩 {player.bbqConfirmed ? 'Sim' : 'Não'}
                    </button>
                  )}
                  <button
                    onClick={() => handleAttendanceAction(player.id, 'TOGGLE_CHECKIN')}
                    className={`min-h-[44px] px-3.5 rounded-xl text-sm font-bold border transition ${
                      player.checkedIn
                        ? 'bg-[#142F47] text-white border-[#142F47]'
                        : 'bg-[#FAF8F4] text-[#5A6E82] border-[#DDD5C7]'
                    }`}
                  >
                    {player.checkedIn ? 'No Campo ✓' : 'Check-in'}
                  </button>
                  <button
                    onClick={() => handleAttendanceAction(player.id, 'DESISTIR')}
                    className="min-h-[44px] px-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200"
                    title="Remover da lista"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {subTab === 'ESPERA' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {waitingList.length === 0 ? (
              <div className="col-span-2 bg-white border border-[#DDD5C7] rounded-2xl p-8 text-center text-base text-[#5A6E82]">
                Nenhum jogador na fila de espera.
              </div>
            ) : (
              waitingList.map((player, idx) => (
                <div
                  key={player.id}
                  className="bg-white border border-[#DDD5C7] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-[#8C5E2A]">{idx + 1}º</span>
                      <p className="text-base font-bold text-[#142F47]">{player.name}</p>
                    </div>
                    <span className="text-xs font-semibold text-[#5A6E82]">
                      {player.type} • {POSITION_LABELS[player.position].label}
                    </span>
                  </div>
                  <button
                    onClick={() => handleAttendanceAction(player.id, 'DESISTIR')}
                    className="min-h-[44px] px-3.5 rounded-xl bg-red-50 text-red-700 font-bold text-sm border border-red-200"
                  >
                    Remover
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {subTab === 'FORA' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {absentList.map((player) => (
              <div
                key={player.id}
                className="bg-white border border-[#DDD5C7] rounded-2xl p-4 shadow-sm flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-base font-bold text-[#142F47]">{player.name}</p>
                  <span className="text-xs font-semibold text-[#5A6E82]">
                    {player.type} • {POSITION_LABELS[player.position].label}
                  </span>
                </div>
                <button
                  onClick={() => handleAttendanceAction(player.id, 'CONFIRMAR')}
                  className="min-h-[44px] px-4 rounded-xl bg-[#142F47] text-white text-sm font-bold"
                >
                  Incluir na Lista
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
