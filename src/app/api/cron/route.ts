import { NextRequest, NextResponse } from 'next/server';
import { inngest } from '../../../../lib/inngest';
import { getUserByEmail, getMonitoredAccounts, getUserProfile, logEmail } from '../../../../lib/db';
import { findOpportunities } from '../../../../lib/reply-finder';
import { sendDigestEmail } from '../../../../lib/email';
import { requireAuth, checkRateLimit, getClientIP } from '../../../../lib/auth';

export const maxDuration = 300; // 5 minutes for Vercel Pro

export async function GET(request: NextRequest) {
  const testEmail = request.nextUrl.searchParams.get('email');
  const cronSecret = request.nextUrl.searchParams.get('secret');

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

      const { success, error } = await sendDigestEmail(user.email, opportunities);

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
    const authHeader = request.headers.get('Authorization');
    const expectedSecret = process.env.CRON_SECRET;

    // Allow if: valid CRON_SECRET in query param OR Authorization header matches
    const isAuthorized =
      (expectedSecret && cronSecret === expectedSecret) ||
      (expectedSecret && authHeader === `Bearer ${expectedSecret}`);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentHourUtc = new Date().getUTCHours();

    await inngest.send({
      name: 'digest/trigger-all',
      data: { hourUtc: currentHourUtc },
    });

    return NextResponse.json({
      success: true,
      message: `Triggered digest processing for users scheduled at UTC hour ${currentHourUtc}`,
    });
  } catch (err) {
    console.error('Cron error:', err);
    return NextResponse.json(
      { error: 'Cron job failed', details: String(err) },
      { status: 500 }
    );
  }
}
