// @ts-nocheck
'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Calendar,
  Trophy,
  DollarSign,
  Shuffle,
  CheckCircle2,
  Clock,
  Copy,
  Check,
  Plus,
  RotateCcw,
  ArrowLeftRight,
  Shield,
  Edit3,
  UserPlus,
  Share2,
  Flame,
  X,
  Smartphone,
  Link2,
  UserCheck,
  RefreshCw,
  Sparkles,
  KeyRound,
  Lock,
  LogOut,
  UserMinus
} from 'lucide-react';
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

// --- DADOS INICIAIS REALISTAS (Com arrivalOrder, availability e consecutiveGames) ---
const INITIAL_PLAYERS = [
  // Goleiros
  { id: '1', name: 'Marcão Paredão', phone: '21999990001', type: 'MENSALISTA', position: 'GOLEIRO', overall: 4.5, stamina: 3.5, speed: 3.0, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 1, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 18, goals: 0, assists: 2, wins: 12 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:01' },
  { id: '2', name: 'Julio Cesar', phone: '21999990002', type: 'MENSALISTA', position: 'GOLEIRO', overall: 4.0, stamina: 3.0, speed: 3.5, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 2, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 16, goals: 0, assists: 1, wins: 9 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:05' },
  { id: '3', name: 'Dida Avulso', phone: '21999990003', type: 'DIARISTA', position: 'GOLEIRO', overall: 4.2, stamina: 4.0, speed: 3.8, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 19, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 8, goals: 0, assists: 0, wins: 5 }, attendance: 'ESPERA', checkedIn: false, confirmedAt: '10:15' },

  // Zagueiros
  { id: '4', name: 'Thiago Silva', phone: '21999990004', type: 'MENSALISTA', position: 'ZAGUEIRO', overall: 4.6, stamina: 4.0, speed: 3.8, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 3, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 19, goals: 4, assists: 3, wins: 13 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:02' },
  { id: '5', name: 'Dedé Mito', phone: '21999990005', type: 'MENSALISTA', position: 'ZAGUEIRO', overall: 4.0, stamina: 3.5, speed: 3.2, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 9, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 17, goals: 2, assists: 1, wins: 10 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:10' },
  { id: '6', name: 'Fábio Xerife', phone: '21999990006', type: 'MENSALISTA', position: 'ZAGUEIRO', overall: 3.8, stamina: 3.2, speed: 3.0, financialStatus: 'PENDENTE', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 10, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 15, goals: 1, assists: 2, wins: 7 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:12' },

  // Laterais / Alas
  { id: '7', name: 'José Ala (Motor)', phone: '21999990007', type: 'MENSALISTA', position: 'LATERAL', overall: 4.3, stamina: 4.9, speed: 4.7, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 4, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 19, goals: 9, assists: 11, wins: 12 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:03' },
  { id: '8', name: 'Léo Moura', phone: '21999990008', type: 'MENSALISTA', position: 'LATERAL', overall: 4.1, stamina: 3.6, speed: 3.5, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 11, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 18, goals: 6, assists: 14, wins: 11 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:14' },
  { id: '9', name: 'Carlinhos Bala', phone: '21999990009', type: 'DIARISTA', position: 'LATERAL', overall: 3.9, stamina: 4.5, speed: 4.8, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 15, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 10, goals: 5, assists: 6, wins: 6 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '11:20' },

  // Meio-Campistas
  { id: '10', name: 'Rodrigo (Camisa 10)', phone: '21999990010', type: 'MENSALISTA', position: 'MEIO_CAMPO', overall: 4.8, stamina: 4.7, speed: 4.2, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 5, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 20, goals: 18, assists: 22, wins: 15 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:00' },
  { id: '11', name: 'Jamel Maestro', phone: '21999990011', type: 'MENSALISTA', position: 'MEIO_CAMPO', overall: 4.5, stamina: 4.0, speed: 3.8, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 6, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 18, goals: 12, assists: 16, wins: 12 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:04' },
  { id: '12', name: 'Carlos Box-to-Box', phone: '21999990012', type: 'MENSALISTA', position: 'MEIO_CAMPO', overall: 4.3, stamina: 4.8, speed: 4.1, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 7, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 17, goals: 10, assists: 11, wins: 11 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:06' },
  { id: '13', name: 'Gerson Coringa', phone: '21999990013', type: 'MENSALISTA', position: 'MEIO_CAMPO', overall: 4.4, stamina: 4.3, speed: 4.0, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 13, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 16, goals: 8, assists: 9, wins: 10 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:18' },
  { id: '14', name: 'Renato Augusto', phone: '21999990014', type: 'MENSALISTA', position: 'MEIO_CAMPO', overall: 4.6, stamina: 2.8, speed: 3.0, financialStatus: 'PENDENTE', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 14, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 12, goals: 7, assists: 13, wins: 8 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:25' },
  { id: '15', name: 'Juninho Pernambucano', phone: '21999990015', type: 'DIARISTA', position: 'MEIO_CAMPO', overall: 4.1, stamina: 3.8, speed: 3.6, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 16, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 9, goals: 6, assists: 7, wins: 5 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '11:45' },

  // Atacantes
  { id: '16', name: 'Pedro Queixada', phone: '21999990016', type: 'MENSALISTA', position: 'ATACANTE', overall: 4.7, stamina: 3.8, speed: 4.1, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 8, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 19, goals: 26, assists: 8, wins: 13 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:07' },
  { id: '17', name: 'Bruno Henrique', phone: '21999990017', type: 'MENSALISTA', position: 'ATACANTE', overall: 4.5, stamina: 4.6, speed: 4.9, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 12, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 18, goals: 21, assists: 12, wins: 12 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:08' },
  { id: '18', name: 'Cano Matador', phone: '21999990018', type: 'MENSALISTA', position: 'ATACANTE', overall: 4.4, stamina: 3.9, speed: 3.8, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 17, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 17, goals: 23, assists: 4, wins: 10 }, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: '09:15' },
  { id: '19', name: 'Hulk Forte', phone: '21999990019', type: 'MENSALISTA', position: 'ATACANTE', overall: 4.6, stamina: 4.2, speed: 4.3, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 18, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 16, goals: 19, assists: 9, wins: 11 }, attendance: 'CONFIRMADO', checkedIn: false, confirmedAt: '09:20' },
  { id: '20', name: 'Romário Baixinho', phone: '21999990020', type: 'MENSALISTA', position: 'ATACANTE', overall: 4.5, stamina: 2.5, speed: 3.4, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 20, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 15, goals: 20, assists: 3, wins: 9 }, attendance: 'CONFIRMADO', checkedIn: false, confirmedAt: '09:30' },

  // Na Lista de Espera
  { id: '21', name: 'Tiquinho Soares', phone: '21999990021', type: 'DIARISTA', position: 'ATACANTE', overall: 4.0, stamina: 3.7, speed: 3.8, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 21, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 11, goals: 11, assists: 5, wins: 6 }, attendance: 'ESPERA', checkedIn: false, confirmedAt: '12:10' },
  { id: '22', name: 'Lucas Paquetá', phone: '21999990022', type: 'DIARISTA', position: 'MEIO_CAMPO', overall: 4.2, stamina: 4.4, speed: 4.1, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 22, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 7, goals: 5, assists: 6, wins: 4 }, attendance: 'ESPERA', checkedIn: false, confirmedAt: '14:05' },
  { id: '23', name: 'Vini Malvadeza', phone: '21999990023', type: 'DIARISTA', position: 'ATACANTE', overall: 4.6, stamina: 4.8, speed: 5.0, financialStatus: 'EM_DIA', bbqConfirmed: true, bbqPaid: true, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 23, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 6, goals: 9, assists: 7, wins: 5 }, attendance: 'FORA', checkedIn: false, confirmedAt: '-' },
  { id: '24', name: 'André Trindade', phone: '21999990024', type: 'MENSALISTA', position: 'ZAGUEIRO', overall: 4.1, stamina: 4.5, speed: 4.0, financialStatus: 'EM_DIA', bbqConfirmed: false, bbqPaid: false, matchesPlayedToday: 0, consecutiveGames: 0, arrivalOrder: 24, availability: 'ATIVO', wasDrawnToComplete: false, stats: { games: 14, goals: 2, assists: 4, wins: 8 }, attendance: 'FORA', checkedIn: false, confirmedAt: '-' }
];

const INITIAL_TRANSACTIONS = [
  { id: 't1', description: 'Aluguel Quadra Society (Mês)', amount: 1800, type: 'DESPESA', category: 'CAMPO', date: '05/11/2026' },
  { id: 't2', description: '2 Bolas Penalty Society Pro', amount: 340, type: 'DESPESA', category: 'MATERIAL', date: '10/11/2026' },
  { id: 't3', description: 'Carnes + Carvão + Gelo (Churrasco Fim de Mês)', amount: 480, type: 'DESPESA', category: 'CHURRASCO', date: '15/11/2026' },
  { id: 't4', description: 'Diárias Avulsas (Semana Passada)', amount: 210, type: 'RECEITA', category: 'DIARIA', date: '11/11/2026' },
];

const POSITION_LABELS = {
  GOLEIRO: { label: 'Goleiro', short: 'GOL', color: 'bg-[#F9F3EB] text-[#7A5220] border-[#E3D1B4]' },
  ZAGUEIRO: { label: 'Zagueiro', short: 'ZAG', color: 'bg-[#EBF2F7] text-[#142F47] border-[#C5D7E5]' },
  LATERAL: { label: 'Lateral/Ala', short: 'LAT', color: 'bg-[#EEF4F8] text-[#31688E] border-[#C9DCEB]' },
  MEIO_CAMPO: { label: 'Meio-Campo', short: 'MEI', color: 'bg-[#F2EFE9] text-[#2C4559] border-[#D8D0C1]' },
  ATACANTE: { label: 'Atacante', short: 'ATA', color: 'bg-[#F7EFEF] text-[#7A2E2E] border-[#E3CACA]' },
};

const AVAILABILITY_LABELS: Record<DayAvailability, { label: string; badge: string }> = {
  ATIVO: { label: 'Ativo', badge: 'bg-emerald-50 text-emerald-800 border-emerald-200' },
  PULANDO_PROXIMA: { label: 'Pulando 1 Jogo', badge: 'bg-amber-50 text-amber-800 border-amber-200' },
  PAUSADO: { label: 'Pausado / Obs.', badge: 'bg-orange-50 text-orange-800 border-orange-200' },
  FOI_EMBORA: { label: 'Foi Embora', badge: 'bg-red-50 text-red-800 border-red-200' },
};

// Score Ponderado: 50% Técnica, 30% Fôlego, 20% Velocidade
const calcWeightedScore = (player) => {
  return Number(((player.overall * 0.5) + (player.stamina * 0.3) + (player.speed * 0.2)).toFixed(2));
};

// Converte o objeto de jogador local para o formato LivePlayerState do motor oficial rotation-engine.ts
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

const DEMO_STORAGE_KEY = 'peladapro_demo_device_player_v1';

export default function App() {
  const [viewMode, setViewMode] = useState('ADMIN');
  const [activeTab, setActiveTab] = useState('agenda');
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [transactions, setTransactions] = useState(INITIAL_TRANSACTIONS);

  // Estado do Jogador Logado no Magic Link Único
  const [currentPlayerId, setCurrentPlayerId] = useState('7');
  const [isDeviceAuthenticated, setIsDeviceAuthenticated] = useState(true);
  const [loginCandidateId, setLoginCandidateId] = useState('');
  const [phoneSearchInput, setPhoneSearchInput] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    try {
      const savedId = localStorage.getItem(DEMO_STORAGE_KEY);
      if (savedId && players.some((p) => p.id === savedId)) {
        setCurrentPlayerId(savedId);
        setIsDeviceAuthenticated(true);
      }
    } catch {
      // ignora erro de localStorage
    }
  }, []);

  const handleDeviceIdentify = (e) => {
    e.preventDefault();
    setLoginError('');
    const cleanDigits = (phoneSearchInput || '').replace(/\D/g, '');
    if (cleanDigits.length < 4) {
      setLoginError('Digite pelo menos os 4 últimos dígitos do seu WhatsApp.');
      return;
    }
    const last4 = cleanDigits.slice(-4);

    if (loginCandidateId) {
      const target = players.find((p) => p.id === loginCandidateId);
      if (!target) {
        setLoginError('Selecione seu nome.');
        return;
      }
      if (!target.phone.endsWith(last4)) {
        setLoginError(`Os 4 últimos dígitos (${last4}) não conferem com o WhatsApp de ${target.name} (final ${target.phone.slice(-4)}).`);
        return;
      }
      setCurrentPlayerId(target.id);
      setIsDeviceAuthenticated(true);
      localStorage.setItem(DEMO_STORAGE_KEY, target.id);
      setPhoneSearchInput('');
      showToast(`Navegador vinculado a ${target.name}.`);
      return;
    }

    const matches = players.filter(
      (p) => (cleanDigits.length >= 8 && p.phone.endsWith(cleanDigits)) || p.phone.slice(-4) === last4
    );

    if (matches.length === 1) {
      const target = matches[0];
      setCurrentPlayerId(target.id);
      setIsDeviceAuthenticated(true);
      localStorage.setItem(DEMO_STORAGE_KEY, target.id);
      setPhoneSearchInput('');
      showToast(`Reconhecido automaticamente como ${target.name}.`);
    } else if (matches.length > 1) {
      setLoginError('Mais de um jogador tem esse final. Selecione seu nome acima.');
    } else {
      setLoginError('Nenhum jogador encontrado com esses dígitos de WhatsApp.');
    }
  };

  const handleDisconnectDevice = () => {
    localStorage.removeItem(DEMO_STORAGE_KEY);
    setIsDeviceAuthenticated(false);
    setLoginCandidateId('');
    setPhoneSearchInput('');
    setLoginError('');
  };

  // Configurações da Pelada da Semana
  const [matchConfig, setMatchConfig] = useState({
    slug: 'resenha.app/convite/semana-47',
    date: 'Sábado, 28 Nov • 09:30 (Último FDS do Mês)',
    location: 'SESI / SENAI Society — Campo Oficial',
    playersPerTeam: 6,
    maxOutfield: 18,
    maxGoalkeepers: 2,
    monthlyFee: 150,
    dailyFee: 35,
    isBbqDay: true,
    bbqFee: 45,
    windowMode: 'MENSALISTAS',
  });

  // --- ESTADO DO MOTOR DINÂMICO DE QUADROS (Conectado ao src/lib/rotation-engine.ts) ---
  const [matchNumber, setMatchNumber] = useState(1);
  const [quadro1, setQuadro1] = useState([]); // IDs no Quadro 1
  const [quadro2, setQuadro2] = useState([]); // IDs no Quadro 2
  const [benchQueue, setBenchQueue] = useState([]); // IDs no Pool de Espera
  const [rotationExplanation, setRotationExplanation] = useState(null);
  const [selectedSwap, setSelectedSwap] = useState(null);

  const [liveScore, setLiveScore] = useState({
    score1: 0,
    score2: 0,
    events: [],
    history: []
  });

  // Modais e Notificações
  const [whatsappModal, setWhatsappModal] = useState({ open: false, title: '', text: '' });
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState(null);
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
  const [playerModal, setPlayerModal] = useState({ open: false, editingPlayer: null });
  const [expenseModal, setExpenseModal] = useState(false);

  const [statsSort, setStatsSort] = useState('goals');

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(null), 3200);
  };

  // Listas Derivadas
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

  // Sincroniza uma lista de LivePlayerState de volta para o state `players`
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

  // --- 1. SORTEIO DO 1º JOGO DO DIA USANDO generateInitialQuadros (rotation-engine.ts) ---
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
      title: 'Partida #1 Escalada por Ordem de Chegada + Snake Draft',
      details: `Os ${result.quadro1.length + result.quadro2.length} primeiros por Ordem de Chegada entraram nos Quadros 1 e 2 (já contabilizando 1J). ${result.waitingPool.length} atletas aguardam na Fila de Próximos com prioridade de estreia (0J) por ordem de chegada.`,
      completedIds: []
    });
  };

  useEffect(() => {
    if (quadro1.length === 0 && quadro2.length === 0) {
      drawInitialMatchOfTheDay(true);
    }
  }, []);

  // --- 2. ROTAÇÃO DINÂMICA ENTRE PARTIDAS USANDO rotateQuadrosAfterMatch (rotation-engine.ts) ---
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
      .map((p) => `${p.name} (${POSITION_LABELS[p.position].short})`)
      .join(', ');

    const outcomeLabel =
      outcome === 'QUADRO_1_WINS'
        ? 'Quadro 1 venceu e permaneceu'
        : outcome === 'QUADRO_2_WINS'
        ? 'Quadro 2 venceu e permaneceu'
        : outcome === 'DRAW_OLDEST_LEAVES'
        ? 'Empate (saiu o quadro mais antigo)'
        : 'Empate (saíram ambos os quadros)';

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
      title: `Partida #${matchNumber + 1} Definida • ${outcomeLabel}`,
      details:
        result.drawnPlayerIds.length > 0
          ? `Entraram os prioritários descansados da Fila de Próximos e foram sorteados para completar: ${drawnNames} (critérios: estreantes por chegada > menor nº de jogos hoje > menor sequência seguida > posição carente e fôlego).`
          : `Quadros renovados prioritariamente com os atletas descansados da Fila de Próximos.`,
      completedIds: result.drawnPlayerIds
    });

    setEndMatchModal({ open: false, outcome: 'QUADRO_1_WINS' });
    showToast(`Partida #${matchNumber} encerrada e rotação concluída.`);
  };

  // --- 3. SUBSTITUIÇÃO / REPESCAGEM IMEDIATA USANDO replaceSinglePlayerInQuadro ---
  const handleConfirmSingleReplacement = () => {
    const isQ1 = replaceModal.group === 'Q1';
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
      playerLeavingId: replaceModal.playerLeavingId,
      reason: replaceModal.reason,
      countMatchForLeavingPlayer: replaceModal.countMatchForLeavingPlayer,
      targetQuadro: targetLive,
      opponentQuadro: opponentLive,
      waitingPool: poolLive,
      manualSubstituteId: replaceModal.manualSubstituteId || undefined
    });

    if (isQ1) {
      syncLiveStatesToPlayers(result.updatedQuadro, opponentLive, result.updatedPool);
    } else {
      syncLiveStatesToPlayers(opponentLive, result.updatedQuadro, result.updatedPool);
    }

    const leavingPlayer = players.find((p) => p.id === replaceModal.playerLeavingId);
    const subName = result.substituteChosen?.player?.name || 'Nenhum substituto disponível';

    setRotationExplanation({
      type: 'REPLACE',
      title: `Substituição / Repescagem no ${isQ1 ? 'Quadro 1' : 'Quadro 2'}`,
      details: `${leavingPlayer?.name} saiu (${AVAILABILITY_LABELS[replaceModal.reason].label}). Entrou ${subName} respeitando a fila de prioridade e encaixe tático.`,
      completedIds: result.substituteChosen ? [result.substituteChosen.player_id] : []
    });

    setReplaceModal({
      open: false,
      group: 'Q1',
      playerLeavingId: '',
      reason: 'PULANDO_PROXIMA',
      countMatchForLeavingPlayer: false,
      manualSubstituteId: ''
    });
    showToast(`Substituição realizada: entrou ${subName}.`);
  };

  // --- 4. MUDANÇA DE DISPONIBILIDADE NO POOL DE ESPERA USANDO setPlayerAvailabilityInPool ---
  const handlePoolAvailabilityChange = (playerId: string, newAvail: DayAvailability) => {
    const poolLive = benchQueue.map((id) => players.find((p) => p.id === id)).filter(Boolean).map(toLivePlayerState);
    const updatedPool = setPlayerAvailabilityInPool(poolLive, playerId, newAvail);

    const q1Live = quadro1.map((id) => players.find((p) => p.id === id)).filter(Boolean).map(toLivePlayerState);
    const q2Live = quadro2.map((id) => players.find((p) => p.id === id)).filter(Boolean).map(toLivePlayerState);

    syncLiveStatesToPlayers(q1Live, q2Live, updatedPool);
    const target = players.find((p) => p.id === playerId);
    showToast(`Status de ${target?.name}: ${AVAILABILITY_LABELS[newAvail].label}.`);
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
      showToast(`Permuta realizada: ${pA?.name} ↔ ${pB?.name}`);
    }

    setSelectedSwap(null);
  };

  // --- LÓGICA DE PRESENÇA, FILA DE ESPERA E CHEGADA ATRASADA (normalizeLateArrivalPlayer) ---
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
            showToast(`${target.name} saiu. ${nextInLine.name} subiu da Fila de Espera.`);
          } else {
            showToast(`${target.name} marcou ausência.`);
          }
        } else if (wasConfirmedGK) {
          const nextGK = updated.find((p) => p.attendance === 'ESPERA' && p.position === 'GOLEIRO');
          if (nextGK) {
            updated = updated.map((p) =>
              p.id === nextGK.id ? { ...p, attendance: 'CONFIRMADO', checkedIn: true } : p
            );
            showToast(`Goleiro ${nextGK.name} promovido da fila de espera.`);
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
          showToast(
            target.type === 'DIARISTA'
              ? `${target.name} (Diarista): incluído na Fila de Espera (${nowTime}).`
              : `Limite atingido. ${target.name} entrou na Fila de Espera.`
          );
        } else {
          updated = updated.map((p) =>
            p.id === playerId ? { ...p, attendance: 'CONFIRMADO', checkedIn: true, confirmedAt: nowTime } : p
          );
          showToast(`${target.name} (${target.type}) confirmado na lista principal.`);
        }
      } else if (action === 'TOGGLE_CHECKIN') {
        const willBeCheckedIn = !target.checkedIn;

        if (willBeCheckedIn && target.position !== 'GOLEIRO') {
          // Usa normalizeLateArrivalPlayer do motor caso a pelada já tenha iniciado
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
          showToast(
            `${target.name} fez check-in (#${normalized.arrival_order} chegada, nivelado com ${normalized.matches_played_today}J).`
          );
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
        showToast(`Participação de ${target.name} no Churrasco atualizada.`);
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
    showToast('Vagas liberadas para Diaristas da Fila de Espera.');
  };

  const handleConfirmGoal = () => {
    if (!goalModal.scorerId) return;

    const scorer = players.find((p) => p.id === goalModal.scorerId);
    const assister = players.find((p) => p.id === goalModal.assistId);
    const isQ1 = goalModal.quadroNum === 1;

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
        if (p.id === goalModal.scorerId) {
          return { ...p, stats: { ...p.stats, goals: p.stats.goals + 1 } };
        }
        if (goalModal.assistId && p.id === goalModal.assistId) {
          return { ...p, stats: { ...p.stats, assists: p.stats.assists + 1 } };
        }
        return p;
      })
    );

    setGoalModal({ open: false, quadroNum: 1, scorerId: '', assistId: '' });
    showToast(`Gol registrado na Partida #${matchNumber}: ${scorer?.name}.`);
  };

  // --- GERADORES DE TEXTO PARA WHATSAPP ---
  const openWhatsAppList = () => {
    const gkText = confirmedGoalkeepers.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
    const outfieldText = confirmedOutfield
      .map((p, i) => `${i + 1}. ${p.name} (${POSITION_LABELS[p.position].short}) ${p.type === 'DIARISTA' ? '[Diarista]' : ''}`)
      .join('\n');
    const waitingText = waitingList.length
      ? waitingList.map((p, i) => `${i + 1}. ${p.name} [${p.type}] - ${p.confirmedAt}`).join('\n')
      : 'Fila vazia';

    const bbqSection = matchConfig.isBbqDay
      ? `\n\n🥩 *CHURRASCO DE FIM DE MÊS (${bbqConfirmedList.length}) - Cota R$ ${matchConfig.bbqFee}:*\n` +
        (bbqConfirmedList.map((p, i) => `${i + 1}. ${p.name} ${p.bbqPaid ? '✅' : '⏳'}`).join('\n') || 'Ninguém confirmado ainda')
      : '';

    const text = `⚽ *RESENHA • SESI, SENAI E AMIGOS* ⚽
📅 *${matchConfig.date}*
📍 *${matchConfig.location}*
${matchConfig.isBbqDay ? '🔥 *PELADA + CHURRASCO DO GRUPO* 🔥\n' : ''}
🔗 *Link Oficial de Confirmação:*
https://${matchConfig.slug}

🧤 *GOLEIROS (${confirmedGoalkeepers.length}/${matchConfig.maxGoalkeepers}):*
${gkText || 'Nenhum'}

🏃 *LINHA CONFIRMADOS (${confirmedOutfield.length}/${matchConfig.maxOutfield}):*
${outfieldText || 'Nenhum'}

⏳ *FILA DE ESPERA (${waitingList.length}):*
${waitingText}${bbqSection}`;

    setWhatsappModal({ open: true, title: 'Link Oficial & Lista para o WhatsApp', text });
  };

  const openWhatsAppQuadros = () => {
    const q1Players = quadro1.map((id) => players.find((p) => p.id === id)).filter(Boolean);
    const q2Players = quadro2.map((id) => players.find((p) => p.id === id)).filter(Boolean);
    const benchPlayers = benchQueue.map((id) => players.find((p) => p.id === id)).filter(Boolean);

    const formatList = (list) =>
      list.map((p) => `• ${p.name} (${POSITION_LABELS[p.position].short} | Nota ${calcWeightedScore(p)} | ${p.matchesPlayedToday}J)`).join('\n');

    const text = `⚖️ *RESENHA • PARTIDA #${matchNumber}* ⚖️
📅 ${matchConfig.date}

1️⃣ *QUADRO 1 (${q1Players.length} na linha):*
${formatList(q1Players)}

2️⃣ *QUADRO 2 (${q2Players.length} na linha):*
${formatList(q2Players)}

⏳ *PRÓXIMOS NA FILA (${benchPlayers.length}):*
${formatList(benchPlayers) || 'Ninguém aguardando'}`;

    setWhatsappModal({ open: true, title: 'Escalação dos Quadros (WhatsApp)', text });
  };

  // --- CÁLCULOS FINANCEIROS SEPARADOS (PELADA vs CHURRASCO) ---
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

  const openWhatsAppFinance = () => {
    const pendingMonthly = players.filter((p) => p.type === 'MENSALISTA' && p.financialStatus === 'PENDENTE');
    const pendingBbq = players.filter((p) => p.bbqConfirmed && !p.bbqPaid);

    const text = `💰 *PRESTAÇÃO DE CONTAS • RESENHA SESI/SENAI* 💰

⚽ *CAIXA DA PELADA (Campo & Material):*
• Entradas (Mensalidades + Diárias): R$ ${financialSummary.totalPeladaIncome.toFixed(2)}
• Saídas (Quadra + Material): R$ ${financialSummary.peladaExpenses.toFixed(2)}
• *Saldo Pelada:* R$ ${financialSummary.peladaBalance.toFixed(2)}

🥩 *CAIXA DO CHURRASCO (Separado):*
• Confirmados: ${financialSummary.bbqConfirmedCount} atletas (Cota R$ ${matchConfig.bbqFee})
• Arrecadado: R$ ${financialSummary.totalBbqIncome.toFixed(2)} (${financialSummary.bbqPaidCount} pagos)
• Gastos Churrasco: R$ ${financialSummary.bbqExpenses.toFixed(2)}
• *Saldo Churrasco:* R$ ${financialSummary.bbqBalance.toFixed(2)}

⚠️ *Cotas do Churrasco Pendentes (${pendingBbq.length}):*
${pendingBbq.map((p) => `• ${p.name} (R$ ${matchConfig.bbqFee})`).join('\n') || 'Todos em dia!'}

⚠️ *Mensalidades Pendentes (${pendingMonthly.length}):*
${pendingMonthly.map((p) => `• ${p.name} (R$ ${matchConfig.monthlyFee})`).join('\n') || 'Todos em dia!'}`;

    setWhatsappModal({ open: true, title: 'Prestação de Contas (Pelada + Churrasco)', text });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(whatsappModal.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToast('Texto copiado para a área de transferência.');
  };

  const loggedPlayer = useMemo(
    () => players.find((p) => p.id === currentPlayerId) || players[0],
    [players, currentPlayerId]
  );

  const handleSavePlayer = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const playerData = {
      name: formData.get('name'),
      phone: formData.get('phone') || '21999990000',
      type: formData.get('type'),
      position: formData.get('position'),
      overall: parseFloat(formData.get('overall')),
      stamina: parseFloat(formData.get('stamina')),
      speed: parseFloat(formData.get('speed')),
      financialStatus: formData.get('financialStatus')
    };

    if (playerModal.editingPlayer) {
      setPlayers((prev) =>
        prev.map((p) => (p.id === playerModal.editingPlayer.id ? { ...p, ...playerData } : p))
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
      showToast(`${playerData.name} adicionado ao elenco.`);
    }
    setPlayerModal({ open: false, editingPlayer: null });
  };

  const handleAddTransaction = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const newTx = {
      id: Date.now().toString(),
      description: formData.get('description'),
      amount: parseFloat(formData.get('amount')),
      type: formData.get('type'),
      category: formData.get('category'),
      date: new Date().toLocaleDateString('pt-BR')
    };
    setTransactions((prev) => [newTx, ...prev]);
    setExpenseModal(false);
    showToast('Lançamento registrado com sucesso.');
  };

  const navItems = [
    { id: 'agenda', label: 'Lista & Presença', icon: Calendar, badge: `${confirmedOutfield.length}/${matchConfig.maxOutfield}` },
    { id: 'sorteio', label: 'Quadros & Rotação', icon: Shuffle, badge: `Jogo #${matchNumber}` },
    { id: 'jogadores', label: 'Elenco', icon: Users, badge: players.length },
    { id: 'estatisticas', label: 'Ranking', icon: Trophy },
    { id: 'financeiro', label: 'Caixa & Churrasco', icon: DollarSign }
  ];

  return (
    <div className="min-h-screen bg-[#F4F0E8] text-[#142F47] font-sans pb-16">
      {/* NOTIFICAÇÃO SÓBRIA */}
      {toast && (
        <div className="fixed bottom-6 right-5 z-50 flex items-center gap-2.5 bg-[#142F47] text-[#F4F0E8] font-medium px-4 py-3 rounded-xl shadow-lg border border-[#31688E]">
          <CheckCircle2 className="w-4 h-4 text-[#9CC2DC] shrink-0" />
          <span className="text-xs">{toast}</span>
        </div>
      )}

      {/* BARRA SUPERIOR INSTITUCIONAL */}
      <div className="bg-[#0E2234] text-[#D3DFEA] border-b border-[#1E3B56] px-4 py-2">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-[#9CC2DC]" />
            <span className="text-[#9CC2DC] font-medium">Link único do grupo:</span>
            <code className="bg-[#142F47] px-2 py-0.5 rounded text-[#F4F0E8] border border-[#274B6B] text-[11px]">
              https://{matchConfig.slug}
            </code>
          </div>

          <div className="flex items-center gap-1 bg-[#142F47] p-1 rounded-lg border border-[#274B6B]">
            <button
              onClick={() => setViewMode('ADMIN')}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 text-xs ${
                viewMode === 'ADMIN'
                  ? 'bg-[#F4F0E8] text-[#142F47] shadow-sm'
                  : 'text-[#D3DFEA] hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Painel da Organização</span>
            </button>
            <button
              onClick={() => setViewMode('PLAYER_LINK')}
              className={`px-3 py-1 rounded-md font-semibold transition flex items-center gap-1.5 text-xs ${
                viewMode === 'PLAYER_LINK'
                  ? 'bg-[#31688E] text-white shadow-sm'
                  : 'text-[#D3DFEA] hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Visão do Jogador (Magic Link)</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          VISÃO 1: LINK ÚNICO DA SEMANA (TELA DO CELULAR / WHATSAPP WEB DO JOGADOR)
         ===================================================================== */}
      {viewMode === 'PLAYER_LINK' ? (
        <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
          <div className="bg-white border border-[#DDD5C7] rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#31688E] flex items-center gap-1.5">
                <Smartphone className="w-4 h-4" />
                Simulador de Acesso (Celular / WhatsApp Web)
              </span>
              <button
                type="button"
                onClick={handleDisconnectDevice}
                className="text-[11px] bg-[#FAF8F4] hover:bg-[#EAE3D5] px-2.5 py-1 rounded-lg text-[#142F47] border border-[#DDD5C7] font-semibold transition"
              >
                Testar 1º Acesso (4 Dígitos)
              </button>
            </div>
            <p className="text-xs text-[#5A6E82]">
              No 1º acesso (no celular ou pelo WhatsApp Web), o atleta informa os <strong>4 últimos dígitos do WhatsApp</strong> e o navegador memoriza seu perfil automaticamente:
            </p>
            <div>
              <label className="text-[11px] text-[#4A6075] block mb-1 font-semibold">
                Alternar atleta rapidamente para testar regras:
              </label>
              <select
                value={currentPlayerId}
                onChange={(e) => {
                  setCurrentPlayerId(e.target.value);
                  setIsDeviceAuthenticated(true);
                  localStorage.setItem(DEMO_STORAGE_KEY, e.target.value);
                }}
                className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-xs font-semibold text-[#142F47]"
              >
                {players.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — Final WhatsApp: {p.phone.slice(-4)} — [{p.type}] ({p.attendance})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="bg-white border border-[#DDD5C7] rounded-2xl overflow-hidden shadow-md">
            <div className="bg-[#142F47] text-[#F4F0E8] p-5 border-b border-[#0E2234] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <img
                  src="/logo-resenha.jpg"
                  alt="Logo Resenha"
                  className="w-14 h-14 rounded-full object-cover border-2 border-[#F4F0E8]/80 shadow-sm shrink-0"
                />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#9CC2DC] block">
                    Resenha • SESI, SENAI e Amigos
                  </span>
                  <h2 className="text-base font-bold text-white mt-0.5">{matchConfig.date}</h2>
                  <p className="text-xs text-[#D3DFEA]">{matchConfig.location}</p>
                </div>
              </div>
              {matchConfig.isBbqDay && (
                <div className="bg-[#F4F0E8]/10 border border-[#F4F0E8]/25 px-3 py-1.5 rounded-xl text-center shrink-0">
                  <Flame className="w-4 h-4 text-[#E5B869] mx-auto" />
                  <span className="text-[10px] font-bold text-[#F4F0E8] block mt-0.5">
                    CHURRASCO
                  </span>
                </div>
              )}
            </div>

            <div className="p-6 space-y-5">
              {!isDeviceAuthenticated ? (
                <form onSubmit={handleDeviceIdentify} className="space-y-4">
                  <div className="p-3.5 rounded-xl bg-[#EBF2F7] border border-[#C5D7E5] text-xs space-y-1">
                    <p className="font-bold text-[#142F47] flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-[#31688E]" />
                      Identificação Rápida (1º Acesso neste Navegador)
                    </p>
                    <p className="text-[#3A5268] leading-relaxed">
                      Digite os <strong>4 últimos dígitos do seu WhatsApp</strong> para vincular seu perfil a este aparelho (Celular ou WhatsApp Web).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#4A6075]">
                      1. Seu Nome (Opcional se os 4 dígitos forem únicos)
                    </label>
                    <select
                      value={loginCandidateId}
                      onChange={(e) => setLoginCandidateId(e.target.value)}
                      className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2.5 text-xs font-semibold text-[#142F47]"
                    >
                      <option value="">-- Identificar direto pelos 4 dígitos --</option>
                      {players.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({POSITION_LABELS[p.position].short})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#4A6075]">
                      2. Últimos 4 dígitos do seu WhatsApp (Ex: 0007 p/ José Ala)
                    </label>
                    <input
                      type="tel"
                      inputMode="numeric"
                      required
                      placeholder="Ex: 0007"
                      value={phoneSearchInput}
                      onChange={(e) => setPhoneSearchInput(e.target.value)}
                      className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3.5 py-2.5 text-sm font-bold tracking-widest text-[#142F47]"
                    />
                  </div>

                  {loginError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs">
                      {loginError}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white font-bold text-xs flex items-center justify-center gap-2 transition"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Vincular Meu Perfil Neste Navegador</span>
                  </button>
                </form>
              ) : (
                <>
                  <div className="bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] text-[#31688E] font-semibold flex items-center gap-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          Reconhecido neste navegador
                        </span>
                        <h3 className="text-lg font-bold text-[#142F47] mt-0.5">
                          {loggedPlayer.name}
                        </h3>
                        <span className="text-xs text-[#5A6E82]">
                          Posição: {POSITION_LABELS[loggedPlayer.position].label} • Final WhatsApp: ••••{loggedPlayer.phone.slice(-4)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span
                          className={`px-2.5 py-1 rounded-md text-[11px] font-bold border ${
                            loggedPlayer.type === 'MENSALISTA'
                              ? 'bg-[#EBF2F7] text-[#142F47] border-[#C5D7E5]'
                              : 'bg-[#F9F3EB] text-[#7A5220] border-[#E3D1B4]'
                          }`}
                        >
                          {loggedPlayer.type}
                        </span>
                        <button
                          type="button"
                          onClick={handleDisconnectDevice}
                          className="text-[11px] text-[#5A6E82] hover:text-red-700 flex items-center gap-1"
                        >
                          <LogOut className="w-3 h-3" />
                          Trocar jogador
                        </button>
                      </div>
                    </div>

                    <div
                      className={`p-3 rounded-lg text-xs border ${
                        loggedPlayer.type === 'MENSALISTA'
                          ? 'bg-[#EBF2F7]/70 border-[#C5D7E5] text-[#142F47]'
                          : 'bg-[#F9F3EB] border-[#E3D1B4] text-[#7A5220]'
                      }`}
                    >
                      {loggedPlayer.type === 'MENSALISTA' ? (
                        <p>
                          <strong>Mensalista:</strong> Confirmação garante vaga direta na lista principal (respeitando o limite de vagas).
                        </p>
                      ) : (
                        <p>
                          <strong>Diarista (Avulso):</strong> Ao confirmar, seu nome entra automaticamente na <strong>Fila de Espera</strong> por ordem de chegada (Diária: R$ {matchConfig.dailyFee},00).
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#4A6075] uppercase tracking-wider">
                        1. Sua Presença na Pelada
                      </span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded text-[11px] border ${
                          loggedPlayer.attendance === 'CONFIRMADO'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : loggedPlayer.attendance === 'ESPERA'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        Status: {loggedPlayer.attendance}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => handleAttendanceAction(loggedPlayer.id, 'CONFIRMAR')}
                        disabled={loggedPlayer.attendance === 'CONFIRMADO' || loggedPlayer.attendance === 'ESPERA'}
                        className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition border ${
                          loggedPlayer.attendance === 'CONFIRMADO' || loggedPlayer.attendance === 'ESPERA'
                            ? 'bg-[#142F47] text-white border-[#142F47] cursor-default'
                            : 'bg-[#FAF8F4] hover:bg-[#142F47] hover:text-white text-[#142F47] border-[#DDD5C7]'
                        }`}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>
                          {loggedPlayer.attendance === 'CONFIRMADO'
                            ? 'Confirmado no Jogo'
                            : loggedPlayer.attendance === 'ESPERA'
                            ? 'Na Fila de Espera'
                            : 'Vou Jogar'}
                        </span>
                      </button>

                      <button
                        onClick={() => handleAttendanceAction(loggedPlayer.id, 'DESISTIR')}
                        disabled={loggedPlayer.attendance === 'FORA'}
                        className={`py-3 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition border ${
                          loggedPlayer.attendance === 'FORA'
                            ? 'bg-red-50 text-red-800 border-red-200 cursor-default'
                            : 'bg-[#FAF8F4] hover:bg-red-50 text-[#5A6E82] hover:text-red-800 border-[#DDD5C7]'
                        }`}
                      >
                        <X className="w-4 h-4" />
                        <span>{loggedPlayer.attendance === 'FORA' ? 'Ausente' : 'Não Vou / Desistir'}</span>
                      </button>
                    </div>
                  </div>

                  {matchConfig.isBbqDay && (
                    <div className="pt-4 border-t border-[#EAE3D5] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-[#7A5220] uppercase tracking-wider flex items-center gap-1.5">
                          <Flame className="w-4 h-4" />
                          2. Churrasco de Fim de Mês (+ R$ {matchConfig.bbqFee},00)
                        </span>
                        <span className="text-[11px] text-[#5A6E82]">
                          {bbqConfirmedList.length} confirmados
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => {
                            if (!loggedPlayer.bbqConfirmed) handleAttendanceAction(loggedPlayer.id, 'TOGGLE_BBQ');
                          }}
                          className={`py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition border ${
                            loggedPlayer.bbqConfirmed
                              ? 'bg-[#8C5E2A] text-white border-[#8C5E2A]'
                              : 'bg-[#FAF8F4] hover:bg-[#EAE3D5] text-[#4A6075] border-[#DDD5C7]'
                          }`}
                        >
                          <Flame className="w-4 h-4" />
                          <span>{loggedPlayer.bbqConfirmed ? 'Confirmado no Churrasco' : 'Vou pro Churrasco'}</span>
                        </button>

                        <button
                          onClick={() => {
                            if (loggedPlayer.bbqConfirmed) handleAttendanceAction(loggedPlayer.id, 'TOGGLE_BBQ');
                          }}
                          className={`py-2.5 px-4 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 transition border ${
                            !loggedPlayer.bbqConfirmed
                              ? 'bg-[#EBF2F7] text-[#142F47] border-[#C5D7E5]'
                              : 'bg-[#FAF8F4] text-[#5A6E82] border-[#DDD5C7]'
                          }`}
                        >
                          <span>Não vou no Churrasco</span>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}

              <div className="pt-4 border-t border-[#EAE3D5] flex items-center justify-between text-xs text-[#5A6E82]">
                <span>Linha: <strong className="text-[#142F47]">{confirmedOutfield.length}/{matchConfig.maxOutfield}</strong></span>
                <span>Fila de Espera: <strong className="text-[#142F47]">{waitingList.length}</strong></span>
                {matchConfig.isBbqDay && <span className="text-[#7A5220] font-semibold">Churrasco: {bbqConfirmedList.length}</span>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* =====================================================================
              VISÃO 2: PAINEL PRINCIPAL DO ADMINISTRADOR (PALETA RESENHA SÓBRIA)
             ===================================================================== */}
          <header className="sticky top-0 z-30 bg-[#142F47] text-[#F4F0E8] border-b border-[#0E2234] shadow-md">
            <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <img
                  src="/logo-resenha.jpg"
                  alt="Resenha - SESI, SENAI e Amigos"
                  className="w-12 h-12 rounded-full object-cover border-2 border-[#F4F0E8] shadow-sm"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-lg font-extrabold tracking-tight text-white">
                      RESENHA
                    </h1>
                    <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded bg-[#31688E] text-[#F4F0E8]">
                      SESI, SENAI e Amigos
                    </span>
                  </div>
                  <p className="text-xs text-[#9CC2DC]">{matchConfig.location}</p>
                </div>
              </div>

              <nav className="flex items-center gap-1 overflow-x-auto bg-[#0E2234] p-1 rounded-xl border border-[#244666] max-w-full">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const active = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                        active
                          ? 'bg-[#F4F0E8] text-[#142F47] shadow-sm'
                          : 'text-[#D3DFEA] hover:text-white hover:bg-[#142F47]'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                      {item.badge && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            active
                              ? 'bg-[#142F47] text-[#F4F0E8]'
                              : 'bg-[#1B3A56] text-[#9CC2DC]'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
            {/* ==========================================
                MÓDULO 1: AGENDA, MAGIC LINK & CHURRASCO
               ========================================== */}
            {activeTab === 'agenda' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DDD5C7] rounded-2xl p-6 shadow-sm">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#142F47] bg-[#EBF2F7] border border-[#C5D7E5] px-3 py-1 rounded-md">
                          <Calendar className="w-3.5 h-3.5 text-[#31688E]" />
                          <span>{matchConfig.date}</span>
                        </span>
                        {matchConfig.isBbqDay && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#7A5220] bg-[#F9F3EB] border border-[#E3D1B4] px-3 py-1 rounded-md">
                            <Flame className="w-3.5 h-3.5 text-[#8C5E2A]" />
                            <span>Churrasco de Fim de Mês • Cota R$ {matchConfig.bbqFee}</span>
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-[#142F47]">
                        Controle de Presença, Check-in por Ordem de Chegada & Churrasco
                      </h2>
                      <p className="text-xs text-[#5A6E82]">
                        Quem faz check-in recebe <code>arrival_order</code> para a estreia no Jogo #1. Se chegar atrasado com a pelada em andamento, o motor nivela automaticamente os jogos (`min - 1`).
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                      <button
                        onClick={() => {
                          setMatchConfig((prev) => ({ ...prev, isBbqDay: !prev.isBbqDay }));
                          showToast(
                            !matchConfig.isBbqDay
                              ? 'Churrasco de Fim de Mês ativado para esta lista.'
                              : 'Churrasco desativado para esta semana.'
                          );
                        }}
                        className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition ${
                          matchConfig.isBbqDay
                            ? 'bg-[#F9F3EB] text-[#7A5220] border-[#E3D1B4]'
                            : 'bg-[#FAF8F4] text-[#5A6E82] border-[#DDD5C7]'
                        }`}
                      >
                        <Flame className="w-4 h-4" />
                        <span>{matchConfig.isBbqDay ? 'Com Churrasco (Ativo)' : 'Sem Churrasco'}</span>
                      </button>

                      {matchConfig.windowMode === 'MENSALISTAS' ? (
                        <button
                          onClick={handleReleaseWaitingList}
                          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#EBF2F7] hover:bg-[#DCE9F2] text-[#142F47] border border-[#C5D7E5] text-xs font-semibold transition"
                        >
                          <Clock className="w-4 h-4 text-[#31688E]" />
                          <span>Liberar Vagas p/ Diaristas</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => setMatchConfig((prev) => ({ ...prev, windowMode: 'MENSALISTAS' }))}
                          className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] text-[#4A6075] border border-[#DDD5C7] text-xs font-semibold"
                        >
                          <span>Voltar p/ Exclusivo Mensalistas</span>
                        </button>
                      )}

                      <button
                        onClick={openWhatsAppList}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white font-semibold text-xs shadow-sm transition"
                      >
                        <Share2 className="w-4 h-4" />
                        <span>Exportar Lista p/ WhatsApp</span>
                      </button>
                    </div>
                  </div>

                  {/* Indicadores da Semana */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-5 border-t border-[#EAE3D5]">
                    <div className="bg-[#FAF8F4] p-4 rounded-xl border border-[#E2DBD0]">
                      <span className="text-xs text-[#5A6E82] font-medium block">Atletas de Linha Confirmados</span>
                      <span className="text-xl font-bold text-[#142F47] mt-0.5 block">
                        {confirmedOutfield.length} <span className="text-sm font-normal text-[#5A6E82]">/ {matchConfig.maxOutfield}</span>
                      </span>
                    </div>

                    <div className="bg-[#FAF8F4] p-4 rounded-xl border border-[#E2DBD0]">
                      <span className="text-xs text-[#5A6E82] font-medium block">Fila de Espera (Diaristas)</span>
                      <span className="text-xl font-bold text-[#31688E] mt-0.5 block">
                        {waitingList.length} <span className="text-sm font-normal text-[#5A6E82]">aguardando</span>
                      </span>
                    </div>

                    <div className="bg-[#FAF8F4] p-4 rounded-xl border border-[#E2DBD0]">
                      <span className="text-xs text-[#7A5220] font-medium block">Confirmados no Churrasco</span>
                      <span className="text-xl font-bold text-[#7A5220] mt-0.5 block">
                        {matchConfig.isBbqDay ? `${bbqConfirmedList.length} participantes` : 'Desativado'}
                      </span>
                    </div>

                    <div className="bg-[#EBF2F7]/60 p-4 rounded-xl border border-[#C5D7E5] flex items-center justify-between">
                      <div>
                        <span className="text-xs text-[#31688E] font-medium block">Check-in no Campo</span>
                        <span className="text-sm font-bold text-[#142F47] mt-0.5 block">
                          {players.filter((p) => p.attendance === 'CONFIRMADO' && p.checkedIn && p.position !== 'GOLEIRO').length} linha •{' '}
                          {confirmedGoalkeepers.filter((g) => g.checkedIn).length} goleiros
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setActiveTab('sorteio');
                        }}
                        className="px-3 py-2 rounded-lg bg-[#142F47] hover:bg-[#1D4060] text-white text-xs font-semibold transition"
                      >
                        Ver Quadros
                      </button>
                    </div>
                  </div>
                </div>

                {/* Colunas de Presença */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 pb-3 border-b border-[#EAE3D5]">
                        <h3 className="text-sm font-bold text-[#142F47] uppercase tracking-wider">
                          Confirmados ({confirmedOutfield.length} Linha + {confirmedGoalkeepers.length} Goleiros)
                        </h3>
                        <span className="text-xs text-[#5A6E82]">
                          Marque quem chegou no campo (gera Ordem de Chegada / nivela atrasados)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {[...confirmedGoalkeepers, ...confirmedOutfield].map((player) => (
                          <div
                            key={player.id}
                            className="p-3 rounded-xl bg-[#FAF8F4] border border-[#E2DBD0] flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-[11px] font-bold text-[#31688E] bg-[#EBF2F7] px-1.5 py-0.5 rounded border border-[#C5D7E5]"
                                  title="Ordem de Chegada"
                                >
                                  #{player.arrivalOrder}
                                </span>
                                <p className="text-sm font-semibold text-[#142F47] truncate">{player.name}</p>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${POSITION_LABELS[player.position].color}`}>
                                  {POSITION_LABELS[player.position].short}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-[#5A6E82] mt-0.5">
                                <span className={player.type === 'MENSALISTA' ? 'text-[#142F47] font-medium' : 'text-[#7A5220] font-medium'}>
                                  {player.type}
                                </span>
                                <span>•</span>
                                <span>Nota {calcWeightedScore(player)}</span>
                                <span>•</span>
                                <span>{player.matchesPlayedToday}J hoje</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {matchConfig.isBbqDay && (
                                <button
                                  onClick={() => handleAttendanceAction(player.id, 'TOGGLE_BBQ')}
                                  title="Confirmar/Tirar do Churrasco"
                                  className={`px-2 py-1 rounded-md text-[11px] font-semibold border transition ${
                                    player.bbqConfirmed
                                      ? 'bg-[#F9F3EB] text-[#7A5220] border-[#E3D1B4]'
                                      : 'bg-white text-[#8C9BA8] border-[#E2DBD0]'
                                  }`}
                                >
                                  🥩 {player.bbqConfirmed ? 'Sim' : 'Não'}
                                </button>
                              )}
                              <button
                                onClick={() => handleAttendanceAction(player.id, 'TOGGLE_CHECKIN')}
                                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border transition ${
                                  player.checkedIn
                                    ? 'bg-[#EBF2F7] text-[#142F47] border-[#B8D0E3]'
                                    : 'bg-white text-[#7A8B99] border-[#E2DBD0]'
                                }`}
                              >
                                {player.checkedIn ? 'No Campo' : 'Check-in'}
                              </button>
                              <button
                                onClick={() => handleAttendanceAction(player.id, 'DESISTIR')}
                                className="p-1 text-[#8C9BA8] hover:text-red-700"
                                title="Retirar da lista e promover próximo da espera"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Fila de Espera e Ausentes */}
                  <div className="space-y-5">
                    <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-[#7A5220] uppercase tracking-wider mb-3 pb-2.5 border-b border-[#EAE3D5]">
                        Fila de Espera ({waitingList.length})
                      </h3>
                      <div className="space-y-2">
                        {waitingList.length === 0 ? (
                          <p className="text-xs text-[#7A8B99] py-2">Nenhum jogador aguardando na fila.</p>
                        ) : (
                          waitingList.map((player, idx) => (
                            <div
                              key={player.id}
                              className="p-3 rounded-xl bg-[#FAF8F4] border border-[#E2DBD0] flex items-center justify-between gap-2"
                            >
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-[#7A5220]">{idx + 1}º</span>
                                  <p className="text-sm font-semibold text-[#142F47]">{player.name}</p>
                                </div>
                                <span className="text-[11px] text-[#5A6E82]">
                                  {player.type} • {POSITION_LABELS[player.position].short} • {player.confirmedAt}
                                </span>
                              </div>
                              <button
                                onClick={() => handleAttendanceAction(player.id, 'DESISTIR')}
                                className="text-xs text-red-700 hover:underline font-medium"
                              >
                                Remover
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm">
                      <h3 className="text-sm font-bold text-[#4A6075] uppercase tracking-wider mb-3 pb-2.5 border-b border-[#EAE3D5]">
                        Fora da Pelada ({absentList.length})
                      </h3>
                      <div className="space-y-2">
                        {absentList.map((player) => (
                          <div
                            key={player.id}
                            className="p-2.5 rounded-xl bg-[#FAF8F4] border border-[#E2DBD0] flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-semibold text-[#142F47]">{player.name}</p>
                              <span className="text-[10px] text-[#5A6E82]">{player.type}</span>
                            </div>
                            <button
                              onClick={() => handleAttendanceAction(player.id, 'CONFIRMAR')}
                              className="px-2.5 py-1 rounded-lg bg-[#EBF2F7] hover:bg-[#DCE9F2] text-[#142F47] border border-[#C5D7E5] text-xs font-semibold transition"
                            >
                              Incluir
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =================================================================
                MÓDULO 2: QUADRO 1 vs QUADRO 2 & ROTAÇÃO DINÂMICA (rotation-engine.ts)
               ================================================================= */}
            {activeTab === 'sorteio' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase bg-[#EBF2F7] text-[#142F47] border border-[#C5D7E5]">
                        Partida #{matchNumber} do Dia
                      </span>
                      <span className="text-xs text-[#5A6E82]">
                        Motor Oficial: Estreia por Chegada → Menos Jogos Hoje → Menos Seguidos → Tática & Fôlego
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-[#142F47]">
                      Quadro 1 vs Quadro 2 + Pool de Espera
                    </h2>
                    <p className="text-xs text-[#5A6E82]">
                      Suporta Vitória Q1/Q2, Empate (Saem Ambos ou Sai o Mais Antigo), Substituição/Repescagem de beira de campo e status <strong>Pulando Próxima</strong>.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <button
                      onClick={() => {
                        drawInitialMatchOfTheDay(true);
                        showToast('Contadores do dia zerados e Partida #1 reescalada.');
                      }}
                      className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-[#FAF8F4] hover:bg-[#EAE3D5] text-[#142F47] font-semibold text-xs border border-[#DDD5C7] transition"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Reiniciar 1º Jogo do Dia</span>
                    </button>

                    <button
                      onClick={openWhatsAppQuadros}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white font-semibold text-xs shadow-sm transition"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Copiar Escalação p/ WhatsApp</span>
                    </button>
                  </div>
                </div>

                {/* Banner Explicativo da Última Rotação */}
                {rotationExplanation && (
                  <div className="bg-[#EBF2F7] border border-[#B8D0E3] rounded-2xl p-4 flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-[#31688E] shrink-0 mt-0.5" />
                    <div className="text-xs space-y-1">
                      <h4 className="font-bold text-[#142F47] text-sm">{rotationExplanation.title}</h4>
                      <p className="text-[#2C4559] leading-relaxed">{rotationExplanation.details}</p>
                    </div>
                  </div>
                )}

                {/* PLACAR SÓBRIO EM AZUL MARINHO RESENHA */}
                <div className="bg-[#142F47] text-[#F4F0E8] border border-[#0E2234] rounded-2xl p-6 shadow-md">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
                    {/* Placar Quadro 1 */}
                    <div className="bg-[#0E2234] p-5 rounded-xl border border-[#244666] text-center space-y-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[#9CC2DC]">
                        Em Campo • Lado A
                      </span>
                      <h3 className="text-base font-bold text-white">QUADRO 1</h3>
                      <div className="text-4xl font-black text-white tabular-nums">{liveScore.score1}</div>
                      <button
                        onClick={() =>
                          setGoalModal({
                            open: true,
                            quadroNum: 1,
                            scorerId: quadro1[0] || '',
                            assistId: ''
                          })
                        }
                        className="w-full py-2.5 rounded-lg bg-[#31688E] hover:bg-[#3B79A3] text-white font-semibold text-xs transition"
                      >
                        + Registrar Gol (Quadro 1)
                      </button>
                    </div>

                    {/* Centro: Encerrar Partida & Rodar Fila */}
                    <div className="flex flex-col items-center justify-center text-center space-y-3 px-2">
                      <img
                        src="/logo-resenha.jpg"
                        alt="Escudo Resenha"
                        className="w-12 h-12 rounded-full border border-[#9CC2DC]/40"
                      />
                      <div className="px-3 py-1 rounded-full bg-[#0E2234] border border-[#244666] text-xs font-semibold text-[#9CC2DC]">
                        Partida #{matchNumber} em andamento
                      </div>
                      <p className="text-xs text-[#D3DFEA]">
                        Ao apito final, escolha o resultado (Vitória ou Empate) para rodar os quadros:
                      </p>
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
                        className="w-full py-3 px-4 rounded-xl bg-[#F4F0E8] hover:bg-white text-[#142F47] font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>Encerrar Partida & Rodar Quadros</span>
                      </button>
                    </div>

                    {/* Placar Quadro 2 */}
                    <div className="bg-[#0E2234] p-5 rounded-xl border border-[#244666] text-center space-y-3">
                      <span className="text-[11px] font-bold uppercase tracking-widest text-[#9CC2DC]">
                        Em Campo • Lado B
                      </span>
                      <h3 className="text-base font-bold text-white">QUADRO 2</h3>
                      <div className="text-4xl font-black text-white tabular-nums">{liveScore.score2}</div>
                      <button
                        onClick={() =>
                          setGoalModal({
                            open: true,
                            quadroNum: 2,
                            scorerId: quadro2[0] || '',
                            assistId: ''
                          })
                        }
                        className="w-full py-2.5 rounded-lg bg-[#31688E] hover:bg-[#3B79A3] text-white font-semibold text-xs transition"
                      >
                        + Registrar Gol (Quadro 2)
                      </button>
                    </div>
                  </div>
                </div>

                {/* VISUALIZAÇÃO DOS 3 BLOCOS: QUADRO 1 | QUADRO 2 | POOL DE ESPERA */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                  {[
                    { key: 'Q1', title: 'QUADRO 1 (Em Campo)', ids: quadro1, headerBg: 'bg-[#142F47] text-white' },
                    { key: 'Q2', title: 'QUADRO 2 (Em Campo)', ids: quadro2, headerBg: 'bg-[#31688E] text-white' },
                    { key: 'BENCH', title: 'POOL DE ESPERA (Próximos)', ids: benchQueue, headerBg: 'bg-[#EAE3D5] text-[#142F47]' }
                  ].map((group) => {
                    const groupPlayers = group.ids.map((id) => players.find((p) => p.id === id)).filter(Boolean);
                    const avgScore = (
                      groupPlayers.reduce((acc, p) => acc + calcWeightedScore(p), 0) / (groupPlayers.length || 1)
                    ).toFixed(2);
                    const avgStamina = (
                      groupPlayers.reduce((acc, p) => acc + p.stamina, 0) / (groupPlayers.length || 1)
                    ).toFixed(2);

                    return (
                      <div
                        key={group.key}
                        className="bg-white border border-[#DDD5C7] rounded-2xl overflow-hidden shadow-sm flex flex-col justify-between"
                      >
                        <div>
                          <div className={`${group.headerBg} px-4 py-3 flex items-center justify-between`}>
                            <div>
                              <span className="text-xs font-bold uppercase tracking-wider block">
                                {group.title}
                              </span>
                              <span className="text-[11px] opacity-80">
                                {groupPlayers.length} jogadores de linha
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] uppercase opacity-75 block">Média / Fôlego</span>
                              <span className="text-xs font-bold">
                                Nota {avgScore} • Fôlego {avgStamina}
                              </span>
                            </div>
                          </div>

                          <div className="p-4 space-y-2">
                            {groupPlayers.map((player, idx) => {
                              const isSelected = selectedSwap?.playerId === player.id;
                              const wasPickedToComplete =
                                player.wasDrawnToComplete || rotationExplanation?.completedIds?.includes(player.id);
                              const isRookie = player.matchesPlayedToday === 0;

                              return (
                                <div
                                  key={player.id}
                                  className={`p-2.5 rounded-xl border transition space-y-2 ${
                                    isSelected
                                      ? 'bg-[#EBF2F7] border-[#142F47] ring-2 ring-[#31688E]/30'
                                      : wasPickedToComplete
                                      ? 'bg-[#F9F3EB] border-[#D8C09D]'
                                      : 'bg-[#FAF8F4] border-[#E2DBD0]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2">
                                    <div
                                      onClick={() => handleManualSwap(group.key, player.id)}
                                      className="flex items-center gap-2 min-w-0 cursor-pointer flex-1"
                                      title="Clique em dois jogadores de blocos diferentes para permutar manualmente"
                                    >
                                      {group.key === 'BENCH' && (
                                        <span className="text-[11px] font-bold text-[#7A5220]">{idx + 1}º</span>
                                      )}
                                      <span
                                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${POSITION_LABELS[player.position].color}`}
                                      >
                                        {POSITION_LABELS[player.position].short}
                                      </span>
                                      <div className="min-w-0">
                                        <p className="text-sm font-semibold text-[#142F47] truncate">{player.name}</p>
                                        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#5A6E82]">
                                          <span>Chegada #{player.arrivalOrder}</span>
                                          {isRookie && (
                                            <span className="font-bold text-[#31688E]">• Estreante (0J)</span>
                                          )}
                                          {wasPickedToComplete && group.key !== 'BENCH' && (
                                            <span className="text-[#7A5220] font-bold">
                                              • Completou quadro ({player.consecutiveGames}º seg.)
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0 text-xs">
                                      <span
                                        className="px-2 py-0.5 rounded bg-white border border-[#DDD5C7] font-semibold text-[#142F47]"
                                        title="Total de partidas jogadas hoje"
                                      >
                                        {player.matchesPlayedToday}J
                                      </span>
                                      <span className="font-bold text-[#31688E]">
                                        {calcWeightedScore(player)}
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
                                          className="p-1.5 rounded-lg bg-white hover:bg-[#EBF2F7] text-[#31688E] border border-[#DDD5C7]"
                                          title="Substituir / Repescar outro jogador (Cansou, Machucou ou Foi Embora)"
                                        >
                                          <UserMinus className="w-3.5 h-3.5" />
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
                                          className={`text-[10px] font-bold px-2 py-1 rounded-md border ${
                                            AVAILABILITY_LABELS[player.availability || 'ATIVO'].badge
                                          }`}
                                          title="Disponibilidade para o próximo sorteio"
                                        >
                                          <option value="ATIVO">Ativo</option>
                                          <option value="PULANDO_PROXIMA">Pular 1 Jogo</option>
                                          <option value="PAUSADO">Pausado/Obs</option>
                                          <option value="FOI_EMBORA">Foi Embora</option>
                                        </select>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ==========================================
                MÓDULO 3: CADASTRO DE JOGADORES
               ========================================== */}
            {activeTab === 'jogadores' && (
              <div className="space-y-6">
                <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-[#142F47]">Elenco & Critérios Técnicos</h2>
                    <p className="text-xs text-[#5A6E82]">
                      Notas de Técnica, Fôlego e Velocidade utilizadas para equilibrar os sorteios da Resenha.
                    </p>
                  </div>
                  <button
                    onClick={() => setPlayerModal({ open: true, editingPlayer: null })}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white font-semibold text-xs transition"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Cadastrar Jogador</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {players.map((player) => (
                    <div
                      key={player.id}
                      className="bg-white border border-[#DDD5C7] rounded-2xl p-4 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="text-base font-bold text-[#142F47]">{player.name}</h3>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${POSITION_LABELS[player.position].color}`}>
                                {POSITION_LABELS[player.position].short}
                              </span>
                            </div>
                            <span className="text-xs text-[#5A6E82] block mt-0.5">
                              {player.type} • WhatsApp: {player.phone}
                            </span>
                          </div>
                          <div className="bg-[#EBF2F7] px-2.5 py-1.5 rounded-xl border border-[#C5D7E5] text-center">
                            <span className="text-[10px] text-[#31688E] font-medium block">Score</span>
                            <span className="text-sm font-black text-[#142F47]">{calcWeightedScore(player)}</span>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#EAE3D5] text-center text-xs">
                          <div className="bg-[#FAF8F4] p-2 rounded-lg border border-[#EAE3D5]">
                            <span className="text-[#5A6E82] block text-[10px]">Técnica</span>
                            <span className="font-bold text-[#142F47]">{player.overall.toFixed(1)}</span>
                          </div>
                          <div className="bg-[#FAF8F4] p-2 rounded-lg border border-[#EAE3D5]">
                            <span className="text-[#5A6E82] block text-[10px]">Fôlego</span>
                            <span className="font-bold text-[#31688E]">{player.stamina.toFixed(1)}</span>
                          </div>
                          <div className="bg-[#FAF8F4] p-2 rounded-lg border border-[#EAE3D5]">
                            <span className="text-[#5A6E82] block text-[10px]">Velocidade</span>
                            <span className="font-bold text-[#7A5220]">{player.speed.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#EAE3D5] text-xs">
                        <span className="text-[#5A6E82]">
                          Hoje: <strong className="text-[#142F47]">{player.matchesPlayedToday}J</strong> • Temporada: {player.stats.goals}G / {player.stats.assists}A
                        </span>
                        <button
                          onClick={() => setPlayerModal({ open: true, editingPlayer: player })}
                          className="text-[#31688E] hover:text-[#142F47] font-semibold flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ==========================================
                MÓDULO 4: ESTATÍSTICAS
               ========================================== */}
            {activeTab === 'estatisticas' && (
              <div className="bg-white border border-[#DDD5C7] rounded-2xl overflow-hidden shadow-sm">
                <div className="p-5 border-b border-[#EAE3D5] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[#142F47]">Ranking de Artilharia, Assistências e Presenças</h3>
                    <p className="text-xs text-[#5A6E82]">Histórico consolidado do grupo Resenha SESI, SENAI e Amigos.</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs">
                    {[
                      { key: 'goals', label: 'Gols' },
                      { key: 'assists', label: 'Assistências' },
                      { key: 'games', label: 'Jogos' }
                    ].map((btn) => (
                      <button
                        key={btn.key}
                        onClick={() => setStatsSort(btn.key)}
                        className={`px-3 py-1.5 rounded-lg font-semibold border transition ${
                          statsSort === btn.key
                            ? 'bg-[#142F47] text-white border-[#142F47]'
                            : 'bg-[#FAF8F4] text-[#5A6E82] border-[#DDD5C7]'
                        }`}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAF8F4] text-[#4A6075] uppercase border-b border-[#EAE3D5]">
                        <th className="py-3.5 px-4">#</th>
                        <th className="py-3.5 px-4">Atleta</th>
                        <th className="py-3.5 px-4 text-center">Jogos Hoje</th>
                        <th className="py-3.5 px-4 text-center">Jogos no Ano</th>
                        <th className="py-3.5 px-4 text-center">Gols</th>
                        <th className="py-3.5 px-4 text-center">Assist.</th>
                        <th className="py-3.5 px-4 text-center">Vitórias</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE3D5]">
                      {[...players]
                        .sort((a, b) => b.stats[statsSort] - a.stats[statsSort])
                        .map((p, idx) => (
                          <tr key={p.id} className="hover:bg-[#FAF8F4]">
                            <td className="py-3 px-4 font-bold text-[#7A8B99]">{idx + 1}º</td>
                            <td className="py-3 px-4 font-semibold text-[#142F47]">{p.name}</td>
                            <td className="py-3 px-4 text-center font-bold text-[#31688E]">{p.matchesPlayedToday}</td>
                            <td className="py-3 px-4 text-center text-[#4A6075]">{p.stats.games}</td>
                            <td className="py-3 px-4 text-center font-bold text-[#142F47] text-sm">{p.stats.goals}</td>
                            <td className="py-3 px-4 text-center font-bold text-[#31688E] text-sm">{p.stats.assists}</td>
                            <td className="py-3 px-4 text-center text-[#4A6075]">{p.stats.wins}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* =================================================================
                MÓDULO 5: FINANCEIRO SEPARADO (CAIXA DA PELADA vs CAIXA DO CHURRASCO)
               ================================================================= */}
            {activeTab === 'financeiro' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                  <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#EBF2F7] text-[#142F47] border border-[#C5D7E5]">
                          ⚽ Caixa Oficial da Pelada
                        </span>
                        <h3 className="text-lg font-bold text-[#142F47] mt-1.5">Mensalidades, Diárias & Campo</h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#5A6E82] block">Saldo Pelada</span>
                        <span className="text-2xl font-black text-[#142F47] tabular-nums">
                          R$ {financialSummary.peladaBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-[#FAF8F4] p-3 rounded-xl border border-[#E2DBD0]">
                        <span className="text-[#5A6E82] block">Entradas</span>
                        <span className="font-bold text-[#142F47]">R$ {financialSummary.totalPeladaIncome.toFixed(2)}</span>
                      </div>
                      <div className="bg-[#FAF8F4] p-3 rounded-xl border border-[#E2DBD0]">
                        <span className="text-[#5A6E82] block">Despesas</span>
                        <span className="font-bold text-red-700">R$ {financialSummary.peladaExpenses.toFixed(2)}</span>
                      </div>
                      <div className="bg-[#FAF8F4] p-3 rounded-xl border border-[#E2DBD0]">
                        <span className="text-[#5A6E82] block">Pendentes</span>
                        <span className="font-bold text-[#7A5220]">R$ {financialSummary.pendingMonthlyAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded bg-[#F9F3EB] text-[#7A5220] border border-[#E3D1B4]">
                          🥩 Caixa Separado do Churrasco
                        </span>
                        <h3 className="text-lg font-bold text-[#142F47] mt-1.5">
                          Cotas Fim de Mês (R$ {matchConfig.bbqFee}/atleta)
                        </h3>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-[#5A6E82] block">Saldo Churrasco</span>
                        <span className="text-2xl font-black text-[#7A5220] tabular-nums">
                          R$ {financialSummary.bbqBalance.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2.5 text-xs">
                      <div className="bg-[#FAF8F4] p-3 rounded-xl border border-[#E2DBD0]">
                        <span className="text-[#5A6E82] block">Arrecadado ({financialSummary.bbqPaidCount})</span>
                        <span className="font-bold text-[#142F47]">R$ {financialSummary.totalBbqIncome.toFixed(2)}</span>
                      </div>
                      <div className="bg-[#FAF8F4] p-3 rounded-xl border border-[#E2DBD0]">
                        <span className="text-[#5A6E82] block">Compras</span>
                        <span className="font-bold text-red-700">R$ {financialSummary.bbqExpenses.toFixed(2)}</span>
                      </div>
                      <div className="bg-[#FAF8F4] p-3 rounded-xl border border-[#E2DBD0]">
                        <span className="text-[#5A6E82] block">Em Aberto ({financialSummary.bbqPendingCount})</span>
                        <span className="font-bold text-[#7A5220]">R$ {financialSummary.bbqPendingAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#DDD5C7] rounded-2xl p-4 shadow-sm">
                  <span className="text-xs text-[#5A6E82]">
                    Clique nos botões de cada atleta abaixo para alternar o status de pagamento da Pelada e do Churrasco:
                  </span>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={() => setExpenseModal(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF8F4] hover:bg-[#EAE3D5] text-[#142F47] border border-[#DDD5C7] text-xs font-semibold transition"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Novo Lançamento</span>
                    </button>
                    <button
                      onClick={openWhatsAppFinance}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white text-xs font-semibold transition"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Exportar Prestação p/ WhatsApp</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-[#142F47] uppercase tracking-wider mb-3 pb-2.5 border-b border-[#EAE3D5]">
                      Situação Individual (Pelada vs Churrasco)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {players.map((p) => {
                        const gameFee = p.type === 'MENSALISTA' ? matchConfig.monthlyFee : matchConfig.dailyFee;
                        const isGamePaid = p.financialStatus === 'EM_DIA';
                        return (
                          <div
                            key={p.id}
                            className="p-3 rounded-xl bg-[#FAF8F4] border border-[#E2DBD0] flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-[#142F47] truncate">{p.name}</p>
                              <span className="text-[10px] text-[#5A6E82]">
                                {p.type} (R$ {gameFee}) {p.bbqConfirmed ? `• Churrasco (R$ ${matchConfig.bbqFee})` : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                onClick={() => {
                                  setPlayers((prev) =>
                                    prev.map((item) =>
                                      item.id === p.id
                                        ? { ...item, financialStatus: isGamePaid ? 'PENDENTE' : 'EM_DIA' }
                                        : item
                                    )
                                  );
                                }}
                                className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                                  isGamePaid
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                    : 'bg-red-50 text-red-800 border-red-200'
                                }`}
                              >
                                ⚽ {isGamePaid ? 'Pago' : 'Pend.'}
                              </button>

                              {p.bbqConfirmed && (
                                <button
                                  onClick={() => {
                                    setPlayers((prev) =>
                                      prev.map((item) =>
                                        item.id === p.id ? { ...item, bbqPaid: !item.bbqPaid } : item
                                      )
                                    );
                                  }}
                                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold border ${
                                    p.bbqPaid
                                      ? 'bg-[#F9F3EB] text-[#7A5220] border-[#E3D1B4]'
                                      : 'bg-red-50 text-red-800 border-red-200'
                                  }`}
                                >
                                  🥩 {p.bbqPaid ? 'Pago' : 'Pend.'}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm">
                    <h4 className="text-sm font-bold text-[#142F47] uppercase tracking-wider mb-3 pb-2.5 border-b border-[#EAE3D5]">
                      Livro Caixa
                    </h4>
                    <div className="space-y-2.5">
                      {transactions.map((tx) => (
                        <div
                          key={tx.id}
                          className="p-3 rounded-xl bg-[#FAF8F4] border border-[#E2DBD0] flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-xs font-semibold text-[#142F47]">{tx.description}</p>
                            <span className="text-[10px] text-[#5A6E82]">
                              {tx.category === 'CHURRASCO' ? '🥩 CHURRASCO' : `⚽ ${tx.category}`} • {tx.date}
                            </span>
                          </div>
                          <span
                            className={`text-xs font-bold tabular-nums ${
                              tx.type === 'RECEITA' ? 'text-emerald-700' : 'text-red-700'
                            }`}
                          >
                            {tx.type === 'RECEITA' ? '+' : '-'} R$ {tx.amount.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* MODAL PARA ENCERRAR PARTIDA E RODAR QUADROS (COM AS 4 OPÇÕES DE DESFECHO DO MOTOR) */}
      {endMatchModal.open && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD5C7] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-base font-bold text-[#142F47]">
                Encerrar Partida #{matchNumber} & Rodar Quadros
              </h3>
              <button
                onClick={() => setEndMatchModal({ open: false, outcome: 'QUADRO_1_WINS' })}
                className="text-[#5A6E82] hover:text-[#142F47]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-[#4A6075] leading-relaxed">
              Selecione o desfecho da partida. O motor oficial priorizará estreantes por ordem de chegada e depois menor nº de jogos hoje + menor sequência seguida:
            </p>

            <div className="grid grid-cols-1 gap-2.5 pt-1">
              <button
                onClick={() => setEndMatchModal({ open: true, outcome: 'QUADRO_1_WINS' })}
                className={`p-3 rounded-xl font-bold border text-left transition flex items-center justify-between ${
                  endMatchModal.outcome === 'QUADRO_1_WINS'
                    ? 'bg-[#142F47] border-[#142F47] text-white'
                    : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#142F47]'
                }`}
              >
                <span>1. Vitória do Quadro 1 (Q1 permanece em campo)</span>
                <span className="text-xs opacity-80">{liveScore.score1} x {liveScore.score2}</span>
              </button>

              <button
                onClick={() => setEndMatchModal({ open: true, outcome: 'QUADRO_2_WINS' })}
                className={`p-3 rounded-xl font-bold border text-left transition flex items-center justify-between ${
                  endMatchModal.outcome === 'QUADRO_2_WINS'
                    ? 'bg-[#31688E] border-[#31688E] text-white'
                    : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#142F47]'
                }`}
              >
                <span>2. Vitória do Quadro 2 (Q2 permanece em campo)</span>
                <span className="text-xs opacity-80">{liveScore.score1} x {liveScore.score2}</span>
              </button>

              <button
                onClick={() => setEndMatchModal({ open: true, outcome: 'DRAW_OLDEST_LEAVES' })}
                className={`p-3 rounded-xl font-bold border text-left transition ${
                  endMatchModal.outcome === 'DRAW_OLDEST_LEAVES'
                    ? 'bg-[#142F47] border-[#142F47] text-white'
                    : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#142F47]'
                }`}
              >
                3. Empate • Sai o Quadro Mais Antigo (Fica quem entrou por último)
              </button>

              <button
                onClick={() => setEndMatchModal({ open: true, outcome: 'DRAW_BOTH_LEAVE' })}
                className={`p-3 rounded-xl font-bold border text-left transition ${
                  endMatchModal.outcome === 'DRAW_BOTH_LEAVE'
                    ? 'bg-[#8C5E2A] border-[#8C5E2A] text-white'
                    : 'bg-[#FAF8F4] border-[#DDD5C7] text-[#7A5220]'
                }`}
              >
                4. Empate • Saem os Dois Quadros (Renova 12 vagas equilibradas)
              </button>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE3D5]">
              <button
                onClick={() => setEndMatchModal({ open: false, outcome: 'QUADRO_1_WINS' })}
                className="px-4 py-2 rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleRotateAfterMatch(endMatchModal.outcome)}
                className="px-4 py-2 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white font-bold"
              >
                Confirmar & Rodar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE SUBSTITUIÇÃO / REPESCAGEM IMEDIATA (replaceSinglePlayerInQuadro) */}
      {replaceModal.open && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD5C7] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-base font-bold text-[#142F47]">
                Substituir / Repescar Atleta ({replaceModal.group === 'Q1' ? 'Quadro 1' : 'Quadro 2'})
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
                className="text-[#5A6E82] hover:text-[#142F47]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-[#FAF8F4] border border-[#EAE3D5]">
                <span className="text-[#5A6E82] block">Saindo do quadro:</span>
                <strong className="text-sm text-[#142F47]">
                  {players.find((p) => p.id === replaceModal.playerLeavingId)?.name}
                </strong>
              </div>

              <div>
                <label className="text-[#4A6075] font-semibold block mb-1">Motivo da Saída</label>
                <select
                  value={replaceModal.reason}
                  onChange={(e) =>
                    setReplaceModal((prev) => ({
                      ...prev,
                      reason: e.target.value as 'PULANDO_PROXIMA' | 'PAUSADO' | 'FOI_EMBORA'
                    }))
                  }
                  className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2.5 text-[#142F47] font-semibold"
                >
                  <option value="PULANDO_PROXIMA">Cansou / Passou a vez (Pula este jogo e volta p/ Ativo)</option>
                  <option value="PAUSADO">Machucou / Em observação (Pausado)</option>
                  <option value="FOI_EMBORA">Encerrou participação hoje (Foi Embora)</option>
                </select>
              </div>

              <div>
                <label className="text-[#4A6075] font-semibold block mb-1">
                  Quem entra no lugar?
                </label>
                <select
                  value={replaceModal.manualSubstituteId}
                  onChange={(e) =>
                    setReplaceModal((prev) => ({ ...prev, manualSubstituteId: e.target.value }))
                  }
                  className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2.5 text-[#142F47]"
                >
                  <option value="">⚡ Repescagem Automática (Prioridade + Mesma Posição)</option>
                  {benchQueue
                    .map((id) => players.find((p) => p.id === id))
                    .filter((p) => p && p.availability === 'ATIVO')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        Escolher manual: {p.name} ({POSITION_LABELS[p.position].short} • {p.matchesPlayedToday}J)
                      </option>
                    ))}
                </select>
              </div>

              <label className="flex items-center gap-2 pt-1 cursor-pointer text-[#4A6075]">
                <input
                  type="checkbox"
                  checked={replaceModal.countMatchForLeavingPlayer}
                  onChange={(e) =>
                    setReplaceModal((prev) => ({
                      ...prev,
                      countMatchForLeavingPlayer: e.target.checked
                    }))
                  }
                  className="rounded border-[#DDD5C7]"
                />
                <span>Manter +1 jogo na conta de quem está saindo (desmarque se saiu antes de jogar)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE3D5]">
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
                className="px-4 py-2 rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmSingleReplacement}
                className="px-4 py-2 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white font-bold"
              >
                Confirmar Substituição
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA REGISTRAR GOL DIRETO */}
      {goalModal.open && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD5C7] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs">
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-base font-bold text-[#142F47]">
                Registrar Gol • Quadro {goalModal.quadroNum}
              </h3>
              <button
                onClick={() => setGoalModal({ open: false, quadroNum: 1, scorerId: '', assistId: '' })}
                className="text-[#5A6E82] hover:text-[#142F47]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[#4A6075] block mb-1 font-semibold">Autor do Gol *</label>
                <select
                  value={goalModal.scorerId}
                  onChange={(e) => setGoalModal((prev) => ({ ...prev, scorerId: e.target.value }))}
                  className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2.5 text-[#142F47] font-semibold"
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
                <label className="text-[#4A6075] block mb-1 font-semibold">Assistência (Opcional)</label>
                <select
                  value={goalModal.assistId}
                  onChange={(e) => setGoalModal((prev) => ({ ...prev, assistId: e.target.value }))}
                  className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2.5 text-[#142F47]"
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

            <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE3D5]">
              <button
                onClick={() => setGoalModal({ open: false, quadroNum: 1, scorerId: '', assistId: '' })}
                className="px-4 py-2 rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmGoal}
                className="px-4 py-2 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white font-bold"
              >
                Confirmar Gol
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL WHATSAPP */}
      {whatsappModal.open && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#DDD5C7] rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-base font-bold text-[#142F47]">{whatsappModal.title}</h3>
              <button
                onClick={() => setWhatsappModal({ open: false, title: '', text: '' })}
                className="text-[#5A6E82] hover:text-[#142F47]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              readOnly
              value={whatsappModal.text}
              rows={13}
              className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl p-3.5 text-xs font-mono text-[#142F47] focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setWhatsappModal({ open: false, title: '', text: '' })}
                className="px-4 py-2 rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] text-xs font-semibold"
              >
                Fechar
              </button>
              <button
                onClick={copyToClipboard}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white text-xs font-bold"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copiado!' : 'Copiar p/ WhatsApp'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CADASTRO JOGADOR */}
      {playerModal.open && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSavePlayer}
            className="bg-white border border-[#DDD5C7] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-base font-bold text-[#142F47]">
                {playerModal.editingPlayer ? 'Editar Jogador' : 'Novo Jogador'}
              </h3>
              <button
                type="button"
                onClick={() => setPlayerModal({ open: false, editingPlayer: null })}
                className="text-[#5A6E82] hover:text-[#142F47]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[#4A6075] font-semibold block mb-1">Nome / Apelido *</label>
                <input
                  name="name"
                  required
                  defaultValue={playerModal.editingPlayer?.name || ''}
                  className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                />
              </div>
              <div>
                <label className="text-[#4A6075] font-semibold block mb-1">WhatsApp (com DDD) *</label>
                <input
                  name="phone"
                  required
                  defaultValue={playerModal.editingPlayer?.phone || '21999990000'}
                  className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#4A6075] font-semibold block mb-1">Posição</label>
                  <select
                    name="position"
                    defaultValue={playerModal.editingPlayer?.position || 'MEIO_CAMPO'}
                    className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                  >
                    <option value="GOLEIRO">Goleiro</option>
                    <option value="ZAGUEIRO">Zagueiro</option>
                    <option value="LATERAL">Lateral / Ala</option>
                    <option value="MEIO_CAMPO">Meio-Campo</option>
                    <option value="ATACANTE">Atacante</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#4A6075] font-semibold block mb-1">Vínculo</label>
                  <select
                    name="type"
                    defaultValue={playerModal.editingPlayer?.type || 'MENSALISTA'}
                    className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                  >
                    <option value="MENSALISTA">Mensalista</option>
                    <option value="DIARISTA">Diarista</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[#4A6075] font-semibold block mb-1">Técnica (1-5)</label>
                  <input
                    name="overall"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    defaultValue={playerModal.editingPlayer?.overall || 4.0}
                    className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                  />
                </div>
                <div>
                  <label className="text-[#4A6075] font-semibold block mb-1">Fôlego (1-5)</label>
                  <input
                    name="stamina"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    defaultValue={playerModal.editingPlayer?.stamina || 4.0}
                    className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                  />
                </div>
                <div>
                  <label className="text-[#4A6075] font-semibold block mb-1">Veloc. (1-5)</label>
                  <input
                    name="speed"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    defaultValue={playerModal.editingPlayer?.speed || 4.0}
                    className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[#4A6075] font-semibold block mb-1">Status Financeiro</label>
                <select
                  name="financialStatus"
                  defaultValue={playerModal.editingPlayer?.financialStatus || 'EM_DIA'}
                  className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                >
                  <option value="EM_DIA">Em Dia</option>
                  <option value="PENDENTE">Pendente</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE3D5]">
              <button
                type="button"
                onClick={() => setPlayerModal({ open: false, editingPlayer: null })}
                className="px-4 py-2 rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white font-bold"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL LANÇAMENTO FINANCEIRO */}
      {expenseModal && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleAddTransaction}
            className="bg-white border border-[#DDD5C7] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl text-xs"
          >
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-base font-bold text-[#142F47]">Novo Lançamento Financeiro</h3>
              <button
                type="button"
                onClick={() => setExpenseModal(false)}
                className="text-[#5A6E82] hover:text-[#142F47]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[#4A6075] font-semibold block mb-1">Descrição *</label>
                <input
                  name="description"
                  required
                  placeholder="Ex: Carnes + Carvão + Gelo"
                  className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#4A6075] font-semibold block mb-1">Valor (R$) *</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                  />
                </div>
                <div>
                  <label className="text-[#4A6075] font-semibold block mb-1">Tipo</label>
                  <select
                    name="type"
                    className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                  >
                    <option value="DESPESA">Saída (Despesa)</option>
                    <option value="RECEITA">Entrada (Receita)</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[#4A6075] font-semibold block mb-1">Caixa de Destino</label>
                <select
                  name="category"
                  className="w-full bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 py-2 text-[#142F47]"
                >
                  <option value="CHURRASCO">🥩 Caixa do Churrasco</option>
                  <option value="CAMPO">⚽ Caixa Pelada (Aluguel Campo)</option>
                  <option value="MATERIAL">⚽ Caixa Pelada (Material/Bolas)</option>
                  <option value="DIARIA">⚽ Caixa Pelada (Diárias Avulsas)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-3 border-t border-[#EAE3D5]">
              <button
                type="button"
                onClick={() => setExpenseModal(false)}
                className="px-4 py-2 rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] font-semibold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#142F47] hover:bg-[#1D4060] text-white font-bold"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
