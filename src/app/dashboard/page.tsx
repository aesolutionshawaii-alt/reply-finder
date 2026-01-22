'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Zap, Users, User, Send, CreditCard, ExternalLink, ChevronRight, Clock, Mail, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

interface UserData {
  email: string;
  plan: 'free' | 'pro';
  deliveryHourUtc: number;
  profile: {
    displayName: string;
    bio: string;
    expertise: string;
    tone: string;
    exampleReplies: string;
    skipPolitical: boolean;
  } | null;
  accounts: string[];
}

// Common timezones with UTC offsets
const TIMEZONES = [
  { value: -10, label: 'Hawaii (HST)', short: 'HST' },
  { value: -9, label: 'Alaska (AKST)', short: 'AKST' },
  { value: -8, label: 'Pacific (PST)', short: 'PST' },
  { value: -7, label: 'Mountain (MST)', short: 'MST' },
  { value: -6, label: 'Central (CST)', short: 'CST' },
  { value: -5, label: 'Eastern (EST)', short: 'EST' },
  { value: -4, label: 'Atlantic (AST)', short: 'AST' },
  { value: 0, label: 'London (GMT)', short: 'GMT' },
  { value: 1, label: 'Paris (CET)', short: 'CET' },
  { value: 2, label: 'Cairo (EET)', short: 'EET' },
  { value: 3, label: 'Moscow (MSK)', short: 'MSK' },
  { value: 5.5, label: 'Mumbai (IST)', short: 'IST' },
  { value: 8, label: 'Singapore (SGT)', short: 'SGT' },
  { value: 9, label: 'Tokyo (JST)', short: 'JST' },
  { value: 10, label: 'Sydney (AEST)', short: 'AEST' },
  { value: 12, label: 'Auckland (NZST)', short: 'NZST' },
];

// Generate time options for dropdown (12-hour format)
function generateTimeOptions() {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    const period = hour < 12 ? 'AM' : 'PM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const label = `${displayHour}:00 ${period}`;
    options.push({ hour, label });
  }
  return options;
}

// Get user's browser timezone offset
function getBrowserTimezoneOffset(): number {
  return -new Date().getTimezoneOffset() / 60;
}

// Find closest timezone to browser offset
function getClosestTimezone(offset: number): number {
  const closest = TIMEZONES.reduce((prev, curr) =>
    Math.abs(curr.value - offset) < Math.abs(prev.value - offset) ? curr : prev
  );
  return closest.value;
}

// Convert hour in a timezone to UTC hour
function hourToUtc(hour: number, timezoneOffset: number): number {
  let utcHour = hour - timezoneOffset;
  if (utcHour < 0) utcHour += 24;
  if (utcHour >= 24) utcHour -= 24;
  return Math.floor(utcHour);
}

// Convert UTC hour to hour in a timezone
function utcToHour(utcHour: number, timezoneOffset: number): number {
  let localHour = utcHour + timezoneOffset;
  if (localHour < 0) localHour += 24;
  if (localHour >= 24) localHour -= 24;
  return Math.floor(localHour);
}

// Format time with timezone
function formatTimeWithTimezone(hour: number, timezoneOffset: number): string {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  const tz = TIMEZONES.find(t => t.value === timezoneOffset)?.short || 'UTC';
  return `${displayHour}:00 ${period} ${tz}`;
}

