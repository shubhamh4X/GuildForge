import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Server,
  Rocket,
  Activity,
  Cpu,
  Terminal,
  Layers,
  Archive,
  Search,
  RefreshCw
} from 'lucide-react';
import { apiClient } from '../services/apiClient.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';

export const AdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logFilter, setLogFilter] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [mRes, lRes] = await Promise.all([
        apiClient.getAdminMetrics(),
        apiClient.getAdminLogs(),
      ]);
      setMetrics(mRes.metrics);
      setLogs(lRes.logs || []);
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredLogs = logs.filter(
    l =>
      l.action?.toLowerCase().includes(logFilter.toLowerCase()) ||
      l.user?.toLowerCase().includes(logFilter.toLowerCase()) ||
      l.details?.toLowerCase().includes(logFilter.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 text-white">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#252525]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Platform Observability & Audit Console
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Real-time metrics computed from persistent storage, AI synthesis invocations, and live Discord API runs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            loading={isLoading}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={fetchData}
          >
            Refresh Telemetry
          </Button>
          <Badge variant="success">
            {metrics?.systemHealth?.storageService === 'PERSISTENT_DISK_OK'
              ? 'All Systems Operational'
              : 'System Active'}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Stored Blueprints
            </span>
            <Layers className="w-4 h-4 text-[#906BFF]" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {metrics?.totalBlueprints ?? 0}
          </div>
          <div className="text-xs text-[#9CA3AF] flex items-center gap-1.5">
            <Archive className="w-3.5 h-3.5 text-[#71717A]" />
            <span>{metrics?.totalBackups ?? 0} immutable snapshots</span>
          </div>
        </div>

        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Connected Guilds
            </span>
            <Server className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {metrics?.connectedGuildsCount ?? 0}
          </div>
          <div className="text-xs text-[#9CA3AF]">
            <span className="text-emerald-400 font-semibold">
              {metrics?.verifiedBotGuildsCount ?? 0}
            </span>{' '}
            bot-verified guilds
          </div>
        </div>

        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Guild Deployments
            </span>
            <Rocket className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {metrics?.totalDeployments ?? 0}
          </div>
          <div className="text-xs text-[#9CA3AF]">
            <span className="text-emerald-400 font-semibold">
              {metrics?.successfulDeployments ?? 0} succeeded
            </span>{' '}
            • <span className="text-rose-400">{metrics?.failedDeployments ?? 0} failed</span> (
            {metrics?.successRate || 'N/A'})
          </div>
        </div>

        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Gemini Synthesis Calls
            </span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {metrics?.aiGenerationsCount ?? 0}
          </div>
          <div className="text-xs text-[#9CA3AF]">
            <span className="text-[#906BFF] font-semibold">
              {metrics?.aiAnalysesCount ?? 0}
            </span>{' '}
            deep requirement analyses
          </div>
        </div>
      </div>

      <div className="bg-[#111111] border border-[#252525] rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#906BFF]" />
            Verified Architecture & Operational Telemetry (100% Real Store Data)
          </h3>
          <span className="text-[11px] font-mono text-[#9CA3AF]">
            Active Blueprint: <strong className="text-white">{metrics?.activeBlueprintStats?.name || 'None Loaded'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 text-center">
          {[
            { label: 'Total Roles', value: metrics?.activeBlueprintStats?.totalRoles ?? 0, color: 'text-white' },
            { label: 'Total Categories', value: metrics?.activeBlueprintStats?.totalCategories ?? 0, color: 'text-white' },
            { label: 'Total Channels', value: metrics?.activeBlueprintStats?.totalChannels ?? 0, color: 'text-emerald-400' },
            { label: 'Text Channels', value: metrics?.activeBlueprintStats?.textChannels ?? 0, color: 'text-white' },
            { label: 'Voice Channels', value: metrics?.activeBlueprintStats?.voiceChannels ?? 0, color: 'text-white' },
            { label: 'Forum Channels', value: metrics?.activeBlueprintStats?.forumChannels ?? 0, color: 'text-blue-400' },
            { label: 'Announcements', value: metrics?.activeBlueprintStats?.announcementChannels ?? 0, color: 'text-amber-400' },
            { label: 'Private Channels', value: metrics?.activeBlueprintStats?.privateChannels ?? 0, color: 'text-amber-400' },
            { label: 'Public Channels', value: metrics?.activeBlueprintStats?.publicChannels ?? 0, color: 'text-emerald-400' },
            { label: 'Perm Overwrites', value: metrics?.activeBlueprintStats?.permissionOverwrites ?? 0, color: 'text-[#906BFF]' },
            { label: 'Automations', value: metrics?.activeBlueprintStats?.automationModules ?? 0, color: 'text-white' },
            { label: 'Successful Deploys', value: metrics?.successfulDeployments ?? 0, color: 'text-emerald-400' },
            { label: 'Failed Deploys', value: metrics?.failedDeployments ?? 0, color: 'text-rose-400' },
            { label: 'Saved Snapshots', value: metrics?.totalBackups ?? 0, color: 'text-white' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-3 rounded-lg bg-[#080808] border border-[#202020]"
            >
              <div className={`text-base font-mono font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-[10px] font-mono text-[#71717A] uppercase mt-0.5 truncate">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#111111] border border-[#252525] rounded-xl p-6 space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#906BFF]" />
          Subsystem Reliability Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-[#080808] border border-[#252525] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Google Gemini 3.8 Flash</div>
              <div className="text-[10px] text-[#9CA3AF]">Schema JSON synthesis</div>
            </div>
            <Badge
              variant={metrics?.systemHealth?.geminiApi === 'CONNECTED' ? 'success' : 'warning'}
              size="sm"
            >
              {metrics?.systemHealth?.geminiApi || 'ONLINE'}
            </Badge>
          </div>

          <div className="p-4 rounded-xl bg-[#080808] border border-[#252525] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Discord REST API v10</div>
              <div className="text-[10px] text-[#9CA3AF]">Rate-limit buckets (500ms)</div>
            </div>
            <Badge
              variant={
                metrics?.systemHealth?.discordGateway === 'BOT_TOKEN_CONFIGURED'
                  ? 'success'
                  : 'warning'
              }
              size="sm"
            >
              {metrics?.systemHealth?.discordGateway === 'BOT_TOKEN_CONFIGURED'
                ? 'TOKEN READY'
                : 'AWAITING TOKEN'}
            </Badge>
          </div>

          <div className="p-4 rounded-xl bg-[#080808] border border-[#252525] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">Database & Vault</div>
              <div className="text-[10px] text-[#9CA3AF]">Disk JSON persistence</div>
            </div>
            <Badge variant="success" size="sm">
              {metrics?.systemHealth?.storageService || 'HEALTHY'}
            </Badge>
          </div>

          <div className="p-4 rounded-xl bg-[#080808] border border-[#252525] flex items-center justify-between">
            <div>
              <div className="text-xs font-bold text-white">SSE Telemetry Stream</div>
              <div className="text-[10px] text-[#9CA3AF]">Live deployment events</div>
            </div>
            <Badge variant="success" size="sm">
              {metrics?.systemHealth?.rateLimiterPool || 'ACTIVE'}
            </Badge>
          </div>
        </div>
      </div>

      <div className="bg-[#111111] border border-[#252525] rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#252525]">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-white">
              System Audit Logs & Security History ({filteredLogs.length})
            </h3>
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search logs..."
              value={logFilter}
              onChange={e => setLogFilter(e.target.value)}
              className="w-full bg-[#080808] border border-[#252525] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#7547FF]"
            />
            <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-2.5 top-2.5" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-[#0c0c0c] text-[10px] uppercase font-bold text-[#9CA3AF] border-b border-[#252525]">
              <tr>
                <th className="py-2.5 px-3">Timestamp</th>
                <th className="py-2.5 px-3">Action</th>
                <th className="py-2.5 px-3">Actor</th>
                <th className="py-2.5 px-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020] font-mono text-[11px]">
              {filteredLogs.map(l => (
                <tr key={l.id} className="hover:bg-[#161616]">
                  <td className="py-2.5 px-3 text-[#9CA3AF] whitespace-nowrap">
                    {new Date(l.timestamp).toLocaleDateString()}{' '}
                    {new Date(l.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="py-2.5 px-3">
                    <Badge variant="purple" size="sm">
                      {l.action}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-white">{l.user}</td>
                  <td className="py-2.5 px-3 text-[#9CA3AF] font-sans">{l.details}</td>
                </tr>
              ))}

              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-center text-[#71717A] font-sans">
                    No logs found matching search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

