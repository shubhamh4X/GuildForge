import React, { useState } from 'react';
import {
  Shield,
  Layers,
  Rocket,
  Lock,
  ArrowRight,
  Bot,
  Server,
  Terminal,
  ChevronDown,
  Cpu
} from 'lucide-react';

interface LandingPageProps {
  onStartBuilding: () => void;
  onExploreFeatures: () => void;
  onOpenInviteModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartBuilding,
  onExploreFeatures,
  onOpenInviteModal,
}) => {
  const [activeFaq, setActiveFaq] = useState<number | null>(0);

  const faqs = [
    {
      q: 'Can the Discord Bot create a brand-new Discord Server from scratch automatically?',
      a: 'Yes! Using Discord REST API v10 (POST /guilds), your authenticated bot can spawn a brand-new Discord server directly from GuildForge, generate a permanent discord.gg invite link for you to join, and provision all roles, categories, channels, and permissions automatically—or deploy onto any existing server where the bot is invited.',
    },
    {
      q: 'How does the AI prevent accidental permission leaks to @everyone?',
      a: 'Our Gemini AI architecture generator enforces the Principle of Least Privilege. Rank 1 is the only role granted the ADMINISTRATOR flag. All internal department categories and channels include explicit negative permission overwrites denying VIEW_CHANNEL to @everyone.',
    },
    {
      q: 'What Discord channel types are supported?',
      a: 'The engine provisions standard text channels (GUILD_TEXT), voice lounges (GUILD_VOICE with custom user limits), community announcement feeds (GUILD_ANNOUNCEMENT), forum threads (GUILD_FORUM), and stage audio (GUILD_STAGE_VOICE).',
    },
    {
      q: 'How does rate limiting and Discord API safety work during deployment?',
      a: 'Discord enforces strict rate limits on channel and role creation. The deployment engine runs a sequential operation queue with automated backoff, bucket tracking, and exponential sleep on HTTP 429 status codes.',
    },
    {
      q: 'Can I customize the generated blueprint before deploying?',
      a: 'Yes. After AI generation, the Architecture Studio lets you rename channels, edit role colors, adjust slowmodes, configure voice limits, reorder hierarchies, and toggle channel/category permission overwrites.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#080808] text-white selection:bg-[#7547FF] selection:text-white">

      <section className="relative overflow-hidden pt-20 pb-24 lg:pt-28 lg:pb-32 border-b border-[#252525]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#111111] border border-[#252525] text-[#906BFF] text-xs font-semibold mb-8">
            <span>Zero-Trust Architecture Synthesis & Discord REST API v10</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
            Build Your Discord Server.{' '}
            <span className="text-[#906BFF]">Let AI Handle the Architecture.</span>
          </h1>

          <p className="mt-6 text-base sm:text-lg text-[#9CA3AF] max-w-2xl mx-auto font-normal leading-relaxed">
            Describe your community in natural language. GuildForge synthesizes a complete role hierarchy, category structure, permission matrix, and deploys it directly to your Discord server.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={onStartBuilding}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#7547FF] hover:bg-[#6537EF] text-white font-bold text-sm flex items-center justify-center gap-2.5 transition-all cursor-pointer"
            >
              <span>Launch Blueprint Studio</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onExploreFeatures}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#111111] hover:bg-[#171717] text-white font-semibold text-sm border border-[#252525] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Layers className="w-4 h-4 text-[#906BFF]" />
              <span>Open Workspace</span>
            </button>

            <button
              onClick={onOpenInviteModal}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#111111] hover:bg-[#171717] text-[#9CA3AF] hover:text-white font-medium text-sm border border-[#252525] flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Bot className="w-4 h-4 text-[#906BFF]" />
              <span>Invite Bot to Server</span>
            </button>
          </div>

          <div className="mt-12 max-w-2xl mx-auto p-4 rounded-xl bg-[#111111] border border-[#252525] text-left flex items-start gap-3">
            <div className="p-1.5 rounded-lg bg-[#171717] text-[#906BFF] shrink-0 mt-0.5">
              <Server className="w-4 h-4" />
            </div>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              <strong className="text-white font-semibold">Discord API Native Architecture:</strong> Have your bot create a brand-new Discord server (or invite it to an existing one), describe your community requirements in Blueprint Studio, inspect the generated permission hierarchy, and deploy live via Discord REST API v10.
            </p>
          </div>
        </div>
      </section>

      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-xs font-bold tracking-widest text-[#906BFF] uppercase">
            Automated Pipeline
          </h2>
          <p className="mt-2 text-3xl font-extrabold text-white">How GuildForge Works</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            {
              step: '01',
              title: 'Natural Language Brief',
              desc: 'Describe your community requirements, expected member count, security posture, and operational departments.',
              icon: Terminal,
            },
            {
              step: '02',
              title: 'Gemini Deep Synthesis',
              desc: 'Gemini 3.8 Flash structures departments, role hierarchies, least-privilege bitmasks, and channel category layouts.',
              icon: Cpu,
            },
            {
              step: '03',
              title: 'Architecture & Security Audit',
              desc: 'Inspect and customize every role, channel, and permission overwrite, then run the automated Security Auditor.',
              icon: Shield,
            },
            {
              step: '04',
              title: 'Live Bot Deployment',
              desc: 'Your Discord bot provisions roles, private category isolation gates, and channels sequentially on your server.',
              icon: Rocket,
            },
          ].map(item => (
            <div
              key={item.step}
              className="p-6 rounded-xl bg-[#111111] border border-[#252525] space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xl font-black text-[#71717A] font-mono">{item.step}</span>
                <div className="p-2 rounded-lg bg-[#171717] text-[#906BFF]">
                  <item.icon className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-base font-bold text-white">{item.title}</h3>
              <p className="text-xs text-[#9CA3AF] leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 border-t border-[#252525] max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-xl bg-[#111111] border border-[#252525] space-y-3">
            <Shield className="w-6 h-6 text-[#906BFF]" />
            <h3 className="text-base font-bold text-white">Zero-Trust Role Hierarchy</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Dangerous permissions are scoped strictly to executive and moderation tiers, preventing privilege escalation and hierarchy inversions.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#111111] border border-[#252525] space-y-3">
            <Lock className="w-6 h-6 text-[#906BFF]" />
            <h3 className="text-base font-bold text-white">Category-Level Isolation</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Private staff, management, and audit categories enforce explicit @everyone deny overwrites so internal channels are never exposed.
            </p>
          </div>

          <div className="p-6 rounded-xl bg-[#111111] border border-[#252525] space-y-3">
            <Terminal className="w-6 h-6 text-emerald-400" />
            <h3 className="text-base font-bold text-white">Idempotent Live Provisioning</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Pre-flight checks verify bot permissions and existing server channels/roles before executing rate-limit paced Discord REST API v10 calls.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-[#252525] max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-white">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="rounded-xl bg-[#111111] border border-[#252525] overflow-hidden"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full p-4 text-left flex items-center justify-between gap-4 font-semibold text-sm text-white cursor-pointer"
              >
                <span>{faq.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-[#9CA3AF] transition-transform duration-200 shrink-0 ${
                    activeFaq === idx ? 'rotate-180 text-[#906BFF]' : ''
                  }`}
                />
              </button>
              {activeFaq === idx && (
                <div className="px-4 pb-4 text-xs text-[#9CA3AF] leading-relaxed border-t border-[#252525] pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

