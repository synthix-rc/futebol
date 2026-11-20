// @ts-nocheck
'use client';

import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import {
  generateInitialQuadros,
  rotateQuadrosAfterMatch,
  replaceSinglePlayerInQuadro,
  setPlayerAvailabilityInPool,
  normalizeLateArrivalPlayer,
  DayAvailability,
  MatchOutcome,
  LivePlayerState
} from '@/lib/rotation-engine';

export const POSITION_LABELS = {
  GOLEIRO: { label: 'Goleiro', short: 'GOL', color: 'bg-[#F9F3EB] text-[#7A5220] border-[#E3D1B4]' },
  ZAGUEIRO: { label: 'Zagueiro', short: 'ZAG', color: 'bg-[#EBF2F7] text-[#142F47] border-[#C5D7E5]' },
  LATERAL: { label: 'Lateral/Ala', short: 'LAT', color: 'bg-[#EEF4F8] text-[#31688E] border-[#C9DCEB]' },
  MEIO_CAMPO: { label: 'Meio-Campo', short: 'MEI', color: 'bg-[#F2EFE9] text-[#2C4559] border-[#D8D0C1]' },
  ATACANTE: { label: 'Atacante', short: 'ATA', color: 'bg-[#F7EFEF] text-[#7A2E2E] border-[#E3CACA]' },
};

