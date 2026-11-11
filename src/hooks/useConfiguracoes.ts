'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { usePurionStore } from '@/store'
import { useToast } from '@/components/ui/Toast'
import type { Configuracoes } from '@/store'
import { CHAVES_PRECIFICACAO, CAMPO_PARA_CHAVE } from '@/lib/precificacao'

/** "97.9" → 97.9 (a coluna valor pode ser text/jsonb); demais valores passam como estão. */
function normalizarValor(v: unknown): unknown {
  if (typeof v === 'string' && v.trim() !== '' && /^-?\d+([.,]\d+)?$/.test(v.trim())) return Number(v.trim().replace(',', '.'))
  return v
}

export function useConfiguracoes() {
  const { success, error: toastError } = useToast()

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    const load = async () => {
      const { data, error } = await sb.from('configuracoes').select('chave, valor')
      dbLog('SELECT', 'configuracoes', error, `${data?.length ?? 0} rows`)
      if (!data || !data.length) return
      const patch: Record<string, unknown> = {}
      // 1º chaves legadas (camelCase), depois as de precificação (snake_case), que têm prioridade
      for (const row of data) {
        if (row.chave in CHAVES_PRECIFICACAO) continue
        patch[row.chave] = normalizarValor(row.valor)
      }
      for (const row of data) {
        const def = CHAVES_PRECIFICACAO[row.chave as keyof typeof CHAVES_PRECIFICACAO]
        if (!def) continue
        const n = Number(normalizarValor(row.valor))
        if (Number.isFinite(n)) patch[def.campo] = def.pct ? n / 100 : n
      }
      usePurionStore.getState().setConfiguracoes(patch as Partial<Configuracoes>)
    }

    load()

    const ch = sb.channel(`config-sync-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, load)
      .subscribe()

    return () => { sb.removeChannel(ch) }
  }, [])

  return {
    /**
     * Persiste configurações no Supabase (upsert por chave) e só então atualiza o Zustand —
     * se o upsert falhar (RLS, coluna faltando, etc.) o estado local NÃO muda, para a UI nunca
     * mostrar um valor como "salvo" quando na verdade não gravou. Retorna true/false.
     */
    salvarConfiguracoes: async (config: Partial<Configuracoes>): Promise<boolean> => {
      const sb = supabase
      if (!sb) {
        usePurionStore.getState().setConfiguracoes(config)
        return true
      }
      // Precificação grava em chaves snake_case (custo_unitario, preco_b2c…); o resto mantém a chave do app.
      // tenant_id NÃO é enviado (DEFAULT public.meu_tenant_id()). A chave primária da tabela é só `chave`,
      // então o conflito é resolvido por ela.
      const upserts = Object.entries(config).map(([campo, valor]) => {
        const chave = CAMPO_PARA_CHAVE[campo] ?? campo
        const def = CHAVES_PRECIFICACAO[chave as keyof typeof CHAVES_PRECIFICACAO]
        const v = def?.pct && typeof valor === 'number' ? Math.round(valor * 10000) / 100 : valor
        return { chave, valor: v, updated_at: new Date().toISOString() }
      })
      const { error } = await sb.from('configuracoes').upsert(upserts, { onConflict: 'chave' })
      dbLog('UPSERT', 'configuracoes', error, Object.keys(config))
      if (error) { toastError('Erro ao salvar configurações', error.message); return false }
      usePurionStore.getState().setConfiguracoes(config)
      success('Configurações salvas')
      return true
    },
  }
}
