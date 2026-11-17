import { PlayerPosition, SessionAttendance } from '@/types/database';

export type DayAvailability =
  | 'ATIVO'            // Disponível normalmente para sorteio/rotação
  | 'PULANDO_PROXIMA'  // Cansado / pediu para pular 1 partida (volta p/ ATIVO após rodar)
  | 'PAUSADO'          // Machucado em observação / fora até segunda ordem
  | 'FOI_EMBORA';      // Encerrou a participação no dia

export type MatchOutcome =
  | 'QUADRO_1_WINS'
  | 'QUADRO_2_WINS'
  | 'DRAW_BOTH_LEAVE'
  | 'DRAW_OLDEST_LEAVES';

export interface LivePlayerState extends SessionAttendance {
  availability: DayAvailability;
  consecutive_games: number;
  arrival_order: number;
  was_drawn_to_complete?: boolean;
}

const POSITION_ORDER: Record<PlayerPosition, number> = {
  GOLEIRO: 0,
  ZAGUEIRO: 1,
  LATERAL: 2,
  MEIO_CAMPO: 3,
  ATACANTE: 4,
};

// ============================================================================
// FUNÇÕES AUXILIARES INTERNAS
// ============================================================================

/**
 * Calcula a média de skill_score de uma lista de jogadores
 */
function calculateAverageSkill(players: LivePlayerState[]): number {
  if (players.length === 0) return 3.0;
  const sum = players.reduce((acc, p) => acc + (p.player?.skill_score ?? 3.0), 0);
  return sum / players.length;
}

/**
 * Divide um grupo de 2*N jogadores em dois quadros equilibrados (Quadro 1 e Quadro 2)
 * usando Snake Draft (Zigue-Zague) por Posição e Skill Score.
 */
export function splitIntoBalancedQuadros(
  pool: LivePlayerState[],
  playersPerTeam: number = 6
): { quadro1: LivePlayerState[]; quadro2: LivePlayerState[] } {
  const sorted = [...pool].sort((a, b) => {
    const posA = a.player ? POSITION_ORDER[a.player.position] : 99;
    const posB = b.player ? POSITION_ORDER[b.player.position] : 99;
    if (posA !== posB) return posA - posB;

    // Pequeno jitter aleatório (+/- 0.15) para não gerar sempre os mesmos times em empates
    const scoreA = (a.player?.skill_score ?? 3) + (Math.random() * 0.3 - 0.15);
    const scoreB = (b.player?.skill_score ?? 3) + (Math.random() * 0.3 - 0.15);
    return scoreB - scoreA;
  });

  const quadro1: LivePlayerState[] = [];
  const quadro2: LivePlayerState[] = [];

  sorted.slice(0, playersPerTeam * 2).forEach((att, idx) => {
    const pairIndex = Math.floor(idx / 2);
    const isEvenRow = pairIndex % 2 === 0;
    if ((idx % 2 === 0 && isEvenRow) || (idx % 2 !== 0 && !isEvenRow)) {
      quadro1.push(att);
    } else {
      quadro2.push(att);
    }
  });

  return { quadro1, quadro2 };
}

/**
 * MOTOR CENTRAL DE PRIORIDADE (RANQUEAMENTO DE CANDIDATOS)
 * Regra Oficial:
 *  1º Estreantes (matches_played_today === 0) -> Ordem de Chegada (arrival_order ASC)
 *  2º Pós-estreia (Ordem de chegada não vale mais) -> Menor nº de jogos no dia (matches_played_today ASC)
 *  3º Menor desgaste seguido (consecutive_games ASC -> quem estava fora [0] ganha de quem acabou de sair [1], que ganha de quem dobrou [2])
 *  4º Encaixe Tático (Posição carente no quadro + Equilíbrio de Skill vs Adversário + Fôlego + Sorteio)
 */
