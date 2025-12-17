'use client';

import { Suspense } from 'react';
import { DashboardLayout } from '@/components/dashboard';
import SearchPageContent from './SearchPageContent';

export default function SearchPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex items-center justify-center min-h-[400px]">Loading search...</div>}>
        <SearchPageContent />
      </Suspense>
    </DashboardLayout>
  );
}
