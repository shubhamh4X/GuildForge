export interface DiscordPermission {
  key: string;
  name: string;
  description: string;
  flag: bigint;
  category: 'general' | 'membership' | 'text' | 'voice' | 'advanced';
}

export const DISCORD_PERMISSIONS: Record<string, bigint> = {
  CREATE_INSTANT_INVITE: 1n << 0n,
  KICK_MEMBERS: 1n << 1n,
  BAN_MEMBERS: 1n << 2n,
  ADMINISTRATOR: 1n << 3n,
  MANAGE_CHANNELS: 1n << 4n,
  MANAGE_GUILD: 1n << 5n,
  ADD_REACTIONS: 1n << 6n,
  VIEW_AUDIT_LOG: 1n << 7n,
  PRIORITY_SPEAKER: 1n << 8n,
  STREAM: 1n << 9n,
  VIEW_CHANNEL: 1n << 10n,
  SEND_MESSAGES: 1n << 11n,
  SEND_TTS_MESSAGES: 1n << 12n,
  MANAGE_MESSAGES: 1n << 13n,
  EMBED_LINKS: 1n << 14n,
  ATTACH_FILES: 1n << 15n,
  READ_MESSAGE_HISTORY: 1n << 16n,
  MENTION_EVERYONE: 1n << 17n,
  USE_EXTERNAL_EMOJIS: 1n << 18n,
  VIEW_GUILD_INSIGHTS: 1n << 19n,
  CONNECT: 1n << 20n,
  SPEAK: 1n << 21n,
  MUTE_MEMBERS: 1n << 22n,
  DEAFEN_MEMBERS: 1n << 23n,
  MOVE_MEMBERS: 1n << 24n,
  USE_VAD: 1n << 25n,
  CHANGE_NICKNAME: 1n << 26n,
  MANAGE_NICKNAMES: 1n << 27n,
  MANAGE_ROLES: 1n << 28n,
  MANAGE_WEBHOOKS: 1n << 29n,
  MANAGE_GUILD_EXPRESSIONS: 1n << 30n,
  USE_APPLICATION_COMMANDS: 1n << 31n,
  REQUEST_TO_SPEAK: 1n << 32n,
  MANAGE_EVENTS: 1n << 33n,
  MANAGE_THREADS: 1n << 34n,
  CREATE_PUBLIC_THREADS: 1n << 35n,
  CREATE_PRIVATE_THREADS: 1n << 36n,
  USE_EXTERNAL_STICKERS: 1n << 37n,
  SEND_MESSAGES_IN_THREADS: 1n << 38n,
  MODERATE_MEMBERS: 1n << 40n,
};

