// src/supabase.js
// ─────────────────────────────────────────────────────────────
//  Cliente Supabase — persistência dos gastos lançados via bot
// ─────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config.js';

export const supabase = createClient(
  CONFIG.supabase.url,
  CONFIG.supabase.serviceKey,
  { auth: { persistSession: false } }
);

// ── Insere um gasto e devolve o registro criado ────────────────
export async function inserirGasto({ data, valor, descricao, categoria, jid }) {
  const { data: registro, error } = await supabase
    .from('gastos')
    .insert({
      data,
      valor,
      descricao,
      categoria,
      origem: 'whatsapp',
      autor_jid: jid,
    })
    .select()
    .single();

  if (error) throw new Error(`Supabase insert: ${error.message}`);
  return registro;
}

// ── Remove o último gasto lançado por esse número (comando !desfazer) ──
export async function removerUltimoGasto(jid) {
  const { data: ultimo, error: errBusca } = await supabase
    .from('gastos')
    .select('*')
    .eq('autor_jid', jid)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (errBusca) throw new Error(`Supabase select: ${errBusca.message}`);
  if (!ultimo) return null;

  const { error: errDelete } = await supabase.from('gastos').delete().eq('id', ultimo.id);
  if (errDelete) throw new Error(`Supabase delete: ${errDelete.message}`);
  return ultimo;
}

// ── Lista gastos num intervalo de datas (YYYY-MM-DD, inclusive) ────────
export async function listarGastos(dataInicio, dataFim) {
  const { data: linhas, error } = await supabase
    .from('gastos')
    .select('*')
    .gte('data', dataInicio)
    .lte('data', dataFim)
    .order('data', { ascending: true });

  if (error) throw new Error(`Supabase select: ${error.message}`);
  return linhas;
}
