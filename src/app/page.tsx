'use client';

import { motion } from 'motion/react';
import { ArrowRight, Mail, Sparkles, Clock, Target, Check, Zap, MessageSquare, TrendingUp, Inbox } from 'lucide-react';
import { Button } from './components/ui/button';
import { Card } from './components/ui/card';

export default function Home() {

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-xl fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-6 h-6" />
            <span className="font-semibold text-xl">XeroScroll</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#pricing" className="text-base font-medium text-gray-300 hover:text-white transition-colors">
              Pricing
            </a>
            <a href="/dashboard">
              <Button variant="default" size="lg">
                Sign In
              </Button>
            </a>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-sm text-gray-300">AI-powered growth without the scroll</span>
            </div>

            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
              Grow on X
              <br />
              <span className="text-gray-500">without scrolling</span>
            </h1>

            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
              Get daily email digests of reply opportunities. AI drafts your replies.
              30 seconds a day. No feed scrolling required.
            </p>

            <div className="flex justify-center">
              <a href="/signup">
                <Button className="bg-white text-black hover:bg-gray-200 gap-2 px-8 py-4 text-lg">
                  Start Free
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </a>
            </div>
            <p className="text-sm text-gray-500 mt-6">Free tier available. No credit card required.</p>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-center"
            >
              <div className="text-6xl md:text-7xl font-bold mb-3">30s</div>
              <div className="text-gray-400 text-lg">Daily time investment</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="text-center"
            >
              <div className="text-6xl md:text-7xl font-bold mb-3">0</div>
              <div className="text-gray-400 text-lg">Hours scrolling</div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="text-center"
            >
              <div className="text-6xl md:text-7xl font-bold mb-3">10x</div>
              <div className="text-gray-400 text-lg">More meaningful replies</div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-6 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">How it works</h2>
            <p className="text-gray-400 text-lg">Three simple steps to grow your X presence</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-10 bg-white/5 border-white/10 hover:bg-white/[0.07] hover:scale-105 transition-all duration-300 h-full">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-8">
                  <Mail className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">Daily digest</h3>
                <p className="text-gray-400 leading-relaxed text-base">
                  Every morning, get an email with the best reply opportunities from accounts you care about.
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-10 bg-white/5 border-white/10 hover:bg-white/[0.07] hover:scale-105 transition-all duration-300 h-full">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-8">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">AI-drafted replies</h3>
                <p className="text-gray-400 leading-relaxed text-base">
                  Each opportunity comes with an AI-generated reply that matches your style and adds value.
                </p>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
            >
              <Card className="p-10 bg-white/5 border-white/10 hover:bg-white/[0.07] hover:scale-105 transition-all duration-300 h-full">
                <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-8">
                  <Target className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-white">One-click reply</h3>
                <p className="text-gray-400 leading-relaxed text-base">
                  Review, edit if needed, and reply—all from your email. No X app needed.
                </p>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Replies That Sound Like You Section */}
      <section className="py-12 lg:py-24 px-4 sm:px-6 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left Column - Text Content */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6 lg:space-y-12"
            >
              <div className="space-y-4 lg:space-y-6">
                <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-semibold leading-tight tracking-tight">
                  Replies that sound like you.{' '}
                  <span className="text-gray-500">On autopilot.</span>
                </h2>
              </div>

              <div className="space-y-4 lg:space-y-6">
                {/* Bullet Point 1 */}
                <div className="flex gap-3 lg:gap-4">
                  <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Target className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                  </div>
                  <div className="pt-1.5 lg:pt-2">
                    <p className="text-base lg:text-lg text-gray-300 leading-relaxed">
                      Monitors accounts you pick, finds{' '}
                      <span className="text-blue-400 font-medium">&quot;the best reply opportunities&quot;</span>
                    </p>
                  </div>
                </div>

                {/* Bullet Point 2 */}
                <div className="flex gap-3 lg:gap-4">
                  <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400" />
                  </div>
                  <div className="pt-1.5 lg:pt-2">
                    <p className="text-base lg:text-lg text-gray-300 leading-relaxed">
                      Writes drafts in{' '}
                      <span className="text-purple-400 font-medium">&quot;your actual style&quot;</span>
                    </p>
                  </div>
                </div>

                {/* Bullet Point 3 */}
                <div className="flex gap-3 lg:gap-4">
                  <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5 text-blue-400" />
                  </div>
                  <div className="pt-1.5 lg:pt-2">
                    <p className="text-base lg:text-lg text-gray-300 leading-relaxed">
                      <span className="text-blue-400 font-medium">&quot;Learns and improves&quot;</span>{' '}
                      the more you use it
                    </p>
                  </div>
                </div>

                {/* Bullet Point 4 */}
                <div className="flex gap-3 lg:gap-4">
                  <div className="flex-shrink-0 w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Inbox className="w-4 h-4 lg:w-5 lg:h-5 text-purple-400" />
                  </div>
                  <div className="pt-1.5 lg:pt-2">
                    <p className="text-base lg:text-lg text-gray-300 leading-relaxed">
                      Lands in your inbox every morning. Just copy, paste, post.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Column - Email Mockup */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="bg-gradient-to-br from-white/10 to-white/5 rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
                {/* Email Header */}
                <div className="bg-white/5 border-b border-white/10 px-4 lg:px-6 py-3 lg:py-4">
                  <div className="flex items-center gap-2 lg:gap-3">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                      <Inbox className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs lg:text-sm font-medium truncate">Your Daily Reply Digest</div>
                      <div className="text-[10px] lg:text-xs text-gray-500">XeroScroll · Today 7:00 AM</div>
                    </div>
                    <div className="px-2 lg:px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 flex-shrink-0">
                      <span className="text-[10px] lg:text-xs font-medium text-blue-400">Style Match: 87%</span>
                    </div>
                  </div>
                </div>

                {/* Email Body */}
                <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
                  <div className="text-sm text-gray-400">
                    Good morning! Here are your top reply opportunities:
                  </div>

                  {/* Reply Draft 1 */}
                  <div className="bg-black/30 rounded-xl border border-white/5 p-3 lg:p-5 space-y-2 lg:space-y-3">
                    <div className="flex items-start gap-2 lg:gap-3">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs lg:text-sm font-medium">@sarah_designer</div>
                        <div className="text-[10px] lg:text-xs text-gray-500 truncate">
                          &quot;Anyone have tips for better async team communication?&quot;
                        </div>
                      </div>
                    </div>
                    <div className="text-xs lg:text-sm text-gray-300 leading-relaxed">
                      &quot;We switched to daily async standups last quarter and it&apos;s been game-changing.
                      Key is keeping them structured: what you did, what&apos;s next, blockers.&quot;
                    </div>
                    <div className="flex gap-2">
                      <button className="px-2 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs font-medium bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
                        Copy & Post
                      </button>
                      <button className="px-2 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs font-medium text-gray-400 hover:text-gray-300 transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Reply Draft 2 */}
                  <div className="bg-black/30 rounded-xl border border-white/5 p-3 lg:p-5 space-y-2 lg:space-y-3">
                    <div className="flex items-start gap-2 lg:gap-3">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs lg:text-sm font-medium">@devjones</div>
                        <div className="text-[10px] lg:text-xs text-gray-500 truncate">
                          &quot;What tools are you using for API monitoring in 2026?&quot;
                        </div>
                      </div>
                    </div>
                    <div className="text-xs lg:text-sm text-gray-300 leading-relaxed">
                      &quot;Still a huge fan of Datadog for this. The alerting is solid and integrates
                      nicely with Slack. Worth the price if you&apos;re scaling.&quot;
                    </div>
                    <div className="flex gap-2">
                      <button className="px-2 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs font-medium bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors">
                        Copy & Post
                      </button>
                      <button className="px-2 lg:px-3 py-1 lg:py-1.5 text-[10px] lg:text-xs font-medium text-gray-400 hover:text-gray-300 transition-colors">
                        Edit
                      </button>
                    </div>
                  </div>

                  {/* Reply Draft 3 - Faded (Hidden on mobile) */}
                  <div className="hidden sm:block bg-black/30 rounded-xl border border-white/5 p-3 lg:p-5 space-y-2 lg:space-y-3 opacity-50">
                    <div className="flex items-start gap-2 lg:gap-3">
                      <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs lg:text-sm font-medium">@marketing_maya</div>
                        <div className="text-[10px] lg:text-xs text-gray-500 truncate">
                          &quot;How do you balance growth tactics with brand building?&quot;
                        </div>
                      </div>
                    </div>
                    <div className="text-xs lg:text-sm text-gray-300 leading-relaxed">
                      &quot;Think of growth as experiments and brand as the foundation...&quot;
                    </div>
                  </div>
                </div>
              </div>

              {/* Decorative Glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-3xl blur-3xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Visual Demo */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="p-8 md:p-12 bg-gradient-to-br from-white/10 to-white/5 border-white/10">
              <div className="flex items-start gap-4 mb-6">
                <Clock className="w-5 h-5 text-gray-400 mt-1" />
                <div>
                  <div className="text-sm text-gray-400 mb-1">Today, 8:00 AM</div>
                  <div className="font-semibold text-lg mb-4">Your Daily Digest · 5 opportunities</div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-6 bg-black/40 rounded-lg border border-white/5">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500" />
                    <div className="flex-1">
                      <div className="font-medium mb-1">@techfounder</div>
                      <p className="text-gray-300 text-sm leading-relaxed">
                        Just shipped our new feature after 3 months of work. The team pulled through 🚀
                      </p>
                    </div>
                  </div>

                  <div className="pl-13 border-l-2 border-blue-500/50 ml-5">
                    <div className="pl-4 py-2">
                      <div className="text-xs text-gray-500 mb-2 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" />
                        AI-suggested reply
                      </div>
                      <p className="text-sm text-gray-400 italic">
                        "Congrats on the launch! The persistence paid off. What was the biggest technical challenge you overcame?"
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-400 font-medium">
                  <Check className="w-4 h-4" />
                  <span>Click to reply directly from email</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-6 border-t border-white/10">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Simple pricing</h2>
            <p className="text-gray-400 text-lg">Start free, upgrade when you&apos;re ready</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
            >
              <Card className="p-8 bg-white/5 border-white/10 h-[493px] flex flex-col hover:scale-105 transition-all duration-300">
                <div className="mb-6">
                  <h3 className="text-2xl font-semibold mb-2">Free</h3>
                  <div className="text-4xl font-bold mb-1">$0</div>
                  <p className="text-gray-400">Forever free</p>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">1 account to monitor</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">AI-drafted replies</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300">Daily email digest</span>
                  </li>
                </ul>

                <a href="/signup" className="mt-auto">
                  <Button variant="default" className="w-full">
                    Get Started
                  </Button>
                </a>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
            >
              <Card className="p-8 bg-white text-black h-[493px] flex flex-col relative overflow-hidden hover:scale-105 transition-all duration-300">
                <div className="absolute top-4 right-4">
                  <div className="px-3 py-1 bg-black/10 rounded-full text-xs font-medium">
                    POPULAR
                  </div>
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-semibold mb-2">Pro</h3>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-bold">$29</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                  <p className="text-gray-600">Everything you need to grow</p>
                </div>

                <ul className="space-y-4 mb-8">
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-black mt-0.5 flex-shrink-0" />
                    <span>10 accounts to monitor</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-black mt-0.5 flex-shrink-0" />
                    <span>AI replies in your style</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-black mt-0.5 flex-shrink-0" />
                    <span>Skip political content filter</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-black mt-0.5 flex-shrink-0" />
                    <span>Priority support</span>
                  </li>
                </ul>

                <a href="/api/checkout" className="mt-auto">
                  <button className="w-full bg-black text-white hover:bg-black/90 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors">
                    Start Pro
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </a>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Stop scrolling.
              <br />
              Start growing.
            </h2>
            <p className="text-xl text-gray-400 mb-10">
              Join creators who&apos;ve reclaimed their time and grown their audience.
            </p>

            <a href="/signup">
              <button className="bg-white text-black hover:bg-gray-200 inline-flex items-center gap-3 px-16 py-6 text-xl font-medium rounded-2xl transition-colors">
                Get started for free
                <ArrowRight className="w-6 h-6" />
              </button>
            </a>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span className="font-semibold">XeroScroll</span>
            </div>

            <div className="flex gap-8 text-sm text-gray-400">
              <a href="/faq" className="hover:text-white transition-colors">FAQ</a>
              <a href="mailto:josh@xeroscroll.com" className="hover:text-white transition-colors">Contact</a>
            </div>

            <div className="text-sm text-gray-500">
              © 2025 XeroScroll
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
