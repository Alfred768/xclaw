import { Fragment, createElement } from 'react';
import type { ReactElement } from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useSettingsStore } from '@/stores/settings';

export const CANONICAL_NAV_PATHS = [
  '/',
  '/cron',
  '/skills',
  '/channels',
  '/dashboard',
  '/todo',
  '/briefing',
  '/subscription',
  '/usage',
  '/account',
  '/settings',
] as const;

function LocationProbe() {
  const location = useLocation();

  return createElement('div', { 'data-testid': 'location-path' }, location.pathname);
}

export function renderWithRouter(ui: ReactElement, initialPath: string = '/') {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [initialPath] },
      createElement(
        Routes,
        null,
        createElement(Route, {
          path: '*',
          element: createElement(Fragment, null, ui, createElement(LocationProbe)),
        })
      )
    )
  );
}

export function extractLinkPaths(links: HTMLElement[]) {
  return links.map((link) => new URL((link as HTMLAnchorElement).href).pathname);
}

export function resetShellSettings(
  overrides: Partial<{
    sidebarCollapsed: boolean;
    devModeUnlocked: boolean;
    setupComplete: boolean;
  }> = {}
) {
  useSettingsStore.setState((state) => ({
    ...state,
    sidebarCollapsed: false,
    devModeUnlocked: false,
    setupComplete: true,
    ...overrides,
  }));
}

export function mockDevModeUnlocked(unlocked: boolean) {
  resetShellSettings({ devModeUnlocked: unlocked, sidebarCollapsed: false });
}
