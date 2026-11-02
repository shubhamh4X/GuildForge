import React, { useState, useEffect, useMemo } from 'react';
import {
  Hash,
  Volume2,
  Lock,
  ShieldCheck,
  Rocket,
  Download,
  Plus,
  Trash2,
  Edit3,
  ChevronDown,
  ChevronRight,
  Save,
  ArrowUp,
  ArrowDown,
  Megaphone,
  MessageSquare,
  Radio,
  Image as ImageIcon,
  Copy,
  Undo2,
  Redo2,
  Search,
  Eye,
  Grid,
  Ticket,
  Bot,
  GripVertical,
} from 'lucide-react';
import {
  ServerBlueprint,
  RoleBlueprint,
  CategoryBlueprint,
  ChannelBlueprint,
  ChannelType,
  PermissionOverwrite,
  PERMISSION_LIST,
} from '../types/discord.ts';
import { validateServerArchitecture, verifyAutomationModules } from '../services/validator.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';

interface ServerPreviewEditorProps {
  blueprint: ServerBlueprint;
  allBlueprints?: ServerBlueprint[];
  onSelectBlueprint?: (blueprint: ServerBlueprint) => void;
  onUpdateBlueprint: (updated: ServerBlueprint) => void;
  onRunAudit: () => void;
  onDeploy: () => void;
  onSaveToCloud: () => void;
}

const CHANNEL_OVERWRITE_PERMS = [
  'VIEW_CHANNEL',
  'SEND_MESSAGES',
  'READ_MESSAGE_HISTORY',
  'MANAGE_MESSAGES',
  'EMBED_LINKS',
  'ATTACH_FILES',
  'ADD_REACTIONS',
  'MENTION_EVERYONE',
  'CONNECT',
  'SPEAK',
  'STREAM',
  'MUTE_MEMBERS',
  'MOVE_MEMBERS',
  'CREATE_PUBLIC_THREADS',
  'SEND_MESSAGES_IN_THREADS',
];

const MATRIX_PERMS = [
  { key: 'VIEW_CHANNEL', short: 'View' },
  { key: 'SEND_MESSAGES', short: 'Send' },
  { key: 'READ_MESSAGE_HISTORY', short: 'History' },
  { key: 'MANAGE_MESSAGES', short: 'Mod Msg' },
  { key: 'CONNECT', short: 'Connect' },
  { key: 'SPEAK', short: 'Speak' },
  { key: 'MANAGE_CHANNELS', short: 'Mng Ch' },
  { key: 'MANAGE_ROLES', short: 'Mng Role' },
  { key: 'CREATE_PUBLIC_THREADS', short: 'Threads' },
  { key: 'SEND_MESSAGES_IN_THREADS', short: 'Reply Thr' },
];

const ROLE_PERMISSION_PRESETS: Record<string, string[]> = {
  'Executive / Admin': [
    'VIEW_CHANNEL',
    'MANAGE_GUILD',
    'MANAGE_ROLES',
    'MANAGE_CHANNELS',
    'VIEW_AUDIT_LOG',
    'KICK_MEMBERS',
    'BAN_MEMBERS',
    'MODERATE_MEMBERS',
    'MANAGE_MESSAGES',
    'SEND_MESSAGES',
    'READ_MESSAGE_HISTORY',
    'CONNECT',
    'SPEAK',
    'MUTE_MEMBERS',
    'MOVE_MEMBERS',
  ],
  'Senior Moderator': [
    'VIEW_CHANNEL',
    'VIEW_AUDIT_LOG',
    'KICK_MEMBERS',
    'BAN_MEMBERS',
    'MODERATE_MEMBERS',
    'MANAGE_MESSAGES',
    'MANAGE_NICKNAMES',
    'SEND_MESSAGES',
    'READ_MESSAGE_HISTORY',
    'CONNECT',
    'SPEAK',
    'MUTE_MEMBERS',
    'MOVE_MEMBERS',
  ],
  Moderator: [
    'VIEW_CHANNEL',
    'MODERATE_MEMBERS',
    'MANAGE_MESSAGES',
    'MANAGE_NICKNAMES',
    'SEND_MESSAGES',
    'READ_MESSAGE_HISTORY',
    'CONNECT',
    'SPEAK',
    'MUTE_MEMBERS',
  ],
  'Department Staff': [
    'VIEW_CHANNEL',
    'SEND_MESSAGES',
    'SEND_MESSAGES_IN_THREADS',
    'CREATE_PUBLIC_THREADS',
    'EMBED_LINKS',
    'ATTACH_FILES',
    'READ_MESSAGE_HISTORY',
    'CONNECT',
    'SPEAK',
    'STREAM',
  ],
  'Verified Member': [
    'VIEW_CHANNEL',
    'SEND_MESSAGES',
    'SEND_MESSAGES_IN_THREADS',
    'READ_MESSAGE_HISTORY',
    'ADD_REACTIONS',
    'EMBED_LINKS',
    'ATTACH_FILES',
    'CHANGE_NICKNAME',
    'CONNECT',
    'SPEAK',
    'USE_APPLICATION_COMMANDS',
  ],
  'Read-Only / Muted': ['VIEW_CHANNEL', 'READ_MESSAGE_HISTORY'],
};

