'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Brand } from '@/components/reloop-ui/Brand';
import { Icon } from '@/components/reloop-ui/icons';
import { useWorkspace } from '@/components/reloop-ui/WorkspaceProviders';
import { ApiRequestError, listCases } from '@/lib/frontend/api-client';

export default function LoginPage() {
  const router = useRouter();
  const { setAccessToken, locale, toggleLocale } = useWorkspace();
  const zh = locale === 'zh-CN';
  const [showPassword, setShowPassword] = useState(false);
  const [show, setShow] = useState(false);
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      await listCases(token.trim());
      setAccessToken(token.trim());
      router.replace('/dashboard');
    } catch (reason) {
      const apiError = reason instanceof ApiRequestError ? reason : null;
      setError(apiError?.code === 'UNAUTHORIZED'
        ? (zh ? '访问令牌未被接受，请检查后重试。' : 'That access token was not accepted.')
        : apiError?.message ?? (zh ? '无法验证访问权限，请检查连接后重试。' : 'Could not verify access. Check the connection and try again.'));
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
            <form className="credential-form" onSubmit={(event) => event.preventDefault()} aria-describedby="credential-unavailable">
              <div className="field"><label htmlFor="login-email">{zh ? '邮箱地址' : 'Email address'}</label><input className="input" id="login-email" name="email" type="email" autoComplete="username" spellCheck={false} placeholder="merchant@example.com…" required maxLength={254}/></div>
              <div className="field"><label htmlFor="login-password">{zh ? '密码' : 'Password'}</label><div className="login-password"><input className="input" id="login-password" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" required maxLength={256}/><button className="password-toggle" type="button" aria-label={showPassword ? (zh ? '隐藏密码' : 'Hide password') : (zh ? '显示密码' : 'Show password')} aria-pressed={showPassword} onClick={() => setShowPassword((v) => !v)}>{showPassword ? (zh ? '隐藏' : 'Hide') : (zh ? '显示' : 'Show')}</button></div></div>
              <p className="login-demo-note" id="credential-unavailable">{zh ? '邮箱与密码登录尚未接入。此表单不会发送或保存凭据；请使用下方演示令牌。' : 'Email/password sign-in is not connected. This form does not send or save credentials. Use demo access below.'}</p>
              <button type="button" className="btn btn-primary login-submit" disabled>{zh ? '邮箱登录（未接入）' : 'Sign in with email (unavailable)'}</button>
            </form>
            <div className="login-divider">{zh ? '演示令牌访问' : 'Demo token access'}</div>
            <form onSubmit={submit}>
              <div className="field"><label htmlFor="access-token">{zh ? '演示访问令牌' : 'Demo access token'}</label><div className="login-password"><input id="access-token" name="demoToken" className="input" placeholder={zh ? '粘贴工作区令牌…' : 'Paste workspace token…'} autoComplete="off" spellCheck={false} type={show ? 'text' : 'password'} value={token} onChange={(event) => setToken(event.target.value)} required/><button className="password-toggle" type="button" aria-label={show ? (zh ? '隐藏访问令牌' : 'Hide access token') : (zh ? '显示访问令牌' : 'Show access token')} onClick={() => setShow((value) => !value)}>{show ? (zh ? '隐藏' : 'Hide') : (zh ? '显示' : 'Show')}</button></div></div>
              <div className="login-options"><span>{zh ? '受保护的演示工作区' : 'Protected demo workspace'}</span><span>{zh ? '仅存于内存' : 'Memory only'}</span></div>
              {error && <p className="login-error" role="alert">{error}</p>}
              <button className="btn btn-primary login-submit" type="submit" disabled={loading}>{loading ? (zh ? '正在验证…' : 'Checking access…') : (zh ? '进入工作区' : 'Enter workspace')}<Icon name="arrow" size={16}/></button>
            </form>
            <div className="login-divider">{zh ? '访问安全' : 'Workspace access'}</div>
            <div className="login-demo-note"><Icon name="shield" size={17}/><p>{zh ? '令牌仅存于页面内存，刷新页面或退出后即清除。' : 'The token is kept in page memory only and cleared when the page reloads or you sign out.'}</p></div>
          </section>
          <p className="login-bottom">{zh ? '账户、注册与密码找回服务尚未接入。' : 'Account registration and password recovery are not connected.'}</p>
        </div>
      </main>
    </div>
  );
}
