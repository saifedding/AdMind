import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FolderOpen, Edit2, Trash2, Building2, BarChart3, Activity } from 'lucide-react';
import type { CategoryWithStats } from '@/lib/api';

interface CategoryCardProps {
  category: CategoryWithStats;
  onEdit: (category: CategoryWithStats) => void;
  onDelete: (category: CategoryWithStats) => void;
}

export function CategoryCard({ category, onEdit, onDelete }: CategoryCardProps) {
  return (
    <Card className="hover:border-photon-400/50 transition-colors">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FolderOpen className="h-5 w-5 text-photon-400 flex-shrink-0" />
            <CardTitle className="text-lg truncate">{category.name}</CardTitle>
          </div>
          <div className="flex gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(category)}
              title="Edit category"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(category)}
              title="Delete category"
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Building2 className="h-4 w-4" />
            Competitors
          </span>
          <Badge variant="secondary">{category.competitor_count}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <BarChart3 className="h-4 w-4" />
            Total Ads
          </span>
          <Badge variant="secondary">{category.total_ads}</Badge>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground flex items-center gap-1">
            <Activity className="h-4 w-4" />
            Active Ads
          </span>
          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
            {category.active_ads}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
