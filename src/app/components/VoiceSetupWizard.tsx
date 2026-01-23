'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Check, Loader2, Download, X as XIcon, Sparkles, Info, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

// Types
interface VoiceAttributes {
  conversationStyle?: 'celebratory' | 'curious' | 'relatable' | 'analytical';
  disagreementApproach?: 'direct' | 'nuanced' | 'questioning' | 'agreeing';
  valueAddStyle?: 'tactical' | 'encouraging' | 'reframing' | 'storytelling';
  humorLevel?: 'sarcastic' | 'factual' | 'self-deprecating' | 'none';
  expertiseDisplay?: 'credentialed' | 'insight-focused' | 'questioning' | 'curator';
}

type AvoidPattern =
  | 'hype_words'
  | 'ending_questions'
  | 'self_promotion'
  | 'corporate_jargon'
  | 'emojis'
  | 'hashtags'
  | 'generic_agreement'
  | 'unsolicited_advice';

interface SampleContent {
  id: string;
  text: string;
  createdAt: string;
}

interface VoiceSetupData {
  // Step 1: X Handle
  xHandle: string;
  xBio: string;
  sampleTweets: SampleContent[];
  sampleReplies: SampleContent[];
  // Step 2: Voice Picker
  voiceAttributes: VoiceAttributes;
  // Step 3: Positioning
  positioning: string;
  // Step 4: Anti-patterns
  avoidPatterns: AvoidPattern[];
  // Existing profile data
  displayName: string;
  bio: string;
  tone: string;
}

interface VoiceSetupWizardProps {
  initialData?: Partial<VoiceSetupData>;
  onSave: (data: VoiceSetupData) => Promise<void>;
  onCancel?: () => void;
}

// Voice Picker Questions
const VOICE_QUESTIONS = [
  {
    id: 'conversationStyle',
    title: 'Conversation Style',
    description: 'How do you typically respond to someone sharing good news?',
    tweet: 'Just shipped a major feature after 3 months of work',
    options: [
      { value: 'celebratory', label: 'Celebrate', reply: 'Three months of grinding pays off. Congrats on shipping!' },
      { value: 'curious', label: 'Ask more', reply: 'What was the hardest part of that three-month build?' },
      { value: 'relatable', label: 'Connect', reply: 'The relief after a big ship is unmatched. Hope you took the rest of the day off.' },
      { value: 'analytical', label: 'Analyze', reply: 'Three months is solid for a major feature. Most teams would\'ve taken six.' },
    ],
  },
  {
    id: 'disagreementApproach',
    title: 'Disagreement Approach',
    description: 'How do you handle a take you disagree with?',
    tweet: 'AI will replace 90% of software engineers within 5 years',
    options: [
      { value: 'direct', label: 'Direct', reply: 'Not even close. AI is a productivity multiplier, not a replacement.' },
      { value: 'nuanced', label: 'Nuanced', reply: 'Maybe for boilerplate code. The hard problems still need human reasoning.' },
      { value: 'questioning', label: 'Question', reply: 'Which 90%? The ones writing CRUD apps or the ones designing systems?' },
      { value: 'agreeing', label: 'Reframe', reply: 'The job title might stay the same but the work will look completely different.' },
    ],
  },
  {
    id: 'valueAddStyle',
    title: 'Adding Value',
    description: 'How do you help someone struggling?',
    tweet: 'Struggling to get my first 100 users for my SaaS',
    options: [
      { value: 'tactical', label: 'Tactical', reply: 'Have you tried cold outreach on LinkedIn? Worked better than content for us early on.' },
      { value: 'encouraging', label: 'Encourage', reply: 'First 100 is the hardest. It gets way easier after that.' },
      { value: 'reframing', label: 'Reframe', reply: 'Forget 100 users. Find 10 who absolutely love it and would be upset if you shut down.' },
      { value: 'storytelling', label: 'Story', reply: 'Took us 6 months to hit 100. Then 1000 came in the next 6 weeks. Keep going.' },
    ],
  },
  {
    id: 'humorLevel',
    title: 'Humor Level',
    description: 'How do you respond to a lighthearted observation?',
    tweet: 'Why does every startup pivot to AI now?',
    options: [
      { value: 'sarcastic', label: 'Sarcastic', reply: 'Because "we added a chatbot" sounds better to VCs than "we\'re still figuring it out"' },
      { value: 'factual', label: 'Factual', reply: 'Because that\'s where the attention and funding is right now.' },
      { value: 'self-deprecating', label: 'Self-dep', reply: 'Guilty. Our AI feature is basically a wrapper around Claude but don\'t tell anyone.' },
      { value: 'none', label: 'Straight', reply: 'Market dynamics. AI is the current growth vector so capital follows.' },
    ],
  },
  {
    id: 'expertiseDisplay',
    title: 'Expertise Display',
    description: 'How do you show you know your stuff?',
    tweet: '[A topic in your field comes up]',
    options: [
      { value: 'credentialed', label: 'Credentials', reply: 'Been doing this for 10 years and still learning new approaches.' },
      { value: 'insight-focused', label: 'Insight', reply: 'The counterintuitive thing is [specific insight]' },
      { value: 'questioning', label: 'Question', reply: 'Depends on context. Are you optimizing for X or Y?' },
      { value: 'curator', label: 'Curate', reply: 'Naval\'s thread on this is the best explanation I\'ve seen.' },
    ],
  },
];

