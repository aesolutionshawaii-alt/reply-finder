import { inngest } from './inngest';
import { getActiveUsersByDeliveryHour, getMonitoredAccounts, getUserProfile, logEmail, MonitoredAccount, UserProfile } from './db';
import { findOpportunities } from './reply-finder';
import { sendDigestEmail } from './email';

// Function to process a single user's digest
export const sendUserDigest = inngest.createFunction(
  {
    id: 'send-user-digest',
    name: 'Send User Digest',
    retries: 2,
  },
  { event: 'digest/send' },
  async ({ event, step }) => {
    const { userId, email } = event.data;

    // Get user's monitored accounts
    const accounts = await step.run('get-accounts', async () => {
      return getMonitoredAccounts(userId);
    }) as unknown as MonitoredAccount[];

    if (accounts.length === 0) {
      console.log(`User ${email} has no monitored accounts, skipping`);
      return { status: 'skipped', reason: 'no_accounts' };
    }

    // Get user profile for AI reply generation
    const userProfile = await step.run('get-profile', async () => {
      return getUserProfile(userId);
    }) as unknown as UserProfile | null;

    const skipPolitical = userProfile?.skip_political ?? true;

    console.log(`Finding opportunities for ${email} (${accounts.length} accounts)`);

    // Find opportunities and generate replies
    const opportunities = await step.run('find-opportunities', async () => {
      return findOpportunities(accounts, userProfile, 10, skipPolitical);
    });

    if (opportunities.length === 0) {
      console.log(`No opportunities found for ${email}`);
      await step.run('log-no-opportunities', async () => {
        await logEmail(userId, 0, 'no_opportunities');
      });
      return { status: 'skipped', reason: 'no_opportunities' };
    }

    // Send email
    const result = await step.run('send-email', async () => {
      return sendDigestEmail(email, opportunities);
    });

    if (result.success) {
      await step.run('log-success', async () => {
        await logEmail(userId, opportunities.length, 'sent');
      });
      console.log(`Sent digest to ${email} with ${opportunities.length} opportunities`);
      return { status: 'sent', opportunities: opportunities.length };
    } else {
      await step.run('log-failure', async () => {
        await logEmail(userId, opportunities.length, 'failed');
      });
      console.error(`Failed to send to ${email}: ${result.error}`);
      return { status: 'failed', error: result.error };
    }
  }
);

// Function to trigger all user digests (called by cron)
export const triggerAllDigests = inngest.createFunction(
  {
    id: 'trigger-all-digests',
    name: 'Trigger All Digests',
    retries: 1,
  },
  { event: 'digest/trigger-all' },
  async ({ event, step }) => {
    const { hourUtc } = event.data;

    // Get active users whose delivery time matches the current hour
    const users = await step.run('get-users', async () => {
      return getActiveUsersByDeliveryHour(hourUtc);
    });

    console.log(`Triggering digests for ${users.length} users (hour UTC: ${hourUtc})`);

    // Send an event for each user
    await step.sendEvent(
      'send-user-events',
      users.map((user) => ({
        name: 'digest/send' as const,
        data: {
          userId: user.id,
          email: user.email,
        },
      }))
    );

    return { triggered: users.length };
  }
);

// Export all functions for the API route
export const functions = [sendUserDigest, triggerAllDigests];
