import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '../../../../../lib/auth';
import { getUserByEmail, getMonitoredAccounts, getUserProfile } from '../../../../../lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);

    if (!session) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const user = await getUserByEmail(session.email);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const accounts = await getMonitoredAccounts(user.id);
    const profile = await getUserProfile(user.id);

    return NextResponse.json({
      authenticated: true,
      email: user.email,
      status: user.status,
      plan: user.plan || 'free',
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
        // Voice learning fields
        xHandle: profile.x_handle,
        xBio: profile.x_bio,
        positioning: profile.positioning,
        voiceAttributes: profile.voice_attributes || {},
        avoidPatterns: profile.avoid_patterns || [],
        sampleTweets: profile.sample_tweets || [],
        sampleReplies: profile.sample_replies || [],
        voiceConfidence: profile.voice_confidence || 0,
      } : null,
    });
  } catch (err) {
    console.error('Session check error:', err);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