export const ServerPreviewEditor: React.FC<ServerPreviewEditorProps> = ({
  blueprint,
  allBlueprints = [],
  onSelectBlueprint,
  onUpdateBlueprint,
  onRunAudit,
  onDeploy,
  onSaveToCloud,
}) => {

  const [past, setPast] = useState<ServerBlueprint[]>([]);
  const [future, setFuture] = useState<ServerBlueprint[]>([]);

  const commitBlueprintChange = (updated: ServerBlueprint) => {
    setPast((prev) => [...prev.slice(-24), blueprint]);
    setFuture([]);
    onUpdateBlueprint({ ...updated, updatedAt: new Date().toISOString() });
  };

  const handleUndo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    setPast((prev) => prev.slice(0, -1));
    setFuture((prev) => [blueprint, ...prev]);
    onUpdateBlueprint(previous);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    setFuture((prev) => prev.slice(1));
    setPast((prev) => [...prev, blueprint]);
    onUpdateBlueprint(next);
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [areaFilter, setAreaFilter] = useState<'all' | 'public' | 'private'>('all');

  const [selectedChannelId, setSelectedChannelId] = useState<string>(
    blueprint.channels[0]?.id || ''
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [activeInspectorTab, setActiveInspectorTab] = useState<
    'channel' | 'roles' | 'matrix' | 'systems'
  >('channel');
  const [channelSubTab, setChannelSubTab] = useState<'settings' | 'permissions'>('settings');
  const [selectedMatrixRole, setSelectedMatrixRole] = useState<string>('@everyone');

  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [isEditingRoleModalOpen, setIsEditingRoleModalOpen] = useState(false);
  const [activeRoleToEdit, setActiveRoleToEdit] = useState<RoleBlueprint | null>(null);

  const [newChannelModal, setNewChannelModal] = useState<{ open: boolean; categoryId: string }>({
    open: false,
    categoryId: blueprint.categories[0]?.id || '',
  });
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState<ChannelType>('GUILD_TEXT');

  const [newCategoryModal, setNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const [draggedChannelId, setDraggedChannelId] = useState<string | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);

  const [overwriteTargetRole, setOverwriteTargetRole] = useState<string>('@everyone');
  const [newDeptName, setNewDeptName] = useState<string>('');

  const liveReport = useMemo(() => validateServerArchitecture(blueprint), [blueprint]);

  useEffect(() => {
    const channelExists = blueprint.channels.some((c) => c.id === selectedChannelId);
    if (!channelExists) {
      setSelectedChannelId(blueprint.channels[0]?.id || '');
      setSelectedCategoryId(null);
    }
  }, [blueprint.id, blueprint.channels, selectedChannelId]);

  const selectedChannel = blueprint.channels.find((c) => c.id === selectedChannelId);
  const selectedCategory = blueprint.categories.find((c) => c.id === selectedCategoryId);

  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => ({ ...prev, [catId]: !prev[catId] }));
  };

  const updateChannel = (channelId: string, updates: Partial<ChannelBlueprint>) => {
    const updatedChannels = blueprint.channels.map((ch) =>
      ch.id === channelId ? { ...ch, ...updates } : ch
    );
    commitBlueprintChange({ ...blueprint, channels: updatedChannels });
  };

  const duplicateChannel = (channel: ChannelBlueprint) => {
    const copy: ChannelBlueprint = {
      ...JSON.parse(JSON.stringify(channel)),
      id: `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${channel.name}-copy`,
    };
    const idx = blueprint.channels.findIndex((c) => c.id === channel.id);
    const updatedChannels = [...blueprint.channels];
    updatedChannels.splice(idx + 1, 0, copy);
    commitBlueprintChange({ ...blueprint, channels: updatedChannels });
    setSelectedChannelId(copy.id);
    setSelectedCategoryId(null);
  };

  const deleteChannel = (channelId: string) => {
    const updatedChannels = blueprint.channels.filter((ch) => ch.id !== channelId);
    commitBlueprintChange({ ...blueprint, channels: updatedChannels });
    if (selectedChannelId === channelId) {
      setSelectedChannelId(updatedChannels[0]?.id || '');
    }
  };

  const moveChannel = (channelId: string, direction: 'up' | 'down') => {
    const target = blueprint.channels.find((c) => c.id === channelId);
    if (!target) return;

    const catChannels = blueprint.channels.filter((c) => c.categoryId === target.categoryId);
    const idx = catChannels.findIndex((c) => c.id === channelId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === catChannels.length - 1) return;

    const swapWith = catChannels[direction === 'up' ? idx - 1 : idx + 1];
    const allChannels = [...blueprint.channels];
    const globalIdxA = allChannels.findIndex((c) => c.id === target.id);
    const globalIdxB = allChannels.findIndex((c) => c.id === swapWith.id);

    const temp = allChannels[globalIdxA];
    allChannels[globalIdxA] = allChannels[globalIdxB];
    allChannels[globalIdxB] = temp;

    commitBlueprintChange({ ...blueprint, channels: allChannels });
  };

  const handleDropChannelOnCategory = (targetCategoryId: string) => {
    if (!draggedChannelId) return;
    updateChannel(draggedChannelId, { categoryId: targetCategoryId });
    setDraggedChannelId(null);
  };

  const handleCreateChannel = () => {
    if (!newChannelName.trim()) return;
    const isVoice = newChannelType === 'GUILD_VOICE' || newChannelType === 'GUILD_STAGE_VOICE';
    const newChan: ChannelBlueprint = {
      id: `ch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: isVoice ? newChannelName.trim() : newChannelName.toLowerCase().replace(/\s+/g, '-'),
      type: newChannelType,
      categoryId: newChannelModal.categoryId || blueprint.categories[0]?.id || '',
      purpose: 'Configured community channel.',
      topic: 'Configured community channel.',
      bitrate: isVoice ? 64 : undefined,
      isPrivate: false,
      permissionOverwrites: [],
    };
    commitBlueprintChange({ ...blueprint, channels: [...blueprint.channels, newChan] });
    setSelectedChannelId(newChan.id);
    setSelectedCategoryId(null);
    setNewChannelModal({ open: false, categoryId: '' });
    setNewChannelName('');
    setActiveInspectorTab('channel');
  };

  const updateCategory = (catId: string, updates: Partial<CategoryBlueprint>) => {
    const updatedCategories = blueprint.categories.map((c) =>
      c.id === catId ? { ...c, ...updates } : c
    );
    commitBlueprintChange({ ...blueprint, categories: updatedCategories });
  };

  const duplicateCategory = (category: CategoryBlueprint) => {
    const newCatId = `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newCat: CategoryBlueprint = {
      ...JSON.parse(JSON.stringify(category)),
      id: newCatId,
      name: `${category.name} COPY`,
      position: blueprint.categories.length + 1,
    };
    const catChannels = blueprint.channels
      .filter((ch) => ch.categoryId === category.id)
      .map((ch, idx) => ({
        ...JSON.parse(JSON.stringify(ch)),
        id: `ch_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 5)}`,
        categoryId: newCatId,
      }));
    commitBlueprintChange({
      ...blueprint,
      categories: [...blueprint.categories, newCat],
      channels: [...blueprint.channels, ...catChannels],
    });
    setSelectedCategoryId(newCat.id);
  };

  const moveCategory = (catId: string, direction: 'up' | 'down') => {
    const sorted = [...blueprint.categories].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((c) => c.id === catId);
    if (idx === -1) return;
    if (direction === 'up' && idx === 0) return;
    if (direction === 'down' && idx === sorted.length - 1) return;

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    const tempPos = sorted[idx].position;
    sorted[idx].position = sorted[swapIdx].position;
    sorted[swapIdx].position = tempPos;

    commitBlueprintChange({
      ...blueprint,
      categories: sorted.sort((a, b) => a.position - b.position),
    });
  };

  const handleDropCategoryOnCategory = (targetCatId: string) => {
    if (!draggedCategoryId || draggedCategoryId === targetCatId) return;
    const sorted = [...blueprint.categories].sort((a, b) => a.position - b.position);
    const fromIdx = sorted.findIndex((c) => c.id === draggedCategoryId);
    const toIdx = sorted.findIndex((c) => c.id === targetCatId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = sorted.splice(fromIdx, 1);
    sorted.splice(toIdx, 0, moved);
    const reindexed = sorted.map((c, i) => ({ ...c, position: i + 1 }));
    commitBlueprintChange({ ...blueprint, categories: reindexed });
    setDraggedCategoryId(null);
  };

  const handleCreateCategory = () => {
    if (!newCategoryName.trim()) return;
    const newCat: CategoryBlueprint = {
      id: `cat_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newCategoryName.toUpperCase(),
      position: blueprint.categories.length + 1,
      isPrivate: false,
      permissionOverwrites: [],
    };
    commitBlueprintChange({ ...blueprint, categories: [...blueprint.categories, newCat] });
    setSelectedCategoryId(newCat.id);
    setNewCategoryModal(false);
    setNewCategoryName('');
  };

  const deleteCategory = (catId: string) => {
    const updatedCategories = blueprint.categories.filter((c) => c.id !== catId);
    const updatedChannels = blueprint.channels.filter((ch) => ch.categoryId !== catId);
    commitBlueprintChange({
      ...blueprint,
      categories: updatedCategories,
      channels: updatedChannels,
    });
    setSelectedCategoryId(null);
  };

  const addRoleOverwriteToChannel = (channel: ChannelBlueprint, roleName: string) => {
    if (channel.permissionOverwrites.some((o) => o.roleNameOrId === roleName)) return;
    const newOverwrites: PermissionOverwrite[] = [
      ...channel.permissionOverwrites,
      { roleNameOrId: roleName, allow: ['VIEW_CHANNEL'], deny: [] },
    ];
    updateChannel(channel.id, { permissionOverwrites: newOverwrites });
  };

  const toggleChannelOverwritePerm = (
    channel: ChannelBlueprint,
    roleName: string,
    permKey: string,
    mode: 'allow' | 'deny' | 'neutral'
  ) => {
    const hasExisting = channel.permissionOverwrites.some((o) => o.roleNameOrId === roleName);
    let list = hasExisting
      ? [...channel.permissionOverwrites]
      : [...channel.permissionOverwrites, { roleNameOrId: roleName, allow: [], deny: [] }];

    list = list
      .map((o) => {
        if (o.roleNameOrId !== roleName) return o;
        const allow = o.allow.filter((p) => p !== permKey);
        const deny = o.deny.filter((p) => p !== permKey);
        if (mode === 'allow') allow.push(permKey);
        if (mode === 'deny') deny.push(permKey);
        return { ...o, allow, deny };
      })
      .filter((o) => o.allow.length > 0 || o.deny.length > 0 || o.roleNameOrId === '@everyone');

    updateChannel(channel.id, { permissionOverwrites: list });
  };

  const addRoleOverwriteToCategory = (cat: CategoryBlueprint, roleName: string) => {
    if (cat.permissionOverwrites.some((o) => o.roleNameOrId === roleName)) return;
    const newOverwrites: PermissionOverwrite[] = [
      ...cat.permissionOverwrites,
      { roleNameOrId: roleName, allow: ['VIEW_CHANNEL'], deny: [] },
    ];
    updateCategory(cat.id, { permissionOverwrites: newOverwrites });
  };

  const toggleCategoryOverwritePerm = (
    cat: CategoryBlueprint,
    roleName: string,
    permKey: string,
    mode: 'allow' | 'deny' | 'neutral'
  ) => {
    const hasExisting = cat.permissionOverwrites.some((o) => o.roleNameOrId === roleName);
    let list = hasExisting
      ? [...cat.permissionOverwrites]
      : [...cat.permissionOverwrites, { roleNameOrId: roleName, allow: [], deny: [] }];

    list = list.map((o) => {
      if (o.roleNameOrId !== roleName) return o;
      const allow = o.allow.filter((p) => p !== permKey);
      const deny = o.deny.filter((p) => p !== permKey);
      if (mode === 'allow') allow.push(permKey);
      if (mode === 'deny') deny.push(permKey);
      return { ...o, allow, deny };
    });

    updateCategory(cat.id, { permissionOverwrites: list });
  };

  const moveRoleHierarchy = (roleId: string, direction: 'up' | 'down') => {
    const sorted = [...blueprint.roles].sort((a, b) => a.hierarchyPosition - b.hierarchyPosition);
    const index = sorted.findIndex((r) => r.id === roleId);
    if (index === -1) return;

    if (direction === 'up' && index > 0) {
      const prev = sorted[index - 1];
      const tempPos = sorted[index].hierarchyPosition;
      sorted[index].hierarchyPosition = prev.hierarchyPosition;
      prev.hierarchyPosition = tempPos;
    } else if (direction === 'down' && index < sorted.length - 1) {
      const next = sorted[index + 1];
      const tempPos = sorted[index].hierarchyPosition;
      sorted[index].hierarchyPosition = next.hierarchyPosition;
      next.hierarchyPosition = tempPos;
    }

    const reindexed = sorted
      .sort((a, b) => a.hierarchyPosition - b.hierarchyPosition)
      .map((r, i) => ({ ...r, hierarchyPosition: i + 1 }));

    commitBlueprintChange({ ...blueprint, roles: reindexed });
  };

  const duplicateRole = (role: RoleBlueprint) => {
    const copy: RoleBlueprint = {
      ...JSON.parse(JSON.stringify(role)),
      id: `r_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${role.name} Copy`,
      hierarchyPosition: role.hierarchyPosition + 1,
      permissions: role.permissions.filter((p) => p !== 'ADMINISTRATOR'),
    };
    const updatedRoles = [...blueprint.roles, copy]
      .sort((a, b) => a.hierarchyPosition - b.hierarchyPosition)
      .map((r, i) => ({ ...r, hierarchyPosition: i + 1 }));
    commitBlueprintChange({ ...blueprint, roles: updatedRoles });
  };

  const handleSaveRole = (role: RoleBlueprint) => {
    const exists = blueprint.roles.some((r) => r.id === role.id);
    const updatedRoles = exists
      ? blueprint.roles.map((r) => (r.id === role.id ? role : r))
      : [...blueprint.roles, role];
    commitBlueprintChange({ ...blueprint, roles: updatedRoles });
    setIsEditingRoleModalOpen(false);
    setActiveRoleToEdit(null);
  };

  const handleDeleteRole = (roleId: string) => {
    const updatedRoles = blueprint.roles
      .filter((r) => r.id !== roleId)
      .sort((a, b) => a.hierarchyPosition - b.hierarchyPosition)
      .map((r, i) => ({ ...r, hierarchyPosition: i + 1 }));
    commitBlueprintChange({ ...blueprint, roles: updatedRoles });
  };

  const handleAddNewRole = () => {
    const newRole: RoleBlueprint = {
      id: `r_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: 'Custom Department Role',
      color: '#7547FF',
      hoist: true,
      mentionable: false,
      department: blueprint.departments?.[0] || 'Operations & Management',
      group: blueprint.departments?.[0] || 'Operations',
      hierarchyPosition: blueprint.roles.length + 1,
      permissions: ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY'],
      description: 'Specialized community role.',
      administrativeResponsibilities: 'Assigned departmental duties.',
      isPublic: true,
      assignmentMethod: 'manual',
    };
    setActiveRoleToEdit(newRole);
    setIsEditingRoleModalOpen(true);
  };

  const handleExportJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(blueprint, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `${blueprint.name.toLowerCase().replace(/\s+/g, '-')}-blueprint.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const renderChannelIcon = (type: ChannelType) => {
    switch (type) {
      case 'GUILD_VOICE':
        return <Volume2 className="w-3.5 h-3.5 text-[#19C37D] shrink-0" />;
      case 'GUILD_STAGE_VOICE':
        return <Radio className="w-3.5 h-3.5 text-[#906BFF] shrink-0" />;
      case 'GUILD_ANNOUNCEMENT':
        return <Megaphone className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
      case 'GUILD_FORUM':
        return <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0" />;
      case 'GUILD_MEDIA':
        return <ImageIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />;
      default:
        return <Hash className="w-3.5 h-3.5 text-[#71717A] shrink-0" />;
    }
  };

  const lowerSearch = searchQuery.trim().toLowerCase();

  const matchesAreaFilter = (isPrivate: boolean) => {
    if (areaFilter === 'all') return true;
    if (areaFilter === 'private') return isPrivate;
    return !isPrivate;
  };

  const getChannelMatrixState = (
    channel: ChannelBlueprint,
    category: CategoryBlueprint | undefined,
    roleName: string,
    permKey: string
  ): {
    explicit: 'allow' | 'deny' | 'inherit';
    effective: 'allow' | 'deny';
    source: 'channel' | 'category' | 'role';
  } => {
    const chOw = channel.permissionOverwrites.find((o) => o.roleNameOrId === roleName);
    if (chOw) {
      if (chOw.allow.includes(permKey))
        return { explicit: 'allow', effective: 'allow', source: 'channel' };
      if (chOw.deny.includes(permKey))
        return { explicit: 'deny', effective: 'deny', source: 'channel' };
    }

    const catOw = category?.permissionOverwrites.find((o) => o.roleNameOrId === roleName);
    if (catOw) {
      if (catOw.allow.includes(permKey))
        return { explicit: 'inherit', effective: 'allow', source: 'category' };
      if (catOw.deny.includes(permKey))
        return { explicit: 'inherit', effective: 'deny', source: 'category' };
    }

    if (roleName === '@everyone') {
      const defaultPerms = ['VIEW_CHANNEL', 'SEND_MESSAGES', 'READ_MESSAGE_HISTORY', 'CONNECT', 'SPEAK'];
      return {
        explicit: 'inherit',
        effective: defaultPerms.includes(permKey) ? 'allow' : 'deny',
        source: 'role',
      };
    }

    const roleObj = blueprint.roles.find((r) => r.name === roleName);
    const hasPerm =
      roleObj?.permissions.includes('ADMINISTRATOR') || roleObj?.permissions.includes(permKey);

    return {
      explicit: 'inherit',
      effective: hasPerm ? 'allow' : 'deny',
      source: 'role',
    };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#252525]">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <input
              type="text"
              value={blueprint.name}
              onChange={(e) => commitBlueprintChange({ ...blueprint, name: e.target.value })}
              className="text-xl sm:text-2xl font-bold tracking-tight text-white bg-transparent border-b border-transparent hover:border-[#333333] focus:border-[#7547FF] focus:outline-none px-0.5"
              title="Click to rename server blueprint"
            />
            <Badge variant="purple">{blueprint.communityType}</Badge>
            <Badge variant="neutral">v{blueprint.version || 1}</Badge>
          </div>
          <p className="text-xs text-[#9CA3AF]">
            Visual Blueprint Studio • Drag-and-Drop Reordering • Interactive Role × Channel Permission Matrix
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-[#111111] border border-[#252525] rounded-lg p-0.5">
            <button
              type="button"
              onClick={handleUndo}
              disabled={past.length === 0}
              className="p-1.5 text-[#9CA3AF] hover:text-white disabled:opacity-30 cursor-pointer"
              title={`Undo (${past.length})`}
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={future.length === 0}
              className="p-1.5 text-[#9CA3AF] hover:text-white disabled:opacity-30 cursor-pointer"
              title={`Redo (${future.length})`}
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {allBlueprints.length > 1 && onSelectBlueprint && (
            <select
              value={blueprint.id}
              onChange={(e) => {
                const found = allBlueprints.find((b) => b.id === e.target.value);
                if (found) onSelectBlueprint(found);
              }}
              className="bg-[#111111] border border-[#252525] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#7547FF]"
              title="Switch Saved Blueprint"
            >
              {allBlueprints.map((bp) => (
                <option key={bp.id} value={bp.id} className="bg-[#111111]">
                  {bp.name} (v{bp.version || 1})
                </option>
              ))}
            </select>
          )}

          <Button
            variant="outline"
            size="sm"
            icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
            onClick={onRunAudit}
          >
            Audit ({liveReport.score}/100)
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-4 h-4 text-[#9CA3AF]" />}
            onClick={handleExportJson}
          >
            Export JSON
          </Button>

          <Button
            variant="outline"
            size="sm"
            icon={<Save className="w-4 h-4 text-[#906BFF]" />}
            onClick={onSaveToCloud}
          >
            Save
          </Button>

          <Button
            variant="primary"
            size="sm"
            icon={<Rocket className="w-4 h-4 text-white" />}
            onClick={onDeploy}
          >
            Deploy Server
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
        {[
          { label: 'Roles', val: liveReport.stats.totalRoles, color: 'text-white' },
          { label: 'Categories', val: liveReport.stats.totalCategories, color: 'text-white' },
          { label: 'Channels', val: liveReport.stats.totalChannels, color: 'text-[#19C37D]' },
          { label: 'Text', val: liveReport.stats.textChannels, color: 'text-white' },
          { label: 'Voice', val: liveReport.stats.voiceChannels, color: 'text-white' },
          { label: 'Forums', val: liveReport.stats.forumChannels, color: 'text-blue-400' },
          { label: 'Announce', val: liveReport.stats.announcementChannels, color: 'text-amber-400' },
          { label: 'Stage/Media', val: liveReport.stats.stageChannels + liveReport.stats.mediaChannels, color: 'text-pink-400' },
          { label: 'Private', val: liveReport.stats.privateChannels, color: 'text-amber-400' },
          { label: 'Public', val: liveReport.stats.publicChannels, color: 'text-emerald-400' },
          { label: 'Overwrites', val: liveReport.stats.totalOverwrites, color: 'text-[#906BFF]' },
          { label: 'Automations', val: liveReport.stats.activeAutomationCount, color: 'text-white' },
        ].map((st) => (
          <div
            key={st.label}
            className="bg-[#101010] border border-[#222222] rounded-lg px-2.5 py-2 text-center"
          >
            <div className={`text-sm font-mono font-bold ${st.color}`}>{st.val}</div>
            <div className="text-[9px] font-mono uppercase text-[#71717A] truncate">{st.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#101010] border border-[#252525] rounded-xl p-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#71717A] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories, #channels, @roles, departments, tickets, or automations..."
            className="w-full bg-[#080808] border border-[#252525] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#7547FF]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono text-[#71717A] flex items-center gap-1 mr-1">
            <Eye className="w-3.5 h-3.5" />
            Preview:
          </span>
          {(
            [
              { id: 'all', label: 'All Areas' },
              { id: 'public', label: 'Public Only' },
              { id: 'private', label: 'Private Staff/Dept' },
            ] as const
          ).map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setAreaFilter(f.id)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                areaFilter === f.id
                  ? 'bg-[#7547FF] text-white'
                  : 'bg-[#171717] text-[#9CA3AF] hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        <div className="lg:col-span-5 bg-[#101010] border border-[#252525] rounded-xl flex flex-col h-[780px] overflow-hidden">

          <div className="p-4 border-b border-[#252525] flex items-center justify-between bg-[#0e0e0e]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#7547FF] text-white font-bold text-xs flex items-center justify-center shrink-0">
                {blueprint.name.charAt(0)}
              </div>
              <span className="text-xs font-bold text-white truncate">{blueprint.name}</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setNewCategoryModal(true)}
            >
              Add Category
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {[...blueprint.categories]
              .sort((a, b) => a.position - b.position)
              .map((category) => {
                const isCollapsed = collapsedCategories[category.id];
                const rawCatChannels = blueprint.channels.filter(
                  (ch) => ch.categoryId === category.id
                );

                const filteredChannels = rawCatChannels.filter((ch) => {
                  const effectivePrivate = ch.isPrivate || category.isPrivate;
                  if (!matchesAreaFilter(effectivePrivate)) return false;
                  if (!lowerSearch) return true;
                  return (
                    ch.name.toLowerCase().includes(lowerSearch) ||
                    (ch.purpose || '').toLowerCase().includes(lowerSearch) ||
                    category.name.toLowerCase().includes(lowerSearch)
                  );
                });

                if (
                  (lowerSearch || areaFilter !== 'all') &&
                  filteredChannels.length === 0 &&
                  !category.name.toLowerCase().includes(lowerSearch)
                ) {
                  return null;
                }

                const isCatSelected = selectedCategoryId === category.id;

                return (
                  <div
                    key={category.id}
                    draggable
                    onDragStart={() => setDraggedCategoryId(category.id)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      if (draggedChannelId) {
                        handleDropChannelOnCategory(category.id);
                      } else if (draggedCategoryId) {
                        handleDropCategoryOnCategory(category.id);
                      }
                    }}
                    className="space-y-1"
                  >

                    <div
                      onClick={() => {
                        setSelectedCategoryId(category.id);
                        setActiveInspectorTab('channel');
                      }}
                      className={`group flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer select-none ${
                        isCatSelected
                          ? 'bg-[#1e1e1e] text-white border border-[#333333]'
                          : 'text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCategoryCollapse(category.id);
                        }}
                        className="flex items-center gap-1.5 truncate"
                      >
                        <GripVertical className="w-3 h-3 text-[#52525B] shrink-0 cursor-grab" />
                        {isCollapsed ? (
                          <ChevronRight className="w-3.5 h-3.5 text-[#71717A]" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-[#71717A]" />
                        )}
                        {category.isPrivate && <Lock className="w-3 h-3 text-amber-400 shrink-0" />}
                        {category.emoji && <span>{category.emoji}</span>}
                        <span className="truncate">{category.name}</span>
                        <span className="text-[10px] font-mono text-[#71717A]">
                          ({filteredChannels.length})
                        </span>
                      </div>

                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveCategory(category.id, 'up');
                          }}
                          className="p-1 hover:text-white text-[#71717A]"
                          title="Move Category Up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            moveCategory(category.id, 'down');
                          }}
                          className="p-1 hover:text-white text-[#71717A]"
                          title="Move Category Down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            duplicateCategory(category);
                          }}
                          className="p-1 hover:text-white text-[#71717A]"
                          title="Duplicate Category"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setNewChannelModal({ open: true, categoryId: category.id });
                          }}
                          className="p-1 hover:text-white text-[#71717A]"
                          title="Add Channel"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCategory(category.id);
                          }}
                          className="p-1 hover:text-rose-400 text-[#71717A]"
                          title="Delete Category"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {!isCollapsed && (
                      <div className="space-y-0.5 pl-2.5">
                        {filteredChannels.map((channel) => {
                          const isSelected =
                            selectedChannelId === channel.id && !selectedCategoryId;

                          return (
                            <div
                              key={channel.id}
                              draggable
                              onDragStart={(e) => {
                                e.stopPropagation();
                                setDraggedChannelId(channel.id);
                              }}
                              onClick={() => {
                                setSelectedChannelId(channel.id);
                                setSelectedCategoryId(null);
                                setActiveInspectorTab('channel');
                              }}
                              className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                                isSelected
                                  ? 'bg-[#1b1b1b] text-white border border-[#2d2d2d]'
                                  : 'text-[#9CA3AF] hover:bg-[#141414] hover:text-white'
                              }`}
                            >
                              <div className="flex items-center gap-2 truncate">
                                {renderChannelIcon(channel.type)}
                                <span className="truncate">{channel.name}</span>
                                {(channel.isPrivate || category.isPrivate) && (
                                  <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                )}
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                {channel.slowmode && channel.slowmode > 0 ? (
                                  <span className="text-[10px] px-1 rounded bg-[#171717] text-[#9CA3AF] font-mono">
                                    {channel.slowmode}s
                                  </span>
                                ) : null}
                                {channel.userLimit && channel.userLimit > 0 ? (
                                  <span className="text-[10px] px-1 rounded bg-[#171717] text-[#9CA3AF] font-mono">
                                    {channel.userLimit}u
                                  </span>
                                ) : null}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveChannel(channel.id, 'up');
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white text-[#71717A]"
                                  title="Move Channel Up"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    moveChannel(channel.id, 'down');
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white text-[#71717A]"
                                  title="Move Channel Down"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    duplicateChannel(channel);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-white text-[#71717A]"
                                  title="Duplicate Channel"
                                >
                                  <Copy className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteChannel(channel.id);
                                  }}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 text-[#71717A]"
                                  title="Delete Channel"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          );
                        })}

                        {filteredChannels.length === 0 && (
                          <p className="text-[11px] text-[#71717A] italic px-3 py-1">
                            No channels match filter
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>

        <div className="lg:col-span-7 bg-[#101010] border border-[#252525] rounded-xl flex flex-col h-[780px] overflow-hidden">

          <div className="p-3 border-b border-[#252525] flex flex-wrap items-center justify-between gap-2 bg-[#0e0e0e]">
            <div className="flex flex-wrap items-center gap-1">
              <button
                onClick={() => setActiveInspectorTab('channel')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeInspectorTab === 'channel'
                    ? 'bg-[#171717] text-white border border-[#2e2e2e]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                {selectedCategory ? 'Category Inspector' : 'Channel Inspector'}
              </button>
              <button
                onClick={() => setActiveInspectorTab('roles')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeInspectorTab === 'roles'
                    ? 'bg-[#171717] text-white border border-[#2e2e2e]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                Role Hierarchy ({blueprint.roles.length})
              </button>
              <button
                onClick={() => setActiveInspectorTab('matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  activeInspectorTab === 'matrix'
                    ? 'bg-[#7547FF] text-white'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                Permission Matrix
              </button>
              <button
                onClick={() => setActiveInspectorTab('systems')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  activeInspectorTab === 'systems'
                    ? 'bg-[#171717] text-white border border-[#2e2e2e]'
                    : 'text-[#9CA3AF] hover:text-white'
                }`}
              >
                Tickets & Automations
              </button>
            </div>

            {activeInspectorTab === 'roles' && (
              <Button
                variant="primary"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddNewRole}
              >
                Add Role
              </Button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeInspectorTab === 'channel' ? (
              selectedCategory ? (

                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#252525]">
                    <div>
                      <span className="text-[11px] font-semibold text-[#906BFF] uppercase tracking-wider block">
                        Category Configuration
                      </span>
                      <h2 className="text-base font-bold text-white mt-0.5">
                        {selectedCategory.emoji ? `${selectedCategory.emoji} ` : ''}
                        {selectedCategory.name}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Copy className="w-3.5 h-3.5" />}
                        onClick={() => duplicateCategory(selectedCategory)}
                      >
                        Duplicate
                      </Button>
                      <Badge variant={selectedCategory.isPrivate ? 'warning' : 'neutral'}>
                        {selectedCategory.isPrivate ? 'Private Category' : 'Public Category'}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                        Category Name
                      </label>
                      <input
                        type="text"
                        value={selectedCategory.name}
                        onChange={(e) =>
                          updateCategory(selectedCategory.id, {
                            name: e.target.value,
                          })
                        }
                        className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                        Category Emoji Prefix
                      </label>
                      <input
                        type="text"
                        value={selectedCategory.emoji || ''}
                        onChange={(e) =>
                          updateCategory(selectedCategory.id, { emoji: e.target.value })
                        }
                        placeholder="e.g. 🛡️ or 🏆"
                        className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                        Department Owner
                      </label>
                      <input
                        type="text"
                        value={selectedCategory.department || ''}
                        onChange={(e) =>
                          updateCategory(selectedCategory.id, { department: e.target.value })
                        }
                        placeholder="e.g. Executive Leadership"
                        className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                        Category Description
                      </label>
                      <input
                        type="text"
                        value={selectedCategory.description || ''}
                        onChange={(e) =>
                          updateCategory(selectedCategory.id, { description: e.target.value })
                        }
                        placeholder="Operational purpose of this category"
                        className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                      />
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-[#080808] border border-[#252525] flex items-center justify-between">
                    <div>
                      <div className="text-xs font-semibold text-white">
                        Private Category Isolation
                      </div>
                      <div className="text-[11px] text-[#9CA3AF]">
                        Denies VIEW_CHANNEL and CONNECT to @everyone
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={selectedCategory.isPrivate}
                      onChange={(e) => {
                        const isPriv = e.target.checked;
                        const overwrites = [...selectedCategory.permissionOverwrites];
                        if (isPriv) {
                          const hasEveryone = overwrites.some(
                            (o) => o.roleNameOrId === '@everyone'
                          );
                          if (!hasEveryone) {
                            overwrites.push({
                              roleNameOrId: '@everyone',
                              allow: [],
                              deny: ['VIEW_CHANNEL', 'CONNECT'],
                            });
                          }
                        }
                        updateCategory(selectedCategory.id, {
                          isPrivate: isPriv,
                          permissionOverwrites: overwrites,
                        });
                      }}
                      className="w-4 h-4 accent-[#7547FF] cursor-pointer"
                    />
                  </div>

                  <div className="space-y-3 pt-2 border-t border-[#252525]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        Category Role Permission Overwrites
                      </span>
                      <div className="flex items-center gap-2">
                        <select
                          value={overwriteTargetRole}
                          onChange={(e) => setOverwriteTargetRole(e.target.value)}
                          className="bg-[#080808] border border-[#252525] rounded-lg px-2.5 py-1 text-xs text-white"
                        >
                          <option value="@everyone">@everyone</option>
                          {blueprint.roles.map((r) => (
                            <option key={r.id} value={r.name}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            addRoleOverwriteToCategory(selectedCategory, overwriteTargetRole)
                          }
                        >
                          Add Overwrite
                        </Button>
                      </div>
                    </div>

                    {selectedCategory.permissionOverwrites.map((overwrite, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-lg bg-[#080808] border border-[#252525] text-xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{overwrite.roleNameOrId}</span>
                          <button
                            onClick={() => {
                              const filtered = selectedCategory.permissionOverwrites.filter(
                                (_, i) => i !== idx
                              );
                              updateCategory(selectedCategory.id, {
                                permissionOverwrites: filtered,
                              });
                            }}
                            className="text-[#71717A] hover:text-rose-400 p-0.5"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                          {CHANNEL_OVERWRITE_PERMS.map((permKey) => {
                            const isAllowed = overwrite.allow.includes(permKey);
                            const isDenied = overwrite.deny.includes(permKey);
                            return (
                              <div
                                key={permKey}
                                className="flex items-center justify-between p-1.5 rounded bg-[#111111] border border-[#202020] text-[10px]"
                              >
                                <span className="truncate text-[#9CA3AF] mr-1">{permKey}</span>
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    onClick={() =>
                                      toggleCategoryOverwritePerm(
                                        selectedCategory,
                                        overwrite.roleNameOrId,
                                        permKey,
                                        isAllowed ? 'neutral' : 'allow'
                                      )
                                    }
                                    className={`px-1 rounded font-bold ${
                                      isAllowed
                                        ? 'bg-emerald-600 text-white'
                                        : 'bg-[#1a1a1a] text-[#71717A]'
                                    }`}
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={() =>
                                      toggleCategoryOverwritePerm(
                                        selectedCategory,
                                        overwrite.roleNameOrId,
                                        permKey,
                                        isDenied ? 'neutral' : 'deny'
                                      )
                                    }
                                    className={`px-1 rounded font-bold ${
                                      isDenied
                                        ? 'bg-rose-600 text-white'
                                        : 'bg-[#1a1a1a] text-[#71717A]'
                                    }`}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : selectedChannel ? (

                <div className="space-y-6">
                  <div className="flex items-center justify-between pb-4 border-b border-[#252525]">
                    <div>
                      <span className="text-[11px] font-semibold text-[#906BFF] uppercase tracking-wider block">
                        Channel Configuration ({selectedChannel.type})
                      </span>
                      <h2 className="text-base font-bold text-white mt-0.5">
                        #{selectedChannel.name}
                      </h2>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<Copy className="w-3.5 h-3.5" />}
                        onClick={() => duplicateChannel(selectedChannel)}
                      >
                        Duplicate
                      </Button>
                      <Badge variant={selectedChannel.isPrivate ? 'warning' : 'neutral'}>
                        {selectedChannel.isPrivate ? 'Private' : 'Public'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-b border-[#252525] pb-2 text-xs">
                    <button
                      onClick={() => setChannelSubTab('settings')}
                      className={`font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                        channelSubTab === 'settings'
                          ? 'border-[#7547FF] text-white'
                          : 'border-transparent text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      General Settings
                    </button>
                    <button
                      onClick={() => setChannelSubTab('permissions')}
                      className={`font-semibold pb-1 border-b-2 transition-colors cursor-pointer ${
                        channelSubTab === 'permissions'
                          ? 'border-[#7547FF] text-white'
                          : 'border-transparent text-[#9CA3AF] hover:text-white'
                      }`}
                    >
                      Permission Overwrites ({selectedChannel.permissionOverwrites.length})
                    </button>
                  </div>

                  {channelSubTab === 'settings' ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                            Channel Name
                          </label>
                          <input
                            type="text"
                            value={selectedChannel.name}
                            onChange={(e) =>
                              updateChannel(selectedChannel.id, {
                                name:
                                  selectedChannel.type === 'GUILD_VOICE' ||
                                  selectedChannel.type === 'GUILD_STAGE_VOICE'
                                    ? e.target.value
                                    : e.target.value.toLowerCase().replace(/\s+/g, '-'),
                              })
                            }
                            className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                            Channel Type
                          </label>
                          <select
                            value={selectedChannel.type}
                            onChange={(e) =>
                              updateChannel(selectedChannel.id, {
                                type: e.target.value as ChannelType,
                              })
                            }
                            className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                          >
                            <option value="GUILD_TEXT">Text Channel (GUILD_TEXT)</option>
                            <option value="GUILD_VOICE">Voice Channel (GUILD_VOICE)</option>
                            <option value="GUILD_ANNOUNCEMENT">
                              Announcement Channel (GUILD_ANNOUNCEMENT)
                            </option>
                            <option value="GUILD_FORUM">Forum Channel (GUILD_FORUM)</option>
                            <option value="GUILD_STAGE_VOICE">
                              Stage Channel (GUILD_STAGE_VOICE)
                            </option>
                            <option value="GUILD_MEDIA">Media Channel (GUILD_MEDIA)</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                          Move to Category
                        </label>
                        <select
                          value={selectedChannel.categoryId}
                          onChange={(e) =>
                            updateChannel(selectedChannel.id, { categoryId: e.target.value })
                          }
                          className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                        >
                          {blueprint.categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                          Channel Topic / Description
                        </label>
                        <textarea
                          rows={2}
                          value={selectedChannel.topic || ''}
                          onChange={(e) =>
                            updateChannel(selectedChannel.id, { topic: e.target.value })
                          }
                          className="w-full bg-[#080808] border border-[#252525] rounded-lg p-3 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                          Architectural Purpose
                        </label>
                        <input
                          type="text"
                          value={selectedChannel.purpose}
                          onChange={(e) =>
                            updateChannel(selectedChannel.id, { purpose: e.target.value })
                          }
                          className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                            Slowmode (Seconds)
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={21600}
                            value={selectedChannel.slowmode || 0}
                            onChange={(e) =>
                              updateChannel(selectedChannel.id, {
                                slowmode: Number(e.target.value),
                              })
                            }
                            className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                          />
                        </div>

                        {(selectedChannel.type === 'GUILD_VOICE' ||
                          selectedChannel.type === 'GUILD_STAGE_VOICE') && (
                          <>
                            <div>
                              <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                                Voice User Limit (0 = Unlimited)
                              </label>
                              <input
                                type="number"
                                min={0}
                                max={99}
                                value={selectedChannel.userLimit || 0}
                                onChange={(e) =>
                                  updateChannel(selectedChannel.id, {
                                    userLimit: Number(e.target.value),
                                  })
                                }
                                className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                                Audio Bitrate (kbps)
                              </label>
                              <select
                                value={selectedChannel.bitrate || 64}
                                onChange={(e) =>
                                  updateChannel(selectedChannel.id, {
                                    bitrate: Number(e.target.value),
                                  })
                                }
                                className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                              >
                                <option value={64}>64 kbps</option>
                                <option value={96}>96 kbps</option>
                              </select>
                            </div>
                          </>
                        )}
                        {(selectedChannel.type === 'GUILD_FORUM' ||
                          selectedChannel.type === 'GUILD_TEXT') && (
                          <div>
                            <label className="text-xs font-medium text-[#9CA3AF] block mb-1.5">
                              Default Thread/Post Auto-Archive Duration
                            </label>
                            <select
                              value={selectedChannel.defaultAutoArchiveDuration || 1440}
                              onChange={(e) =>
                                updateChannel(selectedChannel.id, {
                                  defaultAutoArchiveDuration: Number(e.target.value) as
                                    | 60
                                    | 1440
                                    | 4320
                                    | 10080,
                                })
                              }
                              className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                            >
                              <option value={60}>1 Hour (60 mins)</option>
                              <option value={1440}>24 Hours (1,440 mins)</option>
                              <option value={4320}>3 Days (4,320 mins)</option>
                              <option value={10080}>1 Week (10,080 mins)</option>
                            </select>
                          </div>
                        )}
                      </div>

                      <div className="p-3.5 rounded-lg bg-[#080808] border border-[#252525] flex items-center justify-between">
                        <div>
                          <div className="text-xs font-semibold text-white">
                            Private Channel Isolation
                          </div>
                          <div className="text-[11px] text-[#9CA3AF]">
                            Explicitly denies @everyone from viewing this channel
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedChannel.isPrivate}
                          onChange={(e) => {
                            const isPriv = e.target.checked;
                            const overwrites = [...selectedChannel.permissionOverwrites];
                            if (isPriv) {
                              const hasEveryone = overwrites.some(
                                (o) => o.roleNameOrId === '@everyone'
                              );
                              if (!hasEveryone) {
                                overwrites.push({
                                  roleNameOrId: '@everyone',
                                  allow: [],
                                  deny: ['VIEW_CHANNEL', 'CONNECT'],
                                });
                              }
                            }
                            updateChannel(selectedChannel.id, {
                              isPrivate: isPriv,
                              permissionOverwrites: overwrites,
                            });
                          }}
                          className="w-4 h-4 accent-[#7547FF] cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-[#9CA3AF]">
                          Configure role-level Allow / Deny bitmasks for #{selectedChannel.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <select
                            value={overwriteTargetRole}
                            onChange={(e) => setOverwriteTargetRole(e.target.value)}
                            className="bg-[#080808] border border-[#252525] rounded-lg px-2.5 py-1 text-xs text-white"
                          >
                            <option value="@everyone">@everyone</option>
                            {blueprint.roles.map((r) => (
                              <option key={r.id} value={r.name}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              addRoleOverwriteToChannel(selectedChannel, overwriteTargetRole)
                            }
                          >
                            Add Role Overwrite
                          </Button>
                        </div>
                      </div>

                      {selectedChannel.permissionOverwrites.length === 0 ? (
                        <div className="p-6 rounded-lg bg-[#080808] border border-[#252525] text-center text-xs text-[#9CA3AF]">
                          Inheriting permissions from parent category. Click &quot;Add Role Overwrite&quot; to customize.
                        </div>
                      ) : (
                        selectedChannel.permissionOverwrites.map((overwrite, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg bg-[#080808] border border-[#252525] text-xs space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-white">{overwrite.roleNameOrId}</span>
                              <button
                                onClick={() => {
                                  const filtered = selectedChannel.permissionOverwrites.filter(
                                    (_, i) => i !== idx
                                  );
                                  updateChannel(selectedChannel.id, {
                                    permissionOverwrites: filtered,
                                  });
                                }}
                                className="text-[#71717A] hover:text-rose-400 p-0.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                              {CHANNEL_OVERWRITE_PERMS.map((permKey) => {
                                const isAllowed = overwrite.allow.includes(permKey);
                                const isDenied = overwrite.deny.includes(permKey);
                                return (
                                  <div
                                    key={permKey}
                                    className="flex items-center justify-between p-1.5 rounded bg-[#111111] border border-[#202020] text-[10px]"
                                  >
                                    <span className="truncate text-[#9CA3AF] mr-1">{permKey}</span>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <button
                                        onClick={() =>
                                          toggleChannelOverwritePerm(
                                            selectedChannel,
                                            overwrite.roleNameOrId,
                                            permKey,
                                            isAllowed ? 'neutral' : 'allow'
                                          )
                                        }
                                        className={`px-1 rounded font-bold ${
                                          isAllowed
                                            ? 'bg-emerald-600 text-white'
                                            : 'bg-[#1a1a1a] text-[#71717A]'
                                        }`}
                                      >
                                        ✓
                                      </button>
                                      <button
                                        onClick={() =>
                                          toggleChannelOverwritePerm(
                                            selectedChannel,
                                            overwrite.roleNameOrId,
                                            permKey,
                                            isDenied ? 'neutral' : 'deny'
                                          )
                                        }
                                        className={`px-1 rounded font-bold ${
                                          isDenied
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-[#1a1a1a] text-[#71717A]'
                                        }`}
                                      >
                                        ✕
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-xs text-[#9CA3AF]">
                  Select a channel or category from the left tree to inspect and edit its settings.
                </div>
              )
            ) : activeInspectorTab === 'roles' ? (

              <div className="space-y-3">
                {[...blueprint.roles]
                  .sort((a, b) => a.hierarchyPosition - b.hierarchyPosition)
                  .filter((r) => {
                    if (!lowerSearch) return true;
                    return (
                      r.name.toLowerCase().includes(lowerSearch) ||
                      (r.department || '').toLowerCase().includes(lowerSearch)
                    );
                  })
                  .map((role, index) => (
                    <div
                      key={role.id}
                      className="p-3.5 rounded-lg bg-[#080808] border border-[#252525] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-xs font-mono text-[#71717A] w-6">
                          #{role.hierarchyPosition}
                        </span>
                        <div
                          className="w-3.5 h-3.5 rounded-full shrink-0"
                          style={{ backgroundColor: role.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-white truncate">
                              {role.name}
                            </span>
                            <Badge variant="neutral" size="sm">
                              {role.department}
                            </Badge>
                            {role.permissions.includes('ADMINISTRATOR') && (
                              <Badge variant="danger" size="sm">
                                ADMIN
                              </Badge>
                            )}
                          </div>
                          <p className="text-[11px] text-[#9CA3AF] truncate mt-0.5">
                            {role.description} • {role.permissions.length} permissions
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveRoleHierarchy(role.id, 'up')}
                          disabled={index === 0}
                          className="p-1 text-[#71717A] hover:text-white disabled:opacity-30"
                          title="Move Up"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => moveRoleHierarchy(role.id, 'down')}
                          disabled={index === blueprint.roles.length - 1}
                          className="p-1 text-[#71717A] hover:text-white disabled:opacity-30"
                          title="Move Down"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => duplicateRole(role)}
                          className="p-1 text-[#71717A] hover:text-white"
                          title="Duplicate Role"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setActiveRoleToEdit(role);
                            setIsEditingRoleModalOpen(true);
                          }}
                          className="p-1 text-[#906BFF] hover:text-white"
                          title="Edit Role & Permissions"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRole(role.id)}
                          className="p-1 text-[#71717A] hover:text-rose-400"
                          title="Delete Role"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : activeInspectorTab === 'matrix' ? (

              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#252525]">
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Interactive Role × Channel Permission Matrix
                    </h3>
                    <p className="text-[11px] text-[#9CA3AF]">
                      Click any cell to toggle <strong className="text-emerald-400">Allow (✓)</strong>,{' '}
                      <strong className="text-rose-400">Deny (✕)</strong>, or{' '}
                      <strong className="text-[#9CA3AF]">Inherit (/)</strong>. Effective inherited state is shown automatically.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#9CA3AF]">Inspect Role:</span>
                    <select
                      value={selectedMatrixRole}
                      onChange={(e) => setSelectedMatrixRole(e.target.value)}
                      className="bg-[#080808] border border-[#7547FF] rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                    >
                      <option value="@everyone">@everyone (Public Baseline)</option>
                      {[...blueprint.roles]
                        .sort((a, b) => a.hierarchyPosition - b.hierarchyPosition)
                        .map((r) => (
                          <option key={r.id} value={r.name}>
                            #{r.hierarchyPosition} {r.name} ({r.department})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto border border-[#252525] rounded-lg">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-[#141414] border-b border-[#252525] text-[#9CA3AF] font-mono">
                        <th className="p-2.5 sticky left-0 bg-[#141414] min-w-[160px]">
                          Category / #Channel
                        </th>
                        {MATRIX_PERMS.map((mp) => (
                          <th key={mp.key} className="p-2 text-center whitespace-nowrap" title={mp.key}>
                            {mp.short}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f1f1f]">
                      {[...blueprint.categories]
                        .sort((a, b) => a.position - b.position)
                        .map((cat) => {
                          const catChannels = blueprint.channels.filter(
                            (ch) => ch.categoryId === cat.id
                          );
                          return (
                            <React.Fragment key={cat.id}>

                              <tr className="bg-[#12131a]">
                                <td className="p-2 font-bold text-white sticky left-0 bg-[#12131a] flex items-center gap-1.5">
                                  {cat.isPrivate && (
                                    <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                                  )}
                                  <span className="truncate">{cat.name}</span>
                                </td>
                                {MATRIX_PERMS.map((mp) => {
                                  const ow = cat.permissionOverwrites.find(
                                    (o) => o.roleNameOrId === selectedMatrixRole
                                  );
                                  const isAllow = ow?.allow.includes(mp.key);
                                  const isDeny = ow?.deny.includes(mp.key);
                                  const nextMode = isAllow
                                    ? 'deny'
                                    : isDeny
                                    ? 'neutral'
                                    : 'allow';

                                  return (
                                    <td key={mp.key} className="p-1.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleCategoryOverwritePerm(
                                            cat,
                                            selectedMatrixRole,
                                            mp.key,
                                            nextMode
                                          )
                                        }
                                        className={`w-6 h-6 rounded font-mono text-xs font-bold transition-colors cursor-pointer ${
                                          isAllow
                                            ? 'bg-emerald-600 text-white'
                                            : isDeny
                                            ? 'bg-rose-600 text-white'
                                            : 'bg-[#1b1b1b] text-[#71717A] hover:text-white'
                                        }`}
                                        title={`Category ${cat.name} • ${mp.key}: ${
                                          isAllow ? 'Explicit Allow' : isDeny ? 'Explicit Deny' : 'Inherit'
                                        }`}
                                      >
                                        {isAllow ? '✓' : isDeny ? '✕' : '/'}
                                      </button>
                                    </td>
                                  );
                                })}
                              </tr>

                              {catChannels.map((ch) => (
                                <tr key={ch.id} className="bg-[#090909] hover:bg-[#111111]">
                                  <td className="p-2 pl-4 text-[#D1D5DB] sticky left-0 bg-[#090909] truncate max-w-[180px]">
                                    <div className="flex items-center gap-1.5 truncate">
                                      {renderChannelIcon(ch.type)}
                                      <span className="truncate">{ch.name}</span>
                                    </div>
                                  </td>
                                  {MATRIX_PERMS.map((mp) => {
                                    const st = getChannelMatrixState(
                                      ch,
                                      cat,
                                      selectedMatrixRole,
                                      mp.key
                                    );
                                    const nextMode =
                                      st.explicit === 'allow'
                                        ? 'deny'
                                        : st.explicit === 'deny'
                                        ? 'neutral'
                                        : 'allow';

                                    return (
                                      <td key={mp.key} className="p-1.5 text-center">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            toggleChannelOverwritePerm(
                                              ch,
                                              selectedMatrixRole,
                                              mp.key,
                                              nextMode
                                            )
                                          }
                                          className={`w-6 h-6 rounded font-mono text-xs font-bold transition-colors cursor-pointer ${
                                            st.explicit === 'allow'
                                              ? 'bg-emerald-600 text-white'
                                              : st.explicit === 'deny'
                                              ? 'bg-rose-600 text-white'
                                              : st.effective === 'allow'
                                              ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-700/40'
                                              : 'bg-rose-950/40 text-rose-400/70 border border-rose-800/30'
                                          }`}
                                          title={`#${ch.name} • ${mp.key} — Explicit: ${st.explicit.toUpperCase()} | Effective: ${st.effective.toUpperCase()} (from ${st.source})`}
                                        >
                                          {st.explicit === 'allow'
                                            ? '✓'
                                            : st.explicit === 'deny'
                                            ? '✕'
                                            : '/'}
                                        </button>
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (

              <div className="space-y-6">

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Organizational Departments ({blueprint.departments?.length || 0})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {blueprint.departments?.map((dept, i) => (
                      <div
                        key={i}
                        className="px-3 py-1.5 rounded-lg bg-[#080808] border border-[#252525] text-xs text-white flex items-center gap-2"
                      >
                        <span>{dept}</span>
                        <button
                          onClick={() => {
                            const filtered = blueprint.departments.filter((_, idx) => idx !== i);
                            commitBlueprintChange({ ...blueprint, departments: filtered });
                          }}
                          className="text-[#71717A] hover:text-rose-400"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 max-w-sm">
                    <input
                      type="text"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                      placeholder="Add new department..."
                      className="flex-1 bg-[#080808] border border-[#252525] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-[#7547FF]"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!newDeptName.trim()) return;
                        commitBlueprintChange({
                          ...blueprint,
                          departments: [...(blueprint.departments || []), newDeptName.trim()],
                        });
                        setNewDeptName('');
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {blueprint.ticketArchitecture && blueprint.ticketArchitecture.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-[#252525]">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        <Ticket className="w-3.5 h-3.5 text-[#906BFF]" />
                        Support Ticket Pipelines ({blueprint.ticketArchitecture.length})
                      </h3>
                      <Badge variant="warning" size="sm">
                        Requires Ticket Bot Module
                      </Badge>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {blueprint.ticketArchitecture.map((tkt) => (
                        <div
                          key={tkt.id}
                          className="p-3 rounded-lg bg-[#080808] border border-[#252525] text-xs space-y-1"
                        >
                          <div className="font-bold text-white">{tkt.name}</div>
                          <div className="text-[11px] text-[#9CA3AF]">
                            Category: <span className="text-white">{tkt.categoryName}</span> • Pattern:{' '}
                            <span className="font-mono text-[#906BFF]">{tkt.namingConvention}</span>
                          </div>
                          <div className="text-[10px] text-[#71717A]">
                            Staff: {tkt.authorizedStaffRoles.join(', ')} • Transcript: #{tkt.transcriptChannel}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {blueprint.automationModules && blueprint.automationModules.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-[#252525]">
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-[#19C37D]" />
                      Automation & Integration Modules (Dependency Verification)
                    </h3>
                    <div className="space-y-2">
                      {verifyAutomationModules(blueprint).map((mod, idx) => (
                        <div
                          key={mod.id}
                          className="p-3 rounded-lg bg-[#080808] border border-[#252525] text-xs flex items-start justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <input
                                type="checkbox"
                                checked={mod.enabled}
                                onChange={(e) => {
                                  const updated = [...(blueprint.automationModules || [])];
                                  updated[idx] = { ...mod, enabled: e.target.checked };
                                  commitBlueprintChange({
                                    ...blueprint,
                                    automationModules: updated,
                                  });
                                }}
                                className="accent-[#19C37D]"
                              />
                              <span className="font-bold text-white">{mod.name}</span>
                              <Badge
                                variant={
                                  ['Configured', 'Enabled', 'Running'].includes(
                                    String(mod.runtimeStatus)
                                  )
                                    ? 'success'
                                    : ['Failed', 'Unsupported'].includes(
                                        String(mod.runtimeStatus)
                                      )
                                    ? 'danger'
                                    : 'purple'
                                }
                                size="sm"
                              >
                                {mod.runtimeStatus || 'Planned'}
                              </Badge>
                              <Badge
                                variant={
                                  mod.implementationStatus === 'native_discord'
                                    ? 'success'
                                    : 'warning'
                                }
                                size="sm"
                              >
                                {mod.implementationStatus === 'native_discord'
                                  ? 'Native Discord'
                                  : 'Requires Bot Runtime'}
                              </Badge>
                            </div>
                            <p className="text-[11px] text-[#9CA3AF]">
                              {mod.requiredConfiguration}
                            </p>
                            {mod.statusReason && (
                              <p
                                className={`text-[10px] font-mono ${
                                  mod.runtimeStatus === 'Failed'
                                    ? 'text-rose-400'
                                    : 'text-emerald-400'
                                }`}
                              >
                                ↳ {mod.statusReason}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {newChannelModal.open && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#252525] rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Create New Channel</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Channel Name</label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  placeholder="e.g. tournament-announcements"
                  className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Channel Type</label>
                <select
                  value={newChannelType}
                  onChange={(e) => setNewChannelType(e.target.value as ChannelType)}
                  className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="GUILD_TEXT">Text Channel (GUILD_TEXT)</option>
                  <option value="GUILD_VOICE">Voice Channel (GUILD_VOICE)</option>
                  <option value="GUILD_ANNOUNCEMENT">Announcement (GUILD_ANNOUNCEMENT)</option>
                  <option value="GUILD_FORUM">Forum Channel (GUILD_FORUM)</option>
                  <option value="GUILD_STAGE_VOICE">Stage Channel (GUILD_STAGE_VOICE)</option>
                  <option value="GUILD_MEDIA">Media Channel (GUILD_MEDIA)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setNewChannelModal({ open: false, categoryId: '' })}
              >
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateChannel}>
                Create Channel
              </Button>
            </div>
          </div>
        </div>
      )}

      {newCategoryModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#252525] rounded-xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-sm font-bold text-white">Create New Category</h3>
            <div>
              <label className="text-xs text-[#9CA3AF] block mb-1">Category Name</label>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="e.g. COMPETITIVE OPERATIONS"
                className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setNewCategoryModal(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateCategory}>
                Create Category
              </Button>
            </div>
          </div>
        </div>
      )}

      {isEditingRoleModalOpen && activeRoleToEdit && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#252525] rounded-xl max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#252525] pb-3">
              <h3 className="text-sm font-bold text-white">
                Configure Role: {activeRoleToEdit.name}
              </h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-[#9CA3AF]">Quick Preset:</span>
                <select
                  onChange={(e) => {
                    const preset = ROLE_PERMISSION_PRESETS[e.target.value];
                    if (preset) {
                      setActiveRoleToEdit({ ...activeRoleToEdit, permissions: [...preset] });
                    }
                  }}
                  defaultValue=""
                  className="bg-[#080808] border border-[#252525] rounded px-2 py-1 text-xs text-white"
                >
                  <option value="" disabled>
                    Apply Preset...
                  </option>
                  {Object.keys(ROLE_PERMISSION_PRESETS).map((presetName) => (
                    <option key={presetName} value={presetName}>
                      {presetName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Role Name</label>
                <input
                  type="text"
                  value={activeRoleToEdit.name}
                  onChange={(e) =>
                    setActiveRoleToEdit({ ...activeRoleToEdit, name: e.target.value })
                  }
                  className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Role Color (Hex)</label>
                <input
                  type="color"
                  value={activeRoleToEdit.color}
                  onChange={(e) =>
                    setActiveRoleToEdit({ ...activeRoleToEdit, color: e.target.value })
                  }
                  className="w-full h-9 bg-[#080808] border border-[#252525] rounded-lg px-2 py-1 cursor-pointer"
                />
              </div>
              <div>
                <label className="text-xs text-[#9CA3AF] block mb-1">Department</label>
                <input
                  type="text"
                  value={activeRoleToEdit.department}
                  onChange={(e) =>
                    setActiveRoleToEdit({ ...activeRoleToEdit, department: e.target.value })
                  }
                  className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-white">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeRoleToEdit.hoist}
                  onChange={(e) =>
                    setActiveRoleToEdit({ ...activeRoleToEdit, hoist: e.target.checked })
                  }
                  className="accent-[#7547FF]"
                />
                <span>Hoist Role (Display separately in member list)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={activeRoleToEdit.mentionable}
                  onChange={(e) =>
                    setActiveRoleToEdit({ ...activeRoleToEdit, mentionable: e.target.checked })
                  }
                  className="accent-[#7547FF]"
                />
                <span>Allow @mention</span>
              </label>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-bold text-white">
                Discord Permissions ({activeRoleToEdit.permissions.length} active)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-60 overflow-y-auto pr-1">
                {PERMISSION_LIST.map((perm) => {
                  const checked = activeRoleToEdit.permissions.includes(perm.key);
                  return (
                    <label
                      key={perm.key}
                      className="flex items-start gap-2 p-2 rounded bg-[#080808] border border-[#202020] text-xs cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const updatedPerms = e.target.checked
                            ? [...activeRoleToEdit.permissions, perm.key]
                            : activeRoleToEdit.permissions.filter((p) => p !== perm.key);
                          setActiveRoleToEdit({ ...activeRoleToEdit, permissions: updatedPerms });
                        }}
                        className="mt-0.5 accent-[#7547FF]"
                      />
                      <div>
                        <div className="font-semibold text-white">{perm.name}</div>
                        <div className="text-[10px] text-[#71717A]">{perm.description}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#252525]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsEditingRoleModalOpen(false);
                  setActiveRoleToEdit(null);
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleSaveRole(activeRoleToEdit)}
              >
                Save Role Configuration
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

