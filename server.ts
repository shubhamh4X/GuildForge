import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  analyzeCommunityRequirements,
  generateServerArchitecture,
  optimizeServerArchitecture,
} from './src/services/ai.ts';
import { validateServerArchitecture, autoFixBlueprintIssues } from './src/services/validator.ts';
import { storage } from './src/services/storage.ts';
import { deploymentEngine } from './src/services/deploymentEngine.ts';
import { DiscordApiService } from './src/services/discordApi.ts';
import { discordGateway } from './src/services/discordGateway.ts';
import { ServerBlueprint, ConnectedGuild } from './src/types/discord.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));

const getActorName = (): string => {
  const gw = discordGateway.getStatus();
  if (gw.botUser) {
    return `${gw.botUser.username}#${gw.botUser.discriminator}`;
  }
  return 'GuildForge';
};

app.get('/api/health', (_req: Request, res: Response) => {
  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY.trim().length > 10
  );
  const botToken = storage.getEffectiveBotToken();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured,
    discordBotConfigured: Boolean(botToken),
    discordClientId: storage.getSettings().discordClientId,
    gatewayStatus: discordGateway.getStatus(),
  });
});

app.get('/api/settings', (_req: Request, res: Response) => {
  const settings = storage.getSettings();
  const effectiveToken = storage.getEffectiveBotToken();
  const geminiConfigured = Boolean(
    process.env.GEMINI_API_KEY &&
      process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY' &&
      process.env.GEMINI_API_KEY.trim().length > 10
  );

  res.json({
    discordClientId: settings.discordClientId,
    activeBlueprintId: settings.activeBlueprintId,
    selectedGuildId: settings.selectedGuildId,
    botTokenConfigured: Boolean(effectiveToken),
    botTokenSource: settings.discordBotToken
      ? 'settings'
      : process.env.DISCORD_BOT_TOKEN
      ? 'environment'
      : 'none',
    geminiConfigured,
    gatewayStatus: discordGateway.getStatus(),
  });
});

app.post('/api/settings', (req: Request, res: Response) => {
  const { discordClientId, discordBotToken, activeBlueprintId, selectedGuildId } = req.body;
  const updates: any = {};
  if (typeof discordClientId === 'string' && discordClientId.trim()) {
    updates.discordClientId = discordClientId.trim();
  }
  if (typeof discordBotToken === 'string') {
    updates.discordBotToken = discordBotToken.trim() || undefined;
  }
  if (typeof activeBlueprintId === 'string' && activeBlueprintId.trim()) {
    updates.activeBlueprintId = activeBlueprintId.trim();
  }
  if (typeof selectedGuildId === 'string') {
    updates.selectedGuildId = selectedGuildId.trim();
  }

  const updated = storage.updateSettings(updates);
  if (typeof discordBotToken === 'string' && discordBotToken.trim().length > 10) {
    discordGateway.reconnect(discordBotToken.trim());
  }
  storage.logAction('SETTINGS_UPDATED', getActorName(), 'Updated platform configuration settings.');
  res.json({
    discordClientId: updated.discordClientId,
    activeBlueprintId: updated.activeBlueprintId,
    selectedGuildId: updated.selectedGuildId,
    botTokenConfigured: Boolean(storage.getEffectiveBotToken()),
    gatewayStatus: discordGateway.getStatus(),
  });
});

app.get('/api/auth/me', (_req: Request, res: Response) => {
  const gw = discordGateway.getStatus();
  res.json({
    botUser: gw.botUser || null,
    gatewayStatus: gw,
    guilds: storage.getGuilds(),
  });
});

app.get('/api/auth/discord/invite-url', (req: Request, res: Response) => {
  const clientId = (req.query.clientId as string) || storage.getSettings().discordClientId || '';
  const url = clientId ? DiscordApiService.generateBotInviteUrl(clientId) : '';
  res.json({ url, clientId });
});

