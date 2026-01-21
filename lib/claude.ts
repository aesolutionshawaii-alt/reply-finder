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
- Tone: ${user.tone}

Tweet to reply to:
@${tweet.authorHandle} (${tweet.authorName}) wrote:
"${tweet.text}"

Write a single reply tweet (max 280 chars) that:
1. Responds naturally to what they actually said
2. Matches ${user.displayName}'s tone: ${user.tone}
3. Does NOT force in ${user.displayName}'s job or expertise unless it's genuinely relevant
4. Just be a real person having a conversation
5. Could be agreement, a question, a take, humor - whatever fits

Bad: "As a marketing professional, I think..." (forced)
Good: "This happened to me last week..." (natural)

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
