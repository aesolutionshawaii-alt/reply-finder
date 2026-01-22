import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, updateUserDeliveryTime } from '../../../../../lib/db';
import { requireAuth, checkRateLimit, getClientIP } from '../../../../../lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth(request);

    // Rate limit: 20 updates per hour
    const ip = getClientIP(request);
    const limit = await checkRateLimit(`delivery:${ip}`, 20, 3600);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { deliveryHourUtc } = await request.json();

    if (deliveryHourUtc === undefined || deliveryHourUtc < 0 || deliveryHourUtc > 23) {
      return NextResponse.json({ error: 'Invalid delivery hour (must be 0-23)' }, { status: 400 });
    }

    const user = await getUserByEmail(session.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await updateUserDeliveryTime(user.id, deliveryHourUtc);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Update delivery time error:', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update delivery time' }, { status: 500 });
  }
}
