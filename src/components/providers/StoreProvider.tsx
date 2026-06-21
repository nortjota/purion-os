'use client'

/**
 * PURION OS — Provider de Estado Global
 *
 * Comportamento:
 *  - Se NEXT_PUBLIC_SUPABASE_URL estiver configurado: carrega dados do Supabase
 *    e escuta mudanças em tempo real (os 3 sócios sempre veem os mesmos dados).
 *  - Se não estiver configurado (desenvolvimento local): usa dados de seed.
 */

import { useEffect, useRef } from 'react'
import { usePurionStore } from '@/store'
import { supabase } from '@/lib/supabase'
import { seedData } from '@/data/seed'

// Hooks de sincronização Supabase ↔ Zustand
import { useFinanceiro } from '@/hooks/useFinanceiro'
import { useCRM }        from '@/hooks/useCRM'
import { useTarefas }    from '@/hooks/useTarefas'
import { useProducao }   from '@/hooks/useProducao'
import { useMarketing }  from '@/hooks/useMarketing'
import { useReunioes }   from '@/hooks/useReunioes'
import { useConfiguracoes } from '@/hooks/useConfiguracoes'
import { useConhecimento } from '@/hooks/useConhecimento'
import { useContas }     from '@/hooks/useContas'

// ── Componente interno que chama todos os hooks de sync ──────────────────────
// Só é renderizado quando Supabase está configurado.
function SupabaseSync() {
  useFinanceiro()
  useCRM()
  useTarefas()
  useProducao()
  useMarketing()
  useReunioes()
  useConfiguracoes()
  useConhecimento()
  useContas()
  return null
}

// ── Provider principal ────────────────────────────────────────────────────────
export function StoreProvider({ children }: { children: React.ReactNode }) {
  const inicializado = useRef(false)
  const {
    setLeads, setReceitas, setDespesas, setTarefas, setLotes, setEstoque,
    setCreators, setCampanhasAds, setReunioes, setProdutosSKU,
    setPedidosExpedicao, setConteudosCalendario, setDailyEntries, setDecisoes,
    leads,
  } = usePurionStore()

  // Rehydrate localStorage after mount to avoid SSR/client hydration mismatch
  useEffect(() => {
    usePurionStore.persist.rehydrate()
  }, [])

  useEffect(() => {
    // Seed apenas se: Supabase não configurado E store ainda vazio
    if (supabase) return
    if (inicializado.current || leads.length > 0) return
    inicializado.current = true

    setLeads(seedData.leads)
    setReceitas(seedData.receitas)
    setDespesas(seedData.despesas)
    setTarefas(seedData.tarefas)
    setLotes(seedData.lotes)
    setEstoque(seedData.estoque)
    setCreators(seedData.creators)
    setCampanhasAds(seedData.campanhasAds)
    setReunioes(seedData.reunioes)
    setProdutosSKU(seedData.produtosSKU)
    setPedidosExpedicao(seedData.pedidosExpedicao)
    setConteudosCalendario(seedData.conteudosCalendario)
    setDailyEntries(seedData.dailyEntries)
    setDecisoes(seedData.decisoes)
  }, [
    leads.length,
    setLeads, setReceitas, setDespesas, setTarefas,
    setLotes, setEstoque, setCreators, setCampanhasAds, setReunioes,
    setProdutosSKU, setPedidosExpedicao, setConteudosCalendario,
    setDailyEntries, setDecisoes,
  ])

  return (
    <>
      {supabase && <SupabaseSync />}
      {children}
    </>
  )
}
