'use client';

import { useState } from 'react';
import type { CaseBundle } from '@/lib/contracts';

export function SourceBrowser({ bundle, locale }: { bundle: CaseBundle; locale: string }) {
  const [category, setCategory] = useState('all');
  const zh = locale === 'zh-CN';
  const categories = [['all', zh ? '全部来源' : 'All sources'], ['market_law', zh ? '市场法规' : 'Market law'], ['platform_rule', zh ? '平台规则' : 'Platform rules'], ['evidence', zh ? '产品证据' : 'Product evidence']];
  const rules = bundle.rules.filter((r) => category === 'all' || r.category === category);
  const evidence = category === 'all' || category === 'evidence' ? bundle.evidence : [];
  return <section className="card card-pad"><div className="toolbar-left source-tabs" role="group" aria-label={zh ? '来源分类' : 'Source category'}>{categories.map(([id, label]) => <button className={`tab ${category === id ? 'active' : ''}`} type="button" key={id} aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}</div>
    {rules.map((r) => <article className="source-record" key={r.id}><div className="card-title-row"><h2>{r.id}</h2><span className={`badge ${r.status === 'verified' ? 'badge-safe' : 'badge-review'}`}>{r.status === 'verified' ? (zh ? '已核验' : 'Verified') : (zh ? '需核验' : 'Needs verification')}</span></div><p>{r.category} · {r.market} · {r.segment}</p><p>{r.excerpt ?? (zh ? '尚未保存官方原文摘录。' : 'No official excerpt has been recorded.')}</p><p>{r.applicability}</p><a className="card-link source-url" href={r.sourceUrl} target="_blank" rel="noreferrer">{r.sourceUrl}<span className="sr-only">{zh ? '（新窗口打开）' : ' (opens a new window)'}</span></a>{r.checkedAt && <small>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(r.checkedAt))}</small>}</article>)}
    {evidence.map((e) => <article className="source-record" key={e.id}><div className="card-title-row"><h2>{e.id}</h2><span className="badge badge-neutral">{e.verificationStatus}</span></div><p>{e.content}</p><small>{e.provenance} · {e.sourceVersion}</small></article>)}
    {!rules.length && !evidence.length && <p className="empty-state">{zh ? '该分类暂无已保存来源。' : 'No saved sources in this category.'}</p>}
  </section>;
}
