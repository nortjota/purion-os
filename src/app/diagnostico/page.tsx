'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase'

interface Resultado {
  titulo: string
  ok: boolean
  detalhe: string
}

export default function DiagnosticoPage() {
  const [resultados, setResultados] = useState<Resultado[]>([])
  const [rodando, setRodando] = useState(false)

  async function rodarDiagnostico() {
    setRodando(true)
    setResultados([])
    const r: Resultado[] = []
    const sb = createClient()

    // 1. Usuário autenticado?
    const { data: { user }, error: authErr } = await sb.auth.getUser()
    r.push({
      titulo: '1. Usuário autenticado',
      ok: !!user && !authErr,
      detalhe: user
        ? `✅ id=${user.id} | email=${user.email}`
        : `❌ ${authErr?.message ?? 'Não autenticado (null)'}`,
    })

    if (!user) {
      r.push({ titulo: '2-5. Skipped', ok: false, detalhe: 'Login necessário para continuar.' })
      setResultados(r)
      setRodando(false)
      return
    }

    // 2. Ler tarefas
    const { data: leitura, error: errLeitura } = await sb
      .from('tarefas').select('id').limit(1)
    r.push({
      titulo: '2. SELECT em tarefas',
      ok: !errLeitura,
      detalhe: errLeitura
        ? `❌ ${errLeitura.code}: ${errLeitura.message}`
        : `✅ OK (${leitura?.length ?? 0} rows)`,
    })

    // 3. Inserir tarefa de teste
    const { data: insercao, error: errInsert } = await sb
      .from('tarefas')
      .insert({ titulo: '__DIAG_TEST__', status: 'aberta', prioridade: 'media', responsavel: 'matheus', modulo: 'geral', descricao: '', tags: [] })
      .select().single()
    r.push({
      titulo: '3. INSERT em tarefas (status=aberta)',
      ok: !!insercao && !errInsert,
      detalhe: insercao
        ? `✅ id=${insercao.id}`
        : `❌ ${errInsert?.code}: ${errInsert?.message}`,
    })

    // 4. Limpar o insert de teste
    if (insercao) {
      const { error: errDel } = await sb.from('tarefas').delete().eq('id', insercao.id)
      r.push({
        titulo: '4. DELETE tarefa de teste',
        ok: !errDel,
        detalhe: errDel ? `❌ ${errDel.message}` : '✅ OK',
      })
    }

    // 5. Testar leads
    const { data: leads, error: errLeads } = await sb.from('leads').select('id').limit(1)
    r.push({
      titulo: '5. SELECT em leads',
      ok: !errLeads,
      detalhe: errLeads
        ? `❌ ${errLeads.code}: ${errLeads.message}`
        : `✅ OK (${leads?.length ?? 0} rows)`,
    })

    // 6. Sessão detalhada
    const { data: { session } } = await sb.auth.getSession()
    r.push({
      titulo: '6. Sessão JWT',
      ok: !!session,
      detalhe: session
        ? `✅ expires_at=${new Date((session.expires_at ?? 0) * 1000).toLocaleString('pt-BR')}`
        : '❌ Sem sessão ativa',
    })

    setResultados(r)
    setRodando(false)
  }

  useEffect(() => { rodarDiagnostico() }, [])

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', color: '#FAFAF8', padding: 32, fontFamily: 'monospace' }}>
      <h1 style={{ color: '#C9A84C', fontSize: 20, marginBottom: 8 }}>PURION OS — Diagnóstico</h1>
      <p style={{ color: '#6B6B6B', fontSize: 13, marginBottom: 24 }}>
        Testa autenticação e permissões de banco em tempo real.
      </p>

      <button
        onClick={rodarDiagnostico}
        disabled={rodando}
        style={{
          padding: '10px 24px', background: '#C9A84C', color: '#0D0D0D',
          border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13,
          cursor: rodando ? 'not-allowed' : 'pointer', marginBottom: 32,
        }}
      >
        {rodando ? 'Executando...' : 'Rodar novamente'}
      </button>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {resultados.map((res, i) => (
          <div
            key={i}
            style={{
              background: res.ok ? 'rgba(74,207,90,0.08)' : 'rgba(232,82,56,0.08)',
              border: `1px solid ${res.ok ? 'rgba(74,207,90,0.3)' : 'rgba(232,82,56,0.3)'}`,
              borderRadius: 8, padding: '12px 16px',
            }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: res.ok ? '#4ACF5A' : '#E85238' }}>
              {res.titulo}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#8A8A8A', wordBreak: 'break-all' }}>
              {res.detalhe}
            </p>
          </div>
        ))}

        {rodando && (
          <div style={{ color: '#6B6B6B', fontSize: 13 }}>Rodando testes...</div>
        )}
      </div>

      <p style={{ marginTop: 32, fontSize: 11, color: '#3A3A3A' }}>
        Acesse: purion-os.vercel.app/diagnostico
      </p>
    </div>
  )
}
