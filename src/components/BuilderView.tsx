import React, { useState, useMemo } from 'react';
import {
  Wand2,
  Shield,
  Users,
  Layers,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  Lock,
  Terminal,
  Sliders,
  Cpu,
  ChevronDown,
  ChevronUp,
  Hash,
  Volume2,
  MessageSquare,
  Megaphone,
  Radio,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit3,
  Ticket,
  Bot,
  Eye,
  Key,
  RotateCcw,
  Check,
} from 'lucide-react';
import {
  ServerBlueprint,
  QualityAuditReport,
  AdvancedArchitectureConfig,
  DEFAULT_ADVANCED_CONFIG,
} from '../types/discord';
import { apiClient, RequirementAnalysis } from '../services/apiClient';
import { evaluateArchitectureCompleteness, verifyAutomationModules } from '../services/validator';

interface BuilderViewProps {
  currentBlueprint?: ServerBlueprint | null;
  onBlueprintGenerated?: (blueprint: ServerBlueprint, report?: QualityAuditReport) => void;
  onGenerateSuccess?: (blueprint: ServerBlueprint, report: QualityAuditReport) => void;
  onOpenInviteModal?: () => void;
  geminiConfigured?: boolean;
}

const SERVER_ARCHETYPES = [
  { id: 'Esports Organization', label: 'Esports Organization', defaultScale: 2500 },
  { id: 'Gaming Community', label: 'Gaming Community', defaultScale: 5000 },
  { id: 'GTA V / FiveM Roleplay', label: 'GTA V / FiveM Roleplay', defaultScale: 3000 },
  { id: 'Tech Startup / SaaS', label: 'Tech Startup / SaaS', defaultScale: 1500 },
  { id: 'Creator / Streamer Hub', label: 'Creator / Streamer Hub', defaultScale: 10000 },
  { id: 'Web3 / Open Source DAO', label: 'Web3 / Open Source DAO', defaultScale: 4000 },
  { id: 'Academic / Study Network', label: 'Academic / Study Network', defaultScale: 2000 },
  { id: 'Custom Community', label: 'Custom Community', defaultScale: 1000 },
];

const DEFAULT_DEPARTMENTS = [
  'Executive Leadership',
  'Operations & Management',
  'Administration',
  'Moderation Department',
  'Community Management',
  'Support & Tickets',
  'Competitive & Coaching',
  'Tournament Administration',
  'Recruitment',
  'Media & Production',
  'Partnerships',
  'Development & Technology',
  'Events & Activities',
  'Security & Anti-Abuse',
  'Finance & Sponsorships',
];

const TEXT_CHANNEL_OPTIONS = [
  { id: 'general-chat', label: 'General Chat', native: true },
  { id: 'announcements', label: 'Announcements', native: true },
  { id: 'rules', label: 'Rules', native: true },
  { id: 'welcome-info', label: 'Welcome Information', native: true },
  { id: 'news-updates', label: 'News & Updates', native: true },
  { id: 'discussion', label: 'Discussion', native: true },
  { id: 'qna', label: 'Questions & Answers', native: true },
  { id: 'suggestions', label: 'Suggestions', native: true },
  { id: 'polls', label: 'Polls', native: true },
  { id: 'media-sharing', label: 'Media Sharing', native: true },
  { id: 'memes', label: 'Memes', native: true },
  { id: 'introductions', label: 'Introductions', native: true },
  { id: 'off-topic', label: 'Off-Topic', native: true },
  { id: 'bot-commands', label: 'Bot Commands', native: true },
  { id: 'staff-chat', label: 'Staff Communication', native: true },
  { id: 'dept-chat', label: 'Department Communication', native: true },
  { id: 'private-logs', label: 'Private Logs', native: false },
  { id: 'changelogs', label: 'Changelogs', native: true },
];

const VOICE_CHANNEL_OPTIONS = [
  { id: 'general-voice', label: 'General Voice Lounge', native: true },
  { id: 'community-hangout', label: 'Community Hangout', native: true },
  { id: 'gaming-rooms', label: 'Gaming Rooms', native: true },
  { id: 'squad-rooms', label: 'Squad Rooms', native: true },
  { id: 'team-comms', label: 'Team Communication', native: true },
  { id: 'tournament-rooms', label: 'Tournament Rooms', native: true },
  { id: 'coaching-rooms', label: 'Coaching Rooms', native: true },
  { id: 'staff-voice', label: 'Private Staff Voice', native: true },
  { id: 'meeting-rooms', label: 'Meeting Rooms', native: true },
  { id: 'afk-channel', label: 'AFK Channel', native: true },
  { id: 'temp-voice', label: 'Temporary Voice Rooms', native: false },
];

const FORUM_CHANNEL_OPTIONS = [
  { id: 'support-forum', label: 'Support Forum', native: true },
  { id: 'bug-reports', label: 'Bug Reports', native: true },
  { id: 'suggestions-forum', label: 'Suggestions Forum', native: true },
  { id: 'recruitment-apps', label: 'Recruitment Applications', native: true },
  { id: 'team-recruitment', label: 'Team Recruitment', native: true },
  { id: 'community-discussions', label: 'Community Discussions', native: true },
  { id: 'tutorials-guides', label: 'Tutorials & Guides', native: true },
  { id: 'qna-forum', label: 'Questions & Answers', native: true },
];

const ANNOUNCEMENT_CHANNEL_OPTIONS = [
  { id: 'official-announcements', label: 'Official Announcements', native: true },
  { id: 'tournament-announcements', label: 'Tournament Announcements', native: true },
  { id: 'event-announcements', label: 'Event Announcements', native: true },
  { id: 'maintenance-updates', label: 'Maintenance Updates', native: true },
  { id: 'partnership-announcements', label: 'Partnership Announcements', native: true },
];

const ROLE_GROUP_PRESETS = [
  {
    id: 'Executive Leadership',
    label: 'Executive Leadership',
    examples: 'Founder, Co-Founder, Chief Executive, Community Director',
  },
  {
    id: 'Administration',
    label: 'Administration',
    examples: 'Server Administrator, Head Admin, Senior Admin, Junior Admin',
  },
  {
    id: 'Moderation',
    label: 'Moderation',
    examples: 'Head Moderator, Senior Moderator, Moderator, Trial Moderator',
  },
  {
    id: 'Community',
    label: 'Community Tiers',
    examples: 'Verified Member, Member, Newcomer, VIP, Supporter, Booster',
  },
  {
    id: 'Competitive Gaming',
    label: 'Competitive Gaming',
    examples: 'Esports Director, Tournament Director, Team Manager, Head Coach, Coach, Captain, Player, Analyst',
  },
];

type ProcessingStage = 'IDLE' | 'ANALYZING' | 'GENERATING' | 'VALIDATING' | 'COMPLETED' | 'ERROR';

type AdvancedTabId =
  | 'structure'
  | 'channels'
  | 'roles'
  | 'departments'
  | 'permissions'
  | 'onboarding'
  | 'moderation'
  | 'tickets'
  | 'voice'
  | 'automations';

const ADVANCED_TABS: Array<{ id: AdvancedTabId; label: string; badge?: string }> = [
  { id: 'structure', label: 'A. Server Structure' },
  { id: 'channels', label: 'B. Channel Types' },
  { id: 'roles', label: 'C. Role Architecture' },
  { id: 'departments', label: 'D. Departments' },
  { id: 'permissions', label: 'E. Permissions' },
  { id: 'onboarding', label: 'F. Onboarding' },
  { id: 'moderation', label: 'G. Security & Logs' },
  { id: 'tickets', label: 'H. Support & Tickets' },
  { id: 'voice', label: 'I. Voice Architecture' },
  { id: 'automations', label: 'J. Automations' },
];

