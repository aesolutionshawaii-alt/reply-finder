'use client';

import { useState } from 'react';
import { Zap, Mail } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

export default function SignupPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Something went wrong');
        setLoading(false);
        return;
      }

      setMagicLinkSent(true);
    } catch {
      setError('Something went wrong');
      setLoading(false);
    }
  }

  // Magic link sent - show check email screen
  if (magicLinkSent) {
    return (
      <main className="min-h-screen bg-black text-white">
        <header className="px-6 py-4 flex justify-between items-center max-w-4xl mx-auto border-b border-white/10">
          <a href="/" className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="font-semibold text-lg">XeroScroll</span>
          </a>
        </header>
        <div className="flex items-center justify-center px-6 pt-16">
          <Card className="max-w-md w-full bg-[#0a0a0a] border-white/10 p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Check your email</h1>
            <p className="text-gray-400 mb-6">
              We sent a sign-in link to <span className="text-white">{email}</span>. Click the link to create your account.
            </p>
            <p className="text-sm text-gray-500">
              Didn&apos;t get it?{' '}
              <button
                onClick={() => setMagicLinkSent(false)}
                className="text-white underline"
              >
                Try again
              </button>
            </p>
          </Card>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <header className="px-6 py-4 flex justify-between items-center max-w-4xl mx-auto border-b border-white/10">
        <a href="/" className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          <span className="font-semibold text-lg">XeroScroll</span>
        </a>
        <a href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
          Sign in
        </a>
      </header>

      <div className="flex items-center justify-center px-6 pt-16">
        <Card className="max-w-md w-full bg-[#0a0a0a] border-white/10 p-8">
          <h1 className="text-2xl font-bold mb-2">Try XeroScroll Free</h1>
          <p className="text-gray-400 mb-6">Monitor 1 account and get daily reply opportunities. No credit card required.</p>

          <a
            href="/api/auth/google"
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors mb-4"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Sign up with Google
          </a>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-[#0a0a0a] px-3 text-gray-500">or</span>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 mb-4"
            />

            {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white/10 text-white hover:bg-white/20 border border-white/10"
            >
              {loading ? 'Sending...' : 'Continue with Email'}
            </Button>
          </form>

          <div className="mt-6 p-4 bg-white/5 rounded-lg border border-white/10">
            <p className="text-sm font-medium mb-2">Free plan includes:</p>
            <ul className="text-sm text-gray-400 space-y-1">
              <li>1 account to monitor</li>
              <li>Daily email digest</li>
              <li>AI-written draft replies</li>
            </ul>
            <p className="text-sm text-gray-500 mt-3">
              Want more? <a href="/#pricing" className="text-white underline">Upgrade to Pro</a> for 10 accounts.
            </p>
          </div>

          <p className="mt-6 text-sm text-gray-500 text-center">
            Already have an account?{' '}
            <a href="/dashboard" className="text-white underline">Sign in</a>
          </p>
        </Card>
      </div>
    </main>
  );
}
