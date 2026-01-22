'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'motion/react';
import { Zap, Users, User, CreditCard, ChevronRight, Clock, Mail, ArrowRight, Plus, X, Crown, BadgeCheck, Download, Loader2, Check, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import VoiceSetupWizard from '../components/VoiceSetupWizard';

interface AccountData {
  handle: string;
  name: string | null;
  isVerified: boolean;
  profilePicture: string | null;
}

interface VoiceAttributes {
  conversationStyle?: 'celebratory' | 'curious' | 'relatable' | 'analytical';
  disagreementApproach?: 'direct' | 'nuanced' | 'questioning' | 'agreeing';
  valueAddStyle?: 'tactical' | 'encouraging' | 'reframing' | 'storytelling';
  humorLevel?: 'sarcastic' | 'factual' | 'self-deprecating' | 'none';
  expertiseDisplay?: 'credentialed' | 'insight-focused' | 'questioning' | 'curator';
}

interface SampleContent {
  id: string;
  text: string;
  createdAt: string;
}

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
    // Voice learning fields
    xHandle: string | null;
    xBio: string | null;
    positioning: string | null;
    voiceAttributes: VoiceAttributes;
    avoidPatterns: string[];
    sampleTweets: SampleContent[];
    sampleReplies: SampleContent[];
    voiceConfidence: number;
  } | null;
  accounts: AccountData[];
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

