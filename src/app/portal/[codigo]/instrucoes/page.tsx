import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'

export const revalidate = 3600

export async function generateMetadata({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  return {
    title: `Como usar seu link — ${codigo.toUpperCase()}`,
    robots: 'noindex, nofollow',
  }
}

const STEP_STYLE: React.CSSProperties = {
  display: 'flex',
  gap: 16,
  marginBottom: 28,
}

const NUM_STYLE: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: '50%',
  background: 'rgba(201,168,76,0.15)',
  border: '1px solid rgba(201,168,76,0.3)',
  color: '#C9A84C',
  fontSize: 13,
  fontWeight: 700,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
}

const CARD: React.CSSProperties = {
  background: '#161616',
  border: '1px solid rgba(255,255,255,0.07)',
  borderRadius: 16,
  padding: 20,
  marginBottom: 16,
}

const TAG: React.CSSProperties = {
  display: 'inline-block',
  fontSize: 10,
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: 20,
  background: 'rgba(201,168,76,0.12)',
  color: '#C9A84C',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  marginBottom: 6,
}

export default async function Page({ params }: { params: Promise<{ codigo: string }> }) {
  const { codigo } = await params
  const db = supabaseAdmin()

  const { data: afiliado } = await db
    .from('afiliados')
    .select('id, nome, codigo, link_afiliado')
    .eq('codigo', codigo.toUpperCase())
    .is('deleted_at', null)
    .single()

  if (!afiliado) notFound()

  const link = (afiliado.link_afiliado as string | null) ?? `https://puriongt.com.br?ref=${afiliado.codigo}`

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', color: '#E5E5E5', fontFamily: 'var(--font-sans, Inter, system-ui, sans-serif)' }}>
      {/* Header */}
      <div style={{ borderBottom: '1px solid rgba(201,168,76,0.2)', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'rgba(13,13,13,0.95)', backdropFilter: 'blur(8px)', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#C9A84C', letterSpacing: '0.12em' }}>PURION</span>
          <span style={{ fontSize: 11, color: 'rgba(229,229,229,0.3)' }}>|</span>
          <span style={{ fontSize: 12, color: 'rgba(229,229,229,0.5)' }}>Como usar seu link</span>
        </div>
        <Link href={`/portal/${afiliado.codigo}`} style={{ fontSize: 12, color: '#C9A84C', textDecoration: 'none' }}>
          ← Voltar
        </Link>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '28px 16px 80px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#E5E5E5', margin: '0 0 6px' }}>
          Como usar seu link de afiliado
        </h1>
        <p style={{ fontSize: 13, color: 'rgba(229,229,229,0.45)', margin: '0 0 28px' }}>
          Guia completo para maximizar seus resultados como afiliado PURION.
        </p>

        {/* Seu link */}
        <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.25)', borderRadius: 14, padding: 16, marginBottom: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 8px' }}>Seu link único</p>
          <p style={{ fontSize: 13, color: '#C9A84C', wordBreak: 'break-all', margin: 0, fontFamily: 'monospace', background: 'rgba(201,168,76,0.08)', padding: '10px 12px', borderRadius: 8 }}>
            {link}
          </p>
        </div>

        {/* Instagram Stories */}
        <div style={CARD}>
          <div style={TAG as React.CSSProperties}>Instagram</div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#E5E5E5', margin: '0 0 16px' }}>
            Como usar no Instagram
          </h2>

          <div style={STEP_STYLE}>
            <div style={NUM_STYLE}>1</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 4px' }}>Link na bio</p>
              <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.5)', margin: 0, lineHeight: 1.6 }}>
                Vá em <strong style={{ color: 'rgba(229,229,229,0.7)' }}>Editar perfil → Site</strong> e cole seu link. Ele ficará clicável para todos os seus seguidores 24h por dia.
              </p>
            </div>
          </div>

          <div style={STEP_STYLE}>
            <div style={NUM_STYLE}>2</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 4px' }}>Stories com link</p>
              <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.5)', margin: 0, lineHeight: 1.6 }}>
                Grave um Story mostrando o produto. Use o <strong style={{ color: 'rgba(229,229,229,0.7)' }}>sticker de link</strong> e cole seu link de afiliado. Sempre mencione &quot;link na bio&quot; nos posts do feed.
              </p>
            </div>
          </div>

          <div style={STEP_STYLE}>
            <div style={NUM_STYLE}>3</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 4px' }}>Reels</p>
              <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.5)', margin: 0, lineHeight: 1.6 }}>
                Crie Reels de 15–30 segundos mostrando o produto no carro. Na legenda, escreva: &quot;link do produto na bio 🔗&quot; e use o código <strong style={{ color: '#C9A84C' }}>{afiliado.codigo}</strong>.
              </p>
            </div>
          </div>
        </div>

        {/* TikTok */}
        <div style={CARD}>
          <div style={TAG as React.CSSProperties}>TikTok</div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#E5E5E5', margin: '0 0 16px' }}>
            Como usar no TikTok
          </h2>

          <div style={STEP_STYLE}>
            <div style={NUM_STYLE}>1</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 4px' }}>Link na bio</p>
              <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.5)', margin: 0, lineHeight: 1.6 }}>
                Em <strong style={{ color: 'rgba(229,229,229,0.7)' }}>Editar perfil → Site</strong>, cole seu link de afiliado. Contas com 1000+ seguidores podem colocar o link direto.
              </p>
            </div>
          </div>

          <div style={STEP_STYLE}>
            <div style={NUM_STYLE}>2</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 4px' }}>Mencione o código nos vídeos</p>
              <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.5)', margin: 0, lineHeight: 1.6 }}>
                Fale em voz alta: <strong style={{ color: '#C9A84C' }}>&quot;Entra no link da bio e usa o código {afiliado.codigo}&quot;</strong>. Isso funciona mesmo quando não é possível adicionar link clicável.
              </p>
            </div>
          </div>

          <div style={STEP_STYLE}>
            <div style={NUM_STYLE}>3</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 4px' }}>Formato ideal</p>
              <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.5)', margin: 0, lineHeight: 1.6 }}>
                Vídeos de <strong style={{ color: 'rgba(229,229,229,0.7)' }}>15–30 segundos</strong> mostrando o produto no carro com reação autêntica. Evite parecer propaganda — seja natural.
              </p>
            </div>
          </div>
        </div>

        {/* WhatsApp */}
        <div style={CARD}>
          <div style={TAG as React.CSSProperties}>WhatsApp</div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#E5E5E5', margin: '0 0 16px' }}>
            Como usar no WhatsApp
          </h2>

          <div style={STEP_STYLE}>
            <div style={NUM_STYLE}>1</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 4px' }}>Status do WhatsApp</p>
              <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.5)', margin: 0, lineHeight: 1.6 }}>
                Poste uma foto ou vídeo do produto no Status com seu link de afiliado na legenda. Renovar o Status diariamente aumenta muito a visibilidade.
              </p>
            </div>
          </div>

          <div style={STEP_STYLE}>
            <div style={NUM_STYLE}>2</div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#E5E5E5', margin: '0 0 4px' }}>Grupos</p>
              <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.5)', margin: 0, lineHeight: 1.6 }}>
                Compartilhe em grupos de entusiastas de carro, grupos da sua cidade ou grupos de automóveis. Seja natural — apresente o produto como uma recomendação genuína.
              </p>
            </div>
          </div>
        </div>

        {/* Exemplos de legenda */}
        <div style={CARD}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#E5E5E5', margin: '0 0 14px' }}>Exemplos de legenda prontos</p>

          {[
            {
              plataforma: 'Post feed',
              texto: `🚗 Seu carro merece cheirar incrível!\n\nDescobri a PURION — fragrâncias automotivas premium que transformam a experiência de dirigir. Tenho usado todo dia e não consigo parar 😍\n\nEntra no link da bio e usa meu código ${afiliado.codigo} para comprar!\n\n#PURION #PerfumeAutomotivo #CarroCheiroso`,
            },
            {
              plataforma: 'Stories rápido',
              texto: `Gente, precisam conhecer a PURION! 🔥 Melhor perfume para carro que já usei. Link na bio 👆 usa o código ${afiliado.codigo}`,
            },
            {
              plataforma: 'Grupo WhatsApp',
              texto: `Oi pessoal! Quem gosta de carro cheiroso precisa conhecer a PURION — fragrâncias automotivas premium. Estou adorando! Garantam o de vocês aqui: ${link}`,
            },
          ].map(({ plataforma, texto }) => (
            <div key={plataforma} style={{ marginBottom: 14, padding: 14, background: 'rgba(255,255,255,0.03)', borderRadius: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: 'rgba(229,229,229,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 8px' }}>{plataforma}</p>
              <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.6)', margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{texto}</p>
            </div>
          ))}
        </div>

        {/* Boas práticas */}
        <div style={{ background: 'rgba(201,168,76,0.03)', border: '1px solid rgba(201,168,76,0.15)', borderRadius: 16, padding: 20 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: '#C9A84C', margin: '0 0 14px' }}>Boas práticas</p>
          {[
            'Seja autêntico — recomendações genuínas convertem muito mais',
            'Publique com consistência: pelo menos 3–4x por semana',
            'Mostre o produto em uso real no seu carro',
            'Responda comentários e mensagens sobre o produto',
            'Nunca minta sobre o produto ou prometa resultados falsos',
            'Informe que é um link de afiliado quando necessário',
          ].map((tip, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: i < 5 ? 10 : 0 }}>
              <span style={{ color: '#C9A84C', fontSize: 13, flexShrink: 0, marginTop: 1 }}>✓</span>
              <p style={{ fontSize: 12, color: 'rgba(229,229,229,0.55)', margin: 0, lineHeight: 1.5 }}>{tip}</p>
            </div>
          ))}
        </div>

        {/* Voltar */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link
            href={`/portal/${afiliado.codigo}`}
            style={{ display: 'inline-block', padding: '10px 24px', borderRadius: 10, background: '#C9A84C', color: '#0D0D0D', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}
          >
            ← Ver meu portal
          </Link>
        </div>
      </div>
    </div>
  )
}
