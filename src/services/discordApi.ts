import { DISCORD_PERMISSIONS, type ChannelType } from '../types/discord.ts';

const DISCORD_API_BASE = 'https://discord.com/api/v10';

export interface DiscordApiOptions {
  botToken?: string;
}

export interface GuildReadinessReport {
  ready: boolean;
  guildId: string;
  guildName: string;
  memberCount: number;
  botUserId: string;
  botUsername: string;
  botHighestRolePosition: number;
  hasAdministrator: boolean;
  hasManageRoles: boolean;
  hasManageChannels: boolean;
  missingPermissions: string[];
  existingRoles: Array<{ id: string; name: string; position: number; managed: boolean }>;
  existingChannels: Array<{ id: string; name: string; type: number; parent_id?: string | null }>;
}

export class DiscordApiService {
  private botToken?: string;

  constructor(options?: DiscordApiOptions) {
    this.botToken = options?.botToken || process.env.DISCORD_BOT_TOKEN;
  }

  setBotToken(token: string) {
    this.botToken = token;
  }

  getBotToken(): string | undefined {
    return this.botToken;
  }

  isConfigured(): boolean {
    return Boolean(this.botToken && this.botToken.trim().length > 10);
  }

  static isValidSnowflake(id: string): boolean {
    return /^\d{15,22}$/.test(id.trim());
  }

  private async request<T>(endpoint: string, options: RequestInit = {}, retries = 4): Promise<T> {
    if (!this.botToken || this.botToken.trim().length < 10) {
      throw new Error(
        'Discord Bot Token is not configured. Please configure a valid Discord Bot Token in Settings or the Deployment panel.'
      );
    }

    const url = `${DISCORD_API_BASE}${endpoint}`;
    const headers: Record<string, string> = {
      Authorization: `Bot ${this.botToken.trim()}`,
      'Content-Type': 'application/json',
      'User-Agent': 'GuildForge-DiscordArchitect/1.0',
      ...((options.headers as Record<string, string>) || {}),
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 429) {
      let retryAfterSec = Number(res.headers.get('Retry-After') || '1');
      try {
        const body: any = await res.json();
        if (typeof body?.retry_after === 'number') {
          retryAfterSec = body.retry_after;
        }
      } catch {

      }
      const waitMs = Math.ceil(retryAfterSec * 1000) + 250;
      await new Promise((r) => setTimeout(r, waitMs));
      if (retries > 0) {
        return this.request<T>(endpoint, options, retries - 1);
      }
      throw new Error(`Discord API rate limit exceeded after multiple retries on ${endpoint}`);
    }

    if (!res.ok) {
      const errText = await res.text();
      let errorJson: any = null;
      try {
        errorJson = JSON.parse(errText);
      } catch {

      }
      const fieldInfo = errorJson?.errors ? ` — ${JSON.stringify(errorJson.errors).slice(0, 180)}` : '';
      const details = errorJson?.message
        ? `${errorJson.message}${errorJson.code ? ` (Discord Code ${errorJson.code})` : ''}${fieldInfo}`
        : `HTTP ${res.status}: ${errText.slice(0, 200)}`;
      throw new Error(details);
    }

    if (res.status === 204) {
      return {} as T;
    }

    return (await res.json()) as T;
  }

  async getBotUser(): Promise<{ id: string; username: string; discriminator: string; avatar: string | null }> {
    return this.request('/users/@me');
  }

  async getBotGuilds(): Promise<Array<{ id: string; name: string; icon: string | null; owner: boolean; permissions: string }>> {
    return this.request('/users/@me/guilds?with_counts=true');
  }

  async getGuild(guildId: string): Promise<any> {
    return this.request(`/guilds/${guildId}?with_counts=true`);
  }

  async getBotGuildMember(guildId: string, botUserId: string): Promise<any> {
    return this.request(`/guilds/${guildId}/members/${botUserId}`);
  }

  async getGuildRoles(guildId: string): Promise<any[]> {
    return this.request(`/guilds/${guildId}/roles`);
  }

  async getGuildChannels(guildId: string): Promise<any[]> {
    return this.request(`/guilds/${guildId}/channels`);
  }

  async createGuildInvite(guildId: string): Promise<string> {
    let channels = await this.getGuildChannels(guildId);
    let targetChannel = channels.find((c: any) => c.type === 0 || c.type === 5);

    if (!targetChannel) {
      targetChannel = await this.request(`/guilds/${guildId}/channels`, {
        method: 'POST',
        body: JSON.stringify({
          name: 'welcome',
          type: 0,
          topic: 'Welcome to your new Discord server created by GuildForge.',
        }),
      });
    }

    const invite: any = await this.request(`/channels/${targetChannel.id}/invites`, {
      method: 'POST',
      body: JSON.stringify({
        max_age: 0,
        max_uses: 0,
        unique: true,
      }),
    });

    return `https://discord.gg/${invite.code}`;
  }

