// @ts-nocheck
'use client';

import React, { useState } from 'react';
import { Plus, Share2, X } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { usePelada } from '@/context/PeladaContext';

export default function CaixaChurrascoPage() {
  const {
    players,
    matchConfig,
    financialSummary,
    toggleGameFinancial,
    toggleBbqFinancial,
    addTransaction,
    openWhatsAppFinance
  } = usePelada();

  const [expenseModal, setExpenseModal] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    addTransaction({
      description: formData.get('description'),
      amount: parseFloat(formData.get('amount')),
      type: formData.get('type'),
      category: formData.get('category'),
    });
    setExpenseModal(false);
  };

  return (
    <AppShell>
      <div className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase px-2.5 py-1 rounded bg-[#EBF2F7] text-[#142F47]">
                  ⚽ Caixa da Pelada
                </span>
                <h3 className="text-lg font-extrabold text-[#142F47] mt-1.5">Mensalidades & Campo</h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#5A6E82] block">Saldo Pelada</span>
                <span className="text-2xl font-black text-[#142F47] tabular-nums">
                  R$ {financialSummary.peladaBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase px-2.5 py-1 rounded bg-[#F9F3EB] text-[#7A5220]">
                  🥩 Caixa do Churrasco
                </span>
                <h3 className="text-lg font-extrabold text-[#142F47] mt-1.5">
                  Cota R$ {matchConfig.bbqFee}/pessoa
                </h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-[#5A6E82] block">Saldo Churrasco</span>
                <span className="text-2xl font-black text-[#7A5220] tabular-nums">
                  R$ {financialSummary.bbqBalance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#DDD5C7] rounded-2xl p-4 shadow-sm">
          <button
            onClick={() => setExpenseModal(true)}
            className="min-h-[48px] flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#FAF8F4] text-[#142F47] border border-[#DDD5C7] text-sm font-bold"
          >
            <Plus className="w-5 h-5" />
            <span>Novo Lançamento</span>
          </button>
          <button
            onClick={openWhatsAppFinance}
            className="min-h-[48px] flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#142F47] text-white text-sm font-bold"
          >
            <Share2 className="w-4 h-4" />
            <span>Prestação no WhatsApp</span>
          </button>
        </div>

        <div className="bg-white border border-[#DDD5C7] rounded-2xl p-5 shadow-sm space-y-4">
          <h4 className="text-base font-extrabold text-[#142F47] pb-2 border-b border-[#EAE3D5]">
            Pagamentos por Atleta (Toque para marcar Pago / Pendente)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {players.map((p) => {
              const gameFee = p.type === 'MENSALISTA' ? matchConfig.monthlyFee : matchConfig.dailyFee;
              const isGamePaid = p.financialStatus === 'EM_DIA';
              return (
                <div
                  key={p.id}
                  className="p-3.5 rounded-xl bg-[#FAF8F4] border border-[#E2DBD0] flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <p className="text-base font-bold text-[#142F47] truncate">{p.name}</p>
                    <span className="text-xs text-[#5A6E82]">
                      {p.type} (R$ {gameFee})
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleGameFinancial(p.id)}
                      className={`min-h-[42px] px-3 rounded-xl text-xs font-bold border ${
                        isGamePaid
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      ⚽ {isGamePaid ? 'Pago' : 'Pend.'}
                    </button>

                    {p.bbqConfirmed && (
                      <button
                        onClick={() => toggleBbqFinancial(p.id)}
                        className={`min-h-[42px] px-3 rounded-xl text-xs font-bold border ${
                          p.bbqPaid
                            ? 'bg-[#F9F3EB] text-[#7A5220] border-[#E3D1B4]'
                            : 'bg-red-50 text-red-800 border-red-200'
                        }`}
                      >
                        🥩 {p.bbqPaid ? 'Pago' : 'Pend.'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {expenseModal && (
        <div className="fixed inset-0 z-50 bg-[#0E2234]/70 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white border border-[#DDD5C7] rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl text-sm"
          >
            <div className="flex items-center justify-between border-b border-[#EAE3D5] pb-3">
              <h3 className="text-lg font-extrabold text-[#142F47]">Novo Lançamento</h3>
              <button
                type="button"
                onClick={() => setExpenseModal(false)}
                className="p-1 text-[#5A6E82]"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[#142F47] font-bold block mb-1">Descrição *</label>
                <input
                  name="description"
                  required
                  placeholder="Ex: Carnes + Carvão + Gelo"
                  className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3.5 text-base text-[#142F47]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#142F47] font-bold block mb-1">Valor (R$) *</label>
                  <input
                    name="amount"
                    type="number"
                    step="0.01"
                    required
                    className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3.5 text-base text-[#142F47]"
                  />
                </div>
                <div>
                  <label className="text-[#142F47] font-bold block mb-1">Tipo</label>
                  <select
                    name="type"
                    className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 text-base text-[#142F47]"
                  >
                    <option value="DESPESA">Saída</option>
                    <option value="RECEITA">Entrada</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[#142F47] font-bold block mb-1">Caixa</label>
                <select
                  name="category"
                  className="w-full min-h-[46px] bg-[#FAF8F4] border border-[#DDD5C7] rounded-xl px-3 text-base text-[#142F47]"
                >
                  <option value="CHURRASCO">🥩 Caixa do Churrasco</option>
                  <option value="CAMPO">⚽ Caixa Pelada (Campo)</option>
                  <option value="MATERIAL">⚽ Caixa Pelada (Material)</option>
                  <option value="DIARIA">⚽ Caixa Pelada (Diárias)</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#EAE3D5]">
              <button
                type="button"
                onClick={() => setExpenseModal(false)}
                className="min-h-[48px] rounded-xl bg-[#FAF8F4] border border-[#DDD5C7] text-[#4A6075] font-bold"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[48px] rounded-xl bg-[#142F47] text-white font-bold"
              >
                Registrar
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
