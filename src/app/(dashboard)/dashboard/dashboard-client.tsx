'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { CaseStatusBadge, PageHeading, WorkspaceShell } from '@/components/reloop-ui/WorkspaceShell';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { ApiRequestError, casePlatformLabel, listCases } from '@/lib/frontend/api-client';
import type { Case } from '@/lib/contracts';
import { Icon } from '@/components/reloop-ui/icons';

function dateLabel(value: string, locale: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

export default function DashboardClient({ initialQuery }: { initialQuery: string }) {
  const { accessToken, locale } = useWorkspace();
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const query = initialQuery.trim();
  const [reload, setReload] = useState(0);

  useEffect(() => {
    if (!accessToken) return;
    let active = true;
    listCases(accessToken).then((items) => {
      if (active) setCases(items);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof ApiRequestError ? reason.message : 'Could not load saved cases.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, reload]);

  const filtered = useMemo(() => {
    const needle = query.toLocaleLowerCase();
    return cases.filter((item) => `${item.id} ${item.sku} ${item.feedbackText} ${item.merchantInstruction}`.toLocaleLowerCase().includes(needle));
  }, [cases, query]);
  const openCount = cases.filter((item) => item.status === 'open' || item.status === 'investigating').length;
  const reviewCount = cases.filter((item) => item.status === 'pending_review').length;
  const closedCount = cases.filter((item) => item.status === 'closed').length;
  const text = locale === 'zh-CN' ? {
    eyebrow: '真实案例 · SAVED CASES', title: '案例工作台', description: '从已保存的客户反馈继续处理。', total: '全部案例', open: '处理中', review: '等待审核', closed: '已关闭',
    list: '最近案例', empty: '暂无已保存案例。', emptySearch: '没有符合搜索条件的案例。', retry: '重试', newCase: '新建案例', caseSku: '案例 / SKU', channel: '平台', status: '状态', created: '创建时间',
  } : {
    eyebrow: 'SAVED CASES', title: 'Case overview', description: 'Continue from saved customer feedback.', total: 'All cases', open: 'In progress', review: 'Pending review', closed: 'Closed',
    list: 'Recent cases', empty: 'No saved cases yet.', emptySearch: 'No cases match this search.', retry: 'Retry', newCase: 'New case', caseSku: 'Case / SKU', channel: 'Channel', status: 'Status', created: 'Created',
  };

  return (
    <WorkspaceShell title={text.title}>
      <div className="page">
        <PageHeading eyebrow={text.eyebrow} title={text.title} description={text.description} actions={<Link href="/feedback" className="btn btn-primary btn-sm"><Icon name="plus" size={14}/>{text.newCase}</Link>}/>
        <div className="metrics-grid">
          <div className="card metric-card"><div className="metric-label">{text.total}</div><div className="metric-value">{loading ? '—' : cases.length}</div></div>
          <div className="card metric-card"><div className="metric-label">{text.open}</div><div className="metric-value">{loading ? '—' : openCount}</div></div>
          <div className="card metric-card metric-accent"><div className="metric-label">{text.review}</div><div className="metric-value">{loading ? '—' : reviewCount}</div></div>
          <div className="card metric-card"><div className="metric-label">{text.closed}</div><div className="metric-value">{loading ? '—' : closedCount}</div></div>
        </div>
        <section className="card card-pad case-list-panel">
          <div className="card-title-row"><span className="card-title">{text.list}</span><span className="case-count">{loading ? '…' : filtered.length}</span></div>
          {loading && <p className="api-state" role="status">{locale === 'zh-CN' ? '正在读取已保存案例…' : 'Loading saved cases…'}</p>}
          {!loading && error && <div className="api-error" role="alert"><p>{error}</p><button className="btn btn-soft btn-sm" type="button" onClick={() => { setLoading(true); setError(null); setReload((value) => value + 1); }}>{text.retry}</button></div>}
          {!loading && !error && filtered.length === 0 && <div className="empty-state"><Icon name="inbox" size={22}/><strong>{query ? text.emptySearch : text.empty}</strong><Link href="/feedback" className="card-link">{text.newCase} <Icon name="arrow" size={13}/></Link></div>}
          {!loading && !error && filtered.length > 0 && <div className="table-wrap"><table className="data-table"><thead><tr><th>{text.caseSku}</th><th>{text.channel}</th><th>{text.status}</th><th>{text.created}</th><th/></tr></thead><tbody>
            {filtered.map((item) => <tr key={item.id}>
              <td><div className="case-id">{item.id.slice(0, 8).toUpperCase()}</div><div className="case-title">{item.feedbackText.slice(0, 84)}{item.feedbackText.length > 84 ? '…' : ''}</div><div className="case-sub">SKU {item.sku} {item.synthetic && <span className="badge badge-neutral">{locale === 'zh-CN' ? '合成' : 'Synthetic'}</span>}</div></td>
              <td>{casePlatformLabel(item.channel)}</td><td><CaseStatusBadge status={item.status} locale={locale}/></td><td>{dateLabel(item.createdAt, locale)}</td>
              <td><Link className="icon-btn case-open" href={`/cases/${item.id}`} aria-label={`Open case ${item.id}`}><Icon name="arrow" size={15}/></Link></td>
            </tr>)}
          </tbody></table></div>}
        </section>
      </div>
    </WorkspaceShell>
  );
}
