'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Brand } from '@/components/reloop-ui/Brand';
import { Icon } from '@/components/reloop-ui/icons';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';

export default function LoginPage() {
  const router = useRouter();
  const { setAccessToken, locale, toggleLocale } = useWorkspace();
  const zh = locale === 'zh-CN';
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim() || !password || loading) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const body = await response.json();
      if (!response.ok || !body.ok) {
        throw new Error(body.error?.message ?? 'Sign-in failed. Check your connection and try again.');
      }
      setAccessToken('session');
      router.replace('/dashboard');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : (zh ? '无法登录，请检查连接后重试。' : 'Could not sign in. Check the connection and try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reloop-ui">
      <main className="brand-login-page">
        <div className="brand-login-wrap">
          <div className="login-topline"><Link href="/" className="login-back">{zh ? '返回 ReLoop' : 'Back to ReLoop'}</Link><button className="language" onClick={toggleLocale} aria-label={zh ? '切换界面语言' : 'Switch interface language'}>{zh ? 'EN' : '中文'}</button></div>
          <section className="card brand-login-card">
            <Brand className="login-logo"/>
            <h1>{zh ? '欢迎回来。' : 'Welcome back.'}</h1>
            <p className="login-description">{zh ? '下一次审核，从更清晰的全貌开始。' : 'Your next review starts with a clearer picture.'}</p>
            <form onSubmit={submit}>
              <div className="field"><label htmlFor="login-email">{zh ? '邮箱地址' : 'Email address'}</label><input className="input" id="login-email" name="email" type="email" autoComplete="username" spellCheck={false} placeholder="merchant@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={254}/></div>
              <div className="field"><label htmlFor="login-password">{zh ? '密码' : 'Password'}</label><div className="login-password"><input className="input" id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required maxLength={256}/><button className="password-toggle" type="button" aria-label={showPassword ? (zh ? '隐藏密码' : 'Hide password') : (zh ? '显示密码' : 'Show password')} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>{showPassword ? (zh ? '隐藏' : 'Hide') : (zh ? '显示' : 'Show')}</button></div></div>
              {error && <p className="login-error" role="alert">{error}</p>}
              <button className="btn btn-primary login-submit" type="submit" disabled={loading}>{loading ? (zh ? '正在登录…' : 'Signing in…') : (zh ? '登录工作区' : 'Sign in')}<Icon name="arrow" size={16}/></button>
            </form>
          </section>
          <p className="login-bottom">{zh ? '使用 Supabase Auth 管理的工作区账户登录。' : 'Sign in with your Supabase Auth workspace account.'}</p>
        </div>
      </main>
    </div>
  );
}
