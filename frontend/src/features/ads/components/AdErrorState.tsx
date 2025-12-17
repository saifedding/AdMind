'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, RefreshCw } from 'lucide-react';

interface AdErrorStateProps {
  error: string;
  onRetry: () => void;
}

export function AdErrorState({ error, onRetry }: AdErrorStateProps) {
  return (
    <div className="space-y-8">
      <div className="max-w-2xl mx-auto text-center">
        <Card className="bg-red-900/20 border-red-500">
          <CardHeader>
            <CardTitle className="text-red-400 flex items-center justify-center gap-2">
              <Brain className="h-5 w-5" />
              Connection Error
            </CardTitle>
            <CardDescription className="text-red-300">
              {error}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={onRetry} className="bg-photon-500 text-photon-950 hover:bg-photon-400">
              <RefreshCw className="mr-2 h-4 w-4" />
              Retry Connection
            </Button>
            
            <div className="bg-iridium-900/50 border border-iridium-700 rounded-lg p-4 text-left">
              <h3 className="font-mono font-semibold text-photon-300 mb-2">Setup Instructions</h3>
              <div className="text-sm text-iridium-300 space-y-1">
                <p>1. Start the backend server:</p>
                <code className="block bg-iridium-800 p-2 rounded text-xs">cd backend && python -m uvicorn app.main:app --reload</code>
                <p>2. Backend should be available at: <code className="bg-iridium-800 px-2 py-1 rounded">http://localhost:8000</code></p>
                <p>3. Check the API docs at: <code className="bg-iridium-800 px-2 py-1 rounded">http://localhost:8000/docs</code></p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}