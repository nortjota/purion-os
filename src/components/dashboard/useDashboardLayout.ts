'use client'

import { useCallback, useEffect, useState } from 'react'

/**
 * Layout da tela inicial por navegador: quais seções estão ocultas e quais estão recolhidas.
 * Preferência só visual (localStorage) — não toca em dados nem no Supabase.
 */

export const SECOES_DASHBOARD = [
  { id: 'fila',       label: 'Precisa de você',      descricao: 'Pendências e alertas, com atalho para resolver' },
  { id: 'resultado',  label: 'Resultado',            descricao: 'Faturamento, frascos, estoque, leads e gráficos' },
  { id: 'playbook',   label: 'KPIs do Playbook 360', descricao: 'North Star, margem, CAC, recompra' },
  { id: 'execucao',   label: 'Execução',             descricao: 'Tarefas, reposições B2B, agenda e metas de hoje' },
  { id: 'estrategia', label: 'Estratégia',           descricao: 'Metas do ano, fase do roadmap, próximo experimento' },
  { id: 'time',       label: 'Time & atividade',     descricao: 'Sócios, dailies e histórico de ações' },
] as const

export type SecaoDashboardId = typeof SECOES_DASHBOARD[number]['id']

interface LayoutSalvo { ocultas: string[]; recolhidas: string[] }

const CHAVE = 'purion-dashboard-layout-v2'
const EVENTO = 'purion:dashboard-layout'
const PADRAO: LayoutSalvo = { ocultas: [], recolhidas: ['time'] }

function ler(): LayoutSalvo {
  try {
    const bruto = window.localStorage.getItem(CHAVE)
    if (!bruto) return PADRAO
    const v = JSON.parse(bruto) as Partial<LayoutSalvo>
    return { ocultas: v.ocultas ?? [], recolhidas: v.recolhidas ?? PADRAO.recolhidas }
  } catch {
    return PADRAO
  }
}

export function useDashboardLayout() {
  const [layout, setLayout] = useState<LayoutSalvo>(PADRAO)

  useEffect(() => {
    setLayout(ler())
    const sincronizar = () => setLayout(ler())
    window.addEventListener(EVENTO, sincronizar)
    return () => window.removeEventListener(EVENTO, sincronizar)
  }, [])

  const salvar = useCallback((novo: LayoutSalvo) => {
    setLayout(novo)
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(novo))
      window.dispatchEvent(new CustomEvent(EVENTO))
    } catch { /* preferência só visual */ }
  }, [])

  const alternar = useCallback((campo: keyof LayoutSalvo, id: string) => {
    const atual = ler()
    const lista = atual[campo]
    salvar({ ...atual, [campo]: lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id] })
  }, [salvar])

  return {
    visivel: (id: SecaoDashboardId) => !layout.ocultas.includes(id),
    recolhida: (id: SecaoDashboardId) => layout.recolhidas.includes(id),
    alternarVisivel: (id: SecaoDashboardId) => alternar('ocultas', id),
    alternarRecolhida: (id: SecaoDashboardId) => alternar('recolhidas', id),
    restaurar: () => salvar(PADRAO),
  }
}
