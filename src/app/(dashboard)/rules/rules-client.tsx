'use client';

import Link from 'next/link';
import { useSelectedCase } from '@/components/reloop-ui/useSelectedCase';
import { useCaseBundle } from '@/components/reloop-ui/useCaseBundle';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { PageHeading, WorkspaceShell } from '@/components/reloop-ui/WorkspaceShell';
import { CaseLoadProblem } from '@/components/reloop-ui/CaseLoadProblem';
import { SourceBrowser } from '@/components/reloop-ui/SourceBrowser';
import { CaseSourceForm } from '@/components/reloop-ui/CaseSourceForm';

function CaseSources({ caseId }: { caseId: string }) {
  const { bundle, loading, error, retry } = useCaseBundle(caseId);
  const { locale } = useWorkspace();
  if (loading) return <p role="status">{locale === 'zh-CN' ? '正在读取来源…' : 'Loading sources…'}</p>;
  if (error || !bundle) return <CaseLoadProblem message={error ?? 'Case not found'} locale={locale} retry={retry} destination="investigation"/>;
  return <><p className="muted">{locale === 'zh-CN' ? '案例' : 'Case'} {bundle.case.id} · {bundle.case.sku}</p>
    {bundle.access?.role === 'owner' && <CaseSourceForm bundle={bundle} onSaved={() => retry(true)}/>}
    <SourceBrowser bundle={bundle} locale={locale}/><Link className="case-back-link" href={`/cases/${bundle.case.id}`}>{locale === 'zh-CN' ? '返回案例核验' : 'Back to investigation'}</Link></>;
}

export default function RulesClient({ caseId }: { caseId: string | null }) {
  const selected = useSelectedCase();
  const id = caseId ?? selected;
  const { locale } = useWorkspace();
  const zh = locale === 'zh-CN';
  return <WorkspaceShell title={zh ? '规则与来源' : 'Rules & sources'}><div className="page"><PageHeading title={zh ? '规则与来源' : 'Rules & sources'} description={zh ? '管理商品证据、快照及适用规则。核对官方原文后再添加规则。' : 'Manage evidence, listing snapshots, and applicable rules. Check the official text before adding a rule.'}/>{id ? <CaseSources key={id} caseId={id}/> : <div className="card card-pad empty-state"><h2>{zh ? '先选择一个案例' : 'Choose a case first'}</h2><p>{zh ? '打开已保存案例后查看相关来源。' : 'Open a saved case to browse its source records.'}</p><Link className="btn btn-primary" href="/cases">{zh ? '浏览案例' : 'Browse cases'}</Link></div>}</div></WorkspaceShell>;
}
