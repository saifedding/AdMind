import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Competitors (New Architecture) | Ad Tracker',
  description: 'Manage your competitors and track their advertising performance with modern React architecture',
};

export default function CompetitorsNewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}