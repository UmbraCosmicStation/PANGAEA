
import React, { useMemo, useState } from 'react';
import type { IFileNode } from '../../features/data-provider/types';

interface FileListViewProps {
    nodes: IFileNode[];
    onNodeSelect?: (node: IFileNode) => void;
}

export const FileListView: React.FC<FileListViewProps> = ({ nodes, onNodeSelect }) => {
    const [sortField, setSortField] = useState<keyof IFileNode>('size');
    const [sortDesc, setSortDesc] = useState(true);
    const [filter, setFilter] = useState('');

    const filteredAndSorted = useMemo(() => {
        let result = nodes.filter(n =>
            n.name.toLowerCase().includes(filter.toLowerCase()) ||
            (n.tags && n.tags.some(t => t.toLowerCase().includes(filter.toLowerCase())))
        );

        result.sort((a, b) => {
            const valA = a[sortField] || 0;
            const valB = b[sortField] || 0;

            if (valA < valB) return sortDesc ? 1 : -1;
            if (valA > valB) return sortDesc ? -1 : 1;
            return 0;
        });

        return result;
    }, [nodes, filter, sortField, sortDesc]);

    const formatSize = (bytes: number) => {
        if (bytes > 1000000) return `${(bytes / 1000000).toFixed(2)} MB`;
        if (bytes > 1000) return `${(bytes / 1000).toFixed(2)} KB`;
        return `${bytes} B`;
    };

    return (
        <div className="absolute inset-0 z-40 bg-[#0f172a] text-white p-8 pt-20 overflow-auto">
            <div className="max-w-6xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-blue-400">Project Files ({nodes.length})</h2>
                    <input
                        type="text"
                        placeholder="Search files..."
                        className="bg-slate-800 border border-slate-600 rounded px-4 py-2 text-sm focus:outline-none focus:border-blue-500 w-64"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                    />
                </div>

                <div className="bg-slate-900 rounded-lg border border-slate-700 overflow-hidden shadow-2xl">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-800 text-slate-400 uppercase text-xs tracking-wider">
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => setSortField('name')}>Name</th>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => setSortField('tags')}>Cluster</th>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => setSortField('size')}>Size</th>
                                <th className="p-4 cursor-pointer hover:text-white" onClick={() => setSortField('dailyChange')}>Daily Change</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                            {filteredAndSorted.map(node => (
                                <tr
                                    key={node.id}
                                    className="hover:bg-slate-800/50 transition-colors cursor-pointer"
                                    onClick={() => onNodeSelect?.(node)}
                                >
                                    <td className="p-4 flex items-center gap-3">
                                        <span className="opacity-50 text-xl">
                                            {node.size > 2000000 ? '🏢' : node.size > 500000 ? '🏠' : '📄'}
                                        </span>
                                        <span className="font-medium text-slate-200">{node.name}</span>
                                    </td>
                                    <td className="p-4 text-slate-400">
                                        {node.tags?.map(t => (
                                            <span key={t} className="inline-block px-2 py-0.5 rounded-full bg-slate-700 text-xs mr-2 border border-slate-600">
                                                {t}
                                            </span>
                                        ))}
                                    </td>
                                    <td className="p-4 font-mono text-sm text-blue-300">
                                        {formatSize(node.size)}
                                    </td>
                                    <td className="p-4 font-mono text-sm text-green-400">
                                        {node.dailyChange ? `+${formatSize(node.dailyChange)}` : '-'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
