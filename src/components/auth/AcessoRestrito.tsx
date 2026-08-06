'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'

export function AcessoRestrito() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0D0D0D] px-6">
      <div className="max-w-sm text-center">
        <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#C9A84C]/30 bg-[#C9A84C]/10">
          <Lock size={24} className="text-[#C9A84C]" />
        </div>
        <h1 className="mb-2 text-lg font-semibold text-[#FAFAF8]">Acesso restrito ao administrador</h1>
        <p className="mb-8 text-sm leading-relaxed text-[#B8B8B8]">
          Esta área é exclusiva para o administrador master do sistema.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-[#C9A84C] px-7 py-2.5 text-sm font-semibold text-[#0D0D0D] transition-colors hover:bg-[#D4B568]"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
