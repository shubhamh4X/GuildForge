import { GoogleGenAI, Type, Schema } from '@google/genai';
import {
  ServerBlueprint,
  DISCORD_PERMISSIONS,
  ChannelType,
  AdvancedArchitectureConfig,
  DEFAULT_ADVANCED_CONFIG,
  TicketTypeConfig,
  AutomationModuleConfig,
} from '../types/discord.ts';
import {
  autoFixBlueprintIssues,
  evaluateArchitectureCompleteness,
  verifyAutomationModules,
} from './validator.ts';

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim().length < 10) {
    throw new Error(
      'GEMINI_API_KEY is not configured on the server. Set GEMINI_API_KEY in your environment to enable Gemini AI architecture synthesis.'
    );
  }
  return new GoogleGenAI({ apiKey });
}

const MODEL_FALLBACK_CHAIN = [
  'gemini-3-flash-preview',
  'gemini-3.1-flash-lite-preview',
  'gemini-2.5-flash',
] as const;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function callGeminiJsonWithRetry(options: {
  contents: string;
  systemInstruction: string;
  responseSchema: Schema;
  temperature?: number;
}): Promise<string> {
  const ai = getAiClient();
  let lastError: any = null;

  for (let i = 0; i < MODEL_FALLBACK_CHAIN.length; i++) {
    const modelName = MODEL_FALLBACK_CHAIN[i];
    try {
      const config: Record<string, any> = {
        systemInstruction: options.systemInstruction,
        responseMimeType: 'application/json',
        responseSchema: options.responseSchema,
        temperature: options.temperature ?? 0.25,
      };

      if (modelName === 'gemini-2.5-flash') {
        config.thinkingConfig = { thinkingBudget: 0 };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: options.contents,
        config,
      });

      const text = response.text;
      if (text && text.trim().length > 2) {
        return text;
      }
      throw new Error(`Model ${modelName} returned an empty response.`);
    } catch (err: any) {
      lastError = err;
      const errMsg = String(err?.message || err || '');
      const isTransient =
        errMsg.includes('503') ||
        errMsg.includes('429') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('high demand') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('fetch failed');

      if (isTransient && i < MODEL_FALLBACK_CHAIN.length - 1) {
        await sleep(500 * (i + 1));
        continue;
      }
      if (i < MODEL_FALLBACK_CHAIN.length - 1) {
        await sleep(300);
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Gemini AI generation failed across all available models.');
}

export interface RequirementAnalysis {
  serverName: string;
  communityType: string;
  targetAudience: string;
  expectedMemberCount: number;
  securityLevel: 'standard' | 'high' | 'maximum';
  recommendedDepartments: string[];
  keyLeadershipRoles: string[];
  criticalChannelCategories: string[];
  publicAreas: string[];
  privateAreas: string[];
  recommendedSystems: Array<{
    name: string;
    type: 'native_discord' | 'architect_bot_native' | 'third_party_bot';
    reason: string;
  }>;
  onboardingSummary: string;
  moderationSummary: string;
}

const REQUIREMENT_ANALYSIS_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    serverName: { type: Type.STRING },
    communityType: { type: Type.STRING },
    targetAudience: { type: Type.STRING },
    expectedMemberCount: { type: Type.INTEGER },
    securityLevel: {
      type: Type.STRING,
      enum: ['standard', 'high', 'maximum'],
    },
    recommendedDepartments: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    keyLeadershipRoles: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    criticalChannelCategories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    publicAreas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    privateAreas: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    recommendedSystems: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: ['native_discord', 'architect_bot_native', 'third_party_bot'],
          },
          reason: { type: Type.STRING },
        },
        required: ['name', 'type', 'reason'],
      },
    },
    onboardingSummary: { type: Type.STRING },
    moderationSummary: { type: Type.STRING },
  },
  required: [
    'serverName',
    'communityType',
    'targetAudience',
    'expectedMemberCount',
    'securityLevel',
    'recommendedDepartments',
    'keyLeadershipRoles',
    'criticalChannelCategories',
    'recommendedSystems',
    'onboardingSummary',
    'moderationSummary',
  ],
};

