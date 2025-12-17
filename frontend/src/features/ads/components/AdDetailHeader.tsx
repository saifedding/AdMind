'use client';

import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Calendar, Info, Globe2, Zap, Award, BarChart3, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AdWithAnalysis } from '@/types/ad';
import { AdDuration } from '../types';

interface AdDetailHeaderProps {
  ad: AdWithAnalysis;
  adDuration: AdDuration;
  hasHighScore: boolean;
  hookScore: number;
  countries: string[];
}

export function AdDetailHeader({ ad, adDuration, hasHighScore, hookScore, countries }: AdDetailHeaderProps) {
  return (
    <div className="flex items-start gap-4">
      <Avatar className="size-16 ring-2 ring-border/20">
        <AvatarImage 
          src={ad.page_profile_picture_url || ad.competitor?.page_id ? `https://graph.facebook.com/${ad.competitor?.page_id}/picture?width=64&height=64` : undefined} 
          alt={ad.competitor?.name || ad.page_name || 'Competitor'} 
          className="object-cover" 
        />
        <AvatarFallback className="bg-gradient-to-br from-photon-900 to-photon-800 text-photon-200 font-mono text-sm font-semibold">
          {(ad.competitor?.name || ad.page_name || 'AD').substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 space-y-1">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          {ad.competitor?.name || ad.page_name || 'Unknown Competitor'}
          {hasHighScore && <Zap className="h-5 w-5 text-photon-400 fill-photon-400" />}
        </h1>
        <p className="text-sm text-muted-foreground">Ad ID: {ad.id} • Archive ID: {ad.ad_archive_id}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-1">
          {adDuration.formattedDate && (
            <div className="flex items-center gap-1.5" title={`${adDuration.formattedDate} (${adDuration.duration} days)`}>
              <Calendar className="h-4 w-4" />
              <span>{adDuration.formattedDate}</span>
              {adDuration.duration && (
                <span className={cn("font-medium", adDuration.isActive ? "text-photon-400" : "")}>
                  • {adDuration.duration} {adDuration.duration === 1 ? 'day' : 'days'}
                </span>
              )}
            </div>
          )}
          {ad.display_format && (
            <div className="flex items-center gap-1.5" title={`Display Format: ${ad.display_format}`}>
              <Info className="h-4 w-4" />
              <span>{ad.display_format}</span>
            </div>
          )}
          {countries.length > 0 && (
            <div className="flex items-center gap-1.5" title={countries.join(', ')}>
              <Globe2 className="h-4 w-4" />
              <span>{countries.join(', ')}</span>
            </div>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end text-right space-y-3">
        {/* Performance Badge */}
        {hasHighScore && (
          <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-yellow-500/50 text-yellow-400">
            <Award className="h-3 w-3 mr-1" />
            High Performer
          </Badge>
        )}
        
        {/* Scores Grid */}
        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-foreground">
              <BarChart3 className="h-4 w-4 text-green-400" />
              <span className="font-mono font-bold text-xl">
                {ad.analysis?.overall_score !== undefined && ad.analysis?.overall_score !== null ? ad.analysis.overall_score.toFixed(1) : '0.0'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Overall</span>
            <div className="w-12 bg-neutral-800 h-1 rounded-full mx-auto overflow-hidden">
              <div 
                className="bg-green-400 h-full transition-all duration-500" 
                style={{ width: `${((ad.analysis?.overall_score || 0) / 10) * 100}%` }}
              />
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-1 text-foreground">
              <Zap className="h-4 w-4 text-primary" />
              <span className="font-mono font-bold text-xl">
                {hookScore !== undefined && hookScore !== null ? (hookScore.toFixed ? hookScore.toFixed(1) : hookScore) : '0.0'}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">Hook</span>
            <div className="w-12 bg-neutral-800 h-1 rounded-full mx-auto overflow-hidden">
              <div 
                className="bg-primary h-full transition-all duration-500" 
                style={{ width: `${((hookScore || 0) / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
        
        {/* Duration Badge */}
        {adDuration.duration && (
          <Badge variant="outline" className="border-neutral-700 text-neutral-400">
            <Clock className="h-3 w-3 mr-1" />
            {adDuration.duration}d {adDuration.isActive ? 'running' : 'ran'}
          </Badge>
        )}
      </div>
    </div>
  );
}