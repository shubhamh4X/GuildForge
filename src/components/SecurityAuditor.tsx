import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertOctagon,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Wrench,
  Rocket,
  Server,
  Cpu,
  Loader2,
  Key,
} from 'lucide-react';
import { ServerBlueprint, QualityAuditReport } from '../types/discord.ts';
import { autoFixBlueprintIssues } from '../services/validator.ts';
import { apiClient } from '../services/apiClient.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';

interface SecurityAuditorProps {
  blueprint: ServerBlueprint;
  report: QualityAuditReport;
  onAutoFix: (fixedBlueprint: ServerBlueprint) => void;
  onProceedToDeploy: () => void;
}

type AuditTab = 'all' | 'critical' | 'warning' | 'recommendation' | 'passed';

export const SecurityAuditor: React.FC<SecurityAuditorProps> = ({
  blueprint,
  report,
  onAutoFix,
  onProceedToDeploy,
}) => {
  const [activeTab, setActiveTab] = useState<AuditTab>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizeError, setOptimizeError] = useState<string | null>(null);

  const handleFixSingleIssue = async (codeOrId: string, title: string) => {
    try {
      const res = await apiClient.autoFixArchitecture(blueprint, codeOrId);
      onAutoFix(res.blueprint);
      setStatusMessage(`Remediated "${title}" (${codeOrId}) — New Score: ${res.report.score}/100.`);
    } catch {
      const fixed = autoFixBlueprintIssues(blueprint, codeOrId);
      onAutoFix(fixed);
      setStatusMessage(`Remediated "${title}" (${codeOrId}).`);
    }
  };

  const handleApplyAutoFixAll = async () => {
    try {
      const res = await apiClient.autoFixArchitecture(blueprint, 'ALL');
      onAutoFix(res.blueprint);
      setStatusMessage(
        `Applied complete zero-trust & least-privilege remediation across all roles, categories, and channels (Score: ${res.report.score}/100).`
      );
    } catch {
      const fixed = autoFixBlueprintIssues(blueprint, 'ALL');
      onAutoFix(fixed);
      setStatusMessage(
        'Applied complete zero-trust & least-privilege remediation across all roles, categories, and channels.'
      );
    }
  };

  const handleAiOptimizeArchitecture = async () => {
    setIsOptimizing(true);
    setOptimizeError(null);
    setStatusMessage(null);
    try {
      const res = await apiClient.optimizeArchitecture({
        blueprint,
        instructions:
          'Optimize the complete server structure, resolve all security warnings, ensure comprehensive department channels, and enforce strict least-privilege role bitmasks.',
      });
      onAutoFix(res.blueprint);
      setStatusMessage(
        `Gemini AI optimized "${res.blueprint.name}" (${res.blueprint.roles.length} roles, ${res.blueprint.channels.length} channels — Score: ${res.report.score}/100).`
      );
    } catch (err: any) {
      setOptimizeError(err.message || 'AI optimization failed.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const isReady = report.criticalErrors.length === 0;
  const passedList = report.passedChecks || [];
  const scoreBreakdown = report.scoreBreakdown || [];
  const completeness = report.completeness;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#252525]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            AI Quality & Security Validation Engine
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            12-dimension compliance verification for permissions, hierarchy, private isolation, onboarding, moderation, and Discord limits.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={
              isOptimizing ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#906BFF]" />
              ) : (
                <Cpu className="w-4 h-4 text-[#906BFF]" />
              )
            }
            onClick={handleAiOptimizeArchitecture}
            disabled={isOptimizing}
          >
            {isOptimizing ? 'AI Optimizing Architecture...' : 'AI Optimize Architecture'}
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Wrench className="w-4 h-4 text-emerald-400" />}
            onClick={handleApplyAutoFixAll}
            disabled={
              isOptimizing ||
              (report.criticalErrors.length === 0 &&
                report.securityWarnings.length === 0 &&
                report.architecturalRecommendations.length === 0 &&
                (!completeness || completeness.missingComponents.length === 0))
            }
          >
            Auto-Fix All Issues
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Rocket className="w-4 h-4 text-white" />}
            onClick={onProceedToDeploy}
            disabled={!isReady || isOptimizing}
          >
            Deploy Server
          </Button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {optimizeError && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{optimizeError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
              Security Score
            </span>
            <ShieldCheck className="w-4 h-4 text-[#906BFF]" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {report.score} <span className="text-xs font-normal text-[#9CA3AF]">/ 100</span>
          </div>
          <p className="text-xs text-[#9CA3AF]">
            Status: <span className="text-white font-medium">{report.overallStatus.toUpperCase()}</span>
          </p>
        </div>

        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
              Critical Violations
            </span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {report.criticalErrors.length}
          </div>
          <p className="text-xs text-[#9CA3AF]">
            {report.criticalErrors.length > 0 ? (
              <span className="text-rose-400 font-medium">Deployment blocked</span>
            ) : (
              <span className="text-emerald-400 font-medium">Zero blockers</span>
            )}
          </p>
        </div>

        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
              Warnings & Recs
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {report.securityWarnings.length + report.architecturalRecommendations.length}
          </div>
          <p className="text-xs text-[#9CA3AF]">
            {report.securityWarnings.length} Warnings • {report.architecturalRecommendations.length} Recommendations
          </p>
        </div>

        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider">
              Discord Quota & Checks
            </span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {passedList.length} <span className="text-xs font-normal text-[#9CA3AF]">Passed</span>
          </div>
          <p className="text-xs text-[#9CA3AF]">
            {report.discordLimitStats.roleCount}/250 Roles • {report.discordLimitStats.channelCount}/500 Channels
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {scoreBreakdown.length > 0 && (
          <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Explainable Security Score Breakdown
              </h2>
              <span className="text-xs font-mono font-bold text-[#906BFF]">
                Net Score: {report.score} / 100
              </span>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
              {scoreBreakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-lg bg-[#090909] border border-[#202020] flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-white">{item.label}</div>
                    <div className="text-[10px] text-[#9CA3AF]">{item.reason}</div>
                  </div>
                  <span
                    className={`font-mono font-bold shrink-0 ${
                      item.delta > 0
                        ? 'text-emerald-400'
                        : item.delta < 0
                        ? 'text-rose-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {item.delta > 0 ? `${item.delta}` : item.delta === 0 ? '+0 (OK)' : `${item.delta}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {completeness && (
          <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                  Requirement-Based Architecture Completeness
                </h2>
                <p className="text-[11px] text-[#9CA3AF]">
                  {completeness.generatedComponents.length} of {completeness.requiredComponents.length} operational workflows verified
                </p>
              </div>
              <Badge
                variant={completeness.completionPercentage >= 90 ? 'success' : 'warning'}
                size="sm"
              >
                {completeness.completionPercentage}% Complete
              </Badge>
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 text-xs">
              {completeness.requiredComponents.map((comp) => (
                <div
                  key={comp.id}
                  className="p-2 rounded-lg bg-[#090909] border border-[#202020] flex items-center justify-between gap-2"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-1.5">
                      {comp.satisfied ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      )}
                      <span>{comp.name}</span>
                    </div>
                    <div className="text-[10px] text-[#9CA3AF] pl-5">
                      {comp.evidence ||
                        (comp.matchedResources && comp.matchedResources.length > 0
                          ? `Verified: ${comp.matchedResources.join(', ')}`
                          : comp.description)}
                    </div>
                  </div>
                  {!comp.satisfied && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Wrench className="w-3 h-3 text-emerald-400" />}
                      onClick={() => handleFixSingleIssue('REC_COMPLETENESS_GAP', comp.name)}
                    >
                      Synthesize
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {report.stats && (
        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">
              Real Calculated Blueprint Statistics
            </h2>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-mono text-[#9CA3AF]">
              <Key className="w-3.5 h-3.5 text-[#906BFF]" />
              <span>Required Bot Permissions:</span>
              {report.stats.requiredBotPermissions.map((perm) => (
                <span
                  key={perm}
                  className="px-1.5 py-0.5 rounded bg-[#171717] border border-[#252525] text-white"
                >
                  {perm}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
            {[
              { label: 'Total Roles', value: report.stats.totalRoles, color: 'text-white' },
              { label: 'Categories', value: report.stats.totalCategories, color: 'text-white' },
              { label: 'Total Channels', value: report.stats.totalChannels, color: 'text-emerald-400' },
              { label: 'Text', value: report.stats.textChannels, color: 'text-white' },
              { label: 'Voice', value: report.stats.voiceChannels, color: 'text-white' },
              { label: 'Forums', value: report.stats.forumChannels, color: 'text-blue-400' },
              { label: 'Announcements', value: report.stats.announcementChannels, color: 'text-amber-400' },
              { label: 'Stage/Media', value: report.stats.stageChannels + report.stats.mediaChannels, color: 'text-pink-400' },
              { label: 'Private', value: report.stats.privateChannels, color: 'text-amber-400' },
              { label: 'Public', value: report.stats.publicChannels, color: 'text-emerald-400' },
              { label: 'Overwrites', value: report.stats.totalOverwrites, color: 'text-[#906BFF]' },
              { label: 'Automations', value: report.stats.activeAutomationCount, color: 'text-white' },
            ].map((st) => (
              <div
                key={st.label}
                className="bg-[#090909] border border-[#202020] rounded-lg p-2.5 text-center"
              >
                <div className={`text-sm font-mono font-bold ${st.color}`}>{st.value}</div>
                <div className="text-[9px] font-mono text-[#71717A] uppercase mt-0.5 truncate">
                  {st.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-b border-[#252525] pb-3">
        {[
          {
            id: 'all' as AuditTab,
            label: `All Findings (${report.criticalErrors.length + report.securityWarnings.length + report.architecturalRecommendations.length + passedList.length})`,
          },
          { id: 'critical' as AuditTab, label: `Critical (${report.criticalErrors.length})` },
          { id: 'warning' as AuditTab, label: `Warning (${report.securityWarnings.length})` },
          {
            id: 'recommendation' as AuditTab,
            label: `Recommendation (${report.architecturalRecommendations.length})`,
          },
          { id: 'passed' as AuditTab, label: `Passed (${passedList.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-[#7547FF] text-white'
                : 'bg-[#111111] text-[#9CA3AF] hover:text-white border border-[#252525]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">

        {(activeTab === 'all' || activeTab === 'critical') &&
          report.criticalErrors.map((err, i) => (
            <div
              key={`crit_${i}`}
              className="p-4 rounded-xl bg-[#111111] border border-rose-900/60 text-xs space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-rose-400 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 shrink-0" />
                  {err.title}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="danger" size="sm">
                    CRITICAL • {err.code}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Wrench className="w-3 h-3 text-emerald-400" />}
                    onClick={() => handleFixSingleIssue(err.code, err.title)}
                  >
                    Fix Issue
                  </Button>
                </div>
              </div>
              <p className="text-white">{err.message}</p>
              <p className="text-[#9CA3AF]">
                <strong className="text-white">Resolution:</strong> {err.resolution}
              </p>
            </div>
          ))}

        {(activeTab === 'all' || activeTab === 'warning') &&
          report.securityWarnings.map((warn, i) => (
            <div
              key={`warn_${i}`}
              className="p-4 rounded-xl bg-[#111111] border border-amber-900/60 text-xs space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  {warn.title}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="warning" size="sm">
                    WARNING • {warn.code}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Wrench className="w-3 h-3 text-emerald-400" />}
                    onClick={() => handleFixSingleIssue(warn.code, warn.title)}
                  >
                    Fix Issue
                  </Button>
                </div>
              </div>
              <p className="text-white">{warn.message}</p>
              <p className="text-[#9CA3AF]">
                <strong className="text-white">Resolution:</strong> {warn.resolution}
              </p>
            </div>
          ))}

        {(activeTab === 'all' || activeTab === 'recommendation') &&
          report.architecturalRecommendations.map((rec, i) => (
            <div
              key={`rec_${i}`}
              className="p-4 rounded-xl bg-[#111111] border border-[#252525] text-xs space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4 text-[#906BFF] shrink-0" />
                  {rec.title}
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="purple" size="sm">
                    RECOMMENDATION • {rec.code}
                  </Badge>
                  {rec.autoFixable && (
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<Wrench className="w-3 h-3 text-[#906BFF]" />}
                      onClick={() => handleFixSingleIssue(rec.code, rec.title)}
                    >
                      Apply Recommendation
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-[#9CA3AF]">{rec.message}</p>
              <p className="text-[#71717A]">
                <strong className="text-white">Impact:</strong> {rec.impact}
              </p>
            </div>
          ))}

        {(activeTab === 'all' || activeTab === 'passed') &&
          passedList.map((chk, i) => (
            <div
              key={`pass_${i}`}
              className="p-3.5 rounded-xl bg-[#0e1411] border border-emerald-900/40 text-xs flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-white block">{chk.title}</span>
                  <span className="text-[#9CA3AF]">{chk.message}</span>
                </div>
              </div>
              <Badge variant="success" size="sm">
                PASSED
              </Badge>
            </div>
          ))}
      </div>
    </div>
  );
};