app.get('/api/guilds', async (_req: Request, res: Response) => {
  const botToken = storage.getEffectiveBotToken();
  let guildCreationEligibility = {
    authorized: false,
    currentGuildCount: 0,
    maxAllowedGuildsForBotCreate: 10,
    reason:
      'Discord Bot Token is not configured. Configure a valid Bot Token or invite the bot to an existing server via OAuth2.',
  };

  if (botToken) {
    try {
      const client = new DiscordApiService({ botToken });
      const liveGuilds = await client.getBotGuilds();
      const DISCORD_ADMIN_BIT = 8n;

      for (const lg of liveGuilds) {
        let hasAdmin = false;
        try {
          hasAdmin = (BigInt(lg.permissions || '0') & DISCORD_ADMIN_BIT) !== 0n;
        } catch {

        }
        storage.upsertGuild({
          id: lg.id,
          name: lg.name,
          icon: lg.icon ? `https://cdn.discordapp.com/icons/${lg.id}/${lg.icon}.png` : undefined,
          owner: Boolean(lg.owner),
          permissions: lg.permissions || '0',
          botPresent: true,
          botHasAdmin: hasAdmin,
        });
      }

      const count = Array.isArray(liveGuilds) ? liveGuilds.length : 0;
      guildCreationEligibility = {
        authorized: count < 10,
        currentGuildCount: count,
        maxAllowedGuildsForBotCreate: 10,
        reason:
          count < 10
            ? `Bot is in ${count}/10 servers and is eligible for Discord API v10 POST /guilds creation.`
            : `Discord API v10 restricts POST /guilds to bots in fewer than 10 servers (this bot is in ${count} servers). Please create a server manually in Discord and use the OAuth2 Bot Invite flow.`,
      };
    } catch (err: any) {
      console.warn('Could not sync live bot guilds:', err.message);
    }
  }

  res.json({
    guilds: storage.getGuilds(),
    botTokenConfigured: Boolean(botToken),
    guildCreationEligibility,
  });
});

app.post('/api/guilds', async (req: Request, res: Response) => {
  const { guildId, name } = req.body;
  if (!guildId || !DiscordApiService.isValidSnowflake(guildId)) {
    return res.status(400).json({
      error: 'Please enter a valid 17-20 digit Discord Server (Guild) Snowflake ID.',
    });
  }

  const cleanId = guildId.trim();
  const botToken = storage.getEffectiveBotToken();

  if (botToken) {
    try {
      const client = new DiscordApiService({ botToken });
      const readiness = await client.verifyGuildDeploymentReadiness(cleanId);
      const saved = storage.upsertGuild({
        id: readiness.guildId,
        name: readiness.guildName,
        owner: true,
        permissions: '8',
        botPresent: true,
        botHasAdmin: readiness.ready,
        memberCount: readiness.memberCount,
      });
      storage.logAction(
        'GUILD_CONNECTED',
        getActorName(),
        `Connected & verified Discord server "${readiness.guildName}" (${cleanId}).`
      );
      return res.json({ guild: saved, readiness });
    } catch (err: any) {
      const saved = storage.upsertGuild({
        id: cleanId,
        name: name?.trim() || `Discord Server (${cleanId.slice(-4)})`,
        owner: true,
        permissions: '0',
        botPresent: false,
        botHasAdmin: false,
      });
      return res.json({
        guild: saved,
        warning: `Added server ID ${cleanId}, but bot verification failed: ${err.message}. Ensure the bot is invited to this server.`,
      });
    }
  }

  const saved = storage.upsertGuild({
    id: cleanId,
    name: name?.trim() || `Discord Server (${cleanId.slice(-4)})`,
    owner: true,
    permissions: '0',
    botPresent: false,
    botHasAdmin: false,
  });
  storage.logAction('GUILD_ADDED', getActorName(), `Registered Discord guild ID ${cleanId}.`);
  res.json({ guild: saved });
});