export function rankCandidatesForSpot(params: {
  candidates: LivePlayerState[];
  currentTeamMembers?: LivePlayerState[];
  opponentTeamMembers?: LivePlayerState[];
  preferredPosition?: PlayerPosition;
}): LivePlayerState[] {
  const {
    candidates,
    currentTeamMembers = [],
    opponentTeamMembers = [],
    preferredPosition,
  } = params;

  // Filtra apenas jogadores de linha que estão ATIVOS no momento
  const eligible = candidates.filter(
    (c) => c.availability === 'ATIVO' && c.player?.position !== 'GOLEIRO'
  );

  const existingPositions = new Set(
    currentTeamMembers.map((m) => m.player?.position).filter(Boolean)
  );

  const avgOpponentSkill = calculateAverageSkill(opponentTeamMembers);
  const avgCurrentSkill = calculateAverageSkill(currentTeamMembers);
  const needsHigherSkill =
    opponentTeamMembers.length > 0 ? avgCurrentSkill < avgOpponentSkill : true;

  // Pré-calcula o score tático + sorteio de cada candidato ANTES do sort
  // para garantir ordenação determinística e consistente durante a comparação
  const tacticalScores = new Map<string, number>();

  for (const cand of eligible) {
    let pts = 0;
    const pos = cand.player?.position;
    const skill = cand.player?.skill_score ?? 3;
    const stamina = cand.player?.stamina ?? 3;

    // Bônus se estamos substituindo alguém da mesma posição específica
    if (preferredPosition && pos === preferredPosition) {
      pts += 3.0;
    } else if (pos && !existingPositions.has(pos)) {
      // Bônus se a posição ainda não existe no quadro que está entrando
      pts += 2.5;
    }

    // Bônus de nivelamento técnico contra o quadro adversário
    pts += needsHigherSkill ? skill * 0.4 : (6 - skill) * 0.4;

    // Bônus por fôlego (especialmente importante para quem vai emendar partida)
    pts += stamina * 0.35;

    // Fator sorteio controlado para desempatar jogadores idênticos
    pts += Math.random() * 1.25;

    tacticalScores.set(cand.player_id, pts);
  }

  return [...eligible].sort((a, b) => {
    // 1º CRITÉRIO: Estreantes no dia (0 jogos) respeitam estritamente a Ordem de Chegada
    const aIsRookie = a.matches_played_today === 0;
    const bIsRookie = b.matches_played_today === 0;

    if (aIsRookie && bIsRookie) {
      return a.arrival_order - b.arrival_order;
    }
    if (aIsRookie) return -1;
    if (bIsRookie) return 1;

    // 2º CRITÉRIO: Menor quantidade de jogos acumulados no dia
    if (a.matches_played_today !== b.matches_played_today) {
      return a.matches_played_today - b.matches_played_today;
    }

    // 3º CRITÉRIO: Menor sequência de jogos seguidos (0 = descansado fora, 1 = 1 jogo em campo, 2 = dobrou)
    if (a.consecutive_games !== b.consecutive_games) {
      return a.consecutive_games - b.consecutive_games;
    }

    // 4º CRITÉRIO: Encaixe Tático + Fôlego + Sorteio
    const scoreA = tacticalScores.get(a.player_id) ?? 0;
    const scoreB = tacticalScores.get(b.player_id) ?? 0;
    return scoreB - scoreA;
  });
}

// ============================================================================
// 1. ABERTURA DA PELADA (PARTIDA #1 DO DIA)
// ============================================================================

/**
 * Monta o Jogo #1 do dia:
 * - Os primeiros (2 * playersPerTeam) por Ordem de Chegada entram em campo.
 * - Eles são divididos de forma equilibrada entre Quadro 1 e Quadro 2 (Snake Draft).
 * - Os demais ficam no Pool de Espera aguardando estreia.
 */