  async checkGuildCreationEligibility(): Promise<{
    authorized: boolean;
    currentGuildCount: number;
    maxAllowedGuildsForBotCreate: number;
    reason: string;
  }> {
    if (!this.isConfigured()) {
      return {
        authorized: false,
        currentGuildCount: 0,
        maxAllowedGuildsForBotCreate: 10,
        reason:
          'Discord Bot Token is not configured. Configure a valid Bot Token or invite the bot to an existing server via OAuth2.',
      };
    }

    try {
      const guilds = await this.getBotGuilds();
      const count = Array.isArray(guilds) ? guilds.length : 0;
      if (count >= 10) {
        return {
          authorized: false,
          currentGuildCount: count,
          maxAllowedGuildsForBotCreate: 10,
          reason: `Discord API v10 restricts POST /guilds to bots in fewer than 10 servers (this bot is in ${count} servers). Please create a Discord server manually in Discord and invite the bot using the OAuth2 Bot Invite flow.`,
        };
      }
      return {
        authorized: true,
        currentGuildCount: count,
        maxAllowedGuildsForBotCreate: 10,
        reason: `Bot is in ${count}/10 servers and is eligible for Discord API v10 POST /guilds creation.`,
      };
    } catch (err: any) {
      return {
        authorized: false,
        currentGuildCount: 0,
        maxAllowedGuildsForBotCreate: 10,
        reason: `Could not verify bot guild count (${err.message}). Create a server manually in Discord and use the OAuth2 Bot Invite flow.`,
      };
    }
  }

  async createGuild(name: string): Promise<{
    id: string;
    name: string;
    icon: string | null;
    inviteUrl?: string;
  }> {
    const eligibility = await this.checkGuildCreationEligibility();
    if (!eligibility.authorized) {
      throw new Error(eligibility.reason);
    }

    const cleanName = (name || 'New GuildForge Server').trim().slice(0, 100);
    let created: any;
    try {
      created = await this.request('/guilds', {
        method: 'POST',
        body: JSON.stringify({
          name: cleanName,
        }),
      });
    } catch (err: any) {
      throw new Error(
        `Discord API rejected POST /guilds (${err.message}). Discord restricts automated server creation to eligible bots in <10 servers. Please create a server manually in Discord and invite the bot via OAuth2.`
      );
    }

    let inviteUrl: string | undefined;
    try {
      await new Promise((r) => setTimeout(r, 600));
      inviteUrl = await this.createGuildInvite(created.id);
    } catch (err: any) {
      console.warn('Could not auto-create invite link for new guild:', err.message);
    }

    return {
      id: created.id,
      name: created.name,
      icon: created.icon || null,
      inviteUrl,
    };
  }

