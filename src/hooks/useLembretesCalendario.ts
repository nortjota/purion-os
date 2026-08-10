'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

const INTERVALO_MS = 60_000
const JANELA_MS = 90_000

/** Checagem leve (poll a cada 60s) de eventos cujo horário de lembrete acabou
 *  de passar — dispara notificação in-app via /api/notificacoes/enviar.
 *  Roda enquanto o app estiver aberto, independente da página atual. */
export function useLembretesCalendario() {
  const jaNotificados = useRef<Set<string>>(new Set())

  useEffect(() => {
    const sb = supabase
    if (!sb) return

    async function checar() {
      const agora = Date.now()
      const { data } = await sb!
        .from('eventos_calendario')
        .select('id, titulo, data_inicio, lembrete_minutos, responsavel')
        .is('deleted_at', null)
        .eq('concluido', false)
        .gte('data_inicio', new Date(agora).toISOString())
        .lte('data_inicio', new Date(agora + 3 * 86_400_000).toISOString())

      if (!data) return

      for (const ev of data as Array<Record<string, unknown>>) {
        const id = String(ev.id)
        const inicio = new Date(String(ev.data_inicio)).getTime()
        const lembreteMinutos = Number(ev.lembrete_minutos ?? 60)
        const lembreteEm = inicio - lembreteMinutos * 60_000

        if (agora >= lembreteEm && agora < lembreteEm + JANELA_MS && !jaNotificados.current.has(id)) {
          jaNotificados.current.add(id)
          fetch('/api/notificacoes/enviar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              papel: ev.responsavel ?? undefined,
              tipo: 'lembrete_calendario',
              titulo: `⏰ ${String(ev.titulo)}`,
              mensagem: 'Este evento começa em breve.',
              canal: ['sistema'],
              link: '/calendario',
            }),
          }).catch(() => {})
        }
      }
    }

    checar()
    const intervalId = setInterval(checar, INTERVALO_MS)
    return () => clearInterval(intervalId)
  }, [])
}
