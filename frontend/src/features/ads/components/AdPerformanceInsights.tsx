'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Lightbulb } from 'lucide-react';
import { AdWithAnalysis } from '@/types/ad';

interface AdPerformanceInsightsProps {
  analysis: AdWithAnalysis['analysis'];
}

export function AdPerformanceInsights({ analysis }: AdPerformanceInsightsProps) {
  if (!analysis) return null;

  return (
    <Card className="border-neutral-800 bg-gradient-to-br from-neutral-900/50 to-neutral-900/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          Performance Insights
        </CardTitle>
        <CardDescription>
          AI-powered analysis and recommendations
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Quick Stats */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-neutral-300">Quick Stats</h4>
            <div className="space-y-3">
              {analysis.overall_score && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Overall Score</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{analysis.overall_score?.toFixed(1) || '0.0'}</span>
                    <div className="w-16 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-green-400 h-full transition-all duration-500" 
                        style={{ width: `${((analysis.overall_score || 0) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {analysis.hook_score && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Hook Score</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{analysis.hook_score?.toFixed(1) || '0.0'}</span>
                    <div className="w-16 bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-primary h-full transition-all duration-500" 
                        style={{ width: `${((analysis.hook_score || 0) / 10) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}
              {analysis.confidence_score && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-neutral-400">Confidence</span>
                  <span className="font-mono font-semibold">{analysis.confidence_score?.toFixed(1) || '0.0'}</span>
                </div>
              )}
            </div>
          </div>

          {/* Target Audience */}
          {analysis.target_audience && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-neutral-300 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Target Audience
              </h4>
              <p className="text-sm text-neutral-400 leading-relaxed">
                {analysis.target_audience}
              </p>
            </div>
          )}

          {/* Content Themes */}
          {analysis.content_themes && analysis.content_themes.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-semibold text-sm text-neutral-300">Content Themes</h4>
              <div className="flex flex-wrap gap-2">
                {analysis.content_themes.map((theme, index) => (
                  <Badge key={index} variant="secondary" className="bg-neutral-800 text-neutral-300 text-xs">
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Summary */}
        {analysis.summary && (
          <div className="mt-6 pt-6 border-t border-neutral-800">
            <h4 className="font-semibold text-sm text-neutral-300 mb-3 flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              AI Summary
            </h4>
            <p className="text-sm text-neutral-400 leading-relaxed">
              {analysis.summary}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}