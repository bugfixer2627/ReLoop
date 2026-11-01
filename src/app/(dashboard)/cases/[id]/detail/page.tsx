import CaseDetail from './case-detail';

export default async function DetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseDetail caseId={id}/>;
}
