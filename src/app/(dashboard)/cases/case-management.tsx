'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeading, WorkspaceShell } from '@/components/reloop-ui/WorkspaceShell';
import { CaseTable } from '@/components/reloop-ui/CaseTable';
import { useCases } from '@/components/reloop-ui/useCases';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { filterCases, casesCsv } from '@/lib/frontend/case-list';
import { platformSchema } from '@/lib/contracts';
import { platformLabel } from '@/lib/config/platforms';

export default function CaseManagement({ query, status, channel, sort }: { query: string; status: string; channel: string; sort: string }) {
  const { cases, loading, error, retry } = useCases();
  const { locale } = useWorkspace();
  const router = useRouter();
  const zh = locale === 'zh-CN';
  const rows = filterCases(cases, { query, status, channel, sort });
  function exportRows() {
    const url = URL.createObjectURL(new Blob([casesCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a'); a.href = url; a.download = 'reloop-visible-cases.csv'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <WorkspaceShell title={zh ? '案例管理' : 'Case management'}><div className="page">
    <PageHeading title={zh ? '全部案例' : 'All cases'} description={zh ? '客户反馈、来源平台与审核状态，集中管理。' : 'Every customer complaint, its storefront and where it is in review.'} actions={<><button className="btn btn-soft btn-sm" onClick={exportRows} disabled={loading || !!error || !rows.length}>{zh ? '导出可见行 CSV' : 'Export visible rows CSV'}</button><Link className="btn btn-primary btn-sm" href="/feedback">{zh ? '新建案例' : 'Add case'}</Link></>}/>
    <section className="card card-pad">
      <form className="case-filters" key={[query, status, channel, sort].join('|')} onSubmit={(e) => { e.preventDefault(); const p = new URLSearchParams(); new FormData(e.currentTarget).forEach((v, k) => { if (v && v !== 'all') p.set(k, v.toString()); }); router.push(`/cases?${p}`); }}>
        <label>{zh ? '搜索' : 'Search'}<input className="input" type="search" name="q" defaultValue={query} placeholder={zh ? '案例、SKU 或反馈…' : 'Case, SKU or feedback…'}/></label>
        <label>{zh ? '状态' : 'Status'}<select name="status" defaultValue={status || 'all'}><option value="all">{zh ? '全部状态' : 'All statuses'}</option>{['open', 'pending_review', 'clear'].map((s, i) => <option key={s} value={s}>{(zh ? ['待处理', '等待审核', '已解决'] : ['Open', 'Pending review', 'Clear'])[i]}</option>)}</select></label>
        <label>{zh ? '平台' : 'Channel'}<select name="channel" defaultValue={channel || 'all'}><option value="all">{zh ? '全部平台' : 'All storefronts'}</option>{platformSchema.options.map((id) => <option key={id} value={id}>{platformLabel(id, locale)}</option>)}</select></label>
        <label>{zh ? '排序' : 'Sort'}<select name="sort" defaultValue={sort || 'newest'}><option value="newest">{zh ? '最新优先' : 'Newest first'}</option><option value="oldest">{zh ? '最早优先' : 'Oldest first'}</option></select></label><button className="btn btn-primary btn-sm">{zh ? '应用筛选' : 'Apply filters'}</button>
      </form>
      <p className="muted">{zh ? '筛选和导出仅针对本次接口返回的案例。' : 'Filters and export cover only records returned by the current request.'}</p>
      {loading && <p role="status">{zh ? '正在读取案例…' : 'Loading cases…'}</p>}{error && <div className="api-error" role="alert">{error}<button className="btn btn-soft btn-sm" onClick={retry}>{zh ? '重试' : 'Retry'}</button></div>}
      {!loading && !error && (rows.length ? <><p aria-live="polite">{new Intl.NumberFormat(locale).format(rows.length)} {zh ? '个案例' : 'cases'}</p><CaseTable cases={rows} locale={locale}/></> : <div className="empty-state"><strong>{zh ? '没有符合条件的案例' : 'No matching cases'}</strong><Link href="/feedback">{zh ? '新建案例' : 'Create a case'}</Link></div>)}
    </section>
  </div></WorkspaceShell>;
}
