import FixApproveClient from './fix-approve-client';

export default async function FixApprovePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <FixApproveClient caseId={id}/>;
}
