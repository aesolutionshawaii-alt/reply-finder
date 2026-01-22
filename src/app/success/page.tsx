'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

// Voice picker questions with options
const VOICE_QUESTIONS = [
  {
    id: 'conversationStyle',
    scenario: 'Tweet: "Just shipped a major feature after 3 months of work"',
    options: [
      { value: 'celebratory', label: 'Acknowledge achievement', example: 'Three months of grinding pays off. Congrats on shipping!' },
      { value: 'curious', label: 'Ask follow-up', example: 'What was the hardest part of that three-month build?' },
      { value: 'relatable', label: 'Share empathy', example: 'The relief after a big ship is unmatched. Hope you took the rest of the day off.' },
      { value: 'analytical', label: 'Add context', example: 'Three months is solid for a major feature. Most teams would\'ve taken six.' },
    ],
  },
  {
    id: 'valueAddStyle',
    scenario: 'Tweet: "Struggling to get my first 100 users for my SaaS"',
    options: [
      { value: 'tactical', label: 'Give specific advice', example: 'Have you tried cold outreach on LinkedIn? Worked better than content for us early on.' },
      { value: 'encouraging', label: 'Offer encouragement', example: 'First 100 is the hardest. It gets way easier after that.' },
      { value: 'reframing', label: 'Reframe the problem', example: 'Forget 100 users. Find 10 who absolutely love it and would be upset if you shut down.' },
      { value: 'storytelling', label: 'Share your story', example: 'Took us 6 months to hit 100. Then 1000 came in the next 6 weeks. Keep going.' },
    ],
  },
  {
    id: 'humorLevel',
    scenario: 'Tweet: "Why does every startup pivot to AI now?"',
    options: [
      { value: 'sarcastic', label: 'Dry wit', example: 'Because "we added a chatbot" sounds better to VCs than "we\'re still figuring it out"' },
      { value: 'factual', label: 'Straight facts', example: 'Because that\'s where the attention and funding is right now.' },
      { value: 'self-deprecating', label: 'Self-deprecating', example: 'Guilty. Our AI feature is basically a wrapper around Claude but don\'t tell anyone.' },
      { value: 'none', label: 'Serious/professional', example: 'Market dynamics. AI is the current growth vector so capital follows.' },
    ],
  },
];

// Anti-patterns options
const AVOID_PATTERNS_OPTIONS = [
  { value: 'hype_words', label: 'Hype words', description: '"love this!", "game changer", "absolutely"' },
  { value: 'ending_questions', label: 'Questions at the end', description: 'Ending with "What do you think?"' },
  { value: 'generic_agreement', label: 'Generic agreement', description: '"So true", "This", "100%"' },
  { value: 'emojis', label: 'Emojis', description: 'Any emoji usage' },
  { value: 'self_promotion', label: 'Self-promotion', description: 'Mentioning your company/product' },
  { value: 'corporate_jargon', label: 'Corporate jargon', description: '"synergy", "leverage", "bandwidth"' },
];

interface VoiceAttributes {
  conversationStyle?: string;
  valueAddStyle?: string;
  humorLevel?: string;
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');

  // Basic state
  const [email, setEmail] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Profile state
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');

  // Voice learning state
  const [xHandle, setXHandle] = useState('');
  const [xBio, setXBio] = useState('');
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [voiceAttributes, setVoiceAttributes] = useState<VoiceAttributes>({});
  const [positioning, setPositioning] = useState('');
  const [avoidPatterns, setAvoidPatterns] = useState<string[]>(['hype_words', 'ending_questions', 'generic_agreement']);
  const [sampleReplies, setSampleReplies] = useState<Array<{ text: string }>>([]);

  // Accounts state
  const [accounts, setAccounts] = useState('');

  // Verify checkout session
  useEffect(() => {
    if (!sessionId) {
      setVerifying(false);
      setError('No checkout session found. Please try again or contact support.');
      return;
    }

    async function verifyCheckout() {
      try {
        const response = await fetch('/api/verify-checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Verification failed');
        }

        setEmail(data.email);
        setVerified(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Verification failed. Please contact support.');
      } finally {
        setVerifying(false);
      }
    }

    verifyCheckout();
  }, [sessionId]);

