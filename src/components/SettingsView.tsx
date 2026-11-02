import React, { useState, useEffect } from 'react';
import {
  Key,
  Cpu,
  ExternalLink,
  Server,
  Trash2,
  Plus,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { apiClient } from '../services/apiClient.ts';
import { ConnectedGuild } from '../types/discord.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';

interface SettingsViewProps {
  guilds: ConnectedGuild[];
  onGuildsUpdated: (guilds: ConnectedGuild[], selectedId?: string) => void;
  onOpenInviteModal: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  guilds,
  onGuildsUpdated,
  onOpenInviteModal,
}) => {
  const [botToken, setBotToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [hasStoredToken, setHasStoredToken] = useState(false);
  const [maskedToken, setMaskedToken] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [tokenResult, setTokenResult] = useState<{
    valid: boolean;
    botName?: string;
    guildCount?: number;
    error?: string;
  } | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  const [newGuildId, setNewGuildId] = useState('');
  const [newGuildName, setNewGuildName] = useState('');
  const [isAddingGuild, setIsAddingGuild] = useState(false);
  const [guildError, setGuildError] = useState<string | null>(null);

  const [guildToClear, setGuildToClear] = useState<ConnectedGuild | null>(null);
  const [clearChannels, setClearChannels] = useState(true);
  const [clearRoles, setClearRoles] = useState(true);
  const [keepGeneralChannel, setKeepGeneralChannel] = useState(true);
  const [isClearingGuild, setIsClearingGuild] = useState(false);

  useEffect(() => {
    apiClient
      .getSettings()
      .then(res => {
        setClientId(res.discordClientId || '');
        setHasStoredToken(Boolean(res.botTokenConfigured));
        setMaskedToken(res.botTokenSource || '');
      })
      .catch(err => console.warn('Could not load settings:', err));
  }, []);

  const handleTestAndSaveToken = async () => {
    if (!botToken.trim()) return;
    setIsVerifying(true);
    setTokenResult(null);
    try {
      const res = await apiClient.verifyBotToken(botToken.trim());
      if (res.valid) {
        setHasStoredToken(true);
        if (res.bot?.id && !clientId) {
          setClientId(res.bot.id);
          await apiClient.updateSettings({ discordClientId: res.bot.id });
        }
        setTokenResult({
          valid: true,
          botName: `${res.bot.username}`,
          guildCount: res.guilds?.length || 0,
        });
        if (res.guilds && res.guilds.length > 0) {
          onGuildsUpdated(res.guilds, res.guilds[0].id);
        }
      } else {
        setTokenResult({ valid: false, error: res.error || 'Token rejected by Discord API' });
      }
    } catch (err: any) {
      setTokenResult({ valid: false, error: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveClientId = async () => {
    setIsSavingSettings(true);
    setSaveMessage(null);
    try {
      await apiClient.updateSettings({
        discordClientId: clientId.trim(),
        ...(botToken.trim() ? { discordBotToken: botToken.trim() } : {}),
      });
      const updated = await apiClient.getSettings();
      setHasStoredToken(Boolean(updated.botTokenConfigured));
      setMaskedToken(updated.botTokenSource || '');
      setSaveMessage('Settings saved to persistent storage.');
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (err: any) {
      setSaveMessage(`Error saving settings: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAddGuild = async () => {
    if (!newGuildId.trim()) return;
    setIsAddingGuild(true);
    setGuildError(null);
    try {
      const res = await apiClient.addGuild(newGuildId.trim(), newGuildName.trim() || undefined);
      const gList = await apiClient.getGuilds();
      onGuildsUpdated(gList.guilds, res.guild.id);
      setNewGuildId('');
      setNewGuildName('');
    } catch (err: any) {
      setGuildError(err.message || 'Failed to add guild.');
    } finally {
      setIsAddingGuild(false);
    }
  };

  const handleRemoveGuild = async (id: string) => {
    try {
      const res = await apiClient.removeGuild(id);
      onGuildsUpdated(res.guilds || []);
    } catch (err: any) {
      setGuildError(err.message);
    }
  };

  const handleConfirmClearGuild = async () => {
    if (!guildToClear) return;
    setIsClearingGuild(true);
    setGuildError(null);
    try {
      await apiClient.clearGuildServer(guildToClear.id, {
        guildName: guildToClear.name,
        deleteChannels: clearChannels,
        deleteRoles: clearRoles,
        keepGeneralChannel: clearChannels ? keepGeneralChannel : false,
        botToken: botToken.trim() || undefined,
      });
      setSaveMessage(
        `Started clearing "${guildToClear.name}". Open Deployment Control Center to watch live deletion telemetry.`
      );
      setGuildToClear(null);
    } catch (err: any) {
      setGuildError(err.message || 'Failed to clear server.');
    } finally {
      setIsClearingGuild(false);
    }
  };

  const handleSyncGuilds = async () => {
    try {
      const res = await apiClient.getGuilds();
      onGuildsUpdated(res.guilds);
    } catch (err: any) {
      setGuildError(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <div className="pb-4 border-b border-[#252525]">
        <h1 className="text-2xl font-bold tracking-tight text-white">Settings & Environment</h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          Configure persistent Discord Bot credentials, OAuth2 application IDs, and connected target servers.
        </p>
      </div>

      {saveMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{saveMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        <div className="lg:col-span-7 space-y-6">

          <div className="bg-[#111111] border border-[#252525] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-[#906BFF]" />
                Discord Bot Credentials
              </h3>
              {hasStoredToken && (
                <Badge variant="success" size="sm">
                  Saved {maskedToken ? `(${maskedToken})` : ''}
                </Badge>
              )}
            </div>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Provide your Bot Token from the{' '}
              <a
                href="https://discord.com/developers/applications"
                target="_blank"
                rel="noreferrer"
                className="text-[#906BFF] hover:underline"
              >
                Discord Developer Portal
              </a>
              . When verified, GuildForge persists the token on the server and automatically discovers all Discord servers where your bot is invited.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-medium text-[#9CA3AF] block">Bot Token</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  placeholder={
                    hasStoredToken
                      ? 'Token saved on server — paste new token to update...'
                      : 'Paste your Discord Bot Token...'
                  }
                  value={botToken}
                  onChange={e => setBotToken(e.target.value)}
                  className="flex-1 bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#7547FF]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  loading={isVerifying}
                  onClick={handleTestAndSaveToken}
                >
                  Verify & Sync
                </Button>
              </div>

              {tokenResult && (
                <div
                  className={`text-xs p-2.5 rounded-lg ${
                    tokenResult.valid
                      ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/40'
                      : 'bg-rose-950/40 text-rose-400 border border-rose-800/40'
                  }`}
                >
                  {tokenResult.valid
                    ? `✓ Authenticated as ${tokenResult.botName} (${tokenResult.guildCount} servers synced)`
                    : `✗ ${tokenResult.error}`}
                </div>
              )}
            </div>

            <div className="pt-2 space-y-2">
              <label className="text-xs font-medium text-[#9CA3AF] block">
                Discord Application Client ID (for OAuth2 Invite Links)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. 123456789012345678"
                  value={clientId}
                  onChange={e => setClientId(e.target.value)}
                  className="flex-1 bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#7547FF]"
                />
                <Button
                  variant="primary"
                  size="sm"
                  loading={isSavingSettings}
                  onClick={handleSaveClientId}
                >
                  Save Settings
                </Button>
              </div>
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                icon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={onOpenInviteModal}
              >
                Generate Bot Invite Link
              </Button>
            </div>
          </div>

          <div className="bg-[#111111] border border-[#252525] rounded-xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-[#906BFF]" />
                Connected Discord Servers ({guilds.length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={handleSyncGuilds}
              >
                Refresh
              </Button>
            </div>

            {guildError && (
              <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs">
                {guildError}
              </div>
            )}

            <div className="space-y-2">
              {guilds.map(g => (
                <div
                  key={g.id}
                  className="p-3 rounded-lg bg-[#080808] border border-[#252525] flex items-center justify-between text-xs gap-3"
                >
                  <div>
                    <div className="font-semibold text-white flex items-center gap-2">
                      <span>{g.name}</span>
                      <Badge variant={g.botPresent ? 'success' : 'warning'} size="sm">
                        {g.botPresent ? 'Bot Verified' : 'Unverified'}
                      </Badge>
                    </div>
                    <div className="text-[11px] text-[#71717A] font-mono mt-0.5">
                      Guild ID: {g.id}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="danger"
                      size="sm"
                      icon={<Trash2 className="w-3 h-3" />}
                      onClick={() => setGuildToClear(g)}
                    >
                      Clear Server
                    </Button>
                    <button
                      onClick={() => handleRemoveGuild(g.id)}
                      className="p-1.5 text-[#71717A] hover:text-rose-400 transition-colors cursor-pointer"
                      title="Unlink server from list"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}

              {guilds.length === 0 && (
                <div className="p-4 rounded-lg bg-[#080808] border border-[#252525] text-xs text-[#71717A] text-center">
                  No servers registered. Verify your Bot Token above or add a Server Snowflake ID below.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#252525] space-y-2">
              <label className="text-xs font-medium text-[#9CA3AF] block">
                Have Bot Create a Brand-New Discord Server
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="New server name (e.g. My Community Hub)"
                  value={newGuildName}
                  onChange={e => setNewGuildName(e.target.value)}
                  className="flex-1 bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                />
                <Button
                  variant="primary"
                  size="sm"
                  loading={isAddingGuild}
                  icon={<Plus className="w-3.5 h-3.5 text-white" />}
                  onClick={async () => {
                    if (!newGuildName.trim()) return;
                    setIsAddingGuild(true);
                    setGuildError(null);
                    try {
                      const res = await apiClient.createGuildWithBot(newGuildName.trim(), botToken.trim() || undefined);
                      onGuildsUpdated(res.guilds, res.guild.id);
                      setNewGuildName('');
                      setSaveMessage(
                        `Bot created Discord server "${res.guild.name}"${res.inviteUrl ? ` — Invite: ${res.inviteUrl}` : ''}`
                      );
                    } catch (err: any) {
                      setGuildError(err.message || 'Bot could not create server.');
                    } finally {
                      setIsAddingGuild(false);
                    }
                  }}
                >
                  Create with Bot
                </Button>
              </div>
            </div>

            <div className="pt-3 border-t border-[#252525] space-y-2">
              <label className="text-xs font-medium text-[#9CA3AF] block">
                Or Register Existing Discord Server by Snowflake ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="17-20 digit Guild ID..."
                  value={newGuildId}
                  onChange={e => setNewGuildId(e.target.value)}
                  className="flex-1 bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#7547FF]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  loading={isAddingGuild}
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleAddGuild}
                >
                  Add by ID
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-6">
          <div className="bg-[#111111] border border-[#252525] rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#906BFF]" />
              AI Infrastructure Health
            </h3>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-[#080808] border border-[#252525] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Structured Blueprint Synthesis Engine</div>
                  <div className="text-[11px] text-[#71717A]">Structured JSON Schema Synthesis</div>
                </div>
                <Badge variant="success">Online</Badge>
              </div>

              <div className="p-3 rounded-lg bg-[#080808] border border-[#252525] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Discord REST API v10</div>
                  <div className="text-[11px] text-[#71717A]">Sequential Rate-Limit Safe Pacing</div>
                </div>
                <Badge variant={hasStoredToken ? 'success' : 'warning'}>
                  {hasStoredToken ? 'Token Ready' : 'Awaiting Token'}
                </Badge>
              </div>

              <div className="p-3 rounded-lg bg-[#080808] border border-[#252525] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white">Persistent JSON Vault</div>
                  <div className="text-[11px] text-[#71717A]">Disk-backed Blueprint & Snapshot Store</div>
                </div>
                <Badge variant="success">Active</Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {guildToClear && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-rose-900/60 rounded-xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-rose-400">
              <Trash2 className="w-5 h-5 shrink-0" />
              <h3 className="text-base font-bold text-white">
                Clear Entire Discord Server
              </h3>
            </div>

            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              You are about to wipe <strong className="text-white">{guildToClear.name}</strong> (
              <span className="font-mono">{guildToClear.id}</span>). This deletes all selected resources via the live Discord REST v10 API.
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
                      Recommended so the server remains viewable in Discord.
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
                    Deletes all custom roles below the bot's highest role position.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setGuildToClear(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={isClearingGuild}
                disabled={!clearChannels && !clearRoles}
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleConfirmClearGuild}
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


