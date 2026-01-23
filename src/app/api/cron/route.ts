import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '../../../../lib/inngest';
import { getUserByEmail, getMonitoredAccounts, getUserProfile, logEmail, getActiveUsersByDeliveryHour } from '../../../../lib/db';
import { findOpportunities } from '../../../../lib/reply-finder';
import { sendDigestEmail } from '../../../../lib/email';
import { requireAuth, checkRateLimit, getClientIP } from '../../../../lib/auth';

export const maxDuration = 300; // 5 minutes for Vercel Pro

// Process a single user's digest directly (fallback when Inngest unavailable)
async function processUserDigest(userId: number, email: string): Promise<{ status: string; opportunities?: number; error?: string }> {
  try {
    const accounts = await getMonitoredAccounts(userId);
    if (accounts.length === 0) {
      return { status: 'skipped', error: 'no_accounts' };
    }

    const userProfile = await getUserProfile(userId);
    const skipPolitical = userProfile?.skip_political ?? true;

    const opportunities = await findOpportunities(accounts, userProfile, 10, skipPolitical);

    if (opportunities.length === 0) {
      await logEmail(userId, 0, 'no_opportunities');
      return { status: 'skipped', error: 'no_opportunities' };
    }

    const { success, error } = await sendDigestEmail(email, opportunities, userId);

    if (success) {
      await logEmail(userId, opportunities.length, 'sent');
      return { status: 'sent', opportunities: opportunities.length };
    } else {
      await logEmail(userId, opportunities.length, 'failed');
      return { status: 'failed', error };
    }
  } catch (err) {
    console.error(`Error processing digest for ${email}:`, err);
    return { status: 'failed', error: String(err) };
  }
}

export async function GET(request: NextRequest) {
  const testEmail = request.nextUrl.searchParams.get('email');

  try {
    // If testing a specific user (from dashboard), require authentication
    if (testEmail) {
      // Require auth for test digests
      const session = await requireAuth(request);

      // Only allow testing your own digest
      if (session.email.toLowerCase() !== testEmail.toLowerCase()) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Rate limit: 5 test digests per hour
      const ip = getClientIP(request);
      const limit = await checkRateLimit(`test-digest:${ip}`, 5, 3600);
      if (!limit.allowed) {
        return NextResponse.json({ error: 'Too many test digests. Try again later.' }, { status: 429 });
      }
      const user = await getUserByEmail(testEmail);
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const accounts = await getMonitoredAccounts(user.id);
      if (accounts.length === 0) {
        return NextResponse.json({ error: 'No monitored accounts' }, { status: 400 });
      }

      const userProfile = await getUserProfile(user.id);
      const skipPolitical = userProfile?.skip_political ?? true;

      console.log(`Test digest for ${testEmail} (${accounts.length} accounts)`);

      const opportunities = await findOpportunities(accounts, userProfile, 10, skipPolitical);

      if (opportunities.length === 0) {
        await logEmail(user.id, 0, 'no_opportunities');
        return NextResponse.json({ error: 'No opportunities found' }, { status: 200 });
      }

      const { success, error } = await sendDigestEmail(user.email, opportunities, user.id);

      if (success) {
        await logEmail(user.id, opportunities.length, 'sent');
        return NextResponse.json({ success: true, opportunities: opportunities.length });
      } else {
        await logEmail(user.id, opportunities.length, 'failed');
        return NextResponse.json({ error: `Failed to send: ${error}` }, { status: 500 });
      }
    }

    // For the hourly cron (no email param), verify cron secret
    // Vercel Cron automatically sends CRON_SECRET in the Authorization header
    // Security: Only accept Authorization header, not query params (which can be logged)
    const authHeader = request.headers.get('Authorization');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentHourUtc = new Date().getUTCHours();
    const useFallback = request.nextUrl.searchParams.get('fallback') === 'true';

    // Try Inngest first (unless fallback is forced)
    if (!useFallback) {
      try {
        await inngest.send({
          name: 'digest/trigger-all',
          data: { hourUtc: currentHourUtc },
        });

        return NextResponse.json({
          success: true,
          method: 'inngest',
          message: `Triggered digest processing for users scheduled at UTC hour ${currentHourUtc}`,
        });
      } catch (inngestError) {
        console.error('Inngest failed, falling back to direct processing:', inngestError);
        // Fall through to direct processing
      }
    }

    // Fallback: Process users directly
    console.log(`Processing digests directly for UTC hour ${currentHourUtc}`);

    const users = await getActiveUsersByDeliveryHour(currentHourUtc);

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        method: 'direct',
        message: `No users scheduled for UTC hour ${currentHourUtc}`,
        processed: 0,
      });
    }

    // Process users sequentially to avoid rate limits
    let sent = 0;
    let failed = 0;
    let skipped = 0;

    for (const user of users) {
      const result = await processUserDigest(user.id, user.email);
      if (result.status === 'sent') sent++;
      else if (result.status === 'failed') failed++;
      else skipped++;

      // Small delay between users to avoid rate limits
      if (users.indexOf(user) < users.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return NextResponse.json({
      success: true,
      method: 'direct',
      message: `Processed ${users.length} users directly`,
      processed: users.length,
      sent,
      failed,
      skipped,
    });
  } catch (err) {
    console.error('Cron error:', err);
    // Don't expose error details to client
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
