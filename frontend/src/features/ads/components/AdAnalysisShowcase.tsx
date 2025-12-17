'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingUp, BarChart3, CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { AdWithAnalysis } from '@/types/ad';

interface AdAnalysisShowcaseProps {
  analysis: AdWithAnalysis['analysis'];
}

export function AdAnalysisShowcase({ analysis }: AdAnalysisShowcaseProps) {
  if (!analysis) return null;

  return (
    <div className="grid lg:grid-cols-2 gap-6 mt-6">
      {/* Creative Analysis */}
      <Card className="border-neutral-800 bg-gradient-to-br from-blue-900/10 to-blue-900/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-blue-400" />
            Creative Analysis
          </CardTitle>
          <CardDescription>
            AI-powered insights into creative effectiveness
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Strengths */}
          {analysis.strengths && analysis.strengths.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-green-400 mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                What Works Well
              </h4>
              <ul className="space-y-1">
                {analysis.strengths.slice(0, 3).map((strength, index) => (
                  <li key={index} className="text-sm text-neutral-300 flex items-start gap-2">
                    <div className="w-1 h-1 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {analysis.recommendations && analysis.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-yellow-400 mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Improvement Opportunities
              </h4>
              <ul className="space-y-1">
                {analysis.recommendations.slice(0, 3).map((rec, index) => (
                  <li key={index} className="text-sm text-neutral-300 flex items-start gap-2">
                    <div className="w-1 h-1 bg-yellow-400 rounded-full mt-2 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card className="border-neutral-800 bg-gradient-to-br from-green-900/10 to-green-900/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-green-400" />
            Performance Metrics
          </CardTitle>
          <CardDescription>
            Quantitative analysis and scoring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Scores Grid */}
          <div className="grid grid-cols-2 gap-4">
            {analysis.overall_score && (
              <div className="text-center p-3 rounded-lg bg-neutral-900/50">
                <div className="text-2xl font-bold text-green-400">
                  {analysis.overall_score?.toFixed(1) || '0.0'}
                </div>
                <div className="text-xs text-neutral-400">Overall Score</div>
                <div className="w-full bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-green-400 h-full transition-all duration-500" 
                    style={{ width: `${(analysis.overall_score / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}
            
            {analysis.hook_score && (
              <div className="text-center p-3 rounded-lg bg-neutral-900/50">
                <div className="text-2xl font-bold text-primary">
                  {analysis.hook_score?.toFixed(1) || '0.0'}
                </div>
                <div className="text-xs text-neutral-400">Hook Score</div>
                <div className="w-full bg-neutral-800 h-1 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-500" 
                    style={{ width: `${(analysis.hook_score / 10) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Performance Category */}
          <div className="text-center">
            <Badge 
              className={cn(
                "text-sm px-3 py-1",
                (analysis.overall_score || 0) >= 8 ? "bg-green-500/20 text-green-400 border-green-500/50" :
                (analysis.overall_score || 0) >= 6 ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/50" :
                "bg-red-500/20 text-red-400 border-red-500/50"
              )}
            >
              {(analysis.overall_score || 0) >= 8 ? "High Performer" :
               (analysis.overall_score || 0) >= 6 ? "Good Performance" :
               "Needs Improvement"}
            </Badge>
          </div>

          {/* Analysis Metadata */}
          <div className="text-xs text-neutral-500 space-y-1">
            <div>Analysis Version: {analysis.analysis_version || 'N/A'}</div>
            <div>Last Updated: {analysis.updated_at ? format(parseISO(analysis.updated_at), 'MMM d, yyyy') : 'N/A'}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}