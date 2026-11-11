'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'

export function AcessoRestrito() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0B0B0B] px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[var(--border)]/30 bg-[var(--primary)]/10">
          <Lock size={24} className="text-[var(--text-primary)]" />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-[#F5F5F0]">Acesso restrito ao administrador</h1>
        <p className="mb-8 text-sm leading-relaxed text-[#B8B8B8]">
          Esta área é exclusiva para o administrador master do sistema.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-[var(--primary)] px-7 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--brand-accent)]/85"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
