import React from 'react';
import {
  Menu,
  ChevronDown,
  ExternalLink,
  Server
} from 'lucide-react';
import { ConnectedGuild } from '../types/discord.ts';
import { Button } from './ui/Button.tsx';

interface HeaderProps {
  onOpenMobileSidebar: () => void;
  guilds: ConnectedGuild[];
  selectedGuildId: string;
  setSelectedGuildId: (id: string) => void;
  onOpenInviteModal: () => void;
  onNavigateToBuilder: () => void;
  onNavigateToSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenMobileSidebar,
  guilds,
  selectedGuildId,
  setSelectedGuildId,
  onOpenInviteModal,
  onNavigateToBuilder,
  onNavigateToSettings,
}) => {
  const currentGuild = guilds.find(g => g.id === selectedGuildId) || guilds[0];

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#080808]/90 backdrop-blur-md border-b border-[#252525] px-4 sm:px-6 flex items-center justify-between">

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-lg text-[#9CA3AF] hover:text-white hover:bg-[#171717] cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {guilds.length > 0 ? (
          <div className="relative">
            <select
              value={currentGuild?.id || ''}
              onChange={e => setSelectedGuildId(e.target.value)}
              className="bg-[#111111] hover:bg-[#171717] border border-[#252525] text-xs font-semibold text-white rounded-lg pl-3 pr-8 py-2 appearance-none focus:outline-none focus:border-[#7547FF] cursor-pointer transition-colors"
            >
              {guilds.map(g => (
                <option key={g.id} value={g.id} className="bg-[#111111] text-white">
                  {g.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] absolute right-2.5 top-3 pointer-events-none" />
          </div>
        ) : (
          <button
            onClick={onNavigateToSettings}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#111111] hover:bg-[#171717] border border-[#252525] text-xs font-medium text-[#9CA3AF] hover:text-white transition-colors cursor-pointer"
          >
            <Server className="w-3.5 h-3.5 text-[#906BFF]" />
            <span>Connect Discord Server</span>
          </button>
        )}

        {currentGuild && (
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#111111] border border-[#252525] text-[11px] font-medium">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                currentGuild.botPresent ? 'bg-emerald-400' : 'bg-amber-400'
              }`}
            />
            <span className="text-[#9CA3AF]">
              {currentGuild.botPresent ? 'Bot Verified' : 'Bot Unverified'}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2.5">

        <Button
          variant="outline"
          size="sm"
          icon={<ExternalLink className="w-3.5 h-3.5 text-[#906BFF]" />}
          onClick={onOpenInviteModal}
        >
          <span className="hidden sm:inline">Invite Bot</span>
        </Button>

        <Button
          variant="primary"
          size="sm"
          onClick={onNavigateToBuilder}
        >
          <span>Blueprint Studio</span>
        </Button>
      </div>
    </header>
  );
};

