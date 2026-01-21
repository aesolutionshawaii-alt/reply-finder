import { Zap } from 'lucide-react';

export default function FAQPage() {
  const faqs = [
    {
      q: "How does XeroScroll find reply opportunities?",
      a: "We monitor the accounts you choose and analyze their recent tweets. We look for tweets with high engagement potential - questions, hot takes, wins, struggles - that are good candidates for thoughtful replies."
    },
    {
      q: "How do the AI-written replies work?",
      a: "You fill out a profile with your bio, expertise, and tone preferences. Our AI uses this to draft replies that sound like you. The drafts are suggestions - you can use them as-is, edit them, or write your own."
    },
    {
      q: "When do I receive the daily digest?",
      a: "You choose! Set your preferred delivery time in the dashboard under 'Delivery Time'. Pick any hour that works for you, and we'll send your digest at that time every day in your local timezone."
    },
    {
      q: "What's the difference between Free and Pro?",
      a: "Free lets you monitor 1 account. Pro lets you monitor up to 10 accounts. Both plans include AI-written draft replies and the daily digest."
    },
    {
      q: "Can I change the accounts I monitor?",
      a: "Yes, you can update your monitored accounts anytime from the dashboard. Changes take effect on your next daily digest."
    },
    {
      q: "What if I don't want political content?",
      a: "There's a 'Skip political content' toggle in your profile settings. When enabled, we filter out tweets about politics, elections, and related topics."
    },
    {
      q: "How do I cancel my subscription?",
      a: "Pro subscribers can cancel anytime from the dashboard by clicking 'Manage Subscription'. You'll keep access until the end of your billing period."
    },
    {
      q: "Do you post replies for me?",
      a: "No. We find opportunities and draft replies, but you decide what to post. We send you direct links to each tweet so you can reply with one click."
    },
    {
      q: "What accounts should I monitor?",
      a: "Think about who you want to build relationships with: industry leaders, potential customers, peers in your space, or anyone whose audience overlaps with yours."
    },
    {
      q: "Is my data safe?",
      a: "We only store your email, the accounts you monitor, and your profile for AI personalization. We don't have access to your X account and can't post on your behalf."
    },
  ];

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="px-6 py-4 flex justify-between items-center max-w-4xl mx-auto border-b border-white/10">
        <a href="/" className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          <span className="font-semibold text-lg">XeroScroll</span>
        </a>
        <a href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
          Dashboard
        </a>
      </header>

      <section className="px-6 py-16 max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-12">Frequently Asked Questions</h1>

        <div className="space-y-8">
          {faqs.map((faq, i) => (
            <div key={i} className="border-b border-white/10 pb-6">
              <h2 className="text-lg font-semibold mb-2">{faq.q}</h2>
              <p className="text-gray-400">{faq.a}</p>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-lg">
          <p className="text-gray-400">
            Have another question? Email us at{' '}
            <a href="mailto:josh@xeroscroll.com" className="text-white underline">
              josh@xeroscroll.com
            </a>
          </p>
        </div>
      </section>

      <footer className="px-6 py-8 border-t border-white/10">
        <div className="max-w-4xl mx-auto text-center text-gray-500 text-sm">
          <a href="/" className="hover:text-white transition-colors">XeroScroll</a>
          {' · '}
          <a href="/faq" className="hover:text-white transition-colors">FAQ</a>
        </div>
      </footer>
    </main>
  );
}
