import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Video } from 'lucide-react';
import { VeoModel } from '@/lib/api';

interface VeoGenerationModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    prompt: { text: string; key: string } | null;
    handleGenerateVideo: () => void;
}

export function VeoGenerationModal({
    open,
    onOpenChange,
    prompt,
    handleGenerateVideo
}: VeoGenerationModalProps) {
    if (!prompt) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-slate-950 border-slate-800 text-slate-200 sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                        Generate Video Segment
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Configure settings for this specific segment.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label className="text-xs text-slate-400">Prompt</Label>
                        <div className="p-3 rounded-lg bg-slate-900/50 border border-slate-800 text-sm text-slate-300 max-h-[100px] overflow-y-auto">
                            {prompt.text}
                        </div>
                    </div>


                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleGenerateVideo} className="bg-purple-600 hover:bg-purple-500 text-white">
                        <Video className="w-4 h-4 mr-2" />
                        Start Generation
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
