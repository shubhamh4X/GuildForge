import fs from 'fs';
import path from 'path';
import { ServerBlueprint, DeploymentJob, ConnectedGuild } from '../types/discord.ts';

export interface PlatformSettings {
  discordBotToken?: string;
  discordClientId: string;
  activeBlueprintId: string;
  selectedGuildId?: string;
  aiGenerationsCount: number;
  aiAnalysesCount: number;
}

interface PersistedDatabase {
  blueprints: Record<string, ServerBlueprint>;
  deployments: Record<string, DeploymentJob>;
  backups: Record<
    string,
    { id: string; blueprintId: string; name: string; timestamp: string; data: ServerBlueprint }
  >;
  auditLogs: Array<{ id: string; timestamp: string; action: string; user: string; details: string }>;
  guilds: ConnectedGuild[];
  settings: PlatformSettings;
}

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'guildforge-db.json');

class StorageService {
  private blueprints: Map<string, ServerBlueprint> = new Map();
  private deployments: Map<string, DeploymentJob> = new Map();
  private backups: Map<
    string,
    { id: string; blueprintId: string; name: string; timestamp: string; data: ServerBlueprint }
  > = new Map();
  private auditLogs: Array<{
    id: string;
    timestamp: string;
    action: string;
    user: string;
    details: string;
  }> = [];
  private guilds: ConnectedGuild[] = [];
  private settings: PlatformSettings = {
    discordClientId: process.env.DISCORD_CLIENT_ID || '',
    activeBlueprintId: '',
    aiGenerationsCount: 0,
    aiAnalysesCount: 0,
  };

