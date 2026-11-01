import RulesClient from './rules-client';

export default async function RulesPage({ searchParams }: { searchParams: Promise<{ caseId?: string }> }) {
  const params = await searchParams;
  return <RulesClient caseId={typeof params.caseId === 'string' ? params.caseId : null}/>;
}
