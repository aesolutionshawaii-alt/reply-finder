import { inngest } from './inngest';
import { getActiveUsersByDeliveryHour, getMonitoredAccounts, getUserProfile, logEmail, MonitoredAccount, UserProfile, createCronRun, updateCronRun, getDb, getSentTweetIds, saveSentTweets } from './db';
import { findOpportunities } from './reply-finder';
import { sendDigestEmail, sendCronAlertEmail } from './email';

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

    // Get previously sent tweet IDs to avoid duplicates
    const sentTweetIds = await step.run('get-sent-tweets', async () => {
      return getSentTweetIds(userId);
    }) as unknown as string[];

    console.log(`Finding opportunities for ${email} (${accounts.length} accounts, ${sentTweetIds.length} sent tweets to skip)`);

    // Find opportunities and generate replies
    const opportunities = await step.run('find-opportunities', async () => {
      return findOpportunities(accounts, userProfile, 10, skipPolitical, new Set(sentTweetIds));
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
      // Save sent tweet IDs to prevent duplicates in future emails
      await step.run('save-sent-tweets', async () => {
        const newTweetIds = opportunities.map(opp => opp.tweetId).filter(Boolean) as string[];
        if (newTweetIds.length > 0) {
          await saveSentTweets(userId, newTweetIds);
        }
      });
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

    // Create cron run record
    const cronRunId = await step.run('create-cron-run', async () => {
      return createCronRun(hourUtc);
    });

    try {
      // Get active users whose delivery time matches the current hour
      const users = await step.run('get-users', async () => {
        return getActiveUsersByDeliveryHour(hourUtc);
      });

      console.log(`Triggering digests for ${users.length} users (hour UTC: ${hourUtc})`);

      // Update cron run with users count
      await step.run('update-cron-triggered', async () => {
        await updateCronRun(cronRunId, { usersTriggered: users.length });
      });

      if (users.length === 0) {
        // No users to process
        await step.run('complete-empty-run', async () => {
          await updateCronRun(cronRunId, {
            status: 'completed',
            usersTriggered: 0,
            usersSent: 0,
            usersFailed: 0,
            usersSkipped: 0,
          });
        });

        // Still send alert for visibility
        await step.run('send-empty-alert', async () => {
          await sendCronAlertEmail({
            status: 'completed',
            hourUtc,
            usersTriggered: 0,
            usersSent: 0,
            usersFailed: 0,
            usersSkipped: 0,
          });
        });

        return { triggered: 0 };
      }

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

      // Wait for processing (allow time for all digests to complete)
      // Individual digests take ~30s each, but they run in parallel
      await step.sleep('wait-for-processing', '3m');

      // Aggregate results from email_log
      const results = await step.run('aggregate-results', async () => {
        const sql = getDb();
        // Get counts from the last 10 minutes
        const [counts] = await sql`
          SELECT
            COUNT(*) FILTER (WHERE status = 'sent')::int as sent,
            COUNT(*) FILTER (WHERE status = 'failed')::int as failed,
            COUNT(*) FILTER (WHERE status = 'no_opportunities')::int as skipped
          FROM email_log
          WHERE sent_at > NOW() - INTERVAL '10 minutes'
        `;
        return {
          sent: counts.sent || 0,
          failed: counts.failed || 0,
          skipped: counts.skipped || 0,
        };
      });

      // Update cron run with results
      await step.run('update-cron-complete', async () => {
        await updateCronRun(cronRunId, {
          status: 'completed',
          usersSent: results.sent,
          usersFailed: results.failed,
          usersSkipped: results.skipped,
        });
      });

      // Send admin alert
      await step.run('send-alert', async () => {
        await sendCronAlertEmail({
          status: 'completed',
          hourUtc,
          usersTriggered: users.length,
          usersSent: results.sent,
          usersFailed: results.failed,
          usersSkipped: results.skipped,
        });
      });

      return { triggered: users.length, ...results };
    } catch (error) {
      // Log failure
      await step.run('log-failure', async () => {
        await updateCronRun(cronRunId, {
          status: 'failed',
          error: String(error),
        });
      });

      // Send failure alert
      await step.run('send-failure-alert', async () => {
        await sendCronAlertEmail({
          status: 'failed',
          hourUtc,
          usersTriggered: 0,
          usersSent: 0,
          usersFailed: 0,
          usersSkipped: 0,
          error: String(error),
        });
      });

      throw error;
    }
  }
);

// Export all functions for the API route
export const functions = [sendUserDigest, triggerAllDigests];
