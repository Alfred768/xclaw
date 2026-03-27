import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let chatState: Record<string, unknown>;
let gatewayState: Record<string, unknown>;

vi.mock('@/stores/chat', () => ({
  useChatStore: (selector: (state: Record<string, unknown>) => unknown) => selector(chatState),
}));

vi.mock('@/stores/gateway', () => ({
  useGatewayStore: (selector: (state: Record<string, unknown>) => unknown) => selector(gatewayState),
}));

vi.mock('@/components/ui/tooltip', () => ({
  TooltipProvider: ({ children }: { children: ReactNode }) => children,
  Tooltip: ({ children }: { children: ReactNode }) => children,
  TooltipTrigger: ({ children }: { children: ReactNode }) => children,
  TooltipContent: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { Chat } from '@/pages/Chat';

function createChatState(overrides: Record<string, unknown> = {}) {
  return {
    messages: [],
    loading: false,
    sending: false,
    error: null,
    showThinking: false,
    streamingMessage: null,
    streamingTools: [],
    sessions: [
      { key: 'agent:main:main' },
      { key: 'agent:main:work' },
    ],
    currentSessionKey: 'agent:main:main',
    loadHistory: vi.fn().mockResolvedValue(undefined),
    loadSessions: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn(),
    abortRun: vi.fn(),
    clearError: vi.fn(),
    switchSession: vi.fn(),
    newSession: vi.fn(),
    deleteSession: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    toggleThinking: vi.fn(),
    ...overrides,
  };
}

describe('chat layout contract', () => {
  beforeEach(() => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      value: vi.fn(),
      writable: true,
      configurable: true,
    });

    chatState = createChatState({
      messages: [{ role: 'assistant', content: 'hello from assistant', id: 'm-1', timestamp: 1711000000 }],
    });
    gatewayState = {
      status: { state: 'running' },
    };

    Object.defineProperty(window, 'innerWidth', { value: 1280, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: 800, configurable: true });
  });

  it('keeps chat action entry points reachable and message stream as visual axis', async () => {
    render(<Chat />);

    await waitFor(() => {
      expect(chatState.loadSessions).toHaveBeenCalledTimes(1);
      expect(chatState.loadHistory).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('chat-layout-root')).toBeInTheDocument();
    expect(screen.getByTestId('chat-toolbar')).toBeInTheDocument();
    expect(screen.getByTestId('chat-message-stream')).toHaveClass('flex-1');

    const inputDock = screen.getByTestId('chat-input-dock');
    expect(inputDock).toHaveClass('sticky', 'bottom-0');

    const sessionSelect = screen.getByTestId('chat-session-select');
    fireEvent.change(sessionSelect, { target: { value: 'agent:main:work' } });
    expect(chatState.switchSession).toHaveBeenCalledWith('agent:main:work');

    fireEvent.click(screen.getByTestId('chat-refresh-history'));
    expect(chatState.refresh).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('chat-new-session'));
    expect(chatState.newSession).toHaveBeenCalledTimes(1);

    expect(screen.getByTestId('chat-send-button')).toBeInTheDocument();
  });

  it('renders actionable empty/loading/error/success states', async () => {
    chatState = createChatState({ loading: true, messages: [] });
    const { rerender } = render(<Chat />);

    expect(screen.getByTestId('chat-state-loading')).toBeInTheDocument();

    chatState = createChatState({ loading: false, messages: [] });
    rerender(<Chat />);
    expect(screen.getByTestId('chat-state-empty')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('chat-starter-intent-0'));
    expect(chatState.sendMessage).toHaveBeenCalledTimes(1);

    chatState = createChatState({
      loading: false,
      messages: [{ role: 'assistant', content: 'done', id: 'm-2', timestamp: 1711000001 }],
      error: 'failed once',
    });
    rerender(<Chat />);

    expect(screen.getByTestId('chat-state-success')).toBeInTheDocument();
    expect(screen.getByTestId('chat-error-panel')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('chat-error-dismiss'));
    expect(chatState.clearError).toHaveBeenCalledTimes(1);

    chatState = createChatState({
      sending: true,
      messages: [{ role: 'assistant', content: 'streaming', id: 'm-3', timestamp: 1711000002 }],
    });
    rerender(<Chat />);

    fireEvent.click(screen.getByTestId('chat-stop-button'));
    expect(chatState.abortRun).toHaveBeenCalledTimes(1);
  });
});
