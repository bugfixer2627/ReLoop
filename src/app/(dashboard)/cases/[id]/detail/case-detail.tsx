'use client';

import Link from 'next/link';
import { CaseStatusBadge, PageHeading, WorkspaceShell } from '@/components/reloop-ui/WorkspaceShell';
import { useCaseBundle } from '@/components/reloop-ui/useCaseBundle';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { CaseLoadProblem } from '@/components/reloop-ui/CaseLoadProblem';
import { SavedCaseIdentity } from '@/components/reloop-ui/SavedCaseIdentity';
import { Unavailable } from '@/components/reloop-ui/Unavailable';
import { platformLabel } from '@/lib/config/platforms';
import { artifactKindLabel, roleLabel, reviewStatusLabel, validationStatusLabel } from '@/lib/frontend/status-labels';

export default function CaseDetail({ caseId }: { caseId: string }) {
  const { bundle, loading, error, retry } = useCaseBundle(caseId);
  const { locale } = useWorkspace();
  const zh = locale === 'zh-CN';
  const title = zh ? '案例详情' : 'Case detail';
  return <WorkspaceShell title={title}><div className="page">
    {loading && <p role="status" className="card card-pad">{zh ? '正在读取案例…' : 'Loading case…'}</p>}
    {!loading && (error || !bundle) && <CaseLoadProblem message={error ?? (zh ? '未找到案例' : 'Case not found')} locale={locale} retry={retry} destination="investigation"/>}
    {!loading && !error && bundle && <>
      <PageHeading title={title} description={`${bundle.case.sku} · ${bundle.product.name}`} actions={<><Link href={`/cases/${caseId}`} className="btn btn-soft btn-sm">{zh ? '打开核验' : 'Open investigation'}</Link><Link href={`/cases/${caseId}/fix`} className="btn btn-primary btn-sm">{zh ? '修订与审核' : 'Fix & approve'}</Link></>}/>
      <SavedCaseIdentity caseRecord={bundle.case} product={bundle.product} locale={locale}/>
      <div className="detail-grid"><div className="investigation-column">
        <section className="card card-pad"><div className="card-title-row"><h2 className="card-title">{zh ? '客户反馈' : 'Customer complaint'}</h2><CaseStatusBadge status={bundle.case.status} locale={locale}/></div><p className="transcript">{bundle.case.feedbackText}</p><p className="muted">{bundle.case.feedbackLocale} · {zh ? '原始记录，客户报告尚未核实' : 'Original record; customer testimony is unverified'}</p><h3>{zh ? '商家指令' : 'Merchant instruction'}</h3><p className="compare-text">{bundle.case.merchantInstruction}</p><p className="muted">{bundle.case.merchantLocale}</p></section>
        <section className="card card-pad"><h2 className="card-title">{zh ? '商品信息' : 'Product overview'}</h2><h3>{bundle.product.name}</h3><dl className="product-attributes">{Object.entries(bundle.product.attributes).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd></div>)}</dl><Unavailable title={zh ? '图片和说明未提供' : 'Image and description not provided'}>{zh ? '当前商品接口没有图片或说明字段，不展示替代图片。' : 'The current product contract has no image or description fields.'}</Unavailable></section>
        <section className="card card-pad"><h2 className="card-title">{zh ? '证据与快照' : 'Evidence & snapshots'}</h2>{bundle.evidence.map((e) => <article className="listing-record" key={e.id}><strong>{e.id}</strong><p>{e.content}</p><small>{e.provenance} · {e.verificationStatus === 'documented' ? (zh ? '已记录' : 'Documented') : (zh ? '需证据' : 'Needs evidence')}</small></article>)}{bundle.listings.map((l) => <article className="listing-record" key={l.id}><strong>{platformLabel(l.platform, locale)}</strong><p>{l.id} · {l.snapshotVersion} · {l.locale}</p></article>)}{!bundle.evidence.length && !bundle.listings.length && <p className="muted">{zh ? '暂无记录。' : 'No stored records.'}</p>}<Link className="card-link" href={`/cases/${caseId}`}>{zh ? '查看核验与引用' : 'View investigation & citations'}</Link></section>
      </div><div className="investigation-column">
        <section className="card card-pad"><h2 className="card-title">{zh ? '已保存版本' : 'Saved versions'}</h2>{bundle.artifacts.map((a) => <article key={a.id} className="listing-record"><strong>{artifactKindLabel(a.kind, locale)}</strong><p>{a.platform ? platformLabel(a.platform, locale) : (zh ? '内部摘要' : 'Internal summary')} · v{a.latestVersion}</p>{bundle.versions.filter((v) => v.artifactId === a.id).sort((a, b) => b.version - a.version).map((v) => <p key={v.id}><span className="badge badge-neutral">v{v.version} · {reviewStatusLabel(v.reviewStatus, locale)}</span> {validationStatusLabel(v.validationStatus, locale)}</p>)}</article>)}{!bundle.artifacts.length && <p className="muted">{zh ? '尚无已保存草稿。' : 'No saved drafts yet.'}</p>}</section>
        <section className="card card-pad"><h2 className="card-title">{zh ? '案例时间线' : 'Case timeline'}</h2><div className="timeline"><article className="timeline-item"><span className="timeline-dot done"/><div><h3>{zh ? '案例已创建' : 'Case created'}</h3><p>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(bundle.case.createdAt))}</p></div></article>{bundle.audit.slice().sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map((a) => <article className="timeline-item" key={a.id}><span className="timeline-dot done"/><div><h3>{a.action}</h3><p>{roleLabel(a.actorRole, locale)} · {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(a.createdAt))}</p></div></article>)}</div></section>
        <section className="card card-pad"><Unavailable title={zh ? '分派、备注和状态更改暂不可用' : 'Assignment, notes and status changes unavailable'}>{zh ? '当前接口仅提供原始案例读取和创建。审核草稿请使用修订工作区。' : 'The current case API supports creation and reading. Review drafts in the fix workspace.'}</Unavailable></section>
      </div></div><Link href="/cases" className="case-back-link">{zh ? '返回案例管理' : 'Back to case management'}</Link>
    </>}
  </div></WorkspaceShell>;
}
