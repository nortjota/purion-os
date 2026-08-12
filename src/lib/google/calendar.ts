/**
 * PURION OS — Google Calendar (conta central puriongt@gmail.com)
 *
 * SERVER-SIDE APENAS. Nunca importar este arquivo em componentes
 * com 'use client' — as credenciais (client secret, refresh token)
 * jamais podem chegar ao browser.
 *
 * Uso: chamado pela rota /api/calendar/sync, nunca diretamente
 * pelos hooks do client.
 */

import { google } from 'googleapis'

export interface EventoCalendarInput {
  titulo: string
  descricao?: string
  inicio: string   // ISO datetime, ou 'YYYY-MM-DD' quando allDay
  duracaoMin: number
  participantesEmails?: string[]
  allDay?: boolean
}

/** Nomes das env vars obrigatórias, na ordem em que são checadas. */
const ENV_VARS_OBRIGATORIAS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REFRESH_TOKEN'] as const

/**
 * Diagnóstico de configuração — nunca expõe valores, só quais nomes de
 * variável estão ausentes em process.env. Use para logar/depurar sem
 * vazar segredo nenhum.
 */
export function diagnosticoConfigGoogle(): { configurado: boolean; faltando: string[] } {
  const faltando = ENV_VARS_OBRIGATORIAS.filter((nome) => !process.env[nome])
  return { configurado: faltando.length === 0, faltando }
}

export function googleCalendarConfigurado(): boolean {
  return diagnosticoConfigGoogle().configurado
}

function getOAuthClient() {
  const { configurado, faltando } = diagnosticoConfigGoogle()
  if (!configurado) {
    console.warn('[google/calendar] credenciais ausentes em process.env:', faltando.join(', '))
    return null
  }

  const client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET)
  client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return client
}

function getCalendarId(): string {
  const id = process.env.GOOGLE_CALENDAR_ID
  if (!id) console.warn('[google/calendar] GOOGLE_CALENDAR_ID não definido — usando "primary"')
  return id || 'primary'
}

/** Erro da API do Google traduzido para uma mensagem acionável (nunca vaza credenciais). */
function explicarErroGoogle(err: unknown): string {
  const status = (err as { code?: number; response?: { status?: number } })?.response?.status
    ?? (err as { code?: number })?.code
  const msg = err instanceof Error ? err.message : String(err)
  if (status === 404) {
    return `Google Calendar respondeu 404 (Not Found) — verifique se GOOGLE_CALENDAR_ID ("${getCalendarId()}") existe e se a conta autenticada (GOOGLE_REFRESH_TOKEN) tem acesso a ele. Detalhe: ${msg}`
  }
  if (status === 401 || status === 403) {
    return `Google Calendar recusou a credencial (${status}) — GOOGLE_CLIENT_ID/SECRET/REFRESH_TOKEN podem estar expirados ou incorretos. Detalhe: ${msg}`
  }
  return `Erro ao chamar a API do Google Calendar (status ${status ?? 'desconhecido'}): ${msg}`
}

function toEventBody(input: EventoCalendarInput) {
  if (input.allDay) {
    const dia = input.inicio.slice(0, 10)
    const proximoDia = new Date(dia + 'T00:00:00Z')
    proximoDia.setUTCDate(proximoDia.getUTCDate() + 1)
    return {
      summary: input.titulo,
      description: input.descricao ?? '',
      start: { date: dia },
      end:   { date: proximoDia.toISOString().slice(0, 10) },
    }
  }

  const inicio = new Date(input.inicio)
  const fim = new Date(inicio.getTime() + input.duracaoMin * 60_000)
  return {
    summary: input.titulo,
    description: input.descricao ?? '',
    start: { dateTime: inicio.toISOString() },
    end:   { dateTime: fim.toISOString() },
    attendees: (input.participantesEmails ?? [])
      .filter(Boolean)
      .map((email) => ({ email })),
  }
}

