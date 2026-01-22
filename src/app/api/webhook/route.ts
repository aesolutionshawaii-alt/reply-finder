import { NextRequest, NextResponse } from 'next/server';
import { constructWebhookEvent } from '../../../../lib/stripe';
import { createUser, updateUserStatus } from '../../../../lib/db';

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  let event;
  try {
    event = constructWebhookEvent(payload, signature);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    console.log(`Webhook received: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const email = session.customer_details?.email;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        console.log('Checkout completed:', { email, customerId, subscriptionId, sessionId: session.id });

        if (!email || !customerId || !subscriptionId) {
          console.error('Missing required data in checkout session:', { email, customerId, subscriptionId });
          // Return 200 anyway - Stripe shouldn't retry, and we have recovery via verify-checkout
          break;
        }

        await createUser(email, customerId, subscriptionId);
        console.log(`Created user: ${email}`);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        const status = subscription.status;

        // Map Stripe status to our status
        let userStatus = 'active';
        if (status === 'canceled' || status === 'unpaid') {
          userStatus = 'canceled';
        } else if (status === 'past_due') {
          userStatus = 'past_due';
        }

        await updateUserStatus(customerId, userStatus);
        console.log(`Updated subscription status for ${customerId}: ${userStatus}`);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer as string;
        await updateUserStatus(customerId, 'canceled');
        console.log(`Subscription canceled for ${customerId}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }
}
