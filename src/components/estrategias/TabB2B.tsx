'use client'

import { useState } from 'react'
import { ShieldCheck, ChevronDown, MessageCircleQuestion } from 'lucide-react'
import { FunilB2B } from '@/components/crm/FunilB2B'
import { SecaoNotas } from './SecaoNotas'

const REGRAS_DE_OURO = [
  { titulo: 'Tabela não se negocia', desc: 'O preço da tabela é fixo. Negociar preço corrói margem e posicionamento premium.' },
  { titulo: 'Degrau de 20un em vez de desconto', desc: 'Quer condição melhor? Sobe volume em degraus de 20 unidades — nunca desconto direto.' },
  { titulo: 'Tester fica no balcão', desc: 'O tester é ferramenta de experiência no ponto de venda, não brinde para levar embora.' },
  { titulo: 'D+21 é sagrado', desc: 'O follow-up de reposição no dia 21 após a venda nunca é pulado — é o motor da recompra.' },
]

interface Objecao {
  pergunta: string
  resposta: string
}

const OBJECOES: Objecao[] = [
  {
    pergunta: '"Está caro"',
    resposta: 'Não vendemos aromatizante, vendemos uma experiência de estética premium — o preço reflete a fragrância exclusiva, a durabilidade e o giro que ele gera para o negócio do parceiro. Compare o custo por dia de uso, não o preço da unidade.',
  },
  {
    pergunta: '"Já tenho aromatizante"',
    resposta: 'Ótimo — isso mostra que a categoria já vende no espaço dele. A pergunta é: a fragrância atual está gerando recompra e diferenciação, ou é só mais um produto de prateleira? Ofereça o tester para comparação direta.',
  },
  {
    pergunta: '"Consignação?"',
    resposta: 'Não trabalhamos com consignação — isso tira o compromisso do parceiro com o giro do produto. Trabalhamos com degraus de volume e suporte de reposição D+21 para garantir que o estoque sempre vire.',
  },
  {
    pergunta: '"Vou pensar"',
    resposta: 'Sem problema. Deixe o tester no balcão essa semana e agende o follow-up. Na prática, "vou pensar" quase sempre quer dizer "preciso ver funcionando" — o tester resolve isso melhor que qualquer argumento.',
  },
]

function CardObjecao({ item }: { item: Objecao }) {
  const [aberto, setAberto] = useState(false)
  return (
    <div className="card-purion" style={{ padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setAberto((v) => !v)}
        style={{
          width: '100%', padding: '12px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div className="flex items-center gap-2">
          <MessageCircleQuestion size={14} style={{ color: '#E8A838' }} />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{item.pergunta}</span>
        </div>
        <ChevronDown size={14} style={{ color: 'var(--text-secondary)', transform: aberto ? 'rotate(180deg)' : undefined, transition: 'transform 0.2s ease' }} />
      </button>
      {aberto && (
        <div style={{ padding: '0 16px 14px 40px' }}>
          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{item.resposta}</p>
        </div>
      )}
    </div>
  )
}

export function TabB2B() {
  return (
    <div className="flex flex-col gap-5">
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) minmax(240px,1fr)', gap: 20, alignItems: 'start' }} className="tab-b2b-grid">
        <div>
          <FunilB2B />
        </div>

        <div className="flex flex-col gap-4">
          <div className="card-purion" style={{ padding: '14px 16px' }}>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck size={15} style={{ color: '#C9A84C' }} />
              <p style={{ fontSize: 13, fontWeight: 700 }}>Regras de Ouro B2B</p>
            </div>
            <div className="flex flex-col gap-3">
              {REGRAS_DE_OURO.map((r) => (
                <div key={r.titulo}>
                  <p style={{ fontSize: 12, fontWeight: 700, color: '#C9A84C' }}>{r.titulo}</p>
                  <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4, marginTop: 2 }}>{r.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>Objeções & Respostas</p>
            <div className="flex flex-col gap-2">
              {OBJECOES.map((o) => <CardObjecao key={o.pergunta} item={o} />)}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .tab-b2b-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SecaoNotas secao="b2b" />
    </div>
  )
}
