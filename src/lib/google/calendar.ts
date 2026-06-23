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

function getOAuthClient() {
  const clientId     = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    return null
  }

  const client = new google.auth.OAuth2(clientId, clientSecret)
  client.setCredentials({ refresh_token: refreshToken })
  return client
}

function getCalendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID || 'primary'
}

export function googleCalendarConfigurado(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_REFRESH_TOKEN)
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
  const auth = getOAuthClient()
  if (!auth) return null

  const calendar = google.calendar({ version: 'v3', auth })
  const res = await calendar.events.insert({
    calendarId: getCalendarId(),
    requestBody: toEventBody(input),
  })
  return res.data.id ?? null
}

/** Atualiza um evento existente pelo ID. Retorna true se sucesso. */
export async function atualizarEvento(eventId: string, input: EventoCalendarInput): Promise<boolean> {
  const auth = getOAuthClient()
  if (!auth) return false

  const calendar = google.calendar({ version: 'v3', auth })
  await calendar.events.update({
    calendarId: getCalendarId(),
    eventId,
    requestBody: toEventBody(input),
  })
  return true
}

/** Remove um evento do calendário pelo ID. Retorna true se sucesso (ou se já não existia). */
export async function deletarEvento(eventId: string): Promise<boolean> {
  const auth = getOAuthClient()
  if (!auth) return false

  const calendar = google.calendar({ version: 'v3', auth })
  try {
    await calendar.events.delete({ calendarId: getCalendarId(), eventId })
  } catch (err: unknown) {
    // 410/404 = evento já removido — não é um erro real para o nosso fluxo
    const status = (err as { code?: number; response?: { status?: number } })?.response?.status
      ?? (err as { code?: number })?.code
    if (status !== 404 && status !== 410) throw err
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
