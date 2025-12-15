import React, { useEffect, useState } from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Calendar, ChevronRight, Trash2, Play } from 'lucide-react';
import { adsApi, VeoSessionResponse } from '@/lib/api';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface VeoHistoryProps {
    onSelectSession: (session: VeoSessionResponse) => void;
    currentSessionId?: number;
    workflowFilter?: 'text-to-video' | 'image-to-video' | 'all'; // Filter by workflow type
}

export function VeoHistory({ onSelectSession, currentSessionId, workflowFilter = 'all' }: VeoHistoryProps) {
    const [sessions, setSessions] = useState<VeoSessionResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    const loadSessions = async () => {
        try {
            setLoading(true);
            // Pass workflow filter to backend for server-side filtering
            const filterParam = workflowFilter === 'all' ? undefined : workflowFilter;
            const data = await adsApi.listVeoSessions(0, 50, filterParam);
            setSessions(data);
        } catch (error) {
            console.error('Failed to load sessions:', error);
            toast.error('Failed to load history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSessions();
    }, [workflowFilter]); // Reload when filter changes

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to delete this session? This will delete all generated videos.')) return;

        try {
            setDeletingId(id);
            await adsApi.deleteVeoSession(id);
            setSessions(prev => prev.filter(s => s.id !== id));
            toast.success('Session deleted');
        } catch (error) {
            toast.error('Failed to delete session');
        } finally {
            setDeletingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full text-slate-500">
                <Loader2 className="w-6 h-6 animate-spin mr-2" />
                Loading history...
            </div>
        );
    }

    if (sessions.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-6 text-center">
                <Clock className="w-12 h-12 mb-4 opacity-20" />
                <p>No history found</p>
                <p className="text-xs mt-2 opacity-60">Generate your first video to see it here</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full px-4 py-2">
            <div className="space-y-3 pb-4">
                {sessions.map((session) => (
                    <Card
                        key={session.id}
                        className={`p-4 cursor-pointer transition-all hover:bg-slate-800/50 border-slate-800 bg-slate-900/30 ${currentSessionId === session.id ? 'ring-1 ring-purple-500 border-purple-500/50 bg-purple-500/5' : ''}`}
                        onClick={() => onSelectSession(session)}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <Badge variant="outline" className="bg-slate-950/50 text-xs font-mono text-slate-400 border-slate-800">
                                #{session.id}
                            </Badge>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500">
                                    {session.created_at ? formatDistanceToNow(new Date(session.created_at), { addSuffix: true }) : ''}
                                </span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-slate-600 hover:text-red-400 -mr-2"
                                    onClick={(e) => handleDelete(e, session.id)}
                                    disabled={deletingId === session.id}
                                >
                                    {deletingId === session.id ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : (
                                        <Trash2 className="w-3 h-3" />
                                    )}
                                </Button>
                            </div>
                        </div>

                        <p className="text-sm text-slate-300 line-clamp-2 mb-3 font-light">
                            {session.script || "No script"}
                        </p>

                        <div className="flex flex-wrap gap-1.5">
                            {session.selected_styles.slice(0, 3).map(style => (
                                <Badge key={style} variant="secondary" className="text-[10px] bg-slate-800 text-slate-400 hover:bg-slate-700">
                                    {style}
                                </Badge>
                            ))}
                            {session.selected_styles.length > 3 && (
                                <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-400">
                                    +{session.selected_styles.length - 3}
                                </Badge>
                            )}
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-slate-500 border-t border-slate-800/50 pt-3">
                            <div className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(session.created_at).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-1 text-purple-400">
                                Open <ChevronRight className="w-3 h-3" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </ScrollArea>
    );
}
