// @ts-nocheck
'use client';

import React, { useState } from 'react';
import {
  RotateCcw,
  Share2,
  RefreshCw,
  Sparkles,
  UserMinus,
  X
} from 'lucide-react';
import AppShell from '@/components/AppShell';
import {
  usePelada,
  POSITION_LABELS,
  AVAILABILITY_LABELS
} from '@/context/PeladaContext';
import { DayAvailability, MatchOutcome } from '@/lib/rotation-engine';

export default function JogoAoVivoPage() {
  const {
    players,
    matchNumber,
    quadro1,
    quadro2,
    benchQueue,
    rotationExplanation,
    selectedSwap,
    liveScore,
    showToast,
    drawInitialMatchOfTheDay,
    handleRotateAfterMatch,
    replacePlayerInQuadro,
    handlePoolAvailabilityChange,
    handleManualSwap,
    registerGoal,
    openWhatsAppQuadros
  } = usePelada();

  const [goalModal, setGoalModal] = useState({ open: false, quadroNum: 1, scorerId: '', assistId: '' });
  const [endMatchModal, setEndMatchModal] = useState<{ open: boolean; outcome: MatchOutcome }>({
    open: false,
    outcome: 'QUADRO_1_WINS'
  });
  const [replaceModal, setReplaceModal] = useState<{
    open: boolean;
    group: 'Q1' | 'Q2';
    playerLeavingId: string;
    reason: 'PULANDO_PROXIMA' | 'PAUSADO' | 'FOI_EMBORA';
    countMatchForLeavingPlayer: boolean;
    manualSubstituteId: string;
  }>({
    open: false,
    group: 'Q1',
    playerLeavingId: '',
    reason: 'PULANDO_PROXIMA',
    countMatchForLeavingPlayer: false,
    manualSubstituteId: ''
  });

  return (
    <AppShell>
      <div className="space-y-5">
        {/* PLACAR GRANDE E DIRETO */}
        <div className="bg-[#142F47] text-[#F4F0E8] border border-[#0E2234] rounded-2xl p-4 sm:p-6 shadow-md space-y-4">
          <div className="flex items-center justify-between">
            <span className="px-3 py-1 rounded-lg bg-[#0E2234] border border-[#244666] text-sm font-bold text-[#9CC2DC]">
              Partida #{matchNumber} em Campo
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  drawInitialMatchOfTheDay(true);
                  showToast('Partida #1 reiniciada.');
                }}
                className="px-3 py-2 rounded-xl bg-[#0E2234] hover:bg-[#1B3A56] text-[#D3DFEA] text-xs sm:text-sm font-bold border border-[#244666] flex items-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Zerar Dia</span>
              </button>
              <button
                onClick={openWhatsAppQuadros}
                className="px-3 py-2 rounded-xl bg-[#31688E] hover:bg-[#3B79A3] text-white text-xs sm:text-sm font-bold flex items-center gap-1.5"
              >
                <Share2 className="w-4 h-4" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:gap-5">
            <div className="bg-[#0E2234] p-4 sm:p-5 rounded-2xl border border-[#244666] text-center space-y-3">
              <h3 className="text-base sm:text-lg font-extrabold text-white">QUADRO 1</h3>
              <div className="text-5xl sm:text-6xl font-black text-white tabular-nums">
                {liveScore.score1}
              </div>
              <button
                onClick={() =>
                  setGoalModal({
                    open: true,
                    quadroNum: 1,
                    scorerId: quadro1[0] || '',
                    assistId: ''
                  })
                }
                className="w-full min-h-[48px] py-3 rounded-xl bg-[#31688E] hover:bg-[#3B79A3] text-white font-bold text-sm sm:text-base transition"
              >
                + GOL Q1
              </button>
            </div>

            <div className="bg-[#0E2234] p-4 sm:p-5 rounded-2xl border border-[#244666] text-center space-y-3">
              <h3 className="text-base sm:text-lg font-extrabold text-white">QUADRO 2</h3>
              <div className="text-5xl sm:text-6xl font-black text-white tabular-nums">
                {liveScore.score2}
              </div>
              <button
                onClick={() =>
                  setGoalModal({
                    open: true,
                    quadroNum: 2,
                    scorerId: quadro2[0] || '',
                    assistId: ''
                  })
                }
                className="w-full min-h-[48px] py-3 rounded-xl bg-[#31688E] hover:bg-[#3B79A3] text-white font-bold text-sm sm:text-base transition"
              >
                + GOL Q2
              </button>
            </div>
          </div>

          <button
            onClick={() => {
              const defaultOutcome: MatchOutcome =
                liveScore.score1 > liveScore.score2
                  ? 'QUADRO_1_WINS'
                  : liveScore.score2 > liveScore.score1
                  ? 'QUADRO_2_WINS'
                  : 'DRAW_OLDEST_LEAVES';
              setEndMatchModal({ open: true, outcome: defaultOutcome });
            }}
            className="w-full min-h-[54px] py-3.5 px-5 rounded-xl bg-[#F4F0E8] hover:bg-white text-[#142F47] font-extrabold text-base shadow-md flex items-center justify-center gap-2.5 transition"
          >
            <RefreshCw className="w-5 h-5" />
            <span>ENCERRAR PARTIDA #{matchNumber} & RODAR FILA</span>
          </button>
        </div>

        {/* Aviso Resumido da Última Rotação */}
        {rotationExplanation && (
          <div className="bg-[#EBF2F7] border border-[#B8D0E3] rounded-2xl p-4 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-[#31688E] shrink-0 mt-0.5" />
            <div className="text-sm">
              <h4 className="font-bold text-[#142F47]">{rotationExplanation.title}</h4>
              <p className="text-[#2C4559] mt-0.5">{rotationExplanation.details}</p>
            </div>
          </div>
        )}

        {/* QUADRO 1, QUADRO 2 E FILA DE PRÓXIMOS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {[
            { key: 'Q1', title: 'QUADRO 1 (Em Campo)', ids: quadro1, headerBg: 'bg-[#142F47] text-white' },
            { key: 'Q2', title: 'QUADRO 2 (Em Campo)', ids: quadro2, headerBg: 'bg-[#31688E] text-white' },
            { key: 'BENCH', title: 'FILA DE PRÓXIMOS (Espera)', ids: benchQueue, headerBg: 'bg-[#EAE3D5] text-[#142F47]' }
          ].map((group) => {
            const groupPlayers = group.ids.map((id) => players.find((p) => p.id === id)).filter(Boolean);

            return (
              <div
                key={group.key}
                className="bg-white border border-[#DDD5C7] rounded-2xl overflow-hidden shadow-sm"
              >
                <div className={`${group.headerBg} px-4 py-3.5 flex items-center justify-between`}>
                  <span className="text-base font-extrabold">{group.title}</span>
                  <span className="text-sm font-bold opacity-90">{groupPlayers.length} atletas</span>
                </div>

                <div className="p-3.5 space-y-2.5">
                  {groupPlayers.map((player, idx) => {
                    const isSelected = selectedSwap?.playerId === player.id;
                    const wasPickedToComplete =
                      player.wasDrawnToComplete || rotationExplanation?.completedIds?.includes(player.id);

                    return (
                      <div
                        key={player.id}
                        className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-2 ${
                          isSelected
                            ? 'bg-[#EBF2F7] border-[#142F47] ring-2 ring-[#31688E]/40'
                            : wasPickedToComplete
                            ? 'bg-[#F9F3EB] border-[#D8C09D]'
                            : 'bg-[#FAF8F4] border-[#E2DBD0]'
                        }`}
                      >
                        <div
                          onClick={() => handleManualSwap(group.key, player.id)}
                          className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                        >
                          {group.key === 'BENCH' && (
                            <span className="text-sm font-extrabold text-[#7A5220] w-6">
                              {idx + 1}º
                            </span>
                          )}
                          <span
                            className={`text-xs font-bold px-2 py-1 rounded-md border shrink-0 ${POSITION_LABELS[player.position].color}`}
                          >
                            {POSITION_LABELS[player.position].short}
                          </span>
                          <div className="min-w-0">
                            <p className="text-base font-bold text-[#142F47] truncate">
                              {player.name}
                            </p>
                            {wasPickedToComplete && group.key !== 'BENCH' && (
                              <span className="text-xs text-[#7A5220] font-bold block">
                                Sorteado p/ completar
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="px-2.5 py-1 rounded-lg bg-white border border-[#DDD5C7] text-sm font-bold text-[#142F47]">
                            {player.matchesPlayedToday}J
                          </span>

                          {group.key !== 'BENCH' ? (
                            <button
                              type="button"
                              onClick={() =>
                                setReplaceModal({
                                  open: true,
                                  group: group.key as 'Q1' | 'Q2',
                                  playerLeavingId: player.id,
                                  reason: 'PULANDO_PROXIMA',
                                  countMatchForLeavingPlayer: false,
                                  manualSubstituteId: ''
                                })
                              }
                              className="min-h-[40px] px-2.5 py-1.5 rounded-lg bg-white hover:bg-[#EBF2F7] text-[#142F47] border border-[#DDD5C7] text-xs font-bold flex items-center gap-1"
                            >
                              <UserMinus className="w-4 h-4 text-[#31688E]" />
                              <span>Sair</span>
                            </button>
                          ) : (
                            <select
                              value={player.availability || 'ATIVO'}
                              onChange={(e) =>
                                handlePoolAvailabilityChange(
                                  player.id,
                                  e.target.value as DayAvailability
                                )
                              }
                              className={`min-h-[40px] text-xs font-bold px-2.5 py-1.5 rounded-lg border ${
                                AVAILABILITY_LABELS[player.availability || 'ATIVO'].badge
                              }`}
                            >
                              <option value="ATIVO">Ativo</option>
                              <option value="PULANDO_PROXIMA">Pular 1</option>
                              <option value="PAUSADO">Pausado</option>
                              <option value="FOI_EMBORA">Foi Embora</option>
                            </select>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* MODAL ENCERRAR PARTIDA */}
      {endMatchModal.open && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD5C7] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-lg font-extrabold text-[#142F47]">
                Encerrar Partida #{matchNumber}
              </h3>
              <button
                onClick={() => setEndMatchModal({ open: false, outcome: 'QUADRO_1_WINS' })}
                className="p-1 text-[#5A6E82]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                onClick={() => setEndMatchModal({ open: true, outcome: 'QUADRO_1_WINS' })}
                className={`min-h-[52px] p-3.5 rounded-xl font-bold text-sm sm:text-base border text-left transition flex items-center justify-between ${
                  endMatchModal.outcome === 'QUADRO_1_WINS'
                    ? 'bg-[#142F47] border-[#142F47] text-white'
                    : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#142F47]'
                }`}
              >
                <span>1. Vitória do Quadro 1 (Q1 Fica)</span>
                <span>{liveScore.score1} x {liveScore.score2}</span>
              </button>

              <button
                onClick={() => setEndMatchModal({ open: true, outcome: 'QUADRO_2_WINS' })}
                className={`min-h-[52px] p-3.5 rounded-xl font-bold text-sm sm:text-base border text-left transition flex items-center justify-between ${
                  endMatchModal.outcome === 'QUADRO_2_WINS'
                    ? 'bg-[#31688E] border-[#31688E] text-white'
                    : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#142F47]'
                }`}
              >
                <span>2. Vitória do Quadro 2 (Q2 Fica)</span>
                <span>{liveScore.score1} x {liveScore.score2}</span>
              </button>

              <button
                onClick={() => setEndMatchModal({ open: true, outcome: 'DRAW_OLDEST_LEAVES' })}
                className={`min-h-[52px] p-3.5 rounded-xl font-bold text-sm sm:text-base border text-left transition ${
                  endMatchModal.outcome === 'DRAW_OLDEST_LEAVES'
                    ? 'bg-[#142F47] border-[#142F47] text-white'
                    : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#142F47]'
                }`}
              >
                3. Empate • Sai o Quadro Mais Antigo
              </button>

              <button
                onClick={() => setEndMatchModal({ open: true, outcome: 'DRAW_BOTH_LEAVE' })}
                className={`min-h-[52px] p-3.5 rounded-xl font-bold text-sm sm:text-base border text-left transition ${
                  endMatchModal.outcome === 'DRAW_BOTH_LEAVE'
                    ? 'bg-[#8C5E2A] border-[#8C5E2A] text-white'
                    : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#7A5220]'
                }`}
              >
                4. Empate • Saem os Dois Quadros
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#EAE3D5]">
              <button
                onClick={() => setEndMatchModal({ open: false, outcome: 'QUADRO_1_WINS' })}
                className="min-h-[48px] rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  handleRotateAfterMatch(endMatchModal.outcome);
                  setEndMatchModal({ open: false, outcome: 'QUADRO_1_WINS' });
                }}
                className="min-h-[48px] rounded-xl bg-[#142F47] text-white font-bold text-sm"
              >
                Confirmar & Rodar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL SUBSTITUIR ATLETA */}
      {replaceModal.open && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD5C7] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-lg font-extrabold text-[#142F47]">
                Substituir no {replaceModal.group === 'Q1' ? 'Quadro 1' : 'Quadro 2'}
              </h3>
              <button
                onClick={() =>
                  setReplaceModal({
                    open: false,
                    group: 'Q1',
                    playerLeavingId: '',
                    reason: 'PULANDO_PROXIMA',
                    countMatchForLeavingPlayer: false,
                    manualSubstituteId: ''
                  })
                }
                className="p-1 text-[#5A6E82]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="p-3.5 rounded-xl bg-[#FAF8F4] border border-[#EAE3D5]">
                <span className="text-xs text-[#5A6E82] block">Atleta saindo:</span>
                <strong className="text-base text-[#142F47]">
                  {players.find((p) => p.id === replaceModal.playerLeavingId)?.name}
                </strong>
              </div>

              <div>
                <label className="text-[#142F47] font-bold block mb-1.5">Motivo da Saída</label>
                <select
                  value={replaceModal.reason}
                  onChange={(e) =>
                    setReplaceModal((prev) => ({
                      ...prev,
                      reason: e.target.value as 'PULANDO_PROXIMA' | 'PAUSADO' | 'FOI_EMBORA'
                    }))
                  }
                  className="w-full min-h-[48px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 text-sm text-[#142F47] font-bold"
                >
                  <option value="PULANDO_PROXIMA">Cansou / Pular 1 Jogo</option>
                  <option value="PAUSADO">Machucou / Em Observação</option>
                  <option value="FOI_EMBORA">Foi Embora</option>
                </select>
              </div>

              <div>
                <label className="text-[#142F47] font-bold block mb-1.5">Substituto</label>
                <select
                  value={replaceModal.manualSubstituteId}
                  onChange={(e) =>
                    setReplaceModal((prev) => ({ ...prev, manualSubstituteId: e.target.value }))
                  }
                  className="w-full min-h-[48px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 text-sm text-[#142F47] font-semibold"
                >
                  <option value="">⚡ Automático (Prioridade da Fila)</option>
                  {benchQueue
                    .map((id) => players.find((p) => p.id === id))
                    .filter((p) => p && p.availability === 'ATIVO')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({POSITION_LABELS[p.position].short} • {p.matchesPlayedToday}J)
                      </option>
                    ))}
                </select>
              </div>

              <label className="flex items-center gap-2.5 pt-1 cursor-pointer text-sm text-[#4A6075]">
                <input
                  type="checkbox"
                  checked={replaceModal.countMatchForLeavingPlayer}
                  onChange={(e) =>
                    setReplaceModal((prev) => ({
                      ...prev,
                      countMatchForLeavingPlayer: e.target.checked
                    }))
                  }
                  className="w-5 h-5 rounded border-[#DDD5C7]"
                />
                <span>Manter +1 jogo na conta de quem saiu</span>
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#EAE3D5]">
              <button
                onClick={() =>
                  setReplaceModal({
                    open: false,
                    group: 'Q1',
                    playerLeavingId: '',
                    reason: 'PULANDO_PROXIMA',
                    countMatchForLeavingPlayer: false,
                    manualSubstituteId: ''
                  })
                }
                className="min-h-[48px] rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  replacePlayerInQuadro({
                    group: replaceModal.group,
                    playerLeavingId: replaceModal.playerLeavingId,
                    reason: replaceModal.reason,
                    countMatchForLeavingPlayer: replaceModal.countMatchForLeavingPlayer,
                    manualSubstituteId: replaceModal.manualSubstituteId
                  });
                  setReplaceModal({
                    open: false,
                    group: 'Q1',
                    playerLeavingId: '',
                    reason: 'PULANDO_PROXIMA',
                    countMatchForLeavingPlayer: false,
                    manualSubstituteId: ''
                  });
                }}
                className="min-h-[48px] rounded-xl bg-[#142F47] text-white font-bold text-sm"
              >
                Substituir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR GOL */}
      {goalModal.open && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD5C7] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-lg font-extrabold text-[#142F47]">
                Gol do Quadro {goalModal.quadroNum}
              </h3>
              <button
                onClick={() => setGoalModal({ open: false, quadroNum: 1, scorerId: '', assistId: '' })}
                className="p-1 text-[#5A6E82]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="text-[#142F47] block mb-1.5 font-bold">Quem fez o gol? *</label>
                <select
                  value={goalModal.scorerId}
                  onChange={(e) => setGoalModal((prev) => ({ ...prev, scorerId: e.target.value }))}
                  className="w-full min-h-[50px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3.5 text-base text-[#142F47] font-bold"
                >
                  {(goalModal.quadroNum === 1 ? quadro1 : quadro2)
                    .map((id) => players.find((p) => p.id === id))
                    .filter(Boolean)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({POSITION_LABELS[p.position].short})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-[#142F47] block mb-1.5 font-bold">Assistência (Opcional)</label>
                <select
                  value={goalModal.assistId}
                  onChange={(e) => setGoalModal((prev) => ({ ...prev, assistId: e.target.value }))}
                  className="w-full min-h-[50px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3.5 text-base text-[#142F47]"
                >
                  <option value="">Sem assistência</option>
                  {(goalModal.quadroNum === 1 ? quadro1 : quadro2)
                    .map((id) => players.find((p) => p.id === id))
                    .filter((p) => p && p.id !== goalModal.scorerId)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({POSITION_LABELS[p.position].short})
                      </option>
                    ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#EAE3D5]">
              <button
                onClick={() => setGoalModal({ open: false, quadroNum: 1, scorerId: '', assistId: '' })}
                className="min-h-[48px] rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] font-bold text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  registerGoal(goalModal.quadroNum, goalModal.scorerId, goalModal.assistId);
                  setGoalModal({ open: false, quadroNum: 1, scorerId: '', assistId: '' });
                }}
                className="min-h-[48px] rounded-xl bg-[#142F47] text-white font-bold text-sm"
              >
                Confirmar Gol
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
