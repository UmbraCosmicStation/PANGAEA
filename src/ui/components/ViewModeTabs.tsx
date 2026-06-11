import { ComponentProps } from 'react';

type ViewMode = 'iso' | 'map' | 'list';

interface Props {
    current: ViewMode;
    onChange: (mode: ViewMode) => void;
}

export const ViewModeTabs = ({ current, onChange }: Props) => {
    const tabs: ViewMode[] = ['iso', 'map', 'list'];

    return (
        <div className="flex p-1.5 gap-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-xl shadow-lg shadow-black/10">
            {tabs.map((mode) => (
                <button
                    key={mode}
                    onClick={() => onChange(mode)}
                    className={`relative px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-out
                        ${current === mode
                            ? 'text-black bg-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.1)]'
                            : 'text-white/60 hover:text-white hover:bg-white/10'
                        }`}
                >
                    {/* Glass Shine Effect for Active Tab */}
                    {current === mode && (
                        <div className="absolute inset-x-0 top-0 h-[40%] bg-gradient-to-b from-white/40 to-transparent rounded-t-full opacity-50" />
                    )}
                    {mode.toUpperCase()}
                </button>
            ))}
        </div>
    );
};
