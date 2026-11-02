import React from 'react';
import {
  Home,
  LayoutDashboard,
  Cpu,
  Layers,
  ShieldCheck,
  Rocket,
  Archive,
  Sliders,
  Settings,
  ChevronLeft,
  ChevronRight,
  Shield,
  Bot
} from 'lucide-react';

export type NavTab =
  | 'landing'
  | 'overview'
  | 'builder'
  | 'preview'
  | 'audit'
  | 'deploy'
  | 'backups'
  | 'admin'
  | 'settings';

interface SidebarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  blueprintChannelCount?: number;
  connectedGuildCount?: number;
  botOnline?: boolean;
  botUsername?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
  blueprintChannelCount = 0,
  connectedGuildCount = 0,
  botOnline = false,
  botUsername,
}) => {
  const navItems = [
    { id: 'landing' as NavTab, label: 'Home', icon: Home },
    { id: 'overview' as NavTab, label: 'Overview', icon: LayoutDashboard },
    { id: 'builder' as NavTab, label: 'Blueprint Studio', icon: Cpu, badge: 'AI' },
    { id: 'preview' as NavTab, label: 'Architecture', icon: Layers, count: blueprintChannelCount },
    { id: 'audit' as NavTab, label: 'Security Audit', icon: ShieldCheck },
    { id: 'deploy' as NavTab, label: 'Deployments', icon: Rocket },
    { id: 'backups' as NavTab, label: 'Backups', icon: Archive },
    { id: 'admin' as NavTab, label: 'Admin', icon: Sliders },
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
  ];

  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    setIsMobileOpen(false);
  };

  return (
    <>

      {isMobileOpen && (
        <div
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 bg-[#090909] border-r border-[#252525] flex flex-col justify-between transition-all duration-200 select-none ${
          isCollapsed ? 'w-18' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
      >

        <div>
          <div className="h-16 px-4 flex items-center justify-between border-b border-[#252525]">
            <div
              className="flex items-center gap-3 overflow-hidden cursor-pointer"
              onClick={() => handleSelectTab('overview')}
            >
              <div className="w-8 h-8 rounded-lg bg-[#7547FF] flex items-center justify-center shrink-0 shadow-sm shadow-[#7547FF]/30">
                <Shield className="w-4 h-4 text-white" />
              </div>

              {!isCollapsed && (
                <div className="truncate">
                  <span className="font-bold text-sm tracking-tight text-white block">
                    GuildForge
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] tracking-wide uppercase font-medium">
                    Discord Architect
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:flex p-1 rounded-md text-[#9CA3AF] hover:text-white hover:bg-[#171717] transition-colors cursor-pointer"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  title={isCollapsed ? item.label : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer ${
                    isActive
                      ? 'bg-[#171717] text-white border border-[#2e2e2e]'
                      : 'text-[#9CA3AF] hover:text-white hover:bg-[#121212]'
                  } ${isCollapsed ? 'justify-center px-0' : ''}`}
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-[#906BFF]' : 'text-[#71717A]'
                    }`}
                  />
                  {!isCollapsed && (
                    <span className="flex-1 text-left truncate">{item.label}</span>
                  )}
                  {!isCollapsed && item.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded font-semibold bg-[#7547FF]/20 text-[#906BFF] border border-[#7547FF]/30">
                      {item.badge}
                    </span>
                  )}
                  {!isCollapsed && typeof item.count === 'number' && item.count > 0 && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full font-mono bg-[#1f1f1f] text-[#9CA3AF]">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-3 border-t border-[#252525]">
          <div
            onClick={() => handleSelectTab('settings')}
            className={`flex items-center gap-2.5 p-2.5 rounded-lg bg-[#111111] border border-[#252525] cursor-pointer hover:border-[#353535] transition-colors ${
              isCollapsed ? 'justify-center p-1.5' : ''
            }`}
          >
            <div className="w-7 h-7 rounded-full bg-[#1e1e1e] border border-[#333333] flex items-center justify-center shrink-0 text-[#906BFF]">
              <Bot className="w-4 h-4" />
            </div>

            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <span className="text-xs font-semibold text-white truncate block">
                  {botUsername || 'Discord Bot'}
                </span>
                <span className="text-[10px] text-[#9CA3AF] font-mono flex items-center gap-1.5">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      botOnline ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  {botOnline
                    ? `Online • ${connectedGuildCount} Server(s)`
                    : 'Gateway Offline'}
                </span>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

