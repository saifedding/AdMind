'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Eye, DollarSign } from 'lucide-react';
import { AdWithAnalysis } from '@/types/ad';

interface AdContentCardsProps {
  ad: AdWithAnalysis;
  currentCreative?: AdWithAnalysis['creatives'][0];
}

export function AdContentCards({ ad, currentCreative }: AdContentCardsProps) {
  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Ad Content */}
      <Card>
        <CardHeader>
          <CardTitle>Ad Content</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {(currentCreative?.title || ad.main_title) && (
            <p><strong>Title:</strong> {currentCreative?.title || ad.main_title}</p>
          )}
          {(currentCreative?.body || ad.main_body_text) && (
            <p><strong>Body:</strong> <span className="whitespace-pre-wrap">{currentCreative?.body || ad.main_body_text}</span></p>
          )}
          {(currentCreative?.cta?.text || ad.cta_text) && (
            <p><strong>CTA:</strong> {currentCreative?.cta?.text || ad.cta_text}</p>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground flex gap-4">
          <div className="flex items-center gap-1">
            <Eye className="h-3 w-3" />
            {ad.impressions_text || 'Unknown'}
          </div>
          {ad.spend && (
            <div className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              {ad.spend}
            </div>
          )}
        </CardFooter>
      </Card>

      {/* AI Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle>AI Analysis Summary</CardTitle>
          <CardDescription>Key insights and metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {ad.analysis ? (
            <>
              {ad.analysis.summary && (
                <div>
                  <strong>Summary:</strong>
                  <p className="mt-1 text-neutral-300 leading-relaxed">{ad.analysis.summary}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                {ad.analysis.hook_score !== undefined && (
                  <div className="text-center p-2 rounded bg-neutral-900/50">
                    <div className="text-lg font-bold text-primary">{ad.analysis.hook_score?.toFixed(1) || '0.0'}</div>
                    <div className="text-xs text-neutral-400">Hook Score</div>
                  </div>
                )}
                {ad.analysis.overall_score !== undefined && (
                  <div className="text-center p-2 rounded bg-neutral-900/50">
                    <div className="text-lg font-bold text-green-400">{ad.analysis.overall_score?.toFixed(1) || '0.0'}</div>
                    <div className="text-xs text-neutral-400">Overall Score</div>
                  </div>
                )}
              </div>
              
              {ad.analysis.target_audience && (
                <div>
                  <strong>Target Audience:</strong>
                  <p className="mt-1 text-neutral-300">{ad.analysis.target_audience}</p>
                </div>
              )}
              
              {ad.analysis.content_themes && ad.analysis.content_themes.length > 0 && (
                <div>
                  <strong>Content Themes:</strong>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {ad.analysis.content_themes.map((theme, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {theme}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <p>No analysis data available.</p>
          )}
        </CardContent>
      </Card>

      {/* Lead Form */}
      {ad.lead_form && (
        <Card>
          <CardHeader>
            <CardTitle>Lead Form Preview</CardTitle>
            <CardDescription>A visual representation of the extracted form.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Standalone text fields */}
            {ad.lead_form.standalone_fields?.map((field) => (
              <div key={field} className="grid w-full items-center gap-2">
                <Label htmlFor={field} className="text-muted-foreground">{field}</Label>
                <Input type="text" id={field} readOnly className="bg-muted/50" />
              </div>
            ))}

            {/* Multi-choice questions */}
            {ad.lead_form.questions && Object.entries(ad.lead_form.questions).map(([question, options]) => (
              <div key={question} className="grid w-full items-center gap-2">
                <Label className="text-muted-foreground">{question}</Label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {Array.isArray(options) && options.map((option) => (
                    <Badge key={option} variant="outline" className="cursor-not-allowed font-normal">
                      {option}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
          <CardFooter>
            <Button disabled className="w-full">
              Submit
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
}