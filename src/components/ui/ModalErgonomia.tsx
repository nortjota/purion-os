'use client'

import { useEffect } from 'react'

const SEL_FUNDO = '.modal-backdrop, [data-modal]'
const SEL_CAMPO = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([disabled]), textarea:not([disabled]), select:not([disabled])'

/**
 * Comportamento padrão para TODOS os modais do sistema, num lugar só:
 *  - Esc fecha o modal do topo (mesmo com o cursor dentro de um campo);
 *  - Ctrl/Cmd + Enter salva (envia o formulário ou aciona o botão principal);
 *  - ao abrir, o cursor vai para o primeiro campo.
 * Antes, cada modal implementava (ou não) isso por conta própria.
 */
export function ModalErgonomia() {
  useEffect(() => {
    const topo = () => {
      const fundos = document.querySelectorAll<HTMLElement>(SEL_FUNDO)
      return fundos.length ? fundos[fundos.length - 1] : null
    }

    function aoTeclar(e: KeyboardEvent) {
      const fundo = topo()
      if (!fundo) return

      if (e.key === 'Escape' && !e.defaultPrevented) {
        // clique no fundo = o mesmo caminho de fechar que o modal já tem
        fundo.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        return
      }

      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        const form = fundo.querySelector('form')
        if (form) { e.preventDefault(); form.requestSubmit(); return }
        const botoes = fundo.querySelectorAll<HTMLButtonElement>('.btn-accent:not(:disabled), .btn-primary:not(:disabled)')
        const principal = botoes[botoes.length - 1]
        if (principal) { e.preventDefault(); principal.click() }
      }
    }

    // foco no primeiro campo quando um modal aparece
    const observador = new MutationObserver((mudancas) => {
      for (const m of mudancas) {
        for (const no of m.addedNodes) {
          if (!(no instanceof HTMLElement)) continue
          const fundo = no.matches(SEL_FUNDO) ? no : no.querySelector<HTMLElement>(SEL_FUNDO)
          if (!fundo) continue
          requestAnimationFrame(() => {
            if (fundo.contains(document.activeElement)) return
            fundo.querySelector<HTMLElement>(SEL_CAMPO)?.focus()
          })
          return
        }
      }
    })

    window.addEventListener('keydown', aoTeclar, true)
    observador.observe(document.body, { childList: true, subtree: true })
    return () => { window.removeEventListener('keydown', aoTeclar, true); observador.disconnect() }
  }, [])

  return null
}
