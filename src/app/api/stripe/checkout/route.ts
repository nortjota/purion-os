import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-05-27.dahlia' })
}

const PRICE_IDS: Record<string, string | undefined> = {
  starter:      process.env.STRIPE_PRICE_STARTER,
  profissional: process.env.STRIPE_PRICE_PROFISSIONAL,
  enterprise:   process.env.STRIPE_PRICE_ENTERPRISE,
}

export async function POST(req: NextRequest) {
  try {
    const { plano, email } = await req.json() as { plano: string; email?: string }
    const price = PRICE_IDS[plano]
    if (!price) return NextResponse.json({ error: 'Plano inválido' }, { status: 400 })

    const stripe = getStripe()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price, quantity: 1 }],
      customer_email: email,
      success_url: `${appUrl}/planos?sucesso=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/planos?cancelado=1`,
      metadata: { plano },
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    console.error('[stripe/checkout]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