/** Cria um evento no calendário central. Retorna o ID do evento criado, ou null se falhar/não configurado. */
export async function criarEvento(input: EventoCalendarInput): Promise<string | null> {
  console.log('[google/calendar] criarEvento: verificando credenciais…')
  const auth = getOAuthClient()
  if (!auth) {
    console.warn('[google/calendar] criarEvento: abortado — credenciais ausentes')
    return null
  }

  const calendarId = getCalendarId()
  console.log(`[google/calendar] criarEvento: chamando calendar.events.insert (calendarId="${calendarId}")`)
  try {
    const calendar = google.calendar({ version: 'v3', auth })
    const res = await calendar.events.insert({
      calendarId,
      requestBody: toEventBody(input),
    })
    console.log(`[google/calendar] criarEvento: sucesso, eventId=${res.data.id}`)
    return res.data.id ?? null
  } catch (err) {
    console.error('[google/calendar] criarEvento: falhou —', explicarErroGoogle(err))
    throw err
  }
}

/** Atualiza um evento existente pelo ID. Retorna true se sucesso. */
export async function atualizarEvento(eventId: string, input: EventoCalendarInput): Promise<boolean> {
  console.log(`[google/calendar] atualizarEvento(${eventId}): verificando credenciais…`)
  const auth = getOAuthClient()
  if (!auth) {
    console.warn('[google/calendar] atualizarEvento: abortado — credenciais ausentes')
    return false
  }

  const calendarId = getCalendarId()
  console.log(`[google/calendar] atualizarEvento: chamando calendar.events.update (calendarId="${calendarId}", eventId="${eventId}")`)
  try {
    const calendar = google.calendar({ version: 'v3', auth })
    await calendar.events.update({
      calendarId,
      eventId,
      requestBody: toEventBody(input),
    })
    console.log('[google/calendar] atualizarEvento: sucesso')
    return true
  } catch (err) {
    console.error('[google/calendar] atualizarEvento: falhou —', explicarErroGoogle(err))
    throw err
  }
}

/** Remove um evento do calendário pelo ID. Retorna true se sucesso (ou se já não existia). */
export async function deletarEvento(eventId: string): Promise<boolean> {
  console.log(`[google/calendar] deletarEvento(${eventId}): verificando credenciais…`)
  const auth = getOAuthClient()
  if (!auth) {
    console.warn('[google/calendar] deletarEvento: abortado — credenciais ausentes')
    return false
  }

  const calendarId = getCalendarId()
  console.log(`[google/calendar] deletarEvento: chamando calendar.events.delete (calendarId="${calendarId}", eventId="${eventId}")`)
  const calendar = google.calendar({ version: 'v3', auth })
  try {
    await calendar.events.delete({ calendarId, eventId })
    console.log('[google/calendar] deletarEvento: sucesso')
  } catch (err: unknown) {
    // 410/404 = evento já removido — não é um erro real para o nosso fluxo
    const status = (err as { code?: number; response?: { status?: number } })?.response?.status
      ?? (err as { code?: number })?.code
    if (status !== 404 && status !== 410) {
      console.error('[google/calendar] deletarEvento: falhou —', explicarErroGoogle(err))
      throw err
    }
    console.log('[google/calendar] deletarEvento: evento já não existia (404/410), ignorando')
  }
  return true
}

/** Lista eventos do calendário central num intervalo. */
export async function listarEventos(deISO: string, ateISO: string) {
  const auth = getOAuthClient()
  if (!auth) return []

  const calendar = google.calendar({ version: 'v3', auth })
  const res = await calendar.events.list({
    calendarId: getCalendarId(),
    timeMin: deISO,
    timeMax: ateISO,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 250,
  })
  return res.data.items ?? []
}

/**
 * Link público para qualquer sócio assinar o calendário central no Gmail
 * pessoal. Só funciona com um GOOGLE_CALENDAR_ID explícito (o e-mail da
 * conta central) — 'primary' não é válido como cid para terceiros.
 */
export function linkAssinarCalendario(): string | null {
  const calendarId = process.env.GOOGLE_CALENDAR_ID
  if (!calendarId || calendarId === 'primary') return null
  return `https://calendar.google.com/calendar/u/0/r?cid=${encodeURIComponent(calendarId)}`
}
