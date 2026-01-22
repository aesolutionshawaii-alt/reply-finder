import Anthropic from '@anthropic-ai/sdk';
import { VoiceAttributes, AvoidPattern, SampleReply } from './db';

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
  // Voice learning fields
  voiceConfidence?: number;
  positioning?: string;
  voiceAttributes?: VoiceAttributes;
  avoidPatterns?: AvoidPattern[];
  sampleReplies?: SampleReply[];
}

// Map avoid patterns to readable descriptions
const AVOID_PATTERN_DESCRIPTIONS: Record<AvoidPattern, string> = {
  hype_words: 'hype words like "love this", "game changer", "absolutely"',
  ending_questions: 'questions at the end of replies',
  self_promotion: 'forced self-promotion or mentioning your company',
  corporate_jargon: 'corporate jargon like "synergy", "leverage", "bandwidth"',
  emojis: 'emojis',
  hashtags: 'hashtags',
  generic_agreement: 'generic agreement like "So true", "This", "100%"',
  unsolicited_advice: 'unsolicited advice starting with "You should..."',
};

// Map voice attributes to style guidance
const VOICE_STYLE_GUIDANCE: Record<string, Record<string, string>> = {
  conversationStyle: {
    celebratory: 'When someone shares good news, acknowledge their achievement directly',
    curious: 'When someone shares news, ask a follow-up question to learn more',
    relatable: 'When someone shares news, connect with empathy and shared experience',
    analytical: 'When someone shares news, provide objective context or perspective',
  },
  disagreementApproach: {
    direct: 'When disagreeing, state your position clearly and confidently',
    nuanced: 'When disagreeing, acknowledge valid points while offering alternatives',
    questioning: 'When disagreeing, ask clarifying questions that reveal issues',
    agreeing: 'When disagreeing, reframe the issue rather than directly opposing',
  },
  valueAddStyle: {
    tactical: 'Add value by sharing specific, actionable advice from experience',
    encouraging: 'Add value by offering encouragement and perspective on the journey',
    reframing: 'Add value by helping people see problems from a different angle',
    storytelling: 'Add value by sharing relevant personal stories and outcomes',
  },
  humorLevel: {
    sarcastic: 'Use dry wit and sarcasm when appropriate',
    factual: 'Keep responses straight and factual, minimal humor',
    'self-deprecating': 'Use self-deprecating humor when relevant',
    none: 'Keep responses serious and professional',
  },
  expertiseDisplay: {
    credentialed: 'Reference your experience and credentials when relevant',
    'insight-focused': 'Share counterintuitive insights without credential-dropping',
    questioning: 'Show expertise through thoughtful questions',
    curator: 'Reference great sources and thinkers rather than claiming expertise',
  },
};

// Build dynamic prompt based on voice confidence level
function buildVoicePrompt(user: UserContext): string {
  const confidence = user.voiceConfidence || 0;

  // Base prompt for all levels
  let voiceSection = `About ${user.displayName}:
- Bio: ${user.bio || 'Not specified'}`;

  if (user.tone) {
    voiceSection += `\n- Tone: ${user.tone}`;
  }

  // Medium confidence (31-70): Add voice attributes + positioning + anti-patterns
  if (confidence >= 31) {
    if (user.positioning) {
      voiceSection += `\n\nPositioning: ${user.positioning}`;
    }

    if (user.voiceAttributes && Object.keys(user.voiceAttributes).length > 0) {
      voiceSection += `\n\nVoice characteristics:`;
      for (const [key, value] of Object.entries(user.voiceAttributes)) {
        if (value && VOICE_STYLE_GUIDANCE[key]?.[value]) {
          voiceSection += `\n- ${VOICE_STYLE_GUIDANCE[key][value]}`;
        }
      }
    }

    if (user.avoidPatterns && user.avoidPatterns.length > 0) {
      const avoidDescriptions = user.avoidPatterns
        .map(p => AVOID_PATTERN_DESCRIPTIONS[p])
        .filter(Boolean);
      if (avoidDescriptions.length > 0) {
        voiceSection += `\n\nNEVER use: ${avoidDescriptions.join(', ')}`;
      }
    }
  }

  // High confidence (71-100): Add few-shot examples
  if (confidence >= 71 && user.sampleReplies && user.sampleReplies.length > 0) {
    voiceSection += `\n\nHow ${user.displayName} actually writes:`;
    for (const reply of user.sampleReplies.slice(0, 3)) {
      voiceSection += `\n---\n"${reply.text}"`;
    }
    voiceSection += `\n---\nMatch this voice closely.`;
  } else if (user.exampleReplies) {
    // Fallback to legacy example replies
    voiceSection += `\n\nExample replies from ${user.displayName}:\n${user.exampleReplies}`;
  }

  return voiceSection;
}

// Build anti-pattern rules based on user preferences
function buildAntiPatternRules(user: UserContext): string {
  const defaultRules = [
    'DO NOT end with a question. Make a statement, share a perspective, or add something concrete.',
    'Add substance - a specific observation, experience, or insight. Not just agreement.',
    'Match normal conversational energy. Not everything is exciting.',
  ];

  // If user hasn't set avoid patterns, use defaults
  if (!user.avoidPatterns || user.avoidPatterns.length === 0) {
    return `Critical rules:
- ${defaultRules.join('\n- ')}
- NO hype words: "love this", "so true", "absolutely", "this is huge", "game changer"`;
  }

  // Build rules from user preferences
  const rules = [...defaultRules];

  if (user.avoidPatterns.includes('hype_words')) {
    rules.push('NO hype words: "love this", "so true", "absolutely", "this is huge", "game changer"');
  }
  if (user.avoidPatterns.includes('ending_questions')) {
    // Already in default rules
  }
  if (user.avoidPatterns.includes('generic_agreement')) {
    rules.push('NO generic agreement: "So true", "This", "100%", "Exactly"');
  }
  if (user.avoidPatterns.includes('emojis')) {
    rules.push('NO emojis');
  }
  if (user.avoidPatterns.includes('hashtags')) {
    rules.push('NO hashtags');
  }
  if (user.avoidPatterns.includes('self_promotion')) {
    rules.push('Do NOT mention your company, product, or services');
  }
  if (user.avoidPatterns.includes('corporate_jargon')) {
    rules.push('NO corporate jargon: "synergy", "leverage", "bandwidth", "circle back"');
  }
  if (user.avoidPatterns.includes('unsolicited_advice')) {
    rules.push('Do NOT give unsolicited advice starting with "You should..."');
  }

  return `Critical rules:\n- ${rules.join('\n- ')}`;
}

export async function generateReply(
  tweet: TweetContext,
  user: UserContext
): Promise<string> {
  const anthropic = getAnthropic();

  const voiceSection = buildVoicePrompt(user);
  const rulesSection = buildAntiPatternRules(user);

  const prompt = `You are helping ${user.displayName} write a reply to a tweet.

${voiceSection}

Tweet to reply to:
@${tweet.authorHandle} (${tweet.authorName}) wrote:
"${tweet.text}"

Write a single reply tweet (max 280 chars) that:
1. Responds naturally to what they actually said
2. Matches ${user.displayName}'s voice and style
3. Does NOT force in ${user.displayName}'s job or expertise unless it's genuinely relevant
4. Just be a real person having a conversation

${rulesSection}

Bad: "Love this! What made you realize that?" (shallow + question + hype)
Bad: "This is so true! Absolutely agree." (empty agreement + hype)
Good: "Ran into this exact problem last month. Ended up just shipping it broken and fixing live." (specific, adds something)
Good: "The hard part isn't the code, it's convincing stakeholders to wait." (perspective, no question)

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
