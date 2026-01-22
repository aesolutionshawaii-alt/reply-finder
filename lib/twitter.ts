import { getCachedTweets, setCachedTweets } from './db';

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

export async function fetchAccountTweets(handle: string, count: number = 10, useCache: boolean = true): Promise<FetchResult> {
  try {
    // Check cache first (if enabled)
    if (useCache) {
      try {
        const cachedTweets = await getCachedTweets(handle);
        if (cachedTweets && cachedTweets.length > 0) {
          console.log(`Cache hit for @${handle} (${cachedTweets.length} tweets)`);
          return { tweets: cachedTweets as Tweet[] };
        }
      } catch (cacheError) {
        // Cache error shouldn't block API call
        console.error(`Cache read error for @${handle}:`, cacheError);
      }
    }

    // Cache miss or disabled - fetch from API
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

    // Save to cache (async, don't wait)
    if (useCache && tweets.length > 0) {
      setCachedTweets(handle, tweets).catch(err => {
        console.error(`Cache write error for @${handle}:`, err);
      });
    }

    console.log(`API fetch for @${handle} (${tweets.length} tweets)`);
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
      `${API_BASE}/user/followings?userName=${handle}&count=${count}`,
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
    const following = data.followings || data.following || data.data?.followings || [];

    const accounts: FollowingAccount[] = following.map((user: Record<string, unknown>) => ({
      userName: (user.userName || user.screen_name || user.username || '') as string,
      name: (user.name || '') as string,
      profilePicture: (user.profile_image_url_https || user.profilePicture || user.profile_image_url || '') as string,
      isVerified: !!(user.isBlueVerified || user.isVerified || user.verified),
      followers: (user.followers_count || user.followers || 0) as number,
    }));

    return { accounts };
  } catch (error) {
    return { accounts: [], error: String(error) };
  }
}

// ============ USER VOICE IMPORT ============

export interface UserFullProfile {
  userName: string;
  name: string;
  bio: string;
  profilePicture: string;
  isVerified: boolean;
  followers: number;
  following: number;
  tweetCount: number;
}

export interface UserReply {
  id: string;
  text: string;
  createdAt: string;
  inReplyToId: string | null;
  likeCount: number;
}

export interface FetchUserRepliesResult {
  profile: UserFullProfile | null;
  replies: UserReply[];
  tweets: Tweet[];
  error?: string;
}

export async function fetchUserFullProfile(handle: string): Promise<UserFullProfile | null> {
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
      bio: user.description || user.bio || '',
      profilePicture: user.profilePicture || user.profile_image_url || '',
      isVerified: user.isBlueVerified || user.isVerified || user.verified || false,
      followers: user.followers || user.followers_count || 0,
      following: user.following || user.friends_count || 0,
      tweetCount: user.statusesCount || user.statuses_count || 0,
    };
  } catch {
    return null;
  }
}

export async function fetchUserReplies(handle: string, count: number = 20): Promise<FetchUserRepliesResult> {
  try {
    // First, get the user's profile
    const profile = await fetchUserFullProfile(handle);

    // Then fetch their recent tweets (includes replies)
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
      return { profile, replies: [], tweets: [], error: `HTTP ${response.status}: ${error}` };
    }

    const data = await response.json();
    const allTweets = data.tweets || data.data?.tweets || [];

    // Separate replies from regular tweets
    const replies: UserReply[] = [];
    const tweets: Tweet[] = [];

    for (const tweet of allTweets) {
      const isReply = tweet.inReplyToId || tweet.in_reply_to_status_id || tweet.isReply;

      if (isReply) {
        replies.push({
          id: tweet.id || tweet.id_str,
          text: tweet.text || tweet.full_text || '',
          createdAt: tweet.createdAt || tweet.created_at || '',
          inReplyToId: tweet.inReplyToId || tweet.in_reply_to_status_id || null,
          likeCount: tweet.likeCount || tweet.favorite_count || 0,
        });
      } else {
        tweets.push({
          id: tweet.id || tweet.id_str,
          text: tweet.text || tweet.full_text || '',
          url: tweet.url || `https://twitter.com/${handle}/status/${tweet.id}`,
          createdAt: tweet.createdAt || tweet.created_at || '',
          likeCount: tweet.likeCount || tweet.favorite_count || 0,
          retweetCount: tweet.retweetCount || tweet.retweet_count || 0,
          replyCount: tweet.replyCount || tweet.reply_count || 0,
          viewCount: tweet.viewCount || tweet.views?.count || 0,
          author: {
            userName: handle,
            name: profile?.name || handle,
            profilePicture: profile?.profilePicture || '',
            followers: profile?.followers || 0,
          },
        });
      }
    }

    return { profile, replies, tweets };
  } catch (error) {
    return { profile: null, replies: [], tweets: [], error: String(error) };
  }
}
