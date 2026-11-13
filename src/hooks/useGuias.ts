'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { FATOS_PADRAO, MODELOS_PADRAO, type Fato, type Modelo } from '@/lib/conhecimento/conteudo'

interface LinhaGuia { slug: string; tipo: 'modelo' | 'fato'; dados: Record<string, unknown>; oculto: boolean; usos: number }

/**
 * Guias da Central de Conhecimento: padrão do código + edições salvas em kb_guias.
 * Se a tabela ainda não existe (SQL não rodou), funciona só com o padrão e avisa que não salva.
 */
export function useGuias() {
  const [linhas, setLinhas] = useState<LinhaGuia[]>([])
  const [salvavel, setSalvavel] = useState(true)

  const carregar = useCallback(async () => {
    const sb = supabase
    if (!sb) { setSalvavel(false); return }
    const { data, error } = await sb.from('kb_guias').select('slug, tipo, dados, oculto, usos')
    dbLog('SELECT', 'kb_guias', error, `${data?.length ?? 0} rows`)
    if (error) { setSalvavel(false); return }
    setSalvavel(true)
    setLinhas((data ?? []) as LinhaGuia[])
  }, [])

  useEffect(() => {
    Promise.resolve().then(carregar)
    const sb = supabase
    if (!sb) return
    const ch = sb.channel(`kb-guias-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'kb_guias' }, carregar).subscribe()
    return () => { sb.removeChannel(ch) }
  }, [carregar])

  const porSlug = useMemo(() => new Map(linhas.map((l) => [l.slug, l])), [linhas])

  const modelos: Array<Modelo & { usos: number; editado: boolean }> = useMemo(() => {
    const padrao = MODELOS_PADRAO.map((m) => {
      const l = porSlug.get(m.slug)
      return l?.oculto ? null : { ...m, ...(l?.dados as Partial<Modelo> | undefined), slug: m.slug, usos: l?.usos ?? 0, editado: !!l && Object.keys(l.dados).length > 0 }
    }).filter(Boolean) as Array<Modelo & { usos: number; editado: boolean }>
    const novos = linhas.filter((l) => l.tipo === 'modelo' && !l.oculto && !MODELOS_PADRAO.some((m) => m.slug === l.slug))
      .map((l) => ({ ...(l.dados as unknown as Modelo), slug: l.slug, personalizado: true, usos: l.usos, editado: false }))
    return [...padrao, ...novos]
  }, [linhas, porSlug])

  const fatos: Fato[] = useMemo(() => {
    const padrao = FATOS_PADRAO.map((f) => { const v = porSlug.get(`fato:${f.slug}`)?.dados?.valor; return typeof v === 'string' ? { ...f, valor: v } : f })
    const novos = linhas.filter((l) => l.tipo === 'fato' && !FATOS_PADRAO.some((f) => `fato:${f.slug}` === l.slug))
      .map((l) => ({ slug: l.slug.replace(/^fato:/, ''), grupo: String(l.dados.grupo ?? 'Outros'), rotulo: String(l.dados.rotulo ?? ''), valor: String(l.dados.valor ?? ''), editavel: true }))
    return [...padrao, ...novos]
  }, [linhas, porSlug])

  async function gravar(slug: string, tipo: 'modelo' | 'fato', mudar: Partial<Pick<LinhaGuia, 'dados' | 'oculto' | 'usos'>>) {
    const sb = supabase
    if (!sb || !salvavel) return { ok: false as const, erro: 'Rode supabase/migration_conhecimento_guias.sql para salvar edições' }
    const atual = porSlug.get(slug)
    const { error } = await sb.from('kb_guias').upsert({
      slug, tipo, dados: mudar.dados ?? atual?.dados ?? {}, oculto: mudar.oculto ?? atual?.oculto ?? false,
      usos: mudar.usos ?? atual?.usos ?? 0, updated_at: new Date().toISOString(),
    }, { onConflict: 'tenant_id,slug' })
    dbLog('UPSERT', 'kb_guias', error, slug)
    if (error) return { ok: false as const, erro: error.message }
    await carregar()
    return { ok: true as const }
  }

  return {
    modelos, fatos, salvavel,
    salvarModelo: (m: Modelo) => {
      const { slug, ...dados } = m
      return gravar(slug, 'modelo', { dados: dados as Record<string, unknown> })
    },
    restaurarModelo: (slug: string) => gravar(slug, 'modelo', { dados: {}, oculto: false }),
    ocultarModelo: (slug: string) => gravar(slug, 'modelo', { oculto: true }),
    contarUso: (slug: string) => {
      if (!salvavel) return
      const atual = porSlug.get(slug)
      gravar(slug, 'modelo', { usos: (atual?.usos ?? 0) + 1 })
    },
    salvarFato: (slug: string, valor: string) => gravar(`fato:${slug}`, 'fato', { dados: { valor } }),
  }
}
