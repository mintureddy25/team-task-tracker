import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { store } from './app/store';
import './index.css';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AppLayout from './components/AppLayout';
import RequireAuth from './components/RequireAuth';
import BoardPage from './pages/BoardPage';
import ProjectsPage from './pages/ProjectsPage';
import UsersPage from './pages/UsersPage';
import AnalyticsPage from './pages/AnalyticsPage';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1916',
              color: '#f4f1e9',
              border: '1px solid #3d3a33',
              borderRadius: '4px',
              fontSize: '13px',
              fontFamily: '"Hanken Grotesk", system-ui, sans-serif',
              boxShadow: '4px 4px 0 0 rgba(26, 25, 22, 0.15)',
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Navigate to="/app/board" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Navigate to="board" replace />} />
            <Route path="board" element={<BoardPage />} />
            <Route path="projects" element={<ProjectsPage />} />
            <Route
              path="users"
              element={
                <RequireAuth roles={['ADMIN']}>
                  <UsersPage />
                </RequireAuth>
              }
            />
            <Route
              path="analytics"
              element={
                <RequireAuth roles={['ADMIN', 'MANAGER']}>
                  <AnalyticsPage />
                </RequireAuth>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);
