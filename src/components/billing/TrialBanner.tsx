'use client'

import { useState, useEffect } from 'react'
import { X, Zap } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export function TrialBanner() {
  const [show, setShow]         = useState(false)
  const [diasRestantes, setDias] = useState<number | null>(null)
  const router                  = useRouter()

  useEffect(() => {
    if (!supabase) return
    const dismissed = localStorage.getItem('purion_trial_dismissed')
    if (dismissed) return

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      // Count days since signup
      const criado = new Date(user.created_at)
      const diff   = Math.floor((Date.now() - criado.getTime()) / 86_400_000)
      const trial  = 14
      const restantes = trial - diff
      if (restantes > 0 && restantes <= 14) {
        setDias(restantes)
        setShow(true)
      }
    })
  }, [])

  function dispensar() {
    localStorage.setItem('purion_trial_dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={{
      position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 100, background: '#C9A84C', color: '#0D0D0D',
      borderRadius: 12, padding: '12px 20px',
      display: 'flex', alignItems: 'center', gap: 12,
      boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
      maxWidth: 'calc(100vw - 32px)',
    }}>
      <Zap size={16} style={{ flexShrink: 0 }} />
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
        {diasRestantes} {diasRestantes === 1 ? 'dia restante' : 'dias restantes'} no trial — assine para continuar.
      </p>
      <button
        onClick={() => { router.push('/planos'); dispensar() }}
        style={{ padding: '5px 14px', borderRadius: 7, border: '2px solid #0D0D0D', background: '#0D0D0D', color: '#C9A84C', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>
        Ver planos
      </button>
      <button onClick={dispensar} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#0D0D0D', padding: 2, flexShrink: 0 }}>
        <X size={14} />
      </button>
    </div>
  )
}
