import Anthropic from '@anthropic-ai/sdk';

let anthropicClient: Anthropic | null = null;

function getAnthropic(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    anthropicClient = new Anthropic({ apiKey });
  }
  return anthropicClient;
}

export interface TweetContext {
  authorHandle: string;
  authorName: string;
  text: string;
  likes: number;
  retweets: number;
}

export interface UserContext {
  displayName: string;
  bio: string;
  expertise: string;
  tone: string;
  exampleReplies: string;
}

export async function generateReply(
  tweet: TweetContext,
  user: UserContext
): Promise<string> {
  const anthropic = getAnthropic();

  const prompt = `You are helping ${user.displayName} write a reply to a tweet.

About ${user.displayName}:
- Bio: ${user.bio}
- Expertise: ${user.expertise}
- Tone: ${user.tone}

Examples of their past replies (match this voice):
${user.exampleReplies}

Tweet to reply to:
@${tweet.authorHandle} (${tweet.authorName}) wrote:
"${tweet.text}"
(${tweet.likes} likes, ${tweet.retweets} retweets)

Write a single reply tweet (max 280 chars) that:
1. Matches ${user.displayName}'s voice and tone exactly
2. Adds genuine value or insight from their expertise
3. Feels natural, not salesy or try-hard
4. Could spark a conversation

Reply only with the tweet text, no quotes, no explanation.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  return textBlock.text.trim();
}

export async function generateRepliesBatch(
  tweets: TweetContext[],
  user: UserContext
): Promise<Map<string, string>> {
  const replies = new Map<string, string>();

  // Process in parallel with some concurrency limit
  const batchSize = 5;
  for (let i = 0; i < tweets.length; i += batchSize) {
    const batch = tweets.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(async (tweet) => {
        try {
          const reply = await generateReply(tweet, user);
          return { tweet, reply };
        } catch (err) {
          console.error(`Failed to generate reply for @${tweet.authorHandle}:`, err);
          return { tweet, reply: null };
        }
      })
    );

    for (const { tweet, reply } of results) {
      if (reply) {
        // Use tweet text as key since we don't have tweet IDs here
        replies.set(tweet.text, reply);
      }
    }
  }

  return replies;
}