// Calculate next delivery date
function getNextDelivery(deliveryHourUtc: number, timezoneOffset: number): string {
  const now = new Date();
  const localHour = utcToHour(deliveryHourUtc, timezoneOffset);

  // Get current time in user's timezone
  const userNow = new Date(now.getTime() + (timezoneOffset * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
  const currentHour = userNow.getHours();

  // If we haven't passed today's delivery time, it's today. Otherwise tomorrow.
  const isToday = currentHour < localHour;

  const deliveryDate = new Date(userNow);
  if (!isToday) {
    deliveryDate.setDate(deliveryDate.getDate() + 1);
  }

  const dayName = isToday ? 'Today' : 'Tomorrow';
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = monthNames[deliveryDate.getMonth()];
  const day = deliveryDate.getDate();

  return `${dayName}, ${month} ${day}`;
}

// Sidebar Navigation
function Sidebar({
  email,
  plan,
  activeSection,
  onSectionChange,
  onLogout,
  onManageSubscription,
  subscriptionLoading,
  onRunNow,
  sendingDigest
}: {
  email: string;
  plan: 'free' | 'pro';
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  onManageSubscription: () => void;
  subscriptionLoading: boolean;
  onRunNow: () => void;
  sendingDigest: boolean;
}) {
  const navItems = [
    { id: 'accounts', label: 'Monitored Accounts', icon: Users },
    { id: 'profile', label: 'Your Profile', icon: User },
    { id: 'schedule', label: 'Delivery Time', icon: Clock },
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

        {/* Run Now Action */}
        <div className="mt-6">
          <div className="text-xs text-gray-500 uppercase tracking-wider px-3 mb-2">Actions</div>
          <button
            onClick={onRunNow}
            disabled={sendingDigest}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Zap className={`w-4 h-4 ${sendingDigest ? 'animate-pulse' : ''}`} />
            {sendingDigest ? 'Working...' : 'Run Now'}
          </button>
          {sendingDigest && (
            <p className="text-xs text-gray-500 px-3 mt-2">~30-60 seconds</p>
          )}
        </div>

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
  const [accounts, setAccounts] = useState<{ handle: string; isVerified: boolean }[]>([]);
  const [accountInput, setAccountInput] = useState('');
  const [accountError, setAccountError] = useState('');
  const [hasUnsavedAccounts, setHasUnsavedAccounts] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [expertise, setExpertise] = useState('');
  const [tone, setTone] = useState('');
  const [exampleReplies, setExampleReplies] = useState('');
  const [skipPolitical, setSkipPolitical] = useState(true);
  const [selectedHour, setSelectedHour] = useState(6);
  const [selectedTimezone, setSelectedTimezone] = useState(() => getClosestTimezone(getBrowserTimezoneOffset()));
  const [deliveryHourUtc, setDeliveryHourUtc] = useState(16);

  // Import from X account states
  const [showImportModal, setShowImportModal] = useState(false);
  const [importHandle, setImportHandle] = useState('');
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState('');
  const [importAccounts, setImportAccounts] = useState<{ handle: string; name: string; isVerified: boolean; followers: number; selected: boolean; alreadyAdded: boolean }[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  // Voice wizard mode
  const [showVoiceWizard, setShowVoiceWizard] = useState(false);
  const [voiceConfidence, setVoiceConfidence] = useState(0);

  const timeOptions = generateTimeOptions();

  // Auto-dismiss success messages after 5 seconds (but not while sending digest)
  useEffect(() => {
    if (success && !sendingDigest) {
      const timer = setTimeout(() => setSuccess(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [success, sendingDigest]);

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
        // Handle both old format (string[]) and new format (object[])
        const mappedAccounts = data.accounts.map((a: string | AccountData) => {
          if (typeof a === 'string') {
            return { handle: a.startsWith('@') ? a : `@${a}`, isVerified: false };
          }
          return { handle: a.handle.startsWith('@') ? a.handle : `@${a.handle}`, isVerified: a.isVerified || false };
        });
        setAccounts(mappedAccounts);

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
          setVoiceConfidence(data.profile.voiceConfidence || 0);
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

  const maxAccounts = userData?.plan === 'free' ? 1 : 10;
  const isLimitReached = accounts.length >= maxAccounts;

  const handleAddAccount = () => {
    const trimmedValue = accountInput.trim();

    if (!trimmedValue) {
      setAccountError('Please enter a handle');
      return;
    }

    const handle = trimmedValue.startsWith('@') ? trimmedValue : `@${trimmedValue}`;
    const handleWithoutAt = handle.slice(1);

    if (!/^[a-zA-Z0-9_]{1,15}$/.test(handleWithoutAt)) {
      setAccountError('Invalid handle format');
      return;
    }

    if (accounts.some(a => a.handle.toLowerCase() === handle.toLowerCase())) {
      setAccountError('Already added');
      return;
    }

    if (accounts.length >= maxAccounts) {
      setAccountError(userData?.plan === 'free' ? 'Upgrade to Pro for more' : 'Limit reached');
      return;
    }

    // New accounts are added with isVerified: false until saved
    setAccounts([...accounts, { handle, isVerified: false }]);
    setAccountInput('');
    setAccountError('');
    setHasUnsavedAccounts(true);
  };

  const handleRemoveAccount = (handle: string) => {
    setAccounts(accounts.filter(a => a.handle !== handle));
    setAccountError('');
    setHasUnsavedAccounts(true);
  };

  const handleAccountKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddAccount();
    }
  };

  const handleSaveAccounts = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    const accountList = accounts.map(a => a.handle.replace(/^@/, ''));

    try {
      const response = await fetch('/api/admin/update-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: accountList }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
      }

      // Update accounts with verification status from response
      if (data.accounts) {
        const updatedAccounts = data.accounts.map((a: { handle: string; isVerified?: boolean }) => ({
          handle: a.handle.startsWith('@') ? a.handle : `@${a.handle}`,
          isVerified: a.isVerified || false,
        }));
        setAccounts(updatedAccounts);
      }

      setHasUnsavedAccounts(false);
      const timeDisplay = formatTimeWithTimezone(utcToHour(deliveryHourUtc, selectedTimezone), selectedTimezone);
      setSuccess(`Saved! Your reply pack will arrive at ${timeDisplay}.`);
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

      setSuccess('Profile saved! The AI will use this to write replies that match your style.');
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
    setSuccess('Generating your reply pack... this takes 30-60 seconds.');

    try {
      const response = await fetch(`/api/cron?email=${encodeURIComponent(email)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send');
      }

      if (data.error === 'No opportunities found') {
        setSuccess('No reply opportunities found right now. Try again later or add more accounts.');
      } else {
        setSuccess(`Done! ${data.opportunities || ''} opportunities sent to your inbox.`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test digest');
    } finally {
      setSendingDigest(false);
    }
  };

  const handleFetchFollowing = async () => {
    if (!importHandle.trim()) {
      setImportError('Enter your X handle');
      return;
    }

    setImportLoading(true);
    setImportError('');
    setImportAccounts([]);

    try {
      const cleanHandle = importHandle.replace(/^@/, '').trim();
      const response = await fetch(`/api/twitter/following?handle=${encodeURIComponent(cleanHandle)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch following');
      }

      if (!data.accounts || data.accounts.length === 0) {
        setImportError('No accounts found. Make sure the handle is correct and the account is public.');
        return;
      }

      // Mark accounts that are already added
      const existingHandles = accounts.map(a => a.handle.toLowerCase().replace(/^@/, ''));
      const accountsWithSelection = data.accounts.map((a: { handle: string; name: string; isVerified: boolean; followers: number }) => ({
        handle: a.handle,
        name: a.name,
        isVerified: a.isVerified,
        followers: a.followers,
        selected: false,
        alreadyAdded: existingHandles.includes(a.handle.toLowerCase()),
      }));

      setImportAccounts(accountsWithSelection);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to fetch following');
    } finally {
      setImportLoading(false);
    }
  };

  const handleToggleImportAccount = (handle: string) => {
    setImportAccounts(prev => prev.map(a =>
      a.handle === handle ? { ...a, selected: !a.selected } : a
    ));
  };

  const handleImportSelected = () => {
    const selectedToAdd = importAccounts
      .filter(a => a.selected && !a.alreadyAdded)
      .slice(0, maxAccounts - accounts.length);

    if (selectedToAdd.length === 0) {
      setImportError('Select at least one account to import');
      return;
    }

    const newAccounts = selectedToAdd.map(a => ({
      handle: `@${a.handle}`,
      isVerified: a.isVerified,
    }));

    setAccounts([...accounts, ...newAccounts]);
    setHasUnsavedAccounts(true);
    setShowImportModal(false);
    setImportHandle('');
    setImportAccounts([]);
  };

  const handleRefreshAccounts = async () => {
    if (accounts.length === 0) return;

    setRefreshing(true);
    setError('');

    try {
      const accountList = accounts.map(a => a.handle.replace(/^@/, ''));
      const response = await fetch('/api/admin/update-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: accountList }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to refresh');
      }

      if (data.accounts) {
        const updatedAccounts = data.accounts.map((a: { handle: string; isVerified?: boolean }) => ({
          handle: a.handle.startsWith('@') ? a.handle : `@${a.handle}`,
          isVerified: a.isVerified || false,
        }));
        setAccounts(updatedAccounts);
      }

      setSuccess('Accounts refreshed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh');
    } finally {
      setRefreshing(false);
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
        onRunNow={handleTestDigest}
        sendingDigest={sendingDigest}
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

              {/* Daily Reply Pack Status */}
              <Card className="bg-gradient-to-br from-yellow-500/10 to-orange-500/5 border-yellow-500/20 p-5 mb-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                    <Zap className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-3">Daily Reply Pack</h3>
                    <div className="text-sm text-gray-300 space-y-1 mb-3">
                      <p><span className="text-gray-500">Delivery:</span> Every day at {formatTimeWithTimezone(utcToHour(deliveryHourUtc, selectedTimezone), selectedTimezone)}</p>
                      <p><span className="text-gray-500">Next:</span> {getNextDelivery(deliveryHourUtc, selectedTimezone)}</p>
                    </div>
                    <p className="text-sm text-gray-400 mb-3">
                      Your reply pack lands in your inbox every morning. Automatic.
                    </p>
                    <button
                      onClick={handleTestDigest}
                      disabled={sendingDigest}
                      className="text-sm text-yellow-400 hover:text-yellow-300 transition-colors disabled:opacity-50"
                    >
                      {sendingDigest ? 'Sending...' : "Can't wait? → Run Now"}
                    </button>
                  </div>
                </div>
              </Card>

              <Card className="bg-gradient-to-br from-white/[0.08] to-white/[0.03] border-white/10 p-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-md bg-white/5 border border-white/10">
                      <X className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h3 className="text-lg font-medium">Monitored Accounts</h3>
                      <p className="text-sm text-gray-400 mt-0.5">
                        We&apos;ll find reply opportunities from these accounts
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex items-center gap-3">
                    {accounts.length > 0 && (
                      <button
                        onClick={handleRefreshAccounts}
                        disabled={refreshing}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                        title="Refresh verification status"
                      >
                        <RefreshCw className={`w-4 h-4 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                      </button>
                    )}
                    <div>
                      <div className="text-sm text-gray-400">
                        {accounts.length} of {maxAccounts} {maxAccounts === 1 ? 'account' : 'accounts'}
                      </div>
                      {userData?.plan === 'free' && (
                        <a
                          href="/#pricing"
                          className="text-xs text-blue-500 hover:text-blue-400 transition-colors flex items-center gap-1 justify-end mt-1"
                        >
                          <Crown className="w-3 h-3" />
                          Upgrade for 10 accounts
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-6">
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        isLimitReached ? 'bg-blue-500' : 'bg-blue-500/80'
                      }`}
                      style={{ width: `${(accounts.length / maxAccounts) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Account Tags */}
                {accounts.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {accounts.map((account) => (
                      <div
                        key={account.handle}
                        className="inline-flex items-center gap-2 px-3 py-2 bg-white/5 border border-white/10 rounded-md group hover:bg-white/10 transition-colors"
                      >
                        <span className="text-sm">{account.handle}</span>
                        {account.isVerified && (
                          <BadgeCheck className="w-4 h-4 text-blue-500" />
                        )}
                        <button
                          onClick={() => handleRemoveAccount(account.handle)}
                          className="p-0.5 rounded hover:bg-white/10 transition-colors"
                          aria-label={`Remove ${account.handle}`}
                        >
                          <X className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Account Input */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={accountInput}
                      onChange={(e) => {
                        setAccountInput(e.target.value);
                        setAccountError('');
                      }}
                      onKeyPress={handleAccountKeyPress}
                      placeholder="Enter handle (e.g. elonmusk)"
                      disabled={isLimitReached}
                      className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-md text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    />
                    <button
                      onClick={handleAddAccount}
                      disabled={isLimitReached}
                      className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:bg-white/5 disabled:text-gray-500 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                    <button
                      onClick={() => setShowImportModal(true)}
                      disabled={isLimitReached}
                      className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Import
                    </button>
                  </div>

                  {/* Error Message */}
                  {accountError && (
                    <div className="text-sm text-red-400 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-red-400" />
                      {accountError}
                    </div>
                  )}

                  {/* Limit Reached Message */}
                  {isLimitReached && !accountError && userData?.plan === 'free' && (
                    <div className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-md">
                      <Crown className="w-4 h-4 text-blue-500 flex-shrink-0" />
                      <p className="text-sm text-gray-300">
                        You&apos;ve hit your limit.{' '}
                        <a href="/#pricing" className="text-blue-500 hover:text-blue-400 font-medium transition-colors">
                          Upgrade to Pro
                        </a>{' '}
                        for up to 10 accounts.
                      </p>
                    </div>
                  )}

                  {isLimitReached && !accountError && userData?.plan === 'pro' && (
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-gray-400" />
                      Maximum {maxAccounts} accounts reached
                    </div>
                  )}
                </div>

                {/* Save Button */}
                {hasUnsavedAccounts && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <Button
                      onClick={handleSaveAccounts}
                      disabled={loading}
                      className="bg-white text-black hover:bg-gray-200"
                    >
                      {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </div>
                )}
              </Card>

              {/* Import Modal */}
              {showImportModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                  <div className="bg-zinc-900 border border-white/10 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden">
                    {/* Modal Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/10">
                      <div>
                        <h3 className="text-lg font-medium">Import from X</h3>
                        <p className="text-sm text-gray-400">Add accounts you follow</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowImportModal(false);
                          setImportHandle('');
                          setImportAccounts([]);
                          setImportError('');
                        }}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-4">
                      {importAccounts.length === 0 ? (
                        <>
                          <p className="text-sm text-gray-400 mb-4">
                            Enter your X handle to see who you follow
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={importHandle}
                              onChange={(e) => {
                                setImportHandle(e.target.value);
                                setImportError('');
                              }}
                              onKeyPress={(e) => e.key === 'Enter' && handleFetchFollowing()}
                              placeholder="Your X handle"
                              className="flex-1 px-4 py-2.5 bg-white/5 border border-white/10 rounded-md text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                            <button
                              onClick={handleFetchFollowing}
                              disabled={importLoading}
                              className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              {importLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                'Fetch'
                              )}
                            </button>
                          </div>
                          {importError && (
                            <p className="text-sm text-red-400 mt-3">{importError}</p>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-3">
                            <p className="text-sm text-gray-400">
                              Select accounts to import ({importAccounts.filter(a => a.selected).length} selected)
                            </p>
                            <button
                              onClick={() => setImportAccounts([])}
                              className="text-sm text-blue-500 hover:text-blue-400"
                            >
                              Search again
                            </button>
                          </div>
                          <div className="max-h-[40vh] overflow-y-auto space-y-1">
                            {importAccounts.map((account) => {
                              const wouldExceedLimit = !account.selected &&
                                accounts.length + importAccounts.filter(a => a.selected).length >= maxAccounts;

                              return (
                                <button
                                  key={account.handle}
                                  onClick={() => !account.alreadyAdded && !wouldExceedLimit && handleToggleImportAccount(account.handle)}
                                  disabled={account.alreadyAdded || (wouldExceedLimit && !account.selected)}
                                  className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left ${
                                    account.alreadyAdded
                                      ? 'bg-white/5 opacity-50 cursor-not-allowed'
                                      : account.selected
                                      ? 'bg-blue-500/20 border border-blue-500/30'
                                      : 'bg-white/5 hover:bg-white/10'
                                  } ${wouldExceedLimit && !account.selected ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <div className={`w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 ${
                                    account.selected ? 'bg-blue-500 border-blue-500' : 'border-white/20'
                                  }`}>
                                    {account.selected && <Check className="w-3 h-3" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-medium truncate">@{account.handle}</span>
                                      {account.isVerified && (
                                        <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />
                                      )}
                                    </div>
                                    {account.name && (
                                      <p className="text-sm text-gray-400 truncate">{account.name}</p>
                                    )}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {account.alreadyAdded ? 'Added' : `${(account.followers / 1000).toFixed(0)}K`}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                          {importError && (
                            <p className="text-sm text-red-400 mt-3">{importError}</p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Modal Footer */}
                    {importAccounts.length > 0 && (
                      <div className="p-4 border-t border-white/10">
                        <Button
                          onClick={handleImportSelected}
                          disabled={importAccounts.filter(a => a.selected).length === 0}
                          className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50"
                        >
                          Add {importAccounts.filter(a => a.selected).length} Account{importAccounts.filter(a => a.selected).length !== 1 ? 's' : ''}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profile Section */}
          {activeSection === 'profile' && (
            <div>
              {showVoiceWizard ? (
                <>
                  <SectionHeader
                    title="Voice Setup Wizard"
                    description="Complete these steps to help the AI write replies that match your style."
                  />
                  <VoiceSetupWizard
                    initialData={{
                      displayName,
                      bio,
                      tone,
                      xHandle: userData?.profile?.xHandle || '',
                      xBio: userData?.profile?.xBio || '',
                      positioning: userData?.profile?.positioning || '',
                      voiceAttributes: (userData?.profile?.voiceAttributes || {}) as VoiceAttributes,
                      avoidPatterns: (userData?.profile?.avoidPatterns || []) as ('hype_words' | 'ending_questions' | 'self_promotion' | 'corporate_jargon' | 'emojis' | 'hashtags' | 'generic_agreement' | 'unsolicited_advice')[],
                      sampleTweets: userData?.profile?.sampleTweets || [],
                      sampleReplies: userData?.profile?.sampleReplies || [],
                    }}
                    onSave={async (data) => {
                      setLoading(true);
                      setError('');
                      try {
                        const response = await fetch('/api/admin/update-profile', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            displayName: data.displayName,
                            bio: data.bio,
                            tone: data.tone,
                            skipPolitical,
                            xHandle: data.xHandle,
                            xBio: data.xBio,
                            positioning: data.positioning,
                            voiceAttributes: data.voiceAttributes,
                            avoidPatterns: data.avoidPatterns,
                            sampleTweets: data.sampleTweets,
                            sampleReplies: data.sampleReplies,
                          }),
                        });
                        const result = await response.json();
                        if (!response.ok) {
                          throw new Error(result.error || 'Failed to save');
                        }
                        setDisplayName(data.displayName);
                        setBio(data.bio);
                        setTone(data.tone);
                        setVoiceConfidence(result.voiceConfidence || 0);
                        setShowVoiceWizard(false);
                        setSuccess('Writing style saved! Your replies will now better match how you write.');
                        // Refresh user data
                        checkSession();
                      } catch (err) {
                        throw err;
                      } finally {
                        setLoading(false);
                      }
                    }}
                    onCancel={() => setShowVoiceWizard(false)}
                  />
                </>
              ) : (
                <>
                  <SectionHeader
                    title="Your Profile"
                    description="Tell us about yourself so the AI can write replies that match your style."
                  />

                  {/* Voice Confidence Card */}
                  <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/5 border-purple-500/20 p-5 mb-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-5 h-5 text-purple-400" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium">Style Match</h3>
                          <span className={`text-xl font-bold ${voiceConfidence >= 70 ? 'text-green-400' : voiceConfidence >= 40 ? 'text-yellow-400' : 'text-gray-400'}`}>
                            {voiceConfidence}%
                          </span>
                        </div>
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-3">
                          <div
                            className={`h-full transition-all duration-300 ${
                              voiceConfidence >= 70 ? 'bg-green-500' : voiceConfidence >= 40 ? 'bg-yellow-500' : 'bg-gray-500'
                            }`}
                            style={{ width: `${voiceConfidence}%` }}
                          />
                        </div>
                        <p className="text-sm text-gray-400 mb-3">
                          {voiceConfidence >= 70
                            ? 'Excellent! Your replies will closely match your style.'
                            : voiceConfidence >= 40
                            ? 'Good start! Complete the setup for better results.'
                            : 'Set up your writing style for AI replies that sound like you.'}
                        </p>
                        <Button
                          onClick={() => setShowVoiceWizard(true)}
                          variant="ghost"
                          className="bg-purple-500 hover:bg-purple-600 text-white"
                          size="sm"
                        >
                          <Sparkles className="w-4 h-4 mr-2" />
                          {voiceConfidence > 0 ? 'Improve Writing Style' : 'Set Up Writing Style'}
                        </Button>
                      </div>
                    </div>
                  </Card>

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
                          placeholder="Paste 2-3 replies you've written to help match your style"
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
                </>
              )}
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
