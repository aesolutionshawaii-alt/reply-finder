# XeroScroll

Micro-SaaS that sends X/Twitter creators daily email "reply packs" - curated reply opportunities from accounts they monitor, with AI-written draft replies in their voice.

**Live:** https://xeroscroll.com

## Business Model

- **Free:** 1 monitored account
- **Pro:** $29/mo, up to 10 monitored accounts
- Daily email with top reply opportunities + AI-written draft replies

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Neon Postgres (via Vercel Storage)
- **Auth:** Google OAuth + Magic Links (passwordless)
- **Payments:** Stripe (subscriptions)
- **Email:** Resend (primary) + ZeptoMail (fallback)
- **Twitter Data:** TwitterAPI.io (~$0.15/1000 tweets)
- **AI Replies:** Claude API (Anthropic)
- **Hosting:** Vercel
- **Cron:** Vercel Cron (user-configurable delivery time)

## Environment Variables

```
# Database (Neon via Vercel)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Auth
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=           # $29/mo price ID

# TwitterAPI.io
TWITTER_API_KEY=

# Anthropic (Claude API)
ANTHROPIC_API_KEY=

# Email
RESEND_API_KEY=
ZEPTOMAIL_API_KEY=         # Fallback email provider

# Cron
CRON_SECRET=               # Required for Vercel cron auth

# Admin
ADMIN_EMAILS=              # Comma-separated admin emails

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  google_id VARCHAR(255) UNIQUE,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  plan VARCHAR(50) DEFAULT 'free',        -- free, pro
  status VARCHAR(50) DEFAULT 'active',    -- active, canceled, past_due
  delivery_hour_utc INTEGER DEFAULT 16,   -- User's preferred delivery time in UTC
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Monitored accounts
CREATE TABLE monitored_accounts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  handle VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, handle)
);

-- User profiles (for AI reply generation)
CREATE TABLE user_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  display_name VARCHAR(255),
  bio TEXT,
  expertise TEXT,
  tone VARCHAR(100),
  example_replies TEXT,
  skip_political BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Email log
CREATE TABLE email_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  opportunities_count INTEGER,
  status VARCHAR(50)
);

-- Cron runs (tracks each cron execution)
CREATE TABLE cron_runs (
  id SERIAL PRIMARY KEY,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'running',   -- running, success, failed
  users_processed INTEGER DEFAULT 0,
  emails_sent INTEGER DEFAULT 0,
  errors TEXT,
  duration_ms INTEGER
);

-- Sessions
CREATE TABLE sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

Initialize DB: `GET /api/db/init`

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Test cron locally (requires CRON_SECRET in .env.local)
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron

# Test with specific user
curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron?email=test@example.com"
```

## User Flow

1. User lands on homepage
2. Signs up via Google OAuth or Magic Link (free plan)
3. OR clicks "Subscribe" -> Stripe Checkout ($29/mo for Pro)
4. Redirected to /dashboard
5. Fills out profile (name, bio, expertise, tone, example replies)
6. Adds accounts to monitor (1 for free, up to 10 for pro)
7. Sets preferred delivery time
8. Daily cron runs at their chosen time:
   - Fetch tweets from monitored accounts
   - Score and rank top 10 reply opportunities
   - Generate AI draft replies using user's profile/voice
   - Send email via Resend (fallback to ZeptoMail)

## Key Files

### Core
- `lib/db.ts` - Database connection and queries
- `lib/auth.ts` - Session management, requireAuth(), isAdmin()
- `lib/email.ts` - Resend + ZeptoMail fallback
- `lib/twitter.ts` - TwitterAPI.io client
- `lib/claude.ts` - AI reply generation prompt
- `lib/reply-finder.ts` - Tweet filtering, scoring, opportunity ranking
- `lib/stripe.ts` - Stripe client

### Pages
- `src/app/page.tsx` - Landing page
- `src/app/signup/page.tsx` - Free signup
- `src/app/dashboard/page.tsx` - User dashboard (accounts, profile, delivery time, run now)
- `src/app/admin/page.tsx` - Admin dashboard (users, emails, cron history)
- `src/app/success/page.tsx` - Post-checkout redirect

### API Routes
| Route | Method | Purpose |
|-------|--------|---------|
| `/api/auth/google` | GET | Initiate Google OAuth |
| `/api/auth/google/callback` | GET | Google OAuth callback |
| `/api/auth/send-link` | POST | Send magic link email |
| `/api/auth/verify` | GET | Verify magic link token |
| `/api/auth/logout` | POST | Clear session |
| `/api/auth/session` | GET | Get current session |
| `/api/webhook` | POST | Stripe webhook |
| `/api/checkout` | POST | Create Stripe checkout session |
| `/api/cron` | GET | Daily digest (Vercel Cron) |
| `/api/dashboard/user` | GET | Get user data for dashboard |
| `/api/admin/update-*` | POST | Update user settings |
| `/api/admin-dashboard/*` | GET | Admin data endpoints |
| `/api/db/init` | GET | Initialize database tables |

## Gotchas

- **CRON_SECRET required:** Must be set in Vercel env vars or cron fails with 401
- **Session cookies:** Set on Response object directly, not via `cookies().set()`
- **Stripe billing portal:** Must be enabled in Stripe Dashboard -> Settings -> Billing -> Customer portal
- **Google OAuth:** Redirect URI must match exactly in Google Cloud Console
- **ZeptoMail:** Uses `Authorization: {apiKey}` header (not Bearer token)

## Admin Access

Add email to `ADMIN_EMAILS` env var. Admin dashboard at `/admin` shows:
- User stats (total, pro, MRR)
- User management (view, upgrade, delete)
- Email logs
- Cron run history

## Costs (at 50 users)

- TwitterAPI.io: 50 users x 10 accounts x 10 tweets = 5,000/day = ~$23/mo
- Resend: Free tier (3,000 emails/mo)
- ZeptoMail: Free tier (10,000 emails/mo)
- Vercel: Free tier
- Neon: Free tier
- Claude API: ~$5/mo

Revenue: 50 x $29 = $1,450/mo
Margin: ~97%
