'use client'

/**
 * PURION OS — Provider de Estado Global
 * Inicializa o store Zustand com os dados de seed.
 * Executa apenas uma vez no lado do cliente.
 */

import { useEffect, useRef } from 'react'
import { usePurionStore } from '@/store'
import { seedData } from '@/data/seed'

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const inicializado = useRef(false)
  const {
    setLeads,
    setReceitas,
    setDespesas,
    setTarefas,
    setLotes,
    setEstoque,
    setCreators,
    setCampanhasAds,
    setReunioes,
    setProdutosSKU,
    setPedidosExpedicao,
    setConteudosCalendario,
    setDailyEntries,
    setDecisoes,
    leads,
  } = usePurionStore()

  useEffect(() => {
    // Inicializa apenas se o store estiver vazio (evita sobrescrever dados reais)
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

  return <>{children}</>
}
