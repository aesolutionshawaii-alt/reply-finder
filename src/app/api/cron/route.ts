import { NextRequest, NextResponse } from 'next/server';
import { getActiveUsers, getMonitoredAccounts, logEmail } from '../../../../lib/db';
import { findOpportunities } from '../../../../lib/reply-finder';
import { sendDigestEmail } from '../../../../lib/email';

export const maxDuration = 300; // 5 minutes for Vercel Pro

export async function GET(request: NextRequest) {
  // Optional: filter to specific user for testing
  const testEmail = request.nextUrl.searchParams.get('email');

  try {
    // Get all active users
    let users = await getActiveUsers();

    // Filter if testing specific user
    if (testEmail) {
      users = users.filter((u) => u.email === testEmail);
    }

    console.log(`Processing ${users.length} users`);

    const results = [];

    for (const user of users) {
      try {
        // Get user's monitored accounts
        const accounts = await getMonitoredAccounts(user.id);

        if (accounts.length === 0) {
          console.log(`User ${user.email} has no monitored accounts, skipping`);
          continue;
        }

        console.log(`Finding opportunities for ${user.email} (${accounts.length} accounts)`);

        // Find opportunities
        const opportunities = await findOpportunities(accounts);

        if (opportunities.length === 0) {
          console.log(`No opportunities found for ${user.email}`);
          await logEmail(user.id, 0, 'no_opportunities');
          continue;
        }

        // Send email
        const { success, error } = await sendDigestEmail(user.email, opportunities);

        if (success) {
          await logEmail(user.id, opportunities.length, 'sent');
          results.push({ email: user.email, opportunities: opportunities.length, status: 'sent' });
          console.log(`Sent digest to ${user.email} with ${opportunities.length} opportunities`);
        } else {
          await logEmail(user.id, opportunities.length, 'failed');
          results.push({ email: user.email, status: 'failed', error });
          console.error(`Failed to send to ${user.email}: ${error}`);
        }
      } catch (err) {
        console.error(`Error processing user ${user.email}:`, err);
        results.push({ email: user.email, status: 'error', error: String(err) });
      }
    }

    return NextResponse.json({
      success: true,
      processed: users.length,
      results,
    });
  } catch (err) {
    console.error('Cron error:', err);
    return NextResponse.json(
      { error: 'Cron job failed', details: String(err) },
      { status: 500 }
    );
  }
}
