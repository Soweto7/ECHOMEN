import React from 'react';
import { LogoIcon } from './icons/LogoIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { Task, AgentStatus, SessionStats } from '../types';
import { SystemStatusIndicator } from './SystemStatusIndicator';
import { TokenUsageIndicator } from './TokenUsageIndicator';

interface HeaderProps {
    onArtifactsClick: () => void;
    tasks: Task[];
    agentStatus: AgentStatus;
    sessionStats: SessionStats;
}

const V1_PROMISE = 'ECHO turns a plain-English app idea into a deployment-ready build plan, code scaffold, and launch checklist in one guided run.';

export const Header: React.FC<HeaderProps> = ({ onArtifactsClick, tasks, agentStatus, sessionStats }) => {
    return (
        <header className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-[#0A0A0A]/80 backdrop-blur-lg border-b border-black/10 dark:border-white/10 p-4 flex justify-between items-center z-50">
            <div className="flex items-center gap-3">
                <LogoIcon className="w-8 h-8 text-cyan-600 dark:text-[#00D4FF]" />
                <div>
                    <h1 className="text-xl font-bold tracking-wider text-zinc-800 dark:text-gray-100">ECHO v1</h1>
                    <p className="text-xs text-zinc-500 dark:text-gray-400 max-w-lg hidden md:block">{V1_PROMISE}</p>
                </div>

                <button onClick={onArtifactsClick} title="View Artifacts" className="ml-2 p-2 rounded-full text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
                    <ArchiveBoxIcon className="w-5 h-5" />
                </button>
            </div>
            <div className="flex items-center gap-4">
                <SystemStatusIndicator tasks={tasks} agentStatus={agentStatus} />
                <div className="h-6 w-px bg-black/20 dark:bg-white/20"></div>
                <TokenUsageIndicator stats={sessionStats} />
            </div>
        </header>
    );
};
