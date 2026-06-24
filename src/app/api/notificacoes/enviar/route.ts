import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

// service_role não dispara o DEFAULT public.meu_tenant_id() — preencher manualmente
const PURION_TENANT_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

type Payload = {
  tenant_id?: string
  usuario_id?: string
  papel?: 'matheus' | 'joao' | 'gabriel'
  tipo: string
  titulo: string
  mensagem: string
  canal?: string[]
  link?: string
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Payload
    const { tipo, titulo, mensagem, canal = ['sistema'], link, tenant_id, usuario_id, papel } = body

    const db = supabaseAdmin()

    // 1. Insert into notificacoes table
    const { data: notif, error } = await db.from('notificacoes').insert({
      tenant_id: tenant_id ?? PURION_TENANT_ID, usuario_id, papel, tipo, titulo, mensagem, canal, link,
    }).select().single()

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

    let emailEnviado = false
    let whatsappEnviado = false

    // 2. Send email via Resend
    if (canal.includes('email') && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import('resend')
        const resend = new Resend(process.env.RESEND_API_KEY)
        await resend.emails.send({
          from: process.env.NOTIFICATION_EMAIL_FROM ?? 'PURION OS <noreply@puriongt.com.br>',
          to: [process.env.NOTIFICATION_EMAIL_TO ?? 'nortjota@gmail.com'],
          subject: titulo,
          html: buildEmailHtml({ titulo, mensagem, link }),
        })
        emailEnviado = true
      } catch (e) {
        console.error('[notificacoes/enviar] email error', e)
      }
    }

    // 3. Send WhatsApp
    if (canal.includes('whatsapp') && process.env.WHATSAPP_API_URL && process.env.WHATSAPP_TOKEN) {
      try {
        const r = await fetch(`${process.env.WHATSAPP_API_URL}/message/sendText/${process.env.WHATSAPP_INSTANCE}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Client-Token': process.env.WHATSAPP_TOKEN },
          body: JSON.stringify({ number: process.env.WHATSAPP_NUMBER, text: `*${titulo}*\n${mensagem}${link ? `\n\n${link}` : ''}` }),
        })
        whatsappEnviado = r.ok
      } catch (e) {
        console.error('[notificacoes/enviar] whatsapp error', e)
      }
    }

    // 4. Mark as sent
    await db.from('notificacoes').update({
      enviada: true, enviada_em: new Date().toISOString(),
    }).eq('id', notif.id)

    return NextResponse.json({ ok: true, id: notif.id, emailEnviado, whatsappEnviado })
  } catch (e) {
    console.error('[notificacoes/enviar]', e)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}

function buildEmailHtml({ titulo, mensagem, link }: { titulo: string; mensagem: string; link?: string }) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>${titulo}</title></head>
<body style="margin:0;padding:0;background:#0D0D0D;font-family:Inter,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#161616;border:1px solid #2A2A2A;border-radius:12px;overflow:hidden;">
        <!-- Header -->
        <tr><td style="padding:24px 32px;border-bottom:1px solid #2A2A2A;">
          <span style="font-size:18px;font-weight:700;color:#C9A84C;letter-spacing:0.12em;">PURION</span>
          <span style="font-size:11px;color:#555;margin-left:6px;">OS</span>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:32px;">
          <h2 style="font-size:18px;font-weight:700;color:#E5E5E5;margin:0 0 16px;">${titulo}</h2>
          <p style="font-size:14px;color:#999;line-height:1.7;margin:0 0 24px;">${mensagem}</p>
          ${link ? `<a href="${link}" style="display:inline-block;padding:12px 24px;background:#C9A84C;color:#0D0D0D;font-weight:700;font-size:13px;border-radius:8px;text-decoration:none;">Ver detalhes →</a>` : ''}
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid #2A2A2A;text-align:center;">
          <p style="font-size:11px;color:#444;margin:0;">PURION OS · Sistema Operacional para Marcas DTC</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}
