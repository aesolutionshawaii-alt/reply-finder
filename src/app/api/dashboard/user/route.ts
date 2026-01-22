import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, getMonitoredAccounts, getUserProfile } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Email required' }, { status: 400 });
  }

  try {
    const user = await getUserByEmail(email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const accounts = await getMonitoredAccounts(user.id);
    const profile = await getUserProfile(user.id);

    return NextResponse.json({
      email: user.email,
      status: user.status,
      plan: user.plan || 'pro',
      deliveryHourUtc: user.delivery_hour_utc ?? 16,
      accounts: accounts.map(a => ({
        handle: a.handle,
        name: a.name,
        isVerified: a.is_verified || false,
        profilePicture: a.profile_picture,
      })),
      profile: profile ? {
        displayName: profile.display_name,
        bio: profile.bio,
        expertise: profile.expertise,
        tone: profile.tone,
        exampleReplies: profile.example_replies,
        skipPolitical: profile.skip_political ?? true,
      } : null,
    });
  } catch (err) {
    console.error('Dashboard user error:', err);
    return NextResponse.json({ error: 'Failed to load user data' }, { status: 500 });
  }
}
