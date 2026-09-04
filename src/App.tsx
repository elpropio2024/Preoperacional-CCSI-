import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PlanillaMovil from './components/PlanillaMovil';
import Login from './components/Login';
import SidebarAdmin from './components/SidebarAdmin';
import DashboardJefe from './components/DashboardJefe';
import DashboardRegulador from './components/DashboardRegulador';
import DashboardMetricas from './components/DashboardMetricas';
import LayoutMantenimiento from './components/LayoutMantenimiento';
import GestionMantenimiento from './components/GestionMantenimiento';
import ReporteMensualKilometraje from './components/ReporteMensualKilometraje';
import ControlDocumentacion from './components/ControlDocumentacion';
import ReportesKilometraje from './components/ReportesKilometraje';
import { supabase } from './lib/apiClients';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import IdleTimer from './components/IdleTimer';

function AppContent() {
  const [session, setSession] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const { theme } = useTheme();

  // Auto-detect cached session on mount and validate native tokens
  useEffect(() => {
    // Catch and handle unhandled promise rejections (like Supabase Auth token failures)
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      if (reason) {
        const errorMsg = String(reason.message || reason).toLowerCase();
        if (
          errorMsg.includes('refresh_token') ||
          errorMsg.includes('refresh token') ||
          errorMsg.includes('not found')
        ) {
          console.warn('[Session] Suppressed unhandled refresh token rejection, clearing local tokens...');
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('sb-') || key.includes('-auth-token'))) {
              localStorage.removeItem(key);
              i--;
            }
          }
          event.preventDefault();
        }
      }
    };

    // Catch and handle standard error events
    const handleError = (event: ErrorEvent) => {
      const errorMsg = String(event.message || '').toLowerCase();
      if (
        errorMsg.includes('refresh_token') ||
        errorMsg.includes('refresh token') ||
        errorMsg.includes('not found')
      ) {
        console.warn('[Session] Suppressed refresh token error, clearing local tokens...');
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('-auth-token'))) {
            localStorage.removeItem(key);
            i--;
          }
        }
        event.preventDefault();
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleError);

    const initSession = async () => {
      // 1. Recover custom non-native session first
      const saved = localStorage.getItem('unified_transport_session');
      if (saved) {
        try {
          setSession(JSON.parse(saved));
        } catch (err) {
          console.warn('Stale session found, discarding:', err);
          localStorage.removeItem('unified_transport_session');
        }
      }

      // 2. Validate native Supabase session and handle "Invalid Refresh Token" errors
      try {
        const { data: { session: sbSession }, error: sbError } = await supabase.auth.getSession();
        
        if (sbError) {
          console.error('Supabase native session recovery error:', sbError);
          const errorMsg = sbError.message?.toLowerCase() || '';
          if (
            errorMsg.includes('refresh_token') ||
            errorMsg.includes('refresh token') ||
            errorMsg.includes('not found') ||
            sbError.status === 400 ||
            sbError.status === 401
          ) {
            console.warn('Invalid refresh token detected. Cleaning up local token cache...');
            
            // Purge manually (do not call supabase.auth.signOut() as that attempts a network request with the invalid token and fails)
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && (key.startsWith('sb-') || key.includes('-auth-token'))) {
                localStorage.removeItem(key);
                i--;
              }
            }

            // If the saved session belonged to an administrator, log out of it
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (parsed.type === 'admin') {
                  localStorage.removeItem('unified_transport_session');
                  setSession(null);
                }
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        console.error('Unhandled app-level native session check error:', err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    // Listen to token refresh failures dynamically
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (event === 'SIGNED_OUT') {
        // Purge stored token memory
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('-auth-token'))) {
            localStorage.removeItem(key);
            i--;
          }
        }
      }
    });

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleError);
      subscription?.unsubscribe();
    };
  }, []);

  const handleLoginSuccess = (newSession: any) => {
    setSession(newSession);
    localStorage.setItem('unified_transport_session', JSON.stringify(newSession));
  };

  const handleLogout = () => {
    setSession(null);
    localStorage.removeItem('unified_transport_session');
  };

  const isLight = theme === 'light';

  if (loading) {
    return (
      <div className={`w-full min-h-screen flex items-center justify-center ${isLight ? 'bg-slate-50' : 'bg-zinc-950'}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`w-full min-h-screen transition-colors duration-300 flex flex-col justify-start ${
      isLight ? 'bg-slate-50 text-slate-900' : 'bg-zinc-950 text-zinc-50'
    }`}>
      <IdleTimer 
        onLogout={handleLogout} 
        isActive={!!session} 
        userRole={session?.type === 'admin' ? 'admin' : (session?.user?.rol || session?.type || 'operador')}
      >
        <Routes>
          {/* Main route handles redirects depending on role */}
          <Route 
            path="/" 
            element={
              !session ? (
                <Navigate to="/login" replace />
              ) : (session.type === 'mantenimiento' || session.user?.rol === 'mantenimiento') ? (
                <Navigate to="/mantenimiento" replace />
              ) : (session.type === 'jefe_patio' || session.user?.rol === 'jefe_patio') ? (
                <Navigate to="/dashboard-jefe" replace />
              ) : (session.type === 'regulador' || session.user?.rol === 'regulador') ? (
                <Navigate to="/dashboard-regulador" replace />
              ) : (session.type === 'operator' || session.user?.rol === 'operador') ? (
                <Navigate to="/planilla" replace />
              ) : session.type === 'admin' ? (
                <Navigate to="/admin" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />

          {/* /login */}
          <Route 
            path="/login" 
            element={
              session ? (
                <Navigate to="/" replace />
              ) : (
                <Login onLoginSuccess={handleLoginSuccess} />
              )
            } 
          />

          {/* /planilla */}
          <Route 
            path="/planilla" 
            element={
              !session ? (
                <Navigate to="/login" replace />
              ) : (session.type === 'operator' || session.user?.rol === 'operador') ? (
                <PlanillaMovil 
                  supabaseClient={supabase} 
                  operatorSession={session.user}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* /dashboard-jefe */}
          <Route 
            path="/dashboard-jefe" 
            element={
              !session ? (
                <Navigate to="/login" replace />
              ) : (session.type === 'jefe_patio' || session.user?.rol === 'jefe_patio') ? (
                <DashboardJefe 
                  adminSession={session}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* /dashboard-regulador */}
          <Route 
            path="/dashboard-regulador" 
            element={
              !session ? (
                <Navigate to="/login" replace />
              ) : (session.type === 'regulador' || session.user?.rol === 'regulador') ? (
                <DashboardRegulador 
                  adminSession={session}
                  onLogout={handleLogout}
                />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* /mantenimiento */}
          <Route 
            path="/mantenimiento" 
            element={
              !session ? (
                <Navigate to="/login" replace />
              ) : (session.type === 'mantenimiento' || session.type === 'admin' || session.user?.rol === 'mantenimiento' || session.user?.rol === 'administrador') ? (
                <LayoutMantenimiento 
                  onLogout={handleLogout}
                  adminSession={session}
                >
                  <GestionMantenimiento 
                    onLogout={handleLogout}
                    adminSession={session}
                  />
                </LayoutMantenimiento>
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* /mantenimiento/documentacion */}
          <Route 
            path="/mantenimiento/documentacion" 
            element={
              !session ? (
                <Navigate to="/login" replace />
              ) : (session.type === 'mantenimiento' || session.type === 'admin' || session.user?.rol === 'mantenimiento' || session.user?.rol === 'administrador') ? (
                <LayoutMantenimiento 
                  onLogout={handleLogout}
                  adminSession={session}
                >
                  <ControlDocumentacion />
                </LayoutMantenimiento>
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* /mantenimiento/reportes-kilometraje */}
          <Route 
            path="/mantenimiento/reportes-kilometraje" 
            element={
              !session ? (
                <Navigate to="/login" replace />
              ) : (session.type === 'mantenimiento' || session.type === 'admin' || session.user?.rol === 'mantenimiento' || session.user?.rol === 'administrador') ? (
                <LayoutMantenimiento 
                  onLogout={handleLogout}
                  adminSession={session}
                >
                  <ReportesKilometraje />
                </LayoutMantenimiento>
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* /mantenimiento/reporte-mensual */}
          <Route 
            path="/mantenimiento/reporte-mensual" 
            element={
              !session ? (
                <Navigate to="/login" replace />
              ) : (session.type === 'mantenimiento' || session.type === 'admin' || session.user?.rol === 'mantenimiento' || session.user?.rol === 'administrador') ? (
                <LayoutMantenimiento 
                  onLogout={handleLogout}
                  adminSession={session}
                >
                  <ReporteMensualKilometraje />
                </LayoutMantenimiento>
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* /admin */}
          <Route 
            path="/admin" 
            element={
              !session ? (
                <Navigate to="/login" replace />
              ) : session.type === 'admin' ? (
                <SidebarAdmin 
                  adminSession={session}
                  onLogout={handleLogout}
                  initialTab="inicio"
                />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />

          {/* Public embeddable Dispatch Metrics */}
          <Route 
            path="/public-metricas" 
            element={
              <div className="w-full min-h-screen p-4 md:p-6 bg-slate-50 dark:bg-zinc-950">
                <DashboardMetricas />
              </div>
            } 
          />

          {/* Catch all redirects to root */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </IdleTimer>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}