export function generateInitialQuadros(
  presentAttendances: LivePlayerState[],
  playersPerTeam: number = 6
) {
  const activeLinePlayers = presentAttendances
    .filter((a) => a.availability === 'ATIVO' && a.player?.position !== 'GOLEIRO')
    .sort((a, b) => a.arrival_order - b.arrival_order);

  const inactiveOrSkipped = presentAttendances.filter(
    (a) => a.availability !== 'ATIVO' && a.player?.position !== 'GOLEIRO'
  );

  const firstMatchPool = activeLinePlayers.slice(0, playersPerTeam * 2);
  const remainingPool = activeLinePlayers.slice(playersPerTeam * 2);

  const { quadro1, quadro2 } = splitIntoBalancedQuadros(firstMatchPool, playersPerTeam);

  const incrementStarter = (p: LivePlayerState): LivePlayerState => ({
    ...p,
    matches_played_today: p.matches_played_today + 1,
    consecutive_games: 1,
    was_drawn_to_complete: false,
    current_slot: 'QUADRO_1',
  });

  return {
    quadro1: quadro1.map((p) => ({ ...incrementStarter(p), current_slot: 'QUADRO_1' as const })),
    quadro2: quadro2.map((p) => ({ ...incrementStarter(p), current_slot: 'QUADRO_2' as const })),
    waitingPool: [
      ...remainingPool.map((p) => ({
        ...p,
        consecutive_games: 0,
        was_drawn_to_complete: false,
        current_slot: 'FILA_PROXIMOS' as const,
      })),
      ...inactiveOrSkipped,
    ],
  };
}

// ============================================================================
// 2. ROTAÇÃO DINÂMICA ENTRE PARTIDAS (VITÓRIA OU EMPATE)
// ============================================================================

/**
 * Executa a rotação completa ao final de uma partida:
 * - Trata Vitória do Quadro 1, Vitória do Quadro 2, Empate (Saem Ambos) ou Empate (Sai o Mais Antigo).
 * - Prioriza estreantes por ordem de chegada e, depois, aplica a regra de menor nº de jogos + tática.
 * - Quem estava com status 'PULANDO_PROXIMA' fica fora deste sorteio e já volta automaticamente
 *   para 'ATIVO' no Pool de Espera para poder jogar a partida seguinte.
 */
