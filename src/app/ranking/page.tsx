// @ts-nocheck
'use client';

import React, { useState } from 'react';
import AppShell from '@/components/AppShell';
import { usePelada } from '@/context/PeladaContext';

export default function RankingPage() {
  const { players } = usePelada();
  const [statsSort, setStatsSort] = useState<'goals' | 'assists' | 'games'>('goals');

  return (
    <AppShell>
      <div className="bg-white border border-[#DDD5C7] rounded-2xl overflow-hidden shadow-sm">
        <div className="p-5 border-b border-[#EAE3D5] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h2 className="text-xl font-extrabold text-[#142F47]">
            Ranking da Temporada
          </h2>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: 'goals', label: 'Gols' },
              { key: 'assists', label: 'Assist.' },
              { key: 'games', label: 'Jogos' }
            ].map((btn) => (
              <button
                key={btn.key}
                onClick={() => setStatsSort(btn.key as 'goals' | 'assists' | 'games')}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-sm font-bold border transition ${
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

        <div className="divide-y divide-[#EAE3D5]">
          {[...players]
            .sort((a, b) => b.stats[statsSort] - a.stats[statsSort])
            .map((p, idx) => (
              <div key={p.id} className="p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <span className="w-9 h-9 rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-sm font-extrabold text-[#142F47] flex items-center justify-center shrink-0">
                    {idx + 1}º
                  </span>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-[#142F47] truncate">{p.name}</p>
                    <p className="text-xs sm:text-sm text-[#5A6E82]">
                      {p.stats.games} jogos • {p.stats.wins} vitórias
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0 text-right">
                  <div>
                    <span className="text-lg font-black text-[#142F47] block leading-none">{p.stats.goals}</span>
                    <span className="text-xs text-[#5A6E82]">Gols</span>
                  </div>
                  <div>
                    <span className="text-lg font-black text-[#31688E] block leading-none">{p.stats.assists}</span>
                    <span className="text-xs text-[#5A6E82]">Assist.</span>
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </AppShell>
  );
}
