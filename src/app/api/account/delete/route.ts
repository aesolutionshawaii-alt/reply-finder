import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, clearSessionCookie } from '../../../../../lib/auth';
import { getUserById, deleteUser, getDb } from '../../../../../lib/db';
import { getStripe } from '../../../../../lib/stripe';

export async function DELETE(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth(request);
    const userId = session.user_id;

    // Get user to check for Stripe subscription
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cancel Stripe subscription if one exists
    if (user.stripe_subscription_id) {
      try {
        const stripe = getStripe();
        await stripe.subscriptions.cancel(user.stripe_subscription_id);
      } catch (stripeError) {
        // Log but don't fail - subscription may already be canceled
        console.warn('Failed to cancel Stripe subscription:', stripeError);
      }
    }

    // Delete all sessions for this user
    const sql = getDb();
    await sql`DELETE FROM sessions WHERE user_id = ${userId}`;

    // Delete the user (CASCADE handles related records)
    await deleteUser(userId);

    // Clear session cookie
    await clearSessionCookie();

    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.error('Account deletion error:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}

// Also support POST for clients that don't support DELETE
export async function POST(request: NextRequest) {
  return DELETE(request);
}
