import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, saveMonitoredAccounts } from '../../../../lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, accounts } = body;

    if (!email || !accounts || !Array.isArray(accounts)) {
      return NextResponse.json(
        { error: 'Missing email or accounts' },
        { status: 400 }
      );
    }

    // Validate accounts (max 10)
    if (accounts.length > 10) {
      return NextResponse.json(
        { error: 'Maximum 10 accounts allowed' },
        { status: 400 }
      );
    }

    // Get user
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found. Please complete checkout first.' },
        { status: 404 }
      );
    }

    if (user.status !== 'active') {
      return NextResponse.json(
        { error: 'Subscription not active' },
        { status: 403 }
      );
    }

    // Clean up handles (remove @ if present)
    const cleanedAccounts = accounts.map((account: string | { handle: string }) => {
      const handle = typeof account === 'string' ? account : account.handle;
      return {
        handle: handle.replace(/^@/, '').trim(),
      };
    });

    // Save accounts
    await saveMonitoredAccounts(user.id, cleanedAccounts);

    return NextResponse.json({
      success: true,
      message: `Saved ${cleanedAccounts.length} accounts`,
      accounts: cleanedAccounts.map((a) => a.handle),
    });
  } catch (err) {
    console.error('Onboard error:', err);
    return NextResponse.json(
      { error: 'Failed to save accounts' },
      { status: 500 }
    );
  }
}