export const PERMISSION_LIST: {
  key: string;
  name: string;
  category: string;
  description: string;
}[] = [
  {
    key: 'VIEW_CHANNEL',
    name: 'View Channels',
    category: 'general',
    description: 'Allows members to view channels by default.',
  },
  {
    key: 'MANAGE_CHANNELS',
    name: 'Manage Channels',
    category: 'general',
    description: 'Allows members to create, edit, or delete channels.',
  },
  {
    key: 'MANAGE_ROLES',
    name: 'Manage Roles',
    category: 'general',
    description: 'Allows members to create new roles and edit or delete roles lower than theirs.',
  },
  {
    key: 'MANAGE_GUILD',
    name: 'Manage Server',
    category: 'general',
    description: 'Allows members to change the server name or switch regions.',
  },
  {
    key: 'VIEW_AUDIT_LOG',
    name: 'View Audit Log',
    category: 'general',
    description: 'Allows members to view a record of who made changes in this server.',
  },
  {
    key: 'MANAGE_WEBHOOKS',
    name: 'Manage Webhooks',
    category: 'general',
    description: 'Allows members to create, edit, or delete webhooks.',
  },
  {
    key: 'MANAGE_EVENTS',
    name: 'Manage Events',
    category: 'general',
    description: 'Allows members to create, edit, and cancel scheduled server events.',
  },
  {
    key: 'ADMINISTRATOR',
    name: 'Administrator',
    category: 'advanced',
    description: 'Grants all permissions and bypasses channel overwrites. Grant only to #1 Founder.',
  },
  {
    key: 'KICK_MEMBERS',
    name: 'Kick Members',
    category: 'membership',
    description: 'Allows members to remove other members from this server.',
  },
  {
    key: 'BAN_MEMBERS',
    name: 'Ban Members',
    category: 'membership',
    description: 'Allows members to permanently ban other members from this server.',
  },
  {
    key: 'MODERATE_MEMBERS',
    name: 'Timeout Members',
    category: 'membership',
    description: 'Allows members to place other members in timeout to prevent chatting.',
  },
  {
    key: 'CHANGE_NICKNAME',
    name: 'Change Nickname',
    category: 'membership',
    description: 'Allows members to change their own nickname.',
  },
  {
    key: 'MANAGE_NICKNAMES',
    name: 'Manage Nicknames',
    category: 'membership',
    description: 'Allows members to change nicknames of other members.',
  },
  {
    key: 'SEND_MESSAGES',
    name: 'Send Messages',
    category: 'text',
    description: 'Allows members to send messages in text channels.',
  },
  {
    key: 'SEND_MESSAGES_IN_THREADS',
    name: 'Send Messages in Threads',
    category: 'text',
    description: 'Allows members to reply inside public and private threads and forum posts.',
  },
  {
    key: 'CREATE_PUBLIC_THREADS',
    name: 'Create Public Threads',
    category: 'text',
    description: 'Allows members to spin up public discussion threads.',
  },
  {
    key: 'CREATE_PRIVATE_THREADS',
    name: 'Create Private Threads',
    category: 'text',
    description: 'Allows members to create invite-only private threads.',
  },
  {
    key: 'MANAGE_THREADS',
    name: 'Manage Threads',
    category: 'text',
    description: 'Allows members to rename, delete, close, or slowmode threads.',
  },
  {
    key: 'MANAGE_MESSAGES',
    name: 'Manage Messages',
    category: 'text',
    description: 'Allows members to delete messages by other members or pin any message.',
  },
  {
    key: 'EMBED_LINKS',
    name: 'Embed Links',
    category: 'text',
    description: 'Allows members to post links that expand rich preview cards.',
  },
  {
    key: 'ATTACH_FILES',
    name: 'Attach Files',
    category: 'text',
    description: 'Allows members to upload media, images, and files.',
  },
  {
    key: 'READ_MESSAGE_HISTORY',
    name: 'Read Message History',
    category: 'text',
    description: 'Allows members to read previous messages sent in a channel.',
  },
  {
    key: 'MENTION_EVERYONE',
    name: 'Mention @everyone',
    category: 'text',
    description: 'Allows members to trigger push notifications to all users.',
  },
  {
    key: 'USE_EXTERNAL_EMOJIS',
    name: 'Use External Emojis',
    category: 'text',
    description: 'Allows members to use custom emojis from other servers.',
  },
  {
    key: 'ADD_REACTIONS',
    name: 'Add Reactions',
    category: 'text',
    description: 'Allows members to add emoji reactions to messages.',
  },
  {
    key: 'USE_APPLICATION_COMMANDS',
    name: 'Use Slash Commands',
    category: 'text',
    description: 'Allows members to invoke bot application commands.',
  },
  {
    key: 'CONNECT',
    name: 'Connect',
    category: 'voice',
    description: 'Allows members to join voice and stage channels.',
  },
  {
    key: 'SPEAK',
    name: 'Speak',
    category: 'voice',
    description: 'Allows members to talk in voice channels.',
  },
  {
    key: 'MUTE_MEMBERS',
    name: 'Mute Members',
    category: 'voice',
    description: 'Allows members to mute other members in voice channels.',
  },
  {
    key: 'DEAFEN_MEMBERS',
    name: 'Deafen Members',
    category: 'voice',
    description: 'Allows members to deafen other members in voice channels.',
  },
  {
    key: 'MOVE_MEMBERS',
    name: 'Move Members',
    category: 'voice',
    description: 'Allows members to move other members between voice channels.',
  },
  {
    key: 'PRIORITY_SPEAKER',
    name: 'Priority Speaker',
    category: 'voice',
    description: 'Allows members to be heard more easily when talking.',
  },
  {
    key: 'STREAM',
    name: 'Video / Screen Share',
    category: 'voice',
    description: 'Allows members to share their screen or camera video.',
  },
];

