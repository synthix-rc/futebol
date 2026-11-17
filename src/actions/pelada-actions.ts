'use server';

import { supabase } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function confirmViaMagicLinkAction(formData: {
  magicToken: string;
  playerId: string;
  goingToGame: boolean;
  goingToBbq: boolean;
  phoneLast4?: string;
}) {
  const { data, error } = await supabase.rpc('confirm_attendance_via_magic_link', {
    p_magic_token: formData.magicToken,
    p_player_id: formData.playerId,
    p_going_to_game: formData.goingToGame,
    p_going_to_bbq: formData.goingToBbq,
    p_phone_last4: formData.phoneLast4 || null,
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath(`/convite/${formData.magicToken}`);
  revalidatePath('/');
  return data;
}

export async function createPeladaSessionAction(payload: {
  session_date: string;
  location: string;
  max_line_players: number;
  players_per_team: number;
  daily_fee: number;
  is_bbq_day: boolean;
  bbq_fee: number;
}) {
  const { data, error } = await supabase
    .from('pelada_sessions')
    .insert([payload])
    .select()
    .single();

  if (error) throw new Error(error.message);
  revalidatePath('/');
  return data;
}
