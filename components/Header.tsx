import React from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { Task, AgentStatus, SessionStats, ExperienceMode, UXMetrics } from '../types';
import { SystemStatusIndicator } from './SystemStatusIndicator';
import { TokenUsageIndicator } from './TokenUsageIndicator';

interface HeaderProps {
    onSettingsClick: () => void;
    onHistoryClick: () => void;
    onArtifactsClick: () => void;
    tasks: Task[];
    agentStatus: AgentStatus;
    sessionStats: SessionStats;
    experienceMode: ExperienceMode;
    onExperienceModeChange: (mode: ExperienceMode) => void;
    uxMetrics: UXMetrics;
}

export const Header: React.FC<HeaderProps> = ({ onSettingsClick, onHistoryClick, onArtifactsClick, tasks, agentStatus, sessionStats, experienceMode, onExperienceModeChange, uxMetrics }) => {
    const completionRate = uxMetrics.runsStarted > 0
        ? Math.round((uxMetrics.runsCompleted / uxMetrics.runsStarted) * 100)
        : 0;

    return (
        <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-lg border-b border-black/10 dark:border-white/10 p-4 flex justify-between items-center z-50">
            <div className="flex items-center gap-3">
                <LogoIcon className="w-8 h-8 text-cyan-600 dark:text-[#00D4FF]" />
                <h1 className="text-xl font-bold tracking-wider text-zinc-800 dark:text-gray-100">ECHO</h1>
                
                <div className="h-6 w-px bg-black/20 dark:bg-white/20 ml-2"></div>
                
                <button onClick={onArtifactsClick} title="View Artifacts" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <ArchiveBoxIcon className="w-5 h-5" />
                </button>
                <button onClick={onHistoryClick} title="View History" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <DocumentTextIcon className="w-5 h-5" />
                </button>
                <button onClick={onSettingsClick} title="Open Settings" className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <SettingsIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-2 rounded-full border border-black/10 dark:border-white/15 p-1 bg-black/5 dark:bg-white/5">
                    <button
                        onClick={() => onExperienceModeChange('SERIOUS')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${experienceMode === 'SERIOUS' ? 'bg-zinc-800 text-white dark:bg-white dark:text-black' : 'text-zinc-600 dark:text-gray-400'}`}
                    >
                        Serious Mode
                    </button>
                    <button
                        onClick={() => onExperienceModeChange('SPICE')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded-full transition-colors ${experienceMode === 'SPICE' ? 'bg-[#FF6B00] text-white' : 'text-zinc-600 dark:text-gray-400'}`}
                    >
                        Spice Mode
                    </button>
                </div>
                <div className="hidden lg:flex items-center gap-2 text-xs text-zinc-600 dark:text-gray-400 border border-black/10 dark:border-white/10 rounded-full px-3 py-1">
                    <span>Completion {completionRate}%</span>
                    <span>•</span>
                    <span>Share rate {uxMetrics.runsCompleted > 0 ? Math.round((uxMetrics.shares / uxMetrics.runsCompleted) * 100) : 0}%</span>
                </div>
                 <SystemStatusIndicator tasks={tasks} agentStatus={agentStatus} />
                 <div className="h-6 w-px bg-black/20 dark:bg-white/20"></div>
                 <TokenUsageIndicator stats={sessionStats} />
                <img
                    src="https://picsum.photos/100/100"
                    alt="User Avatar"
                    className="w-9 h-9 rounded-full border-2 border-cyan-600/50 dark:border-[#00D4FF]/50"
                />
            </div>
        </header>
    );
};
