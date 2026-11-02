import {
  ServerBlueprint,
  QualityAuditReport,
  DeploymentJob,
  DeploymentPlan,
  ConnectedGuild,
  AdvancedArchitectureConfig,
} from '../types/discord.ts';
import type { RequirementAnalysis } from './ai.ts';

export type { RequirementAnalysis };

const API_BASE = '/api';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function requestJson<T = any>(
  path: string,
  options?: RequestInit,
  fallbackError = 'API request failed.',
  maxRetries = 2
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, options);
      const rawText = await res.text();
      const trimmed = rawText.trim();

      if (trimmed.toLowerCase().startsWith('<!doctype') || trimmed.toLowerCase().startsWith('<html')) {
        if (attempt < maxRetries) {
          await sleep(1200 * (attempt + 1));
          continue;
        }
        throw new Error(
          'The server took too long to respond or was warming up. Please click Retry.'
        );
      }

      let data: any = {};
      if (trimmed.length > 0) {
        try {
          data = JSON.parse(trimmed);
        } catch {
          if (attempt < maxRetries) {
            await sleep(1000 * (attempt + 1));
            continue;
          }
          throw new Error(`Invalid response format from server (HTTP ${res.status}).`);
        }
      }

      if (!res.ok) {
        throw new Error(data?.error || `${fallbackError} (HTTP ${res.status})`);
      }

      return data as T;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));

      const isWarmupOrNetwork =
        lastError.message.includes('Failed to fetch') ||
        lastError.message.includes('NetworkError') ||
        lastError.message.includes('warming up');
      if (isWarmupOrNetwork && attempt < maxRetries) {
        await sleep(1200 * (attempt + 1));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error(fallbackError);
}

async function pollAiJob<T>(
  jobId: string,
  fallbackError: string,
  onStageProgress?: (stageNumber?: number, stageLabel?: string) => void
): Promise<T> {
  const maxPollDurationMs = 90000;
  const start = Date.now();

  while (Date.now() - start < maxPollDurationMs) {
    await sleep(800);
    const job = await requestJson<{
      id: string;
      status: 'running' | 'completed' | 'failed';
      stageNumber?: number;
      stageLabel?: string;
      result?: T;
      error?: string;
    }>(`/ai/jobs/${encodeURIComponent(jobId)}`, undefined, fallbackError, 3);

    if (onStageProgress && (job.stageNumber || job.stageLabel)) {
      onStageProgress(job.stageNumber, job.stageLabel);
    }

    if (job.status === 'completed' && job.result) {
      return job.result;
    }
    if (job.status === 'failed') {
      throw new Error(job.error || fallbackError);
    }
  }

  throw new Error('AI operation timed out after 90 seconds. Please try again.');
}

