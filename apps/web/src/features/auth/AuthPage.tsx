import React, { useState } from 'react';
import { api } from '../../api';
import type { User } from '../../lib/types';
import { formatApiError } from '../../lib/errors';

function AuthPage({ onAuthed }: { onAuthed: (u: User) => void }) {
  const [mode, setMode] = useState<'login'|'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<string>('');

  async function submit() {
    setMsg('');
    try {
      if (mode === 'register') {
        await api('/auth/register', { method: 'POST', body: JSON.stringify({ email, password }) });
      }
      const res: any = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      onAuthed(res.data.user);
    } catch (e: any) {
      setMsg(formatApiError(e, 'Erro ao autenticar.'));
    }
  }

  return (
    <div className="card">
      <h2>{mode === 'login' ? 'Entrar' : 'Criar conta'}</h2>
      <div className="field">
        <label>Email</label>
        <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="voce@escritorio.com" />
      </div>
      <div className="field">
        <label>Senha</label>
        <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} placeholder="mínimo 8 caracteres" />
      </div>
      {msg && <div className="error">{msg}</div>}
      <button className="btn primary" onClick={submit}>{mode === 'login' ? 'Entrar' : 'Criar e entrar'}</button>
      <div style={{marginTop:10}}>
        {mode === 'login'
          ? <button className="link" onClick={()=>setMode('register')}>Não tenho conta</button>
          : <button className="link" onClick={()=>setMode('login')}>Já tenho conta</button>
        }
      </div>
    </div>
  );
}

export default AuthPage;