// Anti-pattern options
const AVOID_PATTERNS_OPTIONS: { value: AvoidPattern; label: string; example: string }[] = [
  { value: 'hype_words', label: 'Hype words', example: '"love this!", "game changer"' },
  { value: 'ending_questions', label: 'Questions at the end', example: '"What do you think?"' },
  { value: 'self_promotion', label: 'Forced self-promotion', example: '"At my company we..."' },
  { value: 'corporate_jargon', label: 'Corporate jargon', example: '"synergy", "leverage"' },
  { value: 'emojis', label: 'Emojis', example: '🔥 💯 🚀' },
  { value: 'hashtags', label: 'Hashtags', example: '#startup #AI' },
  { value: 'generic_agreement', label: 'Generic agreement', example: '"So true", "This"' },
  { value: 'unsolicited_advice', label: 'Unsolicited advice', example: '"You should..."' },
];

export default function VoiceSetupWizard({ initialData, onSave, onCancel }: VoiceSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showScoreInfo, setShowScoreInfo] = useState(false);

  // Form state
  const [xHandle, setXHandle] = useState(initialData?.xHandle || '');
  const [xBio, setXBio] = useState(initialData?.xBio || '');
  const [sampleTweets, setSampleTweets] = useState<SampleContent[]>(initialData?.sampleTweets || []);
  const [sampleReplies, setSampleReplies] = useState<SampleContent[]>(initialData?.sampleReplies || []);
  const [voiceAttributes, setVoiceAttributes] = useState<VoiceAttributes>(initialData?.voiceAttributes || {});
  const [positioning, setPositioning] = useState(initialData?.positioning || '');
  const [avoidPatterns, setAvoidPatterns] = useState<AvoidPattern[]>(initialData?.avoidPatterns || []);
  const [displayName, setDisplayName] = useState(initialData?.displayName || '');
  const [bio, setBio] = useState(initialData?.bio || '');
  const [tone, setTone] = useState(initialData?.tone || '');

  const totalSteps = 5;

  const handleImportFromX = async () => {
    if (!xHandle.trim()) {
      setError('Enter your X handle first');
      return;
    }

    setImportLoading(true);
    setImportSuccess(false);
    setError('');

    try {
      const cleanHandle = xHandle.replace(/^@/, '').trim();
      const response = await fetch(`/api/twitter/import-voice?handle=${encodeURIComponent(cleanHandle)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to import profile');
      }

      // Update state with imported data
      setXHandle(data.profile.handle);
      setXBio(data.profile.bio || '');
      if (!displayName && data.profile.name) {
        setDisplayName(data.profile.name);
      }
      if (!bio && data.profile.bio) {
        setBio(data.profile.bio);
      }
      setSampleTweets(data.sampleTweets || []);
      setSampleReplies(data.sampleReplies || []);
      setImportSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import profile');
      setImportSuccess(false);
    } finally {
      setImportLoading(false);
    }
  };

  const handleVoiceSelect = (questionId: string, value: string) => {
    setVoiceAttributes(prev => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const toggleAvoidPattern = (pattern: AvoidPattern) => {
    setAvoidPatterns(prev =>
      prev.includes(pattern)
        ? prev.filter(p => p !== pattern)
        : [...prev, pattern]
    );
  };

  const handleNext = () => {
    setError('');
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    setError('');
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      await onSave({
        xHandle,
        xBio,
        sampleTweets,
        sampleReplies,
        voiceAttributes,
        positioning,
        avoidPatterns,
        displayName,
        bio,
        tone,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  // Calculate voice confidence preview
  const calculateConfidence = (): number => {
    let score = 0;
    if (displayName) score += 8;
    if (bio) score += 10;
    if (tone) score += 7;
    if (voiceAttributes.conversationStyle) score += 5;
    if (voiceAttributes.disagreementApproach) score += 5;
    if (voiceAttributes.valueAddStyle) score += 5;
    if (voiceAttributes.humorLevel) score += 5;
    if (voiceAttributes.expertiseDisplay) score += 5;
    if (positioning) score += 10;
    if (avoidPatterns.length > 0) score += 5;
    if (xHandle) score += 5;
    if (xBio) score += 5;
    if (sampleReplies.length > 0) score += Math.min(20, sampleReplies.length * 5);
    return Math.min(100, score);
  };

  const confidence = calculateConfidence();

  const canProceed = (): boolean => {
    switch (step) {
      case 1: // X Handle - optional
        return true;
      case 2: // Voice picker - need at least 3 answers
        return Object.keys(voiceAttributes).length >= 3;
      case 3: // Positioning - required
        return positioning.trim().length > 10;
      case 4: // Anti-patterns - optional
        return true;
      case 5: // Review
        return displayName.trim().length > 0;
      default:
        return true;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                s < step
                  ? 'bg-green-500 text-white'
                  : s === step
                  ? 'bg-white text-black'
                  : 'bg-white/10 text-gray-500'
              }`}
            >
              {s < step ? <Check className="w-4 h-4" /> : s}
            </div>
          ))}
        </div>
        <div className="text-sm text-gray-400">
          Voice Confidence: <span className={confidence >= 70 ? 'text-green-400' : confidence >= 40 ? 'text-yellow-400' : 'text-gray-400'}>{confidence}%</span>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: X Handle Import */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                  <Download className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Import Your Voice</h2>
                  <p className="text-sm text-gray-400">Optionally import your X bio and recent tweets</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Your X Handle</label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={xHandle}
                        onChange={(e) => {
                          setXHandle(e.target.value);
                          setImportSuccess(false);
                        }}
                        placeholder="@yourusername"
                        className={`w-full px-4 py-2.5 bg-white/5 border rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 transition-colors ${
                          importSuccess
                            ? 'border-green-500/50 focus:ring-green-500/50'
                            : 'border-white/10 focus:ring-blue-500/50'
                        }`}
                      />
                      {importSuccess && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Check className="w-5 h-5 text-green-400" />
                        </div>
                      )}
                    </div>
                    <Button
                      onClick={handleImportFromX}
                      disabled={importLoading || !xHandle.trim()}
                      className={importSuccess ? 'bg-green-500 hover:bg-green-600' : 'bg-blue-500 hover:bg-blue-600'}
                    >
                      {importLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : importSuccess ? (
                        <>
                          <Check className="w-4 h-4 mr-1" />
                          Linked
                        </>
                      ) : (
                        'Import'
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {importSuccess
                      ? 'Profile imported successfully. Continue to the next step.'
                      : "We'll fetch your bio and recent tweets to help match your style"}
                  </p>
                </div>

                {/* Success Banner */}
                {importSuccess && (
                  <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-green-400">X account linked</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Imported {sampleReplies.length > 0 ? `${sampleReplies.length} sample replies` : 'your profile'}
                        {sampleTweets.length > 0 ? ` and ${sampleTweets.length} tweets` : ''}.
                      </p>
                    </div>
                  </div>
                )}

                {xBio && (
                  <div className="mt-4 p-4 bg-white/5 rounded-lg">
                    <p className="text-sm text-gray-400 mb-1">Imported Bio:</p>
                    <p className="text-white">{xBio}</p>
                  </div>
                )}

                {sampleReplies.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-gray-400 mb-2">Found {sampleReplies.length} recent replies</p>
                    <div className="space-y-2">
                      {sampleReplies.slice(0, 3).map((reply) => (
                        <div key={reply.id} className="p-3 bg-white/5 rounded-lg text-sm text-gray-300">
                          "{reply.text.slice(0, 100)}{reply.text.length > 100 ? '...' : ''}"
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t border-white/10">
                  <p className="text-sm text-gray-500 mb-2">Or fill in manually:</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-300">Your Name</label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="How you want to be addressed"
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
                  </div>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 2: Voice Picker */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Your Voice Style</h2>
                  <p className="text-sm text-gray-400">Pick the reply that sounds most like you</p>
                </div>
              </div>

              <div className="space-y-8">
                {VOICE_QUESTIONS.map((question, qIndex) => (
                  <div key={question.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium">{qIndex + 1}. {question.title}</h3>
                      {voiceAttributes[question.id as keyof VoiceAttributes] && (
                        <span className="text-xs text-green-400 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Selected
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">{question.description}</p>

                    {/* Example Tweet */}
                    <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <p className="text-xs text-gray-500 mb-1">Tweet:</p>
                      <p className="text-sm">"{question.tweet}"</p>
                    </div>

                    {/* Reply Options */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {question.options.map((option) => {
                        const isSelected = voiceAttributes[question.id as keyof VoiceAttributes] === option.value;
                        return (
                          <button
                            key={option.value}
                            onClick={() => handleVoiceSelect(question.id, option.value)}
                            className={`p-3 rounded-lg border text-left transition-all ${
                              isSelected
                                ? 'bg-white/10 border-white/30 ring-1 ring-white/20'
                                : 'bg-white/5 border-white/10 hover:bg-white/10'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-400">{option.label}</span>
                              {isSelected && <Check className="w-3 h-3 text-green-400" />}
                            </div>
                            <p className="text-sm text-gray-300">"{option.reply}"</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400">
                  Selected: {Object.keys(voiceAttributes).length} of 5 (minimum 3 required)
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 3: Positioning */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <span className="text-lg">🎯</span>
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Your Positioning</h2>
                  <p className="text-sm text-gray-400">What do you want to be known for?</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">
                    When someone reads your replies, what should they think?
                  </label>
                  <textarea
                    value={positioning}
                    onChange={(e) => setPositioning(e.target.value)}
                    placeholder="Example: This person really understands early-stage startups and AI implementation. They give practical, no-BS advice without being preachy."
                    rows={4}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This helps the AI understand what angle to take in replies
                  </p>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <label className="block text-sm font-medium mb-2 text-gray-300">Tone / Style (optional)</label>
                  <input
                    type="text"
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    placeholder="casual, helpful, friendly - not salesy"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 4: Anti-Patterns */}
        {step === 4 && (
          <motion.div
            key="step4"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                  <XIcon className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">What to Avoid</h2>
                  <p className="text-sm text-gray-400">What should your replies NEVER sound like?</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVOID_PATTERNS_OPTIONS.map((pattern) => {
                  const isSelected = avoidPatterns.includes(pattern.value);
                  return (
                    <button
                      key={pattern.value}
                      onClick={() => toggleAvoidPattern(pattern.value)}
                      className={`p-4 rounded-lg border text-left transition-all ${
                        isSelected
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{pattern.label}</span>
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-red-500 border-red-500' : 'border-white/20'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500">{pattern.example}</p>
                    </button>
                  );
                })}
              </div>

              <div className="mt-6 pt-4 border-t border-white/10">
                <p className="text-sm text-gray-400">
                  Selected {avoidPatterns.length} patterns to avoid
                </p>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step 5: Review */}
        {step === 5 && (
          <motion.div
            key="step5"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Review Your Voice Profile</h2>
                  <p className="text-sm text-gray-400">Make sure everything looks right</p>
                </div>
              </div>

              <div className="space-y-6">
                {/* Voice Confidence */}
                <div className="p-4 bg-white/5 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Style Match Score</span>
                      <button
                        onClick={() => setShowScoreInfo(!showScoreInfo)}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="What does this mean?"
                      >
                        <Info className="w-4 h-4 text-gray-400" />
                      </button>
                    </div>
                    <span className={`text-2xl font-bold ${confidence >= 70 ? 'text-green-400' : confidence >= 40 ? 'text-yellow-400' : 'text-gray-400'}`}>
                      {confidence}%
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        confidence >= 70 ? 'bg-green-500' : confidence >= 40 ? 'bg-yellow-500' : 'bg-gray-500'
                      }`}
                      style={{ width: `${confidence}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">
                    {confidence >= 70
                      ? 'Excellent! Your replies will closely match your style.'
                      : confidence >= 40
                      ? 'Good start! Add more details to improve accuracy.'
                      : 'Basic profile. Consider completing more sections.'}
                  </p>

                  {/* Info Card */}
                  {showScoreInfo && (
                    <div className="mt-4 p-4 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <span className="text-sm font-medium text-gray-300">What it means:</span>
                        <button
                          onClick={() => setShowScoreInfo(false)}
                          className="p-1 hover:bg-white/10 rounded transition-colors -mr-1 -mt-1"
                        >
                          <XIcon className="w-4 h-4 text-gray-500" />
                        </button>
                      </div>
                      <ul className="text-sm space-y-1.5 mb-3">
                        <li className="text-gray-500">0-40%: Basic - AI has minimal context, replies will be generic</li>
                        <li className="text-yellow-400/90">40-70%: Good - AI knows your general style and preferences</li>
                        <li className="text-green-400/90">70-100%: Excellent - AI can closely match how you actually write</li>
                      </ul>
                      <p className="text-sm text-gray-400">
                        At <span className="text-white font-medium">{confidence}%</span>,
                        {confidence >= 70
                          ? ' the AI has enough data to generate replies that sound like you. The more sample replies it imported from your X account, the better it can mimic your actual voice.'
                          : confidence >= 40
                          ? ' the AI knows your general style. Link your X account and import sample replies to improve accuracy.'
                          : ' set up your writing style and link your X account so the AI can learn how you write.'}
                      </p>
                    </div>
                  )}

                  {/* Score Breakdown */}
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <p className="text-xs font-medium text-gray-400 mb-3">Your score breakdown:</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className={displayName ? 'text-green-400' : 'text-gray-500'}>
                          {displayName ? <Check className="w-3 h-3 inline mr-1" /> : '○ '}Name
                        </span>
                        <span className="text-gray-500">8 pts</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={bio ? 'text-green-400' : 'text-gray-500'}>
                          {bio ? <Check className="w-3 h-3 inline mr-1" /> : '○ '}Bio
                        </span>
                        <span className="text-gray-500">10 pts</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={tone ? 'text-green-400' : 'text-gray-500'}>
                          {tone ? <Check className="w-3 h-3 inline mr-1" /> : '○ '}Tone
                        </span>
                        <span className="text-gray-500">7 pts</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={positioning ? 'text-green-400' : 'text-gray-500'}>
                          {positioning ? <Check className="w-3 h-3 inline mr-1" /> : '○ '}Positioning
                        </span>
                        <span className="text-gray-500">10 pts</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={Object.keys(voiceAttributes).length >= 5 ? 'text-green-400' : 'text-gray-500'}>
                          {Object.keys(voiceAttributes).length >= 5 ? <Check className="w-3 h-3 inline mr-1" /> : '○ '}Style questions
                        </span>
                        <span className="text-gray-500">25 pts</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={avoidPatterns.length > 0 ? 'text-green-400' : 'text-gray-500'}>
                          {avoidPatterns.length > 0 ? <Check className="w-3 h-3 inline mr-1" /> : '○ '}Avoid patterns
                        </span>
                        <span className="text-gray-500">5 pts</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={xHandle ? 'text-green-400' : 'text-gray-500'}>
                          {xHandle ? <Check className="w-3 h-3 inline mr-1" /> : '○ '}X handle
                        </span>
                        <span className="text-gray-500">5 pts</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className={xBio ? 'text-green-400' : 'text-gray-500'}>
                          {xBio ? <Check className="w-3 h-3 inline mr-1" /> : '○ '}X bio
                        </span>
                        <span className="text-gray-500">5 pts</span>
                      </div>
                      <div className="flex items-center justify-between col-span-2">
                        <span className={sampleReplies.length > 0 ? 'text-green-400' : 'text-gray-500'}>
                          {sampleReplies.length > 0 ? <Check className="w-3 h-3 inline mr-1" /> : '○ '}Sample replies ({sampleReplies.length} imported)
                        </span>
                        <span className="text-gray-500">up to 20 pts</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Profile</h4>
                    <p className="text-white">{displayName || 'Not set'}</p>
                    {bio && <p className="text-sm text-gray-400 mt-1">{bio.slice(0, 100)}{bio.length > 100 ? '...' : ''}</p>}
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">X Account</h4>
                    <p className="text-white">{xHandle ? `@${xHandle.replace('@', '')}` : 'Not linked'}</p>
                    {sampleReplies.length > 0 && (
                      <p className="text-sm text-gray-400 mt-1">{sampleReplies.length} sample replies imported</p>
                    )}
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Writing Style</h4>
                    <p className="text-white">{Object.keys(voiceAttributes).length} of 5 questions answered</p>
                    {Object.entries(voiceAttributes).slice(0, 2).map(([key, value]) => (
                      <p key={key} className="text-sm text-gray-400 mt-1 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}: {value}
                      </p>
                    ))}
                  </div>

                  <div className="p-4 bg-white/5 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Avoid Patterns</h4>
                    <p className="text-white">{avoidPatterns.length} patterns selected</p>
                    {avoidPatterns.slice(0, 3).map((p) => (
                      <p key={p} className="text-sm text-gray-400 mt-1">
                        {AVOID_PATTERNS_OPTIONS.find(o => o.value === p)?.label}
                      </p>
                    ))}
                  </div>
                </div>

                {positioning && (
                  <div className="p-4 bg-white/5 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-400 mb-2">Positioning</h4>
                    <p className="text-white">{positioning}</p>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4">
        <div>
          {step > 1 ? (
            <Button
              variant="outline"
              onClick={handleBack}
              className="border-white/10 hover:bg-white/5"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          ) : onCancel ? (
            <Button
              variant="outline"
              onClick={onCancel}
              className="border-white/10 hover:bg-white/5"
            >
              Cancel
            </Button>
          ) : null}
        </div>

        <div>
          {step < totalSteps ? (
            <Button
              onClick={handleNext}
              disabled={!canProceed()}
              className="bg-white text-black hover:bg-gray-200"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSave}
              disabled={loading || !canProceed()}
              variant="ghost"
              className="bg-green-500 hover:bg-green-600"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Save Voice Profile
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
