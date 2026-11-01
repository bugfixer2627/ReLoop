'use client';

import Link from 'next/link';
import { useCases } from './useCases';
import { useWorkspace } from './WorkspaceProviders';
import { Unavailable } from './Unavailable';
import { caseReference } from '@/lib/frontend/case-reference';

export function InboxContext({ hasSku, hasFeedback, hasInstruction }: { hasSku: boolean; hasFeedback: boolean; hasInstruction: boolean }) {
  const { cases, loading, error, retry } = useCases();
  const { locale } = useWorkspace();
  const zh = locale === 'zh-CN';
  return <aside className="investigation-column inbox-context">
    <section className="card card-pad"><div className="card-title-row"><h2 className="card-title">{zh ? '最近客户案例' : 'Recent customer cases'}</h2><Link className="card-link" href="/cases">{zh ? '全部' : 'All'}</Link></div>{loading && <p role="status">{zh ? '正在读取…' : 'Loading…'}</p>}{error && <div className="api-error" role="alert"><p>{error}</p><button type="button" className="btn btn-soft btn-sm" onClick={retry}>{zh ? '重试' : 'Retry'}</button></div>}{!loading && !error && (cases.length ? cases.slice(0, 4).map((c) => <Link className="recent-case-link" key={c.id} href={`/cases/${c.id}/detail`}><strong title={c.id} translate="no">{caseReference(c.id)}</strong><span>{c.feedbackText.slice(0,85)}</span><small>SKU {c.sku}</small></Link>) : <p className="muted">{zh ? '暂无已保存案例。' : 'No saved cases yet.'}</p>)}</section>
    <section className="card card-pad"><h2 className="card-title">{zh ? '输入清单' : 'Input checklist'}</h2><ul className="input-checklist">{[[hasSku, zh ? '填写已登记 SKU' : 'Registered SKU entered'], [hasFeedback, zh ? '保留客户原话' : 'Original complaint captured'], [hasInstruction, zh ? '填写商家指令' : 'Merchant instruction entered']].map(([done, label]) => <li key={String(label)}><span aria-hidden="true">{done ? '✓' : '○'}</span>{label}<span className="sr-only">{done ? (zh ? '已填写' : 'entered') : (zh ? '待填写' : 'not entered')}</span></li>)}</ul><p className="muted">{zh ? '填写状态不代表服务器校验或证据核验已通过。' : 'Entered fields are not proof of server validation or verified evidence.'}</p></section>
    <section className="card card-pad"><Unavailable title={zh ? '商品预览尚未接入' : 'Product preview unavailable'}>{zh ? 'SKU 查询接口未提供。保存案例后可读取商品名称、属性和证据。' : 'SKU lookup is not available. Saved cases provide product name, attributes and evidence.'}</Unavailable></section>
  </aside>;
}
