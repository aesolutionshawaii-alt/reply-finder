'use client';

import { useState } from 'react';

function Nav({ email, onLogout }: { email: string; onLogout: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleManageSubscription = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to open billing portal:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-5xl mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <a href="/" className="font-bold text-xl">Reply Guy</a>
          <a href="/dashboard" className="text-gray-600 hover:text-black">Dashboard</a>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleManageSubscription}
            disabled={loading}
            className="text-gray-600 hover:text-black text-sm"
          >
            {loading ? 'Loading...' : 'Manage Subscription'}
          </button>
          <span className="text-gray-400 text-sm">{email}</span>
          <button
            onClick={onLogout}
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

interface UserData {
  email: string;
  profile: {
    displayName: string;
    bio: string;
    expertise: string;
    tone: string;
    exampleReplies: string;
  } | null;
  accounts: string[];
}

export default function DashboardPage() {
  const [email, setEmail] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [accounts, setAccounts] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState('');
  const [tone, setTone] = useState('');
  const [exampleReplies, setExampleReplies] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/dashboard/user?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'User not found');
      }

      setUserData(data);
      setAccounts(data.accounts.join('\n'));
      if (data.profile) {
        setDisplayName(data.profile.displayName || '');
        setBio(data.profile.bio || '');
        setExpertise(data.profile.expertise || '');
        setTone(data.profile.tone || '');
        setExampleReplies(data.profile.exampleReplies || '');
      }
      setIsLoggedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
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
      .slice(0, 10);

    try {
      const response = await fetch('/api/admin/update-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, accounts: accountList }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSuccess('Accounts saved!');
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
          email,
          displayName,
          bio,
          expertise,
          tone,
          exampleReplies,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSuccess('Profile saved!');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  const handleTestDigest = async () => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6 bg-gray-50">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-sm">
          <h1 className="text-2xl font-bold mb-2">Reply Guy Dashboard</h1>
          <p className="text-gray-600 mb-6">Enter your email to access your settings.</p>

          <form onSubmit={handleLogin}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black mb-4"
            />

            {error && <div className="text-red-600 text-sm mb-4">{error}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Access Dashboard'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Nav email={email} onLogout={() => setIsLoggedIn(false)} />
      <main className="py-12 px-6">
        <div className="max-w-2xl mx-auto">

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-6">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg mb-6">{success}</div>
        )}

        {/* Accounts Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Monitored Accounts</h2>
          <textarea
            value={accounts}
            onChange={(e) => setAccounts(e.target.value)}
            placeholder="naval&#10;balajis&#10;levelsio"
            rows={6}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black font-mono text-sm mb-4"
          />
          <p className="text-sm text-gray-500 mb-4">One account per line (max 10). No @ needed.</p>
          <button
            onClick={handleSaveAccounts}
            disabled={loading}
            className="bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            Save Accounts
          </button>
        </div>

        {/* Profile Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Your Profile</h2>
          <p className="text-sm text-gray-500 mb-4">This helps the AI write replies in your voice.</p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Josh"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="What do you do? (1-2 sentences)"
                rows={2}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Expertise / Topics</label>
              <input
                type="text"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                placeholder="AI, marketing, photography"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Tone / Style</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="casual, helpful, friendly"
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Example Replies (optional)</label>
              <textarea
                value={exampleReplies}
                onChange={(e) => setExampleReplies(e.target.value)}
                placeholder="Paste 2-3 replies you've written to help match your voice"
                rows={4}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          <button
            onClick={handleSaveProfile}
            disabled={loading}
            className="mt-4 bg-black text-white px-6 py-2 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50"
          >
            Save Profile
          </button>
        </div>

        {/* Test Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Test Digest</h2>
          <p className="text-sm text-gray-500 mb-4">
            Send yourself a test email now instead of waiting for 6am.
          </p>
          <button
            onClick={handleTestDigest}
            disabled={loading}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-600 transition disabled:opacity-50"
          >
            Send Test Digest
          </button>
        </div>
      </div>
    </main>
    </div>
  );
}
