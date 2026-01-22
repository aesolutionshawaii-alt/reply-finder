const API_BASE = 'https://api.twitterapi.io/twitter';

export interface Tweet {
  id: string;
  text: string;
  url: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
  author: {
    userName: string;
    name: string;
    profilePicture: string;
    followers: number;
  };
}

export interface FetchResult {
  tweets: Tweet[];
  error?: string;
}

function getApiKey(): string {
  const apiKey = process.env.TWITTER_API_KEY;
  if (!apiKey) {
    throw new Error('TWITTER_API_KEY not configured');
  }
  return apiKey;
}

export async function fetchAccountTweets(handle: string, count: number = 10): Promise<FetchResult> {
  try {
    const response = await fetch(
      `${API_BASE}/user/last_tweets?userName=${handle}&count=${count}`,
      {
        headers: {
          'X-API-Key': getApiKey(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { tweets: [], error: `HTTP ${response.status}: ${error}` };
    }

    const data = await response.json();
    const tweets = data.tweets || data.data?.tweets || [];

    return { tweets };
  } catch (error) {
    return { tweets: [], error: String(error) };
  }
}

export async function fetchTweetById(tweetId: string): Promise<Tweet | null> {
  try {
    const response = await fetch(
      `${API_BASE}/tweets?tweet_ids=${tweetId}`,
      {
        headers: {
          'X-API-Key': getApiKey(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.tweets?.[0] || data.data?.tweets?.[0] || null;
  } catch {
    return null;
  }
}

export function isRecent(tweet: Tweet, hoursAgo: number = 24): boolean {
  if (!tweet.createdAt) return true;
  const tweetTime = new Date(tweet.createdAt);
  const cutoff = new Date(Date.now() - hoursAgo * 60 * 60 * 1000);
  return tweetTime > cutoff;
}

export interface UserProfile {
  userName: string;
  name: string;
  profilePicture: string;
  isVerified: boolean;
  followers: number;
}

export async function fetchUserProfile(handle: string): Promise<UserProfile | null> {
  try {
    const response = await fetch(
      `${API_BASE}/user/info?userName=${handle}`,
      {
        headers: {
          'X-API-Key': getApiKey(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const user = data.data || data;

    return {
      userName: user.userName || user.username || handle,
      name: user.name || handle,
      profilePicture: user.profilePicture || user.profile_image_url || '',
      isVerified: user.isBlueVerified || user.isVerified || user.verified || false,
      followers: user.followers || user.followers_count || 0,
    };
  } catch {
    return null;
  }
}

export interface FollowingAccount {
  userName: string;
  name: string;
  profilePicture: string;
  isVerified: boolean;
  followers: number;
}

export interface FollowingResult {
  accounts: FollowingAccount[];
  error?: string;
}

export async function fetchUserFollowing(handle: string, count: number = 100): Promise<FollowingResult> {
  try {
    const response = await fetch(
      `${API_BASE}/user/following?userName=${handle}&count=${count}`,
      {
        headers: {
          'X-API-Key': getApiKey(),
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return { accounts: [], error: `HTTP ${response.status}: ${error}` };
    }

    const data = await response.json();
    const following = data.following || data.data?.following || [];

    const accounts: FollowingAccount[] = following.map((user: Record<string, unknown>) => ({
      userName: (user.userName || user.username || user.screen_name || '') as string,
      name: (user.name || '') as string,
      profilePicture: (user.profilePicture || user.profile_image_url || '') as string,
      isVerified: !!(user.isBlueVerified || user.isVerified || user.verified),
      followers: (user.followers || user.followers_count || 0) as number,
    }));

    return { accounts };
  } catch (error) {
    return { accounts: [], error: String(error) };
  }
}