// Sidebar Navigation
function Sidebar({
  email,
  plan,
  activeSection,
  onSectionChange,
  onLogout,
  onManageSubscription,
  subscriptionLoading
}: {
  email: string;
  plan: 'free' | 'pro';
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  onManageSubscription: () => void;
  subscriptionLoading: boolean;
}) {
  const navItems = [
    { id: 'accounts', label: 'Monitored Accounts', icon: Users },
    { id: 'profile', label: 'Your Profile', icon: User },
    { id: 'schedule', label: 'Delivery Time', icon: Clock },
    { id: 'test', label: 'Test Digest', icon: Send },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-white/5 border-r border-white/10 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-white/10">
        <a href="/" className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          <span className="font-semibold text-lg">XeroScroll</span>
        </a>
      </div>

      {/* User & Plan */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-white truncate flex-1 mr-2">{email}</span>
          <button
            onClick={onLogout}
            className="text-xs text-gray-500 hover:text-white transition-colors"
          >
            Sign out
          </button>
        </div>
        <div className={`inline-flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-md ${
          plan === 'pro'
            ? 'bg-white text-black font-medium'
            : 'bg-white/10 text-gray-400'
        }`}>
          {plan === 'pro' ? 'Pro Plan' : 'Free Plan'}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3">
        <div className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-2">Settings</div>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onSectionChange(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  activeSection === item.id
                    ? 'bg-white/10 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {plan === 'pro' && (
          <>
            <div className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-2 mt-6">Billing</div>
            <button
              onClick={onManageSubscription}
              disabled={subscriptionLoading}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              {subscriptionLoading ? 'Loading...' : 'Manage Subscription'}
            </button>
          </>
        )}
      </nav>

      {/* Upgrade CTA for free users */}
      {plan === 'free' && (
        <div className="p-4 border-t border-white/10">
          <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-lg p-4">
            <p className="text-sm font-medium mb-1">Upgrade to Pro</p>
            <p className="text-xs text-gray-400 mb-3">Monitor up to 10 accounts</p>
            <a href="/#pricing">
              <Button size="sm" className="w-full bg-white text-black hover:bg-gray-200">
                Upgrade
              </Button>
            </a>
          </div>
        </div>
      )}

    </aside>
  );
}

