'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArtifactWorkspace } from '@/components/reloop-ui/ArtifactWorkspace';
import { CaseStatusBadge, PageHeading, WorkspaceShell } from '@/components/reloop-ui/WorkspaceShell';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { useCaseBundle } from '@/components/reloop-ui/useCaseBundle';
import { ApiRequestError, casePlatformLabel, generateSupport, isUnavailable, repairListings, saveTask } from '@/lib/frontend/api-client';
import { platformDefinitions } from '@/lib/config/platforms';
import type { Platform } from '@/lib/contracts';
import { platformSchema } from '@/lib/contracts';
import { Icon } from '@/components/reloop-ui/icons';

export default function FixApproveClient({ caseId }: { caseId: string }) {
  const { bundle, loading, error, retry } = useCaseBundle(caseId);
  const { accessToken, locale } = useWorkspace();
  const [platform, setPlatform] = useState<Platform>('shopify_us');
  const [busy, setBusy] = useState<'support' | 'repair' | null>(null);
  const [taskBusy, setTaskBusy] = useState<'qa' | 'compliance' | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const text = locale === 'zh-CN' ? {
    title: '修订与审核', description: '客服回复与平台 Listing 使用同一案例上下文。', loading: '正在读取已保存版本…', retry: '重试',
    missing: '未找到案例，或当前访问令牌无权读取该案例。', support: '客服回复', listings: '平台商品修订',
    generateSupport: '生成客服回复', generateListings: '生成三平台修订', unavailable: '接口尚未实现。没有模拟草稿或审核结果。',
    noSupport: '尚无已保存的客服回复草稿。', noListing: '当前平台尚无已保存修订。',
    tasks: '质量与合规任务', audit: '审核与审计记录', noTasks: '尚无已保存任务。', noAudit: '尚无已保存的审核或审计记录。',
    prompt: '本页只显示持久化版本。', channel: '平台', notPublished: '审核草稿不会自动发布到外部平台。', qaTask: '创建 QA 跟进', complianceTask: '创建合规审核',
  } : {
    title: 'Fix & approve', description: 'Support and marketplace drafts share the same case context.', loading: 'Loading saved versions…', retry: 'Retry',
    missing: 'Case not found, or this access token cannot read the case.', support: 'Customer support reply', listings: 'Platform listing corrections',
    generateSupport: 'Generate support reply', generateListings: 'Generate three listing corrections', unavailable: 'Endpoint is not implemented. No simulated draft or review state is shown.',
    noSupport: 'No saved support reply draft yet.', noListing: 'No saved correction for this platform yet.',
    tasks: 'QA and compliance tasks', audit: 'Review and audit history', noTasks: 'No persisted tasks yet.', noAudit: 'No persisted review or audit events yet.',
    prompt: 'Only persisted versions appear in this workspace.', channel: 'Platform', notPublished: 'Draft approval does not publish to an external platform.', qaTask: 'Create QA follow-up', complianceTask: 'Create compliance review',
  };

  const supportArtifact = bundle?.artifacts.find((artifact) => artifact.kind === 'support_reply');
  const listing = bundle?.listings.find((item) => item.platform === platform);
  const listingArtifact = bundle?.artifacts.find((artifact) => artifact.kind === 'listing_correction' && artifact.platform === platform);
  const versions = bundle?.versions ?? [];
  const findings = bundle?.findings ?? [];

  async function createDraft(kind: 'support' | 'repair') {
    if (!accessToken || busy) return;
    setBusy(kind); setActionError(null);
    try {
      if (kind === 'support') await generateSupport(accessToken, caseId);
      else await repairListings(accessToken, caseId);
      retry();
    } catch (reason) {
      setActionError(isUnavailable(reason)
        ? text.unavailable
        : reason instanceof ApiRequestError ? reason.message : 'The request failed. No draft was saved.');
    } finally { setBusy(null); }
  }

  async function createFollowUp(kind: 'qa' | 'compliance') {
    if (!accessToken || !bundle || taskBusy) return;
    const sourceIds = kind === 'qa'
      ? (bundle.evidence.length ? bundle.evidence.map((source) => source.id) : bundle.listings.map((source) => source.id))
      : bundle.rules.map((rule) => rule.id);
    if (sourceIds.length === 0) {
      setActionError(locale === 'zh-CN' ? '缺少可引用的来源记录。' : 'No source records are available for this task.');
      return;
    }
    setTaskBusy(kind); setActionError(null);
    try {
      await saveTask(accessToken, caseId, {
        assignedRole: kind, kind: kind === 'qa' ? 'qa_investigation' : 'compliance_review',
        title: kind === 'qa' ? 'Investigate the customer-reported product experience' : 'Verify applicable rule sources and applicability',
        description: kind === 'qa' ? 'Confirm the customer operating conditions. Customer testimony is unverified and is not a defect finding.' : 'Capture current official rule text, checked date and platform/market applicability before recording a compliance decision.',
        state: 'open', sourceIds,
      });
      retry();
    } catch (reason) {
      setActionError(isUnavailable(reason)
        ? (locale === 'zh-CN' ? '任务接口尚未实现。没有创建任务。' : 'Task endpoint is not implemented. No task was created.')
        : reason instanceof ApiRequestError ? reason.message : 'Could not save the task.');
    } finally { setTaskBusy(null); }
  }

  return (
    <WorkspaceShell title={text.title}>
      <div className="page">
        {loading && <div className="card card-pad api-state" role="status">{text.loading}</div>}
        {!loading && error && <div className="card card-pad api-error" role="alert"><p>{error}</p><button className="btn btn-soft btn-sm" type="button" onClick={retry}>{text.retry}</button></div>}
        {!loading && !error && !bundle && <div className="card card-pad api-error" role="alert">{text.missing}</div>}
        {!loading && !error && bundle && <>
          <PageHeading eyebrow={`${bundle.case.id.slice(0, 8).toUpperCase()} · ${bundle.case.sku}`} title={text.title} description={`${text.channel}: ${casePlatformLabel(bundle.case.channel)} · ${bundle.product.name}`} actions={<CaseStatusBadge status={bundle.case.status} locale={locale}/>}/>
          <p className="muted fix-intro">{text.prompt} {text.notPublished}</p>
          {actionError && <div className="api-error" role="alert">{actionError}</div>}
          <section className="card card-pad artifact-section">
            <div className="card-title-row"><span className="card-title">{text.support}</span><span className="badge badge-neutral">Shopify US · English</span></div>
            {supportArtifact ? <ArtifactWorkspace artifact={supportArtifact} versions={versions.filter((version) => version.artifactId === supportArtifact.id)} findings={findings} revisions={bundle.revisions} accessToken={accessToken!} onRefresh={retry}/> : <div className="empty-state"><strong>{text.noSupport}</strong><button className="btn btn-primary btn-sm" type="button" disabled={busy !== null} onClick={() => createDraft('support')}>{busy === 'support' ? '…' : text.generateSupport}<Icon name="sparkle" size={13}/></button></div>}
          </section>
          <section className="card card-pad artifact-section">
            <div className="card-title-row"><span className="card-title">{text.listings}</span><span className="badge badge-neutral">3 platform snapshots</span></div>
            <div className="toolbar platform-toolbar" role="tablist" aria-label={text.listings}>
              {Object.entries(platformDefinitions).map(([id, definition]) => <button key={id} className={`tab ${platform === id ? 'active' : ''}`} type="button" role="tab" aria-selected={platform === id} onClick={() => { setPlatform(platformSchema.parse(id)); setActionError(null); }}>{definition.label}</button>)}
            </div>
            {listingArtifact && <ArtifactWorkspace artifact={listingArtifact} versions={versions.filter((version) => version.artifactId === listingArtifact.id)} listing={listing} findings={findings} revisions={bundle.revisions} accessToken={accessToken!} onRefresh={retry}/>}
            {!listingArtifact && <div className="empty-state"><strong>{text.noListing}</strong><button className="btn btn-primary btn-sm" type="button" disabled={busy !== null} onClick={() => createDraft('repair')}>{busy === 'repair' ? '…' : text.generateListings}<Icon name="sparkle" size={13}/></button>{listing && <small>{listing.id} · {listing.snapshotVersion} · {platformDefinitions[platform].segment.toUpperCase()}</small>}</div>}
          </section>
          <div className="dashboard-grid fix-history-grid">
            <section className="card card-pad"><div className="card-title-row"><span className="card-title">{text.tasks}</span><span className="case-count">{bundle.tasks.length}</span></div><div className="task-actions"><button className="btn btn-soft btn-sm" type="button" disabled={taskBusy !== null} onClick={() => createFollowUp('qa')}>{taskBusy === 'qa' ? '…' : text.qaTask}</button><button className="btn btn-soft btn-sm" type="button" disabled={taskBusy !== null} onClick={() => createFollowUp('compliance')}>{taskBusy === 'compliance' ? '…' : text.complianceTask}</button></div>{bundle.tasks.length === 0 ? <p className="muted">{text.noTasks}</p> : <div className="timeline">{bundle.tasks.map((task) => <article className="timeline-item" key={task.id}><span className={`timeline-dot ${task.state === 'done' ? 'done' : ''}`}/><div><h4>{task.title}</h4><p>{task.assignedRole} · {task.state}</p><small>{task.description}</small></div></article>)}</div>}</section>
            <section className="card card-pad"><div className="card-title-row"><span className="card-title">{text.audit}</span><span className="case-count">{bundle.audit.length}</span></div>{bundle.audit.length === 0 ? <p className="muted">{text.noAudit}</p> : <div className="timeline">{bundle.audit.map((event) => <article className="timeline-item" key={event.id}><span className="timeline-dot done"/><div><h4>{event.action}</h4><p>{event.actorRole} · {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.createdAt))}</p></div></article>)}</div>}</section>
          </div>
          <Link className="card-link" href={`/cases/${caseId}`}>← {locale === 'zh-CN' ? '返回案例核验' : 'Back to claim investigation'} <Icon name="arrow" size={13}/></Link>
        </>}
      </div>
    </WorkspaceShell>
  );
}
