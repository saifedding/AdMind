'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreativeCard } from './CreativeCard';
import { AdWithAnalysis } from '@/types/ad';

interface AdCreativesSectionProps {
  creatives: AdWithAnalysis['creatives'];
}

export function AdCreativesSection({ creatives }: AdCreativesSectionProps) {
  if (!creatives || creatives.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creatives ({creatives.length})</CardTitle>
        <CardDescription>Carousel or multi-card content</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {creatives.map((creative, i) => (
            <CreativeCard key={creative.id || i} creative={creative} index={i} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}