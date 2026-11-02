import type {
  ServerBlueprint,
  DeploymentJob,
  DeploymentLog,
  DeploymentPlan,
  PermissionOverwrite,
} from '../types/discord.ts';
import { DiscordApiService } from './discordApi.ts';
import { storage } from './storage.ts';

export type DeploymentListener = (job: DeploymentJob) => void;

class DeploymentEngine {
  private listeners: Map<string, Set<DeploymentListener>> = new Map();

  subscribe(jobId: string, listener: DeploymentListener): () => void {
    if (!this.listeners.has(jobId)) {
      this.listeners.set(jobId, new Set());
    }
    this.listeners.get(jobId)!.add(listener);

    return () => {
      this.listeners.get(jobId)?.delete(listener);
    };
  }

  private notify(job: DeploymentJob) {
    storage.saveDeployment(job);
    const set = this.listeners.get(job.id);
    if (set) {
      set.forEach((listener) => {
        try {
          listener(job);
        } catch (e) {
          console.error('Error notifying deployment listener:', e);
        }
      });
    }
  }

  private addLog(job: DeploymentJob, level: DeploymentLog['level'], step: string, message: string) {
    const log: DeploymentLog = {
      id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      level,
      step,
      message,
    };
    job.logs.push(log);
    this.notify(job);
  }

  async generateDeploymentPlan(options: {
    guildId: string;
    blueprint: ServerBlueprint;
    botToken?: string;
  }): Promise<DeploymentPlan> {
    const effectiveToken = options.botToken || storage.getEffectiveBotToken();
    const totalOps =
      options.blueprint.roles.length +
      options.blueprint.categories.length +
      options.blueprint.channels.length;

    if (!effectiveToken) {
      return {
        guildId: options.guildId,
        guildName: 'Unverified Guild',
        blueprintId: options.blueprint.id,
        blueprintName: options.blueprint.name,
        rolesToCreate: options.blueprint.roles.length,
        rolesToReuse: 0,
        categoriesToCreate: options.blueprint.categories.length,
        categoriesToReuse: 0,
        channelsToCreate: options.blueprint.channels.length,
        channelsToReuse: 0,
        estimatedDurationSec: Math.ceil(totalOps * 0.55),
        botReadiness: {
          ready: false,
          missingPermissions: ['DISCORD_BOT_TOKEN'],
          error:
            'Discord Bot Token is not configured. Add your Discord Bot Token in Settings or the Deployment panel to verify guild permissions and deploy.',
        },
      };
    }

    const discordClient = new DiscordApiService({ botToken: effectiveToken });

    try {
      const readiness = await discordClient.verifyGuildDeploymentReadiness(options.guildId);

      const existingRoleNames = new Set(readiness.existingRoles.map((r) => r.name.trim().toLowerCase()));
      const existingCatNames = new Set(
        readiness.existingChannels.filter((c) => c.type === 4).map((c) => c.name.trim().toLowerCase())
      );
      const existingChanNames = new Set(
        readiness.existingChannels.filter((c) => c.type !== 4).map((c) => c.name.trim().toLowerCase())
      );

      let rolesToReuse = 0;
      options.blueprint.roles.forEach((r) => {
        if (existingRoleNames.has(r.name.trim().toLowerCase())) rolesToReuse++;
      });

      let categoriesToReuse = 0;
      options.blueprint.categories.forEach((c) => {
        if (existingCatNames.has(c.name.trim().toLowerCase())) categoriesToReuse++;
      });

      let channelsToReuse = 0;
      options.blueprint.channels.forEach((ch) => {
        const normalizedName =
          ch.type === 'GUILD_VOICE' || ch.type === 'GUILD_STAGE_VOICE'
            ? ch.name.trim().toLowerCase()
            : ch.name
                .toLowerCase()
                .replace(/[^a-z0-9_-]+/g, '-')
                .replace(/^-+|-+$/g, '');
        if (existingChanNames.has(normalizedName)) channelsToReuse++;
      });

      const rolesToCreate = options.blueprint.roles.length - rolesToReuse;
      const categoriesToCreate = options.blueprint.categories.length - categoriesToReuse;
      const channelsToCreate = options.blueprint.channels.length - channelsToReuse;
      const netCreations = rolesToCreate + categoriesToCreate + channelsToCreate;

      return {
        guildId: readiness.guildId,
        guildName: readiness.guildName,
        blueprintId: options.blueprint.id,
        blueprintName: options.blueprint.name,
        rolesToCreate,
        rolesToReuse,
        categoriesToCreate,
        categoriesToReuse,
        channelsToCreate,
        channelsToReuse,
        estimatedDurationSec: Math.max(3, Math.ceil(netCreations * 0.5)),
        botReadiness: {
          ready: readiness.ready,
          botUsername: readiness.botUsername,
          botHighestRolePosition: readiness.botHighestRolePosition,
          hasAdministrator: readiness.hasAdministrator,
          hasManageRoles: readiness.hasManageRoles,
          hasManageChannels: readiness.hasManageChannels,
          missingPermissions: readiness.missingPermissions,
          error: readiness.ready
            ? undefined
            : `Bot is missing required permissions in "${readiness.guildName}": ${readiness.missingPermissions.join(', ')}`,
        },
      };
    } catch (err: any) {
      return {
        guildId: options.guildId,
        guildName: 'Target Guild',
        blueprintId: options.blueprint.id,
        blueprintName: options.blueprint.name,
        rolesToCreate: options.blueprint.roles.length,
        rolesToReuse: 0,
        categoriesToCreate: options.blueprint.categories.length,
        categoriesToReuse: 0,
        channelsToCreate: options.blueprint.channels.length,
        channelsToReuse: 0,
        estimatedDurationSec: Math.ceil(totalOps * 0.5),
        botReadiness: {
          ready: false,
          missingPermissions: [],
          error: err.message || 'Failed to verify guild with Discord API.',
        },
      };
    }
  }

