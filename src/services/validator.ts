import {
  ServerBlueprint,
  QualityAuditReport,
  AuditFinding,
  DISCORD_PERMISSIONS,
  CompletenessEvaluation,
  CompletenessComponent,
  ScoreBreakdownItem,
  AutomationRuntimeStatus,
  CategoryBlueprint,
  ChannelBlueprint,
  RoleBlueprint,
} from '../types/discord.ts';

const DANGEROUS_PERMISSIONS = [
  'ADMINISTRATOR',
  'MANAGE_GUILD',
  'MANAGE_ROLES',
  'MANAGE_CHANNELS',
  'MANAGE_WEBHOOKS',
  'BAN_MEMBERS',
  'KICK_MEMBERS',
  'MENTION_EVERYONE',
];

const SUPPORTED_CHANNEL_TYPES = new Set([
  'GUILD_TEXT',
  'GUILD_VOICE',
  'GUILD_ANNOUNCEMENT',
  'GUILD_FORUM',
  'GUILD_STAGE_VOICE',
  'GUILD_MEDIA',
]);

export function evaluateArchitectureCompleteness(
  blueprint: ServerBlueprint | null,
  context?: {
    prompt?: string;
    serverType?: string;
    expectedScale?: number;
    departments?: string[];
  }
): CompletenessEvaluation {
  const combinedText = [
    blueprint?.name || '',
    blueprint?.description || '',
    blueprint?.communityType || '',
    context?.prompt || '',
    context?.serverType || '',
    ...(blueprint?.departments || []),
    ...(context?.departments || []),
  ]
    .join(' ')
    .toLowerCase();

  const scale = blueprint?.expectedMemberCount || context?.expectedScale || 1000;
  const isEsportsOrCompetitive =
    /esport|valorant|league|tournament|scrim|competitive|gaming|roster|coaching|clang|team/.test(
      combinedText
    );
  const needsTournaments =
    isEsportsOrCompetitive || /tournament|bracket|match|referee|schedule|results/.test(combinedText);
  const needsCoaching =
    isEsportsOrCompetitive || /coach|vod|analyst|training|academy|development/.test(combinedText);
  const needsRecruitment =
    isEsportsOrCompetitive ||
    scale >= 500 ||
    /recruit|application|tryout|hiring|staff app|roster/.test(combinedText);
  const needsSupportTickets =
    scale >= 250 ||
    Boolean(blueprint?.ticketArchitecture?.some((t) => t.enabled)) ||
    /support|ticket|helpdesk|appeal|report/.test(combinedText);
  const needsMediaContent =
    isEsportsOrCompetitive ||
    /media|content|creator|stream|video|graphics|production|clip|highlight/.test(combinedText);
  const needsPartnerships =
    scale >= 1000 ||
    isEsportsOrCompetitive ||
    /partner|sponsor|vip|affiliate|business|brand/.test(combinedText);

  const channels = blueprint?.channels || [];
  const categories = blueprint?.categories || [];
  const roles = blueprint?.roles || [];

  const findChannelsMatching = (regex: RegExp): string[] =>
    channels
      .filter((c) => regex.test(`${c.name} ${c.purpose || ''} ${c.topic || ''}`))
      .map((c) => `#${c.name}`);

  const findRolesMatching = (regex: RegExp): string[] =>
    roles
      .filter((r) => regex.test(`${r.name} ${r.department || ''} ${r.description || ''}`))
      .map((r) => `@${r.name}`);

  const findCategoriesMatching = (regex: RegExp): string[] =>
    categories
      .filter((cat) => regex.test(`${cat.name} ${cat.department || ''} ${cat.description || ''}`))
      .map((cat) => `[${cat.name}]`);

  const requiredComponents: CompletenessComponent[] = [];

  const execMatches = [
    ...findRolesMatching(/founder|owner|director|chief|president|admin|executive/i),
    ...findChannelsMatching(/executive|leadership|board|founder|directive|admin-hq|command/i),
  ];
  requiredComponents.push({
    id: 'comp_exec_admin',
    name: 'Executive Leadership & Administration',
    category: 'Governance',
    description: 'Executive leadership roles, administrative hierarchy, and private command channels.',
    satisfied: execMatches.length >= 2,
    matchedResources: execMatches.slice(0, 6),
    remediationCode: 'COMPLETENESS_EXEC_ADMIN',
  });

  const opsMatches = [
    ...findRolesMatching(/operations|manager|coordinator|staff|moderator/i),
    ...findChannelsMatching(/staff-chat|staff-announcements|operations|meeting|handover|internal|briefing/i),
  ];
  requiredComponents.push({
    id: 'comp_ops_staff',
    name: 'Operations & Internal Staff Communication',
    category: 'Operations',
    description: 'Internal staff coordination, operations management, and staff meeting channels.',
    satisfied: opsMatches.length >= 3,
    matchedResources: opsMatches.slice(0, 6),
    remediationCode: 'COMPLETENESS_OPS_STAFF',
  });

  const onboardingMatches = [
    ...findChannelsMatching(/welcome|rules|verify|verification|start-here|guide|self-roles|introductions/i),
    ...findRolesMatching(/verified|member|unverified/i),
  ];
  requiredComponents.push({
    id: 'comp_onboarding',
    name: 'Onboarding, Rules & Verification Gateway',
    category: 'Onboarding',
    description: 'Welcome gate, rules acceptance, verification role, and self-assignable role channels.',
    satisfied: onboardingMatches.length >= 3 && Boolean(blueprint?.onboardingWorkflow?.welcomeChannel),
    matchedResources: onboardingMatches.slice(0, 6),
    remediationCode: 'COMPLETENESS_ONBOARDING',
  });

  const communityMatches = findChannelsMatching(
    /general|chat|lounge|discussion|media|memes|polls|suggestions|qna|questions|off-topic|events/i
  );
  requiredComponents.push({
    id: 'comp_community',
    name: 'Community Engagement & Public Hub',
    category: 'Community',
    description: 'Public general chat, announcements, discussion forums, media sharing, and community events.',
    satisfied: communityMatches.length >= 4,
    matchedResources: communityMatches.slice(0, 6),
    remediationCode: 'COMPLETENESS_COMMUNITY',
  });

  const securityMatches = [
    ...findChannelsMatching(/mod-log|moderation-log|security-alert|audit-log|message-log|member-log|incident|ban-log/i),
    ...findRolesMatching(/moderator|security|sentinel|warden|guardian/i),
  ];
  requiredComponents.push({
    id: 'comp_security_logs',
    name: 'Moderation & Security Audit Architecture',
    category: 'Security',
    description: 'Dedicated private audit logs, security alert channel, and tiered moderation roles.',
    satisfied:
      securityMatches.length >= 3 &&
      channels.some((c) => c.isPrivate && /log|security|audit/i.test(c.name)),
    matchedResources: securityMatches.slice(0, 6),
    remediationCode: 'COMPLETENESS_SECURITY',
  });

  const voiceMatches = channels
    .filter((c) => c.type === 'GUILD_VOICE' || c.type === 'GUILD_STAGE_VOICE')
    .map((c) => `🔊 ${c.name}`);
  requiredComponents.push({
    id: 'comp_voice_infra',
    name: 'Voice & Stage Communication Infrastructure',
    category: 'Voice',
    description: 'Public voice lounges, squad/team voice comms, private staff voice, and AFK/Stage channels.',
    satisfied: voiceMatches.length >= (scale >= 1000 ? 4 : 2),
    matchedResources: voiceMatches.slice(0, 6),
    remediationCode: 'COMPLETENESS_VOICE',
  });

  if (needsSupportTickets) {
    const ticketMatches = [
      ...findChannelsMatching(/ticket|support|helpdesk|transcript|appeal|report|faq/i),
      ...findRolesMatching(/support|specialist|helper|moderator/i),
    ];
    requiredComponents.push({
      id: 'comp_support_tickets',
      name: 'Support & Ticket Management Workflow',
      category: 'Support',
      description: 'Ticket creation channel, private ticket transcripts, support roles, and escalation workflow.',
      satisfied:
        ticketMatches.length >= 3 &&
        channels.some((c) => /ticket|support/i.test(c.name)) &&
        channels.some((c) => /transcript|log/i.test(c.name)),
      matchedResources: ticketMatches.slice(0, 6),
      remediationCode: 'COMPLETENESS_TICKETS',
    });
  }

  if (isEsportsOrCompetitive) {
    const teamMatches = [
      ...findCategoriesMatching(/team|competitive|roster|esports|valorant|scrim|pro|academy/i),
      ...findChannelsMatching(/roster|team-|scrim|lineup|strat|tactical|comms/i),
      ...findRolesMatching(/player|roster|captain|starter|academy|team|igl/i),
    ];
    requiredComponents.push({
      id: 'comp_competitive_teams',
      name: 'Competitive Teams, Scrims & Private Team Spaces',
      category: 'Esports & Competitive',
      description: 'Dedicated team roles, private team strategy/voice channels, and scrimmage coordination.',
      satisfied:
        teamMatches.length >= 4 &&
        channels.some((c) => c.isPrivate && /team|roster|scrim|strat/i.test(c.name)),
      matchedResources: teamMatches.slice(0, 6),
      remediationCode: 'COMPLETENESS_COMPETITIVE_TEAMS',
    });
  }

  if (needsTournaments) {
    const tourneyMatches = [
      ...findCategoriesMatching(/tournament|match|competition|events/i),
      ...findChannelsMatching(/tournament|bracket|match-schedule|match-result|check-in|referee|standings|lobby/i),
      ...findRolesMatching(/tournament|referee|bracket|organizer|caster/i),
    ];
    requiredComponents.push({
      id: 'comp_tournaments',
      name: 'Tournament Administration, Match Scheduling & Results',
      category: 'Tournaments',
      description: 'Tournament announcements, brackets, match scheduling, match results, and referee check-in.',
      satisfied: tourneyMatches.length >= 3,
      matchedResources: tourneyMatches.slice(0, 6),
      remediationCode: 'COMPLETENESS_TOURNAMENTS',
    });
  }

  if (needsCoaching) {
    const coachingMatches = [
      ...findChannelsMatching(/coach|vod|review|analyst|playbook|drills|development|training/i),
      ...findRolesMatching(/coach|analyst|trainer/i),
    ];
    requiredComponents.push({
      id: 'comp_coaching',
      name: 'Coaching, VOD Review & Player Development',
      category: 'Coaching',
      description: 'Head/Assistant Coach roles, VOD review channels, tactical playbooks, and coaching voice rooms.',
      satisfied: coachingMatches.length >= 2,
      matchedResources: coachingMatches.slice(0, 6),
      remediationCode: 'COMPLETENESS_COACHING',
    });
  }

  if (needsRecruitment) {
    const recruitmentMatches = [
      ...findChannelsMatching(/recruit|tryout|application|hiring|open-positions|lfp|lft/i),
      ...findRolesMatching(/recruit|scout|applicant|trial/i),
    ];
    requiredComponents.push({
      id: 'comp_recruitment',
      name: 'Recruitment, Tryouts & Applications',
      category: 'Recruitment',
      description: 'Player tryout applications, staff recruitment forums, and scouting/trial workflows.',
      satisfied: recruitmentMatches.length >= 2,
      matchedResources: recruitmentMatches.slice(0, 6),
      remediationCode: 'COMPLETENESS_RECRUITMENT',
    });
  }

  if (needsMediaContent) {
    const mediaMatches = [
      ...findChannelsMatching(/media|content|stream|clips|highlights|graphics|production|branding|social/i),
      ...findRolesMatching(/creator|streamer|media|editor|designer|caster/i),
    ];
    requiredComponents.push({
      id: 'comp_media_content',
      name: 'Media, Streaming & Content Production',
      category: 'Media & Content',
      description: 'Creator roles, stream notifications, clips/highlights showcase, and media production workspace.',
      satisfied: mediaMatches.length >= 2,
      matchedResources: mediaMatches.slice(0, 6),
      remediationCode: 'COMPLETENESS_MEDIA',
    });
  }

  if (needsPartnerships) {
    const partnerMatches = [
      ...findChannelsMatching(/partner|sponsor|affiliate|vip|alliance|collab/i),
      ...findRolesMatching(/partner|sponsor|vip|ambassador/i),
    ];
    requiredComponents.push({
      id: 'comp_partnerships',
      name: 'Partnerships, Sponsorships & VIP Relations',
      category: 'Partnerships',
      description: 'Partner announcements, sponsor showcase, VIP lounge, and partnership inquiry channels.',
      satisfied: partnerMatches.length >= 2,
      matchedResources: partnerMatches.slice(0, 6),
      remediationCode: 'COMPLETENESS_PARTNERSHIPS',
    });
  }

  const minExpectedRoles = scale >= 2500 ? 12 : scale >= 500 ? 9 : 6;
  const minExpectedCategories = scale >= 2500 ? 8 : scale >= 500 ? 6 : 4;
  const minExpectedChannels = scale >= 2500 ? 28 : scale >= 500 ? 18 : 12;

  const scaleSatisfied =
    roles.length >= minExpectedRoles &&
    categories.length >= minExpectedCategories &&
    channels.length >= minExpectedChannels;

  requiredComponents.push({
    id: 'comp_scale_density',
    name: `Operational Scale Density (${scale.toLocaleString()} Members)`,
    category: 'Scale & Capacity',
    description: `Requires at least ${minExpectedRoles} roles, ${minExpectedCategories} categories, and ${minExpectedChannels} channels for ${scale.toLocaleString()} members.`,
    satisfied: scaleSatisfied,
    matchedResources: [
      `${roles.length}/${minExpectedRoles} Roles`,
      `${categories.length}/${minExpectedCategories} Categories`,
      `${channels.length}/${minExpectedChannels} Channels`,
    ],
    remediationCode: 'COMPLETENESS_EXPAND_ALL',
  });

  if (!blueprint) {
    return {
      completionPercentage: 0,
      requiredComponents: requiredComponents.map((c) => ({ ...c, satisfied: false, matchedResources: [] })),
      generatedComponents: [],
      missingComponents: requiredComponents.map((c) => ({ ...c, satisfied: false, matchedResources: [] })),
      optionalRecommendations: [
        'Click "Generate Complete Server Blueprint" to synthesize a full multi-department architecture.',
      ],
    };
  }

  const generatedComponents = requiredComponents.filter((c) => c.satisfied);
  const missingComponents = requiredComponents.filter((c) => !c.satisfied);

  const completionPercentage =
    requiredComponents.length > 0
      ? Math.round((generatedComponents.length / requiredComponents.length) * 100)
      : 100;

  const optionalRecommendations: string[] = [];
  if (!channels.some((c) => c.type === 'GUILD_FORUM')) {
    optionalRecommendations.push(
      'Add a GUILD_FORUM channel for structured Q&A, bug reports, or recruitment threads.'
    );
  }
  if (!channels.some((c) => c.type === 'GUILD_STAGE_VOICE')) {
    optionalRecommendations.push(
      'Add a GUILD_STAGE_VOICE channel for townhalls, AMA sessions, or tournament briefings.'
    );
  }
  if (missingComponents.length > 0) {
    optionalRecommendations.push(
      `Provision the ${missingComponents.length} missing operational workflow(s) using 1-Click Auto-Fix in Security Audit.`
    );
  }

  return {
    completionPercentage,
    requiredComponents,
    generatedComponents,
    missingComponents,
    optionalRecommendations,
  };
}