export const AVAILABILITY_LABELS: Record<DayAvailability, { label: string; badge: string }> = {
  ATIVO: { label: 'Ativo', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  PULANDO_PROXIMA: { label: 'Pular 1 Jogo', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  PAUSADO: { label: 'Machucado/Pausa', badge: 'bg-orange-50 text-orange-800 border-orange-200' },
  FOI_EMBORA: { label: 'Foi Embora', badge: 'bg-red-50 text-red-800 border-red-200' },
};

export const calcWeightedScore = (player) => {
  return Number(((player.overall * 0.5) + (player.stamina * 0.3) + (player.speed * 0.2)).toFixed(2));
};

const INITIAL_PLAYERS = [
  { id: '1', name: 'Marcão Paredão', phone: '21999990001', birthDate: '1988-11-08', type: 'MENSALISTA', position: 'GOLEIRO', overall: 4.5, stamina: 3.5, speed: 3.0, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 1, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 18, goals: 0, assists: 2, wins: 12 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:01' },
  { id: '2', name: 'Julio Cesar', phone: '21999990002', birthDate: '1990-03-14', type: 'MENSALISTA', position: 'GOLEIRO', overall: 4.0, stamina: 3.0, speed: 3.5, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 2, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 16, goals: 0, assists: 1, wins: 9 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:05' },
  { id: '3', name: 'Dida Avulso', phone: '21999990003', birthDate: '1992-07-22', type: 'DIARISTA', position: 'GOLEIRO', overall: 4.2, stamina: 4.0, speed: 3.8, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 19, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 8, goals: 0, assists: 0, wins: 5 }, attendance: 'ESPERA', checkedIn: false, confirmedAt: '10:15' },
  { id: '4', name: 'Thiago Silva', phone: '21999990004', birthDate: '1987-09-22', type: 'MENSALISTA', position: 'ZAGUEIRO', overall: 4.6, stamina: 4.0, speed: 3.8, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 3, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 19, goals: 4, assists: 3, wins: 13 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:02' },
  { id: '5', name: 'Dedé Mito', phone: '21999990005', birthDate: '1989-11-18', type: 'MENSALISTA', position: 'ZAGUEIRO', overall: 4.0, stamina: 3.5, speed: 3.2, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 9, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 17, goals: 2, assists: 1, wins: 10 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:10' },
  { id: '6', name: 'Fábio Xerife', phone: '21999990006', birthDate: '1991-05-03', type: 'MENSALISTA', position: 'ZAGUEIRO', overall: 3.8, stamina: 3.2, speed: 3.0, financialStatus: 'PENDENTE', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 10, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 15, goals: 1, assists: 2, wins: 7 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:12' },
  { id: '7', name: 'José Ala (Motor)', phone: '21999990007', birthDate: '1993-11-24', type: 'MENSALISTA', position: 'LATERAL', overall: 4.3, stamina: 4.9, speed: 4.7, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 4, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 19, goals: 9, assists: 11, wins: 12 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:03' },
  { id: '8', name: 'Léo Moura', phone: '21999990008', birthDate: '1986-10-23', type: 'MENSALISTA', position: 'LATERAL', overall: 4.1, stamina: 3.6, speed: 3.5, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 11, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 18, goals: 6, assists: 14, wins: 11 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:14' },
  { id: '9', name: 'Carlinhos Bala', phone: '21999990009', birthDate: '1994-04-11', type: 'DIARISTA', position: 'LATERAL', overall: 3.9, stamina: 4.5, speed: 4.8, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 15, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 10, goals: 5, assists: 6, wins: 6 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '11:20' },
  { id: '10', name: 'Rodrigo (Camisa 10)', phone: '21999990010', birthDate: '1988-11-28', type: 'MENSALISTA', position: 'MEIO_CAMPO', overall: 4.8, stamina: 4.7, speed: 4.2, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 5, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 20, goals: 18, assists: 22, wins: 15 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:00' },
  { id: '11', name: 'Jamel Maestro', phone: '21999990011', birthDate: '1990-08-19', type: 'MENSALISTA', position: 'MEIO_CAMPO', overall: 4.5, stamina: 4.0, speed: 3.8, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 6, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 18, goals: 12, assists: 16, wins: 12 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:04' },
  { id: '12', name: 'Carlos Box-to-Box', phone: '21999990012', birthDate: '1992-01-15', type: 'MENSALISTA', position: 'MEIO_CAMPO', overall: 4.3, stamina: 4.8, speed: 4.1, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 7, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 17, goals: 10, assists: 11, wins: 11 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:06' },
  { id: '13', name: 'Gerson Coringa', phone: '21999990013', birthDate: '1995-05-20', type: 'MENSALISTA', position: 'MEIO_CAMPO', overall: 4.4, stamina: 4.3, speed: 4.0, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 13, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 16, goals: 8, assists: 9, wins: 10 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:18' },
  { id: '14', name: 'Renato Augusto', phone: '21999990014', birthDate: '1988-02-08', type: 'MENSALISTA', position: 'MEIO_CAMPO', overall: 4.6, stamina: 2.8, speed: 3.0, financialStatus: 'PENDENTE', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 14, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 12, goals: 7, assists: 13, wins: 8 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:25' },
  { id: '15', name: 'Juninho Pernambucano', phone: '21999990015', birthDate: '1985-01-30', type: 'DIARISTA', position: 'MEIO_CAMPO', overall: 4.1, stamina: 3.8, speed: 3.6, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 16, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 9, goals: 6, assists: 7, wins: 5 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '11:45' },
  { id: '16', name: 'Pedro Queixada', phone: '21999990016', birthDate: '1996-06-20', type: 'MENSALISTA', position: 'ATACANTE', overall: 4.7, stamina: 3.8, speed: 4.1, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 8, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 19, goals: 26, assists: 8, wins: 13 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:07' },
  { id: '17', name: 'Bruno Henrique', phone: '21999990017', birthDate: '1990-12-30', type: 'MENSALISTA', position: 'ATACANTE', overall: 4.5, stamina: 4.6, speed: 4.9, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 12, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 18, goals: 21, assists: 12, wins: 12 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:08' },
  { id: '18', name: 'Cano Matador', phone: '21999990018', birthDate: '1989-11-12', type: 'MENSALISTA', position: 'ATACANTE', overall: 4.4, stamina: 3.9, speed: 3.8, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 17, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 17, goals: 23, assists: 4, wins: 10 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:15' },
  { id: '19', name: 'Hulk Forte', phone: '21999990019', birthDate: '1987-07-25', type: 'MENSALISTA', position: 'ATACANTE', overall: 4.6, stamina: 4.2, speed: 4.3, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 18, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 16, goals: 19, assists: 9, wins: 11 }, attendance: 'CONFIRMADO', checkedIn: false, confirmedAt: '09:20' },
  { id: '20', name: 'Romário Baixinho', phone: '21999990020', birthDate: '1984-01-29', type: 'MENSALISTA', position: 'ATACANTE', overall: 4.5, stamina: 2.5, speed: 3.4, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 20, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 15, goals: 20, assists: 3, wins: 9 }, attendance: 'CONFIRMADO', checkedIn: false, confirmedAt: '09:30' },
  { id: '21', name: 'Tiquinho Soares', phone: '21999990021', birthDate: '1991-01-17', type: 'DIARISTA', position: 'ATACANTE', overall: 4.0, stamina: 3.7, speed: 3.8, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 21, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 11, goals: 11, assists: 5, wins: 6 }, attendance: 'ESPERA', checkedIn: false, confirmedAt: '12:10' },
  { id: '22', name: 'Lucas Paquetá', phone: '21999990022', birthDate: '1997-08-27', type: 'DIARISTA', position: 'MEIO_CAMPO', overall: 4.2, stamina: 4.4, speed: 4.1, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 22, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 7, goals: 5, assists: 6, wins: 4 }, attendance: 'ESPERA', checkedIn: false, confirmedAt: '14:05' },
  { id: '23', name: 'Vini Malvadeza', phone: '21999990023', birthDate: '2000-07-12', type: 'DIARISTA', position: 'ATACANTE', overall: 4.6, stamina: 4.8, speed: 5.0, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 23, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 6, goals: 9, assists: 7, wins: 5 }, attendance: 'FORA', checkedIn: false, confirmedAt: '-' },
  { id: '24', name: 'André Trindade', phone: '21999990024', birthDate: '2001-07-16', type: 'MENSALISTA', position: 'ZAGUEIRO', overall: 4.1, stamina: 4.5, speed: 4.0, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 24, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 14, goals: 2, assists: 4, wins: 8 }, attendance: 'FORA', checkedIn: false, confirmedAt: '-' }
];

const INITIAL_TRANSACTIONS = [
  { id: 't1', description: 'Aluguel Quadra Society (Mês)', amount: 1800, type: 'DESPESA', category: 'CAMPO', date: '05/11/2026' },
  { id: 't2', description: '2 Bolas Penalty Society Pro', amount: 340, type: 'DESPESA', category: 'MATERIAL', date: '10/11/2026' },
  { id: 't3', description: 'Carnes + Carvão + Gelo (Churrasco Fim de Mês)', amount: 480, type: 'DESPESA', category: 'CHURRASCO', date: '15/11/2026' },
  { id: 't4', description: 'Diárias Avulsas (Semana Passada)', amount: 210, type: 'RECEITA', category: 'DIARIA', date: '11/11/2026' },
];

const toLivePlayerState = (p): LivePlayerState => ({
  id: `att-${p.id}`,
  session_id: 'session-1',
  player_id: p.id,
  status: p.attendance === 'CONFIRMADO' ? 'CONFIRMADO' : p.attendance === 'ESPERA' ? 'LISTA_ESPERA' : 'AUSENTE',
  bbq_attendance: p.bbqConfirmed ? 'VAI' : 'NAO_VAI',
  checked_in: p.checkedIn,
  matches_played_today: p.matchesPlayedToday,
  availability: p.availability || 'ATIVO',
  consecutive_games: p.consecutiveGames || 0,
  arrival_order: p.arrivalOrder || 99,
  was_drawn_to_complete: Boolean(p.wasDrawnToComplete),
  current_slot: 'FILA_PROXIMOS',
  confirmed_at: p.confirmedAt,
  player: {
    id: p.id,
    name: p.name,
    phone: p.phone,
    type: p.type,
    position: p.position,
    overall_rating: p.overall,
    stamina: p.stamina,
    speed: p.speed,
    skill_score: calcWeightedScore(p),
    is_active: true,
  },
});

const PeladaContext = createContext(null);

export function PeladaProvider({ children }: { children: React.ReactNode }) {
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);

  const [matchConfig, setMatchConfig] = useState({
    slug: 'resenha.app/convite/semana-47',
    date: 'Sábado, 28 Nov • 09:30',
    location: 'SESI / SENAI Society',
    playersPerTeam: 6,
    maxOutfield: 18,
    maxGoalkeepers: 2,
    monthlyFee: 150,
    dailyFee: 35,
    isBbqDay: true,
    bbqFee: 45,
    windowMode: 'MENSALISTAS',
  });

  const [matchNumber, setMatchNumber] = useState(1);
  const [quadro1, setQuadro1] = useState([]);
  const [quadro2, setQuadro2] = useState([]);
  const [benchQueue, setBenchQueue] = useState([]);
  const [rotationExplanation, setRotationExplanation] = useState(null);
  const [selectedSwap, setSelectedSwap] = useState(null);

  const [liveScore, setLiveScore] = useState({
    score1: 0,
    score2: 0,
    events: [],
    history: []
  });

  const [whatsappModal, setWhatsappModal] = useState({ open: false, title: '', text: '' });
  const [toast, setToast] = useState(null);

  const showToast = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  };

  const confirmedGoalkeepers = useMemo(
    () => players.filter((p) => p.attendance === 'CONFIRMADO' && p.position === 'GOLEIRO'),
    [players]
  );
  const confirmedOutfield = useMemo(
    () => players.filter((p) => p.attendance === 'CONFIRMADO' && p.position !== 'GOLEIRO'),
    [players]
  );
  const waitingList = useMemo(
    () => players.filter((p) => p.attendance === 'ESPERA'),
    [players]
  );
  const absentList = useMemo(
    () => players.filter((p) => p.attendance === 'FORA'),
    [players]
  );
  const bbqConfirmedList = useMemo(
    () => players.filter((p) => p.bbqConfirmed),
    [players]
  );

  const { currentMonthName, monthlyBirthdays } = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    const monthNames = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const list = players
      .filter((p) => {
        if (!p.birthDate) return false;
        const parts = p.birthDate.split('-');
        return parts.length >= 2 && Number(parts[1]) === currentMonth;
      })
      .map((p) => {
        const [, m, d] = p.birthDate.split('-').map(Number);
        return {
          ...p,
          birthDay: d,
          birthMonth: m,
          isToday: d === currentDay,
          isUpcoming: d > currentDay,
          formattedDate: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`
        };
      })
      .sort((a, b) => a.birthDay - b.birthDay);

    return {
      currentMonthName: monthNames[currentMonth - 1],
      monthlyBirthdays: list
    };
  }, [players]);

  const topScorers = useMemo(
    () => [...players].sort((a, b) => b.stats.goals - a.stats.goals).slice(0, 3),
    [players]
  );

  const financialSummary = useMemo(() => {
    const paidMensalistas = players.filter((p) => p.type === 'MENSALISTA' && p.financialStatus === 'EM_DIA').length;
    const pendingMensalistas = players.filter((p) => p.type === 'MENSALISTA' && p.financialStatus === 'PENDENTE').length;
    const activeDiaristasPaid = players.filter((p) => p.type === 'DIARISTA' && p.attendance === 'CONFIRMADO' && p.financialStatus === 'EM_DIA').length;

    const monthlyIncome = paidMensalistas * matchConfig.monthlyFee;
    const dailyIncome = activeDiaristasPaid * matchConfig.dailyFee;
    const extraPeladaIncome = transactions
      .filter((t) => t.type === 'RECEITA' && t.category !== 'CHURRASCO')
      .reduce((acc, t) => acc + t.amount, 0);
    const peladaExpenses = transactions
      .filter((t) => t.type === 'DESPESA' && t.category !== 'CHURRASCO')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalPeladaIncome = monthlyIncome + dailyIncome + extraPeladaIncome;
    const peladaBalance = totalPeladaIncome - peladaExpenses;

    const bbqConfirmedCount = players.filter((p) => p.bbqConfirmed).length;
    const bbqPaidCount = players.filter((p) => p.bbqConfirmed && p.bbqPaid).length;
    const bbqPendingCount = bbqConfirmedCount - bbqPaidCount;

    const bbqQuotasIncome = bbqPaidCount * matchConfig.bbqFee;
    const extraBbqIncome = transactions
      .filter((t) => t.type === 'RECEITA' && t.category === 'CHURRASCO')
      .reduce((acc, t) => acc + t.amount, 0);
    const bbqExpenses = transactions
      .filter((t) => t.type === 'DESPESA' && t.category === 'CHURRASCO')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalBbqIncome = bbqQuotasIncome + extraBbqIncome;
    const bbqBalance = totalBbqIncome - bbqExpenses;

    return {
      paidMensalistas,
      pendingMensalistas,
      totalPeladaIncome,
      peladaExpenses,
      peladaBalance,
      pendingMonthlyAmount: pendingMensalistas * matchConfig.monthlyFee,
      bbqConfirmedCount,
      bbqPaidCount,
      bbqPendingCount,
      totalBbqIncome,
      bbqExpenses,
      bbqBalance,
      bbqPendingAmount: bbqPendingCount * matchConfig.bbqFee
    };
  }, [players, transactions, matchConfig]);

  const syncLiveStatesToPlayers = (
    q1States: LivePlayerState[],
    q2States: LivePlayerState[],
    poolStates: LivePlayerState[],
    extraWinIds: Set<string> = new Set()
  ) => {
    const stateMap = new Map<string, LivePlayerState>();
    [...q1States, ...q2States, ...poolStates].forEach((st) => {
      stateMap.set(st.player_id, st);
    });

    setPlayers((prev) =>
      prev.map((p) => {
        const st = stateMap.get(p.id);
        if (!st) return p;
        return {
          ...p,
          matchesPlayedToday: st.matches_played_today,
          consecutiveGames: st.consecutive_games,
          availability: st.availability,
          arrivalOrder: st.arrival_order,
          wasDrawnToComplete: Boolean(st.was_drawn_to_complete),
          stats: {
            ...p.stats,
            wins: extraWinIds.has(p.id) ? p.stats.wins + 1 : p.stats.wins
          }
        };
      })
    );

    setQuadro1(q1States.map((s) => s.player_id));
    setQuadro2(q2States.map((s) => s.player_id));
    setBenchQueue(poolStates.map((s) => s.player_id));
  };

  const drawInitialMatchOfTheDay = (resetCounters = false) => {
    const basePlayers = players.map((p) =>
      resetCounters
        ? {
            ...p,
            matchesPlayedToday: 0,
            consecutiveGames: 0,
            availability: p.availability === 'FOI_EMBORA' ? 'ATIVO' : p.availability,
            wasDrawnToComplete: false
          }
        : p
    );

    const presentOutfield = basePlayers
      .filter((p) => p.attendance === 'CONFIRMADO' && p.checkedIn && p.position !== 'GOLEIRO')
      .map(toLivePlayerState);

    const result = generateInitialQuadros(presentOutfield, matchConfig.playersPerTeam);

    syncLiveStatesToPlayers(result.quadro1, result.quadro2, result.waitingPool);
    setMatchNumber(1);
    setLiveScore((prev) => ({ ...prev, score1: 0, score2: 0, events: [] }));
    setRotationExplanation({
      type: 'INITIAL',
      title: 'Partida #1 Escalada',
      details: `${result.quadro1.length + result.quadro2.length} atletas nos Quadros 1 e 2 por ordem de chegada. ${result.waitingPool.length} aguardam na Fila de Próximos.`,
      completedIds: []
    });
  };

  useEffect(() => {
    if (quadro1.length === 0 && quadro2.length === 0) {
      drawInitialMatchOfTheDay(true);
    }
  }, []);

  const handleRotateAfterMatch = (outcome: MatchOutcome) => {
    const q1Live = quadro1.map((id) => players.find((p) => p.id === id)).filter(Boolean).map(toLivePlayerState);
    const q2Live = quadro2.map((id) => players.find((p) => p.id === id)).filter(Boolean).map(toLivePlayerState);
    const poolLive = benchQueue.map((id) => players.find((p) => p.id === id)).filter(Boolean).map(toLivePlayerState);

    const result = rotateQuadrosAfterMatch({
      quadro1: q1Live,
      quadro2: q2Live,
      waitingPool: poolLive,
      outcome,
      playersPerTeam: matchConfig.playersPerTeam
    });

    const winnerIds = new Set<string>();
    if (outcome === 'QUADRO_1_WINS') {
      quadro1.forEach((id) => winnerIds.add(id));
    } else if (outcome === 'QUADRO_2_WINS') {
      quadro2.forEach((id) => winnerIds.add(id));
    }

    syncLiveStatesToPlayers(result.newQuadro1, result.newQuadro2, result.newWaitingPool, winnerIds);

    const drawnNames = result.drawnPlayerIds
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean)
      .map((p) => p.name)
      .join(', ');

    const outcomeLabel =
      outcome === 'QUADRO_1_WINS'
        ? 'Quadro 1 ficou em campo'
        : outcome === 'QUADRO_2_WINS'
        ? 'Quadro 2 ficou em campo'
        : outcome === 'DRAW_OLDEST_LEAVES'
        ? 'Empate (saiu o mais antigo)'
        : 'Empate (saíram os dois)';

    setMatchNumber((prev) => prev + 1);
    setLiveScore((prev) => ({
      score1: 0,
      score2: 0,
      events: [],
      history: [
        {
          number: matchNumber,
          score1: prev.score1,
          score2: prev.score2,
          winner: outcomeLabel,
          completedNames: result.drawnPlayerIds
        },
        ...prev.history
      ]
    }));

    setRotationExplanation({
      type: 'ROTATION',
      title: `Partida #${matchNumber + 1} Pronta • ${outcomeLabel}`,
      details:
        result.drawnPlayerIds.length > 0
          ? `Subiram os próximos da fila. Sorteados para completar: ${drawnNames}.`
          : `Entraram 6 atletas descansados da fila.`,
      completedIds: result.drawnPlayerIds
    });

    showToast(`Partida #${matchNumber} encerrada!`);
  };

  const replacePlayerInQuadro = (params: {
    group: 'Q1' | 'Q2';
    playerLeavingId: string;
    reason: 'PULANDO_PROXIMA' | 'PAUSADO' | 'FOI_EMBORA';
    countMatchForLeavingPlayer: boolean;
    manualSubstituteId?: string;
  }) => {
    const isQ1 = params.group === 'Q1';
    const targetIds = isQ1 ? quadro1 : quadro2;
    const opponentIds = isQ1 ? quadro2 : quadro1;

    const targetLive = targetIds.map((id) => players.find((p) => p.id === id)).filter(Boolean).map((p) => ({
      ...toLivePlayerState(p),
      current_slot: isQ1 ? ('QUADRO_1' as const) : ('QUADRO_2' as const)
    }));
    const opponentLive = opponentIds.map((id) => players.find((p) => p.id === id)).filter(Boolean).map((p) => ({
      ...toLivePlayerState(p),
      current_slot: isQ1 ? ('QUADRO_2' as const) : ('QUADRO_1' as const)
    }));
    const poolLive = benchQueue.map((id) => players.find((p) => p.id === id)).filter(Boolean).map(toLivePlayerState);

    const result = replaceSinglePlayerInQuadro({
      playerLeavingId: params.playerLeavingId,
      reason: params.reason,
      countMatchForLeavingPlayer: params.countMatchForLeavingPlayer,
      targetQuadro: targetLive,
      opponentQuadro: opponentLive,
      waitingPool: poolLive,
      manualSubstituteId: params.manualSubstituteId || undefined
    });

    if (isQ1) {
      syncLiveStatesToPlayers(result.updatedQuadro, opponentLive, result.updatedPool);
    } else {
      syncLiveStatesToPlayers(opponentLive, result.updatedQuadro, result.updatedPool);
    }

    const leavingPlayer = players.find((p) => p.id === params.playerLeavingId);
    const subName = result.substituteChosen?.player?.name || 'Nenhum substituto disponível';

    setRotationExplanation({
      type: 'REPLACE',
      title: `Substituição no ${isQ1 ? 'Quadro 1' : 'Quadro 2'}`,
      details: `Saiu ${leavingPlayer?.name}. Entrou ${subName}.`,
      completedIds: result.substituteChosen ? [result.substituteChosen.player_id] : []
    });

    showToast(`Entrou ${subName}.`);
  };

  const handlePoolAvailabilityChange = (playerId: string, newAvail: DayAvailability) => {
    const poolLive = benchQueue.map((id) => players.find((p) => p.id === id)).filter(Boolean).map(toLivePlayerState);
    const updatedPool = setPlayerAvailabilityInPool(poolLive, playerId, newAvail);

    const q1Live = quadro1.map((id) => players.find((p) => p.id === id)).filter(Boolean).map(toLivePlayerState);
    const q2Live = quadro2.map((id) => players.find((p) => p.id === id)).filter(Boolean).map(toLivePlayerState);

    syncLiveStatesToPlayers(q1Live, q2Live, updatedPool);
    const target = players.find((p) => p.id === playerId);
    showToast(`${target?.name}: ${AVAILABILITY_LABELS[newAvail].label}.`);
  };

  const handleManualSwap = (group, playerId) => {
    if (!selectedSwap) {
      setSelectedSwap({ group, playerId });
      return;
    }
    if (selectedSwap.playerId === playerId) {
      setSelectedSwap(null);
      return;
    }

    const getList = (g) => (g === 'Q1' ? [...quadro1] : g === 'Q2' ? [...quadro2] : [...benchQueue]);
    const setList = (g, list) => {
      if (g === 'Q1') setQuadro1(list);
      else if (g === 'Q2') setQuadro2(list);
      else setBenchQueue(list);
    };

    if (selectedSwap.group === group) {
      setSelectedSwap(null);
      return;
    }

    const listA = getList(selectedSwap.group);
    const listB = getList(group);
    const idxA = listA.indexOf(selectedSwap.playerId);
    const idxB = listB.indexOf(playerId);

    if (idxA > -1 && idxB > -1) {
      listA[idxA] = playerId;
      listB[idxB] = selectedSwap.playerId;
      setList(selectedSwap.group, listA);
      setList(group, listB);

      const pA = players.find((p) => p.id === selectedSwap.playerId);
      const pB = players.find((p) => p.id === playerId);
      showToast(`Troca: ${pA?.name} ↔ ${pB?.name}`);
    }

    setSelectedSwap(null);
  };

  const handleAttendanceAction = (playerId, action) => {
    setPlayers((prevPlayers) => {
      const target = prevPlayers.find((p) => p.id === playerId);
      if (!target) return prevPlayers;

      let updated = [...prevPlayers];
      const nowTime = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      if (action === 'DESISTIR') {
        const wasConfirmedOutfield = target.attendance === 'CONFIRMADO' && target.position !== 'GOLEIRO';
        const wasConfirmedGK = target.attendance === 'CONFIRMADO' && target.position === 'GOLEIRO';

        updated = updated.map((p) =>
          p.id === playerId ? { ...p, attendance: 'FORA', checkedIn: false, confirmedAt: '-' } : p
        );

        if (wasConfirmedOutfield) {
          const nextInLine = updated.find((p) => p.attendance === 'ESPERA' && p.position !== 'GOLEIRO');
          if (nextInLine) {
            updated = updated.map((p) =>
              p.id === nextInLine.id ? { ...p, attendance: 'CONFIRMADO', checkedIn: true } : p
            );
            showToast(`${target.name} saiu. ${nextInLine.name} subiu da espera.`);
          } else {
            showToast(`${target.name} marcou ausência.`);
          }
        } else if (wasConfirmedGK) {
          const nextGK = updated.find((p) => p.attendance === 'ESPERA' && p.position === 'GOLEIRO');
          if (nextGK) {
            updated = updated.map((p) =>
              p.id === nextGK.id ? { ...p, attendance: 'CONFIRMADO', checkedIn: true } : p
            );
            showToast(`Goleiro ${nextGK.name} subiu da espera.`);
          }
        }
      } else if (action === 'CONFIRMAR') {
        const isGK = target.position === 'GOLEIRO';
        const currentGKCount = updated.filter((p) => p.attendance === 'CONFIRMADO' && p.position === 'GOLEIRO').length;
        const currentOutfieldCount = updated.filter((p) => p.attendance === 'CONFIRMADO' && p.position !== 'GOLEIRO').length;

        const blockedByWindow = matchConfig.windowMode === 'MENSALISTAS' && target.type === 'DIARISTA';
        const isFull = isGK ? currentGKCount >= matchConfig.maxGoalkeepers : currentOutfieldCount >= matchConfig.maxOutfield;

        if (blockedByWindow || isFull) {
          updated = updated.map((p) =>
            p.id === playerId ? { ...p, attendance: 'ESPERA', checkedIn: false, confirmedAt: nowTime } : p
          );
          showToast(`${target.name} entrou na Fila de Espera.`);
        } else {
          updated = updated.map((p) =>
            p.id === playerId ? { ...p, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: nowTime } : p
          );
          showToast(`${target.name} confirmado na lista!`);
        }
      } else if (action === 'TOGGLE_CHECKIN') {
        const willBeCheckedIn = !target.checkedIn;

        if (willBeCheckedIn && target.position !== 'GOLEIRO') {
          const activeInSession = updated
            .filter((p) => p.checkedIn && p.position !== 'GOLEIRO' && p.id !== playerId)
            .map(toLivePlayerState);

          const normalized = normalizeLateArrivalPlayer(toLivePlayerState(target), activeInSession);

          updated = updated.map((p) =>
            p.id === playerId
              ? {
                  ...p,
                  checkedIn: true,
                  availability: normalized.availability,
                  matchesPlayedToday: normalized.matches_played_today,
                  consecutiveGames: normalized.consecutive_games,
                  arrivalOrder: normalized.arrival_order
                }
              : p
          );

          if (!quadro1.includes(playerId) && !quadro2.includes(playerId) && !benchQueue.includes(playerId)) {
            setBenchQueue((prev) => [...prev, playerId]);
          }
          showToast(`Check-in: ${target.name} (#${normalized.arrival_order}).`);
        } else {
          updated = updated.map((p) =>
            p.id === playerId ? { ...p, checkedIn: false } : p
          );
          setBenchQueue((prev) => prev.filter((id) => id !== playerId));
        }
      } else if (action === 'TOGGLE_BBQ') {
        updated = updated.map((p) =>
          p.id === playerId ? { ...p, bbqConfirmed: !p.bbqConfirmed } : p
        );
        showToast(`Churrasco atualizado para ${target.name}.`);
      }

      return updated;
    });
  };

  const handleReleaseWaitingList = () => {
    setMatchConfig((prev) => ({ ...prev, windowMode: 'LIBERADO' }));
    setPlayers((prevPlayers) => {
      let updated = [...prevPlayers];
      let outfieldSpots = matchConfig.maxOutfield - updated.filter((p) => p.attendance === 'CONFIRMADO' && p.position !== 'GOLEIRO').length;
      let gkSpots = matchConfig.maxGoalkeepers - updated.filter((p) => p.attendance === 'CONFIRMADO' && p.position === 'GOLEIRO').length;

      updated = updated.map((p) => {
        if (p.attendance === 'ESPERA') {
          if (p.position === 'GOLEIRO' && gkSpots > 0) {
            gkSpots--;
            return { ...p, attendance: 'CONFIRMADO', checkedIn: true };
          }
          if (p.position !== 'GOLEIRO' && outfieldSpots > 0) {
            outfieldSpots--;
            return { ...p, attendance: 'CONFIRMADO', checkedIn: true };
          }
        }
        return p;
      });
      return updated;
    });
    showToast('Vagas liberadas para Diaristas da espera!');
  };

  const registerGoal = (quadroNum: number, scorerId: string, assistId: string) => {
    if (!scorerId) return;

    const scorer = players.find((p) => p.id === scorerId);
    const assister = players.find((p) => p.id === assistId);
    const isQ1 = quadroNum === 1;

    setLiveScore((prev) => ({
      ...prev,
      score1: isQ1 ? prev.score1 + 1 : prev.score1,
      score2: !isQ1 ? prev.score2 + 1 : prev.score2,
      events: [
        {
          id: Date.now().toString(),
          matchNum: matchNumber,
          quadroLabel: isQ1 ? 'Quadro 1' : 'Quadro 2',
          scorerName: scorer?.name || '',
          assisterName: assister?.name || null
        },
        ...prev.events
      ]
    }));

    setPlayers((prev) =>
      prev.map((p) => {
        if (p.id === scorerId) {
          return { ...p, stats: { ...p.stats, goals: p.stats.goals + 1 } };
        }
        if (assistId && p.id === assistId) {
          return { ...p, stats: { ...p.stats, assists: p.stats.assists + 1 } };
        }
        return p;
      })
    );

    showToast(`Gol de ${scorer?.name}!`);
  };

  const toggleGameFinancial = (playerId: string) => {
    setPlayers((prev) =>
      prev.map((item) =>
        item.id === playerId
          ? { ...item, financialStatus: item.financialStatus === 'EM_DIA' ? 'PENDENTE' : 'EM_DIA' }
          : item
      )
    );
  };

  const toggleBbqFinancial = (playerId: string) => {
    setPlayers((prev) =>
      prev.map((item) =>
        item.id === playerId ? { ...item, bbqPaid: !item.bbqPaid } : item
      )
    );
  };

  const savePlayer = (playerData, editingId?: string) => {
    if (editingId) {
      setPlayers((prev) =>
        prev.map((p) => (p.id === editingId ? { ...p, ...playerData } : p))
      );
      showToast(`Cadastro de ${playerData.name} atualizado.`);
    } else {
      const maxOrder = players.reduce((max, p) => Math.max(max, p.arrivalOrder || 0), 0);
      const newPlayer = {
        id: Date.now().toString(),
        ...playerData,
        bbqConfirmed: false,
        bbqPaid: false,
        matchesPlayedToday: 0,
        consecutiveGames: 0,
        arrivalOrder: maxOrder + 1,
        availability: 'ATIVO',
        wasDrawnToComplete: false,
        stats: { games: 1, goals: 0, assists: 0, wins: 0 },
        attendance: 'ESPERA',
        checkedIn: false,
        confirmedAt: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      setPlayers((prev) => [...prev, newPlayer]);
      showToast(`${playerData.name} adicionado.`);
    }
  };

  const addTransaction = (txData) => {
    const newTx = {
      id: Date.now().toString(),
      ...txData,
      date: new Date().toLocaleDateString('pt-BR')
    };
    setTransactions((prev) => [newTx, ...prev]);
    showToast('Lançamento registrado.');
  };

  const openWhatsAppList = () => {
    const gkText = confirmedGoalkeepers.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const outfieldText = confirmedOutfield
      .map((p, i) => `${i + 1}. ${p.name} (${POSITION_LABELS[p.position].short}) ${p.type === 'DIARISTA' ? '[Diarista]' : ''}`)
      .join('\n');
    const waitingText = waitingList.length
      ? waitingList.map((p, i) => `${i + 1}. ${p.name} [${p.type}]`).join('\n')
      : 'Fila vazia';

    const bbqSection = matchConfig.isBbqDay
      ? `\n\n🥩 *CHURRASCO (${bbqConfirmedList.length}) - R$ ${matchConfig.bbqFee}:*\n` +
        (bbqConfirmedList.map((p, i) => `${i + 1}. ${p.name} ${p.bbqPaid ? '✅' : '⏳'}`).join('\n') || 'Ninguém confirmado')
      : '';

    const text = `⚽ *RESENHA • SESI, SENAI E AMIGOS* ⚽
📅 *${matchConfig.date}*
📍 *${matchConfig.location}*
🔗 *Confirme sua presença:*
https://${matchConfig.slug}

🧤 *GOLEIROS (${confirmedGoalkeepers.length}/${matchConfig.maxGoalkeepers}):*
${gkText || 'Nenhum'}

🏃 *LINHA (${confirmedOutfield.length}/${matchConfig.maxOutfield}):*
${outfieldText || 'Nenhum'}

⏳ *ESPERA (${waitingList.length}):*
${waitingText}${bbqSection}`;

    setWhatsappModal({ open: true, title: 'Lista para o WhatsApp', text });
  };

  const openWhatsAppQuadros = () => {
    const q1Players = quadro1.map((id) => players.find((p) => p.id === id)).filter(Boolean);
    const q2Players = quadro2.map((id) => players.find((p) => p.id === id)).filter(Boolean);
    const benchPlayers = benchQueue.map((id) => players.find((p) => p.id === id)).filter(Boolean);

    const formatList = (list) =>
      list.map((p) => `• ${p.name} (${POSITION_LABELS[p.position].short} | ${p.matchesPlayedToday}J)`).join('\n');

    const text = `⚖️ *RESENHA • PARTIDA #${matchNumber}* ⚖️

1️⃣ *QUADRO 1:*
${formatList(q1Players)}

2️⃣ *QUADRO 2:*
${formatList(q2Players)}

⏳ *PRÓXIMOS (${benchPlayers.length}):*
${formatList(benchPlayers) || 'Ninguém aguardando'}`;

    setWhatsappModal({ open: true, title: 'Escalação dos Quadros', text });
  };

  const openWhatsAppBirthdays = () => {
    const lines = monthlyBirthdays
      .map((p) => `🎂 ${p.formattedDate} — *${p.name}*${p.isToday ? ' 🎉 (HOJE!)' : ''}`)
      .join('\n');

    const text = `🎉 *ANIVERSARIANTES DE ${currentMonthName.toUpperCase()} • RESENHA* 🎉

${lines || 'Nenhum aniversariante cadastrado neste mês.'}

Parabéns aos craques do grupo! ⚽🍻`;

    setWhatsappModal({ open: true, title: `Aniversariantes de ${currentMonthName}`, text });
  };

  const openWhatsAppFinance = () => {
    const pendingMonthly = players.filter((p) => p.type === 'MENSALISTA' && p.financialStatus === 'PENDENTE');
    const pendingBbq = players.filter((p) => p.bbqConfirmed && !p.bbqPaid);

    const text = `💰 *PRESTAÇÃO DE CONTAS • RESENHA* 💰

⚽ *CAIXA DA PELADA:*
• Entradas: R$ ${financialSummary.totalPeladaIncome.toFixed(2)}
• Saídas: R$ ${financialSummary.peladaExpenses.toFixed(2)}
• *Saldo Pelada:* R$ ${financialSummary.peladaBalance.toFixed(2)}

🥩 *CAIXA DO CHURRASCO:*
• Arrecadado: R$ ${financialSummary.totalBbqIncome.toFixed(2)} (${financialSummary.bbqPaidCount}/${financialSummary.bbqConfirmedCount} pagos)
• Gastos: R$ ${financialSummary.bbqExpenses.toFixed(2)}
• *Saldo Churrasco:* R$ ${financialSummary.bbqBalance.toFixed(2)}

⚠️ *Pendências Churrasco (${pendingBbq.length}):*
${pendingBbq.map((p) => `• ${p.name}`).join('\n') || 'Nenhuma'}

⚠️ *Pendências Mensalidade (${pendingMonthly.length}):*
${pendingMonthly.map((p) => `• ${p.name}`).join('\n') || 'Nenhuma'}`;

    setWhatsappModal({ open: true, title: 'Prestação de Contas', text });
  };

  return (
    <PeladaContext.Provider
      value={{
        players,
        transactions,
        matchConfig,
        setMatchConfig,
        matchNumber,
        quadro1,
        quadro2,
        benchQueue,
        rotationExplanation,
        selectedSwap,
        liveScore,
        confirmedGoalkeepers,
        confirmedOutfield,
        waitingList,
        absentList,
        bbqConfirmedList,
        currentMonthName,
        monthlyBirthdays,
        topScorers,
        financialSummary,
        toast,
        showToast,
        whatsappModal,
        setWhatsappModal,
        drawInitialMatchOfTheDay,
        handleRotateAfterMatch,
        replacePlayerInQuadro,
        handlePoolAvailabilityChange,
        handleManualSwap,
        handleAttendanceAction,
        handleReleaseWaitingList,
        registerGoal,
        toggleGameFinancial,
        toggleBbqFinancial,
        savePlayer,
        addTransaction,
        openWhatsAppList,
        openWhatsAppQuadros,
        openWhatsAppBirthdays,
        openWhatsAppFinance,
      }}
    >
      {children}
    </PeladaContext.Provider>
  );
}

export function usePelada() {
  const ctx = useContext(PeladaContext);
  if (!ctx) throw new Error('usePelada deve ser usado dentro de PeladaProvider');
  return ctx;
}
