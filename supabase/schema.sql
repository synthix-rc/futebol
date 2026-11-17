-- ============================================================================
-- PELADAPRO SOCIETY MANAGER - SCHEMA SQL COMPLETO (SUPABASE / POSTGRESQL)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ENUMS
DO $$ BEGIN
  CREATE TYPE player_type AS ENUM ('MENSALISTA', 'DIARISTA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE player_position AS ENUM ('GOLEIRO', 'ZAGUEIRO', 'LATERAL', 'MEIO_CAMPO', 'ATACANTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM ('CONFIRMADO', 'LISTA_ESPERA', 'AUSENTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bbq_status AS ENUM ('VAI', 'NAO_VAI', 'PENDENTE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE session_status AS ENUM ('ABERTA', 'EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE slot_type AS ENUM ('QUADRO_1', 'QUADRO_2', 'FILA_PROXIMOS', 'BANCO');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE player_day_availability AS ENUM (
    'ATIVO',            -- Disponível normalmente
    'PULANDO_PROXIMA',  -- Descansando 1 jogo (volta para ATIVO após o sorteio)
    'PAUSADO',          -- Machucado em observação / fora por tempo indeterminado
    'FOI_EMBORA'        -- Saiu da pelada mais cedo
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE financial_category AS ENUM (
    'MENSALIDADE',
    'DIARIA',
    'COTA_CHURRASCO',
    'DESPESA_CAMPO',
    'DESPESA_MATERIAL',
    'DESPESA_CHURRASCO'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. TABELA DE JOGADORES
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  pin_code VARCHAR(4),
  type player_type NOT NULL DEFAULT 'MENSALISTA',
  position player_position NOT NULL DEFAULT 'MEIO_CAMPO',
  overall_rating NUMERIC(3,2) NOT NULL DEFAULT 3.50 CHECK (overall_rating >= 1 AND overall_rating <= 5),
  stamina NUMERIC(3,2) NOT NULL DEFAULT 3.50 CHECK (stamina >= 1 AND stamina <= 5),
  speed NUMERIC(3,2) NOT NULL DEFAULT 3.50 CHECK (speed >= 1 AND speed <= 5),
  skill_score NUMERIC(4,2) GENERATED ALWAYS AS (
    ROUND((overall_rating * 0.50) + (stamina * 0.30) + (speed * 0.20), 2)
  ) STORED,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABELA DE SESSÕES DA PELADA (SEMANA + MAGIC LINK + CHURRASCO)
CREATE TABLE IF NOT EXISTS pelada_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_date DATE NOT NULL,
  start_time TIME NOT NULL DEFAULT '09:30:00',
  location TEXT NOT NULL DEFAULT 'Arena Society Rio',
  magic_link_token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  max_line_players INT NOT NULL DEFAULT 18,
  players_per_team INT NOT NULL DEFAULT 6,
  daily_fee NUMERIC(10,2) NOT NULL DEFAULT 35.00,
  is_bbq_day BOOLEAN NOT NULL DEFAULT FALSE,
  bbq_fee NUMERIC(10,2) NOT NULL DEFAULT 45.00,
  diaristas_released BOOLEAN NOT NULL DEFAULT FALSE,
  status session_status NOT NULL DEFAULT 'ABERTA',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. PRESENÇAS NA SESSÃO E CONTROLE DE QUADROS (QUADRO 1, QUADRO 2, FILA)
CREATE TABLE IF NOT EXISTS session_attendances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES pelada_sessions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status attendance_status NOT NULL DEFAULT 'CONFIRMADO',
  bbq_attendance bbq_status NOT NULL DEFAULT 'PENDENTE',
  checked_in BOOLEAN NOT NULL DEFAULT FALSE,
  matches_played_today INT NOT NULL DEFAULT 0,
  availability player_day_availability NOT NULL DEFAULT 'ATIVO',
  consecutive_games SMALLINT NOT NULL DEFAULT 0,
  arrival_order SERIAL,
  current_slot slot_type NOT NULL DEFAULT 'BANCO',
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (session_id, player_id)
);

-- 5. PARTIDAS DO DIA (HISTÓRICO DE QUADRO 1 VS QUADRO 2)
CREATE TABLE IF NOT EXISTS session_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID NOT NULL REFERENCES pelada_sessions(id) ON DELETE CASCADE,
  match_number INT NOT NULL,
  score_quadro_1 INT NOT NULL DEFAULT 0,
  score_quadro_2 INT NOT NULL DEFAULT 0,
  staying_quadro TEXT CHECK (staying_quadro IN ('QUADRO_1', 'QUADRO_2')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. EVENTOS DE PARTIDA (GOLS E ASSISTÊNCIAS SEM CRONÔMETRO OBRIGATÓRIO)
CREATE TABLE IF NOT EXISTS match_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES session_matches(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES pelada_sessions(id) ON DELETE CASCADE,
  scorer_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  assist_id UUID REFERENCES players(id) ON DELETE SET NULL,
  quadro slot_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. TRANSAÇÕES FINANCEIRAS (CAIXA DA PELADA VS CAIXA DO CHURRASCO SEPARADOS)
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES pelada_sessions(id) ON DELETE SET NULL,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  category financial_category NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT TRUE,
  transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. RPC: CONFIRMAÇÃO AUTOMÁTICA VIA MAGIC LINK
-- Valida os 4 últimos dígitos do WhatsApp (ou PIN) e separa Mensalistas vs Diaristas
CREATE OR REPLACE FUNCTION confirm_attendance_via_magic_link(
  p_magic_token TEXT,
  p_player_id UUID,
  p_going_to_game BOOLEAN,
  p_going_to_bbq BOOLEAN,
  p_phone_last4 TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session pelada_sessions%ROWTYPE;
  v_player players%ROWTYPE;
  v_clean_phone TEXT;
  v_confirmed_line_count INT;
  v_assigned_status attendance_status;
  v_bbq_status bbq_status;
BEGIN
  SELECT * INTO v_session
  FROM pelada_sessions
  WHERE magic_link_token = p_magic_token AND status = 'ABERTA';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Sessão não encontrada ou encerrada.';
  END IF;

  SELECT * INTO v_player
  FROM players
  WHERE id = p_player_id AND is_active = TRUE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Jogador não encontrado ou inativo.';
  END IF;

  v_clean_phone := regexp_replace(v_player.phone, '\D', '', 'g');
  IF p_phone_last4 IS NOT NULL AND length(trim(p_phone_last4)) > 0 THEN
    IF RIGHT(v_clean_phone, 4) <> trim(p_phone_last4)
       AND COALESCE(v_player.pin_code, '') <> trim(p_phone_last4) THEN
      RAISE EXCEPTION 'Os 4 últimos dígitos do WhatsApp não conferem para este jogador.';
    END IF;
  END IF;

  v_bbq_status := CASE WHEN p_going_to_bbq THEN 'VAI'::bbq_status ELSE 'NAO_VAI'::bbq_status END;

  IF NOT p_going_to_game THEN
    v_assigned_status := 'AUSENTE';
  ELSE
    SELECT COUNT(*) INTO v_confirmed_line_count
    FROM session_attendances sa
    JOIN players pl ON pl.id = sa.player_id
    WHERE sa.session_id = v_session.id
      AND sa.status = 'CONFIRMADO'
      AND pl.position <> 'GOLEIRO'
      AND sa.player_id <> p_player_id;

    IF v_player.type = 'DIARISTA' AND NOT v_session.diaristas_released THEN
      v_assigned_status := 'LISTA_ESPERA';
    ELSIF v_player.position <> 'GOLEIRO' AND v_confirmed_line_count >= v_session.max_line_players THEN
      v_assigned_status := 'LISTA_ESPERA';
    ELSE
      v_assigned_status := 'CONFIRMADO';
    END IF;
  END IF;

  INSERT INTO session_attendances (
    session_id,
    player_id,
    status,
    bbq_attendance,
    confirmed_at
  )
  VALUES (
    v_session.id,
    p_player_id,
    v_assigned_status,
    v_bbq_status,
    NOW()
  )
  ON CONFLICT (session_id, player_id)
  DO UPDATE SET
    status = EXCLUDED.status,
    bbq_attendance = EXCLUDED.bbq_attendance,
    confirmed_at = NOW();

  RETURN jsonb_build_object(
    'session_id', v_session.id,
    'player_id', v_player.id,
    'player_type', v_player.type,
    'assigned_status', v_assigned_status,
    'bbq_attendance', v_bbq_status
  );
END;
$$;