export interface RoleBlueprint {
  id: string;
  name: string;
  color: string;
  hoist: boolean;
  mentionable: boolean;
  department: string;
  group?: string;
  managed?: boolean;
  hierarchyPosition: number;
  permissions: string[];
  description: string;
  administrativeResponsibilities: string;
  isPublic: boolean;
  assignmentMethod: 'manual' | 'application' | 'reaction_role' | 'automated' | 'purchase';
}

export type ChannelType =
  | 'GUILD_TEXT'
  | 'GUILD_VOICE'
  | 'GUILD_ANNOUNCEMENT'
  | 'GUILD_FORUM'
  | 'GUILD_STAGE_VOICE'
  | 'GUILD_MEDIA';

export interface PermissionOverwrite {
  roleNameOrId: string;
  allow: string[];
  deny: string[];
}

export interface ChannelBlueprint {
  id: string;
  name: string;
  type: ChannelType;
  categoryId: string;
  topic?: string;
  purpose: string;
  slowmode?: number;
  userLimit?: number;
  bitrate?: number;
  rtcRegion?: string;
  defaultAutoArchiveDuration?: number;
  nsfw?: boolean;
  isPrivate: boolean;
  permissionOverwrites: PermissionOverwrite[];
}

export interface CategoryBlueprint {
  id: string;
  name: string;
  emoji?: string;
  description?: string;
  position: number;
  department?: string;
  isPrivate: boolean;
  permissionOverwrites: PermissionOverwrite[];
}

export interface OptionalSystem {
  id: string;
  name: string;
  type: 'native_discord' | 'architect_bot_native' | 'third_party_bot';
  status: 'recommended' | 'configured' | 'optional';
  description: string;
  requiredChannels: string[];
  requiredRoles: string[];
  implementationNotes: string;
  functionalBackendProvided: boolean;
}

export interface TicketTypeConfig {
  id: string;
  name: string;
  enabled: boolean;
  categoryName: string;
  namingConvention: string;
  authorizedStaffRoles: string[];
  escalationRoles: string[];
  transcriptChannel: string;
}

export type AutomationRuntimeStatus =
  | 'Planned'
  | 'Configured'
  | 'Enabled'
  | 'Running'
  | 'Failed'
  | 'Unsupported';

export interface AutomationModuleConfig {
  id: string;
  name: string;
  enabled: boolean;
  requiredBotModule: string;
  requiredPermissions: string[];
  requiredConfiguration: string;
  dependencies: string[];
  implementationStatus: 'native_discord' | 'bot_runtime_required';
  runtimeStatus?: AutomationRuntimeStatus;
  missingDependencies?: string[];
  statusReason?: string;
}

export interface CompletenessComponent {
  id: string;
  name: string;
  category: string;
  description: string;
  satisfied: boolean;
  matchedResources: string[];
  evidence?: string;
  remediationCode?: string;
}

export interface CompletenessEvaluation {
  completionPercentage: number;
  requiredComponents: CompletenessComponent[];
  generatedComponents: CompletenessComponent[];
  missingComponents: CompletenessComponent[];
  optionalRecommendations: string[];
}

export interface ScoreBreakdownItem {
  label: string;
  delta: number;
  reason: string;
}

export interface GuildCreationEligibility {
  authorized: boolean;
  currentGuildCount: number;
  guildCount?: number;
  maxAllowedGuildsForBotCreate: number;
  reason: string;
}

