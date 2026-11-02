import React, { useState, useEffect } from 'react';
import {
  Bot,
  ExternalLink,
  Copy,
  Check,
  X,
  Plus,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { apiClient } from '../services/apiClient.ts';
import { ConnectedGuild } from '../types/discord.ts';
import { Button } from './ui/Button.tsx';

interface BotInviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultServerName?: string;
  onGuildsUpdated?: (guilds: ConnectedGuild[], selectedId?: string) => void;
}

export const BotInviteModal: React.FC<BotInviteModalProps> = ({
  isOpen,
  onClose,
  defaultServerName,
  onGuildsUpdated,
}) => {
  const [mode, setMode] = useState<'create' | 'invite'>('create');
  const [serverName, setServerName] = useState(defaultServerName || 'New GuildForge Server');
  const [isCreating, setIsCreating] = useState(false);
  const [createdGuild, setCreatedGuild] = useState<ConnectedGuild | null>(null);
  const [createdInviteUrl, setCreatedInviteUrl] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  const [clientId, setClientId] = useState('');
  const [copied, setCopied] = useState(false);
  const [eligibilityReason, setEligibilityReason] = useState<string | null>(null);
  const [canCreateGuild, setCanCreateGuild] = useState<boolean>(true);

  useEffect(() => {
    if (defaultServerName) {
      setServerName(defaultServerName);
    }
  }, [defaultServerName]);

  useEffect(() => {
    if (isOpen) {
      setCreateError(null);
      apiClient
        .getSettings()
        .then(res => {
          if (res.discordClientId) {
            setClientId(res.discordClientId);
          }
        })
        .catch(() => {});

      apiClient
        .getGuilds()
        .then(res => {
          if (res.guildCreationEligibility) {
            setCanCreateGuild(res.guildCreationEligibility.authorized);
            setEligibilityReason(res.guildCreationEligibility.reason);
            if (!res.guildCreationEligibility.authorized) {
              setMode('invite');
            }
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmedClientId = clientId.trim();
  const isValidClientId = /^\d{17,20}$/.test(trimmedClientId);
  const inviteUrl = isValidClientId
    ? `https://discord.com/oauth2/authorize?client_id=${trimmedClientId}&permissions=8&scope=bot%20applications.commands`
    : '';

  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCreateServerWithBot = async () => {
    if (!serverName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    setCreatedGuild(null);
    setCreatedInviteUrl(null);

    try {
      const res = await apiClient.createGuildWithBot(serverName.trim());
      setCreatedGuild(res.guild);
      setCreatedInviteUrl(res.inviteUrl || res.guild.inviteUrl || null);
      if (onGuildsUpdated && res.guilds) {
        onGuildsUpdated(res.guilds, res.guild.id);
      }
    } catch (err: any) {
      setCreateError(err.message || 'Bot could not create the Discord server.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111111] border border-[#252525] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-[#252525]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7547FF]/15 text-[#906BFF] border border-[#7547FF]/30 flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Bot Server Creation & Invite</h3>
              <p className="text-[11px] text-[#9CA3AF]">
                Create a brand-new server with the bot or invite the bot to an existing server
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#71717A] hover:text-white p-1 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 p-1 rounded-lg bg-[#080808] border border-[#252525]">
          <button
            onClick={() => setMode('create')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              mode === 'create'
                ? 'bg-[#7547FF] text-white'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            1. Bot: Create New Server
          </button>
          <button
            onClick={() => setMode('invite')}
            className={`py-2 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
              mode === 'invite'
                ? 'bg-[#7547FF] text-white'
                : 'text-[#9CA3AF] hover:text-white'
            }`}
          >
            2. Invite to Existing Server
          </button>
        </div>

        {mode === 'create' ? (
          <div className="space-y-4">
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Your authenticated bot will create a brand-new Discord server via Discord REST API v10 (<code className="text-white">POST /guilds</code>) and generate a permanent <code className="text-white">discord.gg</code> invite link so you can join immediately.
            </p>

            {!canCreateGuild && eligibilityReason && (
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/50 text-amber-300 text-xs space-y-2">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{eligibilityReason}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMode('invite')}
                >
                  Switch to OAuth2 Server Invite
                </Button>
              </div>
            )}

            <div>
              <label className="text-[11px] font-medium text-[#9CA3AF] block mb-1.5">
                New Discord Server Name
              </label>
              <input
                type="text"
                value={serverName}
                onChange={e => setServerName(e.target.value)}
                disabled={!canCreateGuild}
                placeholder="e.g. Vanguard Protocol Official"
                className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF] disabled:opacity-50"
              />
            </div>

            {createError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{createError}</span>
              </div>
            )}

            {createdGuild && (
              <div className="p-4 rounded-lg bg-emerald-950/30 border border-emerald-800/50 space-y-3 text-xs">
                <div className="flex items-center gap-2 font-semibold text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    Created "{createdGuild.name}" (ID: {createdGuild.id})
                  </span>
                </div>

                {createdInviteUrl && (
                  <div className="space-y-2">
                    <span className="text-[11px] text-[#9CA3AF] block">
                      Click below to join your newly created Discord server:
                    </span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={createdInviteUrl}
                        className="flex-1 bg-[#080808] border border-emerald-800/40 rounded px-2.5 py-1.5 text-xs font-mono text-white"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        icon={copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        onClick={() => handleCopy(createdInviteUrl)}
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </Button>
                      <a
                        href={createdInviteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs inline-flex items-center gap-1.5 shrink-0"
                      >
                        <span>Join Server</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="ghost" size="md" onClick={onClose}>
                Close
              </Button>
              <Button
                variant="primary"
                size="md"
                loading={isCreating}
                disabled={isCreating || !serverName.trim() || !canCreateGuild}
                icon={<Plus className="w-4 h-4 text-white" />}
                onClick={handleCreateServerWithBot}
              >
                Create Server with Bot
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              Use the OAuth2 link below to invite your bot to an existing Discord server with Administrator permissions.
            </p>

            <div>
              <label className="text-[11px] font-medium text-[#9CA3AF] block mb-1">
                Discord Bot Application Client ID (17-20 digit Snowflake):
              </label>
              <input
                type="text"
                placeholder="e.g. 1566668807680958516"
                value={clientId}
                onChange={e => setClientId(e.target.value)}
                className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-[#7547FF]"
              />
              {!isValidClientId && trimmedClientId.length > 0 && (
                <p className="text-[11px] text-rose-400 mt-1">
                  Enter a valid 17-20 digit numeric Discord Application ID.
                </p>
              )}
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1"
                disabled={!isValidClientId}
                icon={copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                onClick={() => {
                  apiClient.updateSettings({ discordClientId: trimmedClientId }).catch(() => {});
                  handleCopy(inviteUrl);
                }}
              >
                {copied ? 'Copied Link' : 'Copy OAuth2 Link'}
              </Button>

              {isValidClientId ? (
                <a
                  href={inviteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => apiClient.updateSettings({ discordClientId: trimmedClientId }).catch(() => {})}
                  className="flex-1 inline-flex items-center justify-center font-medium rounded-lg text-sm px-3.5 py-2 gap-2 bg-[#7547FF] hover:bg-[#6537EF] text-white transition-all shadow-sm shadow-[#7547FF]/20"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Authorize in Discord</span>
                </a>
              ) : (
                <Button variant="primary" size="md" className="flex-1" disabled>
                  Enter Client ID First
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

