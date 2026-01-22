import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/auth';
import { getAllUsersWithStats } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const users = await getAllUsersWithStats();

    return NextResponse.json(users.map(user => ({
      id: user.id,
      email: user.email,
      plan: user.plan,
      status: user.status,
      accountsCount: user.accounts_count,
      profileComplete: user.profile_complete,
      stripeCustomerId: user.stripe_customer_id,
      stripeSubscriptionId: user.stripe_subscription_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    })));
  } catch (err) {
    if (err instanceof Error && err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin users error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
