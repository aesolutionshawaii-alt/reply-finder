'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/signup/free', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      // Save email and redirect to dashboard
      localStorage.setItem('xeroscroll_email', email);
      router.push(`/dashboard?email=${encodeURIComponent(email)}`);
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="px-6 py-4 flex justify-between items-center max-w-4xl mx-auto">
        <a href="/" className="font-bold text-xl">XeroScroll</a>
        <a href="/dashboard" className="text-gray-600 hover:text-gray-900">
          Log in
        </a>
      </header>

      <section className="px-6 py-16 max-w-md mx-auto">
        <h1 className="text-3xl font-bold mb-2">Try XeroScroll Free</h1>
        <p className="text-gray-600 mb-8">
          Monitor 1 account and get daily reply opportunities. No credit card required.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Email address
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
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Start Free'}
          </button>
        </form>

        <div className="mt-8 p-4 bg-white rounded-lg border">
          <p className="text-sm font-medium mb-2">Free plan includes:</p>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>1 account to monitor</li>
            <li>Daily email digest</li>
            <li>AI-written draft replies</li>
          </ul>
          <p className="text-sm text-gray-500 mt-3">
            Want more? <a href="/" className="text-black underline">Upgrade to Pro</a> for 10 accounts.
          </p>
        </div>
      </section>
    </main>
  );
}
