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
      accounts: accounts.map(a => a.handle),
      profile: profile ? {
        displayName: profile.display_name,
        bio: profile.bio,
        expertise: profile.expertise,
        tone: profile.tone,
        exampleReplies: profile.example_replies,
      } : null,
    });
  } catch (err) {
    console.error('Dashboard user error:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
