"use client";

import { useState, useTransition } from "react";
import { approvePlayer, updatePlayerProfile } from "@/app/actions/players";
import type { PlayerStatus, PlayerType } from "@/types/supabase";
import { PlayerAvatar } from "../PlayerAvatar";
import { CopyMagicLinkButton } from "./CopyMagicLinkButton";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export type PlayerHeaderData = {
  id: string;
  name: string;
  type: PlayerType | null;
  status: PlayerStatus;
  photoUrl: string | null;
  phone: string | null;
  email: string | null;
  birthDay: number | null;
  birthMonth: number | null;
};

function formatBirthday(day: number | null, month: number | null): string {
  if (!day || !month) return "—";
  return `${day} de ${MONTHS[month - 1]}`;
}

export function PlayerHeader({ player }: { player: PlayerHeaderData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [type, setType] = useState<PlayerType>(player.type ?? "diarista");
  const [phone, setPhone] = useState(player.phone ?? "");
  const [email, setEmail] = useState(player.email ?? "");
  const [birthDay, setBirthDay] = useState(player.birthDay ? String(player.birthDay) : "");
  const [birthMonth, setBirthMonth] = useState(
    player.birthMonth ? String(player.birthMonth) : "",
  );

  const [isSaving, startSaveTransition] = useTransition();
  const [isApproving, startApproveTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startSaveTransition(async () => {
      const result = await updatePlayerProfile(player.id, {
        name,
        type,
        phone,
        email: email || null,
        birthDay: birthDay ? Number(birthDay) : null,
        birthMonth: birthMonth ? Number(birthMonth) : null,
      });
      if (!result.success) {
        setError(result.message ?? "Erro ao salvar.");
        return;
      }
      setIsEditing(false);
    });
  }

  function handleApprove() {
    setError(null);
    startApproveTransition(async () => {
      const result = await approvePlayer(player.id);
      if (!result.success) {
        setError(result.message ?? "Erro ao aprovar.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-foreground/10 bg-card p-6">
      <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:items-start sm:text-left">
        <PlayerAvatar photoUrl={player.photoUrl} name={player.name} size="lg" />
        <div className="flex flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <h1 className="text-xl font-bold">{player.name}</h1>
            <StatusBadge status={player.status} />
            <CopyMagicLinkButton playerId={player.id} />
          </div>
          <p className="text-sm text-foreground/60">
            {player.type === "mensalista" ? "Mensalista" : "Diarista"}
          </p>
          <div className="mt-1 flex flex-col gap-0.5 text-sm text-foreground/70">
            <span>📱 {player.phone || "Sem WhatsApp cadastrado"}</span>
            <span>✉️ {player.email || "Sem e-mail"}</span>
            <span>🎂 {formatBirthday(player.birthDay, player.birthMonth)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {player.status === "pending" && (
          <button
            type="button"
            disabled={isApproving}
            onClick={handleApprove}
            className="min-h-11 rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isApproving ? "Aprovando…" : "✅ Aprovar Jogador"}
          </button>
        )}
        <button
          type="button"
          onClick={() => setIsEditing((prev) => !prev)}
          className="min-h-11 rounded-md border border-foreground/20 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-foreground/5"
        >
          {isEditing ? "Cancelar edição" : "✏️ Editar Perfil"}
        </button>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      {isEditing && (
        <form onSubmit={handleSave} className="flex flex-col gap-4 border-t border-foreground/10 pt-4">
          <label className="flex flex-col gap-1 text-sm">
            Nome
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            Tipo
            <select
              value={type}
              onChange={(event) => setType(event.target.value as PlayerType)}
              className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            >
              <option value="mensalista">Mensalista</option>
              <option value="diarista">Diarista</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            WhatsApp
            <input
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              inputMode="tel"
              className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              inputMode="email"
              className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={birthDay}
              onChange={(event) => setBirthDay(event.target.value)}
              className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            >
              <option value="">Dia</option>
              {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
            <select
              value={birthMonth}
              onChange={(event) => setBirthMonth(event.target.value)}
              className="min-h-11 rounded-md border border-foreground/20 bg-background px-3 py-2 text-sm"
            >
              <option value="">Mês</option>
              {MONTHS.map((month, index) => (
                <option key={month} value={index + 1}>
                  {month}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSaving ? "Salvando…" : "Salvar Perfil"}
          </button>
        </form>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: PlayerStatus }) {
  if (status === "pending") {
    return (
      <span className="whitespace-nowrap rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
        ⏳ Pendente
      </span>
    );
  }
  return (
    <span className="whitespace-nowrap rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
      ✅ Ativo
    </span>
  );
}
