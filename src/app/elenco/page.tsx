// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { UserPlus, Edit3, X } from 'lucide-react';
import AppShell from '@/components/AppShell';
import {
  usePelada,
  POSITION_LABELS,
  calcWeightedScore
} from '@/context/PeladaContext';

export default function ElencoPage() {
  const { players, savePlayer } = usePelada();
  const [playerModal, setPlayerModal] = useState({ open: false, editingPlayer: null });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const playerData = {
      name: formData.get('name'),
      phone: formData.get('phone') || '21999990000',
      birthDate: formData.get('birthDate') || '',
      type: formData.get('type'),
      position: formData.get('position'),
      overall: parseFloat(formData.get('overall')),
      stamina: parseFloat(formData.get('stamina')),
      speed: parseFloat(formData.get('speed')),
      financialStatus: formData.get('financialStatus')
    };
    savePlayer(playerData, playerModal.editingPlayer?.id);
    setPlayerModal({ open: false, editingPlayer: null });
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-[#142F47]">Elenco ({players.length} Atletas)</h2>
            <p className="text-sm text-[#5A6E82]">
              Gerencie posições, notas e data de nascimento.
            </p>
          </div>
          <button
            onClick={() => setPlayerModal({ open: true, editingPlayer: null })}
            className="min-h-[48px] px-5 py-2.5 rounded-xl bg-[#142F47] text-white font-bold text-base flex items-center justify-center gap-2"
          >
            <UserPlus className="w-5 h-5" />
            <span>Novo Jogador</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map((player) => (
            <div
              key={player.id}
              className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm flex flex-col justify-between gap-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-[#142F47]">{player.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${POSITION_LABELS[player.position].color}`}>
                      {POSITION_LABELS[player.position].short}
                    </span>
                    <span className="text-xs font-semibold text-[#5A6E82]">
                      {player.type}
                    </span>
                  </div>
                </div>
                <div className="bg-[#EBF2F7] px-3 py-1.5 rounded-xl border border-[#C5D7E5] text-center">
                  <span className="text-[11px] text-[#31688E] font-bold block">Nota</span>
                  <span className="text-base font-black text-[#142F47]">{calcWeightedScore(player)}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[#EAE3D5] text-sm">
                <span className="text-[#5A6E82]">
                  Temporada: <strong className="text-[#142F47]">{player.stats.goals}G</strong> / {player.stats.assists}A
                </span>
                <button
                  onClick={() => setPlayerModal({ open: true, editingPlayer: player })}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#142F47] font-bold flex items-center gap-1.5"
                >
                  <Edit3 className="w-4 h-4 text-[#31688E]" />
                  <span>Editar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {playerModal.open && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-[#DDD5C7] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl text-sm max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-lg font-extrabold text-[#142F47]">
                {playerModal.editingPlayer ? 'Editar Jogador' : 'Novo Jogador'}
              </h3>
              <button
                type="button"
                onClick={() => setPlayerModal({ open: false, editingPlayer: null })}
                className="p-1 text-[#5A6E82]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[#142F47] font-bold block mb-1">Nome / Apelido *</label>
                <input
                  name="name"
                  required
                  defaultValue={playerModal.editingPlayer?.name || ''}
                  className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3.5 text-base text-[#142F47]"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[#142F47] font-bold block mb-1">WhatsApp *</label>
                  <input
                    name="phone"
                    required
                    defaultValue={playerModal.editingPlayer?.phone || '21999990000'}
                    className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3.5 text-base text-[#142F47]"
                  />
                </div>
                <div>
                  <label className="text-[#142F47] font-bold block mb-1">Data de Nascimento</label>
                  <input
                    name="birthDate"
                    type="date"
                    defaultValue={playerModal.editingPlayer?.birthDate || ''}
                    className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3.5 text-base text-[#142F47]"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#142F47] font-bold block mb-1">Posição</label>
                  <select
                    name="position"
                    defaultValue={playerModal.editingPlayer?.position || 'MEIO_CAMPO'}
                    className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 text-base text-[#142F47]"
                  >
                    <option value="GOLEIRO">Goleiro</option>
                    <option value="ZAGUEIRO">Zagueiro</option>
                    <option value="LATERAL">Lateral / Ala</option>
                    <option value="MEIO_CAMPO">Meio-Campo</option>
                    <option value="ATACANTE">Atacante</option>
                  </select>
                </div>
                <div>
                  <label className="text-[#142F47] font-bold block mb-1">Vínculo</label>
                  <select
                    name="type"
                    defaultValue={playerModal.editingPlayer?.type || 'MENSALISTA'}
                    className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 text-base text-[#142F47]"
                  >
                    <option value="MENSALISTA">Mensalista</option>
                    <option value="DIARISTA">Diarista</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[#142F47] font-bold block mb-1">Técnica</label>
                  <input
                    name="overall"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    defaultValue={playerModal.editingPlayer?.overall || 4.0}
                    className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 text-base text-[#142F47]"
                  />
                </div>
                <div>
                  <label className="text-[#142F47] font-bold block mb-1">Fôlego</label>
                  <input
                    name="stamina"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    defaultValue={playerModal.editingPlayer?.stamina || 4.0}
                    className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 text-base text-[#142F47]"
                  />
                </div>
                <div>
                  <label className="text-[#142F47] font-bold block mb-1">Veloc.</label>
                  <input
                    name="speed"
                    type="number"
                    step="0.1"
                    min="1"
                    max="5"
                    defaultValue={playerModal.editingPlayer?.speed || 4.0}
                    className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 text-base text-[#142F47]"
                  />
                </div>
              </div>
              <div>
                <label className="text-[#142F47] font-bold block mb-1">Mensalidade / Diária</label>
                <select
                  name="financialStatus"
                  defaultValue={playerModal.editingPlayer?.financialStatus || 'EM_DIA'}
                  className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 text-base text-[#142F47]"
                >
                  <option value="EM_DIA">Em Dia</option>
                  <option value="PENDENTE">Pendente</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#EAE3D5]">
              <button
                type="button"
                onClick={() => setPlayerModal({ open: false, editingPlayer: null })}
                className="min-h-[48px] rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[48px] rounded-xl bg-[#142F47] text-white font-bold"
              >
                Salvar
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