const BLUEPRINT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING },
    description: { type: Type.STRING },
    communityType: { type: Type.STRING },
    targetAudience: { type: Type.STRING },
    expectedMemberCount: { type: Type.INTEGER },
    securityLevel: {
      type: Type.STRING,
      enum: ['standard', 'high', 'maximum'],
    },
    departments: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
    },
    roles: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          color: { type: Type.STRING },
          hoist: { type: Type.BOOLEAN },
          mentionable: { type: Type.BOOLEAN },
          department: { type: Type.STRING },
          group: { type: Type.STRING },
          hierarchyPosition: { type: Type.INTEGER },
          permissions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          description: { type: Type.STRING },
          administrativeResponsibilities: { type: Type.STRING },
          isPublic: { type: Type.BOOLEAN },
          assignmentMethod: {
            type: Type.STRING,
            enum: ['manual', 'application', 'reaction_role', 'automated', 'purchase'],
          },
        },
        required: [
          'id',
          'name',
          'color',
          'hoist',
          'mentionable',
          'department',
          'hierarchyPosition',
          'permissions',
          'description',
          'administrativeResponsibilities',
          'isPublic',
          'assignmentMethod',
        ],
      },
    },
    categories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          emoji: { type: Type.STRING },
          description: { type: Type.STRING },
          position: { type: Type.INTEGER },
          department: { type: Type.STRING },
          isPrivate: { type: Type.BOOLEAN },
          permissionOverwrites: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                roleNameOrId: { type: Type.STRING },
                allow: { type: Type.ARRAY, items: { type: Type.STRING } },
                deny: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['roleNameOrId', 'allow', 'deny'],
            },
          },
        },
        required: ['id', 'name', 'position', 'isPrivate', 'permissionOverwrites'],
      },
    },
    channels: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          type: {
            type: Type.STRING,
            enum: [
              'GUILD_TEXT',
              'GUILD_VOICE',
              'GUILD_ANNOUNCEMENT',
              'GUILD_FORUM',
              'GUILD_STAGE_VOICE',
              'GUILD_MEDIA',
            ],
          },
          categoryId: { type: Type.STRING },
          topic: { type: Type.STRING },
          purpose: { type: Type.STRING },
          slowmode: { type: Type.INTEGER },
          userLimit: { type: Type.INTEGER },
          bitrate: { type: Type.INTEGER },
          isPrivate: { type: Type.BOOLEAN },
          permissionOverwrites: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                roleNameOrId: { type: Type.STRING },
                allow: { type: Type.ARRAY, items: { type: Type.STRING } },
                deny: { type: Type.ARRAY, items: { type: Type.STRING } },
              },
              required: ['roleNameOrId', 'allow', 'deny'],
            },
          },
        },
        required: [
          'id',
          'name',
          'type',
          'categoryId',
          'purpose',
          'isPrivate',
          'permissionOverwrites',
        ],
      },
    },
    onboardingWorkflow: {
      type: Type.OBJECT,
      properties: {
        welcomeChannel: { type: Type.STRING },
        rulesChannel: { type: Type.STRING },
        verificationRole: { type: Type.STRING },
        defaultRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
        steps: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['welcomeChannel', 'rulesChannel', 'verificationRole', 'defaultRoles', 'steps'],
    },
    moderationProtocol: {
      type: Type.OBJECT,
      properties: {
        logChannel: { type: Type.STRING },
        appealsChannel: { type: Type.STRING },
        moderatorRoles: { type: Type.ARRAY, items: { type: Type.STRING } },
        actionEscalation: { type: Type.ARRAY, items: { type: Type.STRING } },
      },
      required: ['logChannel', 'appealsChannel', 'moderatorRoles', 'actionEscalation'],
    },
  },
  required: [
    'name',
    'description',
    'communityType',
    'targetAudience',
    'expectedMemberCount',
    'securityLevel',
    'departments',
    'roles',
    'categories',
    'channels',
    'onboardingWorkflow',
    'moderationProtocol',
  ],
};

