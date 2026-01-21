'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState('');
  const [tone, setTone] = useState('');
  const [exampleReplies, setExampleReplies] = useState('');
  const [accounts, setAccounts] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Parse accounts (one per line or comma-separated)
    const accountList = accounts
      .split(/[\n,]/)
      .map((a) => a.trim())
      .filter((a) => a.length > 0)
      .slice(0, 10);

    if (accountList.length === 0) {
      setError('Please enter at least one account to monitor');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          accounts: accountList,
          profile: {
            displayName,
            bio,
            expertise,
            tone,
            exampleReplies,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save accounts');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-6">&#10003;</div>
          <h1 className="text-3xl font-bold mb-4">You&apos;re all set!</h1>
          <p className="text-gray-600 mb-8">
            Your first digest will arrive tomorrow morning at 6am.
            Keep an eye on your inbox.
          </p>
          <a
            href="https://x.com"
            className="text-blue-600 hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Go to X while you wait
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md w-full">
        <h1 className="text-3xl font-bold mb-2">Payment successful!</h1>
        <p className="text-gray-600 mb-8">
          Now let&apos;s set up your monitored accounts.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Your email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-sm text-gray-500 mt-1">
              Use the same email you used for checkout
            </p>
          </div>

          <hr className="my-6" />
          <h2 className="text-lg font-semibold">Your profile (for AI-written replies)</h2>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium mb-2">
              Your name
            </label>
            <input
              type="text"
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Josh"
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label htmlFor="bio" className="block text-sm font-medium mb-2">
              What do you do? (1-2 sentences)
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="I run a tech consulting company in Hawaii. We help local businesses with AI and automation."
              rows={2}
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label htmlFor="expertise" className="block text-sm font-medium mb-2">
              Your expertise/topics
            </label>
            <input
              type="text"
              id="expertise"
              value={expertise}
              onChange={(e) => setExpertise(e.target.value)}
              placeholder="AI, automation, small business, Hawaii"
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label htmlFor="tone" className="block text-sm font-medium mb-2">
              Your tone/style
            </label>
            <input
              type="text"
              id="tone"
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              placeholder="friendly, casual, helpful - not salesy"
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
          </div>

          <div>
            <label htmlFor="exampleReplies" className="block text-sm font-medium mb-2">
              Paste 2-3 of your best past replies
            </label>
            <textarea
              id="exampleReplies"
              value={exampleReplies}
              onChange={(e) => setExampleReplies(e.target.value)}
              placeholder="This was huge for us too. We started using Claude for customer support scripts and it cut response time in half.&#10;&#10;Totally agree. The ROI on automation for small teams is insane once you get past the learning curve."
              rows={5}
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
            />
            <p className="text-sm text-gray-500 mt-1">
              This helps the AI match your voice. Optional but recommended.
            </p>
          </div>

          <hr className="my-6" />
          <h2 className="text-lg font-semibold">Accounts to monitor</h2>

          <div>
            <label htmlFor="accounts" className="block text-sm font-medium mb-2">
              X accounts (up to 10)
            </label>
            <textarea
              id="accounts"
              value={accounts}
              onChange={(e) => setAccounts(e.target.value)}
              placeholder="@elonmusk&#10;@naval&#10;@paulg"
              rows={6}
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm"
            />
            <p className="text-sm text-gray-500 mt-1">
              One account per line. Include or omit the @ symbol.
            </p>
          </div>

          {error && (
            <div className="text-red-600 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save accounts'}
          </button>
        </form>

        {sessionId && (
          <p className="text-xs text-gray-400 mt-8 text-center">
            Session: {sessionId.slice(0, 20)}...
          </p>
        )}
      </div>
    </main>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-gray-500">Loading...</div>
      </main>
    }>
      <SuccessContent />
    </Suspense>
  );
}