app.post('/api/guilds/create', async (req: Request, res: Response) => {
  const { name, botToken } = req.body;
  const effectiveToken = (botToken && botToken.trim()) || storage.getEffectiveBotToken();

  if (!effectiveToken) {
    return res.status(400).json({
      error: 'Discord Bot Token is not configured. Please configure a valid Bot Token in Settings or the Deployment panel first.',
    });
  }

  const serverName = (name || 'New GuildForge Server').trim();
  if (!serverName) {
    return res.status(400).json({ error: 'Please provide a server name.' });
  }

  try {
    const client = new DiscordApiService({ botToken: effectiveToken });
    const created = await client.createGuild(serverName);

    const saved = storage.upsertGuild({
      id: created.id,
      name: created.name,
      icon: created.icon ? `https://cdn.discordapp.com/icons/${created.id}/${created.icon}.png` : undefined,
      owner: true,
      permissions: '8',
      botPresent: true,
      botHasAdmin: true,
      memberCount: 1,
      inviteUrl: created.inviteUrl,
    });

    storage.updateSettings({ selectedGuildId: saved.id });
    storage.logAction(
      'GUILD_CREATED_BY_BOT',
      getActorName(),
      `Bot created brand-new Discord server "${saved.name}" (${saved.id})${created.inviteUrl ? ` — Invite: ${created.inviteUrl}` : ''}.`
    );

    res.json({
      guild: saved,
      inviteUrl: created.inviteUrl,
      guilds: storage.getGuilds(),
    });
  } catch (err: any) {
    res.status(400).json({
      error: err.message || 'Bot could not create the Discord server via Discord API.',
    });
  }
});

app.post('/api/guilds/:guildId/invite', async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const { botToken } = req.body;
  const effectiveToken = (botToken && botToken.trim()) || storage.getEffectiveBotToken();

  if (!effectiveToken) {
    return res.status(400).json({ error: 'Discord Bot Token is not configured.' });
  }

  try {
    const client = new DiscordApiService({ botToken: effectiveToken });
    const inviteUrl = await client.createGuildInvite(guildId);
    const existing = storage.getGuilds().find((g) => g.id === guildId);
    let updatedGuild = existing;
    if (existing) {
      updatedGuild = storage.upsertGuild({ ...existing, inviteUrl });
    }
    res.json({ inviteUrl, guild: updatedGuild, guilds: storage.getGuilds() });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Failed to generate Discord invite link.' });
  }
});

app.delete('/api/guilds/:guildId', (req: Request, res: Response) => {
  const removed = storage.removeGuild(req.params.guildId);
  res.json({ success: removed, guilds: storage.getGuilds() });
});

app.post('/api/guilds/:guildId/clear', async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const {
    guildName,
    deleteChannels = true,
    deleteRoles = true,
    keepGeneralChannel = true,
    botToken,
  } = req.body || {};

  if (!guildId || !DiscordApiService.isValidSnowflake(guildId)) {
    return res.status(400).json({
      error: 'A valid 17-20 digit Discord Guild Snowflake ID is required to clear a server.',
    });
  }

  try {
    const job = await deploymentEngine.startServerClear({
      guildId,
      guildName: guildName || 'Discord Server',
      deleteChannels: Boolean(deleteChannels),
      deleteRoles: Boolean(deleteRoles),
      keepGeneralChannel: Boolean(keepGeneralChannel),
      botToken,
    });

    storage.logAction(
      'GUILD_CLEARED',
      getActorName(),
      `Started full server clear on "${guildName || guildId}" (${guildId}) — Channels: ${Boolean(deleteChannels)}, Roles: ${Boolean(deleteRoles)}.`
    );

    res.json({ job });
  } catch (err: any) {
    res.status(400).json({
      error: err.message || 'Failed to initiate server clear operation.',
    });
  }
});

