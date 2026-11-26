'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeading, WorkspaceShell } from '@/components/reloop-ui/WorkspaceShell';
import { CaseTable } from '@/components/reloop-ui/CaseTable';
import { useCases } from '@/components/reloop-ui/useCases';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { caseListQuerySchema, caseStatusSchema, platformSchema } from '@/lib/contracts';
import { platformLabel } from '@/lib/config/platforms';

export default function CaseManagement({ query, status, channel, sort, page }: { query: string; status: string; channel: string; sort: string; page: string }) {
  const filters = new URLSearchParams({ page: String(caseListQuerySchema.shape.page.safeParse(page || '1').data ?? 1) });
  if (query) filters.set('q', query);
  if (caseStatusSchema.safeParse(status).success) filters.set('status', status);
  if (platformSchema.safeParse(channel).success) filters.set('channel', channel);
  if (sort === 'oldest') filters.set('sort', sort);
  const { cases: rows, loading, error, retry, pageInfo } = useCases(filters.toString());
  const { locale } = useWorkspace();
  const router = useRouter();
  const zh = locale === 'zh-CN';
  const currentPage = pageInfo?.page ?? Number(filters.get('page'));
  const numPages = Math.max(1, Math.ceil((pageInfo?.total ?? 0) / (pageInfo?.pageSize ?? 25)));
  function href(target: number) {
    const params = new URLSearchParams(filters);
    params.set('page', String(target));
    return `/cases?${params}`;
  }
  return <WorkspaceShell title={zh ? '案例管理' : 'Case management'}><div className="page">
    <PageHeading title={zh ? '全部案例' : 'All cases'} description={zh ? '客户反馈、来源平台与审核状态，集中管理。' : 'Every customer complaint, its storefront and where it is in review.'} actions={<>
      {!loading && !error && !!pageInfo?.total && <a className="btn btn-soft btn-sm" href={`/api/cases/export?${filters}`} download>{zh ? '导出匹配案例 CSV' : 'Export matching cases CSV'}</a>}
      <Link className="btn btn-primary btn-sm" href="/feedback">{zh ? '新建案例' : 'Add case'}</Link>
    </>}/>
    <section className="card card-pad">
      <form className="case-filters" key={[query, status, channel, sort].join('|')} onSubmit={(e) => { e.preventDefault(); const p = new URLSearchParams(); new FormData(e.currentTarget).forEach((v, k) => { if (v && v !== 'all') p.set(k, v.toString()); }); router.push(`/cases?${p}`); }}>
        <label>{zh ? '搜索' : 'Search'}<input className="input" type="search" name="q" maxLength={200} defaultValue={query} placeholder={zh ? '案例、SKU 或反馈…' : 'Case, SKU or feedback…'}/></label>
        <label>{zh ? '状态' : 'Status'}<select name="status" defaultValue={status || 'all'}><option value="all">{zh ? '全部状态' : 'All statuses'}</option>{['open', 'pending_review', 'clear'].map((s, i) => <option key={s} value={s}>{(zh ? ['待处理', '等待审核', '已解决'] : ['Open', 'Pending review', 'Clear'])[i]}</option>)}</select></label>
        <label>{zh ? '平台' : 'Channel'}<select name="channel" defaultValue={channel || 'all'}><option value="all">{zh ? '全部平台' : 'All storefronts'}</option>{platformSchema.options.map((id) => <option key={id} value={id}>{platformLabel(id, locale)}</option>)}</select></label>
        <label>{zh ? '排序' : 'Sort'}<select name="sort" defaultValue={sort || 'newest'}><option value="newest">{zh ? '最新优先' : 'Newest first'}</option><option value="oldest">{zh ? '最早优先' : 'Oldest first'}</option></select></label><button className="btn btn-primary btn-sm">{zh ? '应用筛选' : 'Apply filters'}</button>
      </form>
      {loading && <p role="status">{zh ? '正在读取案例…' : 'Loading cases…'}</p>}{error && <div className="api-error" role="alert">{error}<button className="btn btn-soft btn-sm" onClick={retry}>{zh ? '重试' : 'Retry'}</button></div>}
      {!loading && !error && (rows.length ? <><p aria-live="polite">{new Intl.NumberFormat(locale).format(pageInfo?.total ?? rows.length)} {zh ? '个符合条件的案例' : 'matching cases'}</p><CaseTable cases={rows} locale={locale}/></> : <div className="empty-state"><strong>{zh ? '本页没有符合条件的案例' : 'No matching cases on this page'}</strong><Link href="/feedback">{zh ? '新建案例' : 'Create a case'}</Link></div>)}
      {!loading && !error && (numPages > 1 || currentPage > 1) && <nav className="workflow-links" aria-label={zh ? '案例分页' : 'Case pages'}>
        {currentPage > 1 && <Link className="btn btn-soft btn-sm" href={href(Math.min(numPages, currentPage - 1))}>{zh ? '上一页' : 'Previous page'}</Link>}
        <span>{zh ? `第 ${currentPage} 页，共 ${numPages} 页` : `Page ${currentPage} of ${numPages}`}</span>
        {currentPage < numPages && <Link className="btn btn-soft btn-sm" href={href(currentPage + 1)}>{zh ? '下一页' : 'Next page'}</Link>}
      </nav>}
    </section>
  </div></WorkspaceShell>;
}
