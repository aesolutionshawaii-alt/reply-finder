# XeroScroll

Micro-SaaS that sends X/Twitter creators daily email digests of reply opportunities from accounts they monitor.

## Business Model

- $29/mo subscription via Stripe
- Users submit up to 10 accounts to monitor
- Daily email digest with top reply opportunities + **AI-written draft replies**

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Neon Postgres (via Vercel Storage)
- **Payments:** Stripe (subscriptions)
- **Email:** Resend
- **Twitter Data:** TwitterAPI.io (~$0.15/1000 tweets)
- **AI Replies:** Claude API (Anthropic)
- **Hosting:** Vercel
- **Cron:** Vercel Cron (6am HST daily)

## Environment Variables

Copy `config/.env.example` to `config/.env` and fill in:

```
# Database (Neon via Vercel)
POSTGRES_URL=
POSTGRES_PRISMA_URL=
POSTGRES_URL_NON_POOLING=

# Stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID=           # Your $29/mo price ID

# TwitterAPI.io
TWITTER_API_KEY=

# Anthropic (Claude API for AI replies)
ANTHROPIC_API_KEY=

# Resend
RESEND_API_KEY=

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database Schema

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  status VARCHAR(50) DEFAULT 'active',  -- active, canceled, past_due
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

-- Email log (for debugging)
CREATE TABLE email_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  sent_at TIMESTAMP DEFAULT NOW(),
  opportunities_count INTEGER,
  status VARCHAR(50)
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
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

Initialize DB: `GET /api/db/init`

## Commands

```bash
# Development
npm run dev

# Build
npm run build

# Test cron locally
curl http://localhost:3000/api/cron

# Test with specific user
curl "http://localhost:3000/api/cron?email=test@example.com"
```

## User Flow

1. User lands on homepage
2. Clicks "Subscribe" -> Stripe Checkout ($29/mo)
3. Stripe webhook creates user in DB
4. User redirected to /success with onboarding form
5. User fills out profile (name, bio, expertise, tone, example replies)
6. User submits up to 10 accounts to monitor
7. Daily cron runs at 6am HST:
   - Fetch tweets from each user's monitored accounts
   - Score and rank top 10 reply opportunities
   - Generate AI draft replies using user's profile/voice
   - Send email digest via Resend

## API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/webhook` | POST | Stripe webhook (subscription events) |
| `/api/onboard` | POST | Save user's profile and monitored accounts |
| `/api/cron` | GET | Trigger daily digest (called by Vercel Cron) |
| `/api/db/init` | GET | Initialize database tables |

## Costs (at 50 users)

- TwitterAPI.io: 50 users × 10 accounts × 10 tweets = 5,000/day = ~$23/mo
- Resend: Free tier (3,000 emails/mo)
- Vercel: Free tier
- Neon: Free tier

Revenue: 50 × $29 = $1,450/mo
Margin: ~98%

## Files

- `src/app/page.tsx` - Landing page
- `src/app/success/page.tsx` - Post-checkout onboarding + profile form
- `src/app/api/webhook/route.ts` - Stripe webhook handler
- `src/app/api/onboard/route.ts` - Save profile and monitored accounts
- `src/app/api/cron/route.ts` - Daily digest sender
- `lib/db.ts` - Database connection and queries
- `lib/stripe.ts` - Stripe client
- `lib/twitter.ts` - TwitterAPI.io client
- `lib/email.ts` - Resend email client
- `lib/claude.ts` - Anthropic Claude API for AI replies
- `lib/reply-finder.ts` - Core opportunity scoring + reply generation
