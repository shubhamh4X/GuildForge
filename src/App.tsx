import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { Sidebar, NavTab } from './components/Sidebar.tsx';
import { Header } from './components/Header.tsx';
import { LandingPage } from './components/LandingPage.tsx';
import { OverviewView } from './components/OverviewView.tsx';
import { BuilderView } from './components/BuilderView.tsx';
import { ServerPreviewEditor } from './components/ServerPreviewEditor.tsx';
import { SecurityAuditor } from './components/SecurityAuditor.tsx';
import { DeploymentHub } from './components/DeploymentHub.tsx';
import { BackupsHub } from './components/BackupsHub.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { SettingsView } from './components/SettingsView.tsx';
import { BotInviteModal } from './components/BotInviteModal.tsx';
import { Button } from './components/ui/Button.tsx';
import { apiClient } from './services/apiClient.ts';
import { ServerBlueprint, QualityAuditReport, ConnectedGuild } from './types/discord.ts';
import { validateServerArchitecture } from './services/validator.ts';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('overview');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [savedBlueprints, setSavedBlueprints] = useState<ServerBlueprint[]>([]);
  const [activeBlueprint, setActiveBlueprint] = useState<ServerBlueprint | null>(null);

  const [guilds, setGuilds] = useState<ConnectedGuild[]>([]);
  const [selectedGuildId, setSelectedGuildId] = useState<string>('');
  const [botOnline, setBotOnline] = useState<boolean>(false);
  const [botUsername, setBotUsername] = useState<string | undefined>(undefined);
  const [auditReport, setAuditReport] = useState<QualityAuditReport | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'info' | 'error';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  useEffect(() => {
    if (activeBlueprint) {
      const rep = validateServerArchitecture(activeBlueprint);
      setAuditReport(rep);
    } else {
      setAuditReport(null);
    }
  }, [activeBlueprint]);

  useEffect(() => {
    apiClient
      .getBlueprints()
      .then(res => {
        if (res.blueprints) {
          setSavedBlueprints(res.blueprints);
        }
        if (res.activeBlueprint) {
          setActiveBlueprint(res.activeBlueprint);
        } else if (res.blueprints && res.blueprints.length > 0) {
          setActiveBlueprint(res.blueprints[0]);
        } else {
          setActiveBlueprint(null);
        }
      })
      .catch(err => console.warn('Could not fetch blueprints from server:', err));

    Promise.all([apiClient.getGuilds(), apiClient.getSettings()])
      .then(([gRes, sRes]: [any, any]) => {
        if (gRes.guilds) {
          setGuilds(gRes.guilds);
          if (sRes.selectedGuildId) {
            setSelectedGuildId(sRes.selectedGuildId);
          } else if (gRes.guilds.length > 0) {
            setSelectedGuildId(gRes.guilds[0].id);
          }
        }
        if (sRes.gatewayStatus) {
          setBotOnline(sRes.gatewayStatus.status === 'ONLINE');
          if (sRes.gatewayStatus.botUser) {
            setBotUsername(
              `${sRes.gatewayStatus.botUser.username}#${sRes.gatewayStatus.botUser.discriminator}`
            );
          }
        }
      })
      .catch(err => console.warn('Could not fetch guilds from server:', err));
  }, []);

  const upsertBlueprintInList = (bp: ServerBlueprint) => {
    setSavedBlueprints(prev => {
      const exists = prev.some(item => item.id === bp.id);
      if (exists) {
        return prev.map(item => (item.id === bp.id ? bp : item));
      }
      return [bp, ...prev];
    });
  };

  const handleSelectGuild = (guildId: string) => {
    setSelectedGuildId(guildId);
    apiClient.updateSettings({ selectedGuildId: guildId }).catch(() => {});
  };

  const handleGuildsUpdated = (updatedGuilds: ConnectedGuild[], newSelectedId?: string) => {
    setGuilds(updatedGuilds);
    if (newSelectedId) {
      setSelectedGuildId(newSelectedId);
    } else if (
      updatedGuilds.length > 0 &&
      !updatedGuilds.some(g => g.id === selectedGuildId)
    ) {
      setSelectedGuildId(updatedGuilds[0].id);
    } else if (updatedGuilds.length === 0) {
      setSelectedGuildId('');
    }
    apiClient
      .getSettings()
      .then((sRes: any) => {
        if (sRes.gatewayStatus) {
          setBotOnline(sRes.gatewayStatus.status === 'ONLINE');
          if (sRes.gatewayStatus.botUser) {
            setBotUsername(
              `${sRes.gatewayStatus.botUser.username}#${sRes.gatewayStatus.botUser.discriminator}`
            );
          }
        }
      })
      .catch(() => {});
  };

  const handleBlueprintGenerated = (
    newBlueprint: ServerBlueprint,
    report?: QualityAuditReport
  ) => {
    setActiveBlueprint(newBlueprint);
    upsertBlueprintInList(newBlueprint);
    if (report) {
      setAuditReport(report);
    }
    showToast(
      `AI synthesized "${newBlueprint.name}" (${newBlueprint.roles.length} roles, ${newBlueprint.channels.length} channels)!`
    );
    setActiveTab('preview');
  };

  const handleUpdateBlueprint = (updated: ServerBlueprint) => {
    setActiveBlueprint(updated);
    upsertBlueprintInList(updated);
    apiClient.saveBlueprint(updated).catch(err => console.error(err));
  };

  const handleSelectBlueprint = (bp: ServerBlueprint) => {
    setActiveBlueprint(bp);
    upsertBlueprintInList(bp);
    apiClient.updateSettings({ activeBlueprintId: bp.id }).catch((err: any) => console.error(err));
    showToast(`Loaded "${bp.name}" into Architecture Studio.`);
  };

  const handleSaveToCloud = async () => {
    if (!activeBlueprint) return;
    try {
      await apiClient.saveBlueprint(activeBlueprint);
      upsertBlueprintInList(activeBlueprint);
      showToast(`Saved "${activeBlueprint.name}" to persistent vault.`);
    } catch {
      showToast('Error saving blueprint to vault.', 'error');
    }
  };

  const handleAutoFix = (fixedBlueprint: ServerBlueprint) => {
    setActiveBlueprint(fixedBlueprint);
    upsertBlueprintInList(fixedBlueprint);
    apiClient.saveBlueprint(fixedBlueprint).catch(err => console.error(err));
    showToast('Applied 1-Click Least-Privilege & Private Isolation patches!');
  };

  const renderEmptyBlueprintNotice = (title: string) => (
    <div className="max-w-3xl mx-auto px-4 py-16">
      <div className="bg-[#111111] border border-[#252525] rounded-xl p-10 text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-[#171717] border border-[#252525] flex items-center justify-center mx-auto text-[#906BFF]">
          <Layers className="w-6 h-6" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <h2 className="text-lg font-bold text-white">{title} — No Active Blueprint</h2>
          <p className="text-xs text-[#9CA3AF] leading-relaxed">
            No server architecture blueprint has been generated yet. Use Blueprint Studio to generate a custom blueprint from your requirements or import a JSON snapshot in Backups.
          </p>
        </div>
        <div className="pt-2 flex items-center justify-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={() => setActiveTab('builder')}
          >
            Open Blueprint Studio
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080808] text-white flex flex-col font-sans selection:bg-[#7547FF] selection:text-white">

      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
          <div
            className={`px-4 py-3 rounded-xl shadow-2xl text-xs font-semibold flex items-center gap-2 border ${
              toast.type === 'success'
                ? 'bg-[#111111] border-emerald-500/50 text-emerald-300'
                : toast.type === 'error'
                ? 'bg-[#111111] border-rose-500/50 text-rose-300'
                : 'bg-[#111111] border-[#7547FF]/50 text-[#906BFF]'
            }`}
          >
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      <div className="flex-1 flex min-h-screen">

        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
          isMobileOpen={isMobileSidebarOpen}
          setIsMobileOpen={setIsMobileSidebarOpen}
          blueprintChannelCount={activeBlueprint?.channels.length || 0}
          connectedGuildCount={guilds.length}
          botOnline={botOnline}
          botUsername={botUsername}
        />

        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-200 ${
            isSidebarCollapsed ? 'lg:pl-18' : 'lg:pl-64'
          }`}
        >

          <Header
            onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
            guilds={guilds}
            selectedGuildId={selectedGuildId}
            setSelectedGuildId={handleSelectGuild}
            onOpenInviteModal={() => setIsInviteModalOpen(true)}
            onNavigateToBuilder={() => setActiveTab('builder')}
            onNavigateToSettings={() => setActiveTab('settings')}
          />

          <main className="flex-1 pb-16">
            {activeTab === 'landing' && (
              <LandingPage
                onStartBuilding={() => setActiveTab('builder')}
                onExploreFeatures={() => setActiveTab('overview')}
                onOpenInviteModal={() => setIsInviteModalOpen(true)}
              />
            )}

            {activeTab === 'overview' && (
              <OverviewView
                blueprint={activeBlueprint}
                guilds={guilds}
                selectedGuildId={selectedGuildId}
                auditReport={auditReport}
                botOnline={botOnline}
                botUsername={botUsername}
                onNavigateToBuilder={() => setActiveTab('builder')}
                onNavigateToArchitecture={() => setActiveTab('preview')}
                onNavigateToAudit={() => setActiveTab('audit')}
                onNavigateToDeploy={() => setActiveTab('deploy')}
                onOpenInviteModal={() => setIsInviteModalOpen(true)}
              />
            )}

            {activeTab === 'builder' && (
              <BuilderView
                currentBlueprint={activeBlueprint}
                onBlueprintGenerated={handleBlueprintGenerated}
                onOpenInviteModal={() => setIsInviteModalOpen(true)}
              />
            )}

            {activeTab === 'preview' &&
              (activeBlueprint ? (
                <ServerPreviewEditor
                  blueprint={activeBlueprint}
                  allBlueprints={savedBlueprints}
                  onSelectBlueprint={handleSelectBlueprint}
                  onUpdateBlueprint={handleUpdateBlueprint}
                  onRunAudit={() => setActiveTab('audit')}
                  onDeploy={() => setActiveTab('deploy')}
                  onSaveToCloud={handleSaveToCloud}
                />
              ) : (
                renderEmptyBlueprintNotice('Architecture Studio')
              ))}

            {activeTab === 'audit' &&
              (activeBlueprint && auditReport ? (
                <SecurityAuditor
                  blueprint={activeBlueprint}
                  report={auditReport}
                  onAutoFix={handleAutoFix}
                  onProceedToDeploy={() => setActiveTab('deploy')}
                />
              ) : (
                renderEmptyBlueprintNotice('Security Audit')
              ))}

            {activeTab === 'deploy' && (
              <DeploymentHub
                blueprint={activeBlueprint}
                guilds={guilds}
                selectedGuildId={selectedGuildId}
                setSelectedGuildId={handleSelectGuild}
                onGuildsUpdated={handleGuildsUpdated}
                onOpenInviteModal={() => setIsInviteModalOpen(true)}
              />
            )}

            {activeTab === 'backups' && (
              <BackupsHub
                currentBlueprint={activeBlueprint}
                onRestoreBlueprint={bp => {
                  handleUpdateBlueprint(bp);
                  setActiveTab('preview');
                  showToast(`Restored "${bp.name}" into Architecture workspace.`);
                }}
                onRestoreAndDeploy={bp => {
                  handleUpdateBlueprint(bp);
                  setActiveTab('deploy');
                  showToast(`Loaded "${bp.name}" into Deployment Control Center.`);
                }}
              />
            )}

            {activeTab === 'admin' && <AdminDashboard />}

            {activeTab === 'settings' && (
              <SettingsView
                guilds={guilds}
                onGuildsUpdated={handleGuildsUpdated}
                onOpenInviteModal={() => setIsInviteModalOpen(true)}
              />
            )}
          </main>
        </div>
      </div>

      <BotInviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        defaultServerName={activeBlueprint?.name}
        onGuildsUpdated={handleGuildsUpdated}
      />
    </div>
  );
}

