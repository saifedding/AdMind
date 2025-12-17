'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, Brain, TrendingUp, Zap, Eye } from 'lucide-react';
import { AdStatsData } from '../types';

interface AdStatsProps {
  stats: AdStatsData;
}

export function AdStats({ stats }: AdStatsProps) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 mb-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Ads</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalAds}</div>
          <p className="text-xs text-photon-400">Total in Database</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">AI Analyzed</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-400">{stats.analyzedAds}</div>
          <p className="text-xs text-muted-foreground">With AI Analysis</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Average Score</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.avgScore?.toFixed(1) || '0.0'}</div>
          <p className="text-xs text-muted-foreground">Performance Rating</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">High Performers</CardTitle>
          <Zap className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-photon-400">{stats.highScoreAds}</div>
          <p className="text-xs text-muted-foreground">Score &gt; 8.0</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">Active Ads</CardTitle>
          <Eye className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-400">{stats.activeAds}</div>
          <p className="text-xs text-muted-foreground">Currently Running</p>
        </CardContent>
      </Card>
    </div>
  );
}