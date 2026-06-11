import { useEffect, useRef, useState } from 'react';
import { IsoEngine } from '../../core/engine/IsoEngine';
import { ViewModeTabs } from './ViewModeTabs';
import type { IFileNode } from '../../features/data-provider/types';

export const IsoCanvas = () => {
    const containerRef = useRef<HTMLDivElement>(null);
    const engineRef = useRef<IsoEngine | null>(null);
    const [status, setStatus] = useState<string>("Initializing...");
    const [error, setError] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'iso' | 'map' | 'list'>('iso');
    const [hoveredNode, setHoveredNode] = useState<IFileNode | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Initialize Engine with Hover Callback
        const engine = new IsoEngine((node) => {
            setHoveredNode(node);
        });

        const init = async () => {
            try {
                setStatus("Booting Engine...");
                await engine.init(containerRef.current!);
                engineRef.current = engine;
                setStatus("Engine Ready");
            } catch (err: any) {
                console.error("IsoEngine Init Failed:", err);
                setError(err.message || String(err));
                setStatus("Error");
            }
        };

        init();

        return () => {
            engine.destroy();
            engineRef.current = null;
        };
    }, []);

    const handleModeChange = (mode: 'iso' | 'map' | 'list') => {
        setViewMode(mode);
        if (engineRef.current) {
            if (mode !== 'list') {
                engineRef.current.setProjection(mode);
            }
        }
    };

    return (
        <div className="relative w-full h-full bg-gradient-to-b from-slate-900 to-slate-800">
            {/* Main Canvas Area */}
            <div
                ref={containerRef}
                className={`w-full h-full absolute top-0 left-0 transition-opacity duration-500 ease-in-out ${viewMode === 'list' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
            />

            {/* HUD / Glass Layer */}
            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between z-10">

                {/* Header Bar */}
                <div className="flex justify-between items-start">
                    {/* Title & Status Block */}
                    <div className="flex flex-col gap-2">
                        <div className="bg-black/20 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-3 shadow-sm">
                            <div className="w-3 h-3 rounded-full bg-blue-400 animate-pulse shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
                            <h1 className="text-white font-bold tracking-wide text-lg drop-shadow-sm">
                                Deep Ocean <span className="text-white/40 font-light mx-1">|</span> v2.0
                            </h1>
                        </div>

                        {/* Status Line */}
                        <div className="px-2">
                            <p className={`font-mono text-[10px] tracking-wider uppercase transition-colors duration-300 ${error ? 'text-red-400' : 'text-emerald-400/80'}`}>
                                System: {status}
                            </p>
                        </div>
                    </div>

                    {/* Navigation Tabs (Pointer Events Auto) */}
                    <div className="pointer-events-auto">
                        <ViewModeTabs current={viewMode} onChange={handleModeChange} />
                    </div>
                </div>

                {/* Info Card (Bottom Right) */}
                {hoveredNode && (
                    <div className="absolute bottom-6 right-6 pointer-events-none animate-slide-up">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 p-5 rounded-2xl shadow-2xl w-64">
                            <h4 className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-1">
                                {hoveredNode.type.toUpperCase()}
                            </h4>
                            <p className="text-white font-medium text-lg truncate leading-tight">
                                {hoveredNode.name}
                            </p>
                            <p className="text-white/50 text-xs mt-1 truncate">
                                {hoveredNode.path}
                            </p>

                            <div className="mt-4 pt-3 border-t border-white/10 flex flex-col gap-1 text-xs">
                                <div className="flex justify-between items-center">
                                    <span className="text-white/40">Total Size</span>
                                    <span className="text-white font-mono">
                                        {(hoveredNode.size / 1024).toFixed(1)} KB
                                    </span>
                                </div>
                                {(hoveredNode as any).trendingFile && (
                                    <div className="flex justify-between items-center mt-1">
                                        <span className="text-amber-400/80">🔥 Trending</span>
                                        <span className="text-white font-mono truncate max-w-[100px]">
                                            {(hoveredNode as any).trendingFile}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Error Notification (Bottom Left) */}
                {error && (
                    <div className="bg-red-500/10 backdrop-blur-lg p-4 rounded-xl border border-red-500/30 pointer-events-auto self-start max-w-md shadow-2xl">
                        <h3 className="text-red-400 font-bold text-sm mb-1 uppercase tracking-wider flex items-center gap-2">
                            <span className="text-lg">⚠</span> Engine Failure
                        </h3>
                        <pre className="text-xs text-white/70 whitespace-pre-wrap font-mono bg-black/20 p-2 rounded-lg">{error}</pre>
                    </div>
                )}

                {/* List View Overlay (Full Glass) */}
                {viewMode === 'list' && (
                    <div className="absolute inset-0 z-20 bg-slate-900/40 backdrop-blur-xl flex items-center justify-center p-20 pointer-events-auto transition-all duration-500 animate-fade-in">
                        <div className="w-full h-full bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl overflow-hidden flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mb-6 text-2xl text-white/50 border border-white/5">
                                📄
                            </div>
                            <h2 className="text-3xl text-white font-bold mb-2 tracking-tight">File Archive</h2>
                            <p className="text-white/40 max-w-sm leading-relaxed">
                                Standard data view is currently under construction.
                                Please use Isometric Visualization for now.
                            </p>

                            <button
                                onClick={() => handleModeChange('iso')}
                                className="mt-8 px-6 py-2 bg-white text-black rounded-full font-semibold hover:bg-blue-50 transition-colors"
                            >
                                Return to 3D View
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