// Section Header Component
function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold mb-1">{title}</h1>
      <p className="text-gray-400">{description}</p>
    </div>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [sendingDigest, setSendingDigest] = useState(false);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('accounts');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  // Form states
  const [accounts, setAccounts] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState('');
  const [tone, setTone] = useState('');
  const [exampleReplies, setExampleReplies] = useState('');
  const [skipPolitical, setSkipPolitical] = useState(true);
  const [selectedHour, setSelectedHour] = useState(6);
  const [selectedTimezone, setSelectedTimezone] = useState(() => getClosestTimezone(getBrowserTimezoneOffset()));
  const [deliveryHourUtc, setDeliveryHourUtc] = useState(16);

  const timeOptions = generateTimeOptions();

  // Auto-dismiss success messages after 5 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Check for URL error params and check session on load
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam === 'expired_link') {
      setError('Sign-in link expired. Please request a new one.');
    } else if (errorParam === 'invalid_link') {
      setError('Invalid sign-in link. Please request a new one.');
    }

    checkSession();
  }, [searchParams]);

  const checkSession = async () => {
    try {
      const response = await fetch('/api/auth/session');
      const data = await response.json();

      if (data.authenticated) {
        setUserData(data);
        setEmail(data.email);
        setAccounts(data.accounts.join('\n'));

        const userUtcHour = data.deliveryHourUtc ?? 16;
        setDeliveryHourUtc(userUtcHour);
        const browserOffset = getClosestTimezone(getBrowserTimezoneOffset());
        setSelectedTimezone(browserOffset);
        setSelectedHour(utcToHour(userUtcHour, browserOffset));

        if (data.profile) {
          setDisplayName(data.profile.displayName || '');
          setBio(data.profile.bio || '');
          setExpertise(data.profile.expertise || '');
          setTone(data.profile.tone || '');
          setExampleReplies(data.profile.exampleReplies || '');
          setSkipPolitical(data.profile.skipPolitical ?? true);
        }
        setIsLoggedIn(true);
      }
    } catch (err) {
      console.error('Session check failed:', err);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/send-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send sign-in link');
      }

      setMagicLinkSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout failed:', err);
    }
    setIsLoggedIn(false);
    setEmail('');
    setUserData(null);
    setMagicLinkSent(false);
  };

  const handleManageSubscription = async () => {
    setSubscriptionLoading(true);
    setError('');
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to open billing portal');
      }
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (err) {
      console.error('Failed to open billing portal:', err);
      setError(err instanceof Error ? err.message : 'Failed to open billing portal');
    } finally {
      setSubscriptionLoading(false);
    }
  };

  const handleSaveAccounts = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    const accountList = accounts
      .split(/[\n,]/)
      .map(a => a.trim().replace(/^@/, ''))
      .filter(a => a.length > 0)
      .slice(0, userData?.plan === 'free' ? 1 : 10);

    try {
      const response = await fetch('/api/admin/update-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: accountList }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      const timeDisplay = formatTimeWithTimezone(utcToHour(deliveryHourUtc, selectedTimezone), selectedTimezone);
      setSuccess(`You're all set! Your first digest will arrive tomorrow at ${timeDisplay}. You can also send a test digest now from the "Test Digest" tab.`);
      setAccounts(accountList.join('\n'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          bio,
          expertise,
          tone,
          exampleReplies,
          skipPolitical,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSuccess('Profile saved! The AI will use this to write replies in your voice.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDeliveryTime = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    const newUtcHour = hourToUtc(selectedHour, selectedTimezone);

    try {
      const response = await fetch('/api/admin/update-delivery-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deliveryHourUtc: newUtcHour }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setDeliveryHourUtc(newUtcHour);
      const timeDisplay = formatTimeWithTimezone(selectedHour, selectedTimezone);
      setSuccess(`Delivery time updated! You'll receive your digest at ${timeDisplay} every day.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save delivery time');
    } finally {
      setLoading(false);
    }
  };

  const handleTestDigest = async () => {
    setSendingDigest(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/cron?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send');
      }

      setSuccess('Test digest sent! Check your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test digest');
    } finally {
      setSendingDigest(false);
    }
  };

  if (initialLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-black text-white">
        <div className="text-gray-500">Loading...</div>
      </main>
    );
  }

  // Magic link sent - show check email screen
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

  // Not logged in - show sign in form
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-black text-white">
        <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl fixed top-0 w-full z-50">
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <a href="/" className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="font-semibold text-lg">XeroScroll</span>
            </a>
            <div className="flex items-center gap-4">
              <a href="/signup" className="text-sm text-gray-400 hover:text-white transition-colors">
                Sign Up
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
              <h1 className="text-5xl md:text-6xl font-bold mb-6 tracking-tight">
                Welcome back
              </h1>

              <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                Sign in to your XeroScroll account.
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

                <form onSubmit={handleSendMagicLink}>
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
                  Don&apos;t have an account?{' '}
                  <a href="/signup" className="text-white underline hover:text-gray-300 transition-colors">Sign up free</a>
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
      <Sidebar
        email={email}
        plan={userData?.plan || 'free'}
        activeSection={activeSection}
        onSectionChange={(section) => {
          setActiveSection(section);
          setSuccess('');
          setError('');
        }}
        onLogout={handleLogout}
        onManageSubscription={handleManageSubscription}
        subscriptionLoading={subscriptionLoading}
      />

      {/* Main Content */}
      <main className="ml-64 min-h-screen">
        {/* Top bar */}
        <div className="sticky top-0 z-10 bg-black/80 backdrop-blur-xl border-b border-white/10 px-8 py-4">
          <div className="flex items-center text-sm text-gray-400">
            <span>Dashboard</span>
            <ChevronRight className="w-4 h-4 mx-2" />
            <span className="text-white">
              {activeSection === 'accounts' && 'Monitored Accounts'}
              {activeSection === 'profile' && 'Your Profile'}
              {activeSection === 'schedule' && 'Delivery Time'}
              {activeSection === 'test' && 'Test Digest'}
            </span>
          </div>
        </div>

        <div className="p-8 max-w-3xl">
          {/* Status Messages */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg mb-6">
              {success}
            </div>
          )}

          {/* Accounts Section */}
          {activeSection === 'accounts' && (
            <div>
              <SectionHeader
                title="Monitored Accounts"
                description="Add X accounts you want to monitor for reply opportunities."
              />

              <Card className="bg-white/5 border-white/10 p-6">
                <textarea
                  value={accounts}
                  onChange={(e) => setAccounts(e.target.value)}
                  placeholder={userData?.plan === 'free' ? 'elonmusk' : 'elonmusk\nsamaltman\nlevelsio'}
                  rows={userData?.plan === 'free' ? 2 : 6}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20 font-mono text-sm mb-4"
                />
                <p className="text-sm text-gray-500 mb-4">
                  One account per line (max {userData?.plan === 'free' ? '1' : '10'}). No @ needed.
                  {userData?.plan === 'free' && (
                    <span className="block mt-1">
                      <a href="/#pricing" className="text-white underline">Upgrade to Pro</a> for 10 accounts.
                    </span>
                  )}
                </p>
                <Button
                  onClick={handleSaveAccounts}
                  disabled={loading}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  {loading ? 'Saving...' : 'Save Accounts'}
                </Button>
              </Card>
            </div>
          )}

          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div>
              <SectionHeader
                title="Your Profile"
                description="Tell us about yourself so the AI can write replies in your voice."
              />

              <Card className="bg-white/5 border-white/10 p-6">
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Your name"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Bio</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="What do you do? (1-2 sentences)"
                      rows={2}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Expertise / Topics</label>
                    <input
                      type="text"
                      value={expertise}
                      onChange={(e) => setExpertise(e.target.value)}
                      placeholder="startups, design, finance, etc."
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Tone / Style</label>
                    <input
                      type="text"
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      placeholder="casual, helpful, friendly"
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-300">Example Replies (optional)</label>
                    <textarea
                      value={exampleReplies}
                      onChange={(e) => setExampleReplies(e.target.value)}
                      placeholder="Paste 2-3 replies you've written to help match your voice"
                      rows={4}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                    />
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="skipPolitical"
                      checked={skipPolitical}
                      onChange={(e) => setSkipPolitical(e.target.checked)}
                      className="w-4 h-4 rounded border-white/20 bg-white/5"
                    />
                    <label htmlFor="skipPolitical" className="text-sm text-gray-300">
                      Skip political content
                    </label>
                  </div>
                </div>

                <Button
                  onClick={handleSaveProfile}
                  disabled={loading}
                  className="mt-6 bg-white text-black hover:bg-gray-200"
                >
                  {loading ? 'Saving...' : 'Save Profile'}
                </Button>
              </Card>
            </div>
          )}

          {/* Delivery Time Section */}
          {activeSection === 'schedule' && (
            <div>
              <SectionHeader
                title="Delivery Time"
                description="Choose when you want to receive your daily digest."
              />

              <Card className="bg-white/5 border-white/10 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Daily Digest Time</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      Select what time and timezone works best for you.
                    </p>

                    <div className="flex flex-wrap gap-3 mb-4">
                      <select
                        value={selectedHour}
                        onChange={(e) => setSelectedHour(parseInt(e.target.value))}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                        {timeOptions.map((option) => (
                          <option key={option.hour} value={option.hour} className="bg-black">
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <select
                        value={selectedTimezone}
                        onChange={(e) => setSelectedTimezone(parseFloat(e.target.value))}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                        {TIMEZONES.map((tz) => (
                          <option key={tz.value} value={tz.value} className="bg-black">
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="text-sm text-gray-500 mb-4">
                      Currently set to: <span className="text-white">{formatTimeWithTimezone(utcToHour(deliveryHourUtc, selectedTimezone), selectedTimezone)}</span>
                    </div>

                    <Button
                      onClick={handleSaveDeliveryTime}
                      disabled={loading}
                      className="bg-white text-black hover:bg-gray-200"
                    >
                      {loading ? 'Saving...' : 'Save Time'}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Test Digest Section */}
          {activeSection === 'test' && (
            <div>
              <SectionHeader
                title="Test Digest"
                description="Send yourself a test email to see what your daily digest looks like."
              />

              <Card className="bg-white/5 border-white/10 p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Send className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Send Test Email</h3>
                    <p className="text-sm text-gray-400 mb-4">
                      This will fetch recent tweets from your monitored accounts and send you a digest with AI-generated reply suggestions. Takes about 30 seconds.
                    </p>
                    <Button
                      onClick={handleTestDigest}
                      disabled={sendingDigest}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {sendingDigest ? 'Sending... (this takes ~30s)' : 'Send Test Digest'}
                    </Button>
                  </div>
                </div>
              </Card>

              <Card className="bg-white/5 border-white/10 p-6 mt-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                    <ExternalLink className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">Daily Schedule</h3>
                    <p className="text-sm text-gray-400">
                      Your digest is sent automatically every day at {formatTimeWithTimezone(utcToHour(deliveryHourUtc, selectedTimezone), selectedTimezone)}.{' '}
                      <button
                        onClick={() => setActiveSection('schedule')}
                        className="text-white underline"
                      >
                        Change time
                      </button>
                    </p>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center px-6 bg-black text-white">
        <div className="text-gray-500">Loading...</div>
      </main>
    }>
      <DashboardContent />
    </Suspense>
  );
}
