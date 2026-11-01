import DashboardClient from './dashboard-client';
import { caseDestination } from '@/lib/frontend/case-navigation';

export default async function DashboardPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; view?: string | string[]; range?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  const rawRange = Array.isArray(params.range) ? params.range[0] : params.range;
  return <DashboardClient initialQuery={rawQuery ?? ''} selectionTarget={caseDestination(view)} initialPeriod={rawRange === '90' ? 90 : 30}/>;
}