export async function analyzeCommunityRequirements(input: {
  prompt: string;
  serverType?: string;
  expectedScale?: number;
  securityLevel?: 'standard' | 'high' | 'maximum';
  departments?: string[];
  advancedConfig?: AdvancedArchitectureConfig;
}): Promise<RequirementAnalysis> {
  const adv = input.advancedConfig || DEFAULT_ADVANCED_CONFIG;
  const enabledTickets = adv.tickets.ticketTypes
    .filter((t) => t.enabled)
    .map((t) => t.name)
    .join(', ');
  const enabledAutomations = adv.automations.modules
    .filter((m) => m.enabled)
    .map((m) => m.name)
    .join(', ');

  const systemInstruction = `You are a Principal Discord Infrastructure & Security Architect executing Stage 1 (Requirement Analysis).
Analyze the user's community description and return a comprehensive JSON operational analysis:
1. Extract the exact community type and member scale.
2. Identify all required departments (e.g., Executive Leadership, Administration, Operations, Community Engagement, Competitive Teams, Tournament Administration, Coaching & VOD Review, Recruitment, Support & Tickets, Moderation & Security, Media & Content, Partnerships).
3. Identify key leadership, operational, and community roles.
4. Identify critical public and private channel categories.
5. Identify required native Discord features vs. bot automation modules.`;

  const userPrompt = `Analyze this Discord server requirement:
Description: "${input.prompt}"
Archetype: ${input.serverType || 'Custom Community'}
Expected Member Scale: ${input.expectedScale || 1000} members
Security Posture: ${input.securityLevel || 'high'}
Selected Departments: ${input.departments?.length ? input.departments.join(', ') : 'Auto-detect'}
Organization Style: ${adv.structure.organizationStyle}
Enabled Ticket Flows: ${enabledTickets || 'Standard Support'}
Enabled Automation Modules: ${enabledAutomations || 'Standard Automations'}`;

  const rawText = await callGeminiJsonWithRetry({
    contents: userPrompt,
    systemInstruction,
    responseSchema: REQUIREMENT_ANALYSIS_SCHEMA,
    temperature: 0.2,
  });

  return JSON.parse(rawText) as RequirementAnalysis;
}

