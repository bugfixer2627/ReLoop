'use client';

import Link from 'next/link';
import { CaseStatusBadge, PageHeading, WorkspaceShell } from '@/components/reloop-ui/WorkspaceShell';
import { useCaseBundle } from '@/components/reloop-ui/useCaseBundle';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { casePlatformLabel } from '@/lib/frontend/api-client';
import { platformDefinitions } from '@/lib/config/platforms';
import type { ArtifactContent } from '@/lib/contracts';
import { Icon } from '@/components/reloop-ui/icons';
import { CaseLoadProblem } from '@/components/reloop-ui/CaseLoadProblem';
import { SavedCaseIdentity } from '@/components/reloop-ui/SavedCaseIdentity';
import { caseReference } from '@/lib/frontend/case-reference';
import { findingCategoryLabel, severityLabel, ruleStatusLabel } from '@/lib/frontend/status-labels';

function fieldText(value: unknown) {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return '';
}

function artifactSummary(content: ArtifactContent) {
  if (content.format === 'investigation_summary') return content.summary;
  return '';
}

export default function InvestigationClient({ caseId }: { caseId: string }) {
  const { bundle, loading, error, retry } = useCaseBundle(caseId);
  const { locale } = useWorkspace();
  const text = locale === 'zh-CN' ? {
    title: '承诺核验', loading: '正在读取案例与证据…', retry: '重试',
    missing: '未找到案例，或当前访问令牌无权读取该案例。',
    data: '原始业务记录', customer: '客户原话', instruction: '商家指令', evidence: '商品证据',
    listings: '平台商品快照', findings: '已保存的校验结果', noFindings: '尚无已保存的分析或校验结果。不会展示模拟发现。',
    rules: '规则来源', noEvidence: '暂无商品证据记录。', noListings: '暂无平台商品快照。',
    noRules: '当前案例没有规则来源记录。', next: '打开修订工作区', unverified: '待核验', synthetic: '合成示例',
  } : {
    title: 'Claim investigation', loading: 'Loading saved case and evidence…', retry: 'Retry',
    missing: 'Case not found, or this access token cannot read the case.',
    data: 'Original business records', customer: 'Customer statement', instruction: 'Merchant instruction', evidence: 'Product evidence',
    listings: 'Platform listing snapshots', findings: 'Persisted checks', noFindings: 'No analysis or checks have been saved yet. Simulated findings are not shown.',
    rules: 'Rule sources', noEvidence: 'No product evidence is stored for this case.', noListings: 'No platform snapshots are stored for this product.',
    noRules: 'No rule records are available for this case.', next: 'Open fix workspace', unverified: 'Needs verification', synthetic: 'Synthetic example',
  };

  const summaryArtifact = bundle?.artifacts.find((artifact) => artifact.kind === 'investigation_summary');
  const summaryVersion = summaryArtifact && bundle?.versions
    .filter((version) => version.artifactId === summaryArtifact.id)
    .sort((left, right) => right.version - left.version)[0];

  return (
    <WorkspaceShell title={text.title}>
      <div className="page">
        {loading && <div className="card card-pad api-state" role="status">{text.loading}</div>}
        {!loading && (error || !bundle) && <CaseLoadProblem message={error ?? text.missing} locale={locale} destination="investigation" retry={retry}/>}
        {!loading && !error && bundle && <>
          <PageHeading eyebrow={`${text.data} · ${caseReference(bundle.case.id)}`} title={text.title} description={`${bundle.product.name} · ${bundle.case.sku} · ${casePlatformLabel(bundle.case.channel)}`} actions={<Link href={`/cases/${bundle.case.id}/fix`} className="btn btn-primary btn-sm">{text.next}<Icon name="arrow" size={14}/></Link>}/>
          {bundle.case.synthetic && <span className="badge badge-neutral">{text.synthetic}</span>}
          <SavedCaseIdentity caseRecord={bundle.case} product={bundle.product} locale={locale}/>
          <div className="metrics-grid investigation-metrics">
            <div className="card metric-card"><div className="metric-label">{locale === 'zh-CN' ? '案例状态' : 'Case status'}</div><CaseStatusBadge status={bundle.case.status} locale={locale}/></div>
            <div className="card metric-card"><div className="metric-label">{locale === 'zh-CN' ? '已保存发现' : 'Saved findings'}</div><div className="metric-value">{bundle.findings.length}</div></div>
            <div className="card metric-card metric-accent"><div className="metric-label">{locale === 'zh-CN' ? '有记录的来源' : 'Documented sources'}</div><div className="metric-value">{bundle.evidence.filter((s) => s.verificationStatus === 'documented').length}</div></div>
            <div className="card metric-card"><div className="metric-label">{locale === 'zh-CN' ? '平台快照' : 'Platform snapshots'}</div><div className="metric-value">{bundle.listings.length}</div></div>
          </div>
          <div className="workflow-links"><Link className="card-link" href={`/cases/${caseId}/detail`}>{locale === 'zh-CN' ? '案例详情' : 'Case detail'}</Link><Link className="card-link" href={`/rules?caseId=${caseId}`}>{locale === 'zh-CN' ? '浏览所有来源' : 'Browse sources'}</Link><span className="muted">{locale === 'zh-CN' ? '备注保存尚未接入；原始记录只读。' : 'Saving notes is unavailable; original records remain read-only.'}</span></div>
          {summaryVersion && <section className="card card-pad investigation-summary"><div className="card-title-row"><span className="card-title">{locale === 'zh-CN' ? '已保存的商家摘要' : 'Saved investigation summary'}</span><span className="badge badge-neutral">v{summaryVersion.version}</span></div><p>{artifactSummary(summaryVersion.content)}</p></section>}
          <div className="dashboard-grid investigation-grid">
            <div className="investigation-column">
              <section className="card card-pad"><div className="card-title-row"><span className="card-title">{text.customer}</span><span className="badge badge-neutral">{bundle.case.feedbackLocale}</span></div><p className="transcript">{bundle.case.feedbackText}</p><div className="investigation-instruction"><strong>{text.instruction}</strong><p>{bundle.case.merchantInstruction}</p></div></section>
              <section className="card card-pad"><div className="card-title-row"><span className="card-title">{text.evidence}</span><span className="case-count">{bundle.evidence.length}</span></div>
                {bundle.evidence.length === 0 && <p className="muted">{text.noEvidence}</p>}
                {bundle.evidence.map((source) => <article className="finding evidence-record" key={source.id}><div className="finding-mark">{source.kind === 'specification' ? 'S' : 'P'}</div><div><h4>{source.id} · {source.kind}</h4><p>{source.content}</p><small>{source.provenance} · {source.sourceVersion}</small>{source.numericClaim && <p className="claim-condition">{source.numericClaim.qualifier}: {source.numericClaim.value} {source.numericClaim.unit} · {Object.entries(source.testConditions).map(([key, value]) => `${key}: ${value}`).join(' · ')}</p>}</div></article>)}
              </section>
            </div>
            <div className="investigation-column">
              <section className="card card-pad"><div className="card-title-row"><span className="card-title">{text.findings}</span><span className="case-count">{bundle.findings.length}</span></div>
                {bundle.findings.length === 0 && <div className="empty-state"><Icon name="search" size={20}/><strong>{text.noFindings}</strong></div>}
                {bundle.findings.map((finding) => <article className="finding" key={finding.id}><div className={`finding-mark ${finding.severity === 'blocker' ? '' : 'finding-mark-soft'}`}>{finding.severity === 'blocker' ? '!' : finding.severity === 'warning' ? '·' : 'i'}</div><div><span className="badge badge-neutral">{findingCategoryLabel(finding.category, locale)} · {severityLabel(finding.severity, locale)}</span><h4>{locale === 'zh-CN' ? finding.explanationZh : finding.explanationEn}</h4>{finding.originalSpan && <p className="compare-original">{finding.originalSpan}</p>}<small>{finding.sourceIds.join(' · ')}{finding.ruleId ? ` · ${finding.ruleId}` : ''}</small>{finding.ruleStatus === 'needs_rule_verification' && <p className="muted">{ruleStatusLabel(finding.ruleStatus, locale)}</p>}</div></article>)}
              </section>
              <section className="card card-pad"><div className="card-title-row"><span className="card-title">{text.listings}</span><span className="case-count">{bundle.listings.length}</span></div>
                {bundle.listings.length === 0 && <p className="muted">{text.noListings}</p>}
                {bundle.listings.map((listing) => {
                  const fields = listing.fields;
                  const titleValue = fieldText(fields.title);
                  const description = fieldText(fields.description);
                  const specification = fields.specifications && typeof fields.specifications === 'object' ? Object.entries(fields.specifications as Record<string, unknown>).map(([key, value]) => `${key}: ${fieldText(value)}`).join(' · ') : '';
                  return <article className="listing-record" key={listing.id}><div className="card-title-row"><strong>{platformDefinitions[listing.platform].label}</strong><span className="badge badge-neutral">{listing.segment.toUpperCase()} · {listing.locale}</span></div>{titleValue && <p>{titleValue}</p>}{description && <p className="compare-text">{description}</p>}{specification && <p className="compare-text">{specification}</p>}{listing.numericClaim && <p className="claim-condition">{listing.numericClaim.value} {listing.numericClaim.unit} · {listing.numericClaim.qualifier}</p>}<small>{listing.id} · {listing.snapshotVersion}</small></article>;
                })}
              </section>
            </div>
          </div>
          <section className="card card-pad"><div className="card-title-row"><span className="card-title">{text.rules}</span><span className="case-count">{bundle.rules.length}</span></div>
            {bundle.rules.length === 0 && <p className="muted">{text.noRules}</p>}
            {bundle.rules.map((rule) => <div className="source" key={rule.id}><div><a href={rule.sourceUrl} target="_blank" rel="noreferrer" aria-label={`${rule.id} (${locale === 'zh-CN' ? '在新窗口打开' : 'opens in a new window'})`}><strong>{rule.id} ↗</strong></a><p>{rule.applicability}</p>{rule.excerpt && <blockquote>{rule.excerpt}</blockquote>}</div><span className={`badge ${rule.status === 'verified' ? 'badge-safe' : 'badge-review'}`}>{ruleStatusLabel(rule.status, locale)}</span></div>)}
          </section>
        </>}
      </div>
    </WorkspaceShell>
  );
}
