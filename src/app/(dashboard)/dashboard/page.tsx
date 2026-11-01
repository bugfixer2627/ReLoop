import DashboardClient from './dashboard-client';
import { caseDestination } from '@/lib/frontend/case-navigation';

export default async function DashboardPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[]; view?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  const view = Array.isArray(params.view) ? params.view[0] : params.view;
  return <DashboardClient initialQuery={rawQuery ?? ''} selectionTarget={caseDestination(view)}/>;
}
