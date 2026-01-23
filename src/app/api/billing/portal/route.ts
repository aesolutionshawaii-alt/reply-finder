import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getUserByEmail } from '../../../../../lib/db';
import { getSession } from '../../../../../lib/auth';

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY not configured');
  return new Stripe(key);
}

export async function POST(request: NextRequest) {
  try {
    // Require authentication - use session email, not request body
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await getUserByEmail(session.email);
    if (!user || !user.stripe_customer_id) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
    }

    const stripe = getStripe();
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
    });

    return NextResponse.json({ url: portalSession.url });
  } catch (err) {
    console.error('Billing portal error:', err);
    return NextResponse.json({ error: 'Failed to create billing portal session' }, { status: 500 });
  }
}
