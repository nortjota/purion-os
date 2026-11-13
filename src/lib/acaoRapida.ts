'use client'

import { useEffect, useRef } from 'react'

/**
 * Ações rápidas globais (paleta Ctrl+K e atalhos N→T, N→L…).
 *
 * Quem dispara nem sempre está na tela que resolve a ação: a paleta navega para o módulo
 * e o formulário só existe depois que a página monta. Por isso a ação fica "pendente" por
 * alguns segundos e é consumida pela tela certa — ao montar, ou na hora se já estiver aberta.
 */

export type AcaoRapida =
  | 'nova-tarefa' | 'novo-lead' | 'nova-venda-b2c' | 'nova-venda-b2b'
  | 'registrar-receita' | 'registrar-despesa' | 'novo-lote' | 'adicionar-creator'
  | 'registrar-daily' | 'novo-evento' | 'novo-ticket' | 'ajustar-estoque' | 'nova-ideia-video'

const EVENTO = 'purion:action'
const VALIDADE_MS = 6000

let pendente: { acao: AcaoRapida; em: number } | null = null

export function dispararAcaoRapida(acao: AcaoRapida) {
  pendente = { acao, em: Date.now() }
  window.dispatchEvent(new CustomEvent(EVENTO, { detail: { action: acao } }))
}

function pegar(acao: AcaoRapida, consumir: boolean): boolean {
  if (!pendente || pendente.acao !== acao) return false
  const valida = Date.now() - pendente.em < VALIDADE_MS
  if (consumir || !valida) pendente = null
  return valida
}

/**
 * Liga uma tela a uma ação rápida.
 * `consumir: false` serve para o contêiner que só prepara o terreno (ex.: trocar de aba)
 * e deixa a ação para o componente filho abrir o formulário.
 */
export function useAcaoRapida(acao: AcaoRapida, handler: () => void, { consumir = true }: { consumir?: boolean } = {}) {
  const ref = useRef(handler)
  ref.current = handler

  useEffect(() => {
    if (pegar(acao, consumir)) ref.current()
    function ouvir(e: Event) {
      if ((e as CustomEvent<{ action?: string }>).detail?.action !== acao) return
      if (pegar(acao, consumir)) ref.current()
    }
    window.addEventListener(EVENTO, ouvir)
    return () => window.removeEventListener(EVENTO, ouvir)
  }, [acao, consumir])
}

/** Lista única das ações rápidas — usada pelo botão "Criar" do cabeçalho e pela busca (Ctrl+K). */
export const ACOES_RAPIDAS: ReadonlyArray<{ label: string; action: AcaoRapida; href: string; grupo: string; atalho?: string }> = [
  { label: 'Nova tarefa',        action: 'nova-tarefa',       href: '/tarefas',    grupo: 'Dia a dia', atalho: 'N + T' },
  { label: 'Novo evento',        action: 'novo-evento',       href: '/calendario', grupo: 'Dia a dia' },
  { label: 'Registrar daily',    action: 'registrar-daily',   href: '/reunioes',   grupo: 'Dia a dia' },
  { label: 'Nova venda B2C',     action: 'nova-venda-b2c',    href: '/vendas',     grupo: 'Vendas & clientes', atalho: 'N + V' },
  { label: 'Nova venda B2B',     action: 'nova-venda-b2b',    href: '/vendas',     grupo: 'Vendas & clientes' },
  { label: 'Novo lead',          action: 'novo-lead',         href: '/crm',        grupo: 'Vendas & clientes', atalho: 'N + L' },
  { label: 'Novo ticket de SAC', action: 'novo-ticket',       href: '/sac',        grupo: 'Vendas & clientes' },
  { label: 'Novo lote',          action: 'novo-lote',         href: '/producao',   grupo: 'Operação & gestão' },
  { label: 'Registrar receita',  action: 'registrar-receita', href: '/financeiro', grupo: 'Operação & gestão' },
  { label: 'Registrar despesa',  action: 'registrar-despesa', href: '/financeiro', grupo: 'Operação & gestão' },
  { label: 'Adicionar creator',  action: 'adicionar-creator', href: '/creators',   grupo: 'Operação & gestão' },
  { label: 'Nova ideia de vídeo (TikTok)', action: 'nova-ideia-video', href: '/tiktok?tab=studio', grupo: 'Operação & gestão' },
]
