import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, saveMonitoredAccounts, saveUserProfile, calculateVoiceConfidence, VoiceAttributes, AvoidPattern, SampleTweet, SampleReply } from '../../../../lib/db';
import { fetchUserProfile } from '../../../../lib/twitter';
import { getSession } from '../../../../lib/auth';
import { getStripe } from '../../../../lib/stripe';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { accounts, profile, email: bodyEmail, stripeSessionId } = body;

    // Determine authenticated email via session OR valid Stripe session
    let authenticatedEmail: string | null = null;

    // First, try session cookie (for logged-in users)
    const session = await getSession(request);
    if (session) {
      authenticatedEmail = session.email;
    }
    // If no session, try Stripe sessionId (for post-checkout onboarding)
    else if (stripeSessionId) {
      try {
        const stripe = getStripe();
        const stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
        if (stripeSession.payment_status === 'paid' && stripeSession.customer_details?.email) {
          authenticatedEmail = stripeSession.customer_details.email;
        }
      } catch (stripeError) {
        console.error('Stripe session verification failed:', stripeError);
      }
    }

    // Require authentication
    if (!authenticatedEmail) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!accounts || !Array.isArray(accounts)) {
      return NextResponse.json(
        { error: 'Missing accounts' },
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

    // Get user using authenticated email (not body email)
    const user = await getUserByEmail(authenticatedEmail);
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

    // Fetch profile info sequentially with delay to avoid rate limits
    const accountsWithProfiles = [];
    for (const handle of handles) {
      try {
        const twitterProfile = await fetchUserProfile(handle);
        accountsWithProfiles.push({
          handle,
          name: twitterProfile?.name || undefined,
          isVerified: twitterProfile?.isVerified || false,
          profilePicture: twitterProfile?.profilePicture || undefined,
        });
      } catch {
        accountsWithProfiles.push({ handle, name: undefined, isVerified: false, profilePicture: undefined });
      }
      // Small delay between requests to avoid rate limiting
      if (handles.indexOf(handle) < handles.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    // Save accounts
    await saveMonitoredAccounts(user.id, accountsWithProfiles);

    // Save profile if provided
    if (profile) {
      const profileData = {
        displayName: profile.displayName,
        bio: profile.bio,
        expertise: profile.expertise,
        tone: profile.tone,
        exampleReplies: profile.exampleReplies,
        skipPolitical: profile.skipPolitical,
        // Voice learning fields
        xHandle: profile.xHandle,
        xBio: profile.xBio,
        positioning: profile.positioning,
        voiceAttributes: profile.voiceAttributes as VoiceAttributes | undefined,
        avoidPatterns: profile.avoidPatterns as AvoidPattern[] | undefined,
        sampleTweets: profile.sampleTweets as SampleTweet[] | undefined,
        sampleReplies: profile.sampleReplies as SampleReply[] | undefined,
      };

      // Calculate voice confidence
      const voiceConfidence = calculateVoiceConfidence(profileData);

      await saveUserProfile(user.id, {
        ...profileData,
        voiceConfidence,
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
