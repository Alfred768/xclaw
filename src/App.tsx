/**
 * Root Application Component
 * Handles routing and global providers
 */
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Component, useEffect, Suspense, lazy } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import i18n from './i18n';
import { MainLayout } from './components/layout/MainLayout';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { useSettingsStore } from './stores/settings';
import { useGatewayStore } from './stores/gateway';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';
import { supabase } from '@/lib/supabase';
import { LoadingSpinner } from './components/common/LoadingSpinner';

// Lazy load pages for code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Chat = lazy(() => import('./pages/Chat'));
const Channels = lazy(() => import('./pages/Channels'));
const Skills = lazy(() => import('./pages/Skills'));
const Cron = lazy(() => import('./pages/Cron'));
const Settings = lazy(() => import('./pages/Settings'));
const Setup = lazy(() => import('./pages/Setup'));
const Todo = lazy(() => import('./pages/Todo'));
const Briefing = lazy(() => import('./pages/Briefing'));
const Usage = lazy(() => import('./pages/Usage'));
const Account = lazy(() => import('./pages/Account'));
const Subscription = lazy(() => import('./pages/Subscription'));

// Page loader component for Suspense fallback
function PageLoader() {
  return (
    <div className="flex h-screen items-center justify-center">
      <LoadingSpinner size="lg" />
    </div>
  );
}


/**
 * Error Boundary to catch and display React rendering errors
 */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('React Error Boundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px',
          color: '#f87171',
          background: '#0f172a',
          minHeight: '100vh',
          fontFamily: 'monospace'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>Something went wrong</h1>
          <pre style={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all',
            background: '#1e293b',
            padding: '16px',
            borderRadius: '8px',
            fontSize: '14px'
          }}>
            {this.state.error?.message}
            {'\n\n'}
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              marginTop: '16px',
              padding: '8px 16px',
              background: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useSettingsStore((state) => state.theme);
  const language = useSettingsStore((state) => state.language);
  const setupComplete = useSettingsStore((state) => state.setupComplete);
  const initGateway = useGatewayStore((state) => state.init);
  const setAuthUser = useAuthStore((state) => state.setUser);
  const setAccessToken = useAuthStore((state) => state.setAccessToken);
  const resetAccount = useAccountStore((state) => state.reset);

  // Sync i18n language with persisted settings on mount
  useEffect(() => {
    if (language && language !== i18n.language) {
      i18n.changeLanguage(language);
    }

    // Keep main-process settings in sync so IPC handlers using getSetting('language')
    // see the same language as renderer i18n.
    if (language && window.electron?.ipcRenderer?.invoke) {
      void window.electron.ipcRenderer.invoke('settings:set', 'language', language).catch(() => {
        // Ignore sync errors in renderer lifecycle.
      });
    }
  }, [language]);

  // Initialize Gateway connection on mount
  useEffect(() => {
    initGateway();
  }, [initGateway]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let isActive = true;

    const applySession = (session: Session | null) => {
      if (!isActive) {
        return;
      }

      if (!session?.user) {
        setAccessToken(null);
        setAuthUser(null);
        resetAccount();
        return;
      }

      const existingUser = useAuthStore.getState().user;
      const metadata = session.user.user_metadata ?? {};
      const displayName = typeof metadata.display_name === 'string'
        ? metadata.display_name
        : existingUser?.displayName;
      const avatarUrl = typeof metadata.avatar_url === 'string'
        ? metadata.avatar_url
        : existingUser?.avatarUrl;

      setAccessToken(session.access_token);
      setAuthUser({
        id: session.user.id,
        publicId: existingUser?.publicId,
        email: session.user.email ?? existingUser?.email,
        displayName,
        avatarUrl,
        subscriptionTier: existingUser?.subscriptionTier || 'free',
        isTrial: existingUser?.isTrial,
        trialEndsAt: existingUser?.trialEndsAt ?? null,
        subscriptionEndsAt: existingUser?.subscriptionEndsAt ?? null,
        alipayUserId: existingUser?.alipayUserId ?? null,
        wechatOpenid: existingUser?.wechatOpenid ?? null,
      });
    };

    void supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [resetAccount, setAccessToken, setAuthUser]);

  // Redirect to setup wizard if not complete
  useEffect(() => {
    if (!setupComplete && !location.pathname.startsWith('/setup')) {
      navigate('/setup');
    }
  }, [setupComplete, location.pathname, navigate]);

  // Listen for navigation events from main process
  useEffect(() => {
    // Skip in browser context (not running in Electron)
    if (!window.electron?.ipcRenderer) return;

    const handleNavigate = (...args: unknown[]) => {
      const path = args[0];
      if (typeof path === 'string') {
        navigate(path);
      }
    };

    const unsubscribe = window.electron.ipcRenderer.on('navigate', handleNavigate);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [navigate]);

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  return (
    <ErrorBoundary>
      <TooltipProvider delayDuration={300}>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Setup wizard (shown on first launch) */}
            <Route path="/setup/*" element={<Setup />} />

            {/* Main application routes */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Chat />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/todo" element={<Todo />} />
              <Route path="/briefing" element={<Briefing />} />
              <Route path="/usage" element={<Usage />} />
              <Route path="/subscription" element={<Subscription />} />
              <Route path="/channels" element={<Channels />} />
              <Route path="/skills" element={<Skills />} />
              <Route path="/cron" element={<Cron />} />
              <Route path="/account" element={<Account />} />
              <Route path="/settings/*" element={<Settings />} />
            </Route>
          </Routes>
        </Suspense>

        {/* Global toast notifications */}
        <Toaster
          position="bottom-right"
          richColors
          closeButton
        />
      </TooltipProvider>
    </ErrorBoundary>
  );
}

export default App;
