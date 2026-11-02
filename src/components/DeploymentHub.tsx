import React, { useState, useEffect, useRef } from 'react';
import {
  Rocket,
  Server,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Terminal,
  Download,
  Key,
  RefreshCw,
  Plus,
  ClipboardCheck,
  Bot,
  Copy,
  Check,
  Trash2,
} from 'lucide-react';
import { apiClient } from '../services/apiClient.ts';
import {
  ServerBlueprint,
  DeploymentJob,
  ConnectedGuild,
  DeploymentPlan,
  GuildCreationEligibility,
} from '../types/discord.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';

interface DeploymentHubProps {
  blueprint: ServerBlueprint | null;
  guilds: ConnectedGuild[];
  selectedGuildId: string;
  setSelectedGuildId: (id: string) => void;
  onGuildsUpdated: (guilds: ConnectedGuild[], selectedId?: string) => void;
  onOpenInviteModal: () => void;
}

export const DeploymentHub: React.FC<DeploymentHubProps> = ({
  blueprint,
  guilds,
  selectedGuildId,
  setSelectedGuildId,
  onGuildsUpdated,
  onOpenInviteModal,
}) => {
  const [botToken, setBotToken] = useState<string>('');
  const [hasStoredToken, setHasStoredToken] = useState<boolean>(false);
  const [maskedToken, setMaskedToken] = useState<string>('');
  const [isVerifyingBot, setIsVerifyingBot] = useState(false);
  const [tokenStatus, setTokenStatus] = useState<{
    valid: boolean;
    botName?: string;
    guildCount?: number;
    error?: string;
  } | null>(null);

  const [botServerName, setBotServerName] = useState<string>(
    blueprint?.name || 'New GuildForge Server'
  );
  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [isGeneratingInvite, setIsGeneratingInvite] = useState(false);
  const [guildEligibility, setGuildEligibility] = useState<GuildCreationEligibility | null>(null);

  const [newGuildId, setNewGuildId] = useState('');
  const [newGuildName, setNewGuildName] = useState('');
  const [isAddingGuild, setIsAddingGuild] = useState(false);

  const [deploymentPlan, setDeploymentPlan] = useState<DeploymentPlan | null>(null);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);

  const [activeJob, setActiveJob] = useState<DeploymentJob | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [clearModalOpen, setClearModalOpen] = useState(false);
  const [clearChannels, setClearChannels] = useState(true);
  const [clearRoles, setClearRoles] = useState(true);
  const [keepGeneralChannel, setKeepGeneralChannel] = useState(true);

  const terminalRef = useRef<HTMLDivElement>(null);
  const selectedGuild = guilds.find(g => g.id === selectedGuildId) || guilds[0];

  useEffect(() => {
    if (blueprint?.name) {
      setBotServerName(blueprint.name);
    }
  }, [blueprint?.name]);

  useEffect(() => {
    apiClient
      .getSettings()
      .then(res => {
        setHasStoredToken(Boolean(res.botTokenConfigured));
        setMaskedToken(res.botTokenSource || '');
      })
      .catch(err => console.warn('Failed to load settings:', err));

    apiClient
      .getDeployments()
      .then(res => {
        if (res.deployments && res.deployments.length > 0) {
          setActiveJob(res.deployments[0]);
        }
      })
      .catch(err => console.warn('Failed to load deployments:', err));

    apiClient
      .getGuilds()
      .then(res => {
        if (res.guildCreationEligibility) {
          setGuildEligibility(res.guildCreationEligibility);
        }
      })
      .catch(err => console.warn('Failed to load guild creation eligibility:', err));
  }, []);

  useEffect(() => {
    if (blueprint && (selectedGuild?.id || selectedGuildId)) {
      handleRunPreflightPlan();
    }
  }, [blueprint?.id, blueprint?.updatedAt, selectedGuildId]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [activeJob?.logs]);

  useEffect(() => {
    if (
      !activeJob ||
      activeJob.status === 'completed' ||
      activeJob.status === 'failed' ||
      activeJob.status === 'cancelled'
    ) {
      return;
    }

    const eventSource = new EventSource(`/api/deployments/${activeJob.id}/events`);

    eventSource.onmessage = event => {
      try {
        const updatedJob: DeploymentJob = JSON.parse(event.data);
        setActiveJob(updatedJob);
        if (updatedJob.inviteUrl) {
          setCreatedInviteUrl(updatedJob.inviteUrl);
        }
        if (
          updatedJob.status === 'completed' ||
          updatedJob.status === 'failed' ||
          updatedJob.status === 'cancelled'
        ) {
          setIsDeploying(false);
          eventSource.close();
          if (blueprint) {
            handleRunPreflightPlan();
          }
        }
      } catch (err) {
        console.error('Error parsing SSE deployment message:', err);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [activeJob?.id, activeJob?.status]);

  const handleVerifyBotToken = async () => {
    if (!botToken.trim()) return;
    setIsVerifyingBot(true);
    setTokenStatus(null);
    setErrorMsg(null);
    try {
      const res = await apiClient.verifyBotToken(botToken.trim());
      if (res.valid) {
        setHasStoredToken(true);
        setTokenStatus({
          valid: true,
          botName: `${res.bot.username}`,
          guildCount: res.guilds?.length || 0,
        });
        const gRes = await apiClient.getGuilds();
        if (gRes.guildCreationEligibility) {
          setGuildEligibility(gRes.guildCreationEligibility);
        }
        if (res.guilds && res.guilds.length > 0) {
          onGuildsUpdated(res.guilds, res.guilds[0].id);
        } else {
          onGuildsUpdated(gRes.guilds);
        }
        if (blueprint) {
          await handleRunPreflightPlan(botToken.trim());
        }
      } else {
        setTokenStatus({ valid: false, error: res.error || 'Token rejected by Discord API' });
      }
    } catch (err: any) {
      setTokenStatus({ valid: false, error: err.message });
    } finally {
      setIsVerifyingBot(false);
    }
  };

  const handleBotCreateServer = async (deployImmediately = false) => {
    const cleanName = (botServerName || blueprint?.name || 'New GuildForge Server').trim();
    if (!cleanName) return;

    setIsCreatingServer(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.createGuildWithBot(cleanName, botToken.trim() || undefined);
      if (res.inviteUrl) {
        setCreatedInviteUrl(res.inviteUrl);
      }
      onGuildsUpdated(res.guilds, res.guild.id);
      setSelectedGuildId(res.guild.id);

      if (deployImmediately && blueprint) {
        setIsDeploying(true);
        const depRes = await apiClient.startDeployment({
          guildId: res.guild.id,
          guildName: res.guild.name,
          blueprint,
          botToken: botToken.trim() || undefined,
        });
        setActiveJob(depRes.job);
      } else if (blueprint) {
        await handleRunPreflightPlan(botToken.trim() || undefined, res.guild.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Bot failed to create the Discord server.');
      setIsDeploying(false);
    } finally {
      setIsCreatingServer(false);
    }
  };

  const handleGenerateInviteForSelected = async () => {
    if (!selectedGuild?.id) return;
    setIsGeneratingInvite(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.createGuildInvite(
        selectedGuild.id,
        botToken.trim() || undefined
      );
      setCreatedInviteUrl(res.inviteUrl);
      if (res.guilds) {
        onGuildsUpdated(res.guilds, selectedGuild.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate Discord invite link.');
    } finally {
      setIsGeneratingInvite(false);
    }
  };

  const handleCopyInvite = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
  };

  const handleAddGuildById = async () => {
    if (!newGuildId.trim()) return;
    setIsAddingGuild(true);
    setErrorMsg(null);
    try {
      const res = await apiClient.addGuild(newGuildId.trim(), newGuildName.trim() || undefined);
      const gList = await apiClient.getGuilds();
      onGuildsUpdated(gList.guilds, res.guild.id);
      setNewGuildId('');
      setNewGuildName('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to register Discord Server ID.');
    } finally {
      setIsAddingGuild(false);
    }
  };

  const handleRunPreflightPlan = async (overrideToken?: string, overrideGuildId?: string) => {
    const targetGuildId = overrideGuildId || selectedGuild?.id || selectedGuildId;
    if (!targetGuildId || !blueprint) return;
    setIsGeneratingPlan(true);
    try {
      const res = await apiClient.generateDeploymentPlan({
        guildId: targetGuildId,
        blueprint,
        botToken: overrideToken ?? (botToken.trim() || undefined),
      });
      setDeploymentPlan(res.plan);
    } catch (err: any) {
      console.warn('Could not generate deployment plan:', err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  const handleConfirmDeploy = async () => {
    setConfirmModalOpen(false);
    if (!blueprint) return;
    setIsDeploying(true);
    setErrorMsg(null);

    if (!selectedGuild?.id) {
      setErrorMsg(
        'No target Discord Server selected. Create a new server with the bot or select a connected server first.'
      );
      setIsDeploying(false);
      return;
    }

    try {
      const res = await apiClient.startDeployment({
        guildId: selectedGuild.id,
        guildName: selectedGuild.name,
        blueprint,
        botToken: botToken.trim() || undefined,
      });

      setActiveJob(res.job);
    } catch (err: any) {
      setErrorMsg(err.message || 'Deployment initiation failed.');
      setIsDeploying(false);
    }
  };

  const handleConfirmClearServer = async () => {
    setClearModalOpen(false);
    if (!selectedGuild?.id) {
      setErrorMsg('Please select a connected Discord server to clear.');
      return;
    }
    if (!clearChannels && !clearRoles) {
      setErrorMsg('Please select at least one option (Clear Channels or Clear Roles).');
      return;
    }

    setIsDeploying(true);
    setErrorMsg(null);

    try {
      const res = await apiClient.clearGuildServer(selectedGuild.id, {
        guildName: selectedGuild.name,
        deleteChannels: clearChannels,
        deleteRoles: clearRoles,
        keepGeneralChannel: clearChannels ? keepGeneralChannel : false,
        botToken: botToken.trim() || undefined,
      });
      setActiveJob(res.job);
    } catch (err: any) {
      setErrorMsg(err.message || 'Server clear operation failed to start.');
      setIsDeploying(false);
    }
  };

  const handleCancelDeployment = async () => {
    if (activeJob) {
      await apiClient.cancelDeployment(activeJob.id);
      setIsDeploying(false);
    }
  };

  const handleDownloadReport = () => {
    if (!activeJob) return;
    const reportStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(activeJob, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', reportStr);
    downloadAnchor.setAttribute('download', `deployment-report-${activeJob.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const activeInviteUrl = createdInviteUrl || selectedGuild?.inviteUrl || activeJob?.inviteUrl;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#252525]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Deployment Control Center
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Have the bot create a brand-new Discord server, deploy a blueprint, or clear an entire server at once.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {blueprint && (
            <Button
              variant="outline"
              size="sm"
              loading={isGeneratingPlan}
              icon={<RefreshCw className="w-3.5 h-3.5 text-emerald-400" />}
              onClick={() => handleRunPreflightPlan()}
            >
              Re-Verify Pre-Flight
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            icon={<ExternalLink className="w-4 h-4 text-[#906BFF]" />}
            onClick={onOpenInviteModal}
          >
            Create / Invite Bot
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-900/60 text-rose-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <div className="lg:col-span-5 space-y-6">

          <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Bot className="w-4 h-4 text-[#906BFF]" />
                1. Bot: Create Brand-New Discord Server
              </h3>
              <Badge
                variant={
                  guildEligibility?.authorized === false
                    ? 'warning'
                    : guildEligibility?.authorized === true
                    ? 'success'
                    : 'purple'
                }
                size="sm"
              >
                {guildEligibility?.authorized === false
                  ? 'POST /guilds Restricted'
                  : guildEligibility?.authorized === true
                  ? `POST /guilds Authorized (${guildEligibility.guildCount}/10)`
                  : 'Discord API v10'}
              </Badge>
            </div>

            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Your authenticated bot can create a brand-new Discord server directly on Discord (<code className="text-white">POST /guilds</code>) when in fewer than 10 guilds, generate an instant <code className="text-white">discord.gg</code> invite link, and provision the entire blueprint automatically.
            </p>

            {guildEligibility && !guildEligibility.authorized && (
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 space-y-2 text-xs">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>Direct Guild Creation Unavailable</span>
                </div>
                <p className="text-[11px] text-amber-200/90 leading-relaxed">
                  {guildEligibility.reason}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ExternalLink className="w-3.5 h-3.5 text-[#906BFF]" />}
                  onClick={onOpenInviteModal}
                >
                  Invite Bot to an Existing Server Instead (OAuth2)
                </Button>
              </div>
            )}

            <div className="space-y-2.5">
              <label className="text-xs font-medium text-[#9CA3AF] block">
                New Discord Server Name
              </label>
              <input
                type="text"
                value={botServerName}
                onChange={e => setBotServerName(e.target.value)}
                disabled={
                  isCreatingServer ||
                  isDeploying ||
                  (guildEligibility !== null && !guildEligibility.authorized)
                }
                placeholder="Enter server name..."
                className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF] disabled:opacity-50"
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  loading={isCreatingServer && !isDeploying}
                  disabled={
                    isCreatingServer ||
                    isDeploying ||
                    !botServerName.trim() ||
                    (guildEligibility !== null && !guildEligibility.authorized)
                  }
                  icon={<Plus className="w-3.5 h-3.5 text-[#906BFF]" />}
                  onClick={() => handleBotCreateServer(false)}
                >
                  Create Blank Server
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  loading={isCreatingServer && isDeploying}
                  disabled={
                    isCreatingServer ||
                    isDeploying ||
                    !botServerName.trim() ||
                    !blueprint ||
                    (guildEligibility !== null && !guildEligibility.authorized)
                  }
                  icon={<Rocket className="w-3.5 h-3.5 text-white" />}
                  onClick={() => handleBotCreateServer(true)}
                >
                  Create & Deploy Blueprint
                </Button>
              </div>
            </div>

            {activeInviteUrl && (
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/50 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-emerald-300 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Server Invite Link Ready
                  </span>
                  <button
                    onClick={() => handleCopyInvite(activeInviteUrl)}
                    className="text-[11px] text-emerald-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    {copiedInvite ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedInvite ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={activeInviteUrl}
                    className="flex-1 bg-[#080808] border border-emerald-800/40 rounded px-2.5 py-1.5 text-xs font-mono text-white"
                  />
                  <a
                    href={activeInviteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 shrink-0"
                  >
                    <span>Join Server</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>

          <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-[#906BFF]" />
                2. Target Connected Discord Server
              </h3>
              {selectedGuild && (
                <Button
                  variant="ghost"
                  size="sm"
                  loading={isGeneratingInvite}
                  onClick={handleGenerateInviteForSelected}
                >
                  Get Invite Link
                </Button>
              )}
            </div>

            {guilds.length > 0 ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                    Select Connected Server ({guilds.length})
                  </label>
                  <select
                    value={selectedGuild?.id || ''}
                    onChange={e => setSelectedGuildId(e.target.value)}
                    disabled={isDeploying}
                    className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                  >
                    {guilds.map(g => (
                      <option key={g.id} value={g.id} className="bg-[#111111]">
                        {g.name} ({g.id})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-rose-300 flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                      Clear / Reset Entire Server
                    </span>
                    <Badge variant="danger" size="sm">
                      One-Click Wipe
                    </Badge>
                  </div>
                  <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                    Wipe all channels, categories, and custom roles from{' '}
                    <strong className="text-white">{selectedGuild?.name}</strong> at once before deploying a fresh architecture.
                  </p>
                  <Button
                    variant="danger"
                    size="sm"
                    className="w-full"
                    disabled={isDeploying || !selectedGuild}
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => setClearModalOpen(true)}
                  >
                    Clear Entire Server ({selectedGuild?.name})
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#080808] border border-[#252525] text-xs text-[#9CA3AF]">
                No Discord servers connected yet. Use "Create Blank Server" above to have the bot create one, or register an existing Server ID below.
              </div>
            )}

            <div className="pt-2 border-t border-[#252525] space-y-2">
              <label className="text-[11px] font-medium text-[#9CA3AF] block">
                Add Existing Server by Discord Guild ID (17-20 digit Snowflake)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Server ID (e.g. 123456789012345678)"
                  value={newGuildId}
                  onChange={e => setNewGuildId(e.target.value)}
                  className="flex-1 bg-[#080808] border border-[#252525] rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#7547FF]"
                />
                <input
                  type="text"
                  placeholder="Label (optional)"
                  value={newGuildName}
                  onChange={e => setNewGuildName(e.target.value)}
                  className="w-28 bg-[#080808] border border-[#252525] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  loading={isAddingGuild}
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleAddGuildById}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>

          <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-emerald-400" />
                3. Pre-Flight Readiness & Plan
              </h3>
              {deploymentPlan && (
                <Badge variant={deploymentPlan.botReadiness.ready ? 'success' : 'warning'} size="sm">
                  {deploymentPlan.botReadiness.ready ? 'Ready for Live Deploy' : 'Pre-Flight Blocked'}
                </Badge>
              )}
            </div>

            {blueprint ? (
              <>
                {deploymentPlan && (
                  <div className="space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-lg bg-[#080808] border border-[#252525]">
                        <div className="text-[10px] text-[#71717A] uppercase">Roles</div>
                        <div className="font-mono font-bold text-white mt-0.5">
                          +{deploymentPlan.rolesToCreate} new
                        </div>
                        <div className="text-[10px] text-[#9CA3AF]">
                          {deploymentPlan.rolesToReuse} existing
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#080808] border border-[#252525]">
                        <div className="text-[10px] text-[#71717A] uppercase">Categories</div>
                        <div className="font-mono font-bold text-white mt-0.5">
                          +{deploymentPlan.categoriesToCreate} new
                        </div>
                        <div className="text-[10px] text-[#9CA3AF]">
                          {deploymentPlan.categoriesToReuse} existing
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#080808] border border-[#252525]">
                        <div className="text-[10px] text-[#71717A] uppercase">Channels</div>
                        <div className="font-mono font-bold text-white mt-0.5">
                          +{deploymentPlan.channelsToCreate} new
                        </div>
                        <div className="text-[10px] text-[#9CA3AF]">
                          {deploymentPlan.channelsToReuse} existing
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-[#080808] border border-[#252525] space-y-1.5 text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[#9CA3AF]">Bot Identity:</span>
                        <span
                          className={
                            deploymentPlan.botReadiness.botUsername
                              ? 'text-emerald-400 font-semibold'
                              : 'text-rose-400'
                          }
                        >
                          {deploymentPlan.botReadiness.botUsername || 'Not Verified in Guild'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#9CA3AF]">Manage Roles / Channels:</span>
                        <span
                          className={
                            deploymentPlan.botReadiness.hasManageRoles &&
                            deploymentPlan.botReadiness.hasManageChannels
                              ? 'text-emerald-400 font-semibold'
                              : 'text-rose-400'
                          }
                        >
                          {deploymentPlan.botReadiness.hasManageRoles &&
                          deploymentPlan.botReadiness.hasManageChannels
                            ? 'Granted'
                            : 'Missing'}
                        </span>
                      </div>
                      {deploymentPlan.botReadiness.error && (
                        <div className="text-amber-400 pt-1 border-t border-[#202020]">
                          {deploymentPlan.botReadiness.error}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={isDeploying || !selectedGuild}
                  onClick={() => setConfirmModalOpen(true)}
                  icon={<Rocket className="w-4 h-4 text-white" />}
                >
                  Deploy "{blueprint.name}" to {selectedGuild ? selectedGuild.name : 'Selected Server'}
                </Button>
              </>
            ) : (
              <div className="p-3 rounded-lg bg-[#080808] border border-[#252525] text-xs text-[#9CA3AF]">
                No blueprint is currently loaded. You can still clear an existing server above or create a blank server, or generate a blueprint in Blueprint Studio to deploy.
              </div>
            )}
          </div>

          <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                <Key className="w-4 h-4 text-[#906BFF]" />
                4. Discord Bot Authentication
              </h3>
              {hasStoredToken && (
                <Badge variant="success" size="sm">
                  Token Configured {maskedToken ? `(${maskedToken})` : ''}
                </Badge>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#9CA3AF] block">
                Discord Bot Token (authenticates bot & discovers joined servers)
              </label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder={hasStoredToken ? 'Enter new token to override...' : 'Paste Discord Bot Token...'}
                  value={botToken}
                  onChange={e => setBotToken(e.target.value)}
                  className="flex-1 bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#7547FF]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  loading={isVerifyingBot}
                  onClick={handleVerifyBotToken}
                >
                  Authenticate & Sync
                </Button>
              </div>
              {tokenStatus && (
                <div
                  className={`text-[11px] p-2.5 rounded-lg border ${
                    tokenStatus.valid
                      ? 'bg-emerald-950/40 border-emerald-800/50 text-emerald-300'
                      : 'bg-rose-950/40 border-rose-800/50 text-rose-300'
                  }`}
                >
                  {tokenStatus.valid
                    ? `✓ Authenticated as ${tokenStatus.botName} (${tokenStatus.guildCount} servers discovered)`
                    : `✗ ${tokenStatus.error}`}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-[#111111] border border-[#252525] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#252525]">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Terminal className="w-4 h-4 text-[#906BFF]" />
              <span>Live Discord REST v10 Operations Telemetry</span>
            </div>

            {activeJob && (
              <Badge
                variant={
                  activeJob.status === 'completed'
                    ? 'success'
                    : activeJob.status === 'failed'
                    ? 'danger'
                    : 'purple'
                }
              >
                {activeJob.status.toUpperCase()}
              </Badge>
            )}
          </div>

          {activeJob?.checkpoints && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px]">
              {[
                { key: 'preflightVerified', label: '1. Pre-Flight' },
                { key: 'rolesProvisioned', label: '2. Roles' },
                { key: 'roleHierarchyPositioned', label: '3. Hierarchy' },
                { key: 'categoriesProvisioned', label: '4. Categories' },
                { key: 'channelsProvisioned', label: '5. Channels' },
                { key: 'overwritesConfigured', label: '6. Overwrites' },
                { key: 'guildConfigured', label: '7. Guild Config' },
                { key: 'postDeployVerified', label: '8. Verified' },
              ].map(stage => {
                const done = Boolean(
                  activeJob.checkpoints[stage.key as keyof typeof activeJob.checkpoints]
                );
                return (
                  <div
                    key={stage.key}
                    className={`p-2 rounded-lg border text-center font-semibold flex items-center justify-center gap-1 ${
                      done
                        ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
                        : 'bg-[#080808] border-[#252525] text-[#71717A]'
                    }`}
                  >
                    {done && <CheckCircle2 className="w-3 h-3 shrink-0" />}
                    <span className="truncate">{stage.label}</span>
                  </div>
                );
              })}
            </div>
          )}

          {activeJob && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#9CA3AF] truncate max-w-md">{activeJob.currentStep}</span>
                <span className="font-mono font-bold text-white">{activeJob.progress}%</span>
              </div>
              <div className="w-full bg-[#080808] h-2 rounded-full overflow-hidden border border-[#252525]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    activeJob.status === 'failed'
                      ? 'bg-rose-500'
                      : activeJob.status === 'completed'
                      ? 'bg-emerald-500'
                      : 'bg-[#7547FF]'
                  }`}
                  style={{ width: `${activeJob.progress}%` }}
                />
              </div>
            </div>
          )}

          <div
            ref={terminalRef}
            className="bg-[#080808] border border-[#252525] rounded-lg p-4 font-mono text-xs text-white h-80 overflow-y-auto space-y-1"
          >
            {activeJob?.logs && activeJob.logs.length > 0 ? (
              activeJob.logs.map(log => {
                let badgeColor = 'text-[#71717A]';
                if (log.level === 'success') badgeColor = 'text-emerald-400';
                if (log.level === 'warn') badgeColor = 'text-amber-400';
                if (log.level === 'error') badgeColor = 'text-rose-400 font-bold';
                if (log.level === 'info') badgeColor = 'text-[#906BFF]';

                return (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-[#71717A] text-[10px] shrink-0">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                    <span className={`text-[10px] uppercase font-bold shrink-0 ${badgeColor}`}>
                      [{log.level}]
                    </span>
                    <span className="text-[#E5E7EB]">{log.message}</span>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-[#71717A] text-xs">
                <Terminal className="w-8 h-8 mb-2 opacity-30" />
                <span>
                  Console ready. Deploy a blueprint or click "Clear Entire Server" to watch real-time Discord REST v10 operations.
                </span>
              </div>
            )}
          </div>

          {activeJob?.failedOperations && activeJob.failedOperations.length > 0 && (
            <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-900/60 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-300 flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 shrink-0" />
                  Skipped / Failed Operations ({activeJob.failedOperations.length})
                </span>
                {blueprint && activeJob.blueprintId !== 'server_clear_operation' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isDeploying}
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={handleConfirmDeploy}
                  >
                    Retry Failed Operations
                  </Button>
                )}
              </div>
              <div className="max-h-32 overflow-y-auto space-y-1 font-mono text-[11px]">
                {activeJob.failedOperations.map((op, i) => (
                  <div key={i} className="text-rose-200">
                    [{op.step.toUpperCase()}] {op.resourceName}: {op.error}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeJob && blueprint && activeJob.blueprintId !== 'server_clear_operation' && (
            <div className="grid grid-cols-3 gap-3 pt-2 text-center text-xs">
              <div className="p-3 rounded-lg bg-[#080808] border border-[#252525]">
                <span className="text-[10px] text-[#71717A] uppercase font-semibold block">
                  Roles Provisioned
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {activeJob.createdRoles.length} / {blueprint.roles.length}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#080808] border border-[#252525]">
                <span className="text-[10px] text-[#71717A] uppercase font-semibold block">
                  Categories Provisioned
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {activeJob.createdCategories.length} / {blueprint.categories.length}
                </span>
              </div>
              <div className="p-3 rounded-lg bg-[#080808] border border-[#252525]">
                <span className="text-[10px] text-[#71717A] uppercase font-semibold block">
                  Channels Provisioned
                </span>
                <span className="text-base font-bold text-white font-mono">
                  {activeJob.createdChannels.length} / {blueprint.channels.length}
                </span>
              </div>
            </div>
          )}

          {activeJob && (
            <div className="flex items-center justify-between pt-2">
              {activeJob.status === 'in_progress' ? (
                <Button variant="danger" size="sm" onClick={handleCancelDeployment}>
                  Abort Operation
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Download className="w-3.5 h-3.5" />}
                  onClick={handleDownloadReport}
                >
                  Download JSON Operation Report
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      {confirmModalOpen && blueprint && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#252525] rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Confirm Live Discord Deployment</h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Target server: <strong className="text-white">{selectedGuild?.name}</strong> (
              <span className="font-mono">{selectedGuild?.id}</span>). The engine will verify bot permissions, skip existing matching roles/channels, and sequentially create{' '}
              <strong className="text-white">
                {deploymentPlan ? deploymentPlan.rolesToCreate : blueprint.roles.length} roles
              </strong>
              ,{' '}
              <strong className="text-white">
                {deploymentPlan ? deploymentPlan.categoriesToCreate : blueprint.categories.length}{' '}
                categories
              </strong>
              , and{' '}
              <strong className="text-white">
                {deploymentPlan ? deploymentPlan.channelsToCreate : blueprint.channels.length}{' '}
                channels
              </strong>
              .
            </p>
            {deploymentPlan && !deploymentPlan.botReadiness.ready && (
              <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/50 text-amber-300 text-xs">
                Pre-flight check warning:{' '}
                {deploymentPlan.botReadiness.error || 'Bot readiness not yet verified.'}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setConfirmModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleConfirmDeploy}>
                Confirm & Deploy Now
              </Button>
            </div>
          </div>
        </div>
      )}

      {clearModalOpen && selectedGuild && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-rose-900/60 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-white">
                Clear Entire Discord Server
              </h3>
            </div>

            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              You are about to wipe <strong className="text-white">{selectedGuild.name}</strong> (
              <span className="font-mono">{selectedGuild.id}</span>). This action uses the live Discord REST v10 API and cannot be undone.
            </p>

            <div className="p-3.5 rounded-lg bg-[#080808] border border-[#252525] space-y-3 text-xs">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearChannels}
                  onChange={e => setClearChannels(e.target.checked)}
                  className="mt-0.5 accent-rose-500"
                />
                <div>
                  <span className="font-semibold text-white block">
                    Delete All Channels & Categories
                  </span>
                  <span className="text-[11px] text-[#9CA3AF]">
                    Removes all text, voice, forum, announcement, stage channels, and categories.
                  </span>
                </div>
              </label>

              {clearChannels && (
                <label className="flex items-start gap-2.5 pl-6 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={keepGeneralChannel}
                    onChange={e => setKeepGeneralChannel(e.target.checked)}
                    className="mt-0.5 accent-[#7547FF]"
                  />
                  <div>
                    <span className="font-semibold text-white block">
                      Create a fresh #general text channel after clearing
                    </span>
                    <span className="text-[11px] text-[#9CA3AF]">
                      Recommended so the server remains viewable in Discord after all channels are wiped.
                    </span>
                  </div>
                </label>
              )}

              <label className="flex items-start gap-2.5 pt-2 border-t border-[#1F1F1F] cursor-pointer">
                <input
                  type="checkbox"
                  checked={clearRoles}
                  onChange={e => setClearRoles(e.target.checked)}
                  className="mt-0.5 accent-rose-500"
                />
                <div>
                  <span className="font-semibold text-white block">
                    Delete All Custom Roles
                  </span>
                  <span className="text-[11px] text-[#9CA3AF]">
                    Deletes all custom roles below the bot's highest role position (preserves @everyone and managed bot roles).
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setClearModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={!clearChannels && !clearRoles}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmClearServer}
              >
                Wipe Server Now
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


