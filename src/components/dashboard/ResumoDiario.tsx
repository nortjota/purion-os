'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { supabase } from '@/lib/supabase'

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
      .then(({ data }) => {
        if (data) { setMensagem(data.mensagem); setCriadoEm(data.criado_em) }
      })
  }, [])

  if (!mensagem) return null

  const ehHoje = criadoEm && new Date(criadoEm).toDateString() === new Date().toDateString()
  if (!ehHoje) return null

  return (
    <div className="card-purion p-4 flex items-start gap-3">
      <div className="shrink-0 mt-0.5 text-[#C9A84C]"><Sparkles size={16} /></div>
      <div>
        <p className="text-xs font-bold text-[#C9A84C] uppercase tracking-wider mb-1">Resumo de hoje</p>
        <p className="text-sm text-[var(--text-primary)]">{mensagem}</p>
      </div>
    </div>
  )
}
