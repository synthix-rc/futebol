"use client";

import { useState, useTransition } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { updateScouting } from "@/app/actions/players";

export type ScoutingData = {
  defRating: number;
  midRating: number;
  atkRating: number;
  speedRating: number;
  staminaRating: number;
};

export function ScoutingForm({
  playerId,
  initial,
}: {
  playerId: string;
  initial: ScoutingData;
}) {
  const [defRating, setDefRating] = useState(initial.defRating);
  const [midRating, setMidRating] = useState(initial.midRating);
  const [atkRating, setAtkRating] = useState(initial.atkRating);
  const [speedRating, setSpeedRating] = useState(initial.speedRating);
  const [staminaRating, setStaminaRating] = useState(initial.staminaRating);
  const [isEditing, setIsEditing] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const radarData = [
    { skill: "Defesa", value: defRating },
    { skill: "Meio", value: midRating },
    { skill: "Ataque", value: atkRating },
    { skill: "Velocidade", value: speedRating },
    { skill: "Resistência", value: staminaRating },
  ];

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateScouting(playerId, {
        defRating,
        midRating,
        atkRating,
        speedRating,
        staminaRating,
      });
      if (!result.success) {
        setError(result.message ?? "Erro ao salvar.");
        return;
      }
      setSuccess(true);
      setIsEditing(false);
    });
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-foreground/10 bg-card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-foreground/50">
          ⚽ Scouting
        </h2>
        {!isEditing && (
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className="min-h-9 rounded-md border border-foreground/20 px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-foreground/5"
          >
            ✏️ Editar Notas
          </button>
        )}
      </div>

      <div className="mx-auto h-64 w-full max-w-sm">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radarData} outerRadius="75%">
            <PolarGrid stroke="currentColor" className="text-foreground/15" />
            <PolarAngleAxis
              dataKey="skill"
              tick={{ fill: "currentColor", fontSize: 11 }}
              className="text-foreground/60"
            />
            <Radar
              dataKey="value"
              stroke="currentColor"
              fill="currentColor"
              fillOpacity={0.25}
              className="text-emerald-500"
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {isEditing && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-4">
            <RangeInput label="Defesa" value={defRating} onChange={setDefRating} />
            <RangeInput label="Meio" value={midRating} onChange={setMidRating} />
            <RangeInput label="Ataque" value={atkRating} onChange={setAtkRating} />
            <RangeInput label="Velocidade" value={speedRating} onChange={setSpeedRating} />
            <RangeInput label="Resistência" value={staminaRating} onChange={setStaminaRating} />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="min-h-11 flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {isPending ? "Salvando…" : "Salvar Scouting"}
            </button>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="min-h-11 rounded-md border border-foreground/20 px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-foreground/5"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      {!isEditing && success && (
        <p className="text-center text-sm text-emerald-600 dark:text-emerald-400">
          Scouting atualizado!
        </p>
      )}
    </section>
  );
}

function RangeInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="flex items-center justify-between">
        {label}
        <span className="font-mono text-base font-semibold">{value}</span>
      </span>
      <input
        type="range"
        min={1}
        max={5}
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-11 w-full accent-foreground"
      />
    </label>
  );
}