export async function generateServerArchitecture(
  input: {
    prompt: string;
    serverType?: string;
    expectedScale?: number;
    securityLevel?: 'standard' | 'high' | 'maximum';
    departments?: string[];
    analysis?: RequirementAnalysis;
    advancedConfig?: AdvancedArchitectureConfig;
  },
  onStageChange?: (stageNumber: number, stageLabel: string) => void
): Promise<ServerBlueprint> {
  const validPermissionKeys = Object.keys(DISCORD_PERMISSIONS).join(', ');
  const adv = input.advancedConfig || DEFAULT_ADVANCED_CONFIG;
  const scale = input.expectedScale || 1000;

  onStageChange?.(1, 'Stage 1/5: Requirement Analysis & Department Extraction');
  let analysis = input.analysis;
  if (!analysis) {
    try {
      analysis = await analyzeCommunityRequirements(input);
    } catch {

    }
  }

  onStageChange?.(2, 'Stage 2/5: Architecture Planning (Hierarchy, Categories & Channels)');

  const targetCategoryInstruction =
    adv.structure.categoryCountMode === 'custom' && !adv.structure.aiOptimizedStructure
      ? `Generate approximately ${adv.structure.customCategoryCount} categories.`
      : scale >= 1000
      ? `Generate 9 to 13 comprehensive categories covering all operational departments.`
      : `Generate 7 to 10 comprehensive categories covering all operational departments.`;

  const targetChannelInstruction =
    adv.structure.channelCountMode === 'custom' && !adv.structure.aiOptimizedStructure
      ? `Generate approximately ${adv.structure.customChannelCount} channels across all categories.`
      : scale >= 1000
      ? `Generate 32 to 48 channels across all categories (3 to 5 channels per category). NEVER generate a tiny 5-channel skeleton.`
      : `Generate 24 to 36 channels across all categories (3 to 4 channels per category).`;

  const enabledTicketsSummary = adv.tickets.ticketTypes
    .filter((t) => t.enabled)
    .map((t) => `${t.name} (Category: ${t.categoryName}, Transcript: #${t.transcriptChannel})`)
    .join('; ');

  const systemInstruction = `You are an elite Enterprise Discord Server Architect executing Stage 2 (Architecture Planning) and Stage 3 (Permission Engineering).
Design a COMPLETE, production-ready Discord server blueprint.

CRITICAL ARCHITECTURAL RULES:
1. VALID DISCORD PERMISSIONS ONLY: [${validPermissionKeys}].
2. COMPLETE ROLE HIERARCHY:
   - Generate 14 to 20 distinct roles ordered from hierarchyPosition 1 (highest) to N (lowest).
   - Position #1 (Founder / Owner) is the ONLY role with ADMINISTRATOR.
   - Include Executive Leadership, Administration, Operations Management, Coaching/Department Leads (if applicable), Competitive Rosters/Specialists, Senior & Junior Moderators, Support Specialists, Content Creators/Partners, Verified Member, and Bot roles.
3. COMPLETE CATEGORY & CHANNEL HIERARCHY:
   - ${targetCategoryInstruction}
   - ${targetChannelInstruction}
   - Include all relevant Discord channel types: GUILD_TEXT, GUILD_VOICE, GUILD_ANNOUNCEMENT, GUILD_FORUM, and GUILD_STAGE_VOICE.
   - For Esports / Competitive Gaming organizations, include: Executive & Admin HQ, Staff Operations, Welcome & Onboarding Gateway, Official Announcements, Community & Discussion Hub, Competitive Teams & Private Roster War Rooms, Scrim & Match Scheduling, Tournament Operations & Results, Coaching & VOD Review, Recruitment & Tryouts, Support & Ticket Center, Media & Content Production, Partnerships & VIP, Voice Lounges & Stage, and Moderation & Security Logs.
4. ZERO-TRUST PERMISSION OVERWRITES:
   - Every private category and private channel (isPrivate: true) MUST include an overwrite for "@everyone" with deny: ["VIEW_CHANNEL", "CONNECT"] and explicit allow overwrites for the authorized staff/team/department roles.
   - Every GUILD_ANNOUNCEMENT channel and read-only gateway channel (#welcome-and-rules, #official-announcements, #open-a-ticket) MUST deny "SEND_MESSAGES" and "MENTION_EVERYONE" for "@everyone".
5. Keep role descriptions and channel topics concise (1 sentence each) so the complete JSON blueprint fits cleanly.`;

  const userPrompt = `Synthesize a complete Discord Server Architecture Blueprint:
- Community Prompt: "${input.prompt}"
- Archetype: ${input.serverType || analysis?.communityType || 'Community'}
- Member Scale: ${scale} members
- Security Level: ${input.securityLevel || 'high'}
- Required Departments: ${
    input.departments?.length
      ? input.departments.join(', ')
      : analysis?.recommendedDepartments?.join(', ') ||
        'Executive Leadership, Administration, Operations, Community, Moderation & Security, Support'
  }
- Recommended Leadership Roles: ${analysis?.keyLeadershipRoles?.join(', ') || 'Founder, Administrator, Operations Manager, Head Moderator, Support Lead'}
- Enabled Ticket Flows: ${enabledTicketsSummary}
- Voice Settings: Bitrate ${adv.voice.defaultBitrateKbps}kbps, User Limit ${adv.voice.defaultUserLimit}`;

  const rawText = await callGeminiJsonWithRetry({
    contents: userPrompt,
    systemInstruction,
    responseSchema: BLUEPRINT_SCHEMA,
    temperature: 0.25,
  });

  const parsed = JSON.parse(rawText);

  onStageChange?.(3, 'Stage 3/5: Permission Engineering & Zero-Trust Overwrite Verification');
  let blueprint = sanitizeAndNormalizeBlueprint(parsed, adv, input.departments);

  onStageChange?.(4, 'Stage 4/5: Automation Module Planning & Dependency Mapping');
  blueprint.automationModules = verifyAutomationModules(blueprint);

  onStageChange?.(5, 'Stage 5/5: Final Blueprint Validation & Completeness Verification');
  blueprint = autoFixBlueprintIssues(blueprint, 'ALL');

  const evalResult = evaluateArchitectureCompleteness(blueprint, {
    prompt: input.prompt,
    serverType: input.serverType,
    expectedScale: scale,
    departments: input.departments,
  });
  for (const missing of evalResult.missingComponents) {
    if (missing.remediationCode) {
      blueprint = autoFixBlueprintIssues(blueprint, missing.remediationCode);
    }
  }

  blueprint.automationModules = verifyAutomationModules(blueprint);
  return blueprint;
}

