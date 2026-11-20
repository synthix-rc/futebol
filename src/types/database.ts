export type PlayerType = 'MENSALISTA' | 'DIARISTA';
export type PlayerPosition = 'GOLEIRO' | 'ZAGUEIRO' | 'LATERAL' | 'MEIO_CAMPO' | 'ATACANTE';
export type AttendanceStatus = 'CONFIRMADO' | 'LISTA_ESPERA' | 'AUSENTE';
export type BbqStatus = 'VAI' | 'NAO_VAI' | 'PENDENTE';
export type PlayerDayAvailability =
  | 'ATIVO'
  | 'PULANDO_PROXIMA'
  | 'PAUSADO'
  | 'FOI_EMBORA';

export type FinancialCategory =
  | 'MENSALIDADE'
  | 'DIARIA'
  | 'COTA_CHURRASCO'
  | 'DESPESA_CAMPO'
  | 'DESPESA_MATERIAL'
  | 'DESPESA_CHURRASCO';

export interface Player {
  id: string;
  name: string;
  phone: string;
  birth_date?: string;
  pin_code?: string;
  type: PlayerType;
  position: PlayerPosition;
  overall_rating: number;
  stamina: number;
  speed: number;
  skill_score: number;
  is_active: boolean;
}

export interface PeladaSession {
  id: string;
  session_date: string;
  start_time: string;
  location: string;
  magic_link_token: string;
  max_line_players: number;
  players_per_team: number;
  daily_fee: number;
  is_bbq_day: boolean;
  bbq_fee: number;
  diaristas_released: boolean;
  status: 'ABERTA' | 'EM_ANDAMENTO' | 'FINALIZADA' | 'CANCELADA';
}

export interface SessionAttendance {
  id: string;
  session_id: string;
  player_id: string;
  status: AttendanceStatus;
  bbq_attendance: BbqStatus;
  checked_in: boolean;
  matches_played_today: number;
  availability: PlayerDayAvailability;
  consecutive_games: number;
  arrival_order: number;
  current_slot: 'QUADRO_1' | 'QUADRO_2' | 'FILA_PROXIMOS' | 'BANCO';
  confirmed_at: string;
  player?: Player;
}
