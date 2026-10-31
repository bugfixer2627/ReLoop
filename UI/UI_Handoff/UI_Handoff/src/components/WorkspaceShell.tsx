'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Brand } from './Brand';
import { Icon } from './icons';

const nav = [
  { href: '/dashboard', label: 'Overview', icon: 'grid' },
  { href: '/feedback', label: 'Feedback inbox', icon: 'inbox' },
  { href: '/investigation', label: 'Claim investigation', icon: 'search' },
  { href: '/fix-approve', label: 'Fix & approve', icon: 'shield' },
];

export function WorkspaceShell({ children, title }: { children: ReactNode; title: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [lang, setLang] = useState('EN');
  const [quickOpen, setQuickOpen] = useState(false);

  return (
    <div className="app-shell">
      <aside className={`sidebar ${open ? 'open' : ''}`}>
        <Brand dark />
        <div className="sidebar-label">Menu</div>
        <nav className="side-nav">{nav.map(item => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={`side-link ${pathname === item.href ? 'active' : ''}`}><span className="nav-icon"><Icon name={item.icon} size={17}/></span>{item.label}</Link>)}</nav>
        <div className="sidebar-label" style={{ marginTop: 28 }}>Components</div>
        <nav className="side-nav"><Link href="/design-lab" onClick={() => setOpen(false)} className={`side-link ${pathname === '/design-lab' ? 'active' : ''}`}><span className="nav-icon"><Icon name="sparkle" size={17}/></span>Design lab</Link><Link href="/feedback" onClick={() => setOpen(false)} className="side-link"><span className="nav-icon"><Icon name="file" size={17}/></span>Forms & input</Link></nav>
        <div className="sidebar-label" style={{ marginTop: 28 }}>Pages</div>
        <nav className="side-nav"><Link href="/login" onClick={() => setOpen(false)} className="side-link"><span className="nav-icon"><Icon name="external" size={17}/></span>Login screen</Link><Link href="/" onClick={() => setOpen(false)} className="side-link"><span className="nav-icon"><Icon name="globe" size={17}/></span>Public landing</Link></nav>
        <div className="sidebar-profile"><img src="/spark-avatar.png" alt="Jasmine Li" className="sidebar-profile-img"/><div className="sidebar-profile-info"><div className="sidebar-profile-name">Jasmine Li</div><div className="sidebar-profile-email">jasmine.li@reloop.demo</div></div></div>
      </aside>
      <main className="main-area">
        <header className="topbar">
          <div className="navbar-left"><button className="icon-btn desktop-toggle" aria-label="Navigation menu"><Icon name="menu" size={17}/></button><button className="icon-btn mobile-menu" aria-label="Toggle navigation" onClick={() => setOpen(!open)}><Icon name="menu" size={19}/></button><Brand compact className="mobile-brand"/><div className="quick-wrap"><button className="quick-create" onClick={() => setQuickOpen(!quickOpen)}><Icon name="plus" size={14}/>Create</button>{quickOpen && <div className="quick-menu"><b>Quick actions</b><Link href="/feedback" onClick={() => setQuickOpen(false)}>New customer case</Link><Link href="/investigation" onClick={() => setQuickOpen(false)}>Review a claim</Link><Link href="/fix-approve" onClick={() => setQuickOpen(false)}>Open approval queue</Link></div>}</div></div>
          <div className="navbar-search"><input placeholder="Search anything in ReLoop…" aria-label="Search"/><button className="icon-btn" aria-label="Search"><Icon name="search" size={16}/></button></div>
          <div className="topbar-tools"><button className="icon-btn topbar-action" aria-label="Language"><Icon name="globe" size={16}/></button><button className="language" onClick={() => setLang(lang === 'EN' ? '中文' : 'EN')} style={{ border: 0, background: 'none' }}>{lang}</button><button className="icon-btn topbar-action" aria-label="Notifications"><Icon name="bell" size={17}/><i className="notification-dot"/></button><button className="profile-btn"><img src="/spark-avatar.png" alt="Jasmine Li"/><span>Jasmine Li</span><span style={{ color: '#8c9c94' }}>⌄</span></button></div>
        </header>
        <div className="workspace-context"><span>{title}</span><span className="demo-indicator"><i/>Demo workspace · Mock data</span></div>
        {children}
      </main>
    </div>
  );
}

export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
  return <div className="page-heading"><div>{eyebrow && <div className="eyebrow" style={{ marginBottom: 9 }}><span className="eyebrow-dot"/>{eyebrow}</div>}<h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="heading-actions">{actions}</div>}</div>;
}

export function StatusBadge({ status }: { status: 'risk' | 'review' | 'safe' | 'neutral' }) {
  const labels = { risk: 'High risk', review: 'Needs review', safe: 'Clear', neutral: 'In progress' };
  return <span className={`badge badge-${status}`}><i className="badge-dot"/>{labels[status]}</span>;
}
