import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail, saveUserProfile, calculateVoiceConfidence, VoiceAttributes, AvoidPattern, SampleTweet, SampleReply } from '../../../../../lib/db';
import { requireAuth, checkRateLimit, getClientIP } from '../../../../../lib/auth';

// Update profile for authenticated users
export async function POST(request: NextRequest) {
  try {
    // Require authentication
    const session = await requireAuth(request);

    // Rate limit: 30 updates per hour
    const ip = getClientIP(request);
    const limit = await checkRateLimit(`profile:${ip}`, 30, 3600);
    if (!limit.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const body = await request.json();
    const {
      displayName,
      bio,
      expertise,
      tone,
      exampleReplies,
      skipPolitical,
      // Voice learning fields
      xHandle,
      xBio,
      positioning,
      voiceAttributes,
      avoidPatterns,
      sampleTweets,
      sampleReplies,
    } = body;

    const user = await getUserByEmail(session.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const profileData = {
      displayName,
      bio,
      expertise,
      tone,
      exampleReplies,
      skipPolitical,
      xHandle,
      xBio,
      positioning,
      voiceAttributes: voiceAttributes as VoiceAttributes | undefined,
      avoidPatterns: avoidPatterns as AvoidPattern[] | undefined,
      sampleTweets: sampleTweets as SampleTweet[] | undefined,
      sampleReplies: sampleReplies as SampleReply[] | undefined,
    };

    // Calculate voice confidence
    const voiceConfidence = calculateVoiceConfidence(profileData);

    await saveUserProfile(user.id, {
      ...profileData,
      voiceConfidence,
    });

    return NextResponse.json({
      success: true,
      message: 'Profile updated',
      voiceConfidence,
    });
  } catch (err) {
    console.error('Update profile error:', err);
    if (err instanceof Error && err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
