'use client'

import { useCatalogoSKU } from '@/hooks/useCatalogoSKU'
import { fmtR } from '@/lib/vendas-helpers'
import type { SkuCatalogo } from '@/lib/escadaProdutos'

/** Seletor da escada de produtos (frasco / Kit 2 / Kit 3 / Discovery). Ao escolher, o modal preenche o preço. */
export function SeletorSKU({ valor, onEscolher, precoFrasco }: {
  valor: string
  onEscolher: (sku: SkuCatalogo) => void
  /** preço exibido para o frasco avulso (B2B usa o preço ao parceiro) */
  precoFrasco?: number
}) {
  const { skus } = useCatalogoSKU()
  const visiveis = skus.filter((s) => s.ativo || s.codigo === valor)
  const atual = skus.find((s) => s.codigo === valor)

  return (
    <div>
      <select
        className="select-purion"
        value={valor}
        onChange={(e) => { const s = skus.find((x) => x.codigo === e.target.value); if (s) onEscolher(s) }}
      >
        {visiveis.map((s) => {
          const preco = s.codigo === 'frasco_60ml' && precoFrasco != null ? precoFrasco : s.preco
          return (
            <option key={s.codigo} value={s.codigo}>
              {s.nome} — {preco != null ? fmtR(preco) : 'preço a validar'}{s.qtdFrascos > 1 ? ` · ${s.qtdFrascos} frascos` : ''}
            </option>
          )
        })}
      </select>
      {atual && (
        <p style={{ fontSize: 11, color: '#B8B8B8', marginTop: 4 }}>
          {atual.qtdFrascos === 0
            ? 'Amostra — não baixa frascos do estoque.'
            : `Baixa ${atual.qtdFrascos} frasco${atual.qtdFrascos > 1 ? 's' : ''} do estoque por unidade vendida.`}
          {atual.economia ? ` Economia de ${fmtR(atual.economia)} para o cliente.` : ''}
        </p>
      )}
    </div>
  )
}
