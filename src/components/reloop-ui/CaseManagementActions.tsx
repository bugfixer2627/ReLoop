'use client';

import { useId, useState, type FormEvent } from 'react';
import { caseStatusSchema, type CaseBundle } from '@/lib/contracts';
import { ApiRequestError, manageCase } from '@/lib/frontend/api-client';
import { useWorkspace } from './WorkspaceProviders';

export function CaseManagementActions({ bundle, onSaved }: { bundle: CaseBundle; onSaved: () => void }) {
  const { locale, accessToken } = useWorkspace();
  const zh = locale === 'zh-CN';
  const statusId = useId();
  const [busy, setBusy] = useState<'status' | 'reviewer' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  if (bundle.access?.role === 'reviewer') {
    return <p className="api-notice">{zh ? '你是本案例指定的审核人。' : 'You are the assigned reviewer for this case.'}</p>;
  }
  if (bundle.access?.role !== 'owner') return null;

  async function save(event: FormEvent<HTMLFormElement>, action: 'status' | 'reviewer') {
    event.preventDefault();
    if (!accessToken || busy) return;
    setError(''); setNotice(''); setBusy(action);
    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const input = action === 'status'
        ? { action, status: caseStatusSchema.parse(data.get('status')), expectedStatus: bundle.case.status, note: String(data.get('note') ?? '') }
        : { action, reviewerUserId: String(data.get('reviewerUserId') ?? '').trim() || null };
      await manageCase(accessToken, bundle.case.id, input);
      if (action === 'status') form.reset();
      setNotice(zh ? '案例已更新。' : 'Case updated.');
      onSaved();
    } catch (reason) { setError(reason instanceof ApiRequestError ? reason.message : (zh ? '请检查状态、备注或账户 ID。' : 'Check the status, note, or reviewer account ID.')); }
    finally { setBusy(null); }
  }

  return <details className="card card-pad workflow-form">
    <summary>{zh ? '管理案例' : 'Manage case'}</summary>
    <form className="workflow-fields" key={bundle.case.status} onSubmit={(event) => save(event, 'status')}>
      <div className="field"><label htmlFor={statusId}>{zh ? '案例状态' : 'Case status'}</label><select id={statusId} className="select" name="status" defaultValue={bundle.case.status}>
        <option value="open">{zh ? '处理中' : 'Open'}</option>
        <option value="pending_review">{zh ? '等待审核' : 'Pending review'}</option>
        <option value="clear">{zh ? '已解决' : 'Resolved'}</option>
      </select></div>
      <label>{zh ? '状态变更说明' : 'Status change note'}<textarea className="textarea" name="note" rows={2} required maxLength={2000}/></label>
      <button className="btn btn-soft btn-sm" type="submit" disabled={busy !== null}>{busy === 'status' ? (zh ? '正在保存…' : 'Saving…') : (zh ? '更新状态' : 'Update status')}</button>
    </form>
    <form className="workflow-fields" key={bundle.access.reviewerUserId ?? 'unassigned'} onSubmit={(event) => save(event, 'reviewer')}>
      <label>{zh ? '审核人账户 ID' : 'Reviewer account ID'}<input className="input" name="reviewerUserId" aria-describedby="reviewer-account-hint" defaultValue={bundle.access.reviewerUserId ?? ''} maxLength={36} spellCheck={false} autoComplete="off"/></label>
      <p className="muted" id="reviewer-account-hint">{zh ? '审核人可在「设置」中找到自己的账户 ID。留空可撤销指派。' : 'The reviewer can find their account ID in Settings. Clear the field to remove the assignment.'}</p>
      <button className="btn btn-soft btn-sm" type="submit" disabled={busy !== null}>{busy === 'reviewer' ? (zh ? '正在保存…' : 'Saving…') : (zh ? '保存审核人' : 'Save reviewer')}</button>
    </form>
    {error && <p className="api-error" role="alert">{error}</p>}
    {notice && <p className="api-notice" role="status">{notice}</p>}
  </details>;
}
