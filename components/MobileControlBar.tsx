import React from 'react';
import { WebToolIcon } from './icons/WebToolIcon';

interface MobileControlBarProps {
    isWebToolActive: boolean;
    onWebToolClick: () => void;
}

const ControlButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    isActive?: boolean;
    onClick?: () => void;
}> = ({ icon, label, isActive = false, onClick }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-2 p-2 rounded-lg transition-all duration-200 ${
            isActive
                ? 'text-[#00D4FF] bg-black/5 dark:bg-white/5'
                : 'text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
        }`}
    >
        {icon}
        <span className="text-xs font-medium">{label}</span>
    </button>
);

export const MobileControlBar: React.FC<MobileControlBarProps> = ({ isWebToolActive, onWebToolClick }) => {
    return (
        <div className="border-t border-black/10 dark:border-white/10 mt-2 pt-2 px-2 flex justify-center items-center">
            <ControlButton
                icon={<WebToolIcon className="w-5 h-5" />}
                label="Web research"
                isActive={isWebToolActive}
                onClick={onWebToolClick}
            />
        </div>
    );
};