  async verifyGuildDeploymentReadiness(guildId: string): Promise<GuildReadinessReport> {
    if (!DiscordApiService.isValidSnowflake(guildId)) {
      throw new Error(`Invalid Discord Guild ID "${guildId}". Guild IDs must be 17-20 digit Discord Snowflakes.`);
    }

    const botUser = await this.getBotUser();
    const [guild, botMember, roles, channels] = await Promise.all([
      this.getGuild(guildId),
      this.getBotGuildMember(guildId, botUser.id),
      this.getGuildRoles(guildId),
      this.getGuildChannels(guildId),
    ]);

    const botRoleIds = new Set<string>(botMember.roles || []);
    botRoleIds.add(guildId);

    let combinedPerms = 0n;
    let highestRolePos = 0;

    for (const r of roles) {
      if (botRoleIds.has(r.id)) {
        try {
          combinedPerms |= BigInt(r.permissions || '0');
        } catch {

        }
        if (typeof r.position === 'number' && r.position > highestRolePos) {
          highestRolePos = r.position;
        }
      }
    }

    const isOwner = guild.owner_id === botUser.id;
    const hasAdministrator = isOwner || (combinedPerms & DISCORD_PERMISSIONS.ADMINISTRATOR) !== 0n;
    const hasManageRoles = hasAdministrator || (combinedPerms & DISCORD_PERMISSIONS.MANAGE_ROLES) !== 0n;
    const hasManageChannels = hasAdministrator || (combinedPerms & DISCORD_PERMISSIONS.MANAGE_CHANNELS) !== 0n;

    const missingPermissions: string[] = [];
    if (!hasManageRoles) missingPermissions.push('MANAGE_ROLES');
    if (!hasManageChannels) missingPermissions.push('MANAGE_CHANNELS');

    return {
      ready: hasManageRoles && hasManageChannels,
      guildId: guild.id,
      guildName: guild.name,
      memberCount: guild.approximate_member_count || guild.member_count || 1,
      botUserId: botUser.id,
      botUsername: `${botUser.username}${botUser.discriminator && botUser.discriminator !== '0' ? `#${botUser.discriminator}` : ''}`,
      botHighestRolePosition: highestRolePos,
      hasAdministrator,
      hasManageRoles,
      hasManageChannels,
      missingPermissions,
      existingRoles: roles.map((r: any) => ({
        id: r.id,
        name: r.name,
        position: r.position,
        managed: Boolean(r.managed),
      })),
      existingChannels: channels.map((c: any) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        parent_id: c.parent_id,
      })),
    };
  }

  computePermissionBitfield(permissions: string[]): string {
    let bitfield = 0n;
    for (const perm of permissions) {
      const flag = DISCORD_PERMISSIONS[perm];
      if (flag) {
        bitfield |= flag;
      }
    }
    return bitfield.toString();
  }

  parseHexColor(hex: string): number {
    const clean = (hex || '').replace('#', '').trim();
    const num = parseInt(clean, 16);
    return isNaN(num) ? 0 : num;
  }

  mapChannelType(type: ChannelType): number {
    switch (type) {
      case 'GUILD_TEXT':
        return 0;
      case 'GUILD_VOICE':
        return 2;
      case 'GUILD_ANNOUNCEMENT':
        return 5;
      case 'GUILD_FORUM':
        return 15;
      case 'GUILD_STAGE_VOICE':
        return 13;
      case 'GUILD_MEDIA':
        return 16;
      default:
        return 0;
    }
  }

  sanitizeOverwrites(overwrites: Array<{ id: string; type: number; allow: string; deny: string }>) {
    const map = new Map<string, { id: string; type: number; allow: string; deny: string }>();
    for (const o of overwrites) {
      if (o.id && DiscordApiService.isValidSnowflake(o.id)) {
        map.set(o.id, o);
      }
    }
    return Array.from(map.values());
  }

  async createRole(
    guildId: string,
    roleData: {
      name: string;
      colorHex: string;
      hoist: boolean;
      mentionable: boolean;
      permissions: string[];
    }
  ): Promise<{ id: string; name: string }> {
    const permissionsBitfield = this.computePermissionBitfield(roleData.permissions);
    const colorInt = this.parseHexColor(roleData.colorHex);

    const created: any = await this.request(`/guilds/${guildId}/roles`, {
      method: 'POST',
      body: JSON.stringify({
        name: roleData.name.slice(0, 100),
        color: colorInt,
        hoist: Boolean(roleData.hoist),
        mentionable: Boolean(roleData.mentionable),
        permissions: permissionsBitfield,
      }),
    });

    return { id: created.id, name: created.name };
  }

  async modifyRolePositions(
    guildId: string,
    positions: Array<{ id: string; position: number }>
  ): Promise<void> {
    if (!positions.length) return;
    await this.request(`/guilds/${guildId}/roles`, {
      method: 'PATCH',
      body: JSON.stringify(positions),
    });
  }

  async createCategory(
    guildId: string,
    name: string,
    permissionOverwrites: Array<{ id: string; type: number; allow: string; deny: string }> = []
  ): Promise<{ id: string; name: string }> {
    const validOverwrites = this.sanitizeOverwrites(permissionOverwrites);

    const created: any = await this.request(`/guilds/${guildId}/channels`, {
      method: 'POST',
      body: JSON.stringify({
        name: name.slice(0, 100),
        type: 4,
        permission_overwrites: validOverwrites,
      }),
    });

    return { id: created.id, name: created.name };
  }

  async createChannel(
    guildId: string,
    channelData: {
      name: string;
      type: ChannelType;
      parentId?: string;
      topic?: string;
      slowmode?: number;
      userLimit?: number;
      bitrate?: number;
      rtcRegion?: string;
      defaultAutoArchiveDuration?: number;
      nsfw?: boolean;
      permissionOverwrites?: Array<{ id: string; type: number; allow: string; deny: string }>;
    }
  ): Promise<{ id: string; name: string }> {
    const discordType = this.mapChannelType(channelData.type);
    const isVoice = discordType === 2 || discordType === 13;

    const formattedName = isVoice
      ? channelData.name.trim().slice(0, 100)
      : channelData.name
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 100) || 'channel';

    const validOverwrites = this.sanitizeOverwrites(channelData.permissionOverwrites || []);

    const buildPayload = (typeToUse: number) => {
      const payload: any = {
        name: formattedName,
        type: typeToUse,
        permission_overwrites: validOverwrites,
      };

      if (channelData.parentId && DiscordApiService.isValidSnowflake(channelData.parentId)) {
        payload.parent_id = channelData.parentId;
      }

      if (
        channelData.topic &&
        (typeToUse === 0 || typeToUse === 5 || typeToUse === 15 || typeToUse === 16)
      ) {
        payload.topic = channelData.topic.slice(0, 1024);
      }

      if (channelData.slowmode && channelData.slowmode > 0 && (typeToUse === 0 || typeToUse === 15 || typeToUse === 16)) {
        payload.rate_limit_per_user = Math.min(channelData.slowmode, 21600);
      }

      if (
        channelData.defaultAutoArchiveDuration &&
        [60, 1440, 4320, 10080].includes(channelData.defaultAutoArchiveDuration) &&
        (typeToUse === 0 || typeToUse === 5 || typeToUse === 15)
      ) {
        payload.default_auto_archive_duration = channelData.defaultAutoArchiveDuration;
      }

      if (channelData.userLimit && channelData.userLimit > 0 && typeToUse === 2) {
        payload.user_limit = Math.min(channelData.userLimit, 99);
      }

      if (channelData.bitrate && channelData.bitrate > 0 && (typeToUse === 2 || typeToUse === 13)) {
        const bps = channelData.bitrate < 1000 ? channelData.bitrate * 1000 : channelData.bitrate;
        payload.bitrate = Math.max(8000, Math.min(bps, 96000));
      }

      if (channelData.rtcRegion && channelData.rtcRegion !== 'auto' && (typeToUse === 2 || typeToUse === 13)) {
        payload.rtc_region = channelData.rtcRegion;
      }

      if (channelData.nsfw) {
        payload.nsfw = true;
      }

      return payload;
    };

    try {
      const created: any = await this.request(`/guilds/${guildId}/channels`, {
        method: 'POST',
        body: JSON.stringify(buildPayload(discordType)),
      });
      return { id: created.id, name: created.name };
    } catch (err: any) {
      if (discordType === 5 || discordType === 15 || discordType === 16) {
        const fallbackCreated: any = await this.request(`/guilds/${guildId}/channels`, {
          method: 'POST',
          body: JSON.stringify(buildPayload(0)),
        });
        return { id: fallbackCreated.id, name: fallbackCreated.name };
      }
      if (discordType === 13) {
        const fallbackCreated: any = await this.request(`/guilds/${guildId}/channels`, {
          method: 'POST',
          body: JSON.stringify(buildPayload(2)),
        });
        return { id: fallbackCreated.id, name: fallbackCreated.name };
      }
      throw err;
    }
  }

  async upsertChannelPermissionOverwrite(
    channelId: string,
    overwriteId: string,
    overwrite: { type: number; allow: string; deny: string }
  ): Promise<void> {
    if (!DiscordApiService.isValidSnowflake(channelId) || !DiscordApiService.isValidSnowflake(overwriteId)) {
      return;
    }
    await this.request(`/channels/${channelId}/permissions/${overwriteId}`, {
      method: 'PUT',
      body: JSON.stringify({
        type: overwrite.type,
        allow: overwrite.allow,
        deny: overwrite.deny,
      }),
    });
  }

  async modifyGuildConfiguration(
    guildId: string,
    config: {
      afk_channel_id?: string | null;
      afk_timeout?: number;
      system_channel_id?: string | null;
    }
  ): Promise<void> {
    await this.request(`/guilds/${guildId}`, {
      method: 'PATCH',
      body: JSON.stringify(config),
    });
  }

  async deleteChannel(channelId: string): Promise<void> {
    await this.request(`/channels/${channelId}`, {
      method: 'DELETE',
    });
  }

  async deleteRole(guildId: string, roleId: string): Promise<void> {
    await this.request(`/guilds/${guildId}/roles/${roleId}`, {
      method: 'DELETE',
    });
  }

  async clearCommunityChannelRefs(guildId: string): Promise<void> {
    try {
      await this.request(`/guilds/${guildId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          features: [],
          rules_channel_id: null,
          public_updates_channel_id: null,
          safety_alerts_channel_id: null,
          system_channel_id: null,
        }),
      });
    } catch {

    }
  }

  static generateBotInviteUrl(clientId: string = '1566668807680958516', permissions: string = '8'): string {
    return `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(clientId.trim())}&permissions=${encodeURIComponent(permissions)}&scope=bot%20applications.commands`;
  }
}

export const discordApi = new DiscordApiService();