app.post('/api/guilds/:guildId/verify-bot', async (req: Request, res: Response) => {
  const { guildId } = req.params;
  const { botToken } = req.body;
  const effectiveToken = (botToken && botToken.trim()) || storage.getEffectiveBotToken();

  if (!effectiveToken) {
    return res.status(400).json({
      verified: false,
      botPresent: false,
      error: 'Discord Bot Token is not configured. Please provide a valid Bot Token in Settings or the Deployment panel.',
    });
  }

  try {
    const client = new DiscordApiService({ botToken: effectiveToken });
    const readiness = await client.verifyGuildDeploymentReadiness(guildId);

    storage.upsertGuild({
      id: readiness.guildId,
      name: readiness.guildName,
      owner: true,
      permissions: '8',
      botPresent: true,
      botHasAdmin: readiness.ready,
      memberCount: readiness.memberCount,
    });

    res.json({
      verified: readiness.ready,
      botPresent: true,
      guildName: readiness.guildName,
      botHasAdmin: readiness.hasAdministrator,
      hasManageRoles: readiness.hasManageRoles,
      hasManageChannels: readiness.hasManageChannels,
      botHighestRolePosition: readiness.botHighestRolePosition,
      missingPermissions: readiness.missingPermissions,
      memberCount: readiness.memberCount,
      readiness,
    });
  } catch (err: any) {
    res.status(400).json({
      verified: false,
      botPresent: false,
      error: err.message || 'Bot is not present in this guild or token is invalid.',
    });
  }
});

app.post('/api/bot/verify-token', async (req: Request, res: Response) => {
  const { token, saveToken = true } = req.body;
  const tokenToTest = (token && token.trim()) || storage.getEffectiveBotToken();

  if (!tokenToTest || tokenToTest.length < 10) {
    return res.status(400).json({ valid: false, error: 'A valid Discord Bot Token must be provided.' });
  }

  try {
    const client = new DiscordApiService({ botToken: tokenToTest });
    const botUser = await client.getBotUser();
    const liveGuilds = await client.getBotGuilds();

    if (saveToken && token && token.trim()) {
      storage.updateSettings({
        discordBotToken: token.trim(),
        discordClientId: botUser.id,
      });
    }

    const DISCORD_ADMIN_BIT = 8n;
    for (const lg of liveGuilds) {
      let hasAdmin = false;
      try {
        hasAdmin = (BigInt(lg.permissions || '0') & DISCORD_ADMIN_BIT) !== 0n;
      } catch {

      }
      storage.upsertGuild({
        id: lg.id,
        name: lg.name,
        icon: lg.icon ? `https://cdn.discordapp.com/icons/${lg.id}/${lg.icon}.png` : undefined,
        owner: Boolean(lg.owner),
        permissions: lg.permissions || '0',
        botPresent: true,
        botHasAdmin: hasAdmin,
      });
    }

    storage.logAction(
      'BOT_VERIFIED',
      getActorName(),
      `Authenticated Discord Bot "${botUser.username}" (${liveGuilds.length} connected servers).`
    );

    discordGateway.connect(tokenToTest);

    res.json({
      valid: true,
      bot: {
        id: botUser.id,
        username: botUser.username,
        discriminator: botUser.discriminator,
        avatar: botUser.avatar ? `https://cdn.discordapp.com/avatars/${botUser.id}/${botUser.avatar}.png` : null,
      },
      guilds: storage.getGuilds(),
      gatewayStatus: discordGateway.getStatus(),
    });
  } catch (err: any) {
    res.status(401).json({
      valid: false,
      error: err.message || 'Discord rejected this Bot Token (401 Unauthorized).',
    });
  }
});

interface AiTaskJob {
  id: string;
  type: 'analyze' | 'generate' | 'optimize';
  status: 'running' | 'completed' | 'failed';
  stageNumber?: number;
  stageLabel?: string;
  result?: any;
  error?: string;
  createdAt: number;
}
const aiJobs = new Map<string, AiTaskJob>();

