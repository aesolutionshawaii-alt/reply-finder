import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../../../lib/auth';
import { fetchUserFollowing } from '../../../../../lib/twitter';

export async function GET(request: NextRequest) {
  try {
    await requireAuth(request);

    const handle = request.nextUrl.searchParams.get('handle');
    if (!handle) {
      return NextResponse.json({ error: 'Handle required' }, { status: 400 });
    }

    const cleanHandle = handle.replace(/^@/, '').trim();
    if (!/^[a-zA-Z0-9_]{1,15}$/.test(cleanHandle)) {
      return NextResponse.json({ error: 'Invalid handle format' }, { status: 400 });
    }

    const result = await fetchUserFollowing(cleanHandle, 100);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Sort by followers (most followed first) and return top accounts
    const sorted = result.accounts
      .filter(a => a.userName)
      .sort((a, b) => b.followers - a.followers);

    return NextResponse.json({
      accounts: sorted.map(a => ({
        handle: a.userName,
        name: a.name,
        profilePicture: a.profilePicture,
        isVerified: a.isVerified,
        followers: a.followers,
      })),
    });
  } catch (err) {
    console.error('Following fetch error:', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to fetch following' }, { status: 500 });
  }
}
