import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase/admin'

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  const stripe = getStripe()
  let event: Stripe.Event
  try {
    const body = await req.text()
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (e) {
    console.error('[stripe/webhook] signature error', e)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const db = supabaseAdmin()

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const sub = await stripe.subscriptions.retrieve(session.subscription as string)
    await db.from('assinaturas').upsert({
      stripe_customer_id:     session.customer as string,
      stripe_subscription_id: sub.id,
      plano:                  session.metadata?.plano ?? 'starter',
      status:                 sub.status,
      periodo_inicio:         new Date((sub as any).current_period_start * 1000).toISOString(),
      periodo_fim:            new Date((sub as any).current_period_end   * 1000).toISOString(),
      email:                  session.customer_email,
    }, { onConflict: 'stripe_subscription_id' })
  }

  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    await db.from('assinaturas').update({
      status:         sub.status,
      periodo_inicio: new Date((sub as any).current_period_start * 1000).toISOString(),
      periodo_fim:    new Date((sub as any).current_period_end   * 1000).toISOString(),
    }).eq('stripe_subscription_id', sub.id)
  }

  return NextResponse.json({ received: true })
}
