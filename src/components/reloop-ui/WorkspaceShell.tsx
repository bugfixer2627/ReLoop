'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useWorkspace } from './WorkspaceProviders';
import { Brand } from './Brand';
import { Icon } from './icons';

const labels = {
  'en-US': {
    overview: 'Overview', feedback: 'Feedback inbox', investigation: 'Claim investigation',
    fix: 'Fix & approve', menu: 'Menu', quickCreate: 'Create', newCase: 'New customer case',
    openInvestigation: 'Open current investigation', openWorkspace: 'Open fix workspace',
    search: 'Search cases', language: 'Switch interface language', closeNavigation: 'Close navigation', skip: 'Skip to main content', unknown: 'Unknown', workspace: 'ReLoop workspace',
    access: 'Protected demo workspace', signOut: 'Leave workspace', signInTitle: 'Workspace access required',
    signInCopy: 'Enter the shared demo access token to load saved cases.', signInAction: 'Continue to access',
  },
  'zh-CN': {
    overview: '工作台', feedback: '反馈收件箱', investigation: '承诺核验',
    fix: '修订与审核', menu: '菜单', quickCreate: '创建', newCase: '新建客户案例',
    openInvestigation: '打开当前核验', openWorkspace: '打开修订工作区',
    search: '搜索案例', language: '切换界面语言', closeNavigation: '关闭导航', skip: '跳转到主要内容', unknown: '未知', workspace: 'ReLoop 工作台',
    access: '受保护的演示工作区', signOut: '离开工作区', signInTitle: '需要工作区访问权限',
    signInCopy: '输入共享演示访问令牌以读取已保存案例。', signInAction: '前往访问页面',
  },
} as const;