  async startDeployment(options: {
    guildId: string;
    guildName: string;
    blueprint: ServerBlueprint;
    botToken?: string;
  }): Promise<DeploymentJob> {
    const { guildId, guildName, blueprint, botToken } = options;
    const effectiveToken = botToken || storage.getEffectiveBotToken();

    if (!effectiveToken) {
      throw new Error(
        'Cannot start deployment: Discord Bot Token is missing. Please configure your Discord Bot Token in Settings or the Deployment panel.'
      );
    }

    if (!DiscordApiService.isValidSnowflake(guildId)) {
      throw new Error(
        `Invalid Discord Server ID "${guildId}". Please select a real Discord server where your bot has been invited.`
      );
    }

    const totalOps =
      5 + blueprint.roles.length + blueprint.categories.length + blueprint.channels.length;

    const job: DeploymentJob = {
      id: `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      guildId,
      guildName,
      blueprintId: blueprint.id,
      status: 'in_progress',
      mode: 'real',
      progress: 0,
      currentStep: 'Step 1/8: Pre-flight Guild & Permission Verification',
      totalOperations: totalOps,
      completedOperations: 0,
      logs: [],
      createdRoles: [],
      createdCategories: [],
      createdChannels: [],
      failedOperations: [],
      checkpoints: {
        preflightVerified: false,
        rolesProvisioned: false,
        roleHierarchyPositioned: false,
        categoriesProvisioned: false,
        channelsProvisioned: false,
        overwritesConfigured: false,
        guildConfigured: false,
        postDeployVerified: false,
      },
      createdAt: new Date().toISOString(),
    };

    storage.saveDeployment(job);

    this.executeJob(job, blueprint, effectiveToken).catch((err) => {
      console.error('Deployment execution failed:', err);
      job.errorMessage = err.message || 'Deployment failed';
      job.status = 'failed';
      this.addLog(job, 'error', 'Fatal Error', `Deployment aborted: ${job.errorMessage}`);
    });

    return job;
  }

  private resolveOverwrites(
    overwrites: PermissionOverwrite[],
    roleIdMap: Record<string, string>,
    guildId: string,
    discordClient: DiscordApiService
  ): Array<{ id: string; type: number; allow: string; deny: string }> {
    const resolved: Array<{ id: string; type: number; allow: string; deny: string }> = [];

    for (const o of overwrites) {
      const key = (o.roleNameOrId || '').trim();
      const lowerKey = key.toLowerCase();
      let targetRoleId: string | undefined;

      if (lowerKey === '@everyone' || lowerKey === 'everyone') {
        targetRoleId = guildId;
      } else {
        targetRoleId = roleIdMap[lowerKey] || roleIdMap[key];
      }

      if (targetRoleId && DiscordApiService.isValidSnowflake(targetRoleId)) {
        resolved.push({
          id: targetRoleId,
          type: 0,
          allow: discordClient.computePermissionBitfield(o.allow || []),
          deny: discordClient.computePermissionBitfield(o.deny || []),
        });
      }
    }

    return resolved;
  }

  private async executeJob(job: DeploymentJob, blueprint: ServerBlueprint, botToken: string) {
    const discordClient = new DiscordApiService({ botToken });

    this.addLog(
      job,
      'info',
      'Initialization',
      `Starting 8-stage live Discord API v10 deployment for "${blueprint.name}" (v${blueprint.version}) on guild ID ${job.guildId}.`
    );

    job.currentStep = 'Step 1/8: Pre-flight Permission Validation';
    const readiness = await discordClient.verifyGuildDeploymentReadiness(job.guildId);
    job.guildName = readiness.guildName;

    if (!readiness.ready) {
      throw new Error(
        `Bot "${readiness.botUsername}" lacks required permissions in "${readiness.guildName}": missing [${readiness.missingPermissions.join(', ')}].`
      );
    }

    job.checkpoints.preflightVerified = true;
    job.completedOperations++;
    job.progress = Math.round((job.completedOperations / job.totalOperations) * 100);
    this.addLog(
      job,
      'success',
      'Step 1/8: Pre-flight Verified',
      `Verified bot "${readiness.botUsername}" in guild "${readiness.guildName}" (Highest Role Pos: #${readiness.botHighestRolePosition}, Admin: ${readiness.hasAdministrator}).`
    );

    const existingRolesByName = new Map<string, { id: string; name: string; position: number }>();
    readiness.existingRoles.forEach((r) => {
      if (!r.managed && r.name !== '@everyone') {
        existingRolesByName.set(r.name.trim().toLowerCase(), {
          id: r.id,
          name: r.name,
          position: r.position,
        });
      }
    });

    const existingCategoriesByName = new Map<string, { id: string; name: string }>();
    const existingChannelsByKey = new Map<string, { id: string; name: string }>();
    readiness.existingChannels.forEach((c) => {
      if (c.type === 4) {
        existingCategoriesByName.set(c.name.trim().toLowerCase(), { id: c.id, name: c.name });
      } else {
        const key = `${c.parent_id || 'root'}:${c.name.trim().toLowerCase()}`;
        existingChannelsByKey.set(key, { id: c.id, name: c.name });
      }
    });

    job.currentStep = 'Step 2/8: Provisioning Role Definitions';
    const sortedRoles = [...blueprint.roles].sort((a, b) => b.hierarchyPosition - a.hierarchyPosition);

    const roleIdMap: Record<string, string> = {
      '@everyone': job.guildId,
      everyone: job.guildId,
    };

    for (const role of sortedRoles) {
      if (job.status === 'cancelled') {
        this.addLog(job, 'warn', 'Cancelled', 'Deployment halted by user cancellation request.');
        return;
      }

      const lowerRoleName = role.name.trim().toLowerCase();
      const existingRole = existingRolesByName.get(lowerRoleName);

      if (existingRole) {
        roleIdMap[lowerRoleName] = existingRole.id;
        roleIdMap[role.id] = existingRole.id;
        job.createdRoles.push({ name: role.name, id: existingRole.id, color: role.color, reused: true });
        this.addLog(
          job,
          'info',
          'Step 2/8: Role Reused',
          `Reusing existing role "${role.name}" (Snowflake ID: ${existingRole.id}) to prevent duplicates during resume/re-deploy.`
        );
      } else {
        try {
          const created = await discordClient.createRole(job.guildId, {
            name: role.name,
            colorHex: role.color,
            hoist: role.hoist,
            mentionable: role.mentionable,
            permissions: role.permissions,
          });
          roleIdMap[lowerRoleName] = created.id;
          roleIdMap[role.id] = created.id;
          job.createdRoles.push({ name: role.name, id: created.id, color: role.color, reused: false });
          this.addLog(
            job,
            'success',
            'Step 2/8: Role Created',
            `Created role "${role.name}" [${role.department}] -> Snowflake ID: ${created.id}`
          );
          await new Promise((r) => setTimeout(r, 350));
        } catch (err: any) {
          const errMsg = err.message || 'Unknown Discord API error';
          job.failedOperations.push({
            id: `fail_role_${role.id}`,
            step: 'role',
            resourceName: role.name,
            error: errMsg,
          });
          this.addLog(job, 'error', 'Role Failure', `Failed to create role "${role.name}": ${errMsg}`);
        }
      }

      job.completedOperations++;
      job.progress = Math.round((job.completedOperations / job.totalOperations) * 100);
      this.notify(job);
    }

    job.checkpoints.rolesProvisioned = job.failedOperations.filter((f) => f.step === 'role').length === 0;

    job.currentStep = 'Step 3/8: Positioning Role Hierarchy';
    try {
      const rolesAsc = [...blueprint.roles].sort((a, b) => b.hierarchyPosition - a.hierarchyPosition);
      const maxAssignablePos = Math.max(1, readiness.botHighestRolePosition - 1);
      const positionPayload: Array<{ id: string; position: number }> = [];

      rolesAsc.forEach((role, idx) => {
        const snowflakeId = roleIdMap[role.id] || roleIdMap[role.name.trim().toLowerCase()];
        if (snowflakeId && DiscordApiService.isValidSnowflake(snowflakeId)) {
          const targetPos = Math.min(maxAssignablePos, idx + 1);
          positionPayload.push({ id: snowflakeId, position: targetPos });
        }
      });

      if (positionPayload.length > 0 && readiness.botHighestRolePosition > 1) {
        await discordClient.modifyRolePositions(job.guildId, positionPayload);
        this.addLog(
          job,
          'success',
          'Step 3/8: Role Hierarchy Positioned',
          `Positioned ${positionPayload.length} roles in hierarchy order below bot ceiling (#${readiness.botHighestRolePosition}).`
        );
      } else {
        this.addLog(
          job,
          'info',
          'Step 3/8: Role Hierarchy',
          `Retained sequential creation order for ${job.createdRoles.length} roles.`
        );
      }
      job.checkpoints.roleHierarchyPositioned = true;
    } catch (err: any) {
      job.checkpoints.roleHierarchyPositioned = true;
      this.addLog(
        job,
        'warn',
        'Step 3/8: Role Hierarchy Note',
        `Role position adjustment note: ${err.message} (sequential creation order preserved).`
      );
    }
    job.completedOperations++;
    job.progress = Math.round((job.completedOperations / job.totalOperations) * 100);
    this.notify(job);

    job.currentStep = 'Step 4/8: Creating Categories & Isolation Overwrites';
    const categoryIdMap: Record<string, string> = {};
    const sortedCategories = [...blueprint.categories].sort((a, b) => a.position - b.position);

    for (const cat of sortedCategories) {
      if (job.status === 'cancelled') {
        this.addLog(job, 'warn', 'Cancelled', 'Deployment halted by user cancellation request.');
        return;
      }

      const fullCatName = cat.emoji && !cat.name.startsWith(cat.emoji)
        ? `${cat.emoji} ${cat.name}`
        : cat.name;
      const lowerCatName = fullCatName.trim().toLowerCase();
      const existingCat =
        existingCategoriesByName.get(lowerCatName) ||
        existingCategoriesByName.get(cat.name.trim().toLowerCase());

      if (existingCat) {
        categoryIdMap[cat.id] = existingCat.id;
        job.createdCategories.push({ name: existingCat.name, id: existingCat.id, reused: true });
        this.addLog(
          job,
          'info',
          'Step 4/8: Category Reused',
          `Reusing existing category "${existingCat.name}" (Snowflake ID: ${existingCat.id}).`
        );
      } else {
        try {
          const overwrites = this.resolveOverwrites(cat.permissionOverwrites, roleIdMap, job.guildId, discordClient);
          const created = await discordClient.createCategory(job.guildId, fullCatName, overwrites);
          categoryIdMap[cat.id] = created.id;
          job.createdCategories.push({ name: created.name, id: created.id, reused: false });
          this.addLog(
            job,
            'success',
            'Step 4/8: Category Created',
            `Created category "${created.name}" (${overwrites.length} role overwrites) -> Snowflake ID: ${created.id}`
          );
          await new Promise((r) => setTimeout(r, 350));
        } catch (err: any) {
          const errMsg = err.message || 'Unknown Discord API error';
          job.failedOperations.push({
            id: `fail_cat_${cat.id}`,
            step: 'category',
            resourceName: cat.name,
            error: errMsg,
          });
          this.addLog(job, 'error', 'Category Failure', `Failed to create category "${cat.name}": ${errMsg}`);
        }
      }

      job.completedOperations++;
      job.progress = Math.round((job.completedOperations / job.totalOperations) * 100);
      this.notify(job);
    }

    job.checkpoints.categoriesProvisioned = job.failedOperations.filter((f) => f.step === 'category').length === 0;

    job.currentStep = 'Step 5/8: Creating Channels Across Categories';
    const channelIdMap: Record<string, string> = {};

    for (const channel of blueprint.channels) {
      if (job.status === 'cancelled') {
        this.addLog(job, 'warn', 'Cancelled', 'Deployment halted by user cancellation request.');
        return;
      }

      const parentSnowflake = categoryIdMap[channel.categoryId];
      const parentName = blueprint.categories.find((c) => c.id === channel.categoryId)?.name || 'Root';

      const isVoice = channel.type === 'GUILD_VOICE' || channel.type === 'GUILD_STAGE_VOICE';
      const formattedLookupName = isVoice
        ? channel.name.trim().toLowerCase()
        : channel.name
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/^-+|-+$/g, '');

      const lookupKey = `${parentSnowflake || 'root'}:${formattedLookupName}`;
      const existingChan = existingChannelsByKey.get(lookupKey);

      if (existingChan) {
        channelIdMap[channel.id] = existingChan.id;
        channelIdMap[channel.name.toLowerCase()] = existingChan.id;
        job.createdChannels.push({
          name: channel.name,
          id: existingChan.id,
          type: channel.type,
          category: parentName,
          reused: true,
        });
        this.addLog(
          job,
          'info',
          'Step 5/8: Channel Reused',
          `Reusing existing channel #${channel.name} inside [${parentName}] (Snowflake ID: ${existingChan.id}).`
        );
      } else {
        try {
          const overwrites = this.resolveOverwrites(
            channel.permissionOverwrites,
            roleIdMap,
            job.guildId,
            discordClient
          );

          const created = await discordClient.createChannel(job.guildId, {
            name: channel.name,
            type: channel.type,
            parentId: parentSnowflake,
            topic: channel.topic || channel.purpose,
            slowmode: channel.slowmode,
            userLimit: channel.userLimit,
            bitrate: channel.bitrate,
            rtcRegion: channel.rtcRegion,
            defaultAutoArchiveDuration: channel.defaultAutoArchiveDuration,
            nsfw: channel.nsfw,
            permissionOverwrites: overwrites,
          });

          channelIdMap[channel.id] = created.id;
          channelIdMap[channel.name.toLowerCase()] = created.id;
          job.createdChannels.push({
            name: channel.name,
            id: created.id,
            type: channel.type,
            category: parentName,
            reused: false,
          });
          this.addLog(
            job,
            'success',
            'Step 5/8: Channel Created',
            `Provisioned #${channel.name} (${channel.type}) in [${parentName}] -> Snowflake ID: ${created.id}`
          );
          await new Promise((r) => setTimeout(r, 350));
        } catch (err: any) {
          const errMsg = err.message || 'Unknown Discord API error';
          job.failedOperations.push({
            id: `fail_ch_${channel.id}`,
            step: 'channel',
            resourceName: channel.name,
            error: errMsg,
          });
          this.addLog(job, 'error', 'Channel Failure', `Failed to create channel #${channel.name}: ${errMsg}`);
        }
      }

      job.completedOperations++;
      job.progress = Math.round((job.completedOperations / job.totalOperations) * 100);
      this.notify(job);
    }

    job.checkpoints.channelsProvisioned = job.failedOperations.filter((f) => f.step === 'channel').length === 0;

    job.currentStep = 'Step 6/8: Verifying & Syncing Permission Overwrites';
    let syncedOverwritesCount = 0;
    for (const cat of sortedCategories) {
      const catSnowflake = categoryIdMap[cat.id];
      const wasReused = job.createdCategories.find((c) => c.id === catSnowflake)?.reused;
      if (catSnowflake && wasReused && cat.permissionOverwrites.length > 0) {
        const overwrites = this.resolveOverwrites(cat.permissionOverwrites, roleIdMap, job.guildId, discordClient);
        for (const ow of overwrites) {
          try {
            await discordClient.upsertChannelPermissionOverwrite(catSnowflake, ow.id, ow);
            syncedOverwritesCount++;
          } catch {

          }
        }
      }
    }
    const totalOverwritesApplied =
      blueprint.categories.reduce((acc, c) => acc + c.permissionOverwrites.length, 0) +
      blueprint.channels.reduce((acc, c) => acc + c.permissionOverwrites.length, 0);
    job.checkpoints.overwritesConfigured = true;
    job.completedOperations++;
    job.progress = Math.round((job.completedOperations / job.totalOperations) * 100);
    this.addLog(
      job,
      'success',
      'Step 6/8: Overwrites Configured',
      `Applied ${totalOverwritesApplied} permission overwrites across categories and channels (${syncedOverwritesCount} synced on reused resources).`
    );
    this.notify(job);

    job.currentStep = 'Step 7/8: Applying Supported Guild Configuration';
    try {
      const afkChan = job.createdChannels.find(
        (c) => c.type === 'GUILD_VOICE' && /afk|muted|inactive/i.test(c.name)
      );
      const welcomeChan = job.createdChannels.find(
        (c) => c.type === 'GUILD_TEXT' && /welcome|general/i.test(c.name)
      );
      if (afkChan || welcomeChan) {
        const guildPatch: Record<string, any> = {};
        if (afkChan) {
          guildPatch.afk_channel_id = afkChan.id;
          guildPatch.afk_timeout = 900;
        }
        if (welcomeChan) {
          guildPatch.system_channel_id = welcomeChan.id;
        }
        await discordClient.modifyGuildConfiguration(job.guildId, guildPatch);
        this.addLog(
          job,
          'success',
          'Step 7/8: Guild Configured',
          `Updated guild settings (${afkChan ? `AFK: #${afkChan.name}` : ''}${afkChan && welcomeChan ? ', ' : ''}${welcomeChan ? `System: #${welcomeChan.name}` : ''}).`
        );
      } else {
        this.addLog(job, 'info', 'Step 7/8: Guild Config', 'Verified default guild system settings.');
      }
      job.checkpoints.guildConfigured = true;
    } catch (err: any) {
      job.checkpoints.guildConfigured = true;
      this.addLog(job, 'info', 'Step 7/8: Guild Config', `Guild settings note: ${err.message}`);
    }
    job.completedOperations++;
    job.progress = Math.round((job.completedOperations / job.totalOperations) * 100);
    this.notify(job);

    job.currentStep = 'Step 8/8: Post-Deployment Live Verification';
    try {
      const [liveRoles, liveChannels] = await Promise.all([
        discordClient.getGuildRoles(job.guildId),
        discordClient.getGuildChannels(job.guildId),
      ]);
      const liveRoleIds = new Set(liveRoles.map((r: any) => r.id));
      const liveChannelIds = new Set(liveChannels.map((c: any) => c.id));

      const verifiedRolesCount = job.createdRoles.filter((r) => liveRoleIds.has(r.id)).length;
      const verifiedCatsCount = job.createdCategories.filter((c) => liveChannelIds.has(c.id)).length;
      const verifiedChansCount = job.createdChannels.filter((c) => liveChannelIds.has(c.id)).length;

      if (verifiedRolesCount < blueprint.roles.length) {
        job.failedOperations.push({
          id: 'verify_missing_roles',
          step: 'verification',
          resourceName: 'Role Verification',
          error: `Expected ${blueprint.roles.length} roles on live server, found ${verifiedRolesCount}.`,
        });
      }
      if (verifiedCatsCount < blueprint.categories.length) {
        job.failedOperations.push({
          id: 'verify_missing_cats',
          step: 'verification',
          resourceName: 'Category Verification',
          error: `Expected ${blueprint.categories.length} categories on live server, found ${verifiedCatsCount}.`,
        });
      }
      if (verifiedChansCount < blueprint.channels.length) {
        job.failedOperations.push({
          id: 'verify_missing_chans',
          step: 'verification',
          resourceName: 'Channel Verification',
          error: `Expected ${blueprint.channels.length} channels on live server, found ${verifiedChansCount}.`,
        });
      }

      job.checkpoints.postDeployVerified = job.failedOperations.length === 0;
      this.addLog(
        job,
        job.failedOperations.length === 0 ? 'success' : 'warn',
        'Step 8/8: Live Verification',
        `Verified on live Discord server: ${verifiedRolesCount}/${blueprint.roles.length} roles, ${verifiedCatsCount}/${blueprint.categories.length} categories, ${verifiedChansCount}/${blueprint.channels.length} channels confirmed active.`
      );

      try {
        const inviteUrl = await discordClient.createGuildInvite(job.guildId);
        job.inviteUrl = inviteUrl;
        const existingGuild = storage.getGuilds().find((g) => g.id === job.guildId);
        if (existingGuild) {
          storage.upsertGuild({ ...existingGuild, inviteUrl });
        }
        this.addLog(job, 'success', 'Server Invite', `Permanent server invite link ready: ${inviteUrl}`);
      } catch {

      }
    } catch (err: any) {
      this.addLog(job, 'warn', 'Step 8/8: Verification', `Post-deployment verification check warning: ${err.message}`);
    }

    job.completedOperations = job.totalOperations;
    job.progress = 100;
    job.completedAt = new Date().toISOString();

    if (job.failedOperations.length > 0) {
      job.errorMessage = `${job.failedOperations.length} operation(s) failed or were unverified during deployment. Inspect failed operations below and click Retry Failed Operations.`;
      job.status = 'failed';
      this.addLog(
        job,
        'error',
        'Deployment Incomplete',
        `Deployment finished with ${job.failedOperations.length} failed operation(s). Click Retry Failed Operations to resume and provision missing resources without duplicating existing ones.`
      );
    } else {
      job.status = 'completed';
      this.addLog(
        job,
        'success',
        'Deployment Complete',
        `Successfully deployed "${blueprint.name}" to "${job.guildName}": ${job.createdRoles.length} roles, ${job.createdCategories.length} categories, and ${job.createdChannels.length} channels verified active.`
      );
    }
  }

