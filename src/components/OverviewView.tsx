import React from 'react';
import {
  Layers,
  ShieldCheck,
  Rocket,
  Server,
  CheckCircle2,
  Bot
} from 'lucide-react';
import { ServerBlueprint, ConnectedGuild, QualityAuditReport } from '../types/discord.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';

interface OverviewViewProps {
  blueprint: ServerBlueprint | null;
  guilds: ConnectedGuild[];
  selectedGuildId: string;
  auditReport: QualityAuditReport | null;
  botOnline: boolean;
  botUsername?: string;
  onNavigateToBuilder: () => void;
  onNavigateToArchitecture: () => void;
  onNavigateToAudit: () => void;
  onNavigateToDeploy: () => void;
  onOpenInviteModal: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  blueprint,
  guilds,
  selectedGuildId,
  auditReport,
  botOnline,
  botUsername,
  onNavigateToBuilder,
  onNavigateToArchitecture,
  onNavigateToAudit,
  onNavigateToDeploy,
  onOpenInviteModal,
}) => {
  const currentGuild = guilds.find(g => g.id === selectedGuildId) || guilds[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Overview Dashboard
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Live Discord server connection status and AI architecture workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {blueprint && auditReport && (
            <Button
              variant="outline"
              size="sm"
              icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
              onClick={onNavigateToAudit}
            >
              Audit ({auditReport.score}/100)
            </Button>
          )}

          <Button
            variant="primary"
            size="sm"
            onClick={onNavigateToBuilder}
          >
            New AI Architecture
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
              Connected Guilds
            </span>
            <Server className="w-4 h-4 text-[#71717A]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">{guilds.length}</div>
          <p className="text-xs text-[#9CA3AF]">
            {currentGuild ? (
              <>
                Target: <span className="text-white font-medium">{currentGuild.name}</span>
              </>
            ) : (
              'No server connected'
            )}
          </p>
        </div>

        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
              Active Blueprint
            </span>
            <Layers className="w-4 h-4 text-[#906BFF]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {blueprint ? `${blueprint.roles.length} Roles` : 'None'}
          </div>
          <p className="text-xs text-[#9CA3AF]">
            {blueprint
              ? `${blueprint.channels.length} Channels • ${blueprint.categories.length} Categories`
              : 'Generate in Blueprint Studio'}
          </p>
        </div>

        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
              Security Health
            </span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-white font-mono">
            {auditReport ? (
              <>
                {auditReport.score} <span className="text-xs font-normal text-[#9CA3AF]">/ 100</span>
              </>
            ) : (
              '—'
            )}
          </div>
          <p className="text-xs text-[#9CA3AF]">
            {auditReport ? (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {auditReport.criticalErrors.length === 0
                  ? 'Zero critical leaks'
                  : `${auditReport.criticalErrors.length} issues detected`}
              </span>
            ) : (
              'Awaiting blueprint'
            )}
          </p>
        </div>

        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
              Bot Gateway
            </span>
            <Bot className="w-4 h-4 text-[#906BFF]" />
          </div>
          <div className="text-2xl font-bold text-white font-mono flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                botOnline ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            {botOnline ? 'Online' : 'Offline'}
          </div>
          <p className="text-xs text-[#9CA3AF]">
            {botUsername ? (
              <span className="text-white font-mono">{botUsername}</span>
            ) : (
              'Configure token in Settings'
            )}
          </p>
        </div>
      </div>

      {blueprint && auditReport ? (
        <>
          <div className="bg-[#111111] border border-[#252525] rounded-xl p-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <Badge variant="purple">{blueprint.communityType}</Badge>
                  <span className="text-xs text-[#9CA3AF] font-mono">
                    Updated {new Date(blueprint.updatedAt).toLocaleTimeString()}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {blueprint.name}
                </h2>
                <p className="text-xs text-[#9CA3AF] leading-relaxed line-clamp-2">
                  {blueprint.description}
                </p>

                <div className="flex flex-wrap gap-1.5 pt-1">
                  {blueprint.departments?.map(dept => (
                    <span
                      key={dept}
                      className="text-[11px] px-2 py-0.5 rounded bg-[#171717] border border-[#252525] text-[#9CA3AF]"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
                <Button
                  variant="outline"
                  size="md"
                  icon={<Layers className="w-4 h-4 text-[#906BFF]" />}
                  onClick={onNavigateToArchitecture}
                >
                  Inspect Structure
                </Button>

                <Button
                  variant="primary"
                  size="md"
                  icon={<Rocket className="w-4 h-4 text-white" />}
                  onClick={onNavigateToDeploy}
                >
                  Deploy Server
                </Button>
              </div>
            </div>

            {auditReport.stats && (
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2 pt-5 mt-5 border-t border-[#252525] text-center">
                {[
                  { label: 'Total Roles', value: auditReport.stats.totalRoles, color: 'text-white' },
                  { label: 'Categories', value: auditReport.stats.totalCategories, color: 'text-white' },
                  { label: 'Total Channels', value: auditReport.stats.totalChannels, color: 'text-emerald-400' },
                  { label: 'Text', value: auditReport.stats.textChannels, color: 'text-white' },
                  { label: 'Voice', value: auditReport.stats.voiceChannels, color: 'text-white' },
                  { label: 'Forums', value: auditReport.stats.forumChannels, color: 'text-blue-400' },
                  { label: 'Announcements', value: auditReport.stats.announcementChannels, color: 'text-amber-400' },
                  { label: 'Private', value: auditReport.stats.privateChannels, color: 'text-amber-400' },
                  { label: 'Public', value: auditReport.stats.publicChannels, color: 'text-emerald-400' },
                  { label: 'Overwrites', value: auditReport.stats.totalOverwrites, color: 'text-[#906BFF]' },
                  { label: 'Automations', value: auditReport.stats.activeAutomationCount, color: 'text-white' },
                  {
                    label: 'Completeness',
                    value: `${auditReport.completeness?.completionPercentage ?? 100}%`,
                    color: 'text-emerald-400',
                  },
                ].map(item => (
                  <div
                    key={item.label}
                    className="bg-[#080808] border border-[#202020] rounded-lg p-2"
                  >
                    <div className={`text-xs font-mono font-bold ${item.color}`}>{item.value}</div>
                    <div className="text-[9px] font-mono text-[#71717A] uppercase mt-0.5 truncate">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 bg-[#111111] border border-[#252525] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#252525]">
                <h3 className="text-sm font-bold text-white">Department Role Hierarchy</h3>
                <span className="text-xs text-[#9CA3AF]">{blueprint.roles.length} Roles Defined</span>
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {blueprint.roles.slice(0, 6).map(role => (
                  <div
                    key={role.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-[#171717] border border-[#252525] text-xs"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <div
                        className="w-3 h-3 rounded-full shrink-0"
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="font-semibold text-white truncate">{role.name}</span>
                      <span className="text-[10px] text-[#9CA3AF]">{role.department}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                      {role.permissions.includes('ADMINISTRATOR') ? (
                        <Badge variant="danger" size="sm">Admin</Badge>
                      ) : (
                        <span className="text-[#9CA3AF]">{role.permissions.length} perms</span>
                      )}
                      <span className="text-[#71717A]">#{role.hierarchyPosition}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-between items-center text-xs text-[#9CA3AF]">
                <span>Least-Privilege Isolation Enforced</span>
                <button
                  onClick={onNavigateToArchitecture}
                  className="text-[#906BFF] hover:text-white font-medium transition-colors cursor-pointer"
                >
                  View all {blueprint.roles.length} roles →
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#111111] border border-[#252525] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#252525]">
                <h3 className="text-sm font-bold text-white">Pre-Deployment Verification</h3>
                <Badge variant={auditReport.score >= 85 ? 'success' : 'warning'}>
                  {auditReport.overallStatus}
                </Badge>
              </div>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-lg bg-[#171717] border border-[#252525] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-medium">Discord API Hard Limits</strong>
                    <span className="text-[#9CA3AF]">
                      {blueprint.roles.length}/250 Roles • {blueprint.channels.length}/500 Channels
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#171717] border border-[#252525] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-medium">Onboarding Gateway</strong>
                    <span className="text-[#9CA3AF]">
                      Rule screening channel: #{blueprint.onboardingWorkflow?.welcomeChannel || 'welcome'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-lg bg-[#171717] border border-[#252525] flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-white block font-medium">Moderation Audit Logs</strong>
                    <span className="text-[#9CA3AF]">
                      Incident feed: #{blueprint.moderationProtocol?.logChannel || 'mod-logs'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onOpenInviteModal}
                >
                  Invite Bot to Another Server
                </Button>
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-[#111111] border border-[#252525] rounded-xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#171717] border border-[#252525] flex items-center justify-center mx-auto text-[#906BFF]">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1.5 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-white">No Server Blueprint Generated Yet</h2>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Your workspace is clean with zero dummy templates. Open Blueprint Studio to describe the Discord server you want to build and generate a custom architecture for{' '}
              <strong className="text-white">{currentGuild?.name || 'your Discord server'}</strong>.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Button
              variant="primary"
              size="md"
              onClick={onNavigateToBuilder}
            >
              Generate Server Architecture in Blueprint Studio
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