export async function optimizeServerArchitecture(
  existingBlueprint: ServerBlueprint,
  optimizationInstructions?: string
): Promise<ServerBlueprint> {
  const validPermissionKeys = Object.keys(DISCORD_PERMISSIONS).join(', ');

  const systemInstruction = `You are a Principal Discord Security & Operations Architect.
Optimize and expand the provided Discord Server Blueprint JSON.
1. Preserve existing roles, categories, and channels while adding any requested workflows or fixing security gaps.
2. Only use valid Discord permissions: [${validPermissionKeys}].
3. Ensure only the #1 Founder role has ADMINISTRATOR.
4. Ensure all private categories and channels deny VIEW_CHANNEL and CONNECT to "@everyone" and grant explicit access to relevant staff/department roles.`;

  const userPrompt = `Optimize this Discord Server Blueprint:
Instructions: ${
    optimizationInstructions ||
    'Expand any missing operational departments, enforce least-privilege role permissions, and ensure complete category/channel overwrites.'
  }

Current Blueprint Summary:
Name: ${existingBlueprint.name}
Type: ${existingBlueprint.communityType} (${existingBlueprint.expectedMemberCount} members)
Departments: ${existingBlueprint.departments.join(', ')}
Current Roles (${existingBlueprint.roles.length}): ${existingBlueprint.roles.map((r) => r.name).join(', ')}
Current Categories (${existingBlueprint.categories.length}): ${existingBlueprint.categories.map((c) => c.name).join(', ')}`;

  const rawText = await callGeminiJsonWithRetry({
    contents: userPrompt,
    systemInstruction,
    responseSchema: BLUEPRINT_SCHEMA,
    temperature: 0.2,
  });

  const parsed = JSON.parse(rawText);
  let normalized = sanitizeAndNormalizeBlueprint(
    parsed,
    existingBlueprint.advancedConfig || DEFAULT_ADVANCED_CONFIG,
    existingBlueprint.departments
  );
  normalized.id = existingBlueprint.id;
  normalized.version = (existingBlueprint.version || 1) + 1;
  normalized.createdAt = existingBlueprint.createdAt;
  normalized = autoFixBlueprintIssues(normalized, 'ALL');
  return normalized;
}

