import React from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings2 } from 'lucide-react';

interface VeoScriptInputProps {
    script: string;
    setScript: (s: string) => void;
    useCustomInstruction: boolean;
    setUseCustomInstruction: (v: boolean) => void;
    customInstruction: string;
    setCustomInstruction: (s: string) => void;
}

export function VeoScriptInput({
    script,
    setScript,
    useCustomInstruction,
    setUseCustomInstruction,
    customInstruction,
    setCustomInstruction
}: VeoScriptInputProps) {
    return (
        <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                    <Settings2 className="w-4 h-4 text-purple-400" />
                    Script / Voice-Over
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="custom-inst-toggle" className="text-xs text-slate-400 cursor-pointer select-none">Custom Instruction</Label>
                    <Checkbox
                        id="custom-inst-toggle"
                        checked={useCustomInstruction}
                        onCheckedChange={(c) => setUseCustomInstruction(!!c)}
                        className="data-[state=checked]:bg-purple-500 border-slate-600"
                    />
                </div>
            </div>
            <div className={`grid grid-cols-1 ${useCustomInstruction ? 'lg:grid-cols-2' : ''} gap-4 transition-all duration-300`}>
                <div className="space-y-3">
                    <Textarea
                        placeholder="Enter your script here..."
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        className="min-h-[120px] bg-slate-950/50 border-slate-800 focus:border-purple-500/50 resize-none text-sm placeholder:text-slate-600"
                    />
                    <div className="flex justify-between text-xs text-slate-500">
                        <span>{script.split(/\s+/).filter(Boolean).length} words</span>
                        <span>~{Math.ceil(script.split(/\s+/).filter(Boolean).length / 3)}s duration</span>
                    </div>
                </div>
                {useCustomInstruction && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                        <Textarea
                            placeholder="Enter your custom instruction (e.g. 'Use a cinematic style with slow pans')..."
                            value={customInstruction}
                            onChange={(e) => setCustomInstruction(e.target.value)}
                            className="min-h-[120px] bg-slate-950/50 border-slate-800 focus:border-purple-500/50 resize-none text-sm placeholder:text-slate-600"
                        />
                        <div className="text-xs text-slate-500 text-right">
                            Overrides default style prompts
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
