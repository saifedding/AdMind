'use client';

import { useParams, useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard';
import { UnifiedAnalysisPanel } from '@/components/unified-analysis';
import { useAdDetail } from '../hooks/useAdDetail';
import { 
  AdDetailActions,
  AdDetailHeader,
  AdMediaViewer,
  AdPerformanceInsights,
  AdAnalysisShowcase,
  AdContentCards,
  AdCreativesSection,
  AdRawDataSection
} from '../components';

export default function AdDetailPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  
  const {
    ad,
    loading,
    error,
    currentCreativeIndex,
    isRefreshing,
    hookScore,
    isFavorite,
    showShareMenu,
    setCurrentCreativeIndex,
    setShowShareMenu,
    handleRefresh,
    handleToggleFavorite,
    handleShare,
    formatAdDuration,
  } = useAdDetail(id);

  const handleBackClick = () => {
    router.back();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-sm text-muted-foreground">Loading ad details...</div>
      </DashboardLayout>
    );
  }

  if (error || !ad) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-red-400">{error || 'Ad not found'}</div>
      </DashboardLayout>
    );
  }

  const countries = ad.targeting?.locations?.map(l => l.name) || [];
  const hasHighScore = ad.analysis?.overall_score && ad.analysis.overall_score > 8;
  const adDuration = formatAdDuration(ad.start_date, ad.end_date, ad.is_active);
  const currentCreative = ad?.creatives?.[currentCreativeIndex];

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-8">
        {/* Actions Bar */}
        <AdDetailActions
          isFavorite={isFavorite}
          showShareMenu={showShareMenu}
          isRefreshing={isRefreshing}
          adArchiveId={ad.ad_archive_id}
          adSetId={ad.ad_set_id}
          variantCount={ad.variant_count}
          onBack={handleBackClick}
          onToggleFavorite={handleToggleFavorite}
          onToggleShareMenu={() => setShowShareMenu(!showShareMenu)}
          onShare={handleShare}
          onRefresh={handleRefresh}
        />

        {/* Header */}
        <AdDetailHeader
          ad={ad}
          adDuration={adDuration}
          hasHighScore={hasHighScore}
          hookScore={hookScore}
          countries={countries}
        />

        {/* Media Viewer */}
        <AdMediaViewer
          ad={ad}
          currentCreativeIndex={currentCreativeIndex}
          onCreativeIndexChange={setCurrentCreativeIndex}
        />

        {/* Performance Insights */}
        <AdPerformanceInsights analysis={ad.analysis} />

        {/* Enhanced Analysis Showcase */}
        <AdAnalysisShowcase analysis={ad.analysis} />

        {/* Unified Analysis Panel */}
        <div className="mt-6">
          {ad.id && (
            <UnifiedAnalysisPanel
              adId={ad.id}
              adSetId={ad.ad_set_id}
              showAdSetAnalysis={!!(ad.ad_set_id && ad.variant_count && ad.variant_count > 1)}
              onAnalysisComplete={(analysisResult) => {
                console.log('Analysis completed:', analysisResult);
              }}
            />
          )}
        </div>

        {/* Content Cards */}
        <AdContentCards ad={ad} currentCreative={currentCreative} />

        {/* Creatives Section */}
        <AdCreativesSection creatives={ad.creatives} />

        {/* Raw Data Section */}
        <AdRawDataSection ad={ad} />
      </div>
    </DashboardLayout>
  );
}