export interface AdvancedArchitectureConfig {
  structure: {
    aiOptimizedStructure: boolean;
    categoryCountMode: 'auto' | 'custom';
    customCategoryCount: number;
    channelCountMode: 'auto' | 'custom';
    customChannelCount: number;
    organizationStyle: 'department' | 'functional' | 'community' | 'competitive' | 'hybrid';
    channelNamingConvention: 'lowercase-hyphens' | 'emoji-and-name' | 'clean-professional' | 'custom';
    categoryNamingStyle: 'uppercase' | 'title-case' | 'bracketed' | 'minimal';
    enableCategoryEmojis: boolean;
    enableCategoryDescriptions: boolean;
    autoGroupRelatedChannels: boolean;
    autoDeduplicateChannels: boolean;
  };
  channels: {
    textChannels: string[];
    voiceChannels: string[];
    forumChannels: string[];
    announcementChannels: string[];
    enableStageChannels: boolean;
    enableMediaChannels: boolean;
    enableThreadStructures: boolean;
  };
  roles: {
    enabledRoleGroups: string[];
    useRoleColors: boolean;
    hoistLeadershipRoles: boolean;
    allowMentionableStaffRoles: boolean;
    includeManagedBotRoles: boolean;
  };
  permissions: {
    enforceLeastPrivilege: boolean;
    privateDepartmentIsolation: boolean;
    readOnlyAnnouncements: boolean;
    strictForumPosting: boolean;
  };
  onboarding: {
    welcomeArea: boolean;
    rulesAcceptanceFlow: boolean;
    verificationArea: boolean;
    serverGuide: boolean;
    selfAssignableRoles: boolean;
    interestSelection: boolean;
    memberIntroductions: boolean;
    faqAndGettingStarted: boolean;
  };
  moderation: {
    autoModeration: boolean;
    spamProtection: boolean;
    antiRaidArchitecture: boolean;
    antiLinkPolicy: boolean;
    antiMentionSpam: boolean;
    suspiciousAccountHandling: boolean;
    logs: {
      moderationLogs: boolean;
      messageDeletionLogs: boolean;
      memberJoinLeaveLogs: boolean;
      roleModificationLogs: boolean;
      channelModificationLogs: boolean;
      banTimeoutLogs: boolean;
      staffActionLogs: boolean;
      securityAlertChannel: boolean;
    };
  };
  tickets: {
    ticketTypes: TicketTypeConfig[];
  };
  voice: {
    publicLounges: boolean;
    privateTeamRooms: boolean;
    staffMeetings: boolean;
    tournamentRooms: boolean;
    coachingRooms: boolean;
    temporaryVoiceRooms: boolean;
    afkChannel: boolean;
    stageEvents: boolean;
    defaultUserLimit: number;
    defaultBitrateKbps: number;
    preferredRegion: string;
  };
  automations: {
    modules: AutomationModuleConfig[];
  };
}

