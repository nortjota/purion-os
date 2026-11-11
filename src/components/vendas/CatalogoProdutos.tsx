'use client'

import { useState } from 'react'
import { Package, AlertTriangle, Info } from 'lucide-react'
import { usePurionStore } from '@/store'
import { useCatalogoSKU } from '@/hooks/useCatalogoSKU'
import { margemSku, economiaKit, TIPO_SKU_LABEL, type SkuCatalogo } from '@/lib/escadaProdutos'
import { fmtR } from '@/lib/vendas-helpers'

const ACENTO = '#D4FC3C'

function CampoPreco({ sku, onSalvar }: { sku: SkuCatalogo; onSalvar: (preco: number | null) => void }) {
  const [texto, setTexto] = useState(sku.preco != null ? sku.preco.toFixed(2).replace('.', ',') : '')
  const editavel = sku.id != null

  function salvar() {
    const limpo = texto.trim().replace(/\./g, '').replace(',', '.')
    const novo = limpo === '' ? null : Number(limpo)
    if (novo != null && (!Number.isFinite(novo) || novo < 0)) { setTexto(sku.preco != null ? sku.preco.toFixed(2).replace('.', ',') : ''); return }
    if (novo === sku.preco) return
    onSalvar(novo)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 13, color: '#B8B8B8' }}>R$</span>
      <input
        className="input-purion"
        inputMode="decimal"
        value={texto}
        disabled={!editavel}
        placeholder="a validar"
        onChange={(e) => setTexto(e.target.value)}
        onBlur={salvar}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        style={{ width: 110, height: 34, fontSize: 14, fontWeight: 600 }}
      />
    </div>
  )
}

/** Catálogo da escada de produtos: preço, nº de frascos, margem, economia do kit; editável (preço, ativo). */
export function CatalogoProdutos() {
  const { configuracoes } = usePurionStore()
  const { skus, origem, atualizarSku } = useCatalogoSKU()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
        <Package size={18} style={{ color: ACENTO, marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 240 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#F5F5F5' }}>Escada de produtos</h2>
          <p style={{ fontSize: 13, color: '#B8B8B8', marginTop: 2 }}>
            Uma única fragrância PURION GT. Kits são mais frascos dela; o Discovery é uma amostra dela.
            Um Kit 3 conta como <strong style={{ color: '#E0E0E0' }}>1 pedido</strong> e baixa <strong style={{ color: '#E0E0E0' }}>3 frascos</strong> do estoque.
          </p>
        </div>
      </div>

      {origem === 'padrao' && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(230,195,116,0.1)', border: '1px solid rgba(230,195,116,0.4)', color: 'var(--status-warning)', fontSize: 13 }}>
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          Mostrando a escada padrão (somente leitura). Rode <code>supabase/migration_escada_produtos_sku.sql</code> para editar preços e ativar/desativar SKUs.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
        {skus.map((s) => {
          const margem = margemSku(s)
          const economia = economiaKit(s, configuracoes.precoB2C)
          return (
            <div key={s.codigo} className="card-purion" style={{ padding: '14px 16px', opacity: s.ativo ? 1 : 0.6, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F5' }}>{s.nome}</p>
                  <span style={{
                    display: 'inline-block', marginTop: 4, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                    background: s.tipo === 'discovery' ? 'rgba(74,144,217,0.15)' : s.tipo === 'kit' ? 'rgba(212,252,60,0.15)' : 'rgba(255,255,255,0.06)',
                    color: s.tipo === 'discovery' ? '#7FB3EA' : s.tipo === 'kit' ? ACENTO : '#E0E0E0',
                  }}>
                    {TIPO_SKU_LABEL[s.tipo]}{s.tipo === 'discovery' ? ' · aquisição' : ''}
                  </span>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#E0E0E0', cursor: s.id ? 'pointer' : 'not-allowed' }}>
                  <input type="checkbox" checked={s.ativo} disabled={!s.id}
                    onChange={(e) => atualizarSku(s.id, { ativo: e.target.checked })}
                    style={{ width: 16, height: 16, accentColor: ACENTO }} />
                  Ativo
                </label>
              </div>

              <CampoPreco key={`${s.id}-${s.preco}`} sku={s} onSalvar={(preco) => atualizarSku(s.id, { preco })} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <p style={{ fontSize: 11, color: '#B8B8B8' }}>Frascos do estoque</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F5' }}>{s.qtdFrascos === 0 ? '0 (amostra)' : s.qtdFrascos}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#B8B8B8' }}>Custo de produção</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: '#F5F5F5' }}>{s.custoProducao != null ? fmtR(s.custoProducao) : 'a validar'}</p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#B8B8B8' }}>Margem bruta</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: margem == null ? 'var(--status-warning)' : margem >= (configuracoes.margemMinimaAlvo ?? 0.65) ? 'var(--status-ok)' : 'var(--status-danger)' }}>
                    {margem == null ? 'a validar' : `${(margem * 100).toFixed(0)}%`}
                  </p>
                </div>
                <div>
                  <p style={{ fontSize: 11, color: '#B8B8B8' }}>Economia p/ cliente</p>
                  <p style={{ fontSize: 15, fontWeight: 600, color: economia ? ACENTO : '#B8B8B8' }}>{economia != null ? fmtR(economia) : '—'}</p>
                </div>
              </div>

              {s.descricao && (
                <p style={{ fontSize: 12, color: '#B8B8B8', display: 'flex', gap: 6 }}>
                  <Info size={12} style={{ flexShrink: 0, marginTop: 2 }} /> {s.descricao}
                </p>
              )}
              {s.precoAValidar && (
                <p style={{ fontSize: 12, color: 'var(--status-warning)' }}>Preço e margem a validar — o crédito do Discovery é convertível na compra do frasco full size.</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