app.post('/api/ai/analyze', async (req: Request, res: Response) => {
  const { prompt, serverType, expectedScale, securityLevel, departments, advancedConfig } = req.body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Community description prompt is required.' });
  }

  try {
    storage.logAction(
      'AI_ANALYZE_REQUESTED',
      getActorName(),
      `Analyzing requirements (${serverType || 'Custom'}, ${expectedScale || 1000} members, ${securityLevel || 'high'} security): "${prompt.slice(0, 70)}..."`
    );
    const analysis = await analyzeCommunityRequirements({
      prompt: prompt.trim(),
      serverType,
      expectedScale: Number(expectedScale) || 1000,
      securityLevel,
      departments,
      advancedConfig,
    });
    storage.incrementAiStats('analysis');
    res.json({ analysis });
  } catch (err: any) {
    storage.logAction('AI_ANALYZE_FAILED', getActorName(), `Requirement analysis failed: ${err.message}`);
    res.status(500).json({ error: err.message || 'Gemini AI requirement analysis failed.' });
  }
});

app.post('/api/ai/jobs/analyze', (req: Request, res: Response) => {
  const { prompt, serverType, expectedScale, securityLevel, departments, advancedConfig } = req.body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Community description prompt is required.' });
  }

  const jobId = `ai_an_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const job: AiTaskJob = {
    id: jobId,
    type: 'analyze',
    status: 'running',
    stageNumber: 1,
    stageLabel: 'Stage 1/5: Requirement Analysis & Department Extraction',
    createdAt: Date.now(),
  };
  aiJobs.set(jobId, job);

  (async () => {
    try {
      storage.logAction(
        'AI_ANALYZE_REQUESTED',
        getActorName(),
        `Analyzing requirements (${serverType || 'Custom'}, ${expectedScale || 1000} members, ${securityLevel || 'high'} security): "${prompt.slice(0, 70)}..."`
      );
      const analysis = await analyzeCommunityRequirements({
        prompt: prompt.trim(),
        serverType,
        expectedScale: Number(expectedScale) || 1000,
        securityLevel,
        departments,
        advancedConfig,
      });
      storage.incrementAiStats('analysis');
      job.status = 'completed';
      job.result = { analysis };
    } catch (err: any) {
      storage.logAction('AI_ANALYZE_FAILED', getActorName(), `Requirement analysis failed: ${err.message}`);
      job.status = 'failed';
      job.error = err.message || 'Gemini AI requirement analysis failed.';
    }
  })();

  res.json({ jobId, status: 'running' });
});

app.post('/api/ai/generate', async (req: Request, res: Response) => {
  const { prompt, serverType, expectedScale, securityLevel, departments, analysis, advancedConfig } = req.body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Community description prompt is required.' });
  }

  try {
    storage.logAction(
      'AI_GENERATE_REQUESTED',
      getActorName(),
      `Generating architecture (${serverType || 'Custom'}, ${expectedScale || 1000} members, ${securityLevel || 'high'} security): "${prompt.slice(0, 70)}..."`
    );
    const blueprint = await generateServerArchitecture({
      prompt: prompt.trim(),
      serverType,
      expectedScale: Number(expectedScale) || 1000,
      securityLevel,
      departments,
      analysis,
      advancedConfig,
    });
    const report = validateServerArchitecture(blueprint);
    const saved = storage.saveBlueprint(blueprint, true);
    storage.incrementAiStats('generation');

    res.json({ blueprint: saved, report });
  } catch (err: any) {
    storage.logAction('AI_GENERATE_FAILED', getActorName(), `Architecture generation failed: ${err.message}`);
    res.status(500).json({ error: err.message || 'Gemini AI architecture generation failed.' });
  }
});

app.post('/api/ai/jobs/generate', (req: Request, res: Response) => {
  const { prompt, serverType, expectedScale, securityLevel, departments, analysis, advancedConfig } = req.body;
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Community description prompt is required.' });
  }

  const jobId = `ai_gen_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const job: AiTaskJob = {
    id: jobId,
    type: 'generate',
    status: 'running',
    stageNumber: 1,
    stageLabel: 'Stage 1/5: Requirement Analysis',
    createdAt: Date.now(),
  };
  aiJobs.set(jobId, job);

  (async () => {
    try {
      storage.logAction(
        'AI_GENERATE_REQUESTED',
        getActorName(),
        `Generating architecture (${serverType || 'Custom'}, ${expectedScale || 1000} members, ${securityLevel || 'high'} security): "${prompt.slice(0, 70)}..."`
      );
      const blueprint = await generateServerArchitecture(
        {
          prompt: prompt.trim(),
          serverType,
          expectedScale: Number(expectedScale) || 1000,
          securityLevel,
          departments,
          analysis,
          advancedConfig,
        },
        (stageNum, stageLbl) => {
          job.stageNumber = stageNum;
          job.stageLabel = stageLbl;
        }
      );
      const report = validateServerArchitecture(blueprint);
      const saved = storage.saveBlueprint(blueprint, true);
      storage.incrementAiStats('generation');

      job.stageNumber = 5;
      job.stageLabel = 'Stage 5/5: Blueprint Validated & Saved';
      job.status = 'completed';
      job.result = { blueprint: saved, report };
    } catch (err: any) {
      storage.logAction('AI_GENERATE_FAILED', getActorName(), `Architecture generation failed: ${err.message}`);
      job.status = 'failed';
      job.error = err.message || 'Gemini AI architecture generation failed.';
    }
  })();

  res.json({ jobId, status: 'running' });
});