export const DEFAULT_ADVANCED_CONFIG: AdvancedArchitectureConfig = {
  structure: {
    aiOptimizedStructure: true,
    categoryCountMode: 'auto',
    customCategoryCount: 11,
    channelCountMode: 'auto',
    customChannelCount: 42,
    organizationStyle: 'hybrid',
    channelNamingConvention: 'lowercase-hyphens',
    categoryNamingStyle: 'uppercase',
    enableCategoryEmojis: true,
    enableCategoryDescriptions: true,
    autoGroupRelatedChannels: true,
    autoDeduplicateChannels: true,
  },
  channels: {
    textChannels: [
      'general-chat',
      'announcements',
      'rules',
      'welcome-info',
      'news-updates',
      'discussion',
      'qna',
      'suggestions',
      'media-sharing',
      'introductions',
      'bot-commands',
      'staff-chat',
      'dept-chat',
      'private-logs',
      'changelogs',
    ],
    voiceChannels: [
      'general-voice',
      'community-hangout',
      'gaming-rooms',
      'squad-rooms',
      'team-comms',
      'tournament-rooms',
      'coaching-rooms',
      'staff-voice',
      'meeting-rooms',
      'afk-channel',
    ],
    forumChannels: [
      'support-forum',
      'bug-reports',
      'suggestions-forum',
      'recruitment-apps',
      'tutorials-guides',
    ],
    announcementChannels: [
      'official-announcements',
      'tournament-announcements',
      'event-announcements',
      'partnership-announcements',
    ],
    enableStageChannels: true,
    enableMediaChannels: true,
    enableThreadStructures: true,
  },
  roles: {
    enabledRoleGroups: [
      'Executive Leadership',
      'Administration',
      'Moderation',
      'Community',
      'Competitive Gaming',
    ],
    useRoleColors: true,
    hoistLeadershipRoles: true,
    allowMentionableStaffRoles: true,
    includeManagedBotRoles: true,
  },
  permissions: {
    enforceLeastPrivilege: true,
    privateDepartmentIsolation: true,
    readOnlyAnnouncements: true,
    strictForumPosting: true,
  },
  onboarding: {
    welcomeArea: true,
    rulesAcceptanceFlow: true,
    verificationArea: true,
    serverGuide: true,
    selfAssignableRoles: true,
    interestSelection: true,
    memberIntroductions: true,
    faqAndGettingStarted: true,
  },
  moderation: {
    autoModeration: true,
    spamProtection: true,
    antiRaidArchitecture: true,
    antiLinkPolicy: true,
    antiMentionSpam: true,
    suspiciousAccountHandling: true,
    logs: {
      moderationLogs: true,
      messageDeletionLogs: true,
      memberJoinLeaveLogs: true,
      roleModificationLogs: true,
      channelModificationLogs: true,
      banTimeoutLogs: true,
      staffActionLogs: true,
      securityAlertChannel: true,
    },
  },
  tickets: {
    ticketTypes: [
      {
        id: 'tkt_general',
        name: 'General Support',
        enabled: true,
        categoryName: 'SUPPORT & TICKETS',
        namingConvention: 'ticket-{username}',
        authorizedStaffRoles: ['Support Specialist', 'Moderator', 'Senior Moderator'],
        escalationRoles: ['Head Moderator', 'Server Administrator'],
        transcriptChannel: 'ticket-transcripts',
      },
      {
        id: 'tkt_tech',
        name: 'Technical Support',
        enabled: true,
        categoryName: 'SUPPORT & TICKETS',
        namingConvention: 'tech-{username}',
        authorizedStaffRoles: ['Technical Support', 'Lead Developer', 'Server Administrator'],
        escalationRoles: ['Chief Technology Officer'],
        transcriptChannel: 'ticket-transcripts',
      },
      {
        id: 'tkt_report',
        name: 'Player / Member Reports',
        enabled: true,
        categoryName: 'MODERATION & APPEALS',
        namingConvention: 'report-{caseId}',
        authorizedStaffRoles: ['Moderator', 'Senior Moderator', 'Head Moderator'],
        escalationRoles: ['Server Administrator'],
        transcriptChannel: 'moderation-logs',
      },
      {
        id: 'tkt_appeal',
        name: 'Ban & Timeout Appeals',
        enabled: true,
        categoryName: 'MODERATION & APPEALS',
        namingConvention: 'appeal-{username}',
        authorizedStaffRoles: ['Senior Moderator', 'Head Moderator'],
        escalationRoles: ['Server Administrator', 'Community Director'],
        transcriptChannel: 'ban-timeout-logs',
      },
      {
        id: 'tkt_partnership',
        name: 'Partnership Inquiries',
        enabled: true,
        categoryName: 'PARTNERSHIPS & VIP',
        namingConvention: 'partner-{org}',
        authorizedStaffRoles: ['Partnerships Manager', 'Community Director'],
        escalationRoles: ['Founder', 'Co-Founder'],
        transcriptChannel: 'staff-action-logs',
      },
      {
        id: 'tkt_recruitment',
        name: 'Staff & Team Applications',
        enabled: true,
        categoryName: 'RECRUITMENT & APPLICATIONS',
        namingConvention: 'apply-{role}-{username}',
        authorizedStaffRoles: ['Recruitment Lead', 'Team Manager', 'Head Coach'],
        escalationRoles: ['Esports Director', 'Server Administrator'],
        transcriptChannel: 'staff-action-logs',
      },
      {
        id: 'tkt_tournament',
        name: 'Tournament Dispute & Admin Help',
        enabled: true,
        categoryName: 'TOURNAMENT OPERATIONS',
        namingConvention: 'match-{matchId}',
        authorizedStaffRoles: ['Tournament Referee', 'Bracket Manager', 'Tournament Director'],
        escalationRoles: ['Esports Director'],
        transcriptChannel: 'staff-action-logs',
      },
    ],
  },
  voice: {
    publicLounges: true,
    privateTeamRooms: true,
    staffMeetings: true,
    tournamentRooms: true,
    coachingRooms: true,
    temporaryVoiceRooms: false,
    afkChannel: true,
    stageEvents: true,
    defaultUserLimit: 5,
    defaultBitrateKbps: 64,
    preferredRegion: 'auto',
  },
  automations: {
    modules: [
      {
        id: 'auto_welcome',
        name: 'Welcome & Rules Gatekeeper',
        enabled: true,
        requiredBotModule: 'Discord Native Onboarding + Welcome Module',
        requiredPermissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_ROLES'],
        requiredConfiguration: 'Bind #welcome-and-rules and assign Verified Member role after rules screening.',
        dependencies: ['welcome-and-rules', 'Verified Member'],
        implementationStatus: 'native_discord',
        runtimeStatus: 'Configured',
      },
      {
        id: 'auto_automod',
        name: 'Discord AutoMod & Anti-Raid Shield',
        enabled: true,
        requiredBotModule: 'Discord Native AutoMod API',
        requiredPermissions: ['MANAGE_GUILD', 'MODERATE_MEMBERS', 'MANAGE_MESSAGES'],
        requiredConfiguration: 'Enable keyword filters, mention spam limits, and suspicious link blocking.',
        dependencies: ['security-alerts', 'moderation-logs'],
        implementationStatus: 'native_discord',
        runtimeStatus: 'Configured',
      },
      {
        id: 'auto_audit_logger',
        name: 'Granular Audit & Event Logger',
        enabled: true,
        requiredBotModule: 'GuildForge Audit Logger Runtime',
        requiredPermissions: ['VIEW_AUDIT_LOG', 'SEND_MESSAGES', 'EMBED_LINKS'],
        requiredConfiguration: 'Route GuildAuditLogEntryCreate, MessageDelete, and GuildMemberAdd/Remove events to private log channels.',
        dependencies: ['moderation-logs', 'message-logs', 'member-logs', 'role-audit-logs'],
        implementationStatus: 'bot_runtime_required',
        runtimeStatus: 'Planned',
      },
      {
        id: 'auto_tickets',
        name: 'Multi-Department Support Ticket Dispatcher',
        enabled: true,
        requiredBotModule: 'GuildForge Ticket Bot Module',
        requiredPermissions: ['MANAGE_CHANNELS', 'MANAGE_ROLES', 'SEND_MESSAGES', 'ATTACH_FILES'],
        requiredConfiguration: 'Deploy interactive ticket panel embed in #open-a-ticket and route transcripts to #ticket-transcripts.',
        dependencies: ['open-a-ticket', 'ticket-transcripts'],
        implementationStatus: 'bot_runtime_required',
        runtimeStatus: 'Planned',
      },
      {
        id: 'auto_reaction_roles',
        name: 'Self-Assignable Interest & Notification Roles',
        enabled: true,
        requiredBotModule: 'Discord Onboarding Prompts / Role Menu Module',
        requiredPermissions: ['MANAGE_ROLES', 'SEND_MESSAGES'],
        requiredConfiguration: 'Configure self-assignable ping and game/interest roles below bot hierarchy position.',
        dependencies: ['self-roles', 'Verified Member'],
        implementationStatus: 'native_discord',
        runtimeStatus: 'Configured',
      },
      {
        id: 'auto_scheduled_events',
        name: 'Tournament & Community Event Scheduler',
        enabled: true,
        requiredBotModule: 'Discord Native Scheduled Events',
        requiredPermissions: ['MANAGE_EVENTS', 'CONNECT', 'SPEAK'],
        requiredConfiguration: 'Link Stage and Tournament channels with Discord Guild Scheduled Events.',
        dependencies: ['event-announcements'],
        implementationStatus: 'native_discord',
        runtimeStatus: 'Configured',
      },
    ],
  },
};

