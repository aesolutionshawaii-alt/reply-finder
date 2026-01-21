import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, saveMonitoredAccounts } from '../../../../../lib/db';

// Update monitored accounts for existing users
// Usage: POST /api/admin/update-accounts
// Body: { email, accounts: ["handle1", "handle2", ...] }
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, accounts } = body;

    if (!email || !accounts || !Array.isArray(accounts)) {
      return NextResponse.json({ error: 'Email and accounts array required' }, { status: 400 });
    }

    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const cleanedAccounts = accounts.slice(0, 10).map((handle: string) => ({
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
