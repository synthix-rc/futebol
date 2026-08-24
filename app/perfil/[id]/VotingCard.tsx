"use client";

import { useEffect, useState, useTransition } from "react";
import { submitSessionVotes } from "@/app/actions/voting";
import { PlayerAvatar } from "@/app/admin/jogadores/PlayerAvatar";

export type VoteCandidate = { id: string; name: string; photoUrl: string | null };

const CATEGORIES = [
  { key: "craque", label: "Craque do Dia", emoji: "🌟" },
  { key: "insuportavel", label: "Insuportável do Dia", emoji: "🤬" },
  { key: "pereba", label: "Pereba do Dia", emoji: "🩼" },
] as const;

type CategoryKey = (typeof CATEGORIES)[number]["key"];

function formatRemaining(ms: number): string {
  const totalMinutes = Math.max(0, Math.ceil(ms / 60000));
  if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
  }
  return `${totalMinutes} min`;
}

/**
 * "Urna da Rodada" ballot — shown on /perfil/[id] only when that player's
 * most recent closed session is still inside its 2h voting window and they
 * haven't voted yet (both re-checked server-side by submitSessionVotes;
 * this component's own countdown is UX only). Touch-first: candidates are
 * tappable avatar+name chips, not a <select>, one pick per category.
 */
export function VotingCard({
  sessionId,
  voterPlayerId,
  candidates,
  closesAt,
}: {
  sessionId: string;
  voterPlayerId: string;
  candidates: VoteCandidate[];
  closesAt: number;
}) {
  const [picks, setPicks] = useState<Record<CategoryKey, string | null>>({
    craque: null,
    insuportavel: null,
    pereba: null,
  });
  const [remainingMs, setRemainingMs] = useState(() => closesAt - Date.now());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setRemainingMs(closesAt - Date.now()), 30_000);
    return () => clearInterval(interval);
  }, [closesAt]);

  const expired = remainingMs <= 0;
  const allPicked = picks.craque && picks.insuportavel && picks.pereba;

  function handlePick(category: CategoryKey, playerId: string) {
    setPicks((prev) => ({
      ...prev,
      [category]: prev[category] === playerId ? null : playerId,
    }));
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitSessionVotes({
        sessionId,
        voterPlayerId,
        craqueId: picks.craque,
        insuportavelId: picks.insuportavel,
        perebaId: picks.pereba,
      });
      if (!result.success) {
        setError(result.message ?? "Erro ao registrar seu voto.");
        return;
      }
      setSuccess(true);
    });
  }

  if (success) {
    return (
      <section className="flex flex-col items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-6 text-center">
        <p className="text-3xl">✅</p>
        <h2 className="text-lg font-semibold">Voto registrado!</h2>
        <p className="text-sm text-foreground/60">
          Obrigado por participar da Urna da Rodada.
        </p>
      </section>
    );
  }

  if (expired) {
    return (
      <section className="rounded-lg border border-foreground/10 bg-card p-6 text-center text-sm text-foreground/50">
        🗳️ A urna desta rodada fechou.
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-5 rounded-lg border border-amber-500/30 bg-amber-500/5 p-5">
      <div className="flex flex-col items-center gap-1 text-center">
        <h2 className="text-lg font-bold">🗳️ Urna da Rodada Aberta!</h2>
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
          Encerra em {formatRemaining(remainingMs)}
        </p>
      </div>

      {CATEGORIES.map((category) => (
        <div key={category.key} className="flex flex-col gap-2">
          <h3 className="text-sm font-semibold">
            {category.emoji} {category.label}
          </h3>
          <div className="flex flex-wrap gap-2">
            {candidates.map((candidate) => {
              const selected = picks[category.key] === candidate.id;
              return (
                <button
                  key={candidate.id}
                  type="button"
                  onClick={() => handlePick(category.key, candidate.id)}
                  className={`flex w-[4.5rem] min-h-11 flex-col items-center gap-1 rounded-lg border px-1.5 py-2 text-center transition-colors ${
                    selected
                      ? "border-foreground bg-primary text-primary-foreground"
                      : "border-foreground/15 hover:bg-foreground/5"
                  }`}
                >
                  <PlayerAvatar photoUrl={candidate.photoUrl} name={candidate.name} />
                  <span className="w-full truncate text-[10px] font-medium">
                    {candidate.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <button
        type="button"
        disabled={isPending || !allPicked}
        onClick={handleSubmit}
        className="min-h-11 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        {isPending ? "Enviando…" : allPicked ? "Confirmar Voto" : "Escolha os 3 para votar"}
      </button>
    </section>
  );
}
