'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'

/** Linha de resumo do dia (gerada pela rotina de notificações) — só aparece se for de hoje. */
export function ResumoDiario() {
  const [mensagem, setMensagem] = useState<string | null>(null)
  const [criadoEm, setCriadoEm] = useState<string | null>(null)

  useEffect(() => {
    const sb = supabase
    if (!sb) return
    sb.from('notificacoes')
      .select('mensagem, criado_em')
      .eq('tipo', 'resumo_diario')
      .order('criado_em', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data, error }) => {
        dbLog('SELECT', 'notificacoes (resumo_diario)', error, data ? '1 row' : '0 rows')
        if (data) { setMensagem(data.mensagem); setCriadoEm(data.criado_em) }
      })
  }, [])

  if (!mensagem) return null

  const ehHoje = criadoEm && new Date(criadoEm).toDateString() === new Date().toDateString()
  if (!ehHoje) return null

  return (
    <p style={{
      display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, paddingTop: 10,
      borderTop: '1px solid var(--border)', fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.5,
    }}>
      <Sparkles size={13} style={{ flexShrink: 0, marginTop: 2 }} aria-hidden />
      <span><span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Resumo de hoje:</span> {mensagem}</span>
    </p>
  )
}
