import React, { useState } from 'react';
import { api } from '../../api';
import { Card, Alert, Button } from '../../ui';
import type { User } from '../../lib/types';
import { formatApiError } from '../../lib/errors';

function AuthPage({ onAuthed }: { onAuthed: (u: User) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'register') {
        await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
      }
      const res: any = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      onAuthed(res.data.user);
    } catch (err: any) {
      setError(formatApiError(err, 'Erro ao autenticar.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <Card className="auth-card">
        <h2 className="auth-heading">
          {mode === 'login' ? 'Entrar' : 'Criar conta'}
        </h2>

        <div aria-live="polite" aria-atomic="true">
          {error && (
            <Alert variant="error" onDismiss={() => setError('')}>
              <span id="auth-error">{error}</span>
            </Alert>
          )}
        </div>

        <form onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@escritorio.com"
              disabled={loading}
              aria-describedby={error ? 'auth-error' : undefined}
            />
          </div>

          <div className="field">
            <label htmlFor="auth-password">Senha</label>
            <input
              id="auth-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="mínimo 8 caracteres"
              disabled={loading}
              aria-describedby={error ? 'auth-error' : undefined}
            />
          </div>

          <Button
            variant="primary"
            type="submit"
            disabled={loading}
            className="auth-submit"
          >
            {loading
              ? 'Processando…'
              : mode === 'login'
                ? 'Entrar'
                : 'Criar e entrar'}
          </Button>
        </form>

        <div className="auth-toggle">
          <button
            type="button"
            className="link"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Não tenho conta' : 'Já tenho conta'}
          </button>
        </div>
      </Card>
    </div>
  );
}

export default AuthPage;