export const apiClient = {

  async getHealth(): Promise<{
    status: string;
    geminiConfigured: boolean;
    discordBotConfigured: boolean;
    discordClientId: string;
  }> {
    return requestJson('/health', undefined, 'Failed to check platform health.');
  },

  async getSettings(): Promise<{
    discordClientId: string;
    activeBlueprintId: string;
    selectedGuildId?: string;
    botTokenConfigured: boolean;
    botTokenSource: string;
    geminiConfigured: boolean;
  }> {
    return requestJson('/settings', undefined, 'Failed to load settings.');
  },

  async updateSettings(payload: {
    discordClientId?: string;
    discordBotToken?: string;
    activeBlueprintId?: string;
    selectedGuildId?: string;
  }) {
    return requestJson(
      '/settings',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Failed to update settings.'
    );
  },

  async getCurrentUser() {
    return requestJson('/auth/me', undefined, 'Failed to fetch current bot identity.');
  },

  async login(username?: string) {
    return requestJson(
      '/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      },
      'Login failed.'
    );
  },

  async logout() {
    return requestJson('/auth/logout', { method: 'POST' }, 'Logout failed.');
  },

  async getBotInviteUrl(clientId?: string) {
    const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : '';
    return requestJson(`/auth/discord/invite-url${query}`, undefined, 'Failed to generate invite URL.');
  },

  async getGuilds(): Promise<{
    guilds: ConnectedGuild[];
    botTokenConfigured: boolean;
    guildCreationEligibility?: {
      authorized: boolean;
      currentGuildCount: number;
      maxAllowedGuildsForBotCreate: number;
      reason: string;
    };
  }> {
    return requestJson('/guilds', undefined, 'Failed to fetch Discord servers.');
  },

  async addGuild(guildId: string, name?: string): Promise<{ guild: ConnectedGuild; warning?: string; readiness?: any }> {
    return requestJson(
      '/guilds',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guildId, name }),
      },
      'Failed to add Discord server.'
    );
  },

  async createGuildWithBot(
    name: string,
    botToken?: string
  ): Promise<{ guild: ConnectedGuild; inviteUrl?: string; guilds: ConnectedGuild[] }> {
    return requestJson(
      '/guilds/create',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, botToken }),
      },
      'Bot failed to create Discord server.'
    );
  },

  async createGuildInvite(
    guildId: string,
    botToken?: string
  ): Promise<{ inviteUrl: string; guild?: ConnectedGuild; guilds?: ConnectedGuild[] }> {
    return requestJson(
      `/guilds/${guildId}/invite`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken }),
      },
      'Failed to create server invite link.'
    );
  },

  async removeGuild(guildId: string) {
    return requestJson(`/guilds/${guildId}`, { method: 'DELETE' }, 'Failed to remove server.');
  },

  async clearGuildServer(
    guildId: string,
    options?: {
      guildName?: string;
      deleteChannels?: boolean;
      deleteRoles?: boolean;
      keepGeneralChannel?: boolean;
      botToken?: string;
    }
  ): Promise<{ job: DeploymentJob }> {
    return requestJson(
      `/guilds/${guildId}/clear`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options || {}),
      },
      'Failed to clear Discord server.'
    );
  },

  async verifyGuildBot(guildId: string, botToken?: string) {
    return requestJson(
      `/guilds/${guildId}/verify-bot`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken }),
      },
      'Bot verification failed for this guild.'
    );
  },

  async verifyBotToken(token?: string, saveToken = true) {
    return requestJson(
      '/bot/verify-token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, saveToken }),
      },
      'Bot token verification failed.'
    );
  },

  async analyzeRequirements(payload: {
    prompt: string;
    serverType?: string;
    expectedScale?: number;
    securityLevel?: 'standard' | 'high' | 'maximum';
    departments?: string[];
    advancedConfig?: AdvancedArchitectureConfig;
  }): Promise<{ analysis: RequirementAnalysis }> {
    const startRes = await requestJson<{ jobId: string }>(
      '/ai/jobs/analyze',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'AI requirement analysis failed.'
    );
    return pollAiJob<{ analysis: RequirementAnalysis }>(
      startRes.jobId,
      'AI requirement analysis failed.'
    );
  },

  async generateArchitecture(
    payload: {
      prompt: string;
      serverType?: string;
      expectedScale?: number;
      securityLevel?: 'standard' | 'high' | 'maximum';
      departments?: string[];
      analysis?: RequirementAnalysis;
      advancedConfig?: AdvancedArchitectureConfig;
    },
    onStageProgress?: (stageNumber?: number, stageLabel?: string) => void
  ): Promise<{ blueprint: ServerBlueprint; report: QualityAuditReport }> {
    const startRes = await requestJson<{ jobId: string }>(
      '/ai/jobs/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'AI architecture generation failed.'
    );
    return pollAiJob<{ blueprint: ServerBlueprint; report: QualityAuditReport }>(
      startRes.jobId,
      'AI architecture generation failed.',
      onStageProgress
    );
  },

  async optimizeArchitecture(payload: {
    blueprint: ServerBlueprint;
    instructions?: string;
  }): Promise<{ blueprint: ServerBlueprint; report: QualityAuditReport }> {
    const startRes = await requestJson<{ jobId: string }>(
      '/ai/jobs/optimize',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'AI architecture optimization failed.'
    );
    return pollAiJob<{ blueprint: ServerBlueprint; report: QualityAuditReport }>(
      startRes.jobId,
      'AI architecture optimization failed.'
    );
  },

  async autoFixArchitecture(
    blueprint: ServerBlueprint,
    targetCodeOrId?: string
  ): Promise<{ blueprint: ServerBlueprint; report: QualityAuditReport }> {
    return requestJson(
      '/ai/autofix',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprint, targetCodeOrId }),
      },
      'Auto-fix failed.'
    );
  },

  async validateArchitecture(blueprint: ServerBlueprint): Promise<{ report: QualityAuditReport }> {
    return requestJson(
      '/ai/validate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprint }),
      },
      'Validation failed.'
    );
  },

  async getBlueprints(): Promise<{
    blueprints: ServerBlueprint[];
    activeBlueprintId: string;
    activeBlueprint: ServerBlueprint | null;
  }> {
    return requestJson('/blueprints', undefined, 'Failed to fetch blueprints.');
  },

  async getActiveBlueprint(): Promise<{ blueprint: ServerBlueprint | null }> {
    return requestJson('/blueprints/active', undefined, 'Failed to fetch active blueprint.');
  },

  async saveBlueprint(
    blueprint: ServerBlueprint,
    setAsActive = true
  ): Promise<{ blueprint: ServerBlueprint; report: QualityAuditReport }> {
    return requestJson(
      '/blueprints',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprint, setAsActive }),
      },
      'Failed to save blueprint.'
    );
  },

  async deleteBlueprint(id: string): Promise<{ success: boolean; activeBlueprint: ServerBlueprint }> {
    return requestJson(`/blueprints/${id}`, { method: 'DELETE' }, 'Failed to delete blueprint.');
  },

  async getDeployments(): Promise<{ deployments: DeploymentJob[] }> {
    return requestJson('/deployments', undefined, 'Failed to load deployments.');
  },

  async generateDeploymentPlan(payload: {
    guildId: string;
    blueprint: ServerBlueprint;
    botToken?: string;
  }): Promise<{ plan: DeploymentPlan }> {
    return requestJson(
      '/deployments/plan',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Failed to generate deployment plan.'
    );
  },

  async startDeployment(payload: {
    guildId: string;
    guildName: string;
    blueprint: ServerBlueprint;
    botToken?: string;
  }): Promise<{ job: DeploymentJob }> {
    return requestJson(
      '/deployments',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      'Deployment failed to initialize.'
    );
  },

  async cancelDeployment(jobId: string) {
    return requestJson(`/deployments/${jobId}/cancel`, { method: 'POST' }, 'Failed to cancel deployment.');
  },

  async getBackups(blueprintId?: string) {
    const q = blueprintId ? `?blueprintId=${encodeURIComponent(blueprintId)}` : '';
    return requestJson(`/backups${q}`, undefined, 'Failed to load backups.');
  },

  async createBackup(blueprint: ServerBlueprint, name?: string) {
    return requestJson(
      '/backups',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprint, name }),
      },
      'Failed to create backup.'
    );
  },

  async deleteBackup(id: string) {
    return requestJson(`/backups/${id}`, { method: 'DELETE' }, 'Failed to delete backup.');
  },

  async importBackup(blueprintData: any): Promise<{ blueprint: ServerBlueprint; report: QualityAuditReport }> {
    return requestJson(
      '/backups/import',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blueprintData }),
      },
      'Import failed.'
    );
  },

  async getAdminMetrics() {
    return requestJson('/admin/metrics', undefined, 'Failed to load admin metrics.');
  },

  async getAdminLogs() {
    return requestJson('/admin/logs', undefined, 'Failed to load audit logs.');
  },
};

