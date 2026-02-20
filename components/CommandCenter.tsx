import React, { useState } from 'react';
import { MobileControlBar } from './MobileControlBar';
import { SendIcon } from './icons/SendIcon';

interface CommandCenterProps {
    onSendCommand: (prompt: string, isWebToolActive: boolean) => void;
    inputValue: string;
    onInputChange: (value: string) => void;
}

const V1_PROMISE = 'ECHO turns a plain-English app idea into a deployment-ready build plan, code scaffold, and launch checklist in one guided run.';

export const CommandCenter: React.FC<CommandCenterProps> = ({ onSendCommand, inputValue, onInputChange }) => {
    const [isWebToolActive, setIsWebToolActive] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onInputChange(e.target.value);
        e.target.style.height = 'auto';
        e.target.style.height = `${e.target.scrollHeight}px`;
    };

    const handleSend = () => {
        if (inputValue.trim()) {
            onSendCommand(inputValue, isWebToolActive);
            setIsWebToolActive(false);
        }
    };

    const handleWebToolToggle = () => setIsWebToolActive(prev => !prev);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const inputPlaceholder = isWebToolActive
        ? 'Share a URL or app reference to pull into your build plan...'
        : 'Describe the app you want to launch (users, core flow, and deadline)...';

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40">
            <div className="max-w-3xl mx-auto px-4 pb-4">
                <div className="bg-white/80 dark:bg-[#121212]/80 backdrop-blur-2xl border-2 border-cyan-500/90 dark:border-[#00D4FF]/90 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/50 overflow-hidden">
                    <div className="px-4 pt-3">
                        <p className="text-xs text-cyan-700 dark:text-cyan-300 font-medium">{V1_PROMISE}</p>
                    </div>
                    <div className="p-4 flex items-end gap-3">
                        <textarea
                            value={inputValue}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            placeholder={inputPlaceholder}
                            rows={1}
                            className="w-full bg-transparent text-zinc-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-0 transition-colors duration-300 max-h-48"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim()}
                            className="bg-cyan-500 hover:bg-cyan-600 dark:bg-[#00D4FF] dark:hover:bg-[#00b8e6] text-white dark:text-black rounded-full w-10 h-10 flex-shrink-0 flex items-center justify-center transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            aria-label="Send command"
                        >
                            <SendIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <MobileControlBar isWebToolActive={isWebToolActive} onWebToolClick={handleWebToolToggle} />
                </div>
            </div>
        </div>
    );
};
