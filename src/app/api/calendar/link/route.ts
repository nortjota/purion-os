import { NextResponse } from 'next/server'
import { linkAssinarCalendario, googleCalendarConfigurado } from '@/lib/google/calendar'

export const runtime = 'nodejs'

/** Retorna o link público de assinatura do calendário central — sem expor nenhum segredo. */
export async function GET() {
  return NextResponse.json({
    configurado: googleCalendarConfigurado(),
    link: linkAssinarCalendario(),
  })
}
