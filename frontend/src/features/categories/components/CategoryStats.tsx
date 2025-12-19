import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FolderOpen, Building2, BarChart3 } from 'lucide-react';
import type { CategoryWithStats } from '@/lib/api';

interface CategoryStatsProps {
  categories: CategoryWithStats[];
}

export function CategoryStats({ categories }: CategoryStatsProps) {
  const totalCompetitors = categories.reduce((sum, cat) => sum + cat.competitor_count, 0);
  const totalAds = categories.reduce((sum, cat) => sum + cat.total_ads, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-photon-400" />
            Total Categories
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{categories.length}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-blue-400" />
            Total Competitors
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCompetitors}</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-green-400" />
            Total Ads
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalAds}</div>
        </CardContent>
      </Card>
    </div>
  );
}
