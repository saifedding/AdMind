'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Settings, Trash2, Database } from 'lucide-react';
import { toast } from 'sonner';
import { getStoredSessions, clearAllSessions } from '@/lib/storage';
import { getStoredScriptSessions, clearAllScriptSessions } from '@/lib/script-storage';

interface SettingsPageProps {
  aspectRatio: string;
  onAspectRatioChange: (ratio: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  aspectRatio,
  onAspectRatioChange,
}) => {
  const [replicatorSessionCount, setReplicatorSessionCount] = useState(0);
  const [scriptSessionCount, setScriptSessionCount] = useState(0);

  useEffect(() => {
    setReplicatorSessionCount(getStoredSessions().length);
    setScriptSessionCount(getStoredScriptSessions().length);
  }, []);

  const handleClearReplicatorSessions = () => {
    if (confirm('Are you sure you want to delete all Video Replicator sessions?')) {
      clearAllSessions();
      setReplicatorSessionCount(0);
      toast.success('Video Replicator sessions cleared');
    }
  };

  const handleClearScriptSessions = () => {
    if (confirm('Are you sure you want to delete all Script-to-Video sessions?')) {
      clearAllScriptSessions();
      setScriptSessionCount(0);
      toast.success('Script-to-Video sessions cleared');
    }
  };

  const handleClearAll = () => {
    if (confirm('Are you sure you want to delete ALL saved sessions?')) {
      clearAllSessions();
      clearAllScriptSessions();
      setReplicatorSessionCount(0);
      setScriptSessionCount(0);
      toast.success('All sessions cleared');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
          <Settings className="w-5 h-5 text-slate-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400">Configure your preferences</p>
        </div>
      </div>

      {/* Video Settings */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Video Settings</CardTitle>
          <CardDescription className="text-xs">
            Configure default video generation settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs text-slate-400">Default Aspect Ratio</label>
            <select
              value={aspectRatio}
              onChange={(e) => onAspectRatioChange(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded-md px-3 py-2 text-sm text-slate-200"
            >
              <option value="VIDEO_ASPECT_RATIO_PORTRAIT">Portrait (9:16)</option>
              <option value="VIDEO_ASPECT_RATIO_LANDSCAPE">Landscape (16:9)</option>
              <option value="VIDEO_ASPECT_RATIO_SQUARE">Square (1:1)</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Storage Management */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            Storage Management
          </CardTitle>
          <CardDescription className="text-xs">
            Manage saved sessions stored in your browser
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Video Replicator Sessions */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <div>
              <div className="text-sm text-slate-200">Video Replicator Sessions</div>
              <div className="text-xs text-slate-500">
                {replicatorSessionCount} session{replicatorSessionCount !== 1 ? 's' : ''} saved
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearReplicatorSessions}
              disabled={replicatorSessionCount === 0}
              className="border-red-700 text-red-400 hover:bg-red-900/30"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
          </div>

          {/* Script-to-Video Sessions */}
          <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
            <div>
              <div className="text-sm text-slate-200">Script-to-Video Sessions</div>
              <div className="text-xs text-slate-500">
                {scriptSessionCount} session{scriptSessionCount !== 1 ? 's' : ''} saved
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearScriptSessions}
              disabled={scriptSessionCount === 0}
              className="border-red-700 text-red-400 hover:bg-red-900/30"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear
            </Button>
          </div>

          {/* Clear All */}
          <div className="pt-2 border-t border-slate-700">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAll}
              disabled={replicatorSessionCount === 0 && scriptSessionCount === 0}
              className="w-full border-red-700 text-red-400 hover:bg-red-900/30"
            >
              <Trash2 className="w-3 h-3 mr-1" /> Clear All Sessions
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* About */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">About</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs text-slate-400">
          <p>VEO Studio - Video Generation Suite</p>
          <p>Powered by Google Gemini AI and VEO video generation.</p>
          <div className="flex gap-2 pt-2">
            <Badge variant="outline" className="text-[10px]">Next.js 14</Badge>
            <Badge variant="outline" className="text-[10px]">Gemini AI</Badge>
            <Badge variant="outline" className="text-[10px]">VEO</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
