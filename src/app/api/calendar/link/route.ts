import { NextResponse } from 'next/server'
import { linkAssinarCalendario, diagnosticoConfigGoogle } from '@/lib/google/calendar'

export const runtime = 'nodejs'

/** Retorna o link público de assinatura do calendário central e diagnóstico de config — sem expor nenhum segredo. */
export async function GET() {
  const { configurado, faltando } = diagnosticoConfigGoogle()
  return NextResponse.json({
    configurado,
    faltando, // nomes das env vars ausentes, nunca os valores
    link: linkAssinarCalendario(),
  })
}
