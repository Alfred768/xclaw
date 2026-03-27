import type { ComponentType } from 'react';

type RouteModule = { default: ComponentType };
type RouteImporter = () => Promise<RouteModule>;

const ROUTE_IMPORTERS = {
  '/': () => import('../pages/Chat'),
  '/dashboard': () => import('../pages/Dashboard'),
  '/todo': () => import('../pages/Todo'),
  '/briefing': () => import('../pages/Briefing'),
  '/usage': () => import('../pages/Usage'),
  '/subscription': () => import('../pages/Subscription'),
  '/channels': () => import('../pages/Channels'),
  '/skills': () => import('../pages/Skills'),
  '/cron': () => import('../pages/Cron'),
  '/account': () => import('../pages/Account'),
  '/settings': () => import('../pages/Settings'),
  '/setup': () => import('../pages/Setup'),
} as const satisfies Record<string, RouteImporter>;

type RouteKey = keyof typeof ROUTE_IMPORTERS;

const preloadCache = new Map<RouteKey, Promise<RouteModule>>();
let warmupStarted = false;

const loadRouteModule = (key: RouteKey): Promise<RouteModule> => {
  const existing = preloadCache.get(key);
  if (existing) {
    return existing;
  }

  const loadPromise = ROUTE_IMPORTERS[key]();
  preloadCache.set(key, loadPromise);
  return loadPromise;
};

const normalizeRoutePath = (path: string): string => {
  const [pathname] = path.split(/[?#]/);
  if (!pathname) {
    return '/';
  }

  const normalized = pathname.startsWith('/') ? pathname : `/${pathname}`;
  if (normalized.startsWith('/settings')) {
    return '/settings';
  }
  if (normalized.startsWith('/setup')) {
    return '/setup';
  }
  return normalized;
};

const resolveRouteKey = (path: string): RouteKey | null => {
  const normalized = normalizeRoutePath(path);
  if (normalized in ROUTE_IMPORTERS) {
    return normalized as RouteKey;
  }
  return null;
};

export const preloadRouteByPath = (path: string) => {
  const routeKey = resolveRouteKey(path);
  if (!routeKey) {
    return;
  }

  void loadRouteModule(routeKey);
};

export const warmupRouteModules = () => {
  if (warmupStarted) {
    return;
  }
  warmupStarted = true;

  const routeKeys = Object.keys(ROUTE_IMPORTERS) as RouteKey[];

  const schedule = (fn: () => void) => {
    const idleWindow = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
    };

    if (typeof idleWindow.requestIdleCallback === 'function') {
      idleWindow.requestIdleCallback(fn, { timeout: 1200 });
      return;
    }

    window.setTimeout(fn, 120);
  };

  const preloadSequentially = (index: number) => {
    if (index >= routeKeys.length) {
      return;
    }

    const routeKey = routeKeys[index];
    void loadRouteModule(routeKey).finally(() => {
      schedule(() => preloadSequentially(index + 1));
    });
  };

  schedule(() => preloadSequentially(0));
};

export const loadChatPage = () => loadRouteModule('/');
export const loadDashboardPage = () => loadRouteModule('/dashboard');
export const loadTodoPage = () => loadRouteModule('/todo');
export const loadBriefingPage = () => loadRouteModule('/briefing');
export const loadUsagePage = () => loadRouteModule('/usage');
export const loadSubscriptionPage = () => loadRouteModule('/subscription');
export const loadChannelsPage = () => loadRouteModule('/channels');
export const loadSkillsPage = () => loadRouteModule('/skills');
export const loadCronPage = () => loadRouteModule('/cron');
export const loadAccountPage = () => loadRouteModule('/account');
export const loadSettingsPage = () => loadRouteModule('/settings');
export const loadSetupPage = () => loadRouteModule('/setup');