export interface ServerBlueprint {
  id: string;
  name: string;
  icon?: string;
  description: string;
  communityType: string;
  targetAudience: string;
  expectedMemberCount: number;
  securityLevel: 'standard' | 'high' | 'maximum';
  departments: string[];
  roles: RoleBlueprint[];
  categories: CategoryBlueprint[];
  channels: ChannelBlueprint[];
  systems: OptionalSystem[];
  onboardingWorkflow: {
    welcomeChannel: string;
    rulesChannel: string;
    verificationRole: string;
    defaultRoles: string[];
    steps: string[];
  };
  moderationProtocol: {
    logChannel: string;
    appealsChannel: string;
    moderatorRoles: string[];
    actionEscalation: string[];
  };
  ticketArchitecture?: TicketTypeConfig[];
  automationModules?: AutomationModuleConfig[];
  advancedConfig?: AdvancedArchitectureConfig;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface AuditFinding {
  id?: string;
  code: string;
  title: string;
  message: string;
  resolution: string;
  elementId?: string;
  category?:
    | 'permissions'
    | 'hierarchy'
    | 'duplicates'
    | 'exposure'
    | 'staff_access'
    | 'moderation'
    | 'onboarding'
    | 'limits'
    | 'channel_types'
    | 'automations'
    | 'completeness';
  autoFixable?: boolean;
}

export interface QualityAuditReport {
  score: number;
  overallScore: number;
  overallStatus: 'ready' | 'warnings' | 'critical';
  summary: string;
  criticalErrors: AuditFinding[];
  securityWarnings: AuditFinding[];
  architecturalRecommendations: Array<{
    id?: string;
    code: string;
    title: string;
    message: string;
    impact: string;
    resolution?: string;
    autoFixable?: boolean;
  }>;
  passedChecks: Array<{
    code: string;
    title: string;
    message: string;
  }>;
  discordLimitStats: {
    roleCount: number;
    channelCount: number;
    categoryCount: number;
    voiceChannelCount: number;
    maxRoles: number;
    maxChannels: number;
  };
  stats: {
    totalRoles: number;
    totalCategories: number;
    totalChannels: number;
    textChannels: number;
    voiceChannels: number;
    forumChannels: number;
    announcementChannels: number;
    stageChannels: number;
    mediaChannels: number;
    privateChannels: number;
    publicChannels: number;
    totalOverwrites: number;
    activeAutomationCount: number;
    requiredBotPermissions: string[];
  };
  completeness?: CompletenessEvaluation;
  scoreBreakdown?: ScoreBreakdownItem[];
}

export interface DeploymentLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  step: string;
  message: string;
}

