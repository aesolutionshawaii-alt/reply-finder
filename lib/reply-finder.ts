import { Tweet, fetchAccountTweets, isRecent } from './twitter';
import { MonitoredAccount } from './db';
import { ReplyOpportunity } from './email';

interface ReplyAngle {
  type: string;
  suggestion: string;
}

function suggestReplyAngles(tweet: Tweet): ReplyAngle[] {
  const angles: ReplyAngle[] = [];
  const text = tweet.text.toLowerCase();

  // Question tweets - great for replies
  if (text.includes('?')) {
    angles.push({
      type: 'answer',
      suggestion: 'Answer the question with your experience or perspective',
    });
  }

  // Opinion/hot take tweets
  if (text.includes('unpopular opinion') || text.includes('hot take') || text.includes('controversial')) {
    angles.push({
      type: 'agree-or-counter',
      suggestion: 'Share your take - agree with nuance or offer a respectful counter',
    });
  }

  // Thread starters
  if (text.includes('thread') || text.includes('🧵') || text.includes('1/')) {
    angles.push({
      type: 'thread-engage',
      suggestion: 'Add to the thread with your own insight or example',
    });
  }

  // Advice/tips content
  if (text.includes('tip') || text.includes('advice') || text.includes('lesson') || text.includes('learned')) {
    angles.push({
      type: 'add-value',
      suggestion: 'Add another tip or share how you applied this',
    });
  }

  // Wins/milestones
  if (text.includes('milestone') || text.includes('hit') || text.includes('reached') || text.includes('finally')) {
    angles.push({
      type: 'celebrate',
      suggestion: 'Genuine congratulations + ask a follow-up question',
    });
  }

  // Struggles/challenges
  if (text.includes('struggle') || text.includes('hard') || text.includes('difficult') || text.includes('challenge')) {
    angles.push({
      type: 'relate',
      suggestion: 'Share that you relate and offer encouragement or a tip',
    });
  }

  // High engagement = reply early for visibility
  if (tweet.likeCount > 500 || tweet.retweetCount > 100) {
    angles.push({
      type: 'early-reply',
      suggestion: 'High engagement tweet - reply early for visibility',
    });
  }

  // Large account = more visibility potential
  if (tweet.author.followers > 50000) {
    angles.push({
      type: 'visibility',
      suggestion: 'Large account - thoughtful reply could get good reach',
    });
  }

  // Default
  if (angles.length === 0) {
    angles.push({
      type: 'engage',
      suggestion: 'Share a genuine reaction or add to the conversation',
    });
  }

  return angles;
}

function scoreTweet(tweet: Tweet): number {
  let score = 0;

  // Engagement signals
  score += tweet.likeCount * 0.5;
  score += tweet.retweetCount * 2;
  score += tweet.replyCount * 1;

  // Recency bonus
  const hoursOld = (Date.now() - new Date(tweet.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursOld < 2) score *= 1.5;
  else if (hoursOld < 6) score *= 1.2;

  // Question bonus
  if (tweet.text.includes('?')) score *= 1.3;

  // Large account bonus
  if (tweet.author.followers > 100000) score *= 1.2;

  return score;
}

export async function findOpportunities(
  accounts: MonitoredAccount[],
  maxPerAccount: number = 10
): Promise<ReplyOpportunity[]> {
  const allOpportunities: (ReplyOpportunity & { score: number })[] = [];

  for (const account of accounts) {
    const { tweets, error } = await fetchAccountTweets(account.handle, maxPerAccount);

    if (error) {
      console.warn(`Failed to fetch @${account.handle}: ${error}`);
      continue;
    }

    for (const tweet of tweets) {
      if (!isRecent(tweet, 24)) continue;

      const opportunity: ReplyOpportunity & { score: number } = {
        author: tweet.author.userName,
        authorName: tweet.author.name,
        text: tweet.text,
        url: tweet.url,
        likes: tweet.likeCount,
        retweets: tweet.retweetCount,
        angles: suggestReplyAngles(tweet),
        score: scoreTweet(tweet),
      };

      allOpportunities.push(opportunity);
    }

    // Rate limit: 5 seconds between requests for free tier
    await new Promise((r) => setTimeout(r, 5500));
  }

  // Sort by score descending
  allOpportunities.sort((a, b) => b.score - a.score);

  // Return top 10, without the score field
  return allOpportunities.slice(0, 10).map(({ score, ...opp }) => opp);
}
