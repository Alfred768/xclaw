type ElectronIpcRenderer = {
  invoke: (channel: string, ...args: unknown[]) => Promise<unknown>;
};

type ElectronBridge = {
  ipcRenderer: ElectronIpcRenderer;
};

declare global {
  // Test-only escape hatch for jsdom, where window.electron may be unavailable or non-configurable.
  var __SKILLS_TEST_ELECTRON_BRIDGE__: ElectronBridge | undefined;
}

export function getSkillsElectronBridge(): ElectronBridge {
  const bridge = globalThis.__SKILLS_TEST_ELECTRON_BRIDGE__
    ?? (window as Window & { electron?: ElectronBridge }).electron;
  if (!bridge) {
    throw new Error('Electron bridge is unavailable');
  }

  return bridge;
}