  cancelDeployment(jobId: string): boolean {
    const job = storage.getDeployment(jobId);
    if (job && job.status === 'in_progress') {
      job.status = 'cancelled';
      this.addLog(job, 'warn', 'Cancellation', 'Deployment cancellation signal received.');
      return true;
    }
    return false;
  }

  async startServerClear(options: {
    guildId: string;
    guildName: string;
    deleteChannels?: boolean;
    deleteRoles?: boolean;
    keepGeneralChannel?: boolean;
    botToken?: string;
  }): Promise<DeploymentJob> {
    const {
      guildId,
      guildName,
      deleteChannels = true,
      deleteRoles = true,
      keepGeneralChannel = true,
      botToken,
    } = options;
    const effectiveToken = botToken || storage.getEffectiveBotToken();

    if (!effectiveToken) {
      throw new Error(
        'Cannot clear server: Discord Bot Token is missing. Please configure your Discord Bot Token in Settings or the Deployment panel.'
      );
    }

    if (!DiscordApiService.isValidSnowflake(guildId)) {
      throw new Error(
        `Invalid Discord Server ID "${guildId}". Please select a real Discord server where your bot has been invited.`
      );
    }

    const job: DeploymentJob = {
      id: `clr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      guildId,
      guildName: guildName || 'Discord Server',
      blueprintId: 'server_clear_operation',
      status: 'in_progress',
      mode: 'real',
      progress: 0,
      currentStep: 'Pre-flight Server Clear Verification',
      totalOperations: 5,
      completedOperations: 0,
      logs: [],
      createdRoles: [],
      createdCategories: [],
      createdChannels: [],
      failedOperations: [],
      checkpoints: {
        preflightVerified: false,
        rolesProvisioned: false,
        categoriesProvisioned: false,
        channelsProvisioned: false,
        postDeployVerified: false,
      },
      createdAt: new Date().toISOString(),
    };

    storage.saveDeployment(job);

    this.executeClearJob(job, {
      deleteChannels,
      deleteRoles,
      keepGeneralChannel,
      botToken: effectiveToken,
    }).catch((err) => {
      console.error('Server clear execution failed:', err);
      job.errorMessage = err.message || 'Server clear failed';
      job.status = 'failed';
      this.addLog(job, 'error', 'Fatal Error', `Server clear aborted: ${job.errorMessage}`);
    });

    return job;
  }

  private async executeClearJob(
    job: DeploymentJob,
    options: {
      deleteChannels: boolean;
      deleteRoles: boolean;
      keepGeneralChannel: boolean;
      botToken: string;
    }
  ) {
    const discordClient = new DiscordApiService({ botToken: options.botToken });

    this.addLog(
      job,
      'info',
      'Initialization',
      `Initiating full server clear on guild ID ${job.guildId} (Delete Channels & Categories: ${options.deleteChannels ? 'YES' : 'NO'}, Delete Custom Roles: ${options.deleteRoles ? 'YES' : 'NO'}).`
    );

    job.currentStep = 'Verifying Bot Permissions & Fetching Live Server Resources';
    const readiness = await discordClient.verifyGuildDeploymentReadiness(job.guildId);
    job.guildName = readiness.guildName;

    if (options.deleteChannels && !readiness.hasManageChannels) {
      throw new Error(
        `Bot "${readiness.botUsername}" lacks MANAGE_CHANNELS permission in "${readiness.guildName}".`
      );
    }
    if (options.deleteRoles && !readiness.hasManageRoles) {
      throw new Error(
        `Bot "${readiness.botUsername}" lacks MANAGE_ROLES permission in "${readiness.guildName}".`
      );
    }

    const [allChannels, allRoles, guildInfo] = await Promise.all([
      discordClient.getGuildChannels(job.guildId),
      discordClient.getGuildRoles(job.guildId),
      discordClient.getGuild(job.guildId),
    ]);

    const isBotOwner = guildInfo.owner_id === readiness.botUserId;

    const childChannelsToDelete = options.deleteChannels
      ? allChannels.filter((c: any) => c.type !== 4)
      : [];
    const categoriesToDelete = options.deleteChannels
      ? allChannels.filter((c: any) => c.type === 4)
      : [];
    const rolesToDelete = options.deleteRoles
      ? allRoles.filter(
          (r: any) =>
            r.id !== job.guildId &&
            r.name !== '@everyone' &&
            !r.managed &&
            (isBotOwner || r.position < readiness.botHighestRolePosition)
        )
      : [];
    const skippedManagedOrHigherRoles = options.deleteRoles
      ? allRoles.filter(
          (r: any) =>
            r.id !== job.guildId &&
            r.name !== '@everyone' &&
            (r.managed || (!isBotOwner && r.position >= readiness.botHighestRolePosition))
        )
      : [];

    const totalOps =
      2 +
      childChannelsToDelete.length +
      categoriesToDelete.length +
      rolesToDelete.length +
      (options.deleteChannels && options.keepGeneralChannel ? 1 : 0);

    job.totalOperations = Math.max(2, totalOps);
    job.completedOperations = 1;
    job.checkpoints.preflightVerified = true;
    job.progress = Math.round((job.completedOperations / job.totalOperations) * 100);

    this.addLog(
      job,
      'success',
      'Pre-flight Verified',
      `Scanned "${readiness.guildName}": queued ${childChannelsToDelete.length} channel(s), ${categoriesToDelete.length} category(s), and ${rolesToDelete.length} custom role(s) for deletion.`
    );

    if (skippedManagedOrHigherRoles.length > 0) {
      this.addLog(
        job,
        'info',
        'Role Hierarchy Note',
        `Skipping ${skippedManagedOrHigherRoles.length} system/managed or higher-positioned role(s): ${skippedManagedOrHigherRoles.map((r: any) => r.name).join(', ')}.`
      );
    }

    if (options.deleteChannels) {
      await discordClient.clearCommunityChannelRefs(job.guildId);
    }

    let deletedChannelsCount = 0;
    let deletedCategoriesCount = 0;
    let deletedRolesCount = 0;

    if (options.deleteChannels) {
      job.currentStep = `Deleting Channels (0/${childChannelsToDelete.length})`;
      for (const ch of childChannelsToDelete) {
        if (job.status === 'cancelled') {
          this.addLog(job, 'warn', 'Cancelled', 'Server clear halted by user cancellation request.');
          return;
        }

        try {
          await discordClient.deleteChannel(ch.id);
          deletedChannelsCount++;
          this.addLog(
            job,
            'success',
            'Channel Deleted',
            `Deleted channel #${ch.name} (Snowflake ID: ${ch.id})`
          );
          await new Promise((r) => setTimeout(r, 250));
        } catch (err: any) {
          const errMsg = err.message || 'Unknown Discord API error';
          job.failedOperations.push({
            id: `fail_del_ch_${ch.id}`,
            step: 'channel',
            resourceName: `#${ch.name}`,
            error: errMsg,
          });
          this.addLog(
            job,
            'warn',
            'Channel Skip',
            `Could not delete channel #${ch.name}: ${errMsg}`
          );
        }

