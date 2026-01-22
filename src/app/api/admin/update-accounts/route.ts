import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, saveMonitoredAccounts } from '../../../../../lib/db';
import { requireAuth, checkRateLimit, getClientIP } from '../../../../../lib/auth';
import { fetchUserProfile } from '../../../../../lib/twitter';

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
    const handles = accounts.slice(0, maxAccounts).map((handle: string) =>
      handle.replace(/^@/, '').trim()
    );

    // Fetch profile info sequentially with delay to avoid rate limits
    const accountsWithProfiles = [];
    for (const handle of handles) {
      try {
        const profile = await fetchUserProfile(handle);
        accountsWithProfiles.push({
          handle,
          name: profile?.name || undefined,
          isVerified: profile?.isVerified || false,
          profilePicture: profile?.profilePicture || undefined,
        });
      } catch {
        accountsWithProfiles.push({ handle, name: undefined, isVerified: false, profilePicture: undefined });
      }
      // Small delay between requests to avoid rate limiting
      if (handles.indexOf(handle) < handles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    await saveMonitoredAccounts(user.id, accountsWithProfiles);

    return NextResponse.json({
      success: true,
      message: `Saved ${accountsWithProfiles.length} accounts`,
      accounts: accountsWithProfiles.map(a => ({
        handle: a.handle,
        name: a.name,
        isVerified: a.isVerified,
      }))
    });
  } catch (err) {
    console.error('Update accounts error:', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update accounts' }, { status: 500 });
  }
}
