import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { CloseIcon } from './icons/CloseIcon';
import { Artifact } from '../types';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { ClipboardCheckIcon } from './icons/ClipboardCheckIcon';
import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { LinkIcon } from './icons/LinkIcon';

interface ArtifactsPanelProps {
    artifacts: Artifact[];
    highlightedArtifactId: string | null;
    onShareArtifact: () => void;
    onClose: () => void;
}

const ArtifactActions: React.FC<{ artifact: Artifact; onShareArtifact: () => void }> = ({ artifact, onShareArtifact }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(artifact.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
    };

    const handleExport = () => {
        const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `${artifact.title.replace(/\s+/g, '-').toLowerCase() || 'artifact'}.txt`;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const handleShare = async () => {
        const preview = artifact.content.slice(0, 180);
        const sharePayload = `${artifact.title}\n\n${preview}${artifact.content.length > 180 ? '…' : ''}`;
        await navigator.clipboard.writeText(sharePayload);
        onShareArtifact();
    };

    return (
        <div className="flex items-center gap-2">
            <button onClick={handleExport} className="text-xs font-semibold px-2 py-1 rounded-md bg-white/10 text-gray-300 hover:bg-white/20 transition-colors">Export</button>
            <button onClick={handleShare} className="flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors">
                <LinkIcon className="w-3.5 h-3.5" />
                Share
            </button>
            <button
                onClick={handleCopy}
                className={`flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md transition-colors ${copied ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-gray-300 hover:bg-white/20'}`}
            >
                {copied ? <ClipboardCheckIcon className="w-4 h-4" /> : <DocumentTextIcon className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy'}
            </button>
        </div>
    );
};

const CodeArtifact: React.FC<{ artifact: Artifact; onShareArtifact: () => void }> = ({ artifact, onShareArtifact }) => (
    <div className="bg-black/20 dark:bg-black/40 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="flex justify-between items-center p-3 bg-black/10 dark:bg-black/20 border-b border-black/10 dark:border-white/10">
            <h4 className="font-semibold text-zinc-800 dark:text-gray-200">{artifact.title}</h4>
            <ArtifactActions artifact={artifact} onShareArtifact={onShareArtifact} />
        </div>
        <pre className="p-4 text-xs font-mono text-zinc-700 dark:text-gray-300 overflow-x-auto">
            <code>{artifact.content}</code>
        </pre>
    </div>
);

const LivePreviewArtifact: React.FC<{ artifact: Artifact; onShareArtifact: () => void }> = ({ artifact, onShareArtifact }) => {
    const { code, result } = JSON.parse(artifact.content);

    return (
        <div className="bg-black/20 dark:bg-black/40 rounded-lg border border-black/10 dark:border-white/10 overflow-hidden">
            <div className="flex justify-between items-center p-3 bg-black/10 dark:bg-black/20 border-b border-black/10 dark:border-white/10">
                <h4 className="font-semibold text-zinc-800 dark:text-gray-200">{artifact.title}</h4>
                <ArtifactActions artifact={artifact} onShareArtifact={onShareArtifact} />
            </div>
            <div className="p-4">
                <h5 className="text-sm font-semibold mb-2 text-gray-400">Live Preview</h5>
                <iframe srcDoc={code} title="Live Preview" sandbox="allow-scripts" className="w-full h-48 rounded-md bg-white border border-black/10 dark:border-white/10" />
            </div>
            <div className="p-4 border-t border-black/10 dark:border-white/10">
                <h5 className="text-sm font-semibold mb-2 text-gray-400">Execution Result</h5>
                <pre className="p-3 text-xs font-mono text-zinc-700 dark:text-gray-300 overflow-x-auto bg-black/20 rounded-md">
                    <code>{result}</code>
                </pre>
            </div>
        </div>
    );
};

export const ArtifactsPanel: React.FC<ArtifactsPanelProps> = ({ artifacts, highlightedArtifactId, onShareArtifact, onClose }) => {
    const highlightedArtifact = useMemo(() => artifacts.find(a => a.id === highlightedArtifactId) ?? artifacts.at(-1), [artifacts, highlightedArtifactId]);

    return (
        <motion.div className="fixed inset-0 z-50 flex justify-end" initial={{ backgroundColor: 'rgba(0,0,0,0)' }} animate={{ backgroundColor: 'rgba(0,0,0,0.6)' }} exit={{ backgroundColor: 'rgba(0,0,0,0)' }} onClick={onClose}>
            <motion.div
                className="w-full max-w-2xl h-full bg-zinc-100 dark:bg-[#0F0F0F] border-l-2 border-green-500/50 shadow-2xl flex flex-col"
                initial={{ x: '100%' }}
                animate={{ x: '0%' }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="p-6 flex justify-between items-center border-b border-black/10 dark:border-white/10 flex-shrink-0">
                    <h2 className="flex items-center gap-3 text-xl font-bold text-zinc-800 dark:text-gray-100">
                        <ArchiveBoxIcon className="w-6 h-6 text-green-500" />
                        Generated Artifacts
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-black dark:hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>

                <div className="p-6 flex-grow overflow-y-auto space-y-4">
                    {highlightedArtifact && (
                        <div className="rounded-lg border border-green-500/40 bg-green-500/5 p-4">
                            <p className="text-xs uppercase tracking-wider text-green-500 font-bold">Latest Reveal</p>
                            <h3 className="mt-1 font-semibold text-zinc-900 dark:text-white">{highlightedArtifact.title}</h3>
                            <p className="text-xs mt-1 text-zinc-600 dark:text-gray-400">Preview ready. Export or share in one click.</p>
                        </div>
                    )}

                    {artifacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4 text-gray-500">
                            <ArchiveBoxIcon className="w-20 h-20 text-zinc-300 dark:text-zinc-700 mb-4" />
                            <h3 className="text-lg font-bold">No Artifacts Generated</h3>
                            <p className="max-w-sm mt-1">When an agent produces a final output like a code file or report, it will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {artifacts.map(artifact => (
                                artifact.type === 'live-preview'
                                    ? <LivePreviewArtifact key={artifact.id} artifact={artifact} onShareArtifact={onShareArtifact} />
                                    : <CodeArtifact key={artifact.id} artifact={artifact} onShareArtifact={onShareArtifact} />
                            ))}
                        </div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};