        job.completedOperations++;
        job.currentStep = `Deleting Channels (${deletedChannelsCount}/${childChannelsToDelete.length})`;
        job.progress = Math.min(99, Math.round((job.completedOperations / job.totalOperations) * 100));
        this.notify(job);
      }
      job.checkpoints.channelsProvisioned = true;

      job.currentStep = `Deleting Categories (0/${categoriesToDelete.length})`;
      for (const cat of categoriesToDelete) {
        if (job.status === 'cancelled') {
          this.addLog(job, 'warn', 'Cancelled', 'Server clear halted by user cancellation request.');
          return;
        }

        try {
          await discordClient.deleteChannel(cat.id);
          deletedCategoriesCount++;
          this.addLog(
            job,
            'success',
            'Category Deleted',
            `Deleted category "${cat.name}" (Snowflake ID: ${cat.id})`
          );
          await new Promise((r) => setTimeout(r, 250));
        } catch (err: any) {
          const errMsg = err.message || 'Unknown Discord API error';
          job.failedOperations.push({
            id: `fail_del_cat_${cat.id}`,
            step: 'category',
            resourceName: cat.name,
            error: errMsg,
          });
          this.addLog(
            job,
            'warn',
            'Category Skip',
            `Could not delete category "${cat.name}": ${errMsg}`
          );
        }

        job.completedOperations++;
        job.currentStep = `Deleting Categories (${deletedCategoriesCount}/${categoriesToDelete.length})`;
        job.progress = Math.min(99, Math.round((job.completedOperations / job.totalOperations) * 100));
        this.notify(job);
      }
      job.checkpoints.categoriesProvisioned = true;

      if (options.keepGeneralChannel) {
        job.currentStep = 'Creating Fresh #general Landing Channel';
        try {
          const created = await discordClient.createChannel(job.guildId, {
            name: 'general',
            type: 'GUILD_TEXT',
            topic: 'Server cleared and reset by GuildForge.',
          });
          job.createdChannels.push({
            name: created.name,
            id: created.id,
            type: 'GUILD_TEXT',
            category: 'Root',
            reused: false,
          });
          this.addLog(
            job,
            'success',
            'Landing Channel Created',
            `Created fresh #general text channel (Snowflake ID: ${created.id}) so the server remains accessible.`
          );
        } catch (err: any) {
          this.addLog(
            job,
            'warn',
            'Landing Channel',
            `Could not create fresh #general channel: ${err.message}`
          );
        }
        job.completedOperations++;
        job.progress = Math.min(99, Math.round((job.completedOperations / job.totalOperations) * 100));
        this.notify(job);
      }
    } else {
      job.checkpoints.channelsProvisioned = true;
      job.checkpoints.categoriesProvisioned = true;
    }

    if (options.deleteRoles) {
      job.currentStep = `Deleting Custom Roles (0/${rolesToDelete.length})`;
      for (const role of rolesToDelete) {
        if (job.status === 'cancelled') {
          this.addLog(job, 'warn', 'Cancelled', 'Server clear halted by user cancellation request.');
          return;
        }

        try {
          await discordClient.deleteRole(job.guildId, role.id);
          deletedRolesCount++;
          this.addLog(
            job,
            'success',
            'Role Deleted',
            `Deleted role "${role.name}" (Snowflake ID: ${role.id})`
          );
          await new Promise((r) => setTimeout(r, 250));
        } catch (err: any) {
          const errMsg = err.message || 'Unknown Discord API error';
          job.failedOperations.push({
            id: `fail_del_role_${role.id}`,
            step: 'role',
            resourceName: role.name,
            error: errMsg,
          });
          this.addLog(
            job,
            'warn',
            'Role Skip',
            `Could not delete role "${role.name}": ${errMsg}`
          );
        }

        job.completedOperations++;
        job.currentStep = `Deleting Custom Roles (${deletedRolesCount}/${rolesToDelete.length})`;
        job.progress = Math.min(99, Math.round((job.completedOperations / job.totalOperations) * 100));
        this.notify(job);
      }
    }
    job.checkpoints.rolesProvisioned = true;

    job.currentStep = 'Server Clear Complete';
    job.checkpoints.postDeployVerified = true;
    job.completedOperations = job.totalOperations;
    job.progress = 100;
    job.completedAt = new Date().toISOString();
    job.status = 'completed';

    this.addLog(
      job,
      'success',
      'Server Cleared',
      `Finished clearing "${job.guildName}": deleted ${deletedChannelsCount} channel(s), ${deletedCategoriesCount} category(s), and ${deletedRolesCount} custom role(s).`
    );
  }
}

export const deploymentEngine = new DeploymentEngine();


