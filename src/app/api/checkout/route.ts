import { NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe';

async function createCheckoutSession() {
  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID not configured');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: appUrl,
  });

  return session;
}

export async function GET() {
  try {
    const session = await createCheckoutSession();
    return NextResponse.redirect(session.url!);
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.redirect(new URL('/?error=checkout_failed', process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'));
  }
}

export async function POST() {
  try {
    const session = await createCheckoutSession();
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Checkout error:', err);
    return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 });
  }
}
