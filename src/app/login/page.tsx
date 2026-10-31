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
  const { setAccessToken } = useWorkspace();
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
        ? 'That access token was not accepted.'
        : apiError?.message ?? 'Could not verify access. Check the connection and try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="reloop-ui">
      <main className="brand-login-page">
        <div className="brand-login-wrap">
          <Link href="/" className="login-back">Back to ReLoop</Link>
          <section className="card brand-login-card">
            <Brand className="login-logo"/>
            <h1>Welcome back.</h1>
            <p className="login-description">Use your workspace access token to load saved cases.</p>
            <form onSubmit={submit}>
              <div className="field"><label htmlFor="access-token">Demo access token</label><div className="login-password"><input id="access-token" className="input" placeholder="Paste workspace token" autoComplete="off" spellCheck={false} type={show ? 'text' : 'password'} value={token} onChange={(event) => setToken(event.target.value)} required/><button className="password-toggle" type="button" aria-label={show ? 'Hide access token' : 'Show access token'} onClick={() => setShow((value) => !value)}>{show ? 'Hide' : 'Show'}</button></div></div>
              <div className="login-options"><span>Protected demo workspace</span><span>Memory only</span></div>
              {error && <p className="login-error" role="alert">{error}</p>}
              <button className="btn btn-primary login-submit" type="submit" disabled={loading}>{loading ? 'Checking access…' : 'Enter workspace'}<Icon name="arrow" size={16}/></button>
            </form>
            <div className="login-divider">Workspace access</div>
            <div className="login-demo-note"><Icon name="shield" size={17}/><p><strong>Token handling.</strong> The token is kept in page memory only and cleared when the page reloads or you sign out.</p></div>
          </section>
          <p className="login-bottom">No account or password service is configured on this branch.</p>
        </div>
      </main>
    </div>
  );
}