export function rotateQuadrosAfterMatch(params: {
  quadro1: LivePlayerState[];
  quadro2: LivePlayerState[];
  waitingPool: LivePlayerState[];
  outcome: MatchOutcome;
  playersPerTeam?: number;
}) {
  const { quadro1, quadro2, waitingPool, outcome, playersPerTeam = 6 } = params;

  // Normaliza o resultado caso seja 'DRAW_OLDEST_LEAVES' (descobre qual quadro está há mais tempo em campo)
  let effectiveOutcome = outcome;
  if (outcome === 'DRAW_OLDEST_LEAVES') {
    const avgConsecutiveQ1 =
      quadro1.reduce((acc, p) => acc + p.consecutive_games, 0) / (quadro1.length || 1);
    const avgConsecutiveQ2 =
      quadro2.reduce((acc, p) => acc + p.consecutive_games, 0) / (quadro2.length || 1);

    if (avgConsecutiveQ1 > avgConsecutiveQ2) {
      effectiveOutcome = 'QUADRO_2_WINS'; // Q1 é mais antigo -> Q1 sai, Q2 fica
    } else if (avgConsecutiveQ2 > avgConsecutiveQ1) {
      effectiveOutcome = 'QUADRO_1_WINS'; // Q2 é mais antigo -> Q2 sai, Q1 fica
    } else {
      // Mesma antiguidade: sorteio 50/50 de quem fica
      effectiveOutcome = Math.random() < 0.5 ? 'QUADRO_1_WINS' : 'QUADRO_2_WINS';
    }
  }

  // --------------------------------------------------------------------------
  // CASO A: HOUVE UM QUADRO QUE PERMANECE EM CAMPO (VITÓRIA Q1 OU VITÓRIA Q2)
  // --------------------------------------------------------------------------
  if (effectiveOutcome === 'QUADRO_1_WINS' || effectiveOutcome === 'QUADRO_2_WINS') {
    const rawStaying = effectiveOutcome === 'QUADRO_1_WINS' ? quadro1 : quadro2;
    const rawLeaving = effectiveOutcome === 'QUADRO_1_WINS' ? quadro2 : quadro1;

    // Se alguém do time vencedor pediu para sair/pular ou foi embora no intervalo, abre vaga no Quadro 1 também
    const stayingActive = rawStaying.filter((p) => p.availability === 'ATIVO');
    const stayingSteppedOut = rawStaying.filter((p) => p.availability !== 'ATIVO');

    // Pool de candidatos disponíveis:
    // - waitingPool tem consecutive_games = 0 (descansados fora)
    // - rawLeaving mantém seu consecutive_games atual (>= 1) para que os descansados tenham prioridade!
    const restedPool = waitingPool.map((p) => ({ ...p, consecutive_games: 0 }));
    const allCandidates = [...restedPool, ...rawLeaving];

    // 1. Se o próprio time vencedor perdeu alguém (machucou/cansou), repõe primeiro no Quadro 1
    const spotsNeededInStaying = Math.max(0, playersPerTeam - stayingActive.length);
    const filledStaying: LivePlayerState[] = [...stayingActive];

    for (let i = 0; i < spotsNeededInStaying; i++) {
      const rankedForStaying = rankCandidatesForSpot({
        candidates: allCandidates.filter(
          (c) => !filledStaying.some((s) => s.player_id === c.player_id)
        ),
        currentTeamMembers: filledStaying,
        opponentTeamMembers: [],
      });
      if (rankedForStaying[0]) {
        filledStaying.push(rankedForStaying[0]);
      }
    }

    // 2. Monta o Novo Quadro 2 vaga por vaga (para atualizar as posições carentes a cada escolha!)
    const newQuadro2Selected: LivePlayerState[] = [];
    for (let i = 0; i < playersPerTeam; i++) {
      const remainingCandidates = allCandidates.filter(
        (c) =>
          !filledStaying.some((s) => s.player_id === c.player_id) &&
          !newQuadro2Selected.some((n) => n.player_id === c.player_id)
      );

      const ranked = rankCandidatesForSpot({
        candidates: remainingCandidates,
        currentTeamMembers: newQuadro2Selected,
        opponentTeamMembers: filledStaying,
      });

      if (ranked[0]) {
        newQuadro2Selected.push(ranked[0]);
      }
    }

    const leavingIds = new Set(rawLeaving.map((p) => p.player_id));
    const drawnFromLeavingIds = newQuadro2Selected
      .filter((p) => leavingIds.has(p.player_id))
      .map((p) => p.player_id);

    // Atualiza contadores de quem vai jogar a nova partida
    const finalQuadro1: LivePlayerState[] = filledStaying.map((p) => {
      const wasAlreadyInStaying = stayingActive.some((s) => s.player_id === p.player_id);
      return {
        ...p,
        matches_played_today: p.matches_played_today + 1,
        consecutive_games: wasAlreadyInStaying ? p.consecutive_games + 1 : p.consecutive_games + 1,
        was_drawn_to_complete: !wasAlreadyInStaying && leavingIds.has(p.player_id),
        current_slot: 'QUADRO_1',
      };
    });

    const finalQuadro2: LivePlayerState[] = newQuadro2Selected.map((p) => ({
      ...p,
      matches_played_today: p.matches_played_today + 1,
      consecutive_games: leavingIds.has(p.player_id) ? p.consecutive_games + 1 : 1,
      was_drawn_to_complete: leavingIds.has(p.player_id),
      current_slot: 'QUADRO_2',
    }));

    // Quem não entrou em Q1 nem em Q2 vai para o Pool de Espera
    const inFieldIds = new Set([
      ...finalQuadro1.map((p) => p.player_id),
      ...finalQuadro2.map((p) => p.player_id),
    ]);

    const finalWaitingPool: LivePlayerState[] = [...allCandidates, ...stayingSteppedOut]
      .filter((p) => !inFieldIds.has(p.player_id))
      .map((p) => ({
        ...p,
        // Quem pediu 'PULANDO_PROXIMA' já cumpriu o descanso neste sorteio e volta a ficar 'ATIVO' para a próxima!
        availability: p.availability === 'PULANDO_PROXIMA' ? 'ATIVO' : p.availability,
        consecutive_games: 0,
        was_drawn_to_complete: false,
        current_slot: 'FILA_PROXIMOS',
      }));

    return {
      newQuadro1: finalQuadro1,
      newQuadro2: finalQuadro2,
      newWaitingPool: finalWaitingPool,
      drawnPlayerIds: drawnFromLeavingIds,
    };
  }

  // --------------------------------------------------------------------------
  // CASO B: EMPATE ONDE SAEM OS DOIS QUADROS ('DRAW_BOTH_LEAVE')
  // Precisamos de (2 * playersPerTeam) atletas (ex: 12 vagas) e depois dividimos em Q1 e Q2 equilibrados
  // --------------------------------------------------------------------------
  const totalSpotsNeeded = playersPerTeam * 2;
  const restedPool = waitingPool.map((p) => ({ ...p, consecutive_games: 0 }));
  const leavingBoth = [...quadro1, ...quadro2];
  const leavingIds = new Set(leavingBoth.map((p) => p.player_id));

  const allCandidates = [...restedPool, ...leavingBoth];
  const selectedForNextMatch: LivePlayerState[] = [];

  for (let i = 0; i < totalSpotsNeeded; i++) {
    const remaining = allCandidates.filter(
      (c) => !selectedForNextMatch.some((s) => s.player_id === c.player_id)
    );
    const ranked = rankCandidatesForSpot({
      candidates: remaining,
      currentTeamMembers: selectedForNextMatch,
      opponentTeamMembers: [],
    });
    if (ranked[0]) {
      selectedForNextMatch.push(ranked[0]);
    }
  }

  const drawnFromLeavingIds = selectedForNextMatch
    .filter((p) => leavingIds.has(p.player_id))
    .map((p) => p.player_id);

  // Divide os 12 selecionados em Novo Quadro 1 e Novo Quadro 2 equilibrados por posição e nota
  const { quadro1: balancedQ1, quadro2: balancedQ2 } = splitIntoBalancedQuadros(
    selectedForNextMatch,
    playersPerTeam
  );

  const formatEnteringAfterDraw = (
    list: LivePlayerState[],
    slot: 'QUADRO_1' | 'QUADRO_2'
  ): LivePlayerState[] =>
    list.map((p) => ({
      ...p,
      matches_played_today: p.matches_played_today + 1,
      consecutive_games: leavingIds.has(p.player_id) ? p.consecutive_games + 1 : 1,
      was_drawn_to_complete: leavingIds.has(p.player_id),
      current_slot: slot,
    }));

  const finalQuadro1 = formatEnteringAfterDraw(balancedQ1, 'QUADRO_1');
  const finalQuadro2 = formatEnteringAfterDraw(balancedQ2, 'QUADRO_2');

  const inFieldIds = new Set([
    ...finalQuadro1.map((p) => p.player_id),
    ...finalQuadro2.map((p) => p.player_id),
  ]);

  const finalWaitingPool: LivePlayerState[] = allCandidates
    .filter((p) => !inFieldIds.has(p.player_id))
    .map((p) => ({
      ...p,
      availability: p.availability === 'PULANDO_PROXIMA' ? 'ATIVO' : p.availability,
      consecutive_games: 0,
      was_drawn_to_complete: false,
      current_slot: 'FILA_PROXIMOS',
    }));

  return {
    newQuadro1: finalQuadro1,
    newQuadro2: finalQuadro2,
    newWaitingPool: finalWaitingPool,
    drawnPlayerIds: drawnFromLeavingIds,
  };
}

