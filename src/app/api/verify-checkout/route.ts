import { NextRequest, NextResponse } from 'next/server';
import { getStripe } from '../../../../lib/stripe';
import { createUser, getUserByEmail } from '../../../../lib/db';

// Verifies a checkout session and creates user if webhook failed
export async function POST(request: NextRequest) {
  try {
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    const stripe = getStripe();

    // Fetch the checkout session from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['customer', 'subscription'],
    });

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 });
    }

    const email = session.customer_details?.email;
    const customerId = typeof session.customer === 'string'
      ? session.customer
      : session.customer?.id;
    const subscriptionId = typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription?.id;

    if (!email) {
      return NextResponse.json({ error: 'No email in checkout session' }, { status: 400 });
    }

    // Check if user already exists
    let user = await getUserByEmail(email);

    if (user) {
      // User exists - might need to update their Stripe IDs if webhook partially failed
      console.log(`User ${email} already exists`);
      return NextResponse.json({
        success: true,
        email,
        status: 'existing',
        plan: user.plan,
      });
    }

    // User doesn't exist - webhook must have failed, create them now
    if (!customerId || !subscriptionId) {
      console.error('Missing Stripe IDs:', { customerId, subscriptionId });
      return NextResponse.json({
        error: 'Missing subscription data. Please contact support.',
        email,
      }, { status: 500 });
    }

    console.log(`Webhook recovery: Creating user ${email} from session ${sessionId}`);
    user = await createUser(email, customerId, subscriptionId);

    return NextResponse.json({
      success: true,
      email,
      status: 'created',
      plan: user.plan,
      recovered: true,
    });

  } catch (err) {
    console.error('Verify checkout error:', err);
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
  }
}
