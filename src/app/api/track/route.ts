import { NextRequest, NextResponse } from 'next/server';
import { saveReplyFeedback, getUserById, updateVoiceConfidenceFromFeedback } from '../../../../lib/db';

// Whitelist allowed redirect domains to prevent open redirect attacks
function isAllowedRedirect(url: string): boolean {
  try {
    const parsed = new URL(url);
    const allowedDomains = ['twitter.com', 'x.com'];
    return allowedDomains.some(
      domain => parsed.hostname === domain || parsed.hostname.endsWith('.' + domain)
    );
  } catch {
    return false;
  }
}

// Tracking endpoint for email clicks
// GET /api/track?u={userId}&t={tweetId}&a={action}&d={draftReply}&r={redirect}
// Actions: copy, view, reply
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;

  const userId = searchParams.get('u');
  const tweetId = searchParams.get('t');
  const action = searchParams.get('a') || 'view';
  const draftReply = searchParams.get('d') || '';
  const redirect = searchParams.get('r');

  // Validate required params
  if (!userId || !tweetId) {
    // Still redirect if possible, just don't track (only to allowed domains)
    if (redirect && isAllowedRedirect(redirect)) {
      return NextResponse.redirect(redirect);
    }
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    // Verify user exists
    const user = await getUserById(parseInt(userId, 10));
    if (!user) {
      // User doesn't exist, still redirect (only to allowed domains)
      if (redirect && isAllowedRedirect(redirect)) {
        return NextResponse.redirect(redirect);
      }
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Map action to feedback type
    let feedbackType: 'copied' | 'used' | 'skipped' | 'edited' = 'copied';
    switch (action) {
      case 'copy':
        feedbackType = 'copied';
        break;
      case 'view':
      case 'reply':
        feedbackType = 'used'; // Clicked to view/reply = likely used
        break;
      default:
        feedbackType = 'copied';
    }

    // Save feedback
    await saveReplyFeedback(
      user.id,
      tweetId,
      redirect || null,
      decodeURIComponent(draftReply),
      feedbackType
    );

    // Update voice confidence in background (subtle increase based on usage)
    updateVoiceConfidenceFromFeedback(user.id).catch(err => {
      console.error('Failed to update voice confidence:', err);
    });

    // Redirect to the tweet (only to allowed domains)
    if (redirect && isAllowedRedirect(redirect)) {
      return NextResponse.redirect(redirect);
    }

    // No redirect specified, return success
    return NextResponse.json({ success: true, tracked: true });

  } catch (err) {
    console.error('Track error:', err);
    // Still redirect on error - don't break user flow (only to allowed domains)
    if (redirect && isAllowedRedirect(redirect)) {
      return NextResponse.redirect(redirect);
    }
    return NextResponse.json({ error: 'Tracking failed' }, { status: 500 });
  }
}
