import type { PlayerRankings as PlayerRankingsData, RankingEntry } from "@/app/actions/stats";
import { PlayerAvatar } from "./PlayerAvatar";

const SECTIONS: Array<{
  key: keyof Omit<PlayerRankingsData, "year">;
  title: string;
  unit: (value: number) => string;
}> = [
  { key: "topGames", title: "🏃 Mais Jogos (presenças)", unit: (v) => `${v} jogo${v === 1 ? "" : "s"}` },
  { key: "topScorers", title: "⚽ Artilheiros", unit: (v) => `${v} gol${v === 1 ? "" : "s"}` },
  { key: "topAssists", title: "🎯 Garçons", unit: (v) => `${v} assist.` },
  { key: "topCraques", title: "🌟 Top Craques", unit: (v) => `${v} voto${v === 1 ? "" : "s"}` },
  { key: "topInsuportaveis", title: "🤬 Top Insuportáveis", unit: (v) => `${v} voto${v === 1 ? "" : "s"}` },
  { key: "topPerebas", title: "🩼 Top Perebas", unit: (v) => `${v} voto${v === 1 ? "" : "s"}` },
];

/** "Hall da Fama" — Top 10 lists for the current calendar year. Purely
 * presentational (no client interactivity of its own), so this stays a
 * plain Server Component even though its parent tab switcher is a Client
 * Component — see JogadoresTabs.tsx. */
export function PlayerRankings({ rankings }: { rankings: PlayerRankingsData }) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-foreground/50">Somas do ano de {rankings.year}.</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SECTIONS.map(({ key, title, unit }) => (
          <RankingCard key={key} title={title} entries={rankings[key]} unit={unit} />
        ))}
      </div>
    </div>
  );
}

function RankingCard({
  title,
  entries,
  unit,
}: {
  title: string;
  entries: RankingEntry[];
  unit: (value: number) => string;
}) {
  return (
    <section className="rounded-lg border border-foreground/10 bg-card p-5">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-foreground/50">
        {title}
      </h3>
      {entries.length === 0 ? (
        <p className="text-sm text-foreground/40">Sem dados suficientes ainda.</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {entries.map((entry, index) => (
            <li key={entry.playerId} className="flex items-center gap-3 text-sm">
              <span className="w-4 shrink-0 text-right font-mono text-xs text-foreground/40">
                {index + 1}
              </span>
              <PlayerAvatar photoUrl={entry.photoUrl} name={entry.name} />
              <span className="flex-1 truncate">{entry.name}</span>
              <span className="whitespace-nowrap font-mono text-xs text-foreground/50">
                {unit(entry.value)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
