'use client';

import Link from 'next/link';
import type { Case } from '@/lib/contracts';
import { casePlatformLabel } from '@/lib/frontend/api-client';
import { CaseStatusBadge } from './WorkspaceShell';
import { Icon } from './icons';

export function CaseTable({ cases, locale, href }: { cases: Case[]; locale: string; href?: (id: string) => string }) {
  const zh = locale === 'zh-CN';
  return <div className="table-wrap"><table className="data-table"><thead><tr><th>{zh ? '案例 / SKU' : 'Case / SKU'}</th><th>{zh ? '平台' : 'Channel'}</th><th>{zh ? '状态' : 'Status'}</th><th>{zh ? '创建时间' : 'Created'}</th><th><span className="sr-only">{zh ? '打开' : 'Open'}</span></th></tr></thead><tbody>{cases.map((item) => <tr key={item.id}>
    <td><Link className="case-id" href={href?.(item.id) ?? `/cases/${item.id}/detail`}>{item.id.slice(0, 8).toUpperCase()}</Link><div className="case-title">{item.feedbackText.slice(0, 100)}{item.feedbackText.length > 100 ? '…' : ''}</div><div className="case-sub">SKU {item.sku} {item.synthetic && <span className="badge badge-neutral">{zh ? '合成' : 'Synthetic'}</span>}</div></td>
    <td>{casePlatformLabel(item.channel, locale)}</td><td><CaseStatusBadge status={item.status} locale={locale === 'zh-CN' ? 'zh-CN' : 'en-US'}/></td><td>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.createdAt))}</td>
    <td><Link className="icon-btn case-open" href={href?.(item.id) ?? `/cases/${item.id}/detail`} aria-label={`${zh ? '打开案例' : 'Open case'} ${item.id}`}><Icon name="arrow" size={15}/></Link></td>
  </tr>)}</tbody></table></div>;
}