export const BuilderView: React.FC<BuilderViewProps> = ({
  currentBlueprint,
  onBlueprintGenerated,
  onGenerateSuccess,
  geminiConfigured = true,
}) => {

  const [prompt, setPrompt] = useState(
    'Design a professional Valorant esports organization Discord server with 5,000 members. Include executive leadership, operations, pro rosters & coaching rooms, tournament administration with match lobbies, multi-tier moderation with granular audit logs, structured support tickets, and public fan engagement.'
  );
  const [serverType, setServerType] = useState('Esports Organization');
  const [expectedScale, setExpectedScale] = useState<number>(5000);
  const [securityLevel, setSecurityLevel] = useState<'standard' | 'high' | 'maximum'>('maximum');
  const [availableDepartments, setAvailableDepartments] = useState<string[]>(DEFAULT_DEPARTMENTS);
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([
    'Executive Leadership',
    'Operations & Management',
    'Competitive & Coaching',
    'Tournament Administration',
    'Moderation Department',
    'Support & Tickets',
    'Media & Production',
  ]);
  const [newDepartmentInput, setNewDepartmentInput] = useState('');
  const [editingDept, setEditingDept] = useState<string | null>(null);
  const [editingDeptValue, setEditingDeptValue] = useState('');

  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [activeAdvancedTab, setActiveAdvancedTab] = useState<AdvancedTabId>('structure');
  const [advancedConfig, setAdvancedConfig] = useState<AdvancedArchitectureConfig>(() =>
    JSON.parse(JSON.stringify(DEFAULT_ADVANCED_CONFIG))
  );

  const [processingState, setProcessingState] = useState<ProcessingStage>('IDLE');
  const [analysis, setAnalysis] = useState<RequirementAnalysis | null>(null);
  const [generatedBlueprint, setGeneratedBlueprint] = useState<ServerBlueprint | null>(null);
  const [auditReport, setAuditReport] = useState<QualityAuditReport | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastAttemptedAction, setLastAttemptedAction] = useState<'analyze' | 'generate'>('generate');
  const [aiStageNumber, setAiStageNumber] = useState<number>(0);
  const [aiStageLabel, setAiStageLabel] = useState<string>('');

  const activeTargetBlueprint = generatedBlueprint || currentBlueprint || null;
  const completenessEval = useMemo(() => {
    return evaluateArchitectureCompleteness(activeTargetBlueprint, {
      prompt,
      serverType,
      expectedScale,
      departments: selectedDepartments,
    });
  }, [activeTargetBlueprint, prompt, serverType, expectedScale, selectedDepartments]);

  const verifiedAutomations = useMemo(() => {
    if (activeTargetBlueprint) {
      return verifyAutomationModules(activeTargetBlueprint);
    }
    return advancedConfig.automations.modules.map((m) => ({
      ...m,
      runtimeStatus: (m.enabled ? 'Planned' : 'Planned') as any,
      statusReason: 'Awaiting blueprint synthesis to verify channel and role dependencies.',
    }));
  }, [activeTargetBlueprint, advancedConfig.automations.modules]);

  const configStats = useMemo(() => {
    const totalChannelsSelected =
      advancedConfig.channels.textChannels.length +
      advancedConfig.channels.voiceChannels.length +
      advancedConfig.channels.forumChannels.length +
      advancedConfig.channels.announcementChannels.length;
    const enabledTickets = advancedConfig.tickets.ticketTypes.filter((t) => t.enabled).length;
    const enabledAutomations = advancedConfig.automations.modules.filter((m) => m.enabled).length;
    const enabledLogs = Object.values(advancedConfig.moderation.logs).filter(Boolean).length;

    return {
      totalChannelsSelected,
      enabledTickets,
      enabledAutomations,
      enabledLogs,
      completenessPct: completenessEval.completionPercentage,
    };
  }, [advancedConfig, completenessEval.completionPercentage]);

  const toggleDepartment = (dept: string) => {
    setSelectedDepartments((prev) =>
      prev.includes(dept) ? prev.filter((d) => d !== dept) : [...prev, dept]
    );
  };

  const handleAddCustomDepartment = () => {
    const trimmed = newDepartmentInput.trim();
    if (!trimmed) return;
    if (!availableDepartments.includes(trimmed)) {
      setAvailableDepartments((prev) => [...prev, trimmed]);
    }
    if (!selectedDepartments.includes(trimmed)) {
      setSelectedDepartments((prev) => [...prev, trimmed]);
    }
    setNewDepartmentInput('');
  };

  const handleRemoveDepartmentOption = (dept: string) => {
    setAvailableDepartments((prev) => prev.filter((d) => d !== dept));
    setSelectedDepartments((prev) => prev.filter((d) => d !== dept));
  };

  const handleSaveRenameDepartment = (oldName: string) => {
    const trimmed = editingDeptValue.trim();
    if (!trimmed || trimmed === oldName) {
      setEditingDept(null);
      return;
    }
    setAvailableDepartments((prev) => prev.map((d) => (d === oldName ? trimmed : d)));
    setSelectedDepartments((prev) => prev.map((d) => (d === oldName ? trimmed : d)));
    setEditingDept(null);
  };

  const toggleArrayItem = (list: string[], item: string): string[] =>
    list.includes(item) ? list.filter((i) => i !== item) : [...list, item];

  const handleLetAiDecideAll = () => {
    setAdvancedConfig((prev) => ({
      ...prev,
      structure: {
        ...prev.structure,
        aiOptimizedStructure: true,
        categoryCountMode: 'auto',
        channelCountMode: 'auto',
        autoGroupRelatedChannels: true,
        autoDeduplicateChannels: true,
      },
    }));
  };

  const handleResetAdvanced = () => {
    setAdvancedConfig(JSON.parse(JSON.stringify(DEFAULT_ADVANCED_CONFIG)));
  };

  const handleAnalyzeOnly = async () => {
    if (!prompt.trim()) return;
    setLastAttemptedAction('analyze');
    setProcessingState('ANALYZING');
    setAiStageNumber(1);
    setAiStageLabel('Stage 1: Requirement Analysis');
    setErrorMessage(null);

    try {
      const res = await apiClient.analyzeRequirements({
        prompt,
        serverType,
        expectedScale,
        securityLevel,
        departments: selectedDepartments,
        advancedConfig,
      });
      setAnalysis(res.analysis);
      setProcessingState('IDLE');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to analyze community requirements.');
      setProcessingState('ERROR');
    }
  };

  const handleGenerateArchitecture = async () => {
    if (!prompt.trim()) return;
    setLastAttemptedAction('generate');
    setErrorMessage(null);
    setGeneratedBlueprint(null);
    setAuditReport(null);
    setAiStageNumber(1);
    setAiStageLabel('Stage 1: Requirement Analysis');

    try {
      let currentAnalysis = analysis;
      if (!currentAnalysis) {
        setProcessingState('ANALYZING');
        const analysisRes = await apiClient.analyzeRequirements({
          prompt,
          serverType,
          expectedScale,
          securityLevel,
          departments: selectedDepartments,
          advancedConfig,
        });
        currentAnalysis = analysisRes.analysis;
        setAnalysis(currentAnalysis);
      }

      setProcessingState('GENERATING');
      setAiStageNumber(2);
      setAiStageLabel('Stage 2: Architecture Planning');
      const genRes = await apiClient.generateArchitecture(
        {
          prompt,
          serverType,
          expectedScale,
          securityLevel,
          departments: selectedDepartments,
          analysis: currentAnalysis,
          advancedConfig,
        },
        (stageNum, stageLbl) => {
          if (typeof stageNum === 'number') {
            setAiStageNumber(stageNum);
            if (stageNum >= 5) {
              setProcessingState('VALIDATING');
            }
          }
          if (stageLbl) {
            setAiStageLabel(stageLbl);
          }
        }
      );

      setProcessingState('VALIDATING');
      setAiStageNumber(5);
      setAiStageLabel('Stage 5: Final Blueprint Validation');
      setGeneratedBlueprint(genRes.blueprint);
      setAuditReport(genRes.report);
      setProcessingState('COMPLETED');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate server architecture.');
      setProcessingState('ERROR');
    }
  };

  const isBusy =
    processingState === 'ANALYZING' ||
    processingState === 'GENERATING' ||
    processingState === 'VALIDATING';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1E212B] pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#19C37D] text-xs font-mono uppercase tracking-widest mb-1">
            <Cpu className="w-3.5 h-3.5" />
            <span>AI Server Architecture Studio</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Design Complete Discord Community Architecture
          </h2>
          <p className="text-sm text-[#A3A9B8] mt-1">
            Configure your community vision and advanced structural modules to synthesize a complete, zero-trust Discord blueprint.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-[#12141B] border border-[#1E212B] rounded-md px-3.5 py-2 flex items-center gap-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#646B7C]">
                Architecture Spec
              </div>
              <div className="text-xs font-semibold text-white flex items-center gap-2">
                <span>{selectedDepartments.length} Depts</span>
                <span className="text-[#646B7C]">•</span>
                <span className="text-[#19C37D]">
                  {advancedConfig.structure.aiOptimizedStructure ? 'AI-Optimized Scale' : 'Custom Scale'}
                </span>
              </div>
            </div>
            <div className="w-px h-7 bg-[#1E212B]" />
            <div className="text-right">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#646B7C]">
                Blueprint Completeness
              </div>
              <div
                className={`text-xs font-mono font-bold ${
                  activeTargetBlueprint
                    ? completenessEval.completionPercentage >= 90
                      ? 'text-[#19C37D]'
                      : 'text-[#F59E0B]'
                    : 'text-[#A3A9B8]'
                }`}
              >
                {activeTargetBlueprint
                  ? `${completenessEval.completionPercentage}% Blueprint Complete`
                  : '0% — Awaiting Synthesis'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        <div className="lg:col-span-7 space-y-5">

          <div className="bg-[#12141B] border border-[#1E212B] rounded-md p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-[#1E212B] pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#7547FF]" />
                <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                  1. Basic Community Configuration
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#646B7C]">Required Core Parameters</span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-mono uppercase tracking-wider text-[#A3A9B8] font-semibold">
                  Community Vision & Operational Requirements
                </label>
                <span className="text-[11px] text-[#646B7C] font-mono">{prompt.length} chars</span>
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                placeholder="Describe your community type, departments, staff hierarchy, public vs. private areas, voice rooms, ticket workflows, and security requirements..."
                className="w-full bg-[#0B0C10] border border-[#1E212B] rounded p-3.5 text-sm text-[#F2F4F8] placeholder-[#646B7C] focus:outline-none focus:border-[#7547FF] transition-colors leading-relaxed resize-y"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase tracking-wider text-[#A3A9B8] block mb-2.5">
                Server Archetype
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SERVER_ARCHETYPES.map((arch) => {
                  const active = serverType === arch.id;
                  return (
                    <button
                      key={arch.id}
                      type="button"
                      onClick={() => {
                        setServerType(arch.id);
                        setExpectedScale(arch.defaultScale);
                      }}
                      className={`px-3 py-2 rounded text-left text-xs font-medium border transition-all ${
                        active
                          ? 'bg-[#7547FF]/15 border-[#7547FF] text-white'
                          : 'bg-[#0B0C10] border-[#1E212B] text-[#A3A9B8] hover:text-white hover:border-[#646B7C]'
                      }`}
                    >
                      <div className="truncate">{arch.label}</div>
                      <div className="text-[10px] font-mono text-[#646B7C] mt-0.5">
                        ~{arch.defaultScale.toLocaleString()} members
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1E212B]">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-[#A3A9B8] flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-[#3B82F6]" />
                    Expected Member Scale
                  </span>
                  <span className="text-xs font-mono font-bold text-white">
                    {expectedScale.toLocaleString()} members
                  </span>
                </div>
                <input
                  type="range"
                  min={100}
                  max={50000}
                  step={100}
                  value={expectedScale}
                  onChange={(e) => setExpectedScale(Number(e.target.value))}
                  className="w-full accent-[#7547FF] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-[#646B7C] mt-1">
                  <span>100</span>
                  <span>5,000</span>
                  <span>25,000</span>
                  <span>50,000+</span>
                </div>
              </div>

              <div>
                <span className="text-xs text-[#A3A9B8] flex items-center gap-1.5 mb-2">
                  <Shield className="w-3.5 h-3.5 text-[#19C37D]" />
                  Security & Isolation Posture
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'standard', label: 'Standard', desc: 'Basic staff isolation' },
                      { id: 'high', label: 'High', desc: 'Least-privilege + slowmode' },
                      { id: 'maximum', label: 'Max Audit', desc: 'Zero-trust lockdown' },
                    ] as const
                  ).map((sec) => (
                    <button
                      key={sec.id}
                      type="button"
                      onClick={() => setSecurityLevel(sec.id)}
                      className={`p-2 rounded border text-left transition-all ${
                        securityLevel === sec.id
                          ? 'bg-[#19C37D]/15 border-[#19C37D] text-white'
                          : 'bg-[#0B0C10] border-[#1E212B] text-[#A3A9B8] hover:text-white'
                      }`}
                    >
                      <div className="text-xs font-semibold">{sec.label}</div>
                      <div className="text-[10px] text-[#646B7C] truncate">{sec.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-[#1E212B]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-[#A3A9B8] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#F59E0B]" />
                  Active Organizational Departments ({selectedDepartments.length} selected)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setAdvancedExpanded(true);
                    setActiveAdvancedTab('departments');
                  }}
                  className="text-[11px] font-mono text-[#7547FF] hover:underline"
                >
                  Customize / Rename Departments →
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {availableDepartments.map((dept) => {
                  const active = selectedDepartments.includes(dept);
                  return (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => toggleDepartment(dept)}
                      className={`px-2.5 py-1 rounded text-xs transition-all border ${
                        active
                          ? 'bg-[#1A1D26] border-[#7547FF] text-white'
                          : 'bg-[#0B0C10] border-[#1E212B] text-[#646B7C] hover:text-[#A3A9B8]'
                      }`}
                    >
                      {active ? '✓ ' : '+ '}
                      {dept}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="bg-[#12141B] border border-[#1E212B] rounded-md overflow-hidden">

            <div
              onClick={() => setAdvancedExpanded((prev) => !prev)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setAdvancedExpanded((prev) => !prev);
              }}
              className="w-full p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#151822] hover:bg-[#181C28] transition-colors cursor-pointer select-none"
            >
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-9 h-9 rounded bg-[#7547FF]/15 border border-[#7547FF]/40 flex items-center justify-center text-[#7547FF] shrink-0">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Advanced Server Architecture
                    </h3>
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#7547FF]/20 text-[#C4B5FD] border border-[#7547FF]/30">
                      10 Modules
                    </span>
                  </div>
                  <p className="text-xs text-[#A3A9B8] mt-0.5">
                    Configure structure, channel types, role groups, permissions, onboarding, security logs, tickets, voice, and bot automations.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLetAiDecideAll();
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-mono border transition-colors ${
                    advancedConfig.structure.aiOptimizedStructure
                      ? 'bg-[#19C37D]/15 border-[#19C37D]/40 text-[#19C37D]'
                      : 'bg-[#0B0C10] border-[#1E212B] text-[#A3A9B8] hover:text-white'
                  }`}
                >
                  {advancedConfig.structure.aiOptimizedStructure ? '✓ AI-Optimized Active' : 'Auto-Optimize with AI'}
                </button>
                <div className="p-1.5 rounded bg-[#0B0C10] border border-[#1E212B] text-[#A3A9B8]">
                  {advancedExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>
              </div>
            </div>

            {!advancedExpanded && (
              <div className="px-5 py-3 bg-[#0B0C10]/60 border-t border-[#1E212B] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[#A3A9B8]">
                <div className="flex flex-wrap items-center gap-3">
                  <span>
                    Style: <strong className="text-white">{advancedConfig.structure.organizationStyle}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Channels: <strong className="text-white">{configStats.totalChannelsSelected} archetypes</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Tickets: <strong className="text-white">{configStats.enabledTickets} flows</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Automations: <strong className="text-white">{configStats.enabledAutomations} modules</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setAdvancedExpanded(true)}
                  className="text-[#7547FF] hover:underline font-sans font-medium"
                >
                  Expand Advanced Controls ↓
                </button>
              </div>
            )}

            {advancedExpanded && (
              <div className="border-t border-[#1E212B]">

                <div className="flex overflow-x-auto bg-[#0B0C10] border-b border-[#1E212B] px-3 py-2 gap-1.5">
                  {ADVANCED_TABS.map((tab) => {
                    const active = activeAdvancedTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveAdvancedTab(tab.id)}
                        className={`px-3 py-1.5 rounded text-xs font-medium whitespace-nowrap transition-all ${
                          active
                            ? 'bg-[#7547FF] text-white shadow-sm'
                            : 'text-[#A3A9B8] hover:text-white hover:bg-[#1A1D26]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="p-5 space-y-5">

                  {activeAdvancedTab === 'structure' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-white">
                            A. Server Structure Configuration
                          </h4>
                          <p className="text-xs text-[#A3A9B8]">
                            Control category/channel counts, naming conventions, and AI structural optimization.
                          </p>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer bg-[#0B0C10] border border-[#19C37D]/40 px-3 py-1.5 rounded">
                          <input
                            type="checkbox"
                            checked={advancedConfig.structure.aiOptimizedStructure}
                            onChange={(e) =>
                              setAdvancedConfig((prev) => ({
                                ...prev,
                                structure: {
                                  ...prev.structure,
                                  aiOptimizedStructure: e.target.checked,
                                  categoryCountMode: e.target.checked ? 'auto' : prev.structure.categoryCountMode,
                                  channelCountMode: e.target.checked ? 'auto' : prev.structure.channelCountMode,
                                },
                              }))
                            }
                            className="accent-[#19C37D]"
                          />
                          <span className="text-xs font-mono text-[#19C37D] font-semibold">
                            AI-Optimized Structure
                          </span>
                        </label>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="bg-[#0B0C10] border border-[#1E212B] rounded p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white">Number of Categories</span>
                            <div className="flex gap-1">
                              {(['auto', 'custom'] as const).map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() =>
                                    setAdvancedConfig((prev) => ({
                                      ...prev,
                                      structure: {
                                        ...prev.structure,
                                        categoryCountMode: m,
                                        aiOptimizedStructure: m === 'custom' ? false : prev.structure.aiOptimizedStructure,
                                      },
                                    }))
                                  }
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase ${
                                    advancedConfig.structure.categoryCountMode === m
                                      ? 'bg-[#7547FF] text-white'
                                      : 'bg-[#12141B] text-[#646B7C]'
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>
                          {advancedConfig.structure.categoryCountMode === 'custom' ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-mono text-[#A3A9B8]">
                                <span>Target Categories:</span>
                                <span className="text-white font-bold">
                                  {advancedConfig.structure.customCategoryCount} categories
                                </span>
                              </div>
                              <input
                                type="range"
                                min={4}
                                max={20}
                                value={advancedConfig.structure.customCategoryCount}
                                onChange={(e) =>
                                  setAdvancedConfig((prev) => ({
                                    ...prev,
                                    structure: {
                                      ...prev.structure,
                                      customCategoryCount: Number(e.target.value),
                                    },
                                  }))
                                }
                                className="w-full accent-[#7547FF]"
                              />
                            </div>
                          ) : (
                            <p className="text-[11px] text-[#646B7C]">
                              Gemini automatically scales categories (7–14+) based on selected departments and community size.
                            </p>
                          )}
                        </div>

                        <div className="bg-[#0B0C10] border border-[#1E212B] rounded p-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-white">Number of Channels</span>
                            <div className="flex gap-1">
                              {(['auto', 'custom'] as const).map((m) => (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() =>
                                    setAdvancedConfig((prev) => ({
                                      ...prev,
                                      structure: {
                                        ...prev.structure,
                                        channelCountMode: m,
                                        aiOptimizedStructure: m === 'custom' ? false : prev.structure.aiOptimizedStructure,
                                      },
                                    }))
                                  }
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase ${
                                    advancedConfig.structure.channelCountMode === m
                                      ? 'bg-[#7547FF] text-white'
                                      : 'bg-[#12141B] text-[#646B7C]'
                                  }`}
                                >
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>
                          {advancedConfig.structure.channelCountMode === 'custom' ? (
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs font-mono text-[#A3A9B8]">
                                <span>Target Channels:</span>
                                <span className="text-white font-bold">
                                  {advancedConfig.structure.customChannelCount} channels
                                </span>
                              </div>
                              <input
                                type="range"
                                min={15}
                                max={80}
                                step={5}
                                value={advancedConfig.structure.customChannelCount}
                                onChange={(e) =>
                                  setAdvancedConfig((prev) => ({
                                    ...prev,
                                    structure: {
                                      ...prev.structure,
                                      customChannelCount: Number(e.target.value),
                                    },
                                  }))
                                }
                                className="w-full accent-[#7547FF]"
                              />
                            </div>
                          ) : (
                            <p className="text-[11px] text-[#646B7C]">
                              Gemini generates a complete operational channel tree (30–55+ channels) without artificial caps.
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-mono uppercase text-[#A3A9B8] block mb-1.5">
                            Category Organization Style
                          </label>
                          <select
                            value={advancedConfig.structure.organizationStyle}
                            onChange={(e) =>
                              setAdvancedConfig((prev) => ({
                                ...prev,
                                structure: {
                                  ...prev.structure,
                                  organizationStyle: e.target.value as any,
                                },
                              }))
                            }
                            className="w-full bg-[#0B0C10] border border-[#1E212B] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                          >
                            <option value="hybrid">Hybrid Architecture (Recommended)</option>
                            <option value="department">Department-Based</option>
                            <option value="functional">Functional Grouping</option>
                            <option value="community">Community-Based</option>
                            <option value="competitive">Competitive Organization</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-mono uppercase text-[#A3A9B8] block mb-1.5">
                            Channel Naming Convention
                          </label>
                          <select
                            value={advancedConfig.structure.channelNamingConvention}
                            onChange={(e) =>
                              setAdvancedConfig((prev) => ({
                                ...prev,
                                structure: {
                                  ...prev.structure,
                                  channelNamingConvention: e.target.value as any,
                                },
                              }))
                            }
                            className="w-full bg-[#0B0C10] border border-[#1E212B] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                          >
                            <option value="lowercase-hyphens">lowercase-with-hyphens (#general-chat)</option>
                            <option value="emoji-and-name">emoji-and-name (#💬・general-chat)</option>
                            <option value="clean-professional">clean-professional (#general)</option>
                            <option value="custom">Custom Prefix Pattern</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-mono uppercase text-[#A3A9B8] block mb-1.5">
                            Category Naming Style
                          </label>
                          <select
                            value={advancedConfig.structure.categoryNamingStyle}
                            onChange={(e) =>
                              setAdvancedConfig((prev) => ({
                                ...prev,
                                structure: {
                                  ...prev.structure,
                                  categoryNamingStyle: e.target.value as any,
                                },
                              }))
                            }
                            className="w-full bg-[#0B0C10] border border-[#1E212B] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                          >
                            <option value="uppercase">UPPERCASE (INFORMATION)</option>
                            <option value="title-case">Title Case (Information)</option>
                            <option value="bracketed">Bracketed (【 INFORMATION 】)</option>
                            <option value="minimal">Minimal Clean</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                        {[
                          {
                            key: 'enableCategoryEmojis',
                            label: 'Enable Category Emojis',
                            desc: 'Prepend contextual icons to category headers',
                          },
                          {
                            key: 'enableCategoryDescriptions',
                            label: 'Enable Category Descriptions',
                            desc: 'Generate operational purpose notes for every category',
                          },
                          {
                            key: 'autoGroupRelatedChannels',
                            label: 'Automatically Group Related Channels',
                            desc: 'Cluster text, voice, and log channels into cohesive categories',
                          },
                          {
                            key: 'autoDeduplicateChannels',
                            label: 'Identify & Prevent Duplicate Channels',
                            desc: 'Eliminate redundant channels across departments',
                          },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex items-start gap-2.5 bg-[#0B0C10] border border-[#1E212B] rounded p-3 cursor-pointer hover:border-[#646B7C]/50"
                          >
                            <input
                              type="checkbox"
                              checked={(advancedConfig.structure as any)[item.key]}
                              onChange={(e) =>
                                setAdvancedConfig((prev) => ({
                                  ...prev,
                                  structure: {
                                    ...prev.structure,
                                    [item.key]: e.target.checked,
                                  },
                                }))
                              }
                              className="mt-0.5 accent-[#7547FF]"
                            />
                            <div>
                              <div className="text-xs font-medium text-white">{item.label}</div>
                              <div className="text-[11px] text-[#646B7C]">{item.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeAdvancedTab === 'channels' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          B. Complete Channel Type Configuration
                        </h4>
                        <p className="text-xs text-[#A3A9B8]">
                          Select the Discord channel archetypes to include. Native Discord features are distinguished from bot-managed features.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-mono uppercase text-[#A3A9B8] flex items-center gap-1.5">
                          <Hash className="w-3.5 h-3.5 text-[#7547FF]" />
                          Text Channel Archetypes ({advancedConfig.channels.textChannels.length} selected)
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {TEXT_CHANNEL_OPTIONS.map((opt) => {
                            const selected = advancedConfig.channels.textChannels.includes(opt.id);
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  setAdvancedConfig((prev) => ({
                                    ...prev,
                                    channels: {
                                      ...prev.channels,
                                      textChannels: toggleArrayItem(prev.channels.textChannels, opt.id),
                                    },
                                  }))
                                }
                                className={`px-2.5 py-1.5 rounded text-left text-xs border flex items-center justify-between transition-all ${
                                  selected
                                    ? 'bg-[#7547FF]/15 border-[#7547FF] text-white'
                                    : 'bg-[#0B0C10] border-[#1E212B] text-[#646B7C] hover:text-white'
                                }`}
                              >
                                <span className="truncate">{opt.label}</span>
                                {!opt.native && (
                                  <span className="text-[9px] font-mono px-1 rounded bg-[#F59E0B]/15 text-[#F59E0B] shrink-0">
                                    BOT
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-[#1E212B]">
                        <div className="text-xs font-mono uppercase text-[#A3A9B8] flex items-center gap-1.5">
                          <Volume2 className="w-3.5 h-3.5 text-[#19C37D]" />
                          Voice Channel Archetypes ({advancedConfig.channels.voiceChannels.length} selected)
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {VOICE_CHANNEL_OPTIONS.map((opt) => {
                            const selected = advancedConfig.channels.voiceChannels.includes(opt.id);
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() =>
                                  setAdvancedConfig((prev) => ({
                                    ...prev,
                                    channels: {
                                      ...prev.channels,
                                      voiceChannels: toggleArrayItem(prev.channels.voiceChannels, opt.id),
                                    },
                                  }))
                                }
                                className={`px-2.5 py-1.5 rounded text-left text-xs border flex items-center justify-between transition-all ${
                                  selected
                                    ? 'bg-[#19C37D]/15 border-[#19C37D] text-white'
                                    : 'bg-[#0B0C10] border-[#1E212B] text-[#646B7C] hover:text-white'
                                }`}
                              >
                                <span className="truncate">{opt.label}</span>
                                {!opt.native && (
                                  <span className="text-[9px] font-mono px-1 rounded bg-[#F59E0B]/15 text-[#F59E0B] shrink-0">
                                    BOT MODULE
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#1E212B]">
                        <div className="space-y-2">
                          <div className="text-xs font-mono uppercase text-[#A3A9B8] flex items-center gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-[#3B82F6]" />
                            Forum Channels ({advancedConfig.channels.forumChannels.length})
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {FORUM_CHANNEL_OPTIONS.map((opt) => {
                              const selected = advancedConfig.channels.forumChannels.includes(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() =>
                                    setAdvancedConfig((prev) => ({
                                      ...prev,
                                      channels: {
                                        ...prev.channels,
                                        forumChannels: toggleArrayItem(prev.channels.forumChannels, opt.id),
                                      },
                                    }))
                                  }
                                  className={`px-2.5 py-1.5 rounded text-left text-xs border transition-all ${
                                    selected
                                      ? 'bg-[#3B82F6]/15 border-[#3B82F6] text-white'
                                      : 'bg-[#0B0C10] border-[#1E212B] text-[#646B7C] hover:text-white'
                                  }`}
                                >
                                  {selected ? '✓ ' : '+ '}
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="text-xs font-mono uppercase text-[#A3A9B8] flex items-center gap-1.5">
                            <Megaphone className="w-3.5 h-3.5 text-[#F59E0B]" />
                            Announcement Channels ({advancedConfig.channels.announcementChannels.length})
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {ANNOUNCEMENT_CHANNEL_OPTIONS.map((opt) => {
                              const selected = advancedConfig.channels.announcementChannels.includes(opt.id);
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() =>
                                    setAdvancedConfig((prev) => ({
                                      ...prev,
                                      channels: {
                                        ...prev.channels,
                                        announcementChannels: toggleArrayItem(
                                          prev.channels.announcementChannels,
                                          opt.id
                                        ),
                                      },
                                    }))
                                  }
                                  className={`px-2.5 py-1.5 rounded text-left text-xs border transition-all ${
                                    selected
                                      ? 'bg-[#F59E0B]/15 border-[#F59E0B] text-white'
                                      : 'bg-[#0B0C10] border-[#1E212B] text-[#646B7C] hover:text-white'
                                  }`}
                                >
                                  {selected ? '✓ ' : '+ '}
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>

                          <div className="pt-2 space-y-1.5">
                            <div className="text-[11px] font-mono uppercase text-[#A3A9B8]">
                              Special Discord Channel Capabilities
                            </div>
                            {[
                              { key: 'enableStageChannels', label: 'Stage Channels (GUILD_STAGE_VOICE)' },
                              { key: 'enableMediaChannels', label: 'Media Channels (GUILD_MEDIA)' },
                              { key: 'enableThreadStructures', label: 'Public & Private Thread Structures' },
                            ].map((cap) => (
                              <label
                                key={cap.key}
                                className="flex items-center gap-2 text-xs text-[#A3A9B8] cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={(advancedConfig.channels as any)[cap.key]}
                                  onChange={(e) =>
                                    setAdvancedConfig((prev) => ({
                                      ...prev,
                                      channels: {
                                        ...prev.channels,
                                        [cap.key]: e.target.checked,
                                      },
                                    }))
                                  }
                                  className="accent-[#7547FF]"
                                />
                                <span>{cap.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeAdvancedTab === 'roles' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">C. Advanced Role Architecture</h4>
                        <p className="text-xs text-[#A3A9B8]">
                          Generate a multi-tier role hierarchy tailored to your community instead of generic fixed roles.
                        </p>
                      </div>

                      <div className="space-y-2">
                        {ROLE_GROUP_PRESETS.map((rg) => {
                          const enabled = advancedConfig.roles.enabledRoleGroups.includes(rg.id);
                          return (
                            <div
                              key={rg.id}
                              onClick={() =>
                                setAdvancedConfig((prev) => ({
                                  ...prev,
                                  roles: {
                                    ...prev.roles,
                                    enabledRoleGroups: toggleArrayItem(prev.roles.enabledRoleGroups, rg.id),
                                  },
                                }))
                              }
                              className={`p-3 rounded border cursor-pointer transition-all flex items-center justify-between ${
                                enabled
                                  ? 'bg-[#7547FF]/10 border-[#7547FF] text-white'
                                  : 'bg-[#0B0C10] border-[#1E212B] text-[#646B7C]'
                              }`}
                            >
                              <div>
                                <div className="text-xs font-semibold text-white">{rg.label}</div>
                                <div className="text-[11px] text-[#A3A9B8] mt-0.5">
                                  Examples: {rg.examples}
                                </div>
                              </div>
                              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#12141B] border border-[#1E212B]">
                                {enabled ? 'Active Tier' : 'Disabled'}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-[#1E212B]">
                        {[
                          {
                            key: 'useRoleColors',
                            label: 'Semantic Hex Role Colors',
                            desc: 'Assign distinct hex colors by hierarchy tier',
                          },
                          {
                            key: 'hoistLeadershipRoles',
                            label: 'Hoist Leadership & Department Roles',
                            desc: 'Display staff and pro tiers separately in member list',
                          },
                          {
                            key: 'allowMentionableStaffRoles',
                            label: 'Controlled Mentionable Configuration',
                            desc: 'Allow on-duty staff roles to be mentioned where appropriate',
                          },
                          {
                            key: 'includeManagedBotRoles',
                            label: 'Identify Managed Bot Integration Roles',
                            desc: 'Include bot integration role boundaries in hierarchy',
                          },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex items-start gap-2.5 bg-[#0B0C10] border border-[#1E212B] rounded p-3 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={(advancedConfig.roles as any)[item.key]}
                              onChange={(e) =>
                                setAdvancedConfig((prev) => ({
                                  ...prev,
                                  roles: {
                                    ...prev.roles,
                                    [item.key]: e.target.checked,
                                  },
                                }))
                              }
                              className="mt-0.5 accent-[#7547FF]"
                            />
                            <div>
                              <div className="text-xs font-medium text-white">{item.label}</div>
                              <div className="text-[11px] text-[#646B7C]">{item.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeAdvancedTab === 'departments' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">D. Department Architecture</h4>
                        <p className="text-xs text-[#A3A9B8]">
                          Select, rename, remove, or add custom organizational departments. Each selected department automatically receives dedicated roles, private text/voice channels, and scoped permissions.
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newDepartmentInput}
                          onChange={(e) => setNewDepartmentInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddCustomDepartment();
                          }}
                          placeholder="Add custom department (e.g., Content Creators, Regional Chapters, Legal & Compliance)..."
                          className="flex-1 bg-[#0B0C10] border border-[#1E212B] rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                        />
                        <button
                          type="button"
                          onClick={handleAddCustomDepartment}
                          className="px-3.5 py-2 bg-[#7547FF] hover:bg-[#6336EB] text-white rounded text-xs font-semibold flex items-center gap-1.5"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Add Department
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                        {availableDepartments.map((dept) => {
                          const isSelected = selectedDepartments.includes(dept);
                          const isEditing = editingDept === dept;
                          return (
                            <div
                              key={dept}
                              className={`p-2.5 rounded border flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-[#1A1D26] border-[#7547FF]/60 text-white'
                                  : 'bg-[#0B0C10] border-[#1E212B] text-[#646B7C]'
                              }`}
                            >
                              {isEditing ? (
                                <div className="flex items-center gap-1.5 flex-1">
                                  <input
                                    type="text"
                                    value={editingDeptValue}
                                    onChange={(e) => setEditingDeptValue(e.target.value)}
                                    className="flex-1 bg-[#0B0C10] border border-[#7547FF] rounded px-2 py-1 text-xs text-white"
                                    autoFocus
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRenameDepartment(dept)}
                                    className="p-1 text-[#19C37D] hover:bg-[#19C37D]/10 rounded"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <label className="flex items-center gap-2 flex-1 cursor-pointer truncate">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleDepartment(dept)}
                                    className="accent-[#7547FF]"
                                  />
                                  <span className="text-xs font-medium truncate">{dept}</span>
                                </label>
                              )}

                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingDept(dept);
                                    setEditingDeptValue(dept);
                                  }}
                                  title="Rename department"
                                  className="p-1 text-[#646B7C] hover:text-white rounded"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDepartmentOption(dept)}
                                  title="Remove department"
                                  className="p-1 text-[#646B7C] hover:text-[#EF4444] rounded"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {activeAdvancedTab === 'permissions' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          E. Advanced Permission Architecture
                        </h4>
                        <p className="text-xs text-[#A3A9B8]">
                          Configure server-wide least-privilege boundaries, category inheritance, and channel-level permission overwrites. After synthesis, you can inspect and edit the interactive Role × Channel Permission Matrix in the Blueprint Editor.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {[
                          {
                            key: 'enforceLeastPrivilege',
                            label: 'Enforce Least-Privilege Bitmasks',
                            desc: 'Never grant ADMINISTRATOR to ordinary staff or moderator roles',
                          },
                          {
                            key: 'privateDepartmentIsolation',
                            label: 'Zero-Trust Private Department Isolation',
                            desc: 'Explicitly deny @everyone VIEW_CHANNEL & CONNECT on all staff/department categories',
                          },
                          {
                            key: 'readOnlyAnnouncements',
                            label: 'Read-Only Announcement & Rules Channels',
                            desc: 'Deny @everyone SEND_MESSAGES, ADD_REACTIONS, and thread creation in official info channels',
                          },
                          {
                            key: 'strictForumPosting',
                            label: 'Controlled Forum & Thread Permissions',
                            desc: 'Scope SEND_MESSAGES_IN_THREADS and CREATE_PUBLIC_THREADS to verified roles',
                          },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex items-start gap-2.5 bg-[#0B0C10] border border-[#1E212B] rounded p-3.5 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={(advancedConfig.permissions as any)[item.key]}
                              onChange={(e) =>
                                setAdvancedConfig((prev) => ({
                                  ...prev,
                                  permissions: {
                                    ...prev.permissions,
                                    [item.key]: e.target.checked,
                                  },
                                }))
                              }
                              className="mt-0.5 accent-[#19C37D]"
                            />
                            <div>
                              <div className="text-xs font-medium text-white">{item.label}</div>
                              <div className="text-[11px] text-[#646B7C] mt-0.5">{item.desc}</div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeAdvancedTab === 'onboarding' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          F. Onboarding & Community Experience
                        </h4>
                        <p className="text-xs text-[#A3A9B8]">
                          Design the new-member journey. Native Discord onboarding features are distinguished from bot-assisted verification and role menus.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {[
                          { key: 'welcomeArea', label: 'Welcome Area (#welcome)', native: true },
                          { key: 'rulesAcceptanceFlow', label: 'Rules Acceptance & Screening Gate', native: true },
                          { key: 'verificationArea', label: 'Verification Gate Area', native: false },
                          { key: 'serverGuide', label: 'Native Discord Server Guide', native: true },
                          { key: 'selfAssignableRoles', label: 'Self-Assignable Role Selection', native: false },
                          { key: 'interestSelection', label: 'Interest & Notification Selection', native: true },
                          { key: 'memberIntroductions', label: 'Member Introductions Channel', native: true },
                          { key: 'faqAndGettingStarted', label: 'FAQ & Getting-Started Guide', native: true },
                        ].map((item) => (
                          <label
                            key={item.key}
                            className="flex items-center justify-between bg-[#0B0C10] border border-[#1E212B] rounded p-3 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={(advancedConfig.onboarding as any)[item.key]}
                                onChange={(e) =>
                                  setAdvancedConfig((prev) => ({
                                    ...prev,
                                    onboarding: {
                                      ...prev.onboarding,
                                      [item.key]: e.target.checked,
                                    },
                                  }))
                                }
                                className="accent-[#7547FF]"
                              />
                              <span className="text-xs text-white">{item.label}</span>
                            </div>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                                item.native
                                  ? 'bg-[#19C37D]/15 text-[#19C37D]'
                                  : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                              }`}
                            >
                              {item.native ? 'NATIVE DISCORD' : 'BOT MODULE'}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeAdvancedTab === 'moderation' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          G. Moderation & Security Architecture
                        </h4>
                        <p className="text-xs text-[#A3A9B8]">
                          Configure protection policies and dedicated private audit log channels. Note: Deploying log channels provisions the private Discord channels and permissions; live event streaming into those channels requires activating the GuildForge Audit Logger bot module.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {[
                          { key: 'autoModeration', label: 'Discord AutoMod Rules' },
                          { key: 'spamProtection', label: 'Anti-Spam Slowmode' },
                          { key: 'antiRaidArchitecture', label: 'Anti-Raid Gate Lockdown' },
                          { key: 'antiLinkPolicy', label: 'Anti-Link / Phishing Filter' },
                          { key: 'antiMentionSpam', label: 'Mention Spam Cap' },
                          { key: 'suspiciousAccountHandling', label: 'Suspicious Account Quarantine' },
                        ].map((pol) => (
                          <label
                            key={pol.key}
                            className="flex items-center gap-2 bg-[#0B0C10] border border-[#1E212B] rounded p-2.5 text-xs text-white cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={(advancedConfig.moderation as any)[pol.key]}
                              onChange={(e) =>
                                setAdvancedConfig((prev) => ({
                                  ...prev,
                                  moderation: {
                                    ...prev.moderation,
                                    [pol.key]: e.target.checked,
                                  },
                                }))
                              }
                              className="accent-[#19C37D]"
                            />
                            <span className="truncate">{pol.label}</span>
                          </label>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-[#1E212B]">
                        <div className="text-xs font-mono uppercase text-[#A3A9B8] mb-2">
                          Dedicated Private Security & Audit Log Channels ({configStats.enabledLogs} enabled)
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { key: 'moderationLogs', label: '#moderation-logs' },
                            { key: 'messageDeletionLogs', label: '#message-logs' },
                            { key: 'memberJoinLeaveLogs', label: '#member-logs' },
                            { key: 'roleModificationLogs', label: '#role-audit-logs' },
                            { key: 'channelModificationLogs', label: '#channel-audit-logs' },
                            { key: 'banTimeoutLogs', label: '#ban-timeout-logs' },
                            { key: 'staffActionLogs', label: '#staff-action-logs' },
                            { key: 'securityAlertChannel', label: '#security-alerts' },
                          ].map((logItem) => (
                            <label
                              key={logItem.key}
                              className="flex items-center gap-2 bg-[#0B0C10] border border-[#1E212B] rounded px-2.5 py-2 text-xs font-mono text-[#A3A9B8] cursor-pointer hover:text-white"
                            >
                              <input
                                type="checkbox"
                                checked={(advancedConfig.moderation.logs as any)[logItem.key]}
                                onChange={(e) =>
                                  setAdvancedConfig((prev) => ({
                                    ...prev,
                                    moderation: {
                                      ...prev.moderation,
                                      logs: {
                                        ...prev.moderation.logs,
                                        [logItem.key]: e.target.checked,
                                      },
                                    },
                                  }))
                                }
                                className="accent-[#7547FF]"
                              />
                              <span className="truncate">{logItem.label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {activeAdvancedTab === 'tickets' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-semibold text-white">
                            H. Support & Ticket Architecture
                          </h4>
                          <p className="text-xs text-[#A3A9B8]">
                            Configure specialized ticket pipelines, staff routing, and transcript destinations. Interactive ticket spawning and transcripts require the GuildForge Ticket Bot Module.
                          </p>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                          Requires Ticket Bot Module
                        </span>
                      </div>

                      <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                        {advancedConfig.tickets.ticketTypes.map((ticket, idx) => (
                          <div
                            key={ticket.id}
                            className={`p-3 rounded border transition-all ${
                              ticket.enabled
                                ? 'bg-[#0B0C10] border-[#7547FF]/60'
                                : 'bg-[#0B0C10]/50 border-[#1E212B] opacity-60'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={ticket.enabled}
                                  onChange={(e) => {
                                    const updated = [...advancedConfig.tickets.ticketTypes];
                                    updated[idx] = { ...ticket, enabled: e.target.checked };
                                    setAdvancedConfig((prev) => ({
                                      ...prev,
                                      tickets: { ...prev.tickets, ticketTypes: updated },
                                    }));
                                  }}
                                  className="accent-[#7547FF]"
                                />
                                <span className="text-xs font-semibold text-white">{ticket.name}</span>
                              </label>
                              <div className="flex items-center gap-2 text-[10px] font-mono text-[#A3A9B8]">
                                <span className="px-1.5 py-0.5 rounded bg-[#12141B] border border-[#1E212B]">
                                  {ticket.namingConvention}
                                </span>
                                <span className="px-1.5 py-0.5 rounded bg-[#12141B] border border-[#1E212B]">
                                  Log: #{ticket.transcriptChannel}
                                </span>
                              </div>
                            </div>

                            {ticket.enabled && (
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 border-t border-[#1E212B]/60 text-[11px]">
                                <div>
                                  <span className="text-[#646B7C] block">Category</span>
                                  <input
                                    type="text"
                                    value={ticket.categoryName}
                                    onChange={(e) => {
                                      const updated = [...advancedConfig.tickets.ticketTypes];
                                      updated[idx] = { ...ticket, categoryName: e.target.value };
                                      setAdvancedConfig((prev) => ({
                                        ...prev,
                                        tickets: { ...prev.tickets, ticketTypes: updated },
                                      }));
                                    }}
                                    className="w-full mt-0.5 bg-[#12141B] border border-[#1E212B] rounded px-2 py-1 text-white"
                                  />
                                </div>
                                <div>
                                  <span className="text-[#646B7C] block">Authorized Staff Roles</span>
                                  <input
                                    type="text"
                                    value={ticket.authorizedStaffRoles.join(', ')}
                                    onChange={(e) => {
                                      const updated = [...advancedConfig.tickets.ticketTypes];
                                      updated[idx] = {
                                        ...ticket,
                                        authorizedStaffRoles: e.target.value
                                          .split(',')
                                          .map((s) => s.trim())
                                          .filter(Boolean),
                                      };
                                      setAdvancedConfig((prev) => ({
                                        ...prev,
                                        tickets: { ...prev.tickets, ticketTypes: updated },
                                      }));
                                    }}
                                    className="w-full mt-0.5 bg-[#12141B] border border-[#1E212B] rounded px-2 py-1 text-white"
                                  />
                                </div>
                                <div>
                                  <span className="text-[#646B7C] block">Escalation Roles</span>
                                  <input
                                    type="text"
                                    value={ticket.escalationRoles.join(', ')}
                                    onChange={(e) => {
                                      const updated = [...advancedConfig.tickets.ticketTypes];
                                      updated[idx] = {
                                        ...ticket,
                                        escalationRoles: e.target.value
                                          .split(',')
                                          .map((s) => s.trim())
                                          .filter(Boolean),
                                      };
                                      setAdvancedConfig((prev) => ({
                                        ...prev,
                                        tickets: { ...prev.tickets, ticketTypes: updated },
                                      }));
                                    }}
                                    className="w-full mt-0.5 bg-[#12141B] border border-[#1E212B] rounded px-2 py-1 text-white"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeAdvancedTab === 'voice' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">I. Voice Architecture</h4>
                        <p className="text-xs text-[#A3A9B8]">
                          Configure public lounges, competitive team comms, coaching rooms, Stage channels, bitrate, and user limits.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { key: 'publicLounges', label: 'Public Lounges', native: true },
                          { key: 'privateTeamRooms', label: 'Private Team Rooms', native: true },
                          { key: 'staffMeetings', label: 'Staff Meeting Rooms', native: true },
                          { key: 'tournamentRooms', label: 'Tournament Comms', native: true },
                          { key: 'coachingRooms', label: 'Coaching Rooms', native: true },
                          { key: 'temporaryVoiceRooms', label: 'Join-to-Create Temp Voice', native: false },
                          { key: 'afkChannel', label: 'AFK Timeout Channel', native: true },
                          { key: 'stageEvents', label: 'Stage Event Channels', native: true },
                        ].map((v) => (
                          <label
                            key={v.key}
                            className="flex flex-col justify-between bg-[#0B0C10] border border-[#1E212B] rounded p-2.5 cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={(advancedConfig.voice as any)[v.key]}
                                onChange={(e) =>
                                  setAdvancedConfig((prev) => ({
                                    ...prev,
                                    voice: {
                                      ...prev.voice,
                                      [v.key]: e.target.checked,
                                    },
                                  }))
                                }
                                className="accent-[#19C37D]"
                              />
                              <span className="text-xs text-white font-medium">{v.label}</span>
                            </div>
                            {!v.native && (
                              <span className="text-[9px] font-mono text-[#F59E0B] mt-1">
                                Requires Temp-Voice Bot Module
                              </span>
                            )}
                          </label>
                        ))}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#1E212B]">
                        <div>
                          <label className="text-[11px] font-mono uppercase text-[#A3A9B8] block mb-1">
                            Default Squad User Limit
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={advancedConfig.voice.defaultUserLimit}
                            onChange={(e) =>
                              setAdvancedConfig((prev) => ({
                                ...prev,
                                voice: { ...prev.voice, defaultUserLimit: Number(e.target.value) },
                              }))
                            }
                            className="w-full bg-[#0B0C10] border border-[#1E212B] rounded px-3 py-1.5 text-xs text-white"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-mono uppercase text-[#A3A9B8] block mb-1">
                            Default Audio Bitrate (kbps)
                          </label>
                          <select
                            value={advancedConfig.voice.defaultBitrateKbps}
                            onChange={(e) =>
                              setAdvancedConfig((prev) => ({
                                ...prev,
                                voice: { ...prev.voice, defaultBitrateKbps: Number(e.target.value) },
                              }))
                            }
                            className="w-full bg-[#0B0C10] border border-[#1E212B] rounded px-3 py-1.5 text-xs text-white"
                          >
                            <option value={64}>64 kbps (Standard)</option>
                            <option value={96}>96 kbps (High Clarity)</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] font-mono uppercase text-[#A3A9B8] block mb-1">
                            RTC Voice Region
                          </label>
                          <select
                            value={advancedConfig.voice.preferredRegion}
                            onChange={(e) =>
                              setAdvancedConfig((prev) => ({
                                ...prev,
                                voice: { ...prev.voice, preferredRegion: e.target.value },
                              }))
                            }
                            className="w-full bg-[#0B0C10] border border-[#1E212B] rounded px-3 py-1.5 text-xs text-white"
                          >
                            <option value="auto">Automatic (Low Latency)</option>
                            <option value="us-east">US East</option>
                            <option value="us-west">US West</option>
                            <option value="rotterdam">Europe (Rotterdam)</option>
                            <option value="singapore">Asia (Singapore)</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}

                  {activeAdvancedTab === 'automations' && (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-semibold text-white">
                          J. Automation & Integration Configuration
                        </h4>
                        <p className="text-xs text-[#A3A9B8]">
                          Select community automations. Each module lists its required bot module, Discord permissions, channel/role dependencies, and accurate implementation status.
                        </p>
                      </div>

                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {advancedConfig.automations.modules.map((mod, idx) => {
                          const verifiedMod = verifiedAutomations.find((v) => v.id === mod.id);
                          const runtimeStatus = verifiedMod?.runtimeStatus || 'Planned';
                          return (
                            <div
                              key={mod.id}
                              className={`p-3 rounded border transition-all ${
                                mod.enabled
                                  ? 'bg-[#0B0C10] border-[#19C37D]/50'
                                  : 'bg-[#0B0C10]/50 border-[#1E212B] opacity-65'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={mod.enabled}
                                    onChange={(e) => {
                                      const updated = [...advancedConfig.automations.modules];
                                      updated[idx] = { ...mod, enabled: e.target.checked };
                                      setAdvancedConfig((prev) => ({
                                        ...prev,
                                        automations: { ...prev.automations, modules: updated },
                                      }));
                                    }}
                                    className="accent-[#19C37D]"
                                  />
                                  <span className="text-xs font-semibold text-white">{mod.name}</span>
                                </label>

                                <div className="flex flex-wrap items-center gap-1.5">
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#12141B] text-[#A3A9B8] border border-[#1E212B]">
                                    {mod.requiredBotModule}
                                  </span>
                                  <span
                                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                      runtimeStatus === 'Configured' || runtimeStatus === 'Enabled' || runtimeStatus === 'Running'
                                        ? 'bg-[#19C37D]/15 text-[#19C37D]'
                                        : runtimeStatus === 'Failed' || runtimeStatus === 'Unsupported'
                                        ? 'bg-[#EF4444]/15 text-[#EF4444]'
                                        : 'bg-[#7547FF]/15 text-[#C4B5FD]'
                                    }`}
                                  >
                                    STATUS: {runtimeStatus.toUpperCase()}
                                  </span>
                                  <span
                                    className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                                      mod.implementationStatus === 'native_discord'
                                        ? 'bg-[#19C37D]/15 text-[#19C37D]'
                                        : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                                    }`}
                                  >
                                    {mod.implementationStatus === 'native_discord'
                                      ? 'NATIVE DISCORD'
                                      : 'REQUIRES BOT RUNTIME'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-[11px] text-[#A3A9B8] mt-1.5">{mod.requiredConfiguration}</div>
                              {verifiedMod?.statusReason && (
                                <div className="text-[10px] font-mono text-[#19C37D] mt-1">
                                  ↳ {verifiedMod.statusReason}
                                </div>
                              )}
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-[10px] font-mono text-[#646B7C]">
                                <span>Perms: {mod.requiredPermissions.join(', ')}</span>
                                <span>•</span>
                                <span>Deps: {mod.dependencies.join(', ')}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-3 border-t border-[#1E212B] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResetAdvanced}
                      className="text-xs text-[#646B7C] hover:text-white flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset Advanced Defaults
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdvancedExpanded(false)}
                      className="text-xs text-[#A3A9B8] hover:text-white font-mono"
                    >
                      Collapse Panel ↑
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#12141B] border border-[#1E212B] rounded-md p-4">
            <button
              type="button"
              onClick={handleAnalyzeOnly}
              disabled={isBusy || !prompt.trim()}
              className="px-4 py-2.5 bg-[#1A1D26] hover:bg-[#232734] disabled:opacity-50 text-white rounded text-xs font-medium border border-[#1E212B] transition-colors flex items-center justify-center gap-2"
            >
              {processingState === 'ANALYZING' ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#7547FF]" />
              ) : (
                <Terminal className="w-4 h-4 text-[#7547FF]" />
              )}
              <span>1. Analyze Requirements</span>
            </button>

            <button
              type="button"
              onClick={handleGenerateArchitecture}
              disabled={isBusy || !prompt.trim()}
              className="flex-1 px-6 py-2.5 bg-[#7547FF] hover:bg-[#6336EB] disabled:opacity-50 text-white rounded text-xs font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#7547FF]/20"
            >
              {isBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>
                    {processingState === 'ANALYZING'
                      ? 'Analyzing Community Requirements...'
                      : processingState === 'GENERATING'
                      ? 'Synthesizing Complete Server Architecture...'
                      : 'Validating Permissions & Security...'}
                  </span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  <span>Generate Complete Server Blueprint</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-5">

          <div className="bg-[#12141B] border border-[#1E212B] rounded-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E212B] pb-3">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-[#19C37D]" />
                <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                  AI Synthesis Pipeline
                </span>
              </div>
              <span
                className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
                  geminiConfigured
                    ? 'bg-[#19C37D]/10 text-[#19C37D] border-[#19C37D]/30'
                    : 'bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30'
                }`}
              >
                {geminiConfigured ? 'Gemini Connected' : 'API Key Needed'}
              </span>
            </div>

            <div className="space-y-2">
              {aiStageLabel && isBusy && (
                <div className="text-[11px] font-mono text-[#C4B5FD] flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#7547FF]" />
                  <span>{aiStageLabel}</span>
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-1.5">
                {[
                  { num: 1, label: '1. Requirement Analysis' },
                  { num: 2, label: '2. Architecture Plan' },
                  { num: 3, label: '3. Permission Eng.' },
                  { num: 4, label: '4. Automation Plan' },
                  { num: 5, label: '5. Final Validation' },
                ].map((stage) => {
                  const isCurrent = isBusy && aiStageNumber === stage.num;
                  const isDone =
                    processingState === 'COMPLETED' ||
                    (isBusy && aiStageNumber > stage.num) ||
                    (stage.num === 1 && Boolean(analysis)) ||
                    Boolean(generatedBlueprint);

                  return (
                    <div
                      key={stage.num}
                      className={`p-2 rounded border text-xs font-mono transition-all ${
                        isCurrent
                          ? 'bg-[#7547FF]/15 border-[#7547FF] text-white'
                          : isDone
                          ? 'bg-[#19C37D]/10 border-[#19C37D]/40 text-[#19C37D]'
                          : 'bg-[#0B0C10] border-[#1E212B] text-[#646B7C]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        {isCurrent ? (
                          <Loader2 className="w-3 h-3 animate-spin text-[#7547FF]" />
                        ) : isDone ? (
                          <CheckCircle2 className="w-3 h-3 text-[#19C37D]" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-[#646B7C]" />
                        )}
                      </div>
                      <div className="text-[10px] leading-tight">{stage.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {processingState === 'ERROR' && errorMessage && (
              <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded p-4 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                  <div className="text-xs text-[#F2F4F8] leading-relaxed">
                    <div className="font-semibold text-[#EF4444] mb-0.5">
                      AI Operation Failed ({lastAttemptedAction === 'analyze' ? 'Requirement Analysis' : 'Blueprint Synthesis'})
                    </div>
                    {errorMessage}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={lastAttemptedAction === 'analyze' ? handleAnalyzeOnly : handleGenerateArchitecture}
                  className="px-3 py-1.5 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded text-xs font-semibold"
                >
                  Retry Operation
                </button>
              </div>
            )}

            {analysis && (
              <div className="bg-[#0B0C10] border border-[#1E212B] rounded p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#19C37D]">
                      Requirement Breakdown
                    </div>
                    <h4 className="text-sm font-bold text-white">{analysis.serverName}</h4>
                  </div>
                  <span className="text-[11px] font-mono text-[#A3A9B8] bg-[#12141B] px-2 py-0.5 rounded border border-[#1E212B]">
                    {analysis.communityType}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="bg-[#12141B] p-2 rounded border border-[#1E212B]">
                    <span className="text-[#646B7C] block font-mono uppercase text-[9px]">
                      Leadership Hierarchy
                    </span>
                    <span className="text-white font-medium">
                      {analysis.keyLeadershipRoles.slice(0, 4).join(', ')}
                    </span>
                  </div>
                  <div className="bg-[#12141B] p-2 rounded border border-[#1E212B]">
                    <span className="text-[#646B7C] block font-mono uppercase text-[9px]">
                      Core Categories
                    </span>
                    <span className="text-white font-medium">
                      {analysis.criticalChannelCategories.slice(0, 4).join(', ')}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {generatedBlueprint && auditReport && (
              <div className="bg-[#0B0C10] border border-[#19C37D]/40 rounded p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[#1E212B] pb-3">
                  <div>
                    <div className="text-[10px] font-mono uppercase text-[#19C37D] flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Blueprint Synthesized & Audited
                    </div>
                    <h4 className="text-base font-bold text-white mt-0.5">
                      {generatedBlueprint.name}
                    </h4>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] font-mono uppercase text-[#646B7C]">Security Score</div>
                    <div className="text-lg font-mono font-bold text-[#19C37D]">
                      {auditReport.overallScore}/100
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-[#A3A9B8] mb-2">
                    Real Blueprint Statistics
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Total Roles', value: auditReport.stats.totalRoles, color: 'text-white' },
                      { label: 'Categories', value: auditReport.stats.totalCategories, color: 'text-white' },
                      { label: 'Total Channels', value: auditReport.stats.totalChannels, color: 'text-[#19C37D]' },
                      { label: 'Text Channels', value: auditReport.stats.textChannels, color: 'text-white' },
                      { label: 'Voice Channels', value: auditReport.stats.voiceChannels, color: 'text-white' },
                      { label: 'Forum Channels', value: auditReport.stats.forumChannels, color: 'text-white' },
                      { label: 'Announcements', value: auditReport.stats.announcementChannels, color: 'text-white' },
                      { label: 'Private Areas', value: auditReport.stats.privateChannels, color: 'text-[#F59E0B]' },
                      { label: 'Public Areas', value: auditReport.stats.publicChannels, color: 'text-[#3B82F6]' },
                      { label: 'Overwrites', value: auditReport.stats.totalOverwrites, color: 'text-[#7547FF]' },
                      { label: 'Automations', value: auditReport.stats.activeAutomationCount, color: 'text-white' },
                      {
                        label: 'Bot Perms',
                        value: auditReport.stats.requiredBotPermissions.length,
                        color: 'text-[#19C37D]',
                      },
                    ].map((st) => (
                      <div
                        key={st.label}
                        className="bg-[#12141B] border border-[#1E212B] rounded p-2"
                      >
                        <div className={`text-sm font-mono font-bold ${st.color}`}>{st.value}</div>
                        <div className="text-[9px] font-mono text-[#646B7C] uppercase mt-0.5 truncate">
                          {st.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-[#12141B] border border-[#1E212B] rounded p-2.5">
                  <div className="text-[10px] font-mono uppercase text-[#646B7C] mb-1 flex items-center gap-1">
                    <Key className="w-3 h-3 text-[#7547FF]" />
                    Required Bot Permissions for Deployment
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {auditReport.stats.requiredBotPermissions.map((perm) => (
                      <span
                        key={perm}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0B0C10] text-[#A3A9B8] border border-[#1E212B]"
                      >
                        {perm}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (onBlueprintGenerated) {
                      onBlueprintGenerated(generatedBlueprint, auditReport);
                    } else if (onGenerateSuccess) {
                      onGenerateSuccess(generatedBlueprint, auditReport);
                    }
                  }}
                  className="w-full py-2.5 px-4 bg-[#19C37D] hover:bg-[#15A86B] text-[#0B0C10] font-semibold rounded text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>Open Visual Blueprint Editor & Permission Matrix</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="bg-[#0B0C10] border border-[#1E212B] rounded p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1E212B] pb-2.5">
                <div>
                  <div className="text-[10px] font-mono uppercase text-[#7547FF]">
                    Requirement-Based Completeness Evaluator
                  </div>
                  <h4 className="text-xs font-bold text-white mt-0.5">
                    Operational Workflow Verification ({completenessEval.generatedComponents.length}/
                    {completenessEval.requiredComponents.length} Satisfied)
                  </h4>
                </div>
                <div
                  className={`text-sm font-mono font-bold px-2 py-0.5 rounded border ${
                    activeTargetBlueprint
                      ? completenessEval.completionPercentage >= 90
                        ? 'bg-[#19C37D]/15 text-[#19C37D] border-[#19C37D]/40'
                        : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
                      : 'bg-[#12141B] text-[#646B7C] border-[#1E212B]'
                  }`}
                >
                  {activeTargetBlueprint ? `${completenessEval.completionPercentage}%` : '0%'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                <div className="bg-[#12141B] border border-[#1E212B] rounded p-2">
                  <div className="text-white font-bold">{completenessEval.requiredComponents.length}</div>
                  <div className="text-[9px] text-[#646B7C] uppercase">Required</div>
                </div>
                <div className="bg-[#12141B] border border-[#1E212B] rounded p-2">
                  <div className="text-[#19C37D] font-bold">
                    {activeTargetBlueprint ? completenessEval.generatedComponents.length : 0}
                  </div>
                  <div className="text-[9px] text-[#646B7C] uppercase">Generated</div>
                </div>
                <div className="bg-[#12141B] border border-[#1E212B] rounded p-2">
                  <div
                    className={`font-bold ${
                      completenessEval.missingComponents.length > 0 ? 'text-[#F59E0B]' : 'text-[#19C37D]'
                    }`}
                  >
                    {activeTargetBlueprint
                      ? completenessEval.missingComponents.length
                      : completenessEval.requiredComponents.length}
                  </div>
                  <div className="text-[9px] text-[#646B7C] uppercase">Missing</div>
                </div>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {completenessEval.requiredComponents.map((comp) => (
                  <div
                    key={comp.id}
                    className={`p-2 rounded border text-[11px] flex items-start justify-between gap-2 ${
                      comp.satisfied && activeTargetBlueprint
                        ? 'bg-[#12141B] border-[#19C37D]/30'
                        : 'bg-[#12141B]/60 border-[#1E212B]'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-semibold text-white flex items-center gap-1.5">
                        {comp.satisfied && activeTargetBlueprint ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#19C37D] shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                        )}
                        <span>{comp.name}</span>
                      </div>
                      <div className="text-[10px] text-[#A3A9B8] pl-5">
                        {activeTargetBlueprint
                          ? comp.evidence ||
                            (comp.matchedResources && comp.matchedResources.length > 0
                              ? `Verified: ${comp.matchedResources.join(', ')}`
                              : comp.description)
                          : comp.description}
                      </div>
                    </div>
                    <span
                      className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded shrink-0 ${
                        comp.satisfied && activeTargetBlueprint
                          ? 'bg-[#19C37D]/15 text-[#19C37D]'
                          : 'bg-[#F59E0B]/15 text-[#F59E0B]'
                      }`}
                    >
                      {comp.satisfied && activeTargetBlueprint ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>

              {completenessEval.optionalRecommendations.length > 0 && (
                <div className="pt-2 border-t border-[#1E212B]">
                  <div className="text-[10px] font-mono uppercase text-[#646B7C] mb-1">
                    Optional Architectural Recommendations
                  </div>
                  <ul className="space-y-1 text-[10px] text-[#A3A9B8] list-disc pl-4">
                    {completenessEval.optionalRecommendations.slice(0, 3).map((rec, i) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