  // Import X profile
  const handleImportProfile = async () => {
    if (!xHandle.trim()) return;

    setImporting(true);
    setImportError('');

    try {
      const handle = xHandle.replace(/^@/, '').trim();
      const response = await fetch('/api/twitter/import-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import profile');
      }

      // Populate fields from imported data
      if (data.profile) {
        if (data.profile.name && !displayName) {
          setDisplayName(data.profile.name);
        }
        if (data.profile.bio) {
          setXBio(data.profile.bio);
          if (!bio) {
            setBio(data.profile.bio);
          }
        }
      }

      if (data.sampleReplies && data.sampleReplies.length > 0) {
        setSampleReplies(data.sampleReplies.slice(0, 5).map((r: { text: string }) => ({ text: r.text })));
      }
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to import profile');
    } finally {
      setImporting(false);
    }
  };

  // Handle voice attribute selection
  const handleVoiceSelect = (questionId: string, value: string) => {
    setVoiceAttributes((prev) => ({ ...prev, [questionId]: value }));
  };

  // Toggle avoid pattern
  const toggleAvoidPattern = (pattern: string) => {
    setAvoidPatterns((prev) =>
      prev.includes(pattern) ? prev.filter((p) => p !== pattern) : [...prev, pattern]
    );
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Parse accounts
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
            xHandle: xHandle.replace(/^@/, '').trim() || undefined,
            xBio: xBio || undefined,
            positioning: positioning || undefined,
            voiceAttributes: Object.keys(voiceAttributes).length > 0 ? voiceAttributes : undefined,
            avoidPatterns: avoidPatterns.length > 0 ? avoidPatterns : undefined,
            sampleReplies: sampleReplies.length > 0 ? sampleReplies : undefined,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save');
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
            Your first digest will arrive at your configured delivery time.
            Keep an eye on your inbox.
          </p>
          <div className="space-y-4">
            <a
              href="/dashboard"
              className="block bg-black text-white px-6 py-3 rounded-lg font-medium hover:bg-gray-800 transition"
            >
              Go to Dashboard
            </a>
            <a
              href="https://x.com"
              className="block text-blue-600 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              Go to X while you wait
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (verifying) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <div className="text-gray-500 mb-2">Verifying your payment...</div>
        </div>
      </main>
    );
  }

  if (!verified && error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-6">&#9888;</div>
          <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <p className="text-sm text-gray-500">
            Please contact{' '}
            <a href="mailto:josh@xeroscroll.com" className="text-blue-600 hover:underline">
              josh@xeroscroll.com
            </a>{' '}
            with your payment confirmation.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">Payment successful!</h1>
        <p className="text-gray-600 mb-8">
          Let&apos;s set up your writing style so XeroScroll can write replies that sound like you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Email (read-only) */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-2">
              Your email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              readOnly
              className="w-full px-4 py-3 border rounded-lg bg-gray-50 text-gray-600"
            />
          </div>

          {/* X Handle Import */}
          <div className="bg-blue-50 p-6 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Import from X (optional)</h2>
            <p className="text-sm text-gray-600 mb-4">
              We can pull your bio and recent replies to help match your style.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={xHandle}
                onChange={(e) => setXHandle(e.target.value)}
                placeholder="@yourhandle"
                className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleImportProfile}
                disabled={importing || !xHandle.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
            {importError && <p className="text-red-600 text-sm mt-2">{importError}</p>}
            {sampleReplies.length > 0 && (
              <p className="text-green-600 text-sm mt-2">
                Imported {sampleReplies.length} sample replies from your profile.
              </p>
            )}
          </div>

          {/* Basic Profile */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Basic Info</h2>
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
              <label htmlFor="positioning" className="block text-sm font-medium mb-2">
                What do you want to be known for on X?
              </label>
              <input
                type="text"
                id="positioning"
                value={positioning}
                onChange={(e) => setPositioning(e.target.value)}
                placeholder="The go-to person for AI automation in small business"
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
              />
              <p className="text-sm text-gray-500 mt-1">This helps us understand your goals.</p>
            </div>
          </div>

          {/* Voice Picker */}
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold">Your Writing Style</h2>
              <p className="text-sm text-gray-600">
                Pick the reply that sounds most like how you&apos;d respond.
              </p>
            </div>

            {VOICE_QUESTIONS.map((question) => (
              <div key={question.id} className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-3 italic">
                  {question.scenario}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {question.options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleVoiceSelect(question.id, option.value)}
                      className={`p-3 text-left rounded-lg border-2 transition ${
                        voiceAttributes[question.id as keyof VoiceAttributes] === option.value
                          ? 'border-black bg-white'
                          : 'border-transparent bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="text-sm font-medium block mb-1">{option.label}</span>
                      <span className="text-xs text-gray-600">&ldquo;{option.example}&rdquo;</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Anti-Patterns */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">What to Avoid</h2>
              <p className="text-sm text-gray-600">
                Select patterns you want your replies to avoid.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {AVOID_PATTERNS_OPTIONS.map((pattern) => (
                <button
                  key={pattern.value}
                  type="button"
                  onClick={() => toggleAvoidPattern(pattern.value)}
                  className={`p-3 text-left rounded-lg border-2 transition ${
                    avoidPatterns.includes(pattern.value)
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-sm font-medium block">{pattern.label}</span>
                  <span className="text-xs text-gray-500">{pattern.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Accounts to Monitor */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Accounts to Monitor</h2>
              <p className="text-sm text-gray-600">
                We&apos;ll find reply opportunities from these accounts daily.
              </p>
            </div>
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
          </div>

          {error && <div className="text-red-600 text-sm">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white px-6 py-4 rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 text-lg"
          >
            {loading ? 'Saving...' : 'Complete Setup'}
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
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center px-6">
          <div className="text-gray-500">Loading...</div>
        </main>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
