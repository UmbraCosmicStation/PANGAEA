import React from 'react';
import type { IFileNode } from '../../features/data-provider/types';

interface TileInfoOverlayProps {
    node: IFileNode | null;
}

export const TileInfoOverlay: React.FC<TileInfoOverlayProps> = ({ node }) => {
    if (!node) return null;

    // Normalize modified date (API may return string/Date)
    const modifiedDate =
        node.lastModified instanceof Date
            ? node.lastModified
            : new Date(node.lastModified || Date.now());

    // Helper to format bytes
    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="absolute top-4 left-4 bg-black/80 text-white p-4 rounded-lg border border-cyan-500/30 backdrop-blur-sm shadow-lg max-w-sm z-50 pointer-events-none select-none">
            <div className="flex items-center gap-2 mb-2">
                <div className={`w-3 h-3 rounded-full ${node.type === 'dir' ? 'bg-yellow-400' : 'bg-green-400'}`} />
                <h3 className="font-bold text-lg truncate">{node.name}</h3>
            </div>

            <div className="space-y-1 text-sm text-gray-300">
                <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Type</span>
                    <span>{node.type.toUpperCase()}</span>
                </div>
                <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Size</span>
                    <span className="font-mono text-cyan-400">{formatBytes(node.size)}</span>
                </div>
                {node.dailyChange !== undefined && node.dailyChange > 0 && (
                    <div className="flex justify-between gap-4">
                        <span className="text-gray-500">Growth (24h)</span>
                        <span className="font-mono text-green-400">+{formatBytes(node.dailyChange)}</span>
                    </div>
                )}
                <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Modified</span>
                    <span>{Number.isNaN(modifiedDate.getTime()) ? '-' : modifiedDate.toLocaleDateString()}</span>
                </div>
            </div>

            {/* Circuit Deco Line */}
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-cyan-500 opacity-50"></div>
        </div>
    );
};