// ============================================================================
// 3. EXCEÇÕES DE BEIRA DE CAMPO: SUBSTITUIÇÃO / REPESCAGEM / ATRASADOS
// ============================================================================

/**
 * SUBSTITUIÇÃO IMEDIATA (REPESCAGEM AUTOMÁTICA OU MANUAL)
 * Usada quando:
 *  - Um jogador sorteado para completar o quadro diz que está cansado e passa a vez.
 *  - Alguém se machuca ou precisa ir embora antes/durante a partida.
 */
export function replaceSinglePlayerInQuadro(params: {
  playerLeavingId: string;
  reason: 'PULANDO_PROXIMA' | 'PAUSADO' | 'FOI_EMBORA';
  countMatchForLeavingPlayer: boolean; // Se saiu aos 1 min machucado, pode ser false para não somar 1 jogo injusto
  targetQuadro: LivePlayerState[];
  opponentQuadro: LivePlayerState[];
  waitingPool: LivePlayerState[];
  manualSubstituteId?: string; // Opcional: se o Admin quiser escolher manualmente quem entra
}) {
  const {
    playerLeavingId,
    reason,
    countMatchForLeavingPlayer,
    targetQuadro,
    opponentQuadro,
    waitingPool,
    manualSubstituteId,
  } = params;

  const playerLeaving = targetQuadro.find((p) => p.player_id === playerLeavingId);
  if (!playerLeaving) {
    return {
      updatedQuadro: targetQuadro,
      updatedPool: waitingPool,
      substituteChosen: null,
    };
  }

  const remainingQuadro = targetQuadro.filter((p) => p.player_id !== playerLeavingId);

  let chosenSub: LivePlayerState | null = null;

  if (manualSubstituteId) {
    chosenSub = waitingPool.find((p) => p.player_id === manualSubstituteId) ?? null;
  } else {
    const rankedSubstitutes = rankCandidatesForSpot({
      candidates: waitingPool,
      currentTeamMembers: remainingQuadro,
      opponentTeamMembers: opponentQuadro,
      preferredPosition: playerLeaving.player?.position,
    });
    chosenSub = rankedSubstitutes[0] ?? null;
  }

  const targetSlot = playerLeaving.current_slot;

  const updatedQuadro: LivePlayerState[] = chosenSub
    ? [
      ...remainingQuadro,
      {
        ...chosenSub,
        matches_played_today: chosenSub.matches_played_today + 1,
        consecutive_games: 1,
        was_drawn_to_complete: true,
        current_slot: targetSlot,
      },
    ]
    : remainingQuadro;

  const updatedLeavingPlayer: LivePlayerState = {
    ...playerLeaving,
    availability: reason,
    matches_played_today: countMatchForLeavingPlayer
      ? playerLeaving.matches_played_today
      : Math.max(0, playerLeaving.matches_played_today - 1),
    consecutive_games: 0,
    was_drawn_to_complete: false,
    current_slot: 'FILA_PROXIMOS',
  };

  const updatedPool: LivePlayerState[] = [
    ...waitingPool.filter((p) => p.player_id !== chosenSub?.player_id),
    updatedLeavingPlayer,
  ];

  return {
    updatedQuadro,
    updatedPool,
    substituteChosen: chosenSub,
  };
}

