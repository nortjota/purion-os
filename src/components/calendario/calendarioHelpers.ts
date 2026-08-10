import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addDays, addMonths, subMonths, format, isSameDay, isSameMonth, isToday, isBefore,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { EventoCalendario, TipoEvento, PerfilUsuario } from '@/store'
import { COR_TIPO_EVENTO } from '@/hooks/useEventosCalendario'

// Padrão BR: semana começa no domingo
const WEEK_OPTS = { weekStartsOn: 0 as const }

export { COR_TIPO_EVENTO }

export const TIPO_EVENTO_LABEL: Record<TipoEvento, string> = {
  reuniao:          'Reunião',
  tarefa:           'Prazo de tarefa',
  followup:         'Follow-up B2B',
  data_importante:  'Data importante',
  post:             'Post',
  outro:            'Outro',
}

export function corEvento(evento: EventoCalendario): string {
  return evento.cor ?? COR_TIPO_EVENTO[evento.tipo]
}

export function gerarGradeMes(mesReferencia: Date): Date[] {
  const inicio = startOfWeek(startOfMonth(mesReferencia), WEEK_OPTS)
  const fim = endOfWeek(endOfMonth(mesReferencia), WEEK_OPTS)
  return eachDayOfInterval({ start: inicio, end: fim })
}

export function gerarGradeSemana(dataReferencia: Date): Date[] {
  const inicio = startOfWeek(dataReferencia, WEEK_OPTS)
  const fim = endOfWeek(dataReferencia, WEEK_OPTS)
  return eachDayOfInterval({ start: inicio, end: fim })
}

export function eventosNoDia(eventos: EventoCalendario[], dia: Date): EventoCalendario[] {
  return eventos.filter((e) => isSameDay(new Date(e.dataInicio), dia))
}

export function eventoPassado(evento: EventoCalendario): boolean {
  return isBefore(new Date(evento.dataInicio), new Date()) && !isToday(new Date(evento.dataInicio))
}

export function formatarDiaCurto(data: Date): string {
  return format(data, 'd', { locale: ptBR })
}

export function formatarMesAno(data: Date): string {
  return format(data, "MMMM 'de' yyyy", { locale: ptBR })
}

export function formatarDataCompleta(iso: string): string {
  return format(new Date(iso), "dd/MM/yyyy", { locale: ptBR })
}

export function formatarHora(iso: string): string {
  return format(new Date(iso), 'HH:mm', { locale: ptBR })
}

export function formatarDiaSemanaLabel(data: Date): string {
  return format(data, 'EEEEEE', { locale: ptBR }).toUpperCase()
}

export const LEMBRETE_OPCOES = [
  { valor: 10, label: '10 minutos antes' },
  { valor: 60, label: '1 hora antes' },
  { valor: 1440, label: '1 dia antes' },
  { valor: 2880, label: '2 dias antes' },
]

export const RESPONSAVEIS: Array<{ id: PerfilUsuario; nome: string }> = [
  { id: 'matheus', nome: 'Matheus' },
  { id: 'joao',    nome: 'João' },
  { id: 'gabriel', nome: 'Gabriel' },
]

export { addDays, addMonths, subMonths, isSameDay, isSameMonth, isToday }