app.post('/api/ai/jobs/optimize', (req: Request, res: Response) => {
  const { blueprint, instructions } = req.body;
  if (!blueprint || !blueprint.name) {
    return res.status(400).json({ error: 'A valid blueprint is required for AI optimization.' });
  }

  const jobId = `ai_opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const job: AiTaskJob = {
    id: jobId,
    type: 'optimize',
    status: 'running',
    createdAt: Date.now(),
  };
  aiJobs.set(jobId, job);

  (async () => {
    try {
      storage.logAction(
        'AI_OPTIMIZE_REQUESTED',
        getActorName(),
        `Optimizing architecture for "${blueprint.name}".`
      );
      const optimized = await optimizeServerArchitecture(blueprint, instructions);
      const report = validateServerArchitecture(optimized);
      const saved = storage.saveBlueprint(optimized, true);
      storage.incrementAiStats('generation');

      job.status = 'completed';
      job.result = { blueprint: saved, report };
    } catch (err: any) {
      storage.logAction('AI_OPTIMIZE_FAILED', getActorName(), `AI optimization failed: ${err.message}`);
      job.status = 'failed';
      job.error = err.message || 'Gemini AI optimization failed.';
    }
  })();

  res.json({ jobId, status: 'running' });
});

app.get('/api/ai/jobs/:id', (req: Request, res: Response) => {
  const job = aiJobs.get(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'AI synthesis job not found.' });
  }
  res.json(job);
});

app.post('/api/ai/validate', (req: Request, res: Response) => {
  const { blueprint } = req.body;
  if (!blueprint || !Array.isArray(blueprint.roles) || !Array.isArray(blueprint.channels)) {
    return res.status(400).json({ error: 'Valid blueprint object is required for security validation.' });
  }

  const report = validateServerArchitecture(blueprint);
  res.json({ report });
});

app.post('/api/ai/autofix', (req: Request, res: Response) => {
  const { blueprint, targetCodeOrId } = req.body;
  if (!blueprint || !Array.isArray(blueprint.roles)) {
    return res.status(400).json({ error: 'Valid blueprint object is required.' });
  }
  const fixed = autoFixBlueprintIssues(blueprint, targetCodeOrId);
  const saved = storage.saveBlueprint(fixed, true);
  const report = validateServerArchitecture(saved);
  storage.logAction(
    'SECURITY_AUTOFIX',
    getActorName(),
    `Applied automated security/architecture fix (${targetCodeOrId || 'ALL'}) on "${saved.name}".`
  );
  res.json({ blueprint: saved, report });
});

app.get('/api/blueprints', (_req: Request, res: Response) => {
  const blueprints = storage.getAllBlueprints();
  const activeBlueprint = storage.getActiveBlueprint();
  res.json({
    blueprints,
    activeBlueprintId: activeBlueprint ? activeBlueprint.id : '',
    activeBlueprint,
  });
});

app.get('/api/blueprints/active', (_req: Request, res: Response) => {
  const activeBlueprint = storage.getActiveBlueprint();
  res.json({ blueprint: activeBlueprint });
});

app.get('/api/blueprints/:id', (req: Request, res: Response) => {
  const bp = storage.getBlueprint(req.params.id);
  if (!bp) {
    return res.status(404).json({ error: 'Blueprint not found' });
  }
  res.json({ blueprint: bp });
});

app.post('/api/blueprints', (req: Request, res: Response) => {
  const { blueprint, setAsActive = true } = req.body;
  if (!blueprint || !blueprint.name) {
    return res.status(400).json({ error: 'Invalid blueprint structure' });
  }

  const saved = storage.saveBlueprint(blueprint, Boolean(setAsActive));
  const report = validateServerArchitecture(saved);
  res.json({ blueprint: saved, report });
});

app.put('/api/blueprints/:id', (req: Request, res: Response) => {
  const { blueprint } = req.body;
  if (!blueprint || !blueprint.name) {
    return res.status(400).json({ error: 'Invalid blueprint structure' });
  }
  blueprint.id = req.params.id;
  const saved = storage.saveBlueprint(blueprint, true);
  const report = validateServerArchitecture(saved);
  res.json({ blueprint: saved, report });
});

app.delete('/api/blueprints/:id', (req: Request, res: Response) => {
  const deleted = storage.deleteBlueprint(req.params.id);
  res.json({ success: deleted, activeBlueprint: storage.getActiveBlueprint() });
});

app.get('/api/deployments', (_req: Request, res: Response) => {
  const deployments = storage.getDeployments();
  res.json({ deployments });
});

app.get('/api/deployments/:id', (req: Request, res: Response) => {
  const dep = storage.getDeployment(req.params.id);
  if (!dep) {
    return res.status(404).json({ error: 'Deployment not found' });
  }
  res.json({ deployment: dep });
});

app.post('/api/deployments/plan', async (req: Request, res: Response) => {
  const { guildId, blueprint, botToken } = req.body;
  if (!guildId || !blueprint) {
    return res.status(400).json({ error: 'guildId and blueprint are required to generate a deployment plan.' });
  }

  try {
    const plan = await deploymentEngine.generateDeploymentPlan({
      guildId,
      blueprint,
      botToken,
    });
    res.json({ plan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/deployments', async (req: Request, res: Response) => {
  const { guildId, guildName, blueprint, botToken } = req.body;

  if (!guildId || !blueprint) {
    return res.status(400).json({ error: 'guildId and blueprint are required.' });
  }

  const savedBlueprint = storage.saveBlueprint(blueprint, true);

  const validation = validateServerArchitecture(savedBlueprint);
  if (validation.overallStatus === 'critical') {
    return res.status(400).json({
      error: `Deployment blocked: ${validation.criticalErrors.length} critical security error(s) detected in blueprint. Please fix them in Security Audit first.`,
      validationReport: validation,
    });
  }

  if (botToken && typeof botToken === 'string' && botToken.trim().length > 10) {
    storage.updateSettings({ discordBotToken: botToken.trim() });
  }

  try {
    const job = await deploymentEngine.startDeployment({
      guildId,
      guildName: guildName || 'Discord Server',
      blueprint: savedBlueprint,
      botToken,
    });

    storage.logAction(
      'DEPLOYMENT_STARTED',
      getActorName(),
      `Started live Discord API deployment of "${savedBlueprint.name}" (v${savedBlueprint.version}) to guild "${guildName}" (${guildId}).`
    );
    res.json({ job });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/deployments/:id/events', (req: Request, res: Response) => {
  const { id } = req.params;
  const job = storage.getDeployment(id);

  if (!job) {
    return res.status(404).end();
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  let streamClosed = false;
  res.on('error', () => {
    streamClosed = true;
  });

  const safeWrite = (payload: any) => {
    if (streamClosed || res.writableEnded || res.destroyed) return;
    try {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    } catch {
      streamClosed = true;
    }
  };

  safeWrite(job);

  if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
    streamClosed = true;
    if (!res.writableEnded && !res.destroyed) {
      res.end();
    }
    return;
  }

  const unsubscribe = deploymentEngine.subscribe(id, (updatedJob) => {
    if (streamClosed || res.writableEnded || res.destroyed) {
      unsubscribe();
      return;
    }
    safeWrite(updatedJob);
    if (
      updatedJob.status === 'completed' ||
      updatedJob.status === 'failed' ||
      updatedJob.status === 'cancelled'
    ) {
      streamClosed = true;
      unsubscribe();
      if (!res.writableEnded && !res.destroyed) {
        res.end();
      }
    }
  });

  req.on('close', () => {
    streamClosed = true;
    unsubscribe();
  });
});

app.post('/api/deployments/:id/cancel', (req: Request, res: Response) => {
  const cancelled = deploymentEngine.cancelDeployment(req.params.id);
  res.json({ success: cancelled });
});

app.get('/api/backups', (req: Request, res: Response) => {
  const blueprintId = req.query.blueprintId as string | undefined;
  const backups = storage.getBackups(blueprintId);
  res.json({ backups });
});

app.post('/api/backups', (req: Request, res: Response) => {
  const { blueprint, name } = req.body;
  if (!blueprint) {
    return res.status(400).json({ error: 'Blueprint is required' });
  }
  const backup = storage.createBackup(
    blueprint,
    name || `${blueprint.name} — Snapshot ${new Date().toLocaleTimeString()}`
  );
  res.json({ backup });
});

app.delete('/api/backups/:id', (req: Request, res: Response) => {
  const deleted = storage.deleteBackup(req.params.id);
  res.json({ success: deleted });
});

app.post('/api/backups/import', (req: Request, res: Response) => {
  const { blueprintData } = req.body;
  if (
    !blueprintData ||
    !blueprintData.name ||
    !Array.isArray(blueprintData.roles) ||
    !Array.isArray(blueprintData.categories) ||
    !Array.isArray(blueprintData.channels)
  ) {
    return res.status(400).json({
      error: 'Invalid blueprint JSON format. Must contain name, roles, categories, and channels arrays.',
    });
  }

  const blueprint: ServerBlueprint = {
    ...blueprintData,
    id: blueprintData.id || `bp_imported_${Date.now()}`,
    createdAt: blueprintData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const saved = storage.saveBlueprint(blueprint, true);
  const report = validateServerArchitecture(saved);
  res.json({ blueprint: saved, report });
});

app.get('/api/admin/metrics', (_req: Request, res: Response) => {
  const metrics = storage.getAdminMetrics();
  res.json({ metrics });
});

app.get('/api/admin/logs', (_req: Request, res: Response) => {
  const logs = storage.getAuditLogs();
  res.json({ logs });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`GuildForge — AI Discord Server Architect listening on http://0.0.0.0:${PORT}`);

    const initialToken = storage.getEffectiveBotToken();
    if (initialToken) {
      discordGateway.connect(initialToken);
    }
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

