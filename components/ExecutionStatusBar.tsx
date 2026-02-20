import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Task, AgentStatus, ExperienceMode } from '../types';
import { StopIcon } from './icons/StopIcon';
import { SpinnerIcon } from './icons/SpinnerIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { BrainIcon } from './icons/BrainIcon';

interface ExecutionStatusBarProps {
    tasks: Task[];
    agentStatus: AgentStatus;
    onStopExecution: () => void;
    experienceMode: ExperienceMode;
}

const confidenceByStatus: Record<AgentStatus, string> = {
    IDLE: 'N/A',
    RUNNING: 'High',
    PAUSED: 'Medium',
    FINISHED: 'Very High',
    SYNTHESIZING: 'Medium',
    ERROR: 'Low',
};

export const ExecutionStatusBar: React.FC<ExecutionStatusBarProps> = ({ tasks, agentStatus, onStopExecution, experienceMode }) => {
    const { statusText, Icon, phrase, celebration } = useMemo(() => {
        const executingTask = tasks.find(t => t.status === 'Executing');
        const seriousCopy = {
            running: executingTask ? `Executing: ${executingTask.title}` : 'Agent is running...',
            synthesizing: 'Synthesizing playbook from successful run.',
            finished: 'All tasks completed successfully.',
            error: 'Execution halted: an error occurred.',
            idle: 'ECHO is idle. Awaiting command.',
        };
        const spiceCopy = {
            running: executingTask ? `Locked in on: ${executingTask.title}` : 'Engines warm. Working through your run.',
            synthesizing: 'Bottling this workflow into a reusable playbook.',
            finished: 'Mission complete. Smooth run end-to-end.',
            error: 'Hit turbulence. Recovering path options.',
            idle: 'Standing by for your next big move.',
        };

        const copy = experienceMode === 'SERIOUS' ? seriousCopy : spiceCopy;

        switch (agentStatus) {
            case AgentStatus.RUNNING:
                return {
                    statusText: copy.running,
                    Icon: <SpinnerIcon className="w-5 h-5 animate-spin text-cyan-600 dark:text-[#00D4FF]" />,
                    phrase: experienceMode === 'SERIOUS' ? 'Status: In Progress' : 'Momentum: Building',
                    celebration: null,
                };
            case AgentStatus.SYNTHESIZING:
                return {
                    statusText: copy.synthesizing,
                    Icon: <BrainIcon className="w-5 h-5 text-[#8B5CF6]" />,
                    phrase: experienceMode === 'SERIOUS' ? 'Status: Packaging Knowledge' : 'Bonus round: converting wins to memory',
                    celebration: null,
                };
            case AgentStatus.FINISHED:
                return {
                    statusText: copy.finished,
                    Icon: <ClipboardCheckIcon className="w-5 h-5 text-green-500" />,
                    phrase: experienceMode === 'SERIOUS' ? 'Status: Completed' : 'Clean finish unlocked',
                    celebration: experienceMode === 'SPICE' ? '🎉 Micro-celebration: All checkpoints cleared.' : null,
                };
            case AgentStatus.ERROR:
                return {
                    statusText: copy.error,
                    Icon: <StopIcon className="w-5 h-5 text-red-500" />,
                    phrase: experienceMode === 'SERIOUS' ? 'Status: Intervention Required' : 'Fallback mode engaged',
                    celebration: null,
                };
            case AgentStatus.IDLE:
            default:
                return {
                    statusText: copy.idle,
                    Icon: null,
                    phrase: experienceMode === 'SERIOUS' ? 'Status: Ready' : 'Ready when you are',
                    celebration: null,
                };
        }
    }, [tasks, agentStatus, experienceMode]);

    const isExecuting = agentStatus === AgentStatus.RUNNING;

    return (
        <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-28 md:bottom-24 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-3xl z-30"
        >
            <div className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-xl border border-cyan-600/50 dark:border-[#00D4FF]/50 rounded-lg shadow-2xl shadow-black/50 p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                    {Icon}
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-zinc-800 dark:text-gray-200 truncate">{statusText}</p>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-gray-400">
                            <span>{phrase}</span>
                            <span>•</span>
                            <span>Confidence: {confidenceByStatus[agentStatus]}</span>
                        </div>
                        {celebration && <p className="text-[11px] text-green-500 mt-1">{celebration}</p>}
                    </div>
                </div>
                {isExecuting && (
                    <button
                        onClick={onStopExecution}
                        className="flex items-center gap-2 bg-red-500/80 hover:bg-red-500 text-white font-bold text-sm py-1.5 px-3 rounded-md transition-colors"
                    >
                        <StopIcon className="w-4 h-4" />
                        <span>Stop</span>
                    </button>
                )}
            </div>
        </motion.div>
    );
};
