'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ArtifactContent, ArtifactVersion, CaseBundle } from '@/lib/contracts';
import { useWorkspace } from './WorkspaceProviders';
import { VoiceInput } from './VoiceInput';
import { ApiRequestError, isUnavailable, reviewArtifact, reviseArtifact } from '@/lib/frontend/api-client';
import { Icon } from './icons';
import { artifactText } from '@/lib/frontend/artifact-text';

type Artifact = CaseBundle['artifacts'][number];
type Finding = CaseBundle['findings'][number];
type Listing = CaseBundle['listings'][number];
type RevisionEvent = CaseBundle['revisions'][number];

function ContentView({ content }: { content: ArtifactContent }) {
  if (content.format === 'investigation_summary') return <><p>{content.summary}</p>{content.unknowns.length > 0 && <ul>{content.unknowns.map((item) => <li key={item}>{item}</li>)}</ul>}</>;
  if (content.format === 'support_reply') return <><h4>{content.subject}</h4><p className="compare-text">{content.body}</p></>;
  if (content.format === 'shopify_description') return <><h4>{content.title}</h4><p className="compare-text">{content.description}</p>{content.faq.map((item) => <p className="artifact-note" key={item}>{item}</p>)}</>;
  if (content.format === 'amazon_listing') return <><h4>{content.title}</h4>{content.internalBrief && <span className="badge badge-review">English · Internal reviewer brief</span>}<ul>{content.bullets.map((item) => <li key={item}>{item}</li>)}</ul><p className="compare-text">{content.description}</p></>;
  return <><h4>{content.title}</h4><dl>{Object.entries(content.specifications).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl><ul>{content.benefits.map((item) => <li key={item}>{item}</li>)}</ul><p>MOQ: {content.moq ?? 'Not documented'}</p><p>Lead time: {content.leadTime ?? 'Not documented'}</p>{content.claimsNotes.map((item) => <p className="artifact-note" key={item}>{item}</p>)}</>;
}

function originalText(listing: Listing | undefined) {
  if (!listing) return '';
  const values = listing.fields;
  const title = typeof values.title === 'string' ? values.title : '';
  const description = typeof values.description === 'string' ? values.description : '';
  const bulletList = Array.isArray(values.bullets) ? values.bullets.filter((value): value is string => typeof value === 'string').join('\n') : '';
  const specs = values.specifications && typeof values.specifications === 'object'
    ? Object.entries(values.specifications as Record<string, unknown>).map(([key, value]) => `${key}: ${String(value)}`).join('\n') : '';
  return [title, description, bulletList, specs].filter(Boolean).join('\n\n');
}

export function ArtifactWorkspace({
  artifact, versions, listing, findings, revisions, accessToken, onRefresh, customerContext,
}: {
  artifact: Artifact;
  versions: ArtifactVersion[];
  listing?: Listing;
  findings: Finding[];
  revisions: RevisionEvent[];
  accessToken: string;
  onRefresh: () => void;
  customerContext?: { feedbackText: string; feedbackLocale: string; policies: CaseBundle['evidence'] };
}) {
  const { locale } = useWorkspace();
  const latest = useMemo(() => versions.slice().sort((left, right) => right.version - left.version), [versions]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [prompt, setPrompt] = useState('');
  const [comment, setComment] = useState('');
  const [decision, setDecision] = useState<'approved' | 'changes_requested' | 'rejected'>('approved');
  const [busy, setBusy] = useState<'revise' | 'review' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [comparePrevious, setComparePrevious] = useState(false);
  const reviewDialog = useRef<HTMLDialogElement>(null);
  const current = latest.find((item) => item.version === (selectedVersion ?? artifact.latestVersion)) ?? latest[0];
  const isCurrent = current?.version === artifact.latestVersion;
  const currentFindings = current ? findings.filter((finding) => finding.artifactVersionId === current.id) : [];
  const history = revisions.filter((event) => event.artifactId === artifact.id).sort((left, right) => right.toVersion - left.toVersion);
  const chinese = locale === 'zh-CN';
  const role = artifact.kind === 'support_reply' ? 'support' : 'marketing';
  const previous = latest.find((v) => current && v.version < current.version);
  const unsaved = !!prompt.trim() || !!comment.trim();
  useEffect(() => {
    if (!unsaved) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [unsaved]);

  async function copySaved() {
    if (!current) return;
    try {
      await navigator.clipboard.writeText(artifactText(current.content));
      setNotice(chinese ? '已复制选中版本。复制不代表发送。' : 'Selected saved version copied. It has not been sent.');
    } catch { setError(chinese ? '无法复制，请选中文本手动复制。' : 'Clipboard unavailable. Select the text and copy it manually.'); }
  }

  async function submitRevision() {
    if (!current || !isCurrent || !prompt.trim() || busy) return;
    setBusy('revise'); setError(null); setNotice(null);
    try {
      await reviseArtifact(accessToken, artifact.id, { promptText: prompt.trim(), promptLocale: locale, expectedVersion: artifact.latestVersion });
      setPrompt('');
      setSelectedVersion(null);
      setNotice(chinese ? '已保存新版本。' : 'A new version was saved.');
      onRefresh();
    } catch (reason) {
      setError(isUnavailable(reason)
        ? (chinese ? '修订接口尚未实现。当前版本未更改。' : 'Revision endpoint is not implemented. The current version is unchanged.')
        : reason instanceof ApiRequestError ? reason.message : 'Could not revise this artifact.');
    } finally { setBusy(null); }
  }

  async function submitReview() {
    if (!current || !isCurrent || busy) return;
    setBusy('review'); setError(null); setNotice(null);
    try {
      await reviewArtifact(accessToken, artifact.id, { version: current.version, decision, reviewerRole: role, comment: comment.trim() });
      setNotice(chinese ? '审核结果已由服务器保存。' : 'The review decision was saved by the server.');
      setComment('');
      onRefresh();
    } catch (reason) {
      setError(isUnavailable(reason)
        ? (chinese ? '审核接口尚未实现。没有更改审核状态。' : 'Review endpoint is not implemented. No review state was changed.')
        : reason instanceof ApiRequestError ? reason.message : 'Could not save this review.');
    } finally { setBusy(null); }
  }

  return (
    <section className="card card-pad artifact-workspace">
      <div className="card-title-row"><span className="card-title">{artifact.kind === 'support_reply' ? (chinese ? '客服回复' : 'Support reply') : (chinese ? '商品修订' : 'Listing correction')}</span><span className="badge badge-neutral">{current ? `v${current.version} · ${current.reviewStatus} · ${current.locale} · ${current.languageStatus}` : (chinese ? '无已保存版本' : 'No saved versions')}</span></div>
      {current && <div className="artifact-saved-toolbar"><span className="muted">{chinese ? '已保存内容只读；修改指令会创建新版本。' : 'Saved content is read-only. Revision instructions create a new version.'}</span><button type="button" className="btn btn-soft btn-sm" onClick={copySaved}>{chinese ? '复制已保存文本' : 'Copy saved text'}</button></div>}
      <div className="artifact-layout"><div className="artifact-main">
      {listing && <div className="compare artifact-compare"><div className="compare-col"><div className="compare-label">{chinese ? '原始商品快照' : 'Original listing snapshot'}</div><p className="compare-text">{originalText(listing) || (chinese ? '快照没有可显示的文本字段。' : 'This snapshot has no displayable text fields.')}</p><small>{listing.id} · {listing.snapshotVersion}</small></div><div className="compare-col artifact-draft"><div className="compare-label">{chinese ? '已保存的修订草稿' : 'Saved correction draft'}</div>{current ? <ContentView content={current.content}/> : <p className="muted">{chinese ? '当前尚无已保存修订草稿。' : 'No correction draft has been saved yet.'}</p>}</div></div>}
      {!listing && current && (customerContext ? <div className="compare artifact-compare support-compare"><div className="compare-col"><div className="compare-label">{chinese ? '客户原话（未核实）' : 'Customer message (unverified)'}</div><p className="compare-text">{customerContext.feedbackText}</p><small>{customerContext.feedbackLocale}</small><div className="support-policies"><h3>{chinese ? '已保存的客服政策' : 'Stored support policy'}</h3>{customerContext.policies.length ? customerContext.policies.map((p) => <div key={p.id}><strong>{p.id}</strong><p>{p.content}</p></div>) : <p>{chinese ? '没有已保存的客服政策。' : 'No stored support policy.'}</p>}</div></div><div className="compare-col artifact-draft"><div className="compare-label">{chinese ? '已保存的回复草稿' : 'Saved reply draft'}</div><ContentView content={current.content}/></div></div> : <div className="artifact-draft"><ContentView content={current.content}/></div>)}
      {!current && !listing && <div className="empty-state">{chinese ? '尚无已保存回复草稿。' : 'No saved reply draft yet.'}</div>}
      {current && previous && <details className="version-comparison" open={comparePrevious} onToggle={(event) => setComparePrevious(event.currentTarget.open)}><summary>{chinese ? '对比已保存版本' : 'Compare saved versions'} v{previous.version} → v{current.version}</summary><div className="compare"><div className="compare-col"><strong>v{previous.version}</strong><p className="compare-text">{artifactText(previous.content)}</p></div><div className="compare-col artifact-draft"><strong>v{current.version}</strong><p className="compare-text">{artifactText(current.content)}</p></div></div></details>}
      {currentFindings.length > 0 && <details className="version-findings"><summary>{chinese ? '当前版本的核验结果' : 'Checks for selected version'} ({currentFindings.length})</summary>{currentFindings.map((f) => <p key={f.id} className="muted">{chinese ? f.explanationZh : f.explanationEn}</p>)}</details>}
      </div><aside className="artifact-side">
      <h3>{chinese ? '修订历史' : 'Revision history'}</h3><div className="timeline version-timeline">{latest.map((v) => <button type="button" className={`timeline-item version-history-button ${current?.id === v.id ? 'selected' : ''}`} aria-pressed={current?.id === v.id} key={v.id} onClick={() => { setSelectedVersion(v.version); setNotice(null); setError(null); }}><span className={`timeline-dot ${v.reviewStatus === 'approved' ? 'done' : ''}`}/><span><strong>v{v.version} · {v.version === artifact.latestVersion ? (chinese ? '当前草稿' : 'Current draft') : (chinese ? '历史版本' : 'Previous draft')}</strong><small>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v.createdAt))}</small><small>{v.reviewStatus} · {v.validationStatus}</small></span></button>)}</div>
      {latest.length > 1 && <div className="version-selector"><label htmlFor={`version-${artifact.id}`}>{chinese ? '版本历史' : 'Version history'}</label><select id={`version-${artifact.id}`} value={current?.version} onChange={(event) => setSelectedVersion(Number(event.target.value))}>{latest.map((version) => <option key={version.id} value={version.version}>v{version.version} · {version.reviewStatus} · {version.createdAt}</option>)}</select></div>}
      {history.length > 0 && <details className="revision-events"><summary>{chinese ? '已保存的修改指令' : 'Saved revision instructions'}</summary>{history.map((event) => <div className="revision-event" key={event.id}><span>v{event.fromVersion} → v{event.toVersion}</span><p>{event.promptText}</p><small>{event.promptLocale} · {new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(event.createdAt))}</small></div>)}</details>}
      </aside></div>
      {currentFindings.length > 0 && <div className="saved-findings">{currentFindings.map((finding) => <div className="finding" key={finding.id}><div className="finding-mark">{finding.severity === 'blocker' ? '!' : 'i'}</div><div><span className="badge badge-neutral">{finding.category} · {finding.severity}</span><p>{chinese ? finding.explanationZh : finding.explanationEn}</p>{(finding.originalSpan || finding.proposedSpan) && <div className="finding-diff"><div><strong>{chinese ? '原文' : 'Before'}</strong><p>{finding.originalSpan || '—'}</p></div><div><strong>{chinese ? '建议文本' : 'Proposed text'}</strong><p>{finding.proposedSpan || '—'}</p></div></div>}<small>{finding.sourceIds.join(' · ')}</small></div></div>)}</div>}
      {current && <div className="artifact-revision"><div className="card-title-row"><label htmlFor={`prompt-${artifact.id}`} className="card-title">{chinese ? '对话修订' : 'Conversational revision'}</label><span className="badge badge-neutral">{isCurrent ? (chinese ? '当前版本' : 'Current version') : (chinese ? '历史版本' : 'Historical version')}</span></div><textarea id={`prompt-${artifact.id}`} name="promptText" className="textarea" rows={2} maxLength={4000} value={prompt} disabled={!isCurrent || busy !== null} onChange={(event) => setPrompt(event.target.value)} placeholder={chinese ? '输入后续修改指令…' : 'Describe the revision…'}/><VoiceInput disabled={!isCurrent || busy !== null} onConfirmed={(value) => setPrompt((currentPrompt) => currentPrompt ? `${currentPrompt}\n${value}` : value)}/><div className="artifact-actions"><span className="muted" role="status">{prompt.trim() ? (chinese ? '指令尚未提交；草稿未更改。' : 'Instruction not submitted; saved draft unchanged.') : (chinese ? '输入指令以生成新版本。' : 'Describe a change to create a new version.')}</span><button className="btn btn-primary btn-sm" type="button" disabled={!isCurrent || !prompt.trim() || busy !== null} onClick={submitRevision}>{busy === 'revise' ? (chinese ? '正在修订…' : 'Revising…') : (chinese ? '提交修订' : 'Submit revision')}<Icon name="arrow" size={13}/></button></div></div>}
      {current && <div className="artifact-review"><div className="card-title-row"><span className="card-title">{chinese ? '人工审核' : 'Human review'}</span><span className={`badge ${current.reviewStatus === 'approved' ? 'badge-safe' : 'badge-review'}`}>{current.reviewStatus}</span></div><div className="review-fields"><select aria-label={chinese ? '审核决定' : 'Review decision'} value={decision} disabled={!isCurrent || busy !== null} onChange={(event) => setDecision(event.target.value as typeof decision)}><option value="approved">{chinese ? '批准草稿' : 'Approve draft'}</option><option value="changes_requested">{chinese ? '要求修改' : 'Request changes'}</option><option value="rejected">{chinese ? '拒绝草稿' : 'Reject draft'}</option></select><input className="input" aria-label={chinese ? '审核备注' : 'Review note'} name="reviewComment" value={comment} disabled={!isCurrent || busy !== null} maxLength={2000} onChange={(event) => setComment(event.target.value)} placeholder={chinese ? '审核备注（可选）…' : 'Review note (optional)…'}/><button className="btn btn-soft btn-sm" type="button" disabled={!isCurrent || busy !== null} onClick={() => reviewDialog.current?.showModal()}>{busy === 'review' ? (chinese ? '正在保存…' : 'Saving…') : (chinese ? '提交审核' : 'Submit review')}</button></div><p className="muted">{chinese ? '此操作保存演示业务角色的决定，不会向外部平台发布。账户权限仍需后端接入。' : 'Saves a demo business-role decision; does not publish externally. Account permissions require backend integration.'}</p></div>}
      <dialog ref={reviewDialog} className="review-confirmation" aria-labelledby={`review-title-${artifact.id}`}><h2 id={`review-title-${artifact.id}`}>{chinese ? '确认审核决定' : 'Confirm review decision'}</h2><p>{chinese ? '版本' : 'Version'} {current?.version} · {decision} · {role}</p><p>{chinese ? '只有服务器保存成功后才会更新审核状态。不会发布到外部店铺。' : 'Review status changes only after the server confirms the save. Nothing is published to a storefront.'}</p><div className="artifact-actions"><button type="button" className="btn btn-soft" autoFocus onClick={() => reviewDialog.current?.close()}>{chinese ? '取消' : 'Cancel'}</button><button type="button" className="btn btn-primary" onClick={() => { reviewDialog.current?.close(); void submitReview(); }}>{chinese ? '确认并保存' : 'Confirm & save'}</button></div></dialog>
      {notice && <p className="api-notice" role="status">{notice}</p>}
      {error && <p className="api-error" role="alert">{error}</p>}
      <div className="artifact-sources"><span>{chinese ? '关联来源' : 'Source IDs'}:</span> {current?.sourceIds.join(' · ') || (listing ? `${listing.id} · ${listing.snapshotVersion}` : '—')}</div>
    </section>
  );
}
