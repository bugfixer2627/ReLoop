import DashboardClient from './dashboard-client';

export default async function DashboardPage({ searchParams }: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawQuery = Array.isArray(params.q) ? params.q[0] : params.q;
  return <DashboardClient initialQuery={rawQuery ?? ''}/>;
}
