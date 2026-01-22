import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, checkRateLimit, getClientIP } from '../../../../../lib/auth';
import { fetchUserReplies } from '../../../../../lib/twitter';

// Import X profile data for voice learning
export async function GET(request: NextRequest) {
  try {
    // Require authentication
    await requireAuth(request);

    // Rate limit: 10 imports per hour
    const ip = getClientIP(request);
    const limit = await checkRateLimit(`import-voice:${ip}`, 10, 3600);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
    }

    const searchParams = request.nextUrl.searchParams;
    const handle = searchParams.get('handle');

    if (!handle) {
      return NextResponse.json({ error: 'Handle parameter required' }, { status: 400 });
    }

    // Clean handle (remove @)
    const cleanHandle = handle.replace(/^@/, '').trim();

    if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanHandle)) {
      return NextResponse.json({ error: 'Invalid handle format' }, { status: 400 });
    }

    // Fetch user profile and recent tweets/replies
    const result = await fetchUserReplies(cleanHandle, 30);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    if (!result.profile) {
      return NextResponse.json({ error: 'Could not find user. Make sure the handle is correct and the account is public.' }, { status: 404 });
    }

    return NextResponse.json({
      profile: {
        handle: result.profile.userName,
        name: result.profile.name,
        bio: result.profile.bio,
        profilePicture: result.profile.profilePicture,
        isVerified: result.profile.isVerified,
        followers: result.profile.followers,
      },
      // Return up to 5 sample replies for voice matching
      sampleReplies: result.replies.slice(0, 5).map(r => ({
        id: r.id,
        text: r.text,
        createdAt: r.createdAt,
      })),
      // Return up to 5 sample tweets
      sampleTweets: result.tweets.slice(0, 5).map(t => ({
        id: t.id,
        text: t.text,
        createdAt: t.createdAt,
      })),
    });
  } catch (err) {
    console.error('Import voice error:', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to import voice data' }, { status: 500 });
  }
}
