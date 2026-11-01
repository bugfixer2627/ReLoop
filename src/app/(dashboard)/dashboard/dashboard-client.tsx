'use client';

import Link from 'next/link';
import { useState } from 'react';
import { PageHeading, WorkspaceShell } from '@/components/reloop-ui/WorkspaceShell';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { useCases } from '@/components/reloop-ui/useCases';
import { CaseTable } from '@/components/reloop-ui/CaseTable';
import { Unavailable } from '@/components/reloop-ui/Unavailable';
import { filterCases, creationSeries } from '@/lib/frontend/case-list';
import { caseHref, type CaseDestination } from '@/lib/frontend/case-navigation';

export default function DashboardClient({ initialQuery, selectionTarget }: { initialQuery: string; selectionTarget?: CaseDestination }) {
  const { locale } = useWorkspace();
  const { cases, loading, error, retry } = useCases();
  const [period, setPeriod] = useState(30);
  const zh = locale === 'zh-CN';
  const filtered = filterCases(cases, { query: initialQuery });
  const rows = selectionTarget || initialQuery ? filtered : filtered.slice(0, 5);
  const series = creationSeries(cases, period, new Date());
  const max = Math.max(1, ...series.map((d) => d.count));
  const title = selectionTarget ? (selectionTarget === 'fix' ? (zh ? '选择案例以修订与审核' : 'Choose a case to fix & approve') : (zh ? '选择案例以核验' : 'Choose a case to investigate')) : (zh ? '案例工作台' : 'Case overview');
  const metricValue = (value: number) => loading ? '—' : error ? (zh ? '未知' : 'Unknown') : new Intl.NumberFormat(locale).format(value);
  const metrics = [
    [zh ? '全部案例' : 'All cases', cases.length],
    [zh ? '处理中' : 'In progress', cases.filter((c) => c.status === 'open' || c.status === 'investigating').length],
    [zh ? '等待审核' : 'Pending review', cases.filter((c) => c.status === 'pending_review').length],
    [zh ? '已关闭' : 'Closed', cases.filter((c) => c.status === 'closed').length],
  ] as const;
  return <WorkspaceShell title={title} searchQuery={initialQuery} selectionTarget={selectionTarget}><div className="page">
    <PageHeading title={title} description={selectionTarget ? (zh ? '打开下方已保存案例，或新建案例。' : 'Open a saved case below, or create a new case.') : (zh ? '从客户反馈到证据核验，让每一步都有据可查。' : 'A clearer picture of the customer cases that need your attention.')} actions={<>{!selectionTarget && <button className="btn btn-soft btn-sm" disabled aria-describedby="report-unavailable">{zh ? '导出报告' : 'Export report'}</button>}<Link className="btn btn-primary btn-sm" href="/feedback">{zh ? '新建案例' : 'New case'}</Link></>}/>
    {!selectionTarget && <p id="report-unavailable" className="muted">{zh ? '报告导出尚未接入。以下统计仅基于本次返回的案例。' : 'Report export is unavailable. Statistics below cover cases returned by this request.'}</p>}
    <div className="metrics-grid">{metrics.map(([label, count], i) => <div key={label} className={`card metric-card ${i === 2 ? 'metric-accent' : ''}`}><div className="metric-label">{label}</div><div className="metric-value">{metricValue(count)}</div><span className="muted">{zh ? '已读取案例' : 'Loaded cases'}</span></div>)}</div>
    {!selectionTarget && !initialQuery && <div className="dashboard-grid overview-insights">
      <section className="card card-pad"><div className="card-title-row"><h2 className="card-title">{zh ? '案例创建趋势' : 'Case intake'}</h2><div className="toolbar-left" role="group" aria-label={zh ? '统计时间段' : 'Chart period'}>{[30, 90].map((days) => <button type="button" key={days} className={`tab ${days === period ? 'active' : ''}`} aria-pressed={days === period} onClick={() => setPeriod(days)}>{days} {zh ? '天' : 'days'}</button>)}</div></div>
        <p className="muted">{zh ? '按 UTC 日期统计已返回的案例，不代表完整历史或投诉主题分析。' : 'Returned case creations by UTC date; not complete historical totals or complaint-theme analysis.'}</p>
        {loading || error ? <p className="api-state">{loading ? (zh ? '正在读取…' : 'Loading…') : (zh ? '趋势暂不可用' : 'Chart unavailable')}</p> : <><div className="intake-chart" role="img" aria-label={zh ? '案例创建数量柱状图，详细数据见下方表格' : 'Case creation counts; exact values in the table below'}>{series.map((d) => <div className="intake-column" key={d.date} title={`${d.date}: ${d.count}`}><span style={{ height: `${d.count / max * 100}%` }}/></div>)}</div><div className="chart-axis"><span>{series[0].date}</span><span>{series.at(-1)?.date}</span></div><details><summary>{zh ? '查看每日数量' : 'View daily counts'}</summary><div className="chart-data"><table className="data-table"><thead><tr><th>{zh ? '日期 (UTC)' : 'Date (UTC)'}</th><th>{zh ? '案例数' : 'Cases'}</th></tr></thead><tbody>{series.map((d) => <tr key={d.date}><td>{d.date}</td><td>{d.count}</td></tr>)}</tbody></table></div></details></>}
      </section>
      <section className="card card-pad"><h2 className="card-title">{zh ? '最近活动' : 'Recent activity'}</h2><Unavailable title={zh ? '全局活动暂不可用' : 'Workspace activity unavailable'}>{zh ? '当前接口没有提供全局审计活动。打开具体案例查看已保存的任务和审核记录。' : 'The current API does not provide a global audit feed. Open a case to inspect its persisted tasks and review events.'}</Unavailable><Link className="card-link" href="/cases">{zh ? '浏览全部案例' : 'Browse all cases'}</Link><div className="complaint-tip"><h3>{zh ? '处理反馈的小提示' : 'Complaint tips'}</h3><p>{zh ? '保留客户原话，先核对证据，再准备回复。客户描述的体验不等同于已确认的产品缺陷。' : 'Keep the original message, check the evidence, then prepare a reply. A reported experience is not a confirmed product defect.'}</p></div></section>
    </div>}
    <section className="card card-pad case-list-panel"><div className="card-title-row"><h2 className="card-title">{selectionTarget ? (zh ? '选择已保存案例' : 'Choose a saved case') : (zh ? '最近客户案例' : 'Recent customer cases')}</h2><Link className="card-link" href="/cases">{zh ? '全部案例' : 'All cases'}</Link></div>
      {loading && <p className="api-state" role="status">{zh ? '正在读取已保存案例…' : 'Loading saved cases…'}</p>}
      {error && <div className="api-error" role="alert"><p>{error}</p><button className="btn btn-soft btn-sm" onClick={retry}>{zh ? '重试' : 'Retry'}</button></div>}
      {!loading && !error && (rows.length ? <CaseTable cases={rows} locale={locale} href={selectionTarget ? (id) => caseHref(id, selectionTarget) : undefined}/> : <div className="empty-state"><strong>{initialQuery ? (zh ? '没有符合搜索条件的案例。' : 'No cases match this search.') : (zh ? '暂无已保存案例。' : 'No saved cases yet.')}</strong><Link href="/feedback" className="card-link">{zh ? '新建案例' : 'New case'}</Link></div>)}
    </section>
  </div></WorkspaceShell>;
}
