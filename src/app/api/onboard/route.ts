import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, saveMonitoredAccounts, saveUserProfile } from '../../../../lib/db';
import { fetchUserProfile } from '../../../../lib/twitter';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, accounts, profile } = body;

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
    const handles = accounts.map((account: string | { handle: string }) => {
      const handle = typeof account === 'string' ? account : account.handle;
      return handle.replace(/^@/, '').trim();
    });

    // Fetch profile info for each account (verification status, display name)
    const accountsWithProfiles = await Promise.all(
      handles.map(async (handle) => {
        try {
          const profile = await fetchUserProfile(handle);
          return {
            handle,
            name: profile?.name || undefined,
            isVerified: profile?.isVerified || false,
            profilePicture: profile?.profilePicture || undefined,
          };
        } catch {
          return { handle, name: undefined, isVerified: false, profilePicture: undefined };
        }
      })
    );

    // Save accounts
    await saveMonitoredAccounts(user.id, accountsWithProfiles);

    // Save profile if provided
    if (profile) {
      await saveUserProfile(user.id, {
        displayName: profile.displayName,
        bio: profile.bio,
        expertise: profile.expertise,
        tone: profile.tone,
        exampleReplies: profile.exampleReplies,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Saved ${accountsWithProfiles.length} accounts and profile`,
      accounts: accountsWithProfiles.map((a) => ({
        handle: a.handle,
        isVerified: a.isVerified,
      })),
    });
  } catch (err) {
    console.error('Onboard error:', err);
    return NextResponse.json(
      { error: 'Failed to save accounts' },
      { status: 500 }
    );
  }
}