export function WorkspaceShell({ children, title, searchQuery = '' }: { children: ReactNode; title: string; searchQuery?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const { accessToken, clearAccessToken, locale, toggleLocale } = useWorkspace();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const sidebarRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const wasMobileOpen = useRef(false);
  const text = labels[locale];
  const caseId = pathname.match(/^\/cases\/([^/]+)/)?.[1];
  const isFix = pathname.endsWith('/fix');
  const isDashboard = pathname === '/dashboard';
  const nav = [
    { href: '/dashboard', label: text.overview, icon: 'grid', active: pathname === '/dashboard' },
    { href: '/feedback', label: text.feedback, icon: 'inbox', active: pathname === '/feedback' },
    { href: caseId && !isFix ? `/cases/${caseId}` : '/dashboard', label: text.investigation, icon: 'search', active: Boolean(caseId && !isFix) },
    { href: caseId ? `/cases/${caseId}/fix` : '/dashboard', label: text.fix, icon: 'shield', active: Boolean(caseId && isFix) },
  ];

  useEffect(() => {
    if (mobileOpen) {
      sidebarRef.current?.querySelector<HTMLElement>('a[href], button:not(:disabled)')?.focus();
    } else if (wasMobileOpen.current) {
      menuButtonRef.current?.focus();
    }
    wasMobileOpen.current = mobileOpen;
  }, [mobileOpen]);

  function handleDrawerKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setMobileOpen(false);
      return;
    }
    if (event.key !== 'Tab' || !sidebarRef.current) return;

    const focusable = Array.from(sidebarRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.getClientRects().length > 0);
    const first = focusable[0];
    const last = focusable.at(-1);
    if (!first || !last) {
      event.preventDefault();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function signOut() {
    setMobileOpen(false);
    clearAccessToken();
    router.replace('/login');
  }

  if (!accessToken) {
    return (
      <div className="reloop-ui">
        <main className="workspace-access-required">
          <Brand />
          <h1>{text.signInTitle}</h1>
          <p>{text.signInCopy}</p>
          <Link className="btn btn-primary" href="/login">{text.signInAction}<Icon name="arrow" size={15}/></Link>
        </main>
      </div>
    );
  }

  return (
    <div className={`reloop-ui ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <div className="app-shell">
        <a className="workspace-skip" href="#workspace-main" inert={mobileOpen}>{text.skip}</a>
        {mobileOpen && <button className="sidebar-backdrop" type="button" aria-label={text.closeNavigation} onClick={() => setMobileOpen(false)} />}
        <aside
          ref={sidebarRef}
          className={`sidebar ${mobileOpen ? 'open' : ''}`}
          role={mobileOpen ? 'dialog' : undefined}
          aria-modal={mobileOpen || undefined}
          aria-label={mobileOpen ? text.menu : undefined}
          onKeyDown={mobileOpen ? handleDrawerKeyDown : undefined}
        >
          <Brand dark />
          <div className="sidebar-label">{text.menu}</div>
          <nav className="side-nav" aria-label={text.menu}>
            {nav.map((item) => (
              <Link key={`${item.label}-${item.href}`} href={item.href} onClick={() => setMobileOpen(false)} className={`side-link ${item.active ? 'active' : ''}`} aria-current={item.active ? 'page' : undefined} title={collapsed ? item.label : undefined}>
                <span className="nav-icon"><Icon name={item.icon} size={17}/></span><span className="side-text">{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="sidebar-mobile-actions">
            <button className="sidebar-action" type="button" onClick={toggleLocale} aria-label={text.language}>{locale === 'en-US' ? '中文' : 'English'}</button>
            <button className="sidebar-action" type="button" onClick={signOut}>{text.signOut}</button>
          </div>
          <div className="sidebar-bottom"><strong>{text.workspace}</strong><span>{text.access}</span></div>
        </aside>
        <main className="main-area" inert={mobileOpen}>
          <header className="topbar">
            <div className="navbar-left">
              <button className="icon-btn desktop-toggle" aria-label="Collapse navigation" aria-expanded={!collapsed} onClick={() => setCollapsed((value) => !value)}><Icon name="menu" size={17}/></button>
              <button ref={menuButtonRef} className="icon-btn mobile-menu" aria-label={text.menu} aria-expanded={mobileOpen} aria-haspopup="dialog" onClick={() => setMobileOpen((value) => !value)}><Icon name="menu" size={19}/></button>
              <Brand compact className="mobile-brand"/>
              <div className="quick-wrap">
                <button className="quick-create" aria-expanded={quickOpen} onClick={() => setQuickOpen((value) => !value)}><Icon name="plus" size={14}/>{text.quickCreate}</button>
                {quickOpen && <div className="quick-menu" role="menu"><Link role="menuitem" href="/feedback" onClick={() => setQuickOpen(false)}>{text.newCase}</Link>{caseId && <Link role="menuitem" href={isFix ? `/cases/${caseId}` : `/cases/${caseId}/fix`} onClick={() => setQuickOpen(false)}>{isFix ? text.openInvestigation : text.openWorkspace}</Link>}</div>}
              </div>
            </div>
            <form key={isDashboard ? searchQuery : 'no-query'} className={`navbar-search ${isDashboard ? 'dashboard-search' : ''}`} role="search" onSubmit={(event) => { event.preventDefault(); router.push(`/dashboard?q=${encodeURIComponent(new FormData(event.currentTarget).get('q')?.toString() ?? '')}`); }}>
              <input name="q" autoComplete="off" defaultValue={isDashboard ? searchQuery : ''} placeholder={`${text.search}…`} aria-label={text.search}/><button className="icon-btn" aria-label={text.search} type="submit"><Icon name="search" size={16}/></button>
            </form>
            <div className="topbar-tools">
              <button className="language" type="button" onClick={toggleLocale} aria-label={text.language}>{locale === 'en-US' ? '中文' : 'EN'}</button>
              <button className="profile-btn" type="button" onClick={signOut} title={text.signOut}>
                <span className="avatar" aria-hidden="true">R</span><span className="profile-label">{text.workspace}</span><span aria-hidden="true">⌄</span>
              </button>
            </div>
          </header>
          <div className="workspace-context"><span>{title}</span><span className="demo-indicator"><i/>{text.access}</span></div>
          <div id="workspace-main" tabIndex={-1}>{children}</div>
        </main>
      </div>
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow"><span className="eyebrow-dot"/>{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}

export function StatusBadge({ status }: { status: 'risk' | 'review' | 'safe' | 'neutral' }) {
  const labels = { risk: 'High risk', review: 'Needs review', safe: 'Clear', neutral: 'In progress' };
  return <span className={`badge badge-${status}`}><i className="badge-dot"/>{labels[status]}</span>;
}

export function CaseStatusBadge({ status, locale = 'en-US' }: { status: 'open' | 'investigating' | 'pending_review' | 'closed'; locale?: 'en-US' | 'zh-CN' }) {
  const labels = locale === 'zh-CN'
    ? { open: '待处理', investigating: '调查中', pending_review: '等待审核', closed: '已关闭' } as const
    : { open: 'Open', investigating: 'Investigating', pending_review: 'Pending review', closed: 'Closed' } as const;
  const variant = status === 'closed' ? 'safe' : status === 'pending_review' ? 'review' : 'neutral';
  return <span className={`badge badge-${variant}`}><i className="badge-dot"/>{labels[status]}</span>;
}