  constructor() {
    this.loadFromDisk();
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed: PersistedDatabase = JSON.parse(raw);

        if (parsed.blueprints) {
          Object.entries(parsed.blueprints).forEach(([id, bp]) => {
            if (id !== 'valorant-esports') {
              this.blueprints.set(id, bp);
            }
          });
        }
        if (parsed.deployments) {
          Object.entries(parsed.deployments).forEach(([id, dep]) => this.deployments.set(id, dep));
        }
        if (parsed.backups) {
          Object.entries(parsed.backups).forEach(([id, bk]) => this.backups.set(id, bk));
        }
        if (Array.isArray(parsed.auditLogs)) {
          this.auditLogs = parsed.auditLogs;
        }
        if (Array.isArray(parsed.guilds)) {
          this.guilds = parsed.guilds;
        }
        if (parsed.settings) {
          this.settings = { ...this.settings, ...parsed.settings };
          if (this.settings.activeBlueprintId === 'valorant-esports') {
            this.settings.activeBlueprintId = '';
          }
        }
      }
    } catch (error) {
      console.error('Failed to load database from disk, initializing fresh state:', error);
    }

    this.persistToDisk();
  }

  private persistToDisk() {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      const data: PersistedDatabase = {
        blueprints: Object.fromEntries(this.blueprints.entries()),
        deployments: Object.fromEntries(this.deployments.entries()),
        backups: Object.fromEntries(this.backups.entries()),
        auditLogs: this.auditLogs.slice(-250),
        guilds: this.guilds,
        settings: this.settings,
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to persist database to disk:', error);
    }
  }

  getSettings(): PlatformSettings {
    return {
      ...this.settings,
      discordClientId: this.settings.discordClientId || process.env.DISCORD_CLIENT_ID || '',
    };
  }

  getEffectiveBotToken(): string | undefined {
    const token = this.settings.discordBotToken || process.env.DISCORD_BOT_TOKEN;
    return token && token.trim().length > 10 ? token.trim() : undefined;
  }

  updateSettings(partial: Partial<PlatformSettings>): PlatformSettings {
    this.settings = { ...this.settings, ...partial };
    this.persistToDisk();
    return this.getSettings();
  }

  incrementAiStats(type: 'analysis' | 'generation') {
    if (type === 'analysis') {
      this.settings.aiAnalysesCount = (this.settings.aiAnalysesCount || 0) + 1;
    } else {
      this.settings.aiGenerationsCount = (this.settings.aiGenerationsCount || 0) + 1;
    }
    this.persistToDisk();
  }

  getGuilds(): ConnectedGuild[] {
    return this.guilds;
  }

  setGuilds(guilds: ConnectedGuild[]) {
    this.guilds = guilds;
    this.persistToDisk();
  }

  upsertGuild(guild: ConnectedGuild): ConnectedGuild {
    const idx = this.guilds.findIndex(g => g.id === guild.id);
    if (idx >= 0) {
      this.guilds[idx] = { ...this.guilds[idx], ...guild };
    } else {
      this.guilds.push(guild);
    }
    this.persistToDisk();
    return guild;
  }

  removeGuild(guildId: string): boolean {
    const prevLen = this.guilds.length;
    this.guilds = this.guilds.filter(g => g.id !== guildId);
    if (this.guilds.length !== prevLen) {
      this.persistToDisk();
      return true;
    }
    return false;
  }

  getAllBlueprints(): ServerBlueprint[] {
    return Array.from(this.blueprints.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  getBlueprint(id: string): ServerBlueprint | undefined {
    return this.blueprints.get(id);
  }

  getActiveBlueprint(): ServerBlueprint | null {
    if (this.settings.activeBlueprintId) {
      const active = this.blueprints.get(this.settings.activeBlueprintId);
      if (active) return active;
    }
    const first = Array.from(this.blueprints.values())[0];
    if (first) {
      this.settings.activeBlueprintId = first.id;
      this.persistToDisk();
      return first;
    }
    return null;
  }

  saveBlueprint(blueprint: ServerBlueprint, setAsActive = true): ServerBlueprint {
    blueprint.updatedAt = new Date().toISOString();
    if (!blueprint.createdAt) {
      blueprint.createdAt = new Date().toISOString();
    }
    blueprint.version = (blueprint.version || 0) + 1;
    this.blueprints.set(blueprint.id, blueprint);
    if (setAsActive) {
      this.settings.activeBlueprintId = blueprint.id;
    }
    this.logAction(
      'BLUEPRINT_SAVED',
      'GuildForge',
      `Saved blueprint "${blueprint.name}" v${blueprint.version} (${blueprint.roles.length} roles, ${blueprint.channels.length} channels)`
    );
    this.persistToDisk();
    return blueprint;
  }

  deleteBlueprint(id: string): boolean {
    const deleted = this.blueprints.delete(id);
    if (deleted) {
      this.logAction('BLUEPRINT_DELETED', 'GuildForge', `Deleted blueprint id: ${id}`);
      if (this.settings.activeBlueprintId === id) {
        const remaining = this.getAllBlueprints();
        this.settings.activeBlueprintId = remaining[0]?.id || '';
      }
      this.persistToDisk();
    }
    return deleted;
  }

  getDeployments(): DeploymentJob[] {
    return Array.from(this.deployments.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  getDeployment(id: string): DeploymentJob | undefined {
    return this.deployments.get(id);
  }

  saveDeployment(job: DeploymentJob): DeploymentJob {
    this.deployments.set(job.id, job);
    this.persistToDisk();
    return job;
  }

  getBackups(blueprintId?: string) {
    const all = Array.from(this.backups.values()).sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (blueprintId) {
      return all.filter(b => b.blueprintId === blueprintId);
    }
    return all;
  }

  createBackup(blueprint: ServerBlueprint, name: string) {
    const id = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const backup = {
      id,
      blueprintId: blueprint.id,
      name,
      timestamp: new Date().toISOString(),
      data: JSON.parse(JSON.stringify(blueprint)),
    };
    this.backups.set(id, backup);
    this.logAction(
      'BACKUP_CREATED',
      'GuildForge',
      `Created snapshot "${name}" for blueprint "${blueprint.name}"`
    );
    this.persistToDisk();
    return backup;
  }

  deleteBackup(id: string): boolean {
    const deleted = this.backups.delete(id);
    if (deleted) {
      this.logAction('BACKUP_DELETED', 'GuildForge', `Deleted snapshot id: ${id}`);
      this.persistToDisk();
    }
    return deleted;
  }

  getBackup(id: string) {
    return this.backups.get(id);
  }

  getAuditLogs() {
    return [...this.auditLogs].reverse();
  }

  logAction(action: string, user: string, details: string) {
    this.auditLogs.push({
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      user,
      details,
    });
    this.persistToDisk();
  }

  getAdminMetrics() {
    const totalBlueprints = this.blueprints.size;
    const totalBackups = this.backups.size;
    const deployments = Array.from(this.deployments.values());
    const totalDeployments = deployments.length;
    const successfulDeployments = deployments.filter(d => d.status === 'completed').length;
    const failedDeployments = deployments.filter(d => d.status === 'failed').length;
    const connectedGuildsCount = this.guilds.length;
    const verifiedBotGuildsCount = this.guilds.filter(g => g.botPresent).length;

    const successRate =
      totalDeployments > 0
        ? `${((successfulDeployments / totalDeployments) * 100).toFixed(1)}%`
        : 'N/A (0 runs)';

    const geminiConfigured = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY'
    );
    const botConfigured = Boolean(this.getEffectiveBotToken());

    const activeBp = this.getActiveBlueprint();
    const activeRoles = activeBp?.roles || [];
    const activeCategories = activeBp?.categories || [];
    const activeChannels = activeBp?.channels || [];

    const textChannels = activeChannels.filter(c => c.type === 'GUILD_TEXT').length;
    const voiceChannels = activeChannels.filter(
      c => c.type === 'GUILD_VOICE' || c.type === 'GUILD_STAGE_VOICE'
    ).length;
    const forumChannels = activeChannels.filter(c => c.type === 'GUILD_FORUM').length;
    const announcementChannels = activeChannels.filter(c => c.type === 'GUILD_ANNOUNCEMENT').length;
    const privateChannels = activeChannels.filter(c => {
      const parent = activeCategories.find(cat => cat.id === c.categoryId);
      return Boolean(c.isPrivate || parent?.isPrivate);
    }).length;
    const publicChannels = activeChannels.length - privateChannels;
    const totalOverwrites =
      activeCategories.reduce((acc, c) => acc + (c.permissionOverwrites?.length || 0), 0) +
      activeChannels.reduce((acc, c) => acc + (c.permissionOverwrites?.length || 0), 0);
    const automationModulesCount =
      activeBp?.automationModules?.filter(m => m.enabled).length || 0;

    return {
      totalBlueprints,
      totalBackups,
      savedSnapshots: totalBackups,
      connectedGuildsCount,
      verifiedBotGuildsCount,
      totalDeployments,
      successfulDeployments,
      failedDeployments,
      successRate,
      aiAnalysesCount: this.settings.aiAnalysesCount || 0,
      aiGenerationsCount: this.settings.aiGenerationsCount || 0,
      activeBlueprintStats: {
        name: activeBp?.name || 'None',
        totalRoles: activeRoles.length,
        totalCategories: activeCategories.length,
        totalChannels: activeChannels.length,
        textChannels,
        voiceChannels,
        forumChannels,
        announcementChannels,
        privateChannels,
        publicChannels,
        totalOverwrites,
        automationModulesCount,
      },
      systemHealth: {
        geminiApi: geminiConfigured ? 'CONNECTED' : 'MISSING_API_KEY',
        discordGateway: botConfigured ? 'BOT_TOKEN_CONFIGURED' : 'AWAITING_BOT_TOKEN',
        storageService: fs.existsSync(DB_FILE) ? 'PERSISTENT_DISK_OK' : 'MEMORY_ONLY',
        rateLimiterPool: 'ACTIVE (500ms Bucket)',
      },
    };
  }
}

export const storage = new StorageService();