export function verifyAutomationModules(blueprint: ServerBlueprint) {
  const channelNames = new Set(blueprint.channels.map((c) => c.name.trim().toLowerCase()));
  const roleNames = new Set(blueprint.roles.map((r) => r.name.trim().toLowerCase()));

  const modules = blueprint.automationModules || blueprint.advancedConfig?.automations?.modules || [];
  return modules.map((mod) => {
    const missingDeps: string[] = [];
    for (const dep of mod.dependencies || []) {
      const cleanDep = dep.replace(/^[#@]/, '').trim().toLowerCase();
      if (!cleanDep) continue;
      const foundInChannels =
        channelNames.has(cleanDep) ||
        Array.from(channelNames).some((cn) => cn.includes(cleanDep) || cleanDep.includes(cn));
      const foundInRoles =
        roleNames.has(cleanDep) ||
        Array.from(roleNames).some((rn) => rn.includes(cleanDep) || cleanDep.includes(rn));
      if (!foundInChannels && !foundInRoles) {
        missingDeps.push(dep);
      }
    }

    const unsupportedPerms = (mod.requiredPermissions || []).filter((p) => !DISCORD_PERMISSIONS[p]);

    let runtimeStatus: AutomationRuntimeStatus = 'Planned';
    let statusReason = '';

    if (unsupportedPerms.length > 0) {
      runtimeStatus = 'Unsupported';
      statusReason = `Uses unsupported Discord permission flag(s): ${unsupportedPerms.join(', ')}`;
    } else if (!mod.enabled) {
      runtimeStatus = 'Planned';
      statusReason = 'Module is currently disabled in blueprint configuration.';
    } else if (missingDeps.length > 0) {
      runtimeStatus = 'Failed';
      statusReason = `Missing required blueprint dependencies: ${missingDeps.join(', ')}`;
    } else if (mod.implementationStatus === 'native_discord') {
      runtimeStatus = 'Configured';
      statusReason = 'Native Discord feature with all required channels and roles verified in blueprint.';
    } else {
      runtimeStatus = 'Planned';
      statusReason =
        'All target channels and roles exist in blueprint; requires active bot runtime module after server deployment.';
    }

    return {
      ...mod,
      runtimeStatus,
      missingDependencies: missingDeps,
      statusReason,
    };
  });
}

export function validateServerArchitecture(blueprint: ServerBlueprint): QualityAuditReport {
  const criticalErrors: AuditFinding[] = [];
  const securityWarnings: AuditFinding[] = [];
  const architecturalRecommendations: QualityAuditReport['architecturalRecommendations'] = [];
  const passedChecks: QualityAuditReport['passedChecks'] = [];
  const scoreBreakdown: ScoreBreakdownItem[] = [
    {
      label: 'Base Architecture Score',
      delta: 100,
      reason: 'Starting baseline before security, permission, and operational completeness checks.',
    },
  ];

  const roles = blueprint.roles || [];
  const categories = blueprint.categories || [];
  const channels = blueprint.channels || [];

  const roleNameMap = new Map<string, string>();
  roles.forEach((r) => {
    roleNameMap.set(r.name.trim().toLowerCase(), r.name);
    roleNameMap.set(r.id.trim().toLowerCase(), r.name);
  });

  const voiceChannels = channels.filter(
    (c) => c.type === 'GUILD_VOICE' || c.type === 'GUILD_STAGE_VOICE'
  );
  const textChannels = channels.filter((c) => c.type === 'GUILD_TEXT');
  const forumChannels = channels.filter((c) => c.type === 'GUILD_FORUM');
  const announcementChannels = channels.filter((c) => c.type === 'GUILD_ANNOUNCEMENT');
  const stageChannels = channels.filter((c) => c.type === 'GUILD_STAGE_VOICE');
  const mediaChannels = channels.filter((c) => c.type === 'GUILD_MEDIA');

  if (roles.length > 250) {
    criticalErrors.push({
      id: 'err_max_roles',
      code: 'DISCORD_ROLE_LIMIT',
      title: 'Role Count Exceeds Discord Limit (250)',
      message: `Blueprint defines ${roles.length} roles, exceeding Discord's maximum of 250 roles per guild.`,
      resolution: 'Consolidate redundant roles to stay below 250.',
      category: 'limits',
      autoFixable: false,
    });
  } else {
    passedChecks.push({
      code: 'DISCORD_ROLE_LIMIT_OK',
      title: 'Discord Role Limit Respected',
      message: `${roles.length} / 250 roles defined.`,
    });
  }

  const totalDiscordChannels = channels.length + categories.length;
  if (totalDiscordChannels > 500) {
    criticalErrors.push({
      id: 'err_max_channels',
      code: 'DISCORD_CHANNEL_LIMIT',
      title: 'Channel Count Exceeds Discord Limit (500)',
      message: `Blueprint defines ${totalDiscordChannels} total channels & categories, exceeding Discord's 500 limit.`,
      resolution: 'Reduce total channels or consolidate topics into Forum channels.',
      category: 'limits',
      autoFixable: false,
    });
  } else {
    passedChecks.push({
      code: 'DISCORD_CHANNEL_LIMIT_OK',
      title: 'Discord Channel Limit Respected',
      message: `${totalDiscordChannels} / 500 total channels & categories defined.`,
    });
  }

  categories.forEach((cat) => {
    const childCount = channels.filter((ch) => ch.categoryId === cat.id).length;
    if (childCount > 50) {
      criticalErrors.push({
        id: `err_cat_limit_${cat.id}`,
        code: 'CATEGORY_CHANNEL_LIMIT',
        title: 'Category Exceeds 50-Channel Discord Limit',
        message: `Category "${cat.name}" contains ${childCount} channels (Discord limit is 50 per category).`,
        resolution: `Split "${cat.name}" into multiple categories.`,
        elementId: cat.id,
        category: 'limits',
        autoFixable: false,
      });
    }
  });

  const adminRoles = roles.filter((r) => r.permissions.includes('ADMINISTRATOR'));
  if (adminRoles.length > 2) {
    securityWarnings.push({
      id: 'warn_excessive_admin',
      code: 'EXCESSIVE_ADMIN',
      title: 'Excessive Administrator Privilege Sprawl',
      message: `${adminRoles.length} roles (${adminRoles.map((r) => r.name).join(', ')}) have the full ADMINISTRATOR bitflag, increasing compromise blast radius.`,
      resolution:
        'Restrict ADMINISTRATOR to the #1 Founder/Owner role and assign granular MANAGE_CHANNELS / MANAGE_ROLES / MODERATE_MEMBERS to sub-leadership.',
      category: 'permissions',
      autoFixable: true,
    });
  } else {
    passedChecks.push({
      code: 'LEAST_PRIVILEGE_ADMIN',
      title: 'Least-Privilege Administrator Scope',
      message: `Only ${adminRoles.length} top-tier role(s) hold full ADMINISTRATOR privileges.`,
    });
  }

  roles.forEach((role) => {
    const isLowTierOrPublic =
      role.isPublic ||
      role.hierarchyPosition > Math.max(4, Math.ceil(roles.length * 0.6)) ||
      /member|guest|verified|community|visitor|fan/i.test(role.name);

    const dangerousHeld = role.permissions.filter((p) => DANGEROUS_PERMISSIONS.includes(p));
    if (isLowTierOrPublic && dangerousHeld.length > 0) {
      criticalErrors.push({
        id: `err_dangerous_public_${role.id}`,
        code: 'DANGEROUS_PUBLIC_PERMS',
        title: `Dangerous Permissions on Public/Member Role "${role.name}"`,
        message: `Role "${role.name}" holds elevated permissions [${dangerousHeld.join(', ')}] despite being a public or general member role.`,
        resolution: `Strip [${dangerousHeld.join(', ')}] from "${role.name}" immediately.`,
        elementId: role.id,
        category: 'permissions',
        autoFixable: true,
      });
    }
  });

  const positionsSeen = new Set<number>();
  let duplicatePositions = false;
  roles.forEach((r) => {
    if (positionsSeen.has(r.hierarchyPosition)) {
      duplicatePositions = true;
    }
    positionsSeen.add(r.hierarchyPosition);
  });

  if (duplicatePositions) {
    securityWarnings.push({
      id: 'warn_dup_role_pos',
      code: 'DUPLICATE_ROLE_POSITION',
      title: 'Ambiguous Role Hierarchy Positions',
      message: 'Multiple roles share the same hierarchyPosition index, which can cause unpredictable permission inheritance.',
      resolution: 'Normalize role hierarchy positions into a strict 1..N sequence.',
      category: 'hierarchy',
      autoFixable: true,
    });
  }

  const highestAdminPos = adminRoles.length
    ? Math.min(...adminRoles.map((r) => r.hierarchyPosition))
    : 1;
  roles.forEach((r) => {
    if (!r.permissions.includes('ADMINISTRATOR') && r.hierarchyPosition < highestAdminPos) {
      securityWarnings.push({
        id: `warn_hierarchy_${r.id}`,
        code: 'HIERARCHY_INVERSION',
        title: `Role Hierarchy Inversion: "${r.name}"`,
        message: `Non-administrator role "${r.name}" (pos #${r.hierarchyPosition}) is positioned above Administrator role (pos #${highestAdminPos}).`,
        resolution: 'Reorder role hierarchy so Executive/Administrator roles sit at position #1.',
        elementId: r.id,
        category: 'hierarchy',
        autoFixable: true,
      });
    }
  });

  categories.forEach((cat) => {
    const looksSensitive =
      cat.isPrivate ||
      /staff|admin|mod|executive|internal|security|audit|operations|leadership|private|coach|scrim|roster/i.test(
        cat.name
      );

    const everyoneOverwrite = cat.permissionOverwrites.find(
      (o) => o.roleNameOrId === '@everyone' || o.roleNameOrId === 'everyone'
    );
    const deniesEveryone = Boolean(everyoneOverwrite?.deny?.includes('VIEW_CHANNEL'));

    if (looksSensitive && !deniesEveryone) {
      criticalErrors.push({
        id: `err_cat_exposure_${cat.id}`,
        code: 'PUBLIC_EXPOSURE',
        title: `Private Category "${cat.name}" Exposed to @everyone`,
        message: `Category "${cat.name}" is marked private or sensitive, but lacks an explicit @everyone VIEW_CHANNEL deny overwrite.`,
        resolution: `Add @everyone deny [VIEW_CHANNEL, CONNECT] overwrite to category "${cat.name}".`,
        elementId: cat.id,
        category: 'exposure',
        autoFixable: true,
      });
    }

    if (cat.isPrivate && deniesEveryone) {
      const allowedRoles = cat.permissionOverwrites.filter(
        (o) =>
          o.roleNameOrId !== '@everyone' &&
          o.roleNameOrId !== 'everyone' &&
          o.allow.includes('VIEW_CHANNEL')
      );
      if (allowedRoles.length === 0) {
        securityWarnings.push({
          id: `warn_cat_lockout_${cat.id}`,
          code: 'STAFF_LOCKOUT',
          title: `Private Category "${cat.name}" Has No Authorized Department Roles`,
          message: `Category "${cat.name}" denies @everyone but does not explicitly grant VIEW_CHANNEL to any department or staff role.`,
          resolution: `Grant VIEW_CHANNEL to the appropriate department/staff roles on "${cat.name}".`,
          elementId: cat.id,
          category: 'staff_access',
          autoFixable: true,
        });
      }
    }
  });

  channels.forEach((ch) => {
    const parentCat = categories.find((c) => c.id === ch.categoryId);
    const looksSensitive =
      ch.isPrivate ||
      parentCat?.isPrivate ||
      /staff|admin|mod-log|audit-log|security-alert|transcript|internal|executive|command|directive|ban-log/i.test(
        ch.name
      );

    const chEveryone = ch.permissionOverwrites.find(
      (o) => o.roleNameOrId === '@everyone' || o.roleNameOrId === 'everyone'
    );
    const catEveryone = parentCat?.permissionOverwrites.find(
      (o) => o.roleNameOrId === '@everyone' || o.roleNameOrId === 'everyone'
    );

    const chDeniesView = Boolean(chEveryone?.deny?.includes('VIEW_CHANNEL'));
    const chAllowsView = Boolean(chEveryone?.allow?.includes('VIEW_CHANNEL'));
    const catDeniesView = Boolean(catEveryone?.deny?.includes('VIEW_CHANNEL'));

    if (looksSensitive && (!chDeniesView && !catDeniesView)) {
      criticalErrors.push({
        id: `err_ch_exposure_${ch.id}`,
        code: 'PUBLIC_EXPOSURE',
        title: `Sensitive Channel "#${ch.name}" Exposed to @everyone`,
        message: `Channel "#${ch.name}" contains sensitive operational or log data but is viewable by @everyone.`,
        resolution: `Mark "#${ch.name}" private and add @everyone deny [VIEW_CHANNEL, CONNECT].`,
        elementId: ch.id,
        category: 'exposure',
        autoFixable: true,
      });
    }

    if (parentCat?.isPrivate && chAllowsView) {
      criticalErrors.push({
        id: `err_inheritance_conflict_${ch.id}`,
        code: 'INHERITANCE_CONFLICT',
        title: `Permission Inheritance Conflict on "#${ch.name}"`,
        message: `Channel "#${ch.name}" sits inside private category "${parentCat.name}", but its channel overwrite explicitly ALLOWS @everyone VIEW_CHANNEL.`,
        resolution: `Remove VIEW_CHANNEL from @everyone allow list on "#${ch.name}" and enforce private inheritance.`,
        elementId: ch.id,
        category: 'permissions',
        autoFixable: true,
      });
    }

    if (ch.type === 'GUILD_ANNOUNCEMENT') {
      const deniesSend =
        Boolean(chEveryone?.deny?.includes('SEND_MESSAGES')) ||
        Boolean(catEveryone?.deny?.includes('SEND_MESSAGES'));
      if (!deniesSend) {
        securityWarnings.push({
          id: `warn_announce_open_${ch.id}`,
          code: 'OPEN_ANNOUNCEMENT_CHANNEL',
          title: `Announcement Channel "#${ch.name}" Allows Public Posting`,
          message: `Announcement channel "#${ch.name}" does not deny SEND_MESSAGES for @everyone.`,
          resolution: `Add @everyone deny [SEND_MESSAGES, MENTION_EVERYONE] on "#${ch.name}".`,
          elementId: ch.id,
          category: 'permissions',
          autoFixable: true,
        });
      }
    }

    if (!SUPPORTED_CHANNEL_TYPES.has(ch.type)) {
      criticalErrors.push({
        id: `err_unsupported_type_${ch.id}`,
        code: 'UNSUPPORTED_CHANNEL_TYPE',
        title: `Unsupported Discord Channel Type on "#${ch.name}"`,
        message: `Channel "#${ch.name}" uses type "${ch.type}", which is not supported by Discord REST API v10.`,
        resolution: 'Convert channel type to GUILD_TEXT.',
        elementId: ch.id,
        category: 'channel_types',
        autoFixable: true,
      });
    }
  });

  const seenRoleNames = new Set<string>();
  roles.forEach((r) => {
    const key = r.name.trim().toLowerCase();
    if (seenRoleNames.has(key)) {
      securityWarnings.push({
        id: `warn_dup_role_${r.id}`,
        code: 'DUPLICATE_RESOURCE',
        title: `Duplicate Role Name "${r.name}"`,
        message: `Multiple roles are named "${r.name}".`,
        resolution: 'Deduplicate or rename the redundant role.',
        elementId: r.id,
        category: 'duplicates',
        autoFixable: true,
      });
    }
    seenRoleNames.add(key);
  });

  const seenChanKeys = new Set<string>();
  channels.forEach((ch) => {
    const key = `${ch.categoryId}:${ch.name.trim().toLowerCase()}`;
    if (seenChanKeys.has(key)) {
      securityWarnings.push({
        id: `warn_dup_ch_${ch.id}`,
        code: 'DUPLICATE_RESOURCE',
        title: `Duplicate Channel "#${ch.name}" in Same Category`,
        message: `Channel "#${ch.name}" appears multiple times inside the same parent category.`,
        resolution: 'Remove duplicate channel definitions.',
        elementId: ch.id,
        category: 'duplicates',
        autoFixable: true,
      });
    }
    seenChanKeys.add(key);
  });

  const hasModLog = channels.some(
    (c) => c.isPrivate && /mod-log|moderation-log|audit-log|security-alert/i.test(c.name)
  );
  if (!hasModLog) {
    criticalErrors.push({
      id: 'err_missing_mod_logs',
      code: 'MISSING_MOD_LOGS',
      title: 'Missing Private Moderation & Security Audit Logs',
      message: 'Blueprint lacks a private moderation/audit log channel for tracking bans, deletions, and security alerts.',
      resolution: 'Create a private Security & Logs category with #moderation-logs and #security-alerts.',
      category: 'moderation',
      autoFixable: true,
    });
  } else {
    passedChecks.push({
      code: 'MOD_LOGS_PRESENT',
      title: 'Private Security & Audit Logging Configured',
      message: 'Dedicated private channels exist for moderation and security audit trails.',
    });
  }

  const verifiedAutomations = verifyAutomationModules(blueprint);
  verifiedAutomations.forEach((mod) => {
    if (mod.enabled && mod.missingDependencies && mod.missingDependencies.length > 0) {
      securityWarnings.push({
        id: `warn_auto_deps_${mod.id}`,
        code: 'AUTOMATION_MISSING_DEPS',
        title: `Automation Module "${mod.name}" Missing Dependencies`,
        message: `Module "${mod.name}" requires [${mod.missingDependencies.join(', ')}], which do not exist in the current blueprint.`,
        resolution: `Provision missing channels/roles [${mod.missingDependencies.join(', ')}] or update module dependencies.`,
        elementId: mod.id,
        category: 'automations',
        autoFixable: true,
      });
    }
  });

  const completeness = evaluateArchitectureCompleteness(blueprint);
  completeness.missingComponents.forEach((missing) => {
    securityWarnings.push({
      id: `warn_missing_${missing.id}`,
      code: missing.remediationCode || 'INCOMPLETE_ARCHITECTURE_WORKFLOW',
      title: `Missing Required Operational Workflow: ${missing.name}`,
      message: `${missing.description} (Currently matched: ${
        missing.matchedResources.length > 0 ? missing.matchedResources.join(', ') : 'None'
      }).`,
      resolution: `Click Auto-Fix to automatically synthesize the required roles, category, channels, and permissions for ${missing.name}.`,
      category: 'completeness',
      autoFixable: true,
    });

    architecturalRecommendations.push({
      id: `rec_${missing.id}`,
      code: missing.remediationCode || 'COMPLETENESS_EXPAND_ALL',
      title: `Provision ${missing.name}`,
      message: missing.description,
      impact: 'High Operational Completeness & Readiness',
      resolution: `Synthesize ${missing.name} channels, roles, and least-privilege overwrites.`,
      autoFixable: true,
    });
  });

  if (forumChannels.length === 0) {
    architecturalRecommendations.push({
      id: 'rec_add_forum',
      code: 'REC_ADD_FORUM',
      title: 'Add Structured Discord Forum Channel',
      message: 'Convert Q&A, Bug Reports, or Recruitment into a GUILD_FORUM channel for threaded organization.',
      impact: 'Reduces text channel clutter for large communities.',
      resolution: 'Add a #community-support-forum (GUILD_FORUM) channel.',
      autoFixable: true,
    });
  }

  if (stageChannels.length === 0) {
    architecturalRecommendations.push({
      id: 'rec_add_stage',
      code: 'REC_ADD_STAGE',
      title: 'Add Stage Broadcast Channel',
      message: 'Include a GUILD_STAGE_VOICE channel for community townhalls, tournament briefings, or AMAs.',
      impact: 'Enables moderated speaker/audience events.',
      resolution: 'Add a Community Townhall Stage channel.',
      autoFixable: true,
    });
  }

  const requiredBotPermsSet = new Set<string>([
    'VIEW_CHANNEL',
    'MANAGE_ROLES',
    'MANAGE_CHANNELS',
    'SEND_MESSAGES',
    'EMBED_LINKS',
    'READ_MESSAGE_HISTORY',
  ]);
  roles.forEach((r) => {
    r.permissions.forEach((p) => {
      if (DISCORD_PERMISSIONS[p]) requiredBotPermsSet.add(p);
    });
  });
  verifiedAutomations
    .filter((m) => m.enabled)
    .forEach((m) => {
      m.requiredPermissions.forEach((p) => {
        if (DISCORD_PERMISSIONS[p]) requiredBotPermsSet.add(p);
      });
    });

  let score = 100;

  if (criticalErrors.length > 0) {
    const deduction = Math.min(60, criticalErrors.length * 14);
    score -= deduction;
    scoreBreakdown.push({
      label: `${criticalErrors.length} Critical Security / Exposure Error(s)`,
      delta: -deduction,
      reason: criticalErrors.map((e) => e.title).slice(0, 3).join('; '),
    });
  }

  const nonCompletenessWarnings = securityWarnings.filter((w) => w.category !== 'completeness');
  if (nonCompletenessWarnings.length > 0) {
    const deduction = Math.min(25, nonCompletenessWarnings.length * 4);
    score -= deduction;
    scoreBreakdown.push({
      label: `${nonCompletenessWarnings.length} Permission / Hierarchy Warning(s)`,
      delta: -deduction,
      reason: nonCompletenessWarnings.map((w) => w.title).slice(0, 3).join('; '),
    });
  }

  if (completeness.missingComponents.length > 0) {
    const deduction = Math.min(35, completeness.missingComponents.length * 5);
    score -= deduction;
    scoreBreakdown.push({
      label: `${completeness.missingComponents.length} Missing Operational Requirement(s) (${completeness.completionPercentage}% Complete)`,
      delta: -deduction,
      reason: `Missing workflows: ${completeness.missingComponents.map((m) => m.name).slice(0, 4).join(', ')}`,
    });
  } else {
    scoreBreakdown.push({
      label: '100% Operational Requirement Coverage',
      delta: 0,
      reason: `All ${completeness.requiredComponents.length} required community & departmental workflows are present.`,
    });
  }

  score = Math.max(5, Math.min(100, Math.round(score)));

  const overallStatus: QualityAuditReport['overallStatus'] =
    criticalErrors.length > 0
      ? 'critical'
      : securityWarnings.length > 0 || score < 90
      ? 'warnings'
      : 'ready';

  const privateChannelsCount = channels.filter((c) => {
    const parent = categories.find((cat) => cat.id === c.categoryId);
    return Boolean(c.isPrivate || parent?.isPrivate);
  }).length;

  const totalOverwrites =
    categories.reduce((acc, c) => acc + (c.permissionOverwrites?.length || 0), 0) +
    channels.reduce((acc, c) => acc + (c.permissionOverwrites?.length || 0), 0);

  return {
    score,
    overallScore: score,
    overallStatus,
    summary:
      overallStatus === 'ready'
        ? `Blueprint passes all zero-trust security, hierarchy, and operational completeness checks (${completeness.completionPercentage}% requirement coverage).`
        : `Detected ${criticalErrors.length} critical error(s), ${nonCompletenessWarnings.length} security warning(s), and ${completeness.missingComponents.length} missing operational workflow(s).`,
    criticalErrors,
    securityWarnings,
    architecturalRecommendations,
    passedChecks,
    discordLimitStats: {
      roleCount: roles.length,
      channelCount: totalDiscordChannels,
      categoryCount: categories.length,
      voiceChannelCount: voiceChannels.length,
      maxRoles: 250,
      maxChannels: 500,
    },
    stats: {
      totalRoles: roles.length,
      totalCategories: categories.length,
      totalChannels: channels.length,
      textChannels: textChannels.length,
      voiceChannels: voiceChannels.length,
      forumChannels: forumChannels.length,
      announcementChannels: announcementChannels.length,
      stageChannels: stageChannels.length,
      mediaChannels: mediaChannels.length,
      privateChannels: privateChannelsCount,
      publicChannels: channels.length - privateChannelsCount,
      totalOverwrites,
      activeAutomationCount: verifiedAutomations.filter((m) => m.enabled).length,
      requiredBotPermissions: Array.from(requiredBotPermsSet),
    },
    completeness,
    scoreBreakdown,
  };
}

function ensureRole(
  bp: ServerBlueprint,
  spec: {
    name: string;
    color: string;
    department: string;
    permissions: string[];
    description: string;
    isPublic?: boolean;
    hoist?: boolean;
  }
): RoleBlueprint {
  const existing = bp.roles.find(
    (r) => r.name.trim().toLowerCase() === spec.name.trim().toLowerCase()
  );
  if (existing) return existing;

  const newRole: RoleBlueprint = {
    id: `r_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: spec.name,
    color: spec.color,
    hoist: spec.hoist ?? true,
    mentionable: true,
    department: spec.department,
    group: spec.department,
    hierarchyPosition: Math.max(2, bp.roles.length),
    permissions: spec.permissions,
    description: spec.description,
    administrativeResponsibilities: spec.description,
    isPublic: Boolean(spec.isPublic),
    assignmentMethod: spec.isPublic ? 'automated' : 'manual',
  };
  bp.roles.push(newRole);
  return newRole;
}

function ensureCategory(
  bp: ServerBlueprint,
  spec: {
    name: string;
    emoji: string;
    department: string;
    description: string;
    isPrivate: boolean;
    allowedRoles?: string[];
  }
): CategoryBlueprint {
  const existing = bp.categories.find((c) =>
    c.name.trim().toLowerCase().includes(spec.name.trim().toLowerCase())
  );
  if (existing) return existing;

  const overwrites: CategoryBlueprint['permissionOverwrites'] = [];
  if (spec.isPrivate) {
    overwrites.push({
      roleNameOrId: '@everyone',
      allow: [],
      deny: ['VIEW_CHANNEL', 'CONNECT'],
    });
    for (const rName of spec.allowedRoles || []) {
      overwrites.push({
        roleNameOrId: rName,
        allow: [
          'VIEW_CHANNEL',
          'SEND_MESSAGES',
          'READ_MESSAGE_HISTORY',
          'CONNECT',
          'SPEAK',
          'EMBED_LINKS',
          'ATTACH_FILES',
        ],
        deny: [],
      });
    }
  }

  const newCat: CategoryBlueprint = {
    id: `cat_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: spec.name,
    emoji: spec.emoji,
    department: spec.department,
    description: spec.description,
    position: bp.categories.length + 1,
    isPrivate: spec.isPrivate,
    permissionOverwrites: overwrites,
  };
  bp.categories.push(newCat);
  return newCat;
}

function ensureChannel(
  bp: ServerBlueprint,
  spec: {
    name: string;
    type: ChannelBlueprint['type'];
    categoryId: string;
    purpose: string;
    topic?: string;
    isPrivate: boolean;
    slowmode?: number;
    userLimit?: number;
    bitrate?: number;
    allowedRoles?: string[];
    readOnlyForEveryone?: boolean;
  }
): ChannelBlueprint {
  const cleanName =
    spec.type === 'GUILD_VOICE' || spec.type === 'GUILD_STAGE_VOICE'
      ? spec.name.trim()
      : spec.name.trim().toLowerCase().replace(/\s+/g, '-');

  const existing = bp.channels.find(
    (c) => c.name.trim().toLowerCase() === cleanName.toLowerCase()
  );
  if (existing) return existing;

  const overwrites: ChannelBlueprint['permissionOverwrites'] = [];
  if (spec.isPrivate) {
    overwrites.push({
      roleNameOrId: '@everyone',
      allow: [],
      deny: ['VIEW_CHANNEL', 'CONNECT'],
    });
    for (const rName of spec.allowedRoles || []) {
      overwrites.push({
        roleNameOrId: rName,
        allow: [
          'VIEW_CHANNEL',
          'SEND_MESSAGES',
          'READ_MESSAGE_HISTORY',
          'CONNECT',
          'SPEAK',
          'EMBED_LINKS',
          'ATTACH_FILES',
        ],
        deny: [],
      });
    }
  } else if (spec.readOnlyForEveryone) {
    overwrites.push({
      roleNameOrId: '@everyone',
      allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
      deny: ['SEND_MESSAGES', 'MENTION_EVERYONE', 'CREATE_PUBLIC_THREADS'],
    });
    for (const rName of spec.allowedRoles || []) {
      overwrites.push({
        roleNameOrId: rName,
        allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'MENTION_EVERYONE'],
        deny: [],
      });
    }
  }

  const newCh: ChannelBlueprint = {
    id: `ch_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    type: spec.type,
    categoryId: spec.categoryId,
    topic: spec.topic || spec.purpose,
    purpose: spec.purpose,
    slowmode: spec.slowmode || 0,
    userLimit: spec.userLimit,
    bitrate: spec.bitrate,
    isPrivate: spec.isPrivate,
    permissionOverwrites: overwrites,
  };
  bp.channels.push(newCh);
  return newCh;
}

export function autoFixBlueprintIssues(
  blueprint: ServerBlueprint,
  targetCodeOrId?: string
): ServerBlueprint {
  const bp: ServerBlueprint = JSON.parse(JSON.stringify(blueprint));
  const fixAll = !targetCodeOrId || targetCodeOrId === 'ALL' || targetCodeOrId === 'COMPLETENESS_EXPAND_ALL';

  const matchesTarget = (...codes: string[]) =>
    fixAll ||
    codes.some(
      (c) =>
        targetCodeOrId === c ||
        (targetCodeOrId && targetCodeOrId.toLowerCase().includes(c.toLowerCase()))
    );

  if (matchesTarget('EXCESSIVE_ADMIN', 'warn_excessive_admin')) {
    const sorted = [...bp.roles].sort((a, b) => a.hierarchyPosition - b.hierarchyPosition);
    sorted.forEach((r, idx) => {
      if (idx > 0 && r.permissions.includes('ADMINISTRATOR')) {
        r.permissions = r.permissions.filter((p) => p !== 'ADMINISTRATOR');
        const fallbackElevated = ['MANAGE_GUILD', 'MANAGE_ROLES', 'MANAGE_CHANNELS', 'VIEW_AUDIT_LOG', 'MODERATE_MEMBERS'];
        fallbackElevated.forEach((p) => {
          if (!r.permissions.includes(p)) r.permissions.push(p);
        });
      }
    });
    bp.roles = sorted;
  }

  if (matchesTarget('DANGEROUS_PUBLIC_PERMS', 'err_dangerous_public')) {
    bp.roles.forEach((role) => {
      const isLowTierOrPublic =
        role.isPublic ||
        role.hierarchyPosition > Math.max(4, Math.ceil(bp.roles.length * 0.6)) ||
        /member|guest|verified|community|visitor|fan/i.test(role.name);
      if (isLowTierOrPublic) {
        role.permissions = role.permissions.filter((p) => !DANGEROUS_PERMISSIONS.includes(p));
      }
    });
  }

  if (matchesTarget('HIERARCHY_INVERSION', 'DUPLICATE_ROLE_POSITION', 'warn_hierarchy', 'warn_dup_role_pos')) {
    bp.roles.sort((a, b) => {
      const aAdmin = a.permissions.includes('ADMINISTRATOR') ? 0 : 1;
      const bAdmin = b.permissions.includes('ADMINISTRATOR') ? 0 : 1;
      if (aAdmin !== bAdmin) return aAdmin - bAdmin;
      return a.hierarchyPosition - b.hierarchyPosition;
    });
    bp.roles.forEach((r, idx) => {
      r.hierarchyPosition = idx + 1;
    });
  }

  const topStaffRoles = bp.roles
    .filter((r) => !r.isPublic && r.hierarchyPosition <= Math.max(4, Math.ceil(bp.roles.length * 0.4)))
    .map((r) => r.name)
    .slice(0, 4);

  if (matchesTarget('PUBLIC_EXPOSURE', 'STAFF_LOCKOUT', 'err_cat_exposure', 'warn_cat_lockout')) {
    bp.categories.forEach((cat) => {
      const looksSensitive =
        cat.isPrivate ||
        /staff|admin|mod|executive|internal|security|audit|operations|leadership|private|coach|scrim|roster/i.test(
          cat.name
        );
      if (looksSensitive) {
        cat.isPrivate = true;
        let ev = cat.permissionOverwrites.find(
          (o) => o.roleNameOrId === '@everyone' || o.roleNameOrId === 'everyone'
        );
        if (!ev) {
          ev = { roleNameOrId: '@everyone', allow: [], deny: ['VIEW_CHANNEL', 'CONNECT'] };
          cat.permissionOverwrites.push(ev);
        } else {
          ev.allow = ev.allow.filter((p) => p !== 'VIEW_CHANNEL' && p !== 'CONNECT');
          if (!ev.deny.includes('VIEW_CHANNEL')) ev.deny.push('VIEW_CHANNEL');
          if (!ev.deny.includes('CONNECT')) ev.deny.push('CONNECT');
        }

        const hasAllowedRole = cat.permissionOverwrites.some(
          (o) => o.roleNameOrId !== '@everyone' && o.allow.includes('VIEW_CHANNEL')
        );
        if (!hasAllowedRole && topStaffRoles.length > 0) {
          topStaffRoles.slice(0, 2).forEach((rName) => {
            cat.permissionOverwrites.push({
              roleNameOrId: rName,
              allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'CONNECT', 'SPEAK'],
              deny: [],
            });
          });
        }
      }
    });
  }

  if (
    matchesTarget(
      'PUBLIC_EXPOSURE',
      'INHERITANCE_CONFLICT',
      'OPEN_ANNOUNCEMENT_CHANNEL',
      'UNSUPPORTED_CHANNEL_TYPE',
      'err_ch_exposure',
      'err_inheritance_conflict',
      'warn_announce_open'
    )
  ) {
    bp.channels.forEach((ch) => {
      if (!SUPPORTED_CHANNEL_TYPES.has(ch.type)) {
        ch.type = 'GUILD_TEXT';
      }

      const parentCat = bp.categories.find((c) => c.id === ch.categoryId);
      const looksSensitive =
        ch.isPrivate ||
        parentCat?.isPrivate ||
        /staff|admin|mod-log|audit-log|security-alert|transcript|internal|executive|command|directive|ban-log/i.test(
          ch.name
        );

      if (looksSensitive) {
        ch.isPrivate = true;
        let ev = ch.permissionOverwrites.find(
          (o) => o.roleNameOrId === '@everyone' || o.roleNameOrId === 'everyone'
        );
        if (!ev) {
          ev = { roleNameOrId: '@everyone', allow: [], deny: ['VIEW_CHANNEL', 'CONNECT'] };
          ch.permissionOverwrites.push(ev);
        } else {
          ev.allow = ev.allow.filter((p) => p !== 'VIEW_CHANNEL' && p !== 'CONNECT');
          if (!ev.deny.includes('VIEW_CHANNEL')) ev.deny.push('VIEW_CHANNEL');
          if (!ev.deny.includes('CONNECT')) ev.deny.push('CONNECT');
        }

        const hasStaff = ch.permissionOverwrites.some(
          (o) => o.roleNameOrId !== '@everyone' && o.allow.includes('VIEW_CHANNEL')
        );
        if (!hasStaff && topStaffRoles.length > 0) {
          ch.permissionOverwrites.push({
            roleNameOrId: topStaffRoles[0],
            allow: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'CONNECT', 'SPEAK'],
            deny: [],
          });
        }
      }

      if (ch.type === 'GUILD_ANNOUNCEMENT') {
        let ev = ch.permissionOverwrites.find(
          (o) => o.roleNameOrId === '@everyone' || o.roleNameOrId === 'everyone'
        );
        if (!ev) {
          ch.permissionOverwrites.push({
            roleNameOrId: '@everyone',
            allow: ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
            deny: ['SEND_MESSAGES', 'MENTION_EVERYONE'],
          });
        } else if (!ev.deny.includes('SEND_MESSAGES')) {
          ev.allow = ev.allow.filter((p) => p !== 'SEND_MESSAGES');
          ev.deny.push('SEND_MESSAGES');
        }
      }
    });
  }

  if (matchesTarget('DUPLICATE_RESOURCE', 'warn_dup')) {
    const uniqueRoles: RoleBlueprint[] = [];
    const roleKeys = new Set<string>();
    bp.roles.forEach((r) => {
      const k = r.name.trim().toLowerCase();
      if (!roleKeys.has(k)) {
        roleKeys.add(k);
        uniqueRoles.push(r);
      }
    });
    bp.roles = uniqueRoles;

    const uniqueChans: ChannelBlueprint[] = [];
    const chanKeys = new Set<string>();
    bp.channels.forEach((c) => {
      const k = `${c.categoryId}:${c.name.trim().toLowerCase()}`;
      if (!chanKeys.has(k)) {
        chanKeys.add(k);
        uniqueChans.push(c);
      }
    });
    bp.channels = uniqueChans;
  }

  if (matchesTarget('COMPLETENESS_EXEC_ADMIN', 'warn_missing_comp_exec_admin')) {
    const founder = ensureRole(bp, {
      name: 'Founder & Owner',
      color: '#EF4444',
      department: 'Executive Leadership',
      permissions: ['ADMINISTRATOR'],
      description: 'Supreme organizational authority and server owner.',
    });
    const admin = ensureRole(bp, {
      name: 'Server Administrator',
      color: '#F97316',
      department: 'Administration',
      permissions: [
        'MANAGE_GUILD',
        'MANAGE_ROLES',
        'MANAGE_CHANNELS',
        'VIEW_AUDIT_LOG',
        'BAN_MEMBERS',
        'KICK_MEMBERS',
        'MODERATE_MEMBERS',
        'VIEW_CHANNEL',
        'SEND_MESSAGES',
      ],
      description: 'Senior administrator overseeing server infrastructure and permissions.',
    });
    const execCat = ensureCategory(bp, {
      name: 'EXECUTIVE & ADMINISTRATION',
      emoji: '👑',
      department: 'Executive Leadership',
      description: 'Restricted executive command center and high-level governance.',
      isPrivate: true,
      allowedRoles: [founder.name, admin.name],
    });
    ensureChannel(bp, {
      name: 'executive-directives',
      type: 'GUILD_TEXT',
      categoryId: execCat.id,
      purpose: 'High-level executive decisions, roadmaps, and policy sign-offs.',
      isPrivate: true,
      allowedRoles: [founder.name, admin.name],
    });
    ensureChannel(bp, {
      name: 'admin-command-center',
      type: 'GUILD_TEXT',
      categoryId: execCat.id,
      purpose: 'Administrative operations, permission updates, and bot configuration.',
      isPrivate: true,
      allowedRoles: [founder.name, admin.name],
    });
    ensureChannel(bp, {
      name: 'Executive Boardroom',
      type: 'GUILD_VOICE',
      categoryId: execCat.id,
      purpose: 'Private encrypted voice channel for leadership meetings.',
      isPrivate: true,
      userLimit: 10,
      bitrate: 96,
      allowedRoles: [founder.name, admin.name],
    });
  }

  if (matchesTarget('COMPLETENESS_OPS_STAFF', 'warn_missing_comp_ops_staff')) {
    const opsRole = ensureRole(bp, {
      name: 'Operations Manager',
      color: '#F59E0B',
      department: 'Operations & Management',
      permissions: [
        'MANAGE_CHANNELS',
        'MANAGE_MESSAGES',
        'MANAGE_EVENTS',
        'MODERATE_MEMBERS',
        'VIEW_AUDIT_LOG',
        'VIEW_CHANNEL',
        'SEND_MESSAGES',
      ],
      description: 'Directs daily server operations, staff schedules, and cross-department coordination.',
    });
    const modRole = ensureRole(bp, {
      name: 'Senior Moderator',
      color: '#10B981',
      department: 'Moderation & Security',
      permissions: [
        'MODERATE_MEMBERS',
        'KICK_MEMBERS',
        'MANAGE_MESSAGES',
        'VIEW_AUDIT_LOG',
        'VIEW_CHANNEL',
        'SEND_MESSAGES',
      ],
      description: 'Enforces community rules, handles escalations, and coordinates moderation patrols.',
    });
    const opsCat = ensureCategory(bp, {
      name: 'STAFF OPERATIONS & INTERNAL HQ',
      emoji: '🛡️',
      department: 'Operations & Management',
      description: 'Internal staff briefings, shift handovers, and moderator coordination.',
      isPrivate: true,
      allowedRoles: [opsRole.name, modRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'staff-announcements',
      type: 'GUILD_TEXT',
      categoryId: opsCat.id,
      purpose: 'Internal SOP updates, shift schedules, and leadership notices for staff.',
      isPrivate: true,
      allowedRoles: [opsRole.name, modRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'staff-general-chat',
      type: 'GUILD_TEXT',
      categoryId: opsCat.id,
      purpose: 'Real-time operational coordination across all staff departments.',
      isPrivate: true,
      allowedRoles: [opsRole.name, modRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'staff-briefing-notes',
      type: 'GUILD_TEXT',
      categoryId: opsCat.id,
      purpose: 'Meeting agendas, weekly operational reports, and handover logs.',
      isPrivate: true,
      allowedRoles: [opsRole.name, modRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'Staff War Room',
      type: 'GUILD_VOICE',
      categoryId: opsCat.id,
      purpose: 'Internal staff voice coordination and weekly all-hands meetings.',
      isPrivate: true,
      userLimit: 25,
      bitrate: 64,
      allowedRoles: [opsRole.name, modRole.name, ...topStaffRoles],
    });
  }

  if (matchesTarget('COMPLETENESS_ONBOARDING', 'warn_missing_comp_onboarding')) {
    const verifiedRole = ensureRole(bp, {
      name: 'Verified Member',
      color: '#3B82F6',
      department: 'Community',
      permissions: [
        'VIEW_CHANNEL',
        'SEND_MESSAGES',
        'READ_MESSAGE_HISTORY',
        'ADD_REACTIONS',
        'CONNECT',
        'SPEAK',
        'USE_APPLICATION_COMMANDS',
      ],
      description: 'Verified community member who has completed onboarding and rules screening.',
      isPublic: true,
      hoist: false,
    });
    const welcomeCat = ensureCategory(bp, {
      name: 'WELCOME & ONBOARDING GATEWAY',
      emoji: '👋',
      department: 'Community & Onboarding',
      description: 'First-touchpoint verification, rules, server directory, and role selection.',
      isPrivate: false,
    });
    ensureChannel(bp, {
      name: 'welcome-and-rules',
      type: 'GUILD_TEXT',
      categoryId: welcomeCat.id,
      purpose: 'Official community code of conduct, verification gate, and onboarding instructions.',
      isPrivate: false,
      readOnlyForEveryone: true,
      allowedRoles: topStaffRoles,
    });
    ensureChannel(bp, {
      name: 'official-announcements',
      type: 'GUILD_ANNOUNCEMENT',
      categoryId: welcomeCat.id,
      purpose: 'Major server-wide announcements, patch notes, and organization news.',
      isPrivate: false,
      readOnlyForEveryone: true,
      allowedRoles: topStaffRoles,
    });
    ensureChannel(bp, {
      name: 'self-roles',
      type: 'GUILD_TEXT',
      categoryId: welcomeCat.id,
      purpose: 'Self-assignable notification pings, regional tags, and rank/interest roles.',
      isPrivate: false,
      readOnlyForEveryone: true,
      allowedRoles: topStaffRoles,
    });
    ensureChannel(bp, {
      name: 'introductions',
      type: 'GUILD_TEXT',
      categoryId: welcomeCat.id,
      purpose: 'New member introductions and community welcome thread.',
      isPrivate: false,
      slowmode: 15,
    });
    bp.onboardingWorkflow = {
      welcomeChannel: 'welcome-and-rules',
      rulesChannel: 'welcome-and-rules',
      verificationRole: verifiedRole.name,
      defaultRoles: [verifiedRole.name],
      steps: [
        'Read and accept community rules in #welcome-and-rules',
        'Complete Discord Native Onboarding prompt to select region & notification roles in #self-roles',
        'Receive @Verified Member role and unlock public community & competitive hubs',
      ],
    };
  }

  if (matchesTarget('COMPLETENESS_COMMUNITY', 'REC_ADD_FORUM', 'warn_missing_comp_community', 'rec_add_forum')) {
    const commCat = ensureCategory(bp, {
      name: 'COMMUNITY & DISCUSSION HUB',
      emoji: '💬',
      department: 'Community',
      description: 'Main public chat, tactical discussions, media showcase, and community suggestions.',
      isPrivate: false,
    });
    ensureChannel(bp, {
      name: 'general-chat',
      type: 'GUILD_TEXT',
      categoryId: commCat.id,
      purpose: 'Primary community conversation lounge.',
      isPrivate: false,
      slowmode: 3,
    });
    ensureChannel(bp, {
      name: 'community-discussions',
      type: 'GUILD_FORUM',
      categoryId: commCat.id,
      purpose: 'Structured forum threads for meta discussions, guides, Q&A, and community topics.',
      isPrivate: false,
      slowmode: 10,
    });
    ensureChannel(bp, {
      name: 'suggestions-and-feedback',
      type: 'GUILD_FORUM',
      categoryId: commCat.id,
      purpose: 'Community feature suggestions, feedback proposals, and voting.',
      isPrivate: false,
      slowmode: 30,
    });
    ensureChannel(bp, {
      name: 'media-and-highlights',
      type: 'GUILD_TEXT',
      categoryId: commCat.id,
      purpose: 'Screenshots, artwork, clips, and community media sharing.',
      isPrivate: false,
      slowmode: 10,
    });
    ensureChannel(bp, {
      name: 'bot-commands',
      type: 'GUILD_TEXT',
      categoryId: commCat.id,
      purpose: 'Dedicated channel for slash commands, stats lookups, and utility bots.',
      isPrivate: false,
    });
  }

  if (
    matchesTarget(
      'MISSING_MOD_LOGS',
      'COMPLETENESS_SECURITY',
      ' AUTOMATION_MISSING_DEPS',
      'err_missing_mod_logs',
      'warn_missing_comp_security_logs',
      'warn_auto_deps'
    )
  ) {
    const secRole = ensureRole(bp, {
      name: 'Moderator',
      color: '#14B8A6',
      department: 'Moderation & Security',
      permissions: [
        'MODERATE_MEMBERS',
        'MANAGE_MESSAGES',
        'VIEW_AUDIT_LOG',
        'VIEW_CHANNEL',
        'SEND_MESSAGES',
      ],
      description: 'Community moderator patrolling public text and voice channels.',
    });
    const secCat = ensureCategory(bp, {
      name: 'MODERATION & SECURITY LOGS',
      emoji: '🔒',
      department: 'Moderation & Security',
      description: 'Immutable audit logs, AutoMod triggers, message deletions, and security alerts.',
      isPrivate: true,
      allowedRoles: [secRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'security-alerts',
      type: 'GUILD_TEXT',
      categoryId: secCat.id,
      purpose: 'Real-time anti-raid alerts, AutoMod blocks, and critical permission changes.',
      isPrivate: true,
      allowedRoles: [secRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'moderation-logs',
      type: 'GUILD_TEXT',
      categoryId: secCat.id,
      purpose: 'Bans, timeouts, kicks, warnings, and moderation case history.',
      isPrivate: true,
      allowedRoles: [secRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'message-logs',
      type: 'GUILD_TEXT',
      categoryId: secCat.id,
      purpose: 'Deleted and edited message audit trail.',
      isPrivate: true,
      allowedRoles: [secRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'member-logs',
      type: 'GUILD_TEXT',
      categoryId: secCat.id,
      purpose: 'Member join/leave telemetry and account age verification logs.',
      isPrivate: true,
      allowedRoles: [secRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'role-audit-logs',
      type: 'GUILD_TEXT',
      categoryId: secCat.id,
      purpose: 'Role assignments, hierarchy changes, and channel overwrite modifications.',
      isPrivate: true,
      allowedRoles: [secRole.name, ...topStaffRoles],
    });
  }

  if (matchesTarget('COMPLETENESS_TICKETS', 'AUTOMATION_MISSING_DEPS', 'warn_missing_comp_support_tickets')) {
    const supRole = ensureRole(bp, {
      name: 'Support Specialist',
      color: '#06B6D4',
      department: 'Support & Tickets',
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_THREADS', 'READ_MESSAGE_HISTORY', 'ATTACH_FILES'],
      description: 'First-responder support specialist handling member tickets and inquiries.',
    });
    const tktCat = ensureCategory(bp, {
      name: 'SUPPORT & TICKET CENTER',
      emoji: '🎫',
      department: 'Support & Tickets',
      description: 'Member support intake, technical help forum, and private ticket transcripts.',
      isPrivate: false,
    });
    ensureChannel(bp, {
      name: 'open-a-ticket',
      type: 'GUILD_TEXT',
      categoryId: tktCat.id,
      purpose: 'Interactive support ticket dispatcher panel for support, reports, and appeals.',
      isPrivate: false,
      readOnlyForEveryone: true,
      allowedRoles: [supRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'support-forum',
      type: 'GUILD_FORUM',
      categoryId: tktCat.id,
      purpose: 'Public Q&A and peer/staff troubleshooting forum.',
      isPrivate: false,
      slowmode: 10,
    });
    ensureChannel(bp, {
      name: 'ticket-transcripts',
      type: 'GUILD_TEXT',
      categoryId: tktCat.id,
      purpose: 'Restricted archive of closed support, report, and appeal ticket transcripts.',
      isPrivate: true,
      allowedRoles: [supRole.name, ...topStaffRoles],
    });
  }

  if (matchesTarget('COMPLETENESS_COMPETITIVE_TEAMS', 'warn_missing_comp_competitive_teams')) {
    const proRole = ensureRole(bp, {
      name: 'Pro Roster Player',
      color: '#8B5CF6',
      department: 'Competitive Teams',
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'CONNECT', 'SPEAK', 'STREAM', 'PRIORITY_SPEAKER'],
      description: 'Signed competitive main roster player.',
    });
    const acadRole = ensureRole(bp, {
      name: 'Academy Roster',
      color: '#A855F7',
      department: 'Competitive Teams',
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'CONNECT', 'SPEAK', 'STREAM'],
      description: 'Academy and Contenders division player.',
    });
    const teamMgrRole = ensureRole(bp, {
      name: 'Team Manager',
      color: '#EC4899',
      department: 'Competitive Teams',
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'MANAGE_EVENTS', 'MOVE_MEMBERS', 'MUTE_MEMBERS'],
      description: 'Manages team rosters, scrim schedules, and tournament logistics.',
    });
    const teamCat = ensureCategory(bp, {
      name: 'COMPETITIVE TEAMS & PRIVATE ROSTERS',
      emoji: '⚔️',
      department: 'Competitive Teams',
      description: 'Private team war rooms, tactical playbooks, scrim coordination, and team voice comms.',
      isPrivate: true,
      allowedRoles: [proRole.name, acadRole.name, teamMgrRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'pro-roster-hq',
      type: 'GUILD_TEXT',
      categoryId: teamCat.id,
      purpose: 'Private coordination hub for the Main Pro Roster and Team Management.',
      isPrivate: true,
      allowedRoles: [proRole.name, teamMgrRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'academy-roster-hq',
      type: 'GUILD_TEXT',
      categoryId: teamCat.id,
      purpose: 'Private coordination hub for the Academy Roster and Coaching staff.',
      isPrivate: true,
      allowedRoles: [acadRole.name, teamMgrRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'scrim-scheduling',
      type: 'GUILD_TEXT',
      categoryId: teamCat.id,
      purpose: 'Daily scrimmage blocks, opponent confirmations, and server lobby codes.',
      isPrivate: true,
      allowedRoles: [proRole.name, acadRole.name, teamMgrRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'Team Alpha Tactical Comms',
      type: 'GUILD_VOICE',
      categoryId: teamCat.id,
      purpose: 'Low-latency 5-stack competitive voice comms for Main Roster.',
      isPrivate: true,
      userLimit: 6,
      bitrate: 96,
      allowedRoles: [proRole.name, teamMgrRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'Academy Squad Comms',
      type: 'GUILD_VOICE',
      categoryId: teamCat.id,
      purpose: 'Low-latency 5-stack competitive voice comms for Academy Roster.',
      isPrivate: true,
      userLimit: 6,
      bitrate: 96,
      allowedRoles: [acadRole.name, teamMgrRole.name, ...topStaffRoles],
    });
  }

  if (matchesTarget('COMPLETENESS_TOURNAMENTS', 'warn_missing_comp_tournaments')) {
    const tourneyRole = ensureRole(bp, {
      name: 'Tournament Referee',
      color: '#EAB308',
      department: 'Tournament Administration',
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'MANAGE_THREADS', 'MOVE_MEMBERS', 'MUTE_MEMBERS'],
      description: 'Official tournament referee managing brackets, check-ins, and match disputes.',
    });
    const tourneyCat = ensureCategory(bp, {
      name: 'TOURNAMENT OPERATIONS & MATCHES',
      emoji: '🏆',
      department: 'Tournament Administration',
      description: 'Official tournament announcements, brackets, match scheduling, check-in, and results.',
      isPrivate: false,
    });
    ensureChannel(bp, {
      name: 'tournament-announcements',
      type: 'GUILD_ANNOUNCEMENT',
      categoryId: tourneyCat.id,
      purpose: 'Official tournament registrations, rulebooks, and bracket releases.',
      isPrivate: false,
      readOnlyForEveryone: true,
      allowedRoles: [tourneyRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'match-schedules-and-brackets',
      type: 'GUILD_TEXT',
      categoryId: tourneyCat.id,
      purpose: 'Live tournament brackets, match times, and stream assignments.',
      isPrivate: false,
      readOnlyForEveryone: true,
      allowedRoles: [tourneyRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'match-results',
      type: 'GUILD_TEXT',
      categoryId: tourneyCat.id,
      purpose: 'Verified match scoreboards, MVP stats, and series outcomes.',
      isPrivate: false,
      readOnlyForEveryone: true,
      allowedRoles: [tourneyRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'tournament-check-in',
      type: 'GUILD_TEXT',
      categoryId: tourneyCat.id,
      purpose: 'Team captain pre-match check-in and map veto coordination.',
      isPrivate: false,
      slowmode: 10,
    });
    ensureChannel(bp, {
      name: 'referee-admin-desk',
      type: 'GUILD_TEXT',
      categoryId: tourneyCat.id,
      purpose: 'Private tournament referee coordination and dispute rulings.',
      isPrivate: true,
      allowedRoles: [tourneyRole.name, ...topStaffRoles],
    });
  }

  if (matchesTarget('COMPLETENESS_COACHING', 'warn_missing_comp_coaching')) {
    const coachRole = ensureRole(bp, {
      name: 'Head Coach & Analyst',
      color: '#6366F1',
      department: 'Coaching & Player Development',
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_MESSAGES', 'CONNECT', 'SPEAK', 'STREAM', 'PRIORITY_SPEAKER'],
      description: 'Leads tactical preparation, VOD review sessions, and player development.',
    });
    const coachCat = ensureCategory(bp, {
      name: 'COACHING & PLAYER DEVELOPMENT',
      emoji: '📋',
      department: 'Coaching & Player Development',
      description: 'Tactical playbooks, VOD review archives, agent/map setups, and coaching sessions.',
      isPrivate: true,
      allowedRoles: [coachRole.name, 'Pro Roster Player', 'Academy Roster', ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'vod-review-and-analysis',
      type: 'GUILD_FORUM',
      categoryId: coachCat.id,
      purpose: 'Structured match VOD breakdowns, timestamped notes, and opponent scouting reports.',
      isPrivate: true,
      allowedRoles: [coachRole.name, 'Pro Roster Player', 'Academy Roster', ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'tactical-playbooks',
      type: 'GUILD_TEXT',
      categoryId: coachCat.id,
      purpose: 'Map callouts, default executes, anti-strat compositions, and utility lineups.',
      isPrivate: true,
      allowedRoles: [coachRole.name, 'Pro Roster Player', 'Academy Roster', ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'Coaching & VOD Cinema',
      type: 'GUILD_VOICE',
      categoryId: coachCat.id,
      purpose: 'High-bitrate screen-share room for live VOD reviews and tactical whiteboard sessions.',
      isPrivate: true,
      userLimit: 15,
      bitrate: 96,
      allowedRoles: [coachRole.name, 'Pro Roster Player', 'Academy Roster', ...topStaffRoles],
    });
  }

  if (matchesTarget('COMPLETENESS_RECRUITMENT', 'warn_missing_comp_recruitment')) {
    const recRole = ensureRole(bp, {
      name: 'Recruitment & Scouting Lead',
      color: '#D946EF',
      department: 'Recruitment & Applications',
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'MANAGE_THREADS', 'READ_MESSAGE_HISTORY'],
      description: 'Reviews player tryout applications, staff applications, and talent scouting.',
    });
    const recCat = ensureCategory(bp, {
      name: 'RECRUITMENT & APPLICATIONS',
      emoji: '📝',
      department: 'Recruitment & Applications',
      description: 'Roster tryouts, staff applications, LFP/LFT listings, and scouting evaluations.',
      isPrivate: false,
    });
    ensureChannel(bp, {
      name: 'roster-and-staff-applications',
      type: 'GUILD_FORUM',
      categoryId: recCat.id,
      purpose: 'Submit applications for competitive rosters, coaching, moderation, and media teams.',
      isPrivate: false,
      slowmode: 60,
    });
    ensureChannel(bp, {
      name: 'looking-for-group-lfg',
      type: 'GUILD_TEXT',
      categoryId: recCat.id,
      purpose: 'Find ranked duo/stack teammates and community scrim partners.',
      isPrivate: false,
      slowmode: 15,
    });
    ensureChannel(bp, {
      name: 'scouting-and-tryout-reviews',
      type: 'GUILD_TEXT',
      categoryId: recCat.id,
      purpose: 'Private staff evaluation notes on trial players and applicants.',
      isPrivate: true,
      allowedRoles: [recRole.name, ...topStaffRoles],
    });
  }

  if (matchesTarget('COMPLETENESS_MEDIA', 'warn_missing_comp_media_content')) {
    const mediaRole = ensureRole(bp, {
      name: 'Content Creator & Media',
      color: '#EC4899',
      department: 'Media & Content Production',
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS', 'ATTACH_FILES', 'STREAM'],
      description: 'Official organization streamer, video editor, caster, or graphic designer.',
    });
    const mediaCat = ensureCategory(bp, {
      name: 'MEDIA, CONTENT & BROADCAST',
      emoji: '🎬',
      department: 'Media & Content Production',
      description: 'Live stream alerts, official YouTube/social drops, and creator production studio.',
      isPrivate: false,
    });
    ensureChannel(bp, {
      name: 'live-streams-and-videos',
      type: 'GUILD_TEXT',
      categoryId: mediaCat.id,
      purpose: 'Official watch parties, creator stream alerts, and organization video releases.',
      isPrivate: false,
      readOnlyForEveryone: true,
      allowedRoles: [mediaRole.name, ...topStaffRoles],
    });
    ensureChannel(bp, {
      name: 'media-production-studio',
      type: 'GUILD_TEXT',
      categoryId: mediaCat.id,
      purpose: 'Private asset pipeline for editors, thumbnail designers, and broadcast producers.',
      isPrivate: true,
      allowedRoles: [mediaRole.name, ...topStaffRoles],
    });
  }

  if (matchesTarget('COMPLETENESS_PARTNERSHIPS', 'warn_missing_comp_partnerships')) {
    const partnerRole = ensureRole(bp, {
      name: 'Official Partner & Sponsor',
      color: '#FBBF24',
      department: 'Partnerships & Sponsorships',
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'EMBED_LINKS'],
      description: 'Verified organization sponsor, brand partner, and VIP guest.',
    });
    const partCat = ensureCategory(bp, {
      name: 'PARTNERSHIPS & VIP RELATIONS',
      emoji: '🤝',
      department: 'Partnerships & Sponsorships',
      description: 'Sponsor showcases, partnership announcements, and VIP partner lounge.',
      isPrivate: false,
    });
    ensureChannel(bp, {
      name: 'partnership-announcements',
      type: 'GUILD_ANNOUNCEMENT',
      categoryId: partCat.id,
      purpose: 'Official sponsor activations, brand collaborations, and partner giveaways.',
      isPrivate: false,
      readOnlyForEveryone: true,
      allowedRoles: topStaffRoles,
    });
    ensureChannel(bp, {
      name: 'vip-partner-lounge',
      type: 'GUILD_TEXT',
      categoryId: partCat.id,
      purpose: 'Private lounge for sponsors, partner representatives, and executive leadership.',
      isPrivate: true,
      allowedRoles: [partnerRole.name, ...topStaffRoles],
    });
  }

  if (matchesTarget('COMPLETENESS_VOICE', 'REC_ADD_STAGE', 'warn_missing_comp_voice_infra', 'rec_add_stage')) {
    const voiceCat = ensureCategory(bp, {
      name: 'VOICE LOUNGES & STAGE',
      emoji: '🔊',
      department: 'Voice Infrastructure',
      description: 'Public voice hangouts, ranked 5-stack rooms, townhall stage, and AFK channel.',
      isPrivate: false,
    });
    ensureChannel(bp, {
      name: 'Community Townhall Stage',
      type: 'GUILD_STAGE_VOICE',
      categoryId: voiceCat.id,
      purpose: 'Moderated stage channel for community townhalls, AMAs, and tournament watch parties.',
      isPrivate: false,
      bitrate: 64,
    });
    ensureChannel(bp, {
      name: 'General Voice Lounge',
      type: 'GUILD_VOICE',
      categoryId: voiceCat.id,
      purpose: 'Open community voice hangout.',
      isPrivate: false,
      userLimit: 25,
      bitrate: 64,
    });
    ensureChannel(bp, {
      name: 'Ranked Trio / 5-Stack #1',
      type: 'GUILD_VOICE',
      categoryId: voiceCat.id,
      purpose: 'Public 5-player competitive queue voice room.',
      isPrivate: false,
      userLimit: 5,
      bitrate: 96,
    });
    ensureChannel(bp, {
      name: 'Ranked Trio / 5-Stack #2',
      type: 'GUILD_VOICE',
      categoryId: voiceCat.id,
      purpose: 'Public 5-player competitive queue voice room.',
      isPrivate: false,
      userLimit: 5,
      bitrate: 96,
    });
    ensureChannel(bp, {
      name: 'AFK / Muted',
      type: 'GUILD_VOICE',
      categoryId: voiceCat.id,
      purpose: 'Inactive voice timeout channel.',
      isPrivate: false,
      bitrate: 64,
    });
  }

  bp.roles.sort((a, b) => a.hierarchyPosition - b.hierarchyPosition);
  bp.roles.forEach((r, idx) => {
    r.hierarchyPosition = idx + 1;
  });

  bp.categories.sort((a, b) => a.position - b.position);
  bp.categories.forEach((c, idx) => {
    c.position = idx + 1;
  });

  bp.automationModules = verifyAutomationModules(bp);
  bp.updatedAt = new Date().toISOString();
  bp.version = (bp.version || 1) + 1;

  return bp;
}

