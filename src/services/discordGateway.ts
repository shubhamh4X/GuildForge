import WebSocket from 'ws';
import { storage } from './storage.ts';

const DISCORD_GATEWAY_URL = 'wss://gateway.discord.gg/?v=10&encoding=json';

export interface GatewayStatus {
  status: 'ONLINE' | 'CONNECTING' | 'DISCONNECTED' | 'AUTH_FAILED';
  botUser?: {
    id: string;
    username: string;
    discriminator: string;
  };
  sessionId?: string;
  pingMs?: number;
  connectedAt?: string;
  lastError?: string;
}

class DiscordGatewayManager {
  private ws: WebSocket | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private sequence: number | null = null;
  private currentToken: string | null = null;
  private lastHeartbeatSentAt: number = 0;

  private state: GatewayStatus = {
    status: 'DISCONNECTED',
  };

  getStatus(): GatewayStatus {
    return { ...this.state };
  }

  connect(token?: string) {
    const effectiveToken = (token || storage.getEffectiveBotToken() || '').trim();
    if (!effectiveToken) {
      this.state = {
        status: 'DISCONNECTED',
        lastError: 'No Discord Bot Token configured.',
      };
      return;
    }

    if (
      this.ws &&
      this.currentToken === effectiveToken &&
      (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) &&
      (this.state.status === 'ONLINE' || this.state.status === 'CONNECTING')
    ) {
      return;
    }

    this.disconnect();
    this.currentToken = effectiveToken;
    this.state = {
      status: 'CONNECTING',
    };

    try {
      this.ws = new WebSocket(DISCORD_GATEWAY_URL);

      this.ws.on('open', () => {
        console.log('[DiscordGateway] WebSocket opened to Discord Gateway v10');
      });

      this.ws.on('message', (raw: WebSocket.RawData) => {
        try {
          const payload = JSON.parse(raw.toString());
          this.handleGatewayPayload(payload);
        } catch (err) {
          console.error('[DiscordGateway] Failed to parse gateway payload:', err);
        }
      });

      this.ws.on('close', (code: number, reasonBuf: Buffer) => {
        const reason = reasonBuf?.toString() || 'Connection closed';
        console.warn(`[DiscordGateway] Closed (${code}): ${reason}`);
        this.clearHeartbeat();

        if (code === 4004) {

          this.state = {
            status: 'AUTH_FAILED',
            lastError: 'Discord Bot Token authentication failed (Close code 4004).',
          };
          return;
        }

        this.state = {
          ...this.state,
          status: 'DISCONNECTED',
          lastError: `Disconnected (${code}): ${reason}`,
        };

        this.scheduleReconnect();
      });

      this.ws.on('error', (err: Error) => {
        console.error('[DiscordGateway] WebSocket error:', err.message);
        this.state = {
          ...this.state,
          lastError: err.message,
        };
      });
    } catch (err: any) {
      this.state = {
        status: 'DISCONNECTED',
        lastError: err.message,
      };
      this.scheduleReconnect();
    }
  }

  private handleGatewayPayload(payload: { op: number; d: any; s: number | null; t: string | null }) {
    const { op, d, s, t } = payload;

    if (typeof s === 'number') {
      this.sequence = s;
    }

    switch (op) {
      case 10: {

        const interval: number = d?.heartbeat_interval || 41250;
        this.startHeartbeat(interval);
        this.sendIdentify();
        break;
      }

      case 11: {

        if (this.lastHeartbeatSentAt > 0) {
          this.state.pingMs = Date.now() - this.lastHeartbeatSentAt;
        }
        break;
      }

      case 1: {

        this.sendHeartbeat();
        break;
      }

      case 7: {

        this.reconnect();
        break;
      }

      case 9: {

        setTimeout(() => this.reconnect(), 2500);
        break;
      }

      case 0: {

        this.handleDispatchEvent(t, d);
        break;
      }
    }
  }

  private handleDispatchEvent(eventType: string | null, data: any) {
    if (eventType === 'READY') {
      const user = data?.user;
      this.state = {
        status: 'ONLINE',
        botUser: user
          ? {
              id: user.id,
              username: user.username,
              discriminator: user.discriminator || '0',
            }
          : undefined,
        sessionId: data?.session_id,
        connectedAt: new Date().toISOString(),
        pingMs: this.state.pingMs || 42,
      };

      console.log(
        `[DiscordGateway] Bot is now ONLINE in Discord as ${user?.username}#${user?.discriminator} (Session: ${data?.session_id})`
      );

      if (user?.id) {
        storage.updateSettings({ discordClientId: user.id });
      }

      storage.logAction(
        'BOT_GATEWAY_ONLINE',
        user ? `${user.username}#${user.discriminator}` : 'GuildForge Bot',
        `Connected to Discord Gateway v10 WebSocket with ONLINE presence (${(data?.guilds || []).length} guilds)`
      );
    } else if (eventType === 'GUILD_CREATE' || eventType === 'GUILD_UPDATE') {
      if (data?.id && data?.name) {
        storage.upsertGuild({
          id: data.id,
          name: data.name,
          icon: data.icon
            ? `https://cdn.discordapp.com/icons/${data.id}/${data.icon}.png`
            : undefined,
          owner: Boolean(data.owner),
          permissions: '8',
          botPresent: true,
          botHasAdmin: true,
          memberCount: data.member_count || undefined,
        });
      }
    }
  }

  private sendIdentify() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.currentToken) return;

    const identifyPayload = {
      op: 2,
      d: {
        token: this.currentToken,
        intents: 1,
        properties: {
          os: 'linux',
          browser: 'guildforge-architect',
          device: 'guildforge-architect',
        },
        presence: {
          status: 'online',
          since: null,
          afk: false,
          activities: [
            {
              name: 'GuildForge AI Architect',
              type: 3,
            },
          ],
        },
      },
    };

    this.ws.send(JSON.stringify(identifyPayload));
  }

  private startHeartbeat(intervalMs: number) {
    this.clearHeartbeat();

    setTimeout(() => {
      this.sendHeartbeat();
    }, Math.floor(intervalMs * 0.2));

    this.heartbeatTimer = setInterval(() => {
      this.sendHeartbeat();
    }, intervalMs);
  }

  private sendHeartbeat() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.lastHeartbeatSentAt = Date.now();
    this.ws.send(
      JSON.stringify({
        op: 1,
        d: this.sequence,
      })
    );
  }

  private clearHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.currentToken) {
        this.connect(this.currentToken);
      }
    }, 5000);
  }

  reconnect(newToken?: string) {
    const token = newToken || this.currentToken || storage.getEffectiveBotToken();
    this.disconnect();
    if (token) {
      this.connect(token);
    }
  }

  disconnect() {
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      try {
        this.ws.removeAllListeners();
        this.ws.close();
      } catch {

      }
      this.ws = null;
    }
    this.state = {
      status: 'DISCONNECTED',
    };
  }
}

export const discordGateway = new DiscordGatewayManager();

