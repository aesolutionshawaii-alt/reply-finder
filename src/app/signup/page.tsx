'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { Zap, Mail, ArrowRight } from 'lucide-react';
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

  if (magicLinkSent) {
    return (
      <div className="min-h-screen bg-black text-white">
        <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl fixed top-0 w-full z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="font-semibold text-lg">XeroScroll</span>
            </a>
          </div>
        </nav>

        <section className="pt-32 pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="p-8 md:p-12 bg-white/5 border-white/10 max-w-md mx-auto">
                <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-6">
                  <Mail className="w-8 h-8 text-green-400" />
                </div>
                <h1 className="text-3xl font-bold mb-4">Check your email</h1>
                <p className="text-gray-400 text-lg mb-6 leading-relaxed">
                  We sent a sign-in link to <span className="text-white">{email}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Didn&apos;t get it?{' '}
                  <button
                    onClick={() => setMagicLinkSent(false)}
                    className="text-white underline hover:text-gray-300 transition-colors"
                  >
                    Try again
                  </button>
                </p>
              </Card>
            </motion.div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            <span className="font-semibold text-lg">XeroScroll</span>
          </a>
          <div className="flex items-center gap-4">
            <a href="/dashboard" className="text-sm text-gray-400 hover:text-white transition-colors">
              Sign In
            </a>
          </div>
        </div>
      </nav>

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
              Get started
              <br />
              <span className="text-gray-500">for free</span>
            </h1>

            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Monitor 1 account and get daily reply opportunities with AI-drafted replies.
            </p>

            <Card className="p-8 bg-white/5 border-white/10 max-w-md mx-auto text-left">
              <a
                href="/api/auth/google"
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white text-black rounded-lg font-medium hover:bg-gray-200 transition-colors"
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
                Continue with Google
              </a>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-black px-3 text-gray-500">OR</span>
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 mb-4"
                />

                {error && <div className="text-red-400 text-sm mb-4">{error}</div>}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-white text-black hover:bg-gray-200 gap-2"
                >
                  {loading ? 'Sending...' : 'Continue with Email'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </form>

              <p className="mt-6 text-sm text-gray-500 text-center">
                Already have an account?{' '}
                <a href="/dashboard" className="text-white underline hover:text-gray-300 transition-colors">Sign in</a>
              </p>
            </Card>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
