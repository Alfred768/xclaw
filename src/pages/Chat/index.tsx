/**
 * Chat Page
 * Native React implementation communicating with OpenClaw Gateway
 * via gateway:rpc IPC. Session selector, thinking toggle, and refresh
 * are in the toolbar; messages render with markdown + streaming.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { WarningCircle, Sparkle } from '@phosphor-icons/react';
import { useChatStore, type RawMessage } from '@/stores/chat';
import { useGatewayStore } from '@/stores/gateway';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { ChatToolbar } from './ChatToolbar';
import { extractImages, extractText, extractThinking, extractToolUse } from './message-utils';
import { useTranslation } from 'react-i18next';
import { ChatStatePanel } from './components/ChatStatePanel';
import { StarterIntents, buildDefaultStarterIntents } from './components/StarterIntents';

export function Chat() {
  const { t } = useTranslation('chat');
  const gatewayStatus = useGatewayStore((s) => s.status);
  const isGatewayRunning = gatewayStatus.state === 'running';

  const messages = useChatStore((s) => s.messages);
  const loading = useChatStore((s) => s.loading);
  const sending = useChatStore((s) => s.sending);
  const error = useChatStore((s) => s.error);
  const showThinking = useChatStore((s) => s.showThinking);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const streamingTools = useChatStore((s) => s.streamingTools);
  const loadHistory = useChatStore((s) => s.loadHistory);
  const loadSessions = useChatStore((s) => s.loadSessions);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const abortRun = useChatStore((s) => s.abortRun);
  const clearError = useChatStore((s) => s.clearError);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streamingTimestamp, setStreamingTimestamp] = useState<number>(0);

  const starterIntents = useMemo(() => buildDefaultStarterIntents(t), [t]);

  // Load data when gateway is running
  useEffect(() => {
    if (!isGatewayRunning) return;
    let cancelled = false;
    (async () => {
      await loadSessions();
      if (cancelled) return;
      await loadHistory();
    })();
    return () => {
      cancelled = true;
    };
  }, [isGatewayRunning, loadHistory, loadSessions]);

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, sending]);

  // Update timestamp when sending starts
  useEffect(() => {
    if (sending && streamingTimestamp === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setStreamingTimestamp(Date.now() / 1000);
    } else if (!sending && streamingTimestamp !== 0) {
      setStreamingTimestamp(0);
    }
  }, [sending, streamingTimestamp]);

  const handleStarterIntent = (prompt: string) => {
    if (!prompt.trim() || sending || !isGatewayRunning) return;
    void sendMessage(prompt.trim());
  };

  // Gateway not running
  if (!isGatewayRunning) {
    return (
      <div className="flex h-[calc(100vh-8rem)] flex-col items-center justify-center p-8 text-center">
        <WarningCircle className="mb-4 h-12 w-12 text-yellow-500" weight="fill" />
        <h2 className="mb-2 text-xl font-semibold">{t('gatewayNotRunning')}</h2>
        <p className="max-w-md text-muted-foreground">{t('gatewayRequired')}</p>
      </div>
    );
  }

  // Extract streaming text for display
  const streamMsg = streamingMessage && typeof streamingMessage === 'object'
    ? streamingMessage as unknown as { role?: string; content?: unknown; timestamp?: number }
    : null;
  const streamText = streamMsg ? extractText(streamMsg) : (typeof streamingMessage === 'string' ? streamingMessage : '');
  const hasStreamText = streamText.trim().length > 0;
  const streamThinking = streamMsg ? extractThinking(streamMsg) : null;
  const hasStreamThinking = showThinking && !!streamThinking && streamThinking.trim().length > 0;
  const streamTools = streamMsg ? extractToolUse(streamMsg) : [];
  const hasStreamTools = showThinking && streamTools.length > 0;
  const streamImages = streamMsg ? extractImages(streamMsg) : [];
  const hasStreamImages = streamImages.length > 0;
  const hasStreamToolStatus = showThinking && streamingTools.length > 0;
  const shouldRenderStreaming = sending && (hasStreamText || hasStreamThinking || hasStreamTools || hasStreamImages || hasStreamToolStatus);

  return (
    <div className="flex h-[calc(100vh-2.5rem)] min-h-0 flex-col" data-testid="chat-layout-root">
      <div className="shrink-0 border-b border-border/60 bg-background/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-end px-4 py-2">
          <ChatToolbar />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4" data-testid="chat-message-stream">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
          {loading ? (
            <ChatStatePanel state="loading" description={t('toolbar.refresh')} />
          ) : messages.length === 0 && !sending ? (
            <ChatStatePanel
              state="empty"
              title={t('welcome.title')}
              description={t('welcome.subtitle')}
            >
              <StarterIntents intents={starterIntents} onSelect={handleStarterIntent} />
            </ChatStatePanel>
          ) : (
            <>
              <ChatStatePanel
                state="success"
                title={t('welcome.title')}
                description={t('welcome.subtitle')}
              />

              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id || `msg-${idx}`}
                  message={msg}
                  showThinking={showThinking}
                />
              ))}

              {/* Streaming message */}
              {shouldRenderStreaming && (
                <ChatMessage
                  message={(streamMsg
                    ? {
                        ...(streamMsg as Record<string, unknown>),
                        role: (typeof streamMsg.role === 'string' ? streamMsg.role : 'assistant') as RawMessage['role'],
                        content: streamMsg.content ?? streamText,
                        timestamp: streamMsg.timestamp ?? streamingTimestamp,
                      }
                    : {
                        role: 'assistant',
                        content: streamText,
                        timestamp: streamingTimestamp,
                      }) as RawMessage}
                  showThinking={showThinking}
                  isStreaming
                  streamingTools={streamingTools}
                />
              )}

              {/* Typing indicator when sending but no stream yet */}
              {sending && !hasStreamText && !hasStreamThinking && !hasStreamTools && !hasStreamImages && !hasStreamToolStatus && (
                <TypingIndicator />
              )}
            </>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {error && (
        <div className="border-t border-destructive/20 bg-destructive/10 px-4 py-2" data-testid="chat-error-panel">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
            <p className="flex items-center gap-2 text-sm text-destructive">
              <WarningCircle className="h-4 w-4" weight="fill" />
              {error}
            </p>
            <button
              onClick={clearError}
              className="text-xs text-destructive/70 underline hover:text-destructive"
              data-testid="chat-error-dismiss"
            >
              {t('common:actions.dismiss')}
            </button>
          </div>
        </div>
      )}

      <div
        className="sticky bottom-0 z-10 shrink-0 border-t border-border/60 bg-background/95 backdrop-blur"
        data-testid="chat-input-dock"
      >
        <ChatInput
          onSend={sendMessage}
          onStop={abortRun}
          disabled={!isGatewayRunning}
          sending={sending}
        />
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
        <Sparkle className="h-4 w-4" weight="fill" />
      </div>
      <div className="rounded-2xl bg-muted px-4 py-3">
        <div className="flex gap-1">
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '0ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '150ms' }} />
          <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground/50" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

export default Chat;
