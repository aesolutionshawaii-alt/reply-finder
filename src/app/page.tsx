import { getStripe } from '../../lib/stripe';

async function createCheckout() {
  'use server';

  const stripe = getStripe();
  const priceId = process.env.STRIPE_PRICE_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  if (!priceId) {
    throw new Error('STRIPE_PRICE_ID not configured');
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: appUrl,
  });

  return session.url;
}

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <section className="px-6 py-24 max-w-4xl mx-auto">
        <h1 className="text-5xl font-bold tracking-tight mb-6">
          Stop scrolling.<br />
          Start replying.
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl">
          Get a daily email with the best reply opportunities from accounts you care about.
          We find the tweets, suggest angles, you write the replies.
        </p>

        <form
          action={async () => {
            'use server';
            const url = await createCheckout();
            if (url) {
              const { redirect } = await import('next/navigation');
              redirect(url);
            }
          }}
        >
          <button
            type="submit"
            className="bg-black text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-800 transition"
          >
            Start for $29/month
          </button>
        </form>

        <p className="text-sm text-gray-500 mt-4">
          Cancel anytime. No long-term commitment.
        </p>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-12">How it works</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="text-4xl font-bold text-gray-300 mb-4">1</div>
              <h3 className="text-xl font-semibold mb-2">Pick 10 accounts</h3>
              <p className="text-gray-600">
                Choose the accounts you want to build relationships with. Industry leaders, potential customers, peers.
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-gray-300 mb-4">2</div>
              <h3 className="text-xl font-semibold mb-2">We find opportunities</h3>
              <p className="text-gray-600">
                Every day we scan their tweets and find the best ones to reply to. Questions, hot takes, wins, struggles.
              </p>
            </div>

            <div>
              <div className="text-4xl font-bold text-gray-300 mb-4">3</div>
              <h3 className="text-xl font-semibold mb-2">You reply and grow</h3>
              <p className="text-gray-600">
                We suggest angles. You write authentic replies. Build real relationships without endless scrolling.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why replies matter */}
      <section className="px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">Why replies are the best growth strategy</h2>

          <div className="space-y-6 text-lg text-gray-600">
            <p>
              The X algorithm rewards conversation. A thoughtful reply on a big account&apos;s tweet
              can get you more visibility than your own posts.
            </p>
            <p>
              But finding the right tweets to reply to takes time. You have to scroll,
              filter through noise, and hope you catch something good.
            </p>
            <p>
              XeroScroll does the scrolling for you. Every morning, you get an email with
              the best opportunities from the accounts that matter to you.
            </p>
          </div>
        </div>
      </section>

      {/* What you get */}
      <section className="px-6 py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold mb-8">What you get</h2>

          <ul className="space-y-4 text-lg">
            <li className="flex items-start gap-3">
              <span className="text-green-600 mt-1">&#10003;</span>
              <span>Daily email digest at 6am (your time)</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 mt-1">&#10003;</span>
              <span>Monitor up to 10 accounts</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 mt-1">&#10003;</span>
              <span>Top 10 reply opportunities, ranked by potential</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 mt-1">&#10003;</span>
              <span>Suggested reply angles for each tweet</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-green-600 mt-1">&#10003;</span>
              <span>Direct links to reply instantly</span>
            </li>
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to grow through replies?</h2>

          <form
            action={async () => {
              'use server';
              const url = await createCheckout();
              if (url) {
                const { redirect } = await import('next/navigation');
                redirect(url);
              }
            }}
          >
            <button
              type="submit"
              className="bg-black text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-gray-800 transition"
            >
              Start for $29/month
            </button>
          </form>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t">
        <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm">
          XeroScroll
        </div>
      </footer>
    </main>
  );
}
