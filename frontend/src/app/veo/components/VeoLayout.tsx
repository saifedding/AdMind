import React from 'react';

interface VeoLayoutProps {
    children: React.ReactNode;
}

export function VeoLayout({ children }: VeoLayoutProps) {
    return (
        <div className="min-h-screen bg-slate-950 text-slate-50 font-sans selection:bg-purple-500/30">
            <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-purple-900/20 via-slate-950 to-slate-950 pointer-events-none" />
            <div className="relative z-10 flex flex-row h-screen overflow-hidden">
                {children}
            </div>
        </div>
    );
}
