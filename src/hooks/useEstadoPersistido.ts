'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * useState que sobrevive a sair e voltar do módulo.
 * Guarda no sessionStorage: vale enquanto a aba do navegador estiver aberta e começa limpo
 * numa sessão nova — assim um filtro esquecido não esconde dados no dia seguinte.
 * Lê depois de montar (evita divergência entre servidor e navegador).
 */
export function useEstadoPersistido<T>(chave: string, inicial: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [valor, setValor] = useState<T>(inicial)
  const carregado = useRef(false)
  const nomeChave = `purion:estado:${chave}`

  useEffect(() => {
    try {
      const bruto = window.sessionStorage.getItem(nomeChave)
      if (bruto != null) {
        const salvo = JSON.parse(bruto) as T
        // objetos: mescla com o inicial para tolerar campos novos
        setValor(inicial && typeof inicial === 'object' && !Array.isArray(inicial) ? { ...inicial, ...salvo } : salvo)
      }
    } catch { /* preferência só visual */ }
    carregado.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nomeChave])

  useEffect(() => {
    if (!carregado.current) return
    try { window.sessionStorage.setItem(nomeChave, JSON.stringify(valor)) } catch { /* idem */ }
  }, [nomeChave, valor])

  return [valor, setValor]
}
