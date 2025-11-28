import React from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette } from 'lucide-react';
import { Style, CharacterPreset } from '../hooks/useVeoGenerator';

interface VeoStyleSelectorProps {
    availableStyles: Style[];
    selectedStyles: string[];
    handleStyleToggle: (id: string) => void;
    characterPresets: CharacterPreset[];
    selectedCharacter: string;
    setSelectedCharacter: (id: string) => void;
}

export function VeoStyleSelector({
    availableStyles,
    selectedStyles,
    handleStyleToggle,
    characterPresets,
    selectedCharacter,
    setSelectedCharacter
}: VeoStyleSelectorProps) {
    return (
        <div className="space-y-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                <Palette className="w-4 h-4 text-pink-400" />
                Style & Character (optional)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Visual Styles</Label>
                    <Select value={selectedStyles[0] || 'none'} onValueChange={handleStyleToggle}>
                        <SelectTrigger className="bg-slate-950/50 border-slate-800 text-slate-300 h-10">
                            <SelectValue placeholder="Select a visual style..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                            <SelectItem value="none">None</SelectItem>
                            {availableStyles.map(style => (
                                <SelectItem key={style.id} value={style.id}>{style.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Character Preset</Label>
                    <Select value={selectedCharacter} onValueChange={setSelectedCharacter}>
                        <SelectTrigger className="bg-slate-950/50 border-slate-800 text-slate-300 h-10">
                            <SelectValue placeholder="Select character..." />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-slate-300">
                            <SelectItem value="none">None (AI Decide)</SelectItem>
                            {characterPresets.map(p => (
                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>
    );
}
