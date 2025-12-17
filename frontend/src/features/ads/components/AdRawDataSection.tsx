'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AdWithAnalysis } from '@/types/ad';

interface AdRawDataSectionProps {
  ad: AdWithAnalysis;
}

export function AdRawDataSection({ ad }: AdRawDataSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Raw Data</CardTitle>
        <CardDescription>Technical details for debugging</CardDescription>
      </CardHeader>
      <CardContent>
        <pre className="text-xs whitespace-pre-wrap break-all max-h-[400px] overflow-auto bg-black/40 p-4 rounded-lg border border-border/30">
          {JSON.stringify(ad, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}