'use client';

import { PageHeading, WorkspaceShell } from '@/components/reloop-ui/WorkspaceShell';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { Unavailable } from '@/components/reloop-ui/Unavailable';
import { platformSchema } from '@/lib/contracts';
import { platformLabel } from '@/lib/config/platforms';

export default function SettingsPage() {
  const { locale, toggleLocale, compact, toggleCompact } = useWorkspace();
  const zh = locale === 'zh-CN';
  return <WorkspaceShell title={zh ? '设置' : 'Settings'}><div className="page">
    <PageHeading title={zh ? '工作区设置' : 'Workspace settings'} description={zh ? '管理本机显示偏好，了解当前工作区的访问与审核方式。' : 'Your display preferences, workspace access and review safeguards.'}/>
    <div className="detail-grid"><div className="investigation-column">
      <section className="card card-pad"><h2 className="card-title">{zh ? '本机偏好' : 'Device preferences'}</h2><p className="muted">{zh ? '只在当前浏览器保存，不会改变客户原文、指令或输出语言。' : 'Saved in this browser only. Source feedback, instruction and output languages remain separate.'}</p>
        <div className="setting-row"><div><h3>{zh ? '界面语言' : 'Interface language'}</h3><p>{locale === 'zh-CN' ? '简体中文' : 'English'}</p></div><button className="btn btn-soft btn-sm" onClick={toggleLocale}>{zh ? 'Switch to English' : '切换为中文'}</button></div>
        <div className="setting-row"><div><h3>{zh ? '紧凑表格' : 'Compact tables'}</h3><p>{zh ? '减少案例表格的行间距。' : 'Reduce spacing between case-table rows.'}</p></div><button className={`preference-switch ${compact ? 'on' : ''}`} role="switch" aria-checked={compact} aria-label={zh ? '紧凑表格' : 'Compact tables'} onClick={toggleCompact}><span/></button></div>
        <p className="muted">{zh ? '偏好会自动保存；若浏览器禁止存储，则仅在本次会话有效。' : 'Preferences save automatically; if browser storage is blocked they last for this session only.'}</p>
      </section>
      <section className="card card-pad"><h2 className="card-title">{zh ? '工作区资料' : 'Workspace profile'}</h2><Unavailable title={zh ? '账户资料暂不可用' : 'Account profile unavailable'}>{zh ? 'Supabase Auth 已验证登录邮箱。团队成员、工作区资料和密码管理尚未接入。' : 'Supabase Auth verifies the signed-in email. Team membership, workspace profile, and password management are not connected yet.'}</Unavailable></section>
      <section className="card card-pad"><h2 className="card-title">{zh ? '团队' : 'Team'}</h2><p className="muted">{zh ? '没有可读取的成员记录。团队邀请与权限管理暂不可用。' : 'No member directory is available. Invitations and permission management are unavailable.'}</p><button className="btn btn-soft btn-sm" disabled>{zh ? '邀请成员（未接入）' : 'Invite member (unavailable)'}</button></section>
    </div><div className="investigation-column">
      <section className="card card-pad"><h2 className="card-title">{zh ? '平台上下文' : 'Marketplace contexts'}</h2>{platformSchema.options.map((id) => <div className="setting-row" key={id}><div><h3>{platformLabel(id, locale)}</h3><p>{zh ? '导入快照，不是已连接的卖家账户' : 'Imported snapshots, not a connected seller account'}</p></div><span className="badge badge-neutral">{zh ? '快照' : 'Snapshots'}</span></div>)}</section>
      <section className="card card-pad"><h2 className="card-title">{zh ? '审核原则' : 'Review policy'}</h2><div className="setting-row"><div><h3>{zh ? '人工确认' : 'Human decision'}</h3><p>{zh ? '草稿必须通过服务器审核操作保存决定。批准不代表发布到店铺。' : 'Review decisions must be confirmed by the server. Approval does not publish to a storefront.'}</p></div><span className="badge badge-review">{zh ? '必须' : 'Required'}</span></div><p className="muted">{zh ? '客服回复只能使用已有证据和商家授权。自动发布未提供，也不能在此开启。' : 'Support replies must follow documented evidence and merchant authorization. Auto-publishing is unavailable and cannot be enabled here.'}</p></section>
      <section className="card card-pad"><Unavailable title={zh ? '通知设置暂不可用' : 'Notification preferences unavailable'}>{zh ? '没有通知接口或用户接收人记录，不能保存提醒设置。' : 'No notification API or user recipient records are available to save alert settings.'}</Unavailable></section>
    </div></div>
  </div></WorkspaceShell>;
}