function sanitizeAndNormalizeBlueprint(
  raw: any,
  advConfig: AdvancedArchitectureConfig = DEFAULT_ADVANCED_CONFIG,
  requestedDepartments?: string[]
): ServerBlueprint {
  const now = new Date().toISOString();
  const validPermSet = new Set(Object.keys(DISCORD_PERMISSIONS));

  const roles = (Array.isArray(raw.roles) ? raw.roles : []).map((r: any, idx: number) => ({
    id: r.id || `role_${idx + 1}`,
    name: r.name || `Role ${idx + 1}`,
    color: /^#[0-9A-Fa-f]{6}$/.test(r.color) ? r.color : '#7547FF',
    hoist: Boolean(r.hoist),
    mentionable: Boolean(r.mentionable),
    department: r.department || 'General',
    group: r.group || r.department || 'General',
    hierarchyPosition: typeof r.hierarchyPosition === 'number' ? r.hierarchyPosition : idx + 1,
    permissions: (Array.isArray(r.permissions) ? r.permissions : ['VIEW_CHANNEL']).filter(
      (p: string) => validPermSet.has(p)
    ),
    description: r.description || 'Community role',
    administrativeResponsibilities: r.administrativeResponsibilities || 'Standard duties',
    isPublic: Boolean(r.isPublic),
    assignmentMethod: r.assignmentMethod || 'manual',
  }));

  roles.sort((a: any, b: any) => a.hierarchyPosition - b.hierarchyPosition);
  roles.forEach((r: any, idx: number) => {
    r.hierarchyPosition = idx + 1;
  });

  const categories = (Array.isArray(raw.categories) ? raw.categories : []).map(
    (c: any, idx: number) => ({
      id: c.id || `cat_${idx + 1}`,
      name: c.name || `CATEGORY ${idx + 1}`,
      emoji: c.emoji || '',
      description: c.description || '',
      position: typeof c.position === 'number' ? c.position : idx + 1,
      department: c.department || 'General',
      isPrivate: Boolean(c.isPrivate),
      permissionOverwrites: (Array.isArray(c.permissionOverwrites)
        ? c.permissionOverwrites
        : []
      ).map((o: any) => ({
        roleNameOrId: o.roleNameOrId || '@everyone',
        allow: (Array.isArray(o.allow) ? o.allow : []).filter((p: string) => validPermSet.has(p)),
        deny: (Array.isArray(o.deny) ? o.deny : []).filter((p: string) => validPermSet.has(p)),
      })),
    })
  );

  const validCategoryIds = new Set(categories.map((c: any) => c.id));
  const fallbackCategoryId = categories[0]?.id || 'cat_1';

  const validChannelTypes: ChannelType[] = [
    'GUILD_TEXT',
    'GUILD_VOICE',
    'GUILD_ANNOUNCEMENT',
    'GUILD_FORUM',
    'GUILD_STAGE_VOICE',
    'GUILD_MEDIA',
  ];

  const channels = (Array.isArray(raw.channels) ? raw.channels : []).map(
    (ch: any, idx: number) => {
      const chType: ChannelType = validChannelTypes.includes(ch.type) ? ch.type : 'GUILD_TEXT';
      const isVoice = chType === 'GUILD_VOICE' || chType === 'GUILD_STAGE_VOICE';

      const cleanName = isVoice
        ? (ch.name || `Voice Room ${idx + 1}`).trim()
        : (ch.name || `channel-${idx + 1}`)
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^a-z0-9-_]/g, '');

      return {
        id: ch.id || `ch_${idx + 1}`,
        name: cleanName || `channel-${idx + 1}`,
        type: chType,
        categoryId: validCategoryIds.has(ch.categoryId) ? ch.categoryId : fallbackCategoryId,
        topic: ch.topic || ch.purpose || '',
        purpose: ch.purpose || 'Server operational channel',
        slowmode: typeof ch.slowmode === 'number' ? Math.max(0, ch.slowmode) : 0,
        userLimit:
          typeof ch.userLimit === 'number'
            ? Math.max(0, ch.userLimit)
            : isVoice
            ? advConfig.voice.defaultUserLimit
            : undefined,
        bitrate:
          typeof ch.bitrate === 'number'
            ? ch.bitrate
            : isVoice
            ? advConfig.voice.defaultBitrateKbps
            : undefined,
        rtcRegion: isVoice ? advConfig.voice.preferredRegion : undefined,
        isPrivate: Boolean(ch.isPrivate),
        permissionOverwrites: (Array.isArray(ch.permissionOverwrites)
          ? ch.permissionOverwrites
          : []
        ).map((o: any) => ({
          roleNameOrId: o.roleNameOrId || '@everyone',
          allow: (Array.isArray(o.allow) ? o.allow : []).filter((p: string) => validPermSet.has(p)),
          deny: (Array.isArray(o.deny) ? o.deny : []).filter((p: string) => validPermSet.has(p)),
        })),
      };
    }
  );

  const ticketArchitecture: TicketTypeConfig[] = advConfig.tickets.ticketTypes.filter(
    (t) => t.enabled
  );
  const automationModules: AutomationModuleConfig[] = advConfig.automations.modules.filter(
    (m) => m.enabled
  );

  const systems = automationModules.map((mod) => ({
    id: mod.id,
    name: mod.name,
    type: (mod.implementationStatus === 'native_discord'
      ? 'native_discord'
      : 'architect_bot_native') as 'native_discord' | 'architect_bot_native' | 'third_party_bot',
    status: (mod.implementationStatus === 'native_discord' ? 'configured' : 'recommended') as
      | 'configured'
      | 'recommended'
      | 'optional',
    description: mod.requiredConfiguration,
    requiredChannels: mod.dependencies.filter((d) => d.includes('-')),
    requiredRoles: mod.dependencies.filter((d) => !d.includes('-')),
    implementationNotes: `Module: ${mod.requiredBotModule} | Required Perms: ${mod.requiredPermissions.join(', ')}`,
    functionalBackendProvided: mod.implementationStatus === 'native_discord',
  }));

  const mergedDepartments = Array.from(
    new Set([
      ...(Array.isArray(raw.departments) ? raw.departments : []),
      ...(requestedDepartments || []),
    ])
  );

  return {
    id: `bp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    name: raw.name || 'Enterprise Discord Architecture',
    description: raw.description || 'AI-Synthesized Discord Server Architecture Blueprint',
    communityType: raw.communityType || 'Community',
    targetAudience: raw.targetAudience || 'Community Members',
    expectedMemberCount: Number(raw.expectedMemberCount) || 1000,
    securityLevel: raw.securityLevel || 'high',
    departments: mergedDepartments.length ? mergedDepartments : ['Executive Leadership', 'Operations', 'Community', 'Moderation & Security'],
    roles,
    categories,
    channels,
    systems,
    onboardingWorkflow: raw.onboardingWorkflow || {
      welcomeChannel: 'welcome-and-rules',
      rulesChannel: 'welcome-and-rules',
      verificationRole: 'Verified Member',
      defaultRoles: ['Verified Member'],
      steps: ['Read and accept rules', 'Select interest roles', 'Unlock community channels'],
    },
    moderationProtocol: raw.moderationProtocol || {
      logChannel: 'moderation-logs',
      appealsChannel: 'open-a-ticket',
      moderatorRoles: ['Moderator'],
      actionEscalation: ['Warning', 'Timeout', 'Kick', 'Ban'],
    },
    ticketArchitecture,
    automationModules,
    advancedConfig: advConfig,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
}

