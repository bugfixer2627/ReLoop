import CaseManagement from './case-management';

export default async function CasesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const p = await searchParams;
  const single = (key: string) => typeof p[key] === 'string' ? p[key] as string : '';
  return <CaseManagement query={single('q').trim().slice(0, 200)} status={single('status')} channel={single('channel')} sort={single('sort')} page={single('page')}/>;
}