export interface FailedOperation {
  id: string;
  step: 'role' | 'role_hierarchy' | 'category' | 'channel' | 'overwrite' | 'guild_config' | 'verification';
  resourceName: string;
  error: string;
}

export interface DeploymentPlan {
  guildId: string;
  guildName: string;
  blueprintId: string;
  blueprintName: string;
  rolesToCreate: number;
  rolesToReuse: number;
  categoriesToCreate: number;
  categoriesToReuse: number;
  channelsToCreate: number;
  channelsToReuse: number;
  overwritesToConfigure?: number;
  estimatedDurationSec: number;
  botReadiness: {
    ready: boolean;
    botUsername?: string;
    botHighestRolePosition?: number;
    hasAdministrator?: boolean;
    hasManageRoles?: boolean;
    hasManageChannels?: boolean;
    missingPermissions: string[];
    error?: string;
  };
}

export interface DeploymentJob {
  id: string;
  guildId: string;
  guildName: string;
  blueprintId: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
  mode: 'real';
  progress: number;
  currentStep: string;
  totalOperations: number;
  completedOperations: number;
  logs: DeploymentLog[];
  createdRoles: Array<{ name: string; id: string; color: string; reused?: boolean }>;
  createdCategories: Array<{ name: string; id: string; reused?: boolean }>;
  createdChannels: Array<{
    name: string;
    id: string;
    type: ChannelType;
    category?: string;
    reused?: boolean;
  }>;
  failedOperations: FailedOperation[];
  checkpoints: {
    preflightVerified: boolean;
    rolesProvisioned: boolean;
    roleHierarchyPositioned?: boolean;
    categoriesProvisioned: boolean;
    channelsProvisioned: boolean;
    overwritesConfigured?: boolean;
    guildConfigured?: boolean;
    postDeployVerified: boolean;
  };
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
  inviteUrl?: string;
}

export interface ConnectedGuild {
  id: string;
  name: string;
  icon?: string;
  owner: boolean;
  permissions: string;
  botPresent: boolean;
  botHasAdmin: boolean;
  memberCount?: number;
  inviteUrl?: string;
}

