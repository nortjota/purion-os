'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { dbLog } from '@/lib/dbLog'
import { useToast } from '@/components/ui/Toast'
import { useAuthContext } from '@/components/providers/AuthProvider'

/**
 * Preferência de menu por usuário — quais abas cada sócio escolheu ocultar da navegação.
 * Puramente visual: não bloqueia rotas nem apaga nada, só o que aparece no menu daquele usuário.
 * Sem linha salva para uma aba = aba visível (padrão).
 */
export function usePreferenciasMenu() {
  const { user } = useAuthContext()
  const { success, error: toastError } = useToast()
  const [ocultas, setOcultas] = useState<Set<string>>(new Set())
  const [carregando, setCarregando] = useState(true)

  const load = useCallback(async () => {
    const sb = supabase
    if (!sb || !user) { setCarregando(false); return }
    const { data, error } = await sb.from('preferencias_menu').select('aba_key, oculta').eq('oculta', true)
    dbLog('SELECT', 'preferencias_menu', error, `${data?.length ?? 0} rows`)
    if (data) setOcultas(new Set(data.map((r) => String(r.aba_key))))
    setCarregando(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function alternarAba(abaKey: string, oculta: boolean) {
    const sb = supabase
    if (!sb) return

    // Busca o usuário direto do Supabase (fonte autoritativa) em vez de confiar só no
    // contexto do AuthProvider — evita salvar com user_id indefinido se o contexto
    // ainda não propagou o usuário no momento do clique.
    const { data: { user: authUser }, error: userErr } = await sb.auth.getUser()
    console.log('[PURION] preferencias_menu — user_id ao salvar:', authUser?.id)
    if (userErr || !authUser) {
      toastError('Usuário não carregado', 'Aguarde o login terminar e tente de novo.')
      return
    }

    const { error } = await sb.from('preferencias_menu').upsert(
      { user_id: authUser.id, aba_key: abaKey, oculta, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,aba_key' }
    )
    dbLog('UPSERT', 'preferencias_menu', error, `${abaKey} (user=${authUser.id})`)
    if (error) { toastError('Erro ao salvar preferência de menu', error.message); return }
    setOcultas((prev) => {
      const next = new Set(prev)
      if (oculta) next.add(abaKey); else next.delete(abaKey)
      return next
    })
  }

  async function restaurarPadrao() {
    const sb = supabase
    if (!sb || !user) return
    const { error } = await sb.from('preferencias_menu').delete().not('aba_key', 'is', null)
    dbLog('DELETE', 'preferencias_menu (restaurar padrão)', error, 'todas as abas do usuário')
    if (error) { toastError('Erro ao restaurar menu padrão', error.message); return }
    setOcultas(new Set())
    success('Menu restaurado ao padrão')
  }

  return { ocultas, carregando, alternarAba, restaurarPadrao }
}
