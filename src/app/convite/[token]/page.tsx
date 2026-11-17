'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { PeladaSession, Player, SessionAttendance } from '@/types/database';
import {
  Calendar,
  Flame,
  CheckCircle2,
  XCircle,
  Smartphone,
  Lock,
  UserCheck,
  LogOut,
  KeyRound,
} from 'lucide-react';

const STORAGE_KEY = 'peladapro_recognized_player_v1';

interface SavedDeviceIdentity {
  playerId: string;
  phoneLast4: string;
}

const getCleanDigits = (value: string) => (value || '').replace(/\D/g, '');
const getLast4 = (phone: string) => getCleanDigits(phone).slice(-4);

export default function MagicLinkInvitePage({ params }: { params: { token: string } }) {
  const [session, setSession] = useState<PeladaSession | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendances, setAttendances] = useState<SessionAttendance[]>([]);

  // Estado de reconhecimento no navegador (Celular ou WhatsApp Web no PC)
  const [recognizedPlayerId, setRecognizedPlayerId] = useState<string>('');
  const [verifiedLast4, setVerifiedLast4] = useState<string>('');
  const [isAutoRecognized, setIsAutoRecognized] = useState<boolean>(false);

  // Campos de 1º acesso no navegador (Celular ou PC)
  const [candidatePlayerId, setCandidatePlayerId] = useState<string>('');
  const [phoneDigitsInput, setPhoneDigitsInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Estado das respostas
  const [goingGame, setGoingGame] = useState<boolean>(true);
  const [goingBbq, setGoingBbq] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  useEffect(() => {
    async function loadInviteData() {
      setLoading(true);
      const { data: sessionData } = await supabase
        .from('pelada_sessions')
        .select('*')
        .eq('magic_link_token', params.token)
        .single();

      if (sessionData) {
        setSession(sessionData);
        const [{ data: playersData }, { data: attData }] = await Promise.all([
          supabase.from('players').select('*').eq('is_active', true).order('name'),
          supabase
            .from('session_attendances')
            .select('*, player:players(*)')
            .eq('session_id', sessionData.id),
        ]);

        const activePlayers = playersData || [];
        const sessionAtt = attData || [];
        setPlayers(activePlayers);
        setAttendances(sessionAtt);

        try {
          const rawSaved = localStorage.getItem(STORAGE_KEY);
          if (rawSaved) {
            const parsed: SavedDeviceIdentity = JSON.parse(rawSaved);
            const foundPlayer = activePlayers.find(
              (p) =>
                p.id === parsed.playerId &&
                (getLast4(p.phone) === parsed.phoneLast4 || p.pin_code === parsed.phoneLast4)
            );
            if (foundPlayer) {
              setRecognizedPlayerId(foundPlayer.id);
              setVerifiedLast4(parsed.phoneLast4);
              setIsAutoRecognized(true);
            } else {
              localStorage.removeItem(STORAGE_KEY);
            }
          }
        } catch {
          // Ignora erro de localStorage
        }
      }
      setLoading(false);
    }
    loadInviteData();
  }, [params.token]);

  const recognizedPlayer = useMemo(
    () => players.find((p) => p.id === recognizedPlayerId) || null,
    [players, recognizedPlayerId]
  );

  useEffect(() => {
    if (!recognizedPlayer) return;
    const existingAtt = attendances.find((a) => a.player_id === recognizedPlayer.id);
    if (existingAtt) {
      setGoingGame(existingAtt.status !== 'AUSENTE');
      setGoingBbq(existingAtt.bbq_attendance === 'VAI');
    }
  }, [recognizedPlayer, attendances]);

  function handleUnlockDevice(e: React.FormEvent) {
    e.preventDefault();
    setAuthError(null);
    setFeedback(null);

    const cleanInput = getCleanDigits(phoneDigitsInput);
    if (cleanInput.length < 4) {
      setAuthError('Digite pelo menos os 4 últimos dígitos do seu WhatsApp.');
      return;
    }

    const inputLast4 = cleanInput.slice(-4);

    if (candidatePlayerId) {
      const target = players.find((p) => p.id === candidatePlayerId);
      if (!target) {
        setAuthError('Selecione seu nome na lista.');
        return;
      }

      const playerLast4 = getLast4(target.phone);
      if (playerLast4 !== inputLast4 && target.pin_code !== inputLast4) {
        setAuthError(
          `Os dígitos finais (${inputLast4}) não conferem com o WhatsApp cadastrado de ${target.name}.`
        );
        return;
      }

      const payload: SavedDeviceIdentity = {
        playerId: target.id,
        phoneLast4: inputLast4,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setRecognizedPlayerId(target.id);
      setVerifiedLast4(inputLast4);
      setIsAutoRecognized(true);
      setPhoneDigitsInput('');
      return;
    }

    const matches = players.filter(
      (p) =>
        (cleanInput.length >= 8 && getCleanDigits(p.phone).endsWith(cleanInput)) ||
        getLast4(p.phone) === inputLast4
    );

    if (matches.length === 1) {
      const target = matches[0];
      const payload: SavedDeviceIdentity = {
        playerId: target.id,
        phoneLast4: inputLast4,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setRecognizedPlayerId(target.id);
      setVerifiedLast4(inputLast4);
      setIsAutoRecognized(true);
      setPhoneDigitsInput('');
    } else if (matches.length > 1) {
      setAuthError('Mais de um jogador possui esses 4 dígitos finais. Selecione seu nome acima.');
    } else {
      setAuthError('Nenhum jogador encontrado com esses dígitos de WhatsApp.');
    }
  }

  function handleSwitchPlayer() {
    localStorage.removeItem(STORAGE_KEY);
    setRecognizedPlayerId('');
    setVerifiedLast4('');
    setCandidatePlayerId('');
    setPhoneDigitsInput('');
    setIsAutoRecognized(false);
    setFeedback(null);
    setAuthError(null);
  }

  async function handleConfirm() {
    if (!recognizedPlayer || !session) return;
    setFeedback(null);
    setSubmitting(true);

    const { data, error } = await supabase.rpc('confirm_attendance_via_magic_link', {
      p_magic_token: params.token,
      p_player_id: recognizedPlayer.id,
      p_going_to_game: goingGame,
      p_going_to_bbq: goingBbq,
      p_phone_last4: verifiedLast4 || getLast4(recognizedPlayer.phone),
    });

    setSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    setFeedback(
      `Presença registrada como ${data.player_type} • Status: ${data.assigned_status}`
    );

    const { data: updatedAtt } = await supabase
      .from('session_attendances')
      .select('*, player:players(*)')
      .eq('session_id', session.id);
    setAttendances(updatedAtt || []);
  }

  const currentPlayerAttendance = useMemo(() => {
    if (!recognizedPlayer) return null;
    return attendances.find((a) => a.player_id === recognizedPlayer.id) || null;
  }, [attendances, recognizedPlayer]);

  const confirmedCount = useMemo(
    () =>
      attendances.filter(
        (a) => a.status === 'CONFIRMADO' && a.player?.position !== 'GOLEIRO'
      ).length,
    [attendances]
  );

  const waitingCount = useMemo(
    () => attendances.filter((a) => a.status === 'LISTA_ESPERA').length,
    [attendances]
  );

  const bbqCount = useMemo(
    () => attendances.filter((a) => a.bbq_attendance === 'VAI').length,
    [attendances]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F0E8] text-[#142F47] flex items-center justify-center text-sm font-medium">
        Carregando lista oficial da Resenha...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F4F0E8] text-[#142F47] flex items-center justify-center p-6 text-center text-sm">
        Link de presença inválido ou encerrado pelo administrador.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#142F47] p-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white border border-[#DDD5C7] rounded-2xl overflow-hidden shadow-lg">
        {/* Cabeçalho Institucional com Escudo Oficial */}
        <div className="bg-[#142F47] text-[#F4F0E8] p-5 border-b border-[#0E2234]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3.5">
              <img
                src="/logo-resenha.jpg"
                alt="Resenha - SESI, SENAI e Amigos"
                className="w-14 h-14 rounded-full object-cover border-2 border-[#F4F0E8]/80 shadow-sm shrink-0"
              />
              <div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CC2DC] block">
                  Resenha • SESI, SENAI e Amigos
                </span>
                <h1 className="text-lg font-bold text-white leading-tight mt-0.5">
                  {session.location}
                </h1>
                <p className="text-xs text-[#D3DFEA] flex items-center gap-1.5 mt-1">
                  <Calendar className="w-3.5 h-3.5 text-[#9CC2DC]" />
                  <span>
                    {session.session_date} às {session.start_time}
                  </span>
                </p>
              </div>
            </div>

            {session.is_bbq_day && (
              <span className="bg-[#F4F0E8]/15 border border-[#F4F0E8]/30 text-[#F4F0E8] text-[11px] font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1 shrink-0">
                <Flame className="w-3.5 h-3.5 text-[#E5B869]" /> Churrasco
              </span>
            )}
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* PASSO 1: SE O NAVEGADOR AINDA NÃO RECONHECEU O ATLETA */}
          {!recognizedPlayer ? (
            <form onSubmit={handleUnlockDevice} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-[#EBF2F7] border border-[#C6D9E8] text-xs text-[#142F47] space-y-1">
                <p className="font-bold flex items-center gap-1.5 text-[#142F47]">
                  <Smartphone className="w-4 h-4 text-[#31688E]" />
                  Identificação do Atleta (Celular ou WhatsApp Web)
                </p>
                <p className="text-[#3A5268] leading-relaxed">
                  Informe os <strong>4 últimos dígitos do seu WhatsApp</strong>. Seu navegador ficará vinculado ao seu nome para as próximas semanas.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A6075]">
                  1. Seu Nome na Lista (Opcional se digitar o nº completo)
                </label>
                <select
                  value={candidatePlayerId}
                  onChange={(e) => setCandidatePlayerId(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2.5 text-sm text-[#142F47] focus:outline-none focus:border-[#31688E]"
                >
                  <option value="">-- Selecione seu nome --</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.position})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A6075] flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-[#31688E]" />
                  2. Últimos 4 dígitos do WhatsApp
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  required
                  placeholder="Ex: 0007"
                  value={phoneDigitsInput}
                  onChange={(e) => setPhoneDigitsInput(e.target.value)}
                  className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3.5 py-2.5 text-sm font-bold tracking-widest text-[#142F47] placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:border-[#31688E]"
                />
              </div>

              {authError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white font-semibold text-sm flex items-center justify-center gap-2 transition shadow-sm"
              >
                <Lock className="w-4 h-4" />
                Identificar Meu Perfil
              </button>
            </form>
          ) : (
            /* PASSO 2: JOGADOR RECONHECIDO AUTOMATICAMENTE */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] text-[#31688E] font-semibold flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" />
                      {isAutoRecognized
                        ? 'Atleta reconhecido neste navegador'
                        : 'Atleta identificado'}
                    </span>
                    <h2 className="text-lg font-bold text-[#142F47] mt-0.5">
                      {recognizedPlayer.name}
                    </h2>
                    <p className="text-xs text-[#5A6E82]">
                      Posição: {recognizedPlayer.position} • Final WhatsApp: ••••
                      {getLast4(recognizedPlayer.phone)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSwitchPlayer}
                    className="text-[11px] text-[#5A6E82] hover:text-red-700 flex items-center gap-1 bg-white px-2.5 py-1.5 rounded-lg border border-[#DDD5C7]"
                    title="Sair ou trocar jogador neste aparelho"
                  >
                    <LogOut className="w-3 h-3" />
                    Trocar
                  </button>
                </div>

                <div className="flex items-center justify-between pt-2.5 border-t border-[#E6DFD3]">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${
                      recognizedPlayer.type === 'MENSALISTA'
                        ? 'bg-[#EBF2F7] text-[#142F47] border-[#C4D7E6]'
                        : 'bg-[#F9F3EB] text-[#7A5220] border-[#E6D4B8]'
                    }`}
                  >
                    {recognizedPlayer.type === 'MENSALISTA'
                      ? 'MENSALISTA • Vaga Direta'
                      : `DIARISTA • Fila de Espera (R$ ${session.daily_fee})`}
                  </span>

                  {currentPlayerAttendance && (
                    <span className="text-xs font-medium text-[#4A6075]">
                      Situação:{' '}
                      <strong className="text-[#142F47]">{currentPlayerAttendance.status}</strong>
                    </span>
                  )}
                </div>
              </div>

              {/* Presença no Jogo */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#4A6075]">
                  1. Presença na Pelada
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setGoingGame(true)}
                    className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition ${
                      goingGame
                        ? 'bg-[#142F47] border-[#142F47] text-white shadow-sm'
                        : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#5A6E82] hover:text-[#142F47]'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Vou Jogar
                  </button>
                  <button
                    type="button"
                    onClick={() => setGoingGame(false)}
                    className={`py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 border transition ${
                      !goingGame
                        ? 'bg-[#8B2626] border-[#8B2626] text-white shadow-sm'
                        : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#5A6E82] hover:text-[#142F47]'
                    }`}
                  >
                    <XCircle className="w-4 h-4" /> Tô Fora
                  </button>
                </div>
              </div>

              {/* Presença no Churrasco */}
              {session.is_bbq_day && (
                <div className="space-y-2 pt-3 border-t border-[#EAE3D5]">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[#7A5220] flex items-center gap-1.5">
                    <Flame className="w-4 h-4" /> 2. Churrasco da Resenha (+ R$ {session.bbq_fee})
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setGoingBbq(true)}
                      className={`py-2.5 rounded-xl font-semibold text-xs border transition ${
                        goingBbq
                          ? 'bg-[#8C5E2A] text-white border-[#8C5E2A]'
                          : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#5A6E82]'
                      }`}
                    >
                      Vou participar 🥩
                    </button>
                    <button
                      type="button"
                      onClick={() => setGoingBbq(false)}
                      className={`py-2.5 rounded-xl font-semibold text-xs border transition ${
                        !goingBbq
                          ? 'bg-[#31688E] text-white border-[#31688E]'
                          : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#5A6E82]'
                      }`}
                    >
                      Não vou no churrasco
                    </button>
                  </div>
                </div>
              )}

              <button
                onClick={handleConfirm}
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-[#31688E] hover:bg-[#275676] disabled:opacity-50 text-white font-bold text-sm transition shadow-sm"
              >
                {submitting ? 'Salvando...' : 'Confirmar Minha Resposta'}
              </button>

              {feedback && (
                <div className="p-3 rounded-xl bg-[#EBF2F7] border border-[#C4D7E6] text-[#142F47] text-xs font-medium text-center">
                  {feedback}
                </div>
              )}
            </div>
          )}

          {/* Resumo Sincronizado em Tempo Real */}
          <div className="pt-4 border-t border-[#EAE3D5] flex items-center justify-between text-xs text-[#5A6E82]">
            <span>
              Linha: <strong className="text-[#142F47]">{confirmedCount}/{session.max_line_players}</strong>
            </span>
            <span>
              Espera: <strong className="text-[#142F47]">{waitingCount}</strong>
            </span>
            {session.is_bbq_day && (
              <span className="text-[#7A5220] font-medium">
                Churrasco: <strong>{bbqCount}</strong>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
