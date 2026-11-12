'use client'

import { useEffect, useState } from 'react'
import { ConfirmModal } from './ConfirmModal'

/**
 * Confirmação única do sistema, no lugar do `window.confirm` do navegador.
 * Uso: `if (!(await confirmar({ titulo: 'Excluir X?', mensagem: '…' }))) return`
 * O <ConfirmarHost /> fica montado uma vez no AppShell.
 */

export interface OpcoesConfirmar {
  titulo: string
  mensagem: string
  rotuloConfirmar?: string
  /** false = ação neutra (ex.: concluir); padrão true = destrutiva */
  perigo?: boolean
}

type Pedido = OpcoesConfirmar & { resolver: (ok: boolean) => void }

let abrir: ((p: Pedido) => void) | null = null

export function confirmar(opcoes: OpcoesConfirmar): Promise<boolean> {
  return new Promise((resolver) => {
    // sem host montado (ex.: tela fora do AppShell) cai no confirm nativo, para nunca excluir sem perguntar
    if (!abrir) { resolver(window.confirm(`${opcoes.titulo}\n\n${opcoes.mensagem}`)); return }
    abrir({ ...opcoes, resolver })
  })
}

export function ConfirmarHost() {
  const [pedido, setPedido] = useState<Pedido | null>(null)

  useEffect(() => {
    abrir = setPedido
    return () => { abrir = null }
  }, [])

  function fechar(ok: boolean) {
    pedido?.resolver(ok)
    setPedido(null)
  }

  return (
    <ConfirmModal
      open={!!pedido}
      title={pedido?.titulo ?? ''}
      message={pedido?.mensagem ?? ''}
      confirmLabel={pedido?.rotuloConfirmar ?? (pedido?.perigo === false ? 'Confirmar' : 'Excluir')}
      danger={pedido?.perigo !== false}
      onConfirm={() => fechar(true)}
      onCancel={() => fechar(false)}
    />
  )
}
