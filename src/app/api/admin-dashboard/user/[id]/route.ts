import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../../lib/auth';
import { getUserById, getUserProfile, getMonitoredAccounts, updateUserPlan, deleteUser } from '../../../../../../lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profile = await getUserProfile(userId);
    const accounts = await getMonitoredAccounts(userId);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      plan: user.plan,
      status: user.status,
      stripeCustomerId: user.stripe_customer_id,
      stripeSubscriptionId: user.stripe_subscription_id,
      deliveryHourUtc: user.delivery_hour_utc,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      profile: profile ? {
        displayName: profile.display_name,
        bio: profile.bio,
        expertise: profile.expertise,
        tone: profile.tone,
        exampleReplies: profile.example_replies,
        skipPolitical: profile.skip_political,
      } : null,
      accounts: accounts.map(a => a.handle),
    });
  } catch (err) {
    if (err instanceof Error && err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin get user error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { plan, status } = body;

    if (plan && !['free', 'pro'].includes(plan)) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
    }

    if (status && !['active', 'canceled', 'past_due'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await updateUserPlan(userId, plan || user.plan, status);

    return NextResponse.json({ success: true, message: 'User updated' });
  } catch (err) {
    if (err instanceof Error && err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin update user error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin(request);

    const { id } = await params;
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }

    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await deleteUser(userId);

    return NextResponse.json({ success: true, message: 'User deleted' });
  } catch (err) {
    if (err instanceof Error && err.message === 'Not authorized') {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Admin delete user error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
