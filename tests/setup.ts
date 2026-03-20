/**
 * Vitest Test Setup
 * Global test configuration and mocks
 */
import { vi } from 'vitest';
import '@testing-library/jest-dom';
import { persist, createJSONStorage } from 'zustand/middleware';

// Mock zustand persist
const mockStorage = {
  getItem: vi.fn(() => null),
  setItem: vi.fn(() => undefined),
  removeItem: vi.fn(() => undefined),
};

// Mock localStorage
vi.stubGlobal('localStorage', mockStorage);
vi.stubGlobal('sessionStorage', {
  getItem: vi.fn(() => null),
  setItem: vi.fn(() => undefined),
  removeItem: vi.fn(() => undefined),
});

// Mock window.electron API
const mockElectron = {
  ipcRenderer: {
    invoke: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    off: vi.fn(),
  },
  openExternal: vi.fn(),
  platform: 'darwin',
  isDev: true,
};

Object.defineProperty(window, 'electron', {
  value: mockElectron,
  writable: true,
});

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Reset mocks after each test
afterEach(() => {
  vi.clearAllMocks();
});
