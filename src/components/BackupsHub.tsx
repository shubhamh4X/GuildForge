import React, { useState, useEffect, useMemo } from 'react';
import {
  Archive,
  Download,
  Upload,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  GitCompare,
  Rocket,
  Info,
  X,
} from 'lucide-react';
import { apiClient } from '../services/apiClient.ts';
import { ServerBlueprint } from '../types/discord.ts';
import { Button } from './ui/Button.tsx';
import { Badge } from './ui/Badge.tsx';

interface BackupsHubProps {
  currentBlueprint: ServerBlueprint | null;
  onRestoreBlueprint: (blueprint: ServerBlueprint) => void;
  onRestoreAndDeploy?: (blueprint: ServerBlueprint) => void;
}

export const BackupsHub: React.FC<BackupsHubProps> = ({
  currentBlueprint,
  onRestoreBlueprint,
  onRestoreAndDeploy,
}) => {
  const [backups, setBackups] = useState<any[]>([]);
  const [snapshotName, setSnapshotName] = useState('');
  const [importedJson, setImportedJson] = useState('');
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [restoreModalData, setRestoreModalData] = useState<any | null>(null);
  const [viewModalData, setViewModalData] = useState<any | null>(null);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [compareLeftId, setCompareLeftId] = useState<string>('ACTIVE_WORKSPACE');
  const [compareRightId, setCompareRightId] = useState<string>('');
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(
    null
  );

  const loadData = async () => {
    try {
      const bkRes = await apiClient.getBackups();
      const list = bkRes.backups || [];
      setBackups(list);
      if (list.length > 0 && !compareRightId) {
        setCompareRightId(list[0].id);
      }
    } catch (err) {
      console.error('Error loading backups data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateSnapshot = async () => {
    if (!currentBlueprint || !snapshotName.trim()) return;
    try {
      await apiClient.createBackup(currentBlueprint, snapshotName);
      setSnapshotName('');
      setStatusMsg({ text: 'Immutable snapshot saved to persistent vault.', type: 'success' });
      await loadData();
    } catch (err: any) {
      setStatusMsg({ text: err.message || 'Snapshot creation failed.', type: 'error' });
    }
  };

  const handleImportJson = async () => {
    try {
      const parsed = JSON.parse(importedJson);
      if (
        !parsed ||
        typeof parsed !== 'object' ||
        !Array.isArray(parsed.roles) ||
        !Array.isArray(parsed.categories) ||
        !Array.isArray(parsed.channels)
      ) {
        setStatusMsg({
          text: 'Schema Validation Failed: Imported JSON must contain valid "roles", "categories", and "channels" arrays.',
          type: 'error',
        });
        return;
      }
      const res = await apiClient.importBackup(parsed);
      onRestoreBlueprint(res.blueprint);
      setIsImportModalOpen(false);
      setImportedJson('');
      setStatusMsg({
        text: `Validated and imported "${res.blueprint.name}" (${res.blueprint.roles.length} roles, ${res.blueprint.channels.length} channels)!`,
        type: 'success',
      });
      await loadData();
    } catch (err: any) {
      setStatusMsg({
        text: 'Invalid JSON format or missing blueprint schema: ' + err.message,
        type: 'error',
      });
    }
  };

  const handleConfirmRestore = (deployToDiscord = false) => {
    if (restoreModalData) {
      if (deployToDiscord && onRestoreAndDeploy) {
        onRestoreAndDeploy(restoreModalData.data);
      } else {
        onRestoreBlueprint(restoreModalData.data);
      }
      setStatusMsg({
        text: `Restored snapshot "${restoreModalData.name}" into workspace!`,
        type: 'success',
      });
      setRestoreModalData(null);
    }
  };

  const resolveCompareBlueprint = (id: string): { label: string; bp: ServerBlueprint | null } => {
    if (id === 'ACTIVE_WORKSPACE') {
      return {
        label: currentBlueprint ? `Active Workspace (${currentBlueprint.name})` : 'Active Workspace (Empty)',
        bp: currentBlueprint,
      };
    }
    const found = backups.find((b) => b.id === id);
    return {
      label: found ? `Snapshot: ${found.name}` : 'Select Snapshot',
      bp: found?.data || null,
    };
  };

  const diffSummary = useMemo(() => {
    const left = resolveCompareBlueprint(compareLeftId).bp;
    const right = resolveCompareBlueprint(compareRightId).bp;
    if (!left || !right) return null;

    const leftRoles = new Set((left.roles || []).map((r) => r.name));
    const rightRoles = new Set((right.roles || []).map((r) => r.name));
    const addedRoles = [...rightRoles].filter((x) => !leftRoles.has(x));
    const removedRoles = [...leftRoles].filter((x) => !rightRoles.has(x));

    const leftCats = new Set((left.categories || []).map((c) => c.name));
    const rightCats = new Set((right.categories || []).map((c) => c.name));
    const addedCategories = [...rightCats].filter((x) => !leftCats.has(x));
    const removedCategories = [...leftCats].filter((x) => !rightCats.has(x));

    const leftChans = new Set((left.channels || []).map((c) => c.name));
    const rightChans = new Set((right.channels || []).map((c) => c.name));
    const addedChannels = [...rightChans].filter((x) => !leftChans.has(x));
    const removedChannels = [...leftChans].filter((x) => !rightChans.has(x));

    return {
      leftName: left.name,
      rightName: right.name,
      leftCounts: {
        roles: left.roles?.length || 0,
        categories: left.categories?.length || 0,
        channels: left.channels?.length || 0,
      },
      rightCounts: {
        roles: right.roles?.length || 0,
        categories: right.categories?.length || 0,
        channels: right.channels?.length || 0,
      },
      addedRoles,
      removedRoles,
      addedCategories,
      removedCategories,
      addedChannels,
      removedChannels,
    };
  }, [compareLeftId, compareRightId, backups, currentBlueprint]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#252525]">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Backups, Snapshots & Restoration Center
          </h1>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Capture immutable server configurations, inspect & compare snapshots, export portable JSON schemas, and restore to workspace or live Discord servers.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            disabled={backups.length === 0}
            icon={<GitCompare className="w-4 h-4 text-emerald-400" />}
            onClick={() => setCompareModalOpen(true)}
          >
            Compare Snapshots
          </Button>
          <Button
            variant="outline"
            size="sm"
            icon={<Upload className="w-4 h-4 text-[#906BFF]" />}
            onClick={() => setIsImportModalOpen(true)}
          >
            Import JSON
          </Button>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-[#111111] border border-[#252525] flex items-start gap-3 text-xs">
        <Info className="w-4 h-4 text-[#906BFF] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-semibold text-white">
            Discord Architecture Restoration Scope & Platform Limitations
          </div>
          <p className="text-[#9CA3AF] leading-relaxed">
            <strong className="text-emerald-400">Reproduced on Restore:</strong> Complete role hierarchy, role colors/hoist/mentionable flags, 64-bit permission bitmasks, category structures, all channel types (Text, Voice, Forum, Announcement, Stage, Media), channel topics/slowmode/bitrate/archive durations, and role/channel permission overwrites.{' '}
            <strong className="text-amber-400">Platform Limitations:</strong> Discord&apos;s REST API does not permit restoring historical user chat messages, member role assignments for users no longer in the guild, or third-party bot credentials.
          </p>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2.5 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-950/40 border border-emerald-800/50 text-emerald-300'
              : 'bg-rose-950/40 border border-rose-800/50 text-rose-300'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {currentBlueprint && (
        <div className="bg-[#111111] border border-[#252525] rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-[#906BFF]" />
              Snapshot Active Blueprint ({currentBlueprint.name})
            </h3>
            <p className="text-xs text-[#9CA3AF] mt-0.5">
              Capture a frozen snapshot of all {currentBlueprint.roles.length} roles,{' '}
              {currentBlueprint.categories.length} categories, and{' '}
              {currentBlueprint.channels.length} channels.
            </p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="Snapshot name (e.g. Pre-Tournament v1)..."
              value={snapshotName}
              onChange={(e) => setSnapshotName(e.target.value)}
              className="w-full sm:w-64 bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7547FF]"
            />
            <Button
              variant="primary"
              size="sm"
              disabled={!snapshotName.trim()}
              onClick={handleCreateSnapshot}
            >
              Create Snapshot
            </Button>
          </div>
        </div>
      )}

      <div className="bg-[#111111] border border-[#252525] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#252525] flex items-center justify-between">
          <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
            Saved Blueprint Snapshots ({backups.length})
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-white">
            <thead className="bg-[#0c0c0c] text-[11px] text-[#9CA3AF] uppercase border-b border-[#252525]">
              <tr>
                <th className="py-3 px-4 font-semibold">Snapshot Name</th>
                <th className="py-3 px-4 font-semibold">Created</th>
                <th className="py-3 px-4 font-semibold">Roles</th>
                <th className="py-3 px-4 font-semibold">Categories</th>
                <th className="py-3 px-4 font-semibold">Channels</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#202020]">
              {backups.map((b) => (
                <tr key={b.id} className="hover:bg-[#161616] transition-colors">
                  <td className="py-3.5 px-4 font-semibold text-white">{b.name}</td>
                  <td className="py-3.5 px-4 text-[#9CA3AF] font-mono text-[11px]">
                    {new Date(b.timestamp).toLocaleDateString()}{' '}
                    {new Date(b.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3.5 px-4 text-[#9CA3AF] font-mono">
                    {b.data?.roles?.length || 0}
                  </td>
                  <td className="py-3.5 px-4 text-[#9CA3AF] font-mono">
                    {b.data?.categories?.length || 0}
                  </td>
                  <td className="py-3.5 px-4 text-[#9CA3AF] font-mono">
                    {b.data?.channels?.length || 0}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Eye className="w-3.5 h-3.5 text-emerald-400" />}
                        onClick={() => setViewModalData(b)}
                      >
                        Inspect
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        icon={<RotateCcw className="w-3.5 h-3.5 text-[#906BFF]" />}
                        onClick={() => setRestoreModalData(b)}
                      >
                        Restore
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<Download className="w-3.5 h-3.5 text-[#9CA3AF]" />}
                        onClick={() => {
                          const dataStr =
                            'data:text/json;charset=utf-8,' +
                            encodeURIComponent(JSON.stringify(b.data, null, 2));
                          const downloadAnchor = document.createElement('a');
                          downloadAnchor.setAttribute('href', dataStr);
                          downloadAnchor.setAttribute(
                            'download',
                            `${b.name.toLowerCase().replace(/\s+/g, '-')}.json`
                          );
                          document.body.appendChild(downloadAnchor);
                          downloadAnchor.click();
                          downloadAnchor.remove();
                        }}
                      >
                        Export
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}

              {backups.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#71717A]">
                    No snapshots captured yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {viewModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#252525] rounded-xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#252525] pb-3">
              <div>
                <h3 className="text-base font-bold text-white">
                  Snapshot Inspector: {viewModalData.name}
                </h3>
                <p className="text-xs text-[#9CA3AF]">
                  Captured {new Date(viewModalData.timestamp).toLocaleString()} • Blueprint:{' '}
                  {viewModalData.data?.name}
                </p>
              </div>
              <button
                onClick={() => setViewModalData(null)}
                className="text-[#71717A] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-xs">
              <div className="p-3 rounded-lg bg-[#080808] border border-[#252525]">
                <div className="text-lg font-mono font-bold text-white">
                  {viewModalData.data?.roles?.length || 0}
                </div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">Roles</div>
              </div>
              <div className="p-3 rounded-lg bg-[#080808] border border-[#252525]">
                <div className="text-lg font-mono font-bold text-white">
                  {viewModalData.data?.categories?.length || 0}
                </div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">Categories</div>
              </div>
              <div className="p-3 rounded-lg bg-[#080808] border border-[#252525]">
                <div className="text-lg font-mono font-bold text-emerald-400">
                  {viewModalData.data?.channels?.length || 0}
                </div>
                <div className="text-[10px] text-[#9CA3AF] uppercase">Channels</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="bg-[#080808] border border-[#252525] rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                <div className="font-bold text-white uppercase text-[10px] tracking-wider">
                  Roles Hierarchy
                </div>
                {(viewModalData.data?.roles || []).map((r: any) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between py-1 border-b border-[#181818]"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: r.color || '#906BFF' }}
                      />
                      <span className="text-white font-medium">{r.name}</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#71717A]">
                      {r.permissions?.length || 0} perms
                    </span>
                  </div>
                ))}
              </div>

              <div className="bg-[#080808] border border-[#252525] rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                <div className="font-bold text-white uppercase text-[10px] tracking-wider">
                  Categories & Channels
                </div>
                {(viewModalData.data?.categories || []).map((cat: any) => {
                  const chans = (viewModalData.data?.channels || []).filter(
                    (c: any) => c.categoryId === cat.id
                  );
                  return (
                    <div key={cat.id} className="space-y-1 pb-2 border-b border-[#181818]">
                      <div className="font-bold text-[#906BFF]">{cat.name}</div>
                      <div className="pl-3 space-y-0.5 text-[11px] text-[#9CA3AF]">
                        {chans.map((ch: any) => (
                          <div key={ch.id} className="flex items-center justify-between">
                            <span>#{ch.name}</span>
                            <span className="text-[9px] font-mono text-[#71717A]">{ch.type}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setViewModalData(null)}>
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={() => {
                  const snap = viewModalData;
                  setViewModalData(null);
                  setRestoreModalData(snap);
                }}
              >
                Proceed to Restore Options
              </Button>
            </div>
          </div>
        </div>
      )}

      {compareModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#252525] rounded-xl max-w-3xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#252525] pb-3">
              <div className="flex items-center gap-2">
                <GitCompare className="w-4 h-4 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Compare Architecture Snapshots (Diff Engine)
                </h3>
              </div>
              <button
                onClick={() => setCompareModalOpen(false)}
                className="text-[#71717A] hover:text-white p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-[11px] text-[#9CA3AF] block mb-1">Base Architecture (A)</label>
                <select
                  value={compareLeftId}
                  onChange={(e) => setCompareLeftId(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white"
                >
                  <option value="ACTIVE_WORKSPACE">
                    Active Workspace ({currentBlueprint?.name || 'None'})
                  </option>
                  {backups.map((b) => (
                    <option key={b.id} value={b.id}>
                      Snapshot: {b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] text-[#9CA3AF] block mb-1">
                  Target Architecture (B)
                </label>
                <select
                  value={compareRightId}
                  onChange={(e) => setCompareRightId(e.target.value)}
                  className="w-full bg-[#080808] border border-[#252525] rounded-lg px-3 py-2 text-xs text-white"
                >
                  {backups.map((b) => (
                    <option key={b.id} value={b.id}>
                      Snapshot: {b.name}
                    </option>
                  ))}
                  <option value="ACTIVE_WORKSPACE">
                    Active Workspace ({currentBlueprint?.name || 'None'})
                  </option>
                </select>
              </div>
            </div>

            {diffSummary ? (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-lg bg-[#080808] border border-[#252525]">
                    <div className="text-[10px] text-[#9CA3AF] uppercase">Roles Delta</div>
                    <div className="text-sm font-mono font-bold text-white mt-0.5">
                      {diffSummary.leftCounts.roles} → {diffSummary.rightCounts.roles}
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      +{diffSummary.addedRoles.length} added / -{diffSummary.removedRoles.length} removed
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#080808] border border-[#252525]">
                    <div className="text-[10px] text-[#9CA3AF] uppercase">Categories Delta</div>
                    <div className="text-sm font-mono font-bold text-white mt-0.5">
                      {diffSummary.leftCounts.categories} → {diffSummary.rightCounts.categories}
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      +{diffSummary.addedCategories.length} added / -
                      {diffSummary.removedCategories.length} removed
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[#080808] border border-[#252525]">
                    <div className="text-[10px] text-[#9CA3AF] uppercase">Channels Delta</div>
                    <div className="text-sm font-mono font-bold text-white mt-0.5">
                      {diffSummary.leftCounts.channels} → {diffSummary.rightCounts.channels}
                    </div>
                    <div className="text-[10px] text-emerald-400">
                      +{diffSummary.addedChannels.length} added / -
                      {diffSummary.removedChannels.length} removed
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/40 space-y-1.5 max-h-48 overflow-y-auto">
                    <div className="font-bold text-emerald-400">
                      Added in Target B ({diffSummary.addedRoles.length + diffSummary.addedChannels.length})
                    </div>
                    {diffSummary.addedRoles.map((r) => (
                      <div key={`ar_${r}`} className="text-emerald-200 font-mono text-[11px]">
                        + [Role] {r}
                      </div>
                    ))}
                    {diffSummary.addedCategories.map((c) => (
                      <div key={`ac_${c}`} className="text-emerald-200 font-mono text-[11px]">
                        + [Category] {c}
                      </div>
                    ))}
                    {diffSummary.addedChannels.map((ch) => (
                      <div key={`ach_${ch}`} className="text-emerald-200 font-mono text-[11px]">
                        + [Channel] #{ch}
                      </div>
                    ))}
                    {diffSummary.addedRoles.length === 0 &&
                      diffSummary.addedCategories.length === 0 &&
                      diffSummary.addedChannels.length === 0 && (
                        <div className="text-[#71717A]">No new resources added.</div>
                      )}
                  </div>

                  <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/40 space-y-1.5 max-h-48 overflow-y-auto">
                    <div className="font-bold text-rose-400">
                      Removed from Base A ({diffSummary.removedRoles.length + diffSummary.removedChannels.length})
                    </div>
                    {diffSummary.removedRoles.map((r) => (
                      <div key={`rr_${r}`} className="text-rose-200 font-mono text-[11px]">
                        - [Role] {r}
                      </div>
                    ))}
                    {diffSummary.removedCategories.map((c) => (
                      <div key={`rc_${c}`} className="text-rose-200 font-mono text-[11px]">
                        - [Category] {c}
                      </div>
                    ))}
                    {diffSummary.removedChannels.map((ch) => (
                      <div key={`rch_${ch}`} className="text-rose-200 font-mono text-[11px]">
                        - [Channel] #{ch}
                      </div>
                    ))}
                    {diffSummary.removedRoles.length === 0 &&
                      diffSummary.removedCategories.length === 0 &&
                      diffSummary.removedChannels.length === 0 && (
                        <div className="text-[#71717A]">No resources removed.</div>
                      )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[#9CA3AF]">
                Select two valid architectures above to compare their roles, categories, and channels.
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="ghost" size="sm" onClick={() => setCompareModalOpen(false)}>
                Close Comparison
              </Button>
            </div>
          </div>
        </div>
      )}

      {restoreModalData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#252525] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Restore Snapshot: {restoreModalData.name}
            </h3>
            <p className="text-xs text-[#9CA3AF] leading-relaxed">
              This snapshot contains{' '}
              <strong className="text-white">
                {restoreModalData.data?.roles?.length || 0} roles
              </strong>
              ,{' '}
              <strong className="text-white">
                {restoreModalData.data?.categories?.length || 0} categories
              </strong>
              , and{' '}
              <strong className="text-white">
                {restoreModalData.data?.channels?.length || 0} channels
              </strong>
              . Choose whether to restore into your local Architecture Editor workspace or proceed directly to the Deployment Center to provision onto a connected Discord server.
            </p>
            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setRestoreModalData(null)}>
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5 text-[#906BFF]" />}
                onClick={() => handleConfirmRestore(false)}
              >
                Restore to Workspace
              </Button>
              {onRestoreAndDeploy && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Rocket className="w-3.5 h-3.5 text-white" />}
                  onClick={() => handleConfirmRestore(true)}
                >
                  Restore & Deploy to Discord Server
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#252525] rounded-xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">
              Import & Validate Blueprint JSON
            </h3>
            <p className="text-xs text-[#9CA3AF]">
              Paste an exported GuildForge blueprint JSON below. Schema validation will verify roles, categories, channels, and permission overwrites before importing:
            </p>
            <textarea
              rows={8}
              value={importedJson}
              onChange={(e) => setImportedJson(e.target.value)}
              placeholder="Paste JSON here..."
              className="w-full bg-[#080808] border border-[#252525] rounded-lg p-3 text-xs text-white font-mono focus:outline-none focus:border-[#7547FF] resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" size="sm" onClick={() => setIsImportModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!importedJson.trim()}
                onClick={handleImportJson}
              >
                Validate & Import
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

