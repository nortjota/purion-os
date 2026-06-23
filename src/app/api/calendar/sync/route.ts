import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { supabaseAdmin } from '@/lib/supabase/admin'
import {
  criarEvento, atualizarEvento, deletarEvento, googleCalendarConfigurado,
} from '@/lib/google/calendar'

export const runtime = 'nodejs'

type SyncBody = {
  acao: 'criar' | 'atualizar' | 'deletar'
  tabela?: 'reunioes' | 'tarefas'
  reuniaoId: string
  titulo?: string
  descricao?: string
  inicio?: string
  duracaoMin?: number
  participantesEmails?: string[]
  allDay?: boolean
  googleEventId?: string | null
}

/**
 * Ponte client → Google Calendar. Nunca expõe credenciais ao browser —
 * o client só manda os dados da reunião, esta rota chama o helper
 * server-side e persiste o google_event_id no Supabase.
 *
 * Sync é best-effort: se o Google falhar ou não estiver configurado,
 * responde 200 com ok:false em vez de erro — a reunião já está salva
 * no CRM independentemente disso.
 */
export async function POST(req: NextRequest) {
  // ── Verificar sessão do usuário ──────────────────────────────
  const sessionClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => req.cookies.getAll(), setAll: () => {} } },
  )
  const { data: { user } } = await sessionClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Não autenticado' }, { status: 401 })
  }

  let body: SyncBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Body inválido' }, { status: 400 })
  }

  if (!googleCalendarConfigurado()) {
    return NextResponse.json({ ok: false, msg: 'Google Calendar não configurado — sync ignorada' })
  }

  const db = supabaseAdmin()
  const tabela = body.tabela ?? 'reunioes'

  try {
    if (body.acao === 'deletar') {
      if (body.googleEventId) await deletarEvento(body.googleEventId)
      await db.from(tabela).update({ google_event_id: null }).eq('id', body.reuniaoId)
      return NextResponse.json({ ok: true })
    }

    if (!body.titulo || !body.inicio || (!body.allDay && !body.duracaoMin)) {
      return NextResponse.json({ ok: false, error: 'Campos obrigatórios: titulo, inicio, duracaoMin (ou allDay)' }, { status: 422 })
    }

    const input = {
      titulo: body.titulo,
      descricao: body.descricao,
      inicio: body.inicio,
      duracaoMin: body.duracaoMin ?? 0,
      participantesEmails: body.participantesEmails,
      allDay: body.allDay,
    }

    if (body.acao === 'criar' || (body.acao === 'atualizar' && !body.googleEventId)) {
      const eventId = await criarEvento(input)
      if (eventId) await db.from(tabela).update({ google_event_id: eventId }).eq('id', body.reuniaoId)
      return NextResponse.json({ ok: !!eventId, googleEventId: eventId })
    }

    if (body.acao === 'atualizar' && body.googleEventId) {
      const ok = await atualizarEvento(body.googleEventId, input)
      return NextResponse.json({ ok, googleEventId: body.googleEventId })
    }

    return NextResponse.json({ ok: false, error: 'Ação inválida' }, { status: 400 })
  } catch (err) {
    // Best-effort: erro na sync NUNCA deve quebrar o fluxo do CRM —
    // apenas logamos e respondemos ok:false.
    console.error('[calendar/sync] erro:', err instanceof Error ? err.message : err)
    return NextResponse.json({ ok: false, error: 'Erro ao sincronizar com o Google Calendar (reunião já salva no CRM)' })
  }
}
