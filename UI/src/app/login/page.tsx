'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Brand } from '@/components/Brand';
import { Icon } from '@/components/icons';

export default function LoginPage() {
  const router = useRouter();
  const [show, setShow] = useState(false);
  return (
    <main className="brand-login-page">
      <div className="login-glow login-glow-one"/><div className="login-glow login-glow-two"/>
      <div className="brand-login-wrap">
        <Link href="/" className="login-back">Back to ReLoop</Link>
        <div className="card brand-login-card">
          <Brand className="login-logo"/>
          <h1>Welcome back.</h1>
          <p className="login-description">Your next review starts with a clearer picture.</p>
          <form onSubmit={event => { event.preventDefault(); router.push('/dashboard'); }}>
            <div className="field"><label htmlFor="demo-email">Email address</label><input id="demo-email" className="input" value="jasmine.li@reloop.demo" readOnly/></div>
            <div className="field"><label htmlFor="demo-password">Password</label><div className="login-password"><input id="demo-password" className="input" type={show ? 'text' : 'password'} value="demo-access" readOnly/><button className="password-toggle" type="button" aria-label={show ? 'Hide demo password' : 'Show demo password'} onClick={() => setShow(!show)}>{show ? 'Hide' : 'Show'}</button></div></div>
            <div className="login-options"><label><input type="checkbox" defaultChecked/> Remember me</label><span>Demo account</span></div>
            <button className="btn btn-primary login-submit" type="submit">Enter demo workspace <Icon name="arrow" size={16}/></button>
          </form>
          <div className="login-divider">Visual prototype</div>
          <div className="login-demo-note"><Icon name="shield" size={17}/><p><strong>Demo only.</strong> No credentials are stored and no authentication service is connected.</p></div>
        </div>
        <p className="login-bottom">ReLoop AI Design Lab <span aria-hidden="true">/</span> <Link href="/design-lab">Explore components</Link></p>
      </div>
    </main>
  );
}
