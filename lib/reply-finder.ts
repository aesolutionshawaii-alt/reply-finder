import { Tweet, fetchAccountTweets, isRecent } from './twitter';
import { MonitoredAccount, UserProfile } from './db';
import { ReplyOpportunity } from './email';
import { generateReply, UserContext, TweetContext } from './claude';

const POLITICAL_KEYWORDS = [
  'trump', 'biden', 'democrat', 'republican', 'gop', 'maga',
  'congress', 'senate', 'election', 'vote', 'voting', 'ballot',
  'liberal', 'conservative', 'left-wing', 'right-wing', 'leftist', 'rightist',
  'politician', 'political', 'politics', 'govt', 'government',
  'immigration', 'border wall', 'abortion', 'pro-life', 'pro-choice',
  'gun control', 'second amendment', '2nd amendment',
  'socialism', 'communism', 'fascism', 'marxist',
  'antifa', 'blm', 'woke', 'wokeism',
  'capitol', 'insurrection', 'impeach',
  'elon musk', 'doge', 'musk',
];

function isPolitical(text: string): boolean {
  const lower = text.toLowerCase();
  return POLITICAL_KEYWORDS.some(keyword => lower.includes(keyword));
}

function isQualityTweet(tweet: Tweet, skipPolitical: boolean = true): boolean {
  const text = tweet.text.trim();

  // Skip political content if enabled
  if (skipPolitical && isPolitical(text)) return false;

  // Skip very short tweets (under 50 chars of actual content)
  const textWithoutLinks = text.replace(/https?:\/\/\S+/g, '').trim();
  if (textWithoutLinks.length < 50) return false;

  // Skip replies to others (starts with @mention)
  if (text.startsWith('@')) return false;

  // Skip retweets
  if (text.startsWith('RT @')) return false;

  // Skip tweets that are mostly hashtags
  const hashtagCount = (text.match(/#\w+/g) || []).length;
  const words = text.split(/\s+/).length;
  if (hashtagCount > words / 2) return false;

  return true;
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
  userProfile: UserProfile | null,
  maxPerAccount: number = 10,
  skipPolitical: boolean = true
): Promise<ReplyOpportunity[]> {
  const allOpportunities: (ReplyOpportunity & { score: number; tweet: Tweet })[] = [];

  for (const account of accounts) {
    const { tweets, error } = await fetchAccountTweets(account.handle, maxPerAccount);

    if (error) {
      console.warn(`Failed to fetch @${account.handle}: ${error}`);
      continue;
    }

    for (const tweet of tweets) {
      if (!isRecent(tweet, 24)) continue;
      if (!isQualityTweet(tweet, skipPolitical)) continue;

      const opportunity: ReplyOpportunity & { score: number; tweet: Tweet } = {
        author: tweet.author.userName,
        authorName: tweet.author.name,
        text: tweet.text,
        url: tweet.url,
        likes: tweet.likeCount,
        retweets: tweet.retweetCount,
        score: scoreTweet(tweet),
        tweet,
      };

      allOpportunities.push(opportunity);
    }

    // Rate limit: 5 seconds between requests for free tier
    await new Promise((r) => setTimeout(r, 5500));
  }

  // Sort by score descending
  allOpportunities.sort((a, b) => b.score - a.score);

  // Take top 10
  const top10 = allOpportunities.slice(0, 10);

  // Generate AI replies if user has a profile
  if (userProfile && userProfile.bio) {
    const userContext: UserContext = {
      displayName: userProfile.display_name || 'User',
      bio: userProfile.bio || '',
      expertise: userProfile.expertise || '',
      tone: userProfile.tone || 'friendly and helpful',
      exampleReplies: userProfile.example_replies || '',
    };

    // Generate replies in parallel (batches of 3 to be safe with rate limits)
    for (let i = 0; i < top10.length; i += 3) {
      const batch = top10.slice(i, i + 3);
      await Promise.all(
        batch.map(async (opp) => {
          try {
            const tweetContext: TweetContext = {
              authorHandle: opp.author,
              authorName: opp.authorName,
              text: opp.text,
              likes: opp.likes,
              retweets: opp.retweets,
            };
            opp.draftReply = await generateReply(tweetContext, userContext);
          } catch (err) {
            console.error(`Failed to generate reply for tweet:`, err);
          }
        })
      );
    }
  }

  // Return without score and tweet fields
  return top10.map(({ score, tweet, ...opp }) => opp);
}