/**
 * ALTERAÇÃO RÁPIDA DE STATUS NO POOL DE ESPERA
 * Ex: Jogador fora avisa "Pula a minha vez na próxima" ou "Tô indo embora".
 */
export function setPlayerAvailabilityInPool(
  waitingPool: LivePlayerState[],
  playerId: string,
  newAvailability: DayAvailability
): LivePlayerState[] {
  return waitingPool.map((p) =>
    p.player_id === playerId ? { ...p, availability: newAvailability } : p
  );
}

/**
 * CHECK-IN DE JOGADOR ATRASADO (LATE ARRIVAL)
 * Quando um jogador chega com a pelada já no 3º ou 4º jogo:
 * - Ele entra com 0 jogos hoje se ainda estivermos na 1ª rodada de estreia,
 *   OU recebe (mínimo de jogos dos ativos - 1) para estrear logo na próxima partida,
 *   mas sem ficar com 0 absoluto caso a pelada já esteja no Jogo #5 (o que faria ele jogar 4 seguidas sozinho).
 */
export function normalizeLateArrivalPlayer(
  latePlayer: LivePlayerState,
  allActivePlayersInSession: LivePlayerState[]
): LivePlayerState {
  const activeCounts = allActivePlayersInSession
    .filter((p) => p.availability !== 'FOI_EMBORA')
    .map((p) => p.matches_played_today);

  const minMatchesPlayed = activeCounts.length > 0 ? Math.min(...activeCounts) : 0;
  const maxOrder = allActivePlayersInSession.reduce(
    (max, p) => Math.max(max, p.arrival_order || 0),
    0
  );

  return {
    ...latePlayer,
    checked_in: true,
    availability: 'ATIVO',
    // Garante que ele tenha prioridade na próxima partida, mas já nivelado com o piso da turma
    matches_played_today: Math.max(0, minMatchesPlayed - 1),
    consecutive_games: 0,
    arrival_order: maxOrder + 1,
    current_slot: 'FILA_PROXIMOS',
  };
}