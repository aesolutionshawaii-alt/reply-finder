import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, saveMonitoredAccounts } from '../../../../../lib/db';
import { requireAuth, checkRateLimit, getClientIP } from '../../../../../lib/auth';

// Update monitored accounts for authenticated users
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth(request);

    // Rate limit: 30 updates per hour
    const ip = getClientIP(request);
    const limit = await checkRateLimit(`accounts:${ip}`, 30, 3600);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const { accounts } = body;

    if (!accounts || !Array.isArray(accounts)) {
      return NextResponse.json({ error: 'Accounts array required' }, { status: 400 });
    }

    const user = await getUserByEmail(session.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Limit based on plan: free = 1, pro = 10
    const maxAccounts = user.plan === 'free' ? 1 : 10;
    const cleanedAccounts = accounts.slice(0, maxAccounts).map((handle: string) => ({
      handle: handle.replace(/^@/, '').trim(),
    }));

    await saveMonitoredAccounts(user.id, cleanedAccounts);

    return NextResponse.json({
      success: true,
      message: `Saved ${cleanedAccounts.length} accounts`,
      accounts: cleanedAccounts.map(a => a.handle)
    });
  } catch (err) {
    console.error('Update accounts error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
