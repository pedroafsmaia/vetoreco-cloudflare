import React, { useEffect, useState } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../api';
import type { User } from '../lib/types';
import { AppShell } from './AppShell';
import AuthPage from '../features/auth/AuthPage';
import ProjectsPage from '../features/projects/ProjectsPage';
import ProjectPage from '../features/project/ProjectPage';

export default function AppInner() {
  const [user, setUser] = useState<User | null>(null);
  const [projectName, setProjectName] = useState<string | undefined>(undefined);
  const nav = useNavigate();
  const location = useLocation();

  async function loadMe() {
    try {
      const res: any = await api('/auth/me');
      setUser(res.data.user);
    } catch {
      setUser(null);
    }
  }

  useEffect(() => {
    loadMe();
  }, []);

  useEffect(() => {
    if (!location.pathname.startsWith('/projects/')) {
      setProjectName(undefined);
    }
  }, [location.pathname]);

  async function logout() {
    await api('/auth/logout', { method: 'POST', body: '{}' });
    setUser(null);
    nav('/');
  }

  return (
    <AppShell user={user} onLogout={logout} projectName={projectName}>
      {!user ? (
        <AuthPage
          onAuthed={(u) => {
            setUser(u);
            nav('/');
          }}
        />
      ) : (
        <Routes>
          <Route path="/" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectPage onProjectLoaded={setProjectName} />} />
        </Routes>
      )}
    </AppShell>
  );
}
