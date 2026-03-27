import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, within } from '@testing-library/react';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import {
  CANONICAL_NAV_PATHS,
  extractLinkPaths,
  renderWithRouter,
  resetShellSettings,
} from '../utils/redesignTestHelpers';

function findLinkByPath(pathname: string) {
  return screen
    .getAllByRole('link')
    .find((link) => new URL((link as HTMLAnchorElement).href).pathname === pathname);
}

describe('navigation order contract', () => {
  beforeEach(() => {
    resetShellSettings({ devModeUnlocked: false, sidebarCollapsed: false });
  });

  it('preserves canonical sidebar order and route mapping', () => {
    renderWithRouter(<Sidebar />);

    const links = screen.getAllByRole('link');
    expect(extractLinkPaths(links)).toEqual(CANONICAL_NAV_PATHS);

    for (const pathname of CANONICAL_NAV_PATHS) {
      const target = findLinkByPath(pathname);
      expect(target).toBeDefined();
      fireEvent.click(target!);
      expect(screen.getByTestId('location-path')).toHaveTextContent(pathname);
    }
  });

  it('preserves canonical mobile order and route mapping', () => {
    const onClose = vi.fn();

    renderWithRouter(<MobileNav isOpen onClose={onClose} />);

    const dialog = screen.getByRole('dialog', { name: 'Menu' });
    const links = within(dialog).getAllByRole('link');
    expect(extractLinkPaths(links)).toEqual(CANONICAL_NAV_PATHS);

    for (const pathname of CANONICAL_NAV_PATHS) {
      const target = links.find((link) => new URL((link as HTMLAnchorElement).href).pathname === pathname);
      expect(target).toBeDefined();
      fireEvent.click(target!);
      expect(screen.getByTestId('location-path')).toHaveTextContent(pathname);
    }
  });
});
