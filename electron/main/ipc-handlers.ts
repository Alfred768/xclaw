/**
 * IPC Handlers
 * Registers all IPC handlers for main-renderer communication
 */
import { ipcMain, BrowserWindow, shell, dialog, app, nativeImage } from 'electron';
import { existsSync, copyFileSync, statSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, extname, basename } from 'node:path';
import crypto from 'node:crypto';
// Using native fetch from Node.js 18+
import { GatewayManager } from '../gateway/manager';
import { ClawHubService, ClawHubSearchParams, ClawHubInstallParams, ClawHubUninstallParams } from '../gateway/clawhub';
import {
  storeApiKey,
  getApiKey,
  deleteApiKey,
  hasApiKey,
  saveProvider,
  getProvider,
  deleteProvider,
  setDefaultProvider,
  getDefaultProvider,
  getAllProvidersWithKeyInfo,
  type ProviderConfig,
} from '../utils/secure-storage';
import { getOpenClawStatus, getOpenClawDir, getOpenClawConfigDir, getOpenClawSkillsDir, ensureDir } from '../utils/paths';
import { getOpenClawCliCommand, installOpenClawCliMac } from '../utils/openclaw-cli';
import { getSetting } from '../utils/store';
import {
  saveProviderKeyToOpenClaw,
  removeProviderKeyFromOpenClaw,
  setOpenClawDefaultModel,
  setOpenClawDefaultModelWithOverride,
} from '../utils/openclaw-auth';
import { logger } from '../utils/logger';
import {
  saveChannelConfig,
  getChannelConfig,
  getChannelFormValues,
  deleteChannelConfig,
  listConfiguredChannels,
  setChannelEnabled,
  validateChannelConfig,
  validateChannelCredentials,
} from '../utils/channel-config';
import { checkUvInstalled, installUv, setupManagedPython } from '../utils/uv-setup';
import { updateSkillConfig, getSkillConfig, getAllSkillConfigs } from '../utils/skill-config';
import { whatsAppLoginManager } from '../utils/whatsapp-login';
import { getProviderConfig } from '../utils/provider-registry';
import { loadUsageRecords, getUsageStats, clearUsageRecords, addUsageRecord } from '../utils/usage-storage';
import { getProviderDefaultModel } from '../utils/provider-registry';

/**
 * Register all IPC handlers
 */
export function registerIpcHandlers(
  gatewayManager: GatewayManager,
  clawHubService: ClawHubService,
  mainWindow: BrowserWindow
): void {
  // Gateway handlers
  registerGatewayHandlers(gatewayManager, mainWindow);

  // ClawHub handlers
  registerClawHubHandlers(clawHubService);

  // OpenClaw handlers
  registerOpenClawHandlers();

  // Provider handlers
  registerProviderHandlers();

  // Shell handlers
  registerShellHandlers();

  // Dialog handlers
  registerDialogHandlers();

  // App handlers
  registerAppHandlers();

  // UV handlers
  registerUvHandlers();

  // Log handlers (for UI to read gateway/app logs)
  registerLogHandlers();

  // Skill config handlers (direct file access, no Gateway RPC)
  registerSkillConfigHandlers();

  // Cron task handlers (proxy to Gateway RPC)
  registerCronHandlers(gatewayManager);

  // Window control handlers (for custom title bar on Windows/Linux)
  registerWindowHandlers(mainWindow);

  // WhatsApp handlers
  registerWhatsAppHandlers(mainWindow);

  // File staging handlers (upload/send separation)
  registerFileHandlers();

  // Todo handlers (local JSON storage for todo list)
  registerTodoHandlers(gatewayManager);

  // Briefing handlers (Daily AI Briefing)
  registerBriefingHandlers(gatewayManager);

  // Usage handlers
  registerUsageHandlers();

  // Session handlers (delete session by key)
  ipcMain.handle('session:delete', async (_, sessionKey: string) => {
    try {
      // Validate sessionKey format (alphanumeric, colon, underscore, hyphen only)
      if (!/^[a-zA-Z0-9:_.-]+$/.test(sessionKey)) {
        return { success: false, error: 'Invalid session key format' };
      }

      const sessionsDir = join(homedir(), '.openclaw', 'agents', 'main', 'sessions');
      const sessionsFile = join(sessionsDir, 'sessions.json');

      // Read sessions.json
      const sessionsData = JSON.parse(readFileSync(sessionsFile, 'utf-8'));

      // Validate sessionKey exists in data (prevent prototype pollution)
      if (!Object.prototype.hasOwnProperty.call(sessionsData, sessionKey)) {
        return { success: false, error: 'Session not found' };
      }

      // Find the session
      const session = sessionsData[sessionKey];
      if (!session) {
        return { success: false, error: 'Session not found' };
      }

      // Delete the .jsonl file (with path validation)
      if (session.sessionFile) {
        const sessionFilePath = session.sessionFile;
        // Validate path is within sessions directory (prevent path traversal)
        const resolvedPath = join(sessionsDir, sessionFilePath);
        if (!resolvedPath.startsWith(sessionsDir)) {
          logger.error('[Session] Invalid session file path:', sessionFilePath);
          return { success: false, error: 'Invalid session file path' };
        }
        if (existsSync(resolvedPath)) {
          unlinkSync(resolvedPath);
        }
      }

      // Remove from sessions.json (safe delete using Object.hasOwn)
      delete sessionsData[sessionKey];
      writeFileSync(sessionsFile, JSON.stringify(sessionsData, null, 2));

      return { success: true };
    } catch (error) {
      logger.error('Failed to delete session:', error);
      return { success: false, error: String(error) };
    }
  });
}

/**
 * Skill config IPC handlers
 * Direct read/write to ~/.openclaw/openclaw.json (bypasses Gateway RPC)
 */
function registerSkillConfigHandlers(): void {
  // Update skill config (apiKey and env)
  ipcMain.handle('skill:updateConfig', async (_, params: {
    skillKey: string;
    apiKey?: string;
    env?: Record<string, string>;
  }) => {
    return updateSkillConfig(params.skillKey, {
      apiKey: params.apiKey,
      env: params.env,
    });
  });

  // Get skill config
  ipcMain.handle('skill:getConfig', async (_, skillKey: string) => {
    return getSkillConfig(skillKey);
  });

  // Get all skill configs
  ipcMain.handle('skill:getAllConfigs', async () => {
    return getAllSkillConfigs();
  });
}

/**
 * Gateway CronJob type (as returned by cron.list RPC)
 */
interface GatewayCronJob {
  id: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAtMs: number;
  updatedAtMs: number;
  schedule: { kind: string; expr?: string; everyMs?: number; at?: string; tz?: string };
  payload: { kind: string; message?: string; text?: string };
  delivery?: { mode: string; channel?: string; to?: string };
  state: {
    nextRunAtMs?: number;
    lastRunAtMs?: number;
    lastStatus?: string;
    lastError?: string;
    lastDurationMs?: number;
  };
}

/**
 * Transform a Gateway CronJob to the frontend CronJob format
 */
function transformCronJob(job: GatewayCronJob) {
  // Extract message from payload
  const message = job.payload?.message || job.payload?.text || '';

  // Build target from delivery info
  const channelType = job.delivery?.channel || 'unknown';
  const target = {
    channelType,
    channelId: channelType,
    channelName: channelType,
  };

  // Build lastRun from state
  const lastRun = job.state?.lastRunAtMs
    ? {
      time: new Date(job.state.lastRunAtMs).toISOString(),
      success: job.state.lastStatus === 'ok',
      error: job.state.lastError,
      duration: job.state.lastDurationMs,
    }
    : undefined;

  // Build nextRun from state
  const nextRun = job.state?.nextRunAtMs
    ? new Date(job.state.nextRunAtMs).toISOString()
    : undefined;

  return {
    id: job.id,
    name: job.name,
    message,
    schedule: job.schedule, // Pass the object through; frontend parseCronSchedule handles it
    target,
    enabled: job.enabled,
    createdAt: new Date(job.createdAtMs).toISOString(),
    updatedAt: new Date(job.updatedAtMs).toISOString(),
    lastRun,
    nextRun,
  };
}

/**
 * Cron task IPC handlers
 * Proxies cron operations to the Gateway RPC service.
 * The frontend works with plain cron expression strings, but the Gateway
 * expects CronSchedule objects ({ kind: "cron", expr: "..." }).
 * These handlers bridge the two formats.
 */
function registerCronHandlers(gatewayManager: GatewayManager): void {
  // List all cron jobs — transforms Gateway CronJob format to frontend CronJob format
  ipcMain.handle('cron:list', async () => {
    try {
      const result = await gatewayManager.rpc('cron.list', { includeDisabled: true });
      const data = result as { jobs?: GatewayCronJob[] };
      const jobs = data?.jobs ?? [];
      // Transform Gateway format to frontend format
      return jobs.map(transformCronJob);
    } catch (error) {
      console.error('Failed to list cron jobs:', error);
      throw error;
    }
  });

  // Create a new cron job
  ipcMain.handle('cron:create', async (_, input: {
    name: string;
    message: string;
    schedule: string;
    target: { channelType: string; channelId: string; channelName: string };
    enabled?: boolean;
  }) => {
    try {
      // Transform frontend input to Gateway cron.add format
      // For Discord, the recipient must be prefixed with "channel:" or "user:"
      const recipientId = input.target.channelId;
      const deliveryTo = input.target.channelType === 'discord' && recipientId
        ? `channel:${recipientId}`
        : recipientId;

      const gatewayInput = {
        name: input.name,
        schedule: { kind: 'cron', expr: input.schedule },
        payload: { kind: 'agentTurn', message: input.message },
        enabled: input.enabled ?? true,
        wakeMode: 'next-heartbeat',
        sessionTarget: 'isolated',
        delivery: {
          mode: 'announce',
          channel: input.target.channelType,
          to: deliveryTo,
        },
      };
      const result = await gatewayManager.rpc('cron.add', gatewayInput);
      // Transform the returned job to frontend format
      if (result && typeof result === 'object') {
        return transformCronJob(result as GatewayCronJob);
      }
      return result;
    } catch (error) {
      console.error('Failed to create cron job:', error);
      throw error;
    }
  });

  // Update an existing cron job
  ipcMain.handle('cron:update', async (_, id: string, input: Record<string, unknown>) => {
    try {
      // Transform schedule string to CronSchedule object if present
      const patch = { ...input };
      if (typeof patch.schedule === 'string') {
        patch.schedule = { kind: 'cron', expr: patch.schedule };
      }
      // Transform message to payload format if present
      if (typeof patch.message === 'string') {
        patch.payload = { kind: 'agentTurn', message: patch.message };
        delete patch.message;
      }
      const result = await gatewayManager.rpc('cron.update', { id, patch });
      return result;
    } catch (error) {
      console.error('Failed to update cron job:', error);
      throw error;
    }
  });

  // Delete a cron job
  ipcMain.handle('cron:delete', async (_, id: string) => {
    try {
      const result = await gatewayManager.rpc('cron.remove', { id });
      return result;
    } catch (error) {
      console.error('Failed to delete cron job:', error);
      throw error;
    }
  });

  // Toggle a cron job enabled/disabled
  ipcMain.handle('cron:toggle', async (_, id: string, enabled: boolean) => {
    try {
      const result = await gatewayManager.rpc('cron.update', { id, patch: { enabled } });
      return result;
    } catch (error) {
      console.error('Failed to toggle cron job:', error);
      throw error;
    }
  });

  // Trigger a cron job manually
  ipcMain.handle('cron:trigger', async (_, id: string) => {
    try {
      const result = await gatewayManager.rpc('cron.run', { id, mode: 'force' });
      return result;
    } catch (error) {
      console.error('Failed to trigger cron job:', error);
      throw error;
    }
  });
}

/**
 * UV-related IPC handlers
 */
function registerUvHandlers(): void {
  // Check if uv is installed
  ipcMain.handle('uv:check', async () => {
    return await checkUvInstalled();
  });

  // Install uv and setup managed Python
  ipcMain.handle('uv:install-all', async () => {
    try {
      const isInstalled = await checkUvInstalled();
      if (!isInstalled) {
        await installUv();
      }
      // Always run python setup to ensure it exists in uv's cache
      await setupManagedPython();
      return { success: true };
    } catch (error) {
      console.error('Failed to setup uv/python:', error);
      return { success: false, error: String(error) };
    }
  });
}

/**
 * Log-related IPC handlers
 * Allows the renderer to read application logs for diagnostics
 */
function registerLogHandlers(): void {
  // Get recent logs from memory ring buffer
  ipcMain.handle('log:getRecent', async (_, count?: number) => {
    return logger.getRecentLogs(count);
  });

  // Read log file content (last N lines)
  ipcMain.handle('log:readFile', async (_, tailLines?: number) => {
    return logger.readLogFile(tailLines);
  });

  // Get log file path (so user can open in file explorer)
  ipcMain.handle('log:getFilePath', async () => {
    return logger.getLogFilePath();
  });

  // Get log directory path
  ipcMain.handle('log:getDir', async () => {
    return logger.getLogDir();
  });

  // List all log files
  ipcMain.handle('log:listFiles', async () => {
    return logger.listLogFiles();
  });
}

/**
 * Gateway-related IPC handlers
 */
function registerGatewayHandlers(
  gatewayManager: GatewayManager,
  mainWindow: BrowserWindow
): void {
  // Get Gateway status
  ipcMain.handle('gateway:status', () => {
    return gatewayManager.getStatus();
  });

  // Check if Gateway is connected
  ipcMain.handle('gateway:isConnected', () => {
    return gatewayManager.isConnected();
  });

  // Start Gateway
  ipcMain.handle('gateway:start', async () => {
    try {
      await gatewayManager.start();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Stop Gateway
  ipcMain.handle('gateway:stop', async () => {
    try {
      await gatewayManager.stop();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Restart Gateway
  ipcMain.handle('gateway:restart', async () => {
    try {
      await gatewayManager.restart();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Gateway RPC call (with method whitelist)
  const ALLOWED_GATEWAY_METHODS = [
    'chat.send',
    'chat.history',
    'chat.abort',
    'chat.sessions',
    'chat.delete',
    'agent.run',
    'agent.status',
    'agent.abort',
    'agent.list',
    'browser.search',
    'browser.scrape',
    'files.read',
    'files.write',
    'tools.list',
    'tools.call',
    'skills.status',
    'skills.update',
  ];

  ipcMain.handle('gateway:rpc', async (_, method: string, params?: unknown, timeoutMs?: number) => {
    // Validate method is in whitelist
    if (!ALLOWED_GATEWAY_METHODS.includes(method)) {
      logger.warn(`[Gateway] Blocked RPC call with unauthorized method: ${method}`);
      return { success: false, error: `Method '${method}' is not allowed. Allowed methods: ${ALLOWED_GATEWAY_METHODS.join(', ')}` };
    }

    try {
      const result = await gatewayManager.rpc(method, params, timeoutMs);
      return { success: true, result };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Chat send with media — reads staged files from disk and builds attachments.
  // Raster images (png/jpg/gif/webp) are inlined as base64 vision attachments.
  // All other files are referenced by path in the message text so the model
  // can access them via tools (the same format channels use).
  const VISION_MIME_TYPES = new Set([
    'image/png', 'image/jpeg', 'image/bmp', 'image/webp',
  ]);

  ipcMain.handle('chat:sendWithMedia', async (_, params: {
    sessionKey: string;
    message: string;
    deliver?: boolean;
    idempotencyKey: string;
    media?: Array<{ filePath: string; mimeType: string; fileName: string }>;
  }) => {
    try {
      let message = params.message;
      // The Gateway processes image attachments through TWO parallel paths:
      // Path A: `attachments` param → parsed via `parseMessageWithAttachments` →
      //   injected as inline vision content when the model supports images.
      //   Format: { content: base64, mimeType: string, fileName?: string }
      // Path B: `[media attached: ...]` in message text → Gateway's native image
      //   detection (`detectAndLoadPromptImages`) reads the file from disk and
      //   injects it as inline vision content. Also works for history messages.
      // We use BOTH paths for maximum reliability.
      const imageAttachments: Array<Record<string, unknown>> = [];
      const fileReferences: string[] = [];

      if (params.media && params.media.length > 0) {
        for (const m of params.media) {
          logger.info(`[chat:sendWithMedia] Processing file: ${m.fileName} (${m.mimeType}), path: ${m.filePath}, exists: ${existsSync(m.filePath)}, isVision: ${VISION_MIME_TYPES.has(m.mimeType)}`);

          // Always add file path reference so the model can access it via tools
          fileReferences.push(
            `[media attached: ${m.filePath} (${m.mimeType}) | ${m.filePath}]`,
          );

          if (VISION_MIME_TYPES.has(m.mimeType)) {
            // Send as base64 attachment in the format the Gateway expects:
            // { content: base64String, mimeType: string, fileName?: string }
            // The Gateway normalizer looks for `a.content` (NOT `a.source.data`).
            const fileBuffer = readFileSync(m.filePath);
            const base64Data = fileBuffer.toString('base64');
            logger.info(`[chat:sendWithMedia] Read ${fileBuffer.length} bytes, base64 length: ${base64Data.length}`);
            imageAttachments.push({
              content: base64Data,
              mimeType: m.mimeType,
              fileName: m.fileName,
            });
          }
        }
      }

      // Append file references to message text so the model knows about them
      if (fileReferences.length > 0) {
        const refs = fileReferences.join('\n');
        message = message ? `${message}\n\n${refs}` : refs;
      }

      const rpcParams: Record<string, unknown> = {
        sessionKey: params.sessionKey,
        message,
        deliver: params.deliver ?? false,
        idempotencyKey: params.idempotencyKey,
      };

      if (imageAttachments.length > 0) {
        rpcParams.attachments = imageAttachments;
      }

      logger.info(`[chat:sendWithMedia] Sending: message="${message.substring(0, 100)}", attachments=${imageAttachments.length}, fileRefs=${fileReferences.length}`);

      // Use a longer timeout when images are present (120s vs default 30s)
      const timeoutMs = imageAttachments.length > 0 ? 120000 : 30000;
      const result = await gatewayManager.rpc('chat.send', rpcParams, timeoutMs);
      logger.info(`[chat:sendWithMedia] RPC result: ${JSON.stringify(result)}`);
      return { success: true, result };
    } catch (error) {
      logger.error(`[chat:sendWithMedia] Error: ${String(error)}`);
      return { success: false, error: String(error) };
    }
  });

  // Get the Control UI URL with token for embedding
  ipcMain.handle('gateway:getControlUiUrl', async () => {
    try {
      const status = gatewayManager.getStatus();
      const token = await getSetting('gatewayToken');
      const port = status.port || 18789;
      // Pass token as query param - Control UI will store it in localStorage
      const url = `http://127.0.0.1:${port}/?token=${encodeURIComponent(token)}`;
      return { success: true, url, port, token };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Health check
  ipcMain.handle('gateway:health', async () => {
    try {
      const health = await gatewayManager.checkHealth();
      return { success: true, ...health };
    } catch (error) {
      return { success: false, ok: false, error: String(error) };
    }
  });

  // Forward Gateway events to renderer
  gatewayManager.on('status', (status) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:status-changed', status);
    }
  });

  gatewayManager.on('message', (message) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:message', message);
    }
  });

  gatewayManager.on('notification', (notification) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:notification', notification);
    }
  });

  gatewayManager.on('channel:status', (data) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:channel-status', data);
    }
  });

  gatewayManager.on('chat:message', async (data) => {
    // Forward to renderer
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:chat-message', data);
    }

    // Record usage when chat response is received
    try {
      // Data structure: { message: { message: { content, role, ... }, state, ... } }
      // Or: { message: { runId, sessionKey, seq, state, message: { content, ... } } }
      let messageContent = '';
      let messageModel = 'unknown';
      let messageState = '';

      // data.message is the outer wrapper
      if (data.message && typeof data.message === 'object') {
        const outer = data.message as Record<string, unknown>;

        // Get state from outer.state
        if (outer.state) {
          messageState = String(outer.state);
        }

        // Check for model in outer message
        if (outer.model) {
          messageModel = String(outer.model);
        }

        // outer.message contains the actual message content
        if (outer.message && typeof outer.message === 'object') {
          const inner = outer.message as Record<string, unknown>;

          // Content can be a string or an array
          if (typeof inner.content === 'string') {
            messageContent = inner.content;
          } else if (Array.isArray(inner.content)) {
            messageContent = inner.content
              .map((part: unknown) => (typeof part === 'string' ? part : (part as Record<string, unknown>)?.text || ''))
              .join('');
          }

          // Check for other possible content fields
          if (!messageContent && inner.text) {
            messageContent = String(inner.text);
          }
          if (!messageContent && inner.output) {
            messageContent = String(inner.output);
          }

          // Get model from inner
          if (messageModel === 'unknown' && inner.model) {
            messageModel = String(inner.model);
          }
        }
      }

      // Also check if content is directly in data.message
      if (!messageContent && data.message && typeof data.message === 'object') {
        const msg = data.message as Record<string, unknown>;
        if (msg.content) {
          messageContent = String(msg.content);
        }
      }

      // Only record on "final" state to avoid double counting
      if (messageState !== 'final') {
        return;
      }

      // If model is unknown, get it from settings
      if (messageModel === 'unknown') {
        messageModel = await getCurrentModel();
      }

      // Record when we have content
      // Estimate tokens: ~4 characters per token
      const estimatedTokens = Math.ceil(messageContent.length / 4);

      // Get provider from model name
      const provider = messageModel.includes('/') ? messageModel.split('/')[0] : 'custom';

      addUsageRecord({
        timestamp: Date.now(),
        model: messageModel,
        provider: provider,
        promptTokens: 0,
        completionTokens: estimatedTokens,
        totalTokens: estimatedTokens,
      });
      logger.info('[Usage] Recorded:', { model: messageModel, tokens: estimatedTokens, state: messageState });
    } catch (error) {
      logger.warn('[Usage] Error:', error);
    }
  });

  gatewayManager.on('exit', (code) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:exit', code);
    }
  });

  gatewayManager.on('error', (error) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('gateway:error', error.message);
    }
  });
}

/**
 * OpenClaw-related IPC handlers
 * For checking package status and channel configuration
 */
function registerOpenClawHandlers(): void {

  // Get OpenClaw package status
  ipcMain.handle('openclaw:status', () => {
    const status = getOpenClawStatus();
    logger.info('openclaw:status IPC called', status);
    return status;
  });

  // Check if OpenClaw is ready (package present)
  ipcMain.handle('openclaw:isReady', () => {
    const status = getOpenClawStatus();
    return status.packageExists;
  });

  // Get the resolved OpenClaw directory path (for diagnostics)
  ipcMain.handle('openclaw:getDir', () => {
    return getOpenClawDir();
  });

  // Get the OpenClaw config directory (~/.openclaw)
  ipcMain.handle('openclaw:getConfigDir', () => {
    return getOpenClawConfigDir();
  });

  // Get the OpenClaw skills directory (~/.openclaw/skills)
  ipcMain.handle('openclaw:getSkillsDir', () => {
    const dir = getOpenClawSkillsDir();
    ensureDir(dir);
    return dir;
  });

  // Get a shell command to run OpenClaw CLI without modifying PATH
  ipcMain.handle('openclaw:getCliCommand', () => {
    try {
      const status = getOpenClawStatus();
      if (!status.packageExists) {
        return { success: false, error: `OpenClaw package not found at: ${status.dir}` };
      }
      if (!existsSync(status.entryPath)) {
        return { success: false, error: `OpenClaw entry script not found at: ${status.entryPath}` };
      }
      return { success: true, command: getOpenClawCliCommand() };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Install a system-wide openclaw command on macOS (requires admin prompt)
  ipcMain.handle('openclaw:installCliMac', async () => {
    return installOpenClawCliMac();
  });

  // ==================== Channel Configuration Handlers ====================

  // Save channel configuration
  ipcMain.handle('channel:saveConfig', async (_, channelType: string, config: Record<string, unknown>) => {
    try {
      logger.info('channel:saveConfig', { channelType, keys: Object.keys(config || {}) });
      saveChannelConfig(channelType, config);
      return { success: true };
    } catch (error) {
      console.error('Failed to save channel config:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get channel configuration
  ipcMain.handle('channel:getConfig', async (_, channelType: string) => {
    try {
      const config = getChannelConfig(channelType);
      return { success: true, config };
    } catch (error) {
      console.error('Failed to get channel config:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get channel form values (reverse-transformed for UI pre-fill)
  ipcMain.handle('channel:getFormValues', async (_, channelType: string) => {
    try {
      const values = getChannelFormValues(channelType);
      return { success: true, values };
    } catch (error) {
      console.error('Failed to get channel form values:', error);
      return { success: false, error: String(error) };
    }
  });

  // Delete channel configuration
  ipcMain.handle('channel:deleteConfig', async (_, channelType: string) => {
    try {
      deleteChannelConfig(channelType);
      return { success: true };
    } catch (error) {
      console.error('Failed to delete channel config:', error);
      return { success: false, error: String(error) };
    }
  });

  // List configured channels
  ipcMain.handle('channel:listConfigured', async () => {
    try {
      const channels = listConfiguredChannels();
      return { success: true, channels };
    } catch (error) {
      console.error('Failed to list channels:', error);
      return { success: false, error: String(error) };
    }
  });

  // Enable or disable a channel
  ipcMain.handle('channel:setEnabled', async (_, channelType: string, enabled: boolean) => {
    try {
      setChannelEnabled(channelType, enabled);
      return { success: true };
    } catch (error) {
      console.error('Failed to set channel enabled:', error);
      return { success: false, error: String(error) };
    }
  });

  // Validate channel configuration
  ipcMain.handle('channel:validate', async (_, channelType: string) => {
    try {
      const result = await validateChannelConfig(channelType);
      return { success: true, ...result };
    } catch (error) {
      console.error('Failed to validate channel:', error);
      return { success: false, valid: false, errors: [String(error)], warnings: [] };
    }
  });

  // Validate channel credentials by calling actual service APIs (before saving)
  ipcMain.handle('channel:validateCredentials', async (_, channelType: string, config: Record<string, string>) => {
    try {
      const result = await validateChannelCredentials(channelType, config);
      return { success: true, ...result };
    } catch (error) {
      console.error('Failed to validate channel credentials:', error);
      return { success: false, valid: false, errors: [String(error)], warnings: [] };
    }
  });
}

/**
 * WhatsApp Login Handlers
 */
function registerWhatsAppHandlers(mainWindow: BrowserWindow): void {
  // Request WhatsApp QR code
  ipcMain.handle('channel:requestWhatsAppQr', async (_, accountId: string) => {
    try {
      logger.info('channel:requestWhatsAppQr', { accountId });
      await whatsAppLoginManager.start(accountId);
      return { success: true };
    } catch (error) {
      logger.error('channel:requestWhatsAppQr failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Cancel WhatsApp login
  ipcMain.handle('channel:cancelWhatsAppQr', async () => {
    try {
      await whatsAppLoginManager.stop();
      return { success: true };
    } catch (error) {
      logger.error('channel:cancelWhatsAppQr failed', error);
      return { success: false, error: String(error) };
    }
  });

  // Check WhatsApp status (is it active?)
  // ipcMain.handle('channel:checkWhatsAppStatus', ...)

  // Forward events to renderer
  whatsAppLoginManager.on('qr', (data) => {
    if (!mainWindow.isDestroyed()) {
      mainWindow.webContents.send('channel:whatsapp-qr', data);
    }
  });

  whatsAppLoginManager.on('success', (data) => {
    if (!mainWindow.isDestroyed()) {
      logger.info('whatsapp:login-success', data);
      mainWindow.webContents.send('channel:whatsapp-success', data);
    }
  });

  whatsAppLoginManager.on('error', (error) => {
    if (!mainWindow.isDestroyed()) {
      logger.error('whatsapp:login-error', error);
      mainWindow.webContents.send('channel:whatsapp-error', error);
    }
  });
}


/**
 * Provider-related IPC handlers
 */
function registerProviderHandlers(): void {
  // Get all providers with key info
  ipcMain.handle('provider:list', async () => {
    return await getAllProvidersWithKeyInfo();
  });

  // Get a specific provider
  ipcMain.handle('provider:get', async (_, providerId: string) => {
    return await getProvider(providerId);
  });

  // Save a provider configuration
  ipcMain.handle('provider:save', async (_, config: ProviderConfig, apiKey?: string) => {
    try {
      // Save the provider config
      await saveProvider(config);

      // Track the effective API key for custom provider config sync
      let effectiveKey: string | null = null;

      // Store the API key if provided
      if (apiKey !== undefined) {
        const trimmedKey = apiKey.trim();
        if (trimmedKey) {
          await storeApiKey(config.id, trimmedKey);
          effectiveKey = trimmedKey;

          // Also write to OpenClaw auth-profiles.json so the gateway can use it
          try {
            console.log(`[provider:save] Syncing API key for ${config.type} to auth-profiles.json`);
            saveProviderKeyToOpenClaw(config.type, trimmedKey);
          } catch (err) {
            console.warn('Failed to save key to OpenClaw auth-profiles:', err);
          }
        } else {
          // Empty string means user wants to clear the key
          await deleteApiKey(config.id);
          effectiveKey = null;
        }
      } else {
        // No new key provided, fetch existing key for custom provider sync
        effectiveKey = await getApiKey(config.id);
      }

      // For custom providers, also write the config to openclaw.json so Gateway can read it
      if (config.type === 'custom' && config.baseUrl && config.model) {
        try {
          console.log('[provider:save] Syncing custom provider to openclaw.json:', {
            providerId: config.id,
            type: config.type,
            model: config.model,
            baseUrl: config.baseUrl,
            hasKey: !!effectiveKey,
          });
          setOpenClawDefaultModelWithOverride(config.type, config.model, {
            baseUrl: config.baseUrl,
            api: config.apiType || 'openai-completions',
            apiKey: effectiveKey || undefined, // Custom providers need the API key directly in openclaw.json
          });
        } catch (err) {
          console.error('Failed to update openclaw.json with custom provider config:', err);
          return { success: false, error: `Failed to update OpenClaw config: ${err}` };
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Delete a provider
  ipcMain.handle('provider:delete', async (_, providerId: string) => {
    try {
      const existing = await getProvider(providerId);
      await deleteProvider(providerId);

      // Best-effort cleanup in OpenClaw auth profiles
      if (existing?.type) {
        try {
          removeProviderKeyFromOpenClaw(existing.type);
        } catch (err) {
          console.warn('Failed to remove key from OpenClaw auth-profiles:', err);
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Update API key for a provider
  ipcMain.handle('provider:setApiKey', async (_, providerId: string, apiKey: string) => {
    try {
      await storeApiKey(providerId, apiKey);

      // Also write to OpenClaw auth-profiles.json
      // Resolve provider type from stored config, or use providerId as type
      const provider = await getProvider(providerId);
      const providerType = provider?.type || providerId;
      try {
        saveProviderKeyToOpenClaw(providerType, apiKey);
      } catch (err) {
        console.warn('Failed to save key to OpenClaw auth-profiles:', err);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Atomically update provider config and API key
  ipcMain.handle(
    'provider:updateWithKey',
    async (
      _,
      providerId: string,
      updates: Partial<ProviderConfig>,
      apiKey?: string
    ) => {
      const existing = await getProvider(providerId);
      if (!existing) {
        return { success: false, error: 'Provider not found' };
      }

      const previousKey = await getApiKey(providerId);
      const previousProviderType = existing.type;

      try {
        const nextConfig: ProviderConfig = {
          ...existing,
          ...updates,
          updatedAt: new Date().toISOString(),
        };

        await saveProvider(nextConfig);

        // Track the effective API key for custom provider config sync
        let effectiveKey: string | null = null;

        if (apiKey !== undefined) {
          const trimmedKey = apiKey.trim();
          if (trimmedKey) {
            await storeApiKey(providerId, trimmedKey);
            saveProviderKeyToOpenClaw(nextConfig.type, trimmedKey);
            effectiveKey = trimmedKey;
          } else {
            await deleteApiKey(providerId);
            removeProviderKeyFromOpenClaw(nextConfig.type);
            effectiveKey = null;
          }
        } else {
          // No new key provided, fetch existing key for custom provider sync
          effectiveKey = await getApiKey(providerId);
        }

        // For custom providers, also update openclaw.json
        if (nextConfig.type === 'custom' && nextConfig.baseUrl && nextConfig.model) {
          try {
            console.log('[provider:updateWithKey] Syncing custom provider to openclaw.json:', {
              providerId,
              type: nextConfig.type,
              model: nextConfig.model,
              baseUrl: nextConfig.baseUrl,
              hasKey: !!effectiveKey,
            });
            setOpenClawDefaultModelWithOverride(nextConfig.type, nextConfig.model, {
              baseUrl: nextConfig.baseUrl,
              api: nextConfig.apiType || 'openai-completions',
              apiKey: effectiveKey || undefined, // Custom providers need the API key directly in openclaw.json
            });
          } catch (err) {
            console.error('Failed to update openclaw.json with custom provider config:', err);
            return { success: false, error: `Failed to update OpenClaw config: ${err}` };
          }
        }

        return { success: true };
      } catch (error) {
        // Best-effort rollback to keep config/key consistent.
        try {
          await saveProvider(existing);
          if (previousKey) {
            await storeApiKey(providerId, previousKey);
            saveProviderKeyToOpenClaw(previousProviderType, previousKey);
          } else {
            await deleteApiKey(providerId);
            removeProviderKeyFromOpenClaw(previousProviderType);
          }
        } catch (rollbackError) {
          console.warn('Failed to rollback provider updateWithKey:', rollbackError);
        }

        return { success: false, error: String(error) };
      }
    }
  );

  // Delete API key for a provider
  ipcMain.handle('provider:deleteApiKey', async (_, providerId: string) => {
    try {
      await deleteApiKey(providerId);

      // Keep OpenClaw auth-profiles.json in sync with local key storage
      const provider = await getProvider(providerId);
      const providerType = provider?.type || providerId;
      try {
        removeProviderKeyFromOpenClaw(providerType);
      } catch (err) {
        console.warn('Failed to remove key from OpenClaw auth-profiles:', err);
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Check if a provider has an API key
  ipcMain.handle('provider:hasApiKey', async (_, providerId: string) => {
    return await hasApiKey(providerId);
  });

  // Get the actual API key (for internal use only - be careful!)
  ipcMain.handle('provider:getApiKey', async (_, providerId: string) => {
    return await getApiKey(providerId);
  });

  // Set default provider and update OpenClaw default model
  ipcMain.handle('provider:setDefault', async (_, providerId: string) => {
    try {
      await setDefaultProvider(providerId);

      // Update OpenClaw config to use this provider's default model
      const provider = await getProvider(providerId);
      if (provider) {
        try {
          // If the provider has a user-specified model (e.g. siliconflow),
          // build the full model string: "providerType/modelId"
          const modelOverride = provider.model
            ? `${provider.type}/${provider.model}`
            : undefined;

          if (provider.type === 'custom' || provider.type === 'ollama') {
            // For runtime-configured providers, use user-entered base URL/api.
            // Also include the API key - custom providers need it directly in openclaw.json
            const providerKey = await getApiKey(providerId);
            setOpenClawDefaultModelWithOverride(provider.type, modelOverride, {
              baseUrl: provider.baseUrl,
              api: provider.apiType || 'openai-completions',
              apiKey: providerKey,
            });
          } else {
            setOpenClawDefaultModel(provider.type, modelOverride);
          }

          // Keep auth-profiles in sync with the default provider instance.
          // This is especially important when multiple custom providers exist.
          // Also ensures API key is present if it was previously lost.
          const providerKey = await getApiKey(providerId);
          if (providerKey) {
            console.log(`[provider:setDefault] Syncing API key for ${provider.type} to auth-profiles.json`);
            saveProviderKeyToOpenClaw(provider.type, providerKey);
          } else {
            console.warn(`[provider:setDefault] No API key found for provider ${providerId}, cannot sync to auth-profiles.json`);
          }
        } catch (err) {
          console.warn('Failed to set OpenClaw default model:', err);
        }
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Get default provider
  ipcMain.handle('provider:getDefault', async () => {
    return await getDefaultProvider();
  });

  // Validate API key by making a real test request to the provider.
  // providerId can be either a stored provider ID or a provider type.
  ipcMain.handle(
    'provider:validateKey',
    async (
      _,
      providerId: string,
      apiKey: string,
      options?: { baseUrl?: string }
    ) => {
      try {
        // First try to get existing provider
        const provider = await getProvider(providerId);

        // Use provider.type if provider exists, otherwise use providerId as the type
        // This allows validation during setup when provider hasn't been saved yet
        const providerType = provider?.type || providerId;
        const registryBaseUrl = getProviderConfig(providerType)?.baseUrl;
        // Prefer caller-supplied baseUrl (live form value) over persisted config.
        // This ensures Setup/Settings validation reflects unsaved edits immediately.
        const resolvedBaseUrl = options?.baseUrl || provider?.baseUrl || registryBaseUrl;

        console.log(`[clawx-validate] validating provider type: ${providerType}`);
        return await validateApiKeyWithProvider(providerType, apiKey, { baseUrl: resolvedBaseUrl });
      } catch (error) {
        console.error('Validation error:', error);
        return { valid: false, error: String(error) };
      }
    }
  );
}

type ValidationProfile = 'openai-compatible' | 'google-query-key' | 'anthropic-header' | 'openrouter' | 'none';

/**
 * Validate API key using lightweight model-listing endpoints (zero token cost).
 * Providers are grouped into 3 auth styles:
 * - openai-compatible: Bearer auth + /models
 * - google-query-key: ?key=... + /models
 * - anthropic-header: x-api-key + anthropic-version + /models
 */
async function validateApiKeyWithProvider(
  providerType: string,
  apiKey: string,
  options?: { baseUrl?: string }
): Promise<{ valid: boolean; error?: string }> {
  const profile = getValidationProfile(providerType);
  if (profile === 'none') {
    return { valid: true };
  }

  const trimmedKey = apiKey.trim();
  if (!trimmedKey) {
    return { valid: false, error: 'API key is required' };
  }

  try {
    switch (profile) {
      case 'openai-compatible':
        return await validateOpenAiCompatibleKey(providerType, trimmedKey, options?.baseUrl);
      case 'google-query-key':
        return await validateGoogleQueryKey(providerType, trimmedKey, options?.baseUrl);
      case 'anthropic-header':
        return await validateAnthropicHeaderKey(providerType, trimmedKey, options?.baseUrl);
      case 'openrouter':
        return await validateOpenRouterKey(providerType, trimmedKey);
      default:
        return { valid: false, error: `Unsupported validation profile for provider: ${providerType}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { valid: false, error: errorMessage };
  }
}

function logValidationStatus(provider: string, status: number): void {
  console.log(`[clawx-validate] ${provider} HTTP ${status}`);
}

function maskSecret(secret: string): string {
  if (!secret) return '';
  if (secret.length <= 8) return `${secret.slice(0, 2)}***`;
  return `${secret.slice(0, 4)}***${secret.slice(-4)}`;
}

function sanitizeValidationUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const key = url.searchParams.get('key');
    if (key) url.searchParams.set('key', maskSecret(key));
    return url.toString();
  } catch {
    return rawUrl;
  }
}

function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const next = { ...headers };
  if (next.Authorization?.startsWith('Bearer ')) {
    const token = next.Authorization.slice('Bearer '.length);
    next.Authorization = `Bearer ${maskSecret(token)}`;
  }
  if (next['x-api-key']) {
    next['x-api-key'] = maskSecret(next['x-api-key']);
  }
  return next;
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, '');
}

function buildOpenAiModelsUrl(baseUrl: string): string {
  return `${normalizeBaseUrl(baseUrl)}/models?limit=1`;
}

function logValidationRequest(
  provider: string,
  method: string,
  url: string,
  headers: Record<string, string>
): void {
  console.log(
    `[clawx-validate] ${provider} request ${method} ${sanitizeValidationUrl(url)} headers=${JSON.stringify(sanitizeHeaders(headers))}`
  );
}

function getValidationProfile(providerType: string): ValidationProfile {
  switch (providerType) {
    case 'anthropic':
      return 'anthropic-header';
    case 'google':
      return 'google-query-key';
    case 'openrouter':
      return 'openrouter';
    case 'ollama':
      return 'none';
    default:
      return 'openai-compatible';
  }
}

async function performProviderValidationRequest(
  providerLabel: string,
  url: string,
  headers: Record<string, string>
): Promise<{ valid: boolean; error?: string }> {
  try {
    logValidationRequest(providerLabel, 'GET', url, headers);
    const response = await fetch(url, { headers });
    logValidationStatus(providerLabel, response.status);
    const data = await response.json().catch(() => ({}));
    return classifyAuthResponse(response.status, data);
  } catch (error) {
    return {
      valid: false,
      error: `Connection error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Helper: classify an HTTP response as valid / invalid / error.
 * 200 / 429 → valid (key works, possibly rate-limited).
 * 401 / 403 → invalid.
 * Everything else → return the API error message.
 */
function classifyAuthResponse(
  status: number,
  data: unknown
): { valid: boolean; error?: string } {
  if (status >= 200 && status < 300) return { valid: true };
  if (status === 429) return { valid: true }; // rate-limited but key is valid
  if (status === 401 || status === 403) return { valid: false, error: 'Invalid API key' };

  // Try to extract an error message
  const obj = data as { error?: { message?: string }; message?: string } | null;
  const msg = obj?.error?.message || obj?.message || `API error: ${status}`;
  return { valid: false, error: msg };
}

async function validateOpenAiCompatibleKey(
  providerType: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ valid: boolean; error?: string }> {
  const trimmedBaseUrl = baseUrl?.trim();
  if (!trimmedBaseUrl) {
    return { valid: false, error: `Base URL is required for provider "${providerType}" validation` };
  }

  const headers = { Authorization: `Bearer ${apiKey}` };

  // Try /models first (standard OpenAI-compatible endpoint)
  const modelsUrl = buildOpenAiModelsUrl(trimmedBaseUrl);
  const modelsResult = await performProviderValidationRequest(providerType, modelsUrl, headers);

  // If /models returned 404, the provider likely doesn't implement it (e.g. MiniMax).
  // Fall back to a minimal /chat/completions POST which almost all providers support.
  if (modelsResult.error?.includes('API error: 404')) {
    console.log(
      `[clawx-validate] ${providerType} /models returned 404, falling back to /chat/completions probe`
    );
    const base = normalizeBaseUrl(trimmedBaseUrl);
    const chatUrl = `${base}/chat/completions`;
    return await performChatCompletionsProbe(providerType, chatUrl, headers);
  }

  return modelsResult;
}

/**
 * Fallback validation: send a minimal /chat/completions request.
 * We intentionally use max_tokens=1 to minimise cost. The goal is only to
 * distinguish auth errors (401/403) from a working key (200/400/429).
 * A 400 "invalid model" still proves the key itself is accepted.
 */
async function performChatCompletionsProbe(
  providerLabel: string,
  url: string,
  headers: Record<string, string>
): Promise<{ valid: boolean; error?: string }> {
  try {
    logValidationRequest(providerLabel, 'POST', url, headers);
    const response = await fetch(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'validation-probe',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
      }),
    });
    logValidationStatus(providerLabel, response.status);
    const data = await response.json().catch(() => ({}));

    // 401/403 → invalid key
    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Invalid API key' };
    }
    // 200, 400 (bad model but key accepted), 429 → key is valid
    if (
      (response.status >= 200 && response.status < 300) ||
      response.status === 400 ||
      response.status === 429
    ) {
      return { valid: true };
    }
    return classifyAuthResponse(response.status, data);
  } catch (error) {
    return {
      valid: false,
      error: `Connection error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

async function validateGoogleQueryKey(
  providerType: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ valid: boolean; error?: string }> {
  // Google is a built-in provider - use default URL if not provided
  const trimmedBaseUrl = baseUrl?.trim() || 'https://generativelanguage.googleapis.com/v1beta';

  const base = normalizeBaseUrl(trimmedBaseUrl);
  const url = `${base}/models?pageSize=1&key=${encodeURIComponent(apiKey)}`;
  return await performProviderValidationRequest(providerType, url, {});
}

async function validateAnthropicHeaderKey(
  providerType: string,
  apiKey: string,
  baseUrl?: string
): Promise<{ valid: boolean; error?: string }> {
  const base = normalizeBaseUrl(baseUrl || 'https://api.anthropic.com/v1');
  const url = `${base}/models?limit=1`;
  const headers = {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
  };
  return await performProviderValidationRequest(providerType, url, headers);
}

async function validateOpenRouterKey(
  providerType: string,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  // Use OpenRouter's auth check endpoint instead of public /models
  const url = 'https://openrouter.ai/api/v1/auth/key';
  const headers = { Authorization: `Bearer ${apiKey}` };
  return await performProviderValidationRequest(providerType, url, headers);
}

/**
 * Shell-related IPC handlers
 */
function registerShellHandlers(): void {
  // Open external URL (with URL validation)
  ipcMain.handle('shell:openExternal', async (_, url: string) => {
    try {
      // Validate URL
      const parsedUrl = new URL(url);

      // Only allow http, https, and mailto protocols
      const allowedProtocols = ['https:', 'http:', 'mailto:'];
      if (!allowedProtocols.includes(parsedUrl.protocol)) {
        throw new Error(`Protocol '${parsedUrl.protocol}' is not allowed. Only http, https, and mailto are supported.`);
      }

      await shell.openExternal(url);
      return { success: true };
    } catch (error) {
      logger.error('[Shell] openExternal error:', error);
      return { success: false, error: String(error) };
    }
  });

  // Open path in file explorer
  ipcMain.handle('shell:showItemInFolder', async (_, path: string) => {
    shell.showItemInFolder(path);
  });

  // Open path
  ipcMain.handle('shell:openPath', async (_, path: string) => {
    return await shell.openPath(path);
  });
}

/**
 * ClawHub-related IPC handlers
 */
function registerClawHubHandlers(clawHubService: ClawHubService): void {
  // Search skills
  ipcMain.handle('clawhub:search', async (_, params: ClawHubSearchParams) => {
    try {
      const results = await clawHubService.search(params);
      return { success: true, results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Install skill
  ipcMain.handle('clawhub:install', async (_, params: ClawHubInstallParams) => {
    try {
      await clawHubService.install(params);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Uninstall skill
  ipcMain.handle('clawhub:uninstall', async (_, params: ClawHubUninstallParams) => {
    try {
      await clawHubService.uninstall(params);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // List installed skills
  ipcMain.handle('clawhub:list', async () => {
    try {
      const results = await clawHubService.listInstalled();
      return { success: true, results };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Open skill readme
  ipcMain.handle('clawhub:openSkillReadme', async (_, slug: string) => {
    try {
      await clawHubService.openSkillReadme(slug);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });
}

/**
 * Dialog-related IPC handlers
 */
function registerDialogHandlers(): void {
  // Show open dialog
  ipcMain.handle('dialog:open', async (_, options: Electron.OpenDialogOptions) => {
    const result = await dialog.showOpenDialog(options);
    return result;
  });

  // Show save dialog
  ipcMain.handle('dialog:save', async (_, options: Electron.SaveDialogOptions) => {
    const result = await dialog.showSaveDialog(options);
    return result;
  });

  // Show message box
  ipcMain.handle('dialog:message', async (_, options: Electron.MessageBoxOptions) => {
    const result = await dialog.showMessageBox(options);
    return result;
  });
}

/**
 * App-related IPC handlers
 */
function registerAppHandlers(): void {
  // Get app version
  ipcMain.handle('app:version', () => {
    return app.getVersion();
  });

  // Get app name
  ipcMain.handle('app:name', () => {
    return app.getName();
  });

  // Get app path
  ipcMain.handle('app:getPath', (_, name: Parameters<typeof app.getPath>[0]) => {
    return app.getPath(name);
  });

  // Get platform
  ipcMain.handle('app:platform', () => {
    return process.platform;
  });

  // Quit app
  ipcMain.handle('app:quit', () => {
    app.quit();
  });

  // Relaunch app
  ipcMain.handle('app:relaunch', () => {
    app.relaunch();
    app.quit();
  });
}

/**
 * Window control handlers (for custom title bar on Windows/Linux)
 */
function registerWindowHandlers(mainWindow: BrowserWindow): void {
  ipcMain.handle('window:minimize', () => {
    mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });

  ipcMain.handle('window:close', () => {
    mainWindow.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow.isMaximized();
  });
}

// ── Mime type helpers ────────────────────────────────────────────

const EXT_MIME_MAP: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.avi': 'video/x-msvideo',
  '.mkv': 'video/x-matroska',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.flac': 'audio/flac',
  '.pdf': 'application/pdf',
  '.zip': 'application/zip',
  '.gz': 'application/gzip',
  '.tar': 'application/x-tar',
  '.7z': 'application/x-7z-compressed',
  '.rar': 'application/vnd.rar',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.ts': 'text/typescript',
  '.py': 'text/x-python',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function getMimeType(ext: string): string {
  return EXT_MIME_MAP[ext.toLowerCase()] || 'application/octet-stream';
}

function mimeToExt(mimeType: string): string {
  for (const [ext, mime] of Object.entries(EXT_MIME_MAP)) {
    if (mime === mimeType) return ext;
  }
  return '';
}

const OUTBOUND_DIR = join(homedir(), '.openclaw', 'media', 'outbound');

/**
 * Generate a preview data URL for image files.
 * Resizes large images while preserving aspect ratio (only constrain the
 * longer side so the image is never squished). The frontend handles
 * square cropping via CSS object-fit: cover.
 */
function generateImagePreview(filePath: string, mimeType: string): string | null {
  try {
    const img = nativeImage.createFromPath(filePath);
    if (img.isEmpty()) return null;
    const size = img.getSize();
    const maxDim = 512; // keep enough resolution for crisp display on Retina
    // Only resize if larger than threshold — specify ONE dimension to keep ratio
    if (size.width > maxDim || size.height > maxDim) {
      const resized = size.width >= size.height
        ? img.resize({ width: maxDim })   // landscape / square → constrain width
        : img.resize({ height: maxDim }); // portrait → constrain height
      return `data:image/png;base64,${resized.toPNG().toString('base64')}`;
    }
    // Small image — use original
    const buf = readFileSync(filePath);
    return `data:${mimeType};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

/**
 * File staging IPC handlers
 * Stage files to ~/.openclaw/media/outbound/ for gateway access
 */
function registerFileHandlers(): void {
  // Stage files from real disk paths (used with dialog:open)
  ipcMain.handle('file:stage', async (_, filePaths: string[]) => {
    // Validate input
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return { success: false, error: 'Invalid file paths' };
    }

    mkdirSync(OUTBOUND_DIR, { recursive: true });

    const results = [];
    for (const filePath of filePaths) {
      // Validate filePath is a string
      if (typeof filePath !== 'string' || !filePath) {
        continue;
      }

      // Validate file exists
      if (!existsSync(filePath)) {
        logger.warn('[File] Source file not found:', filePath);
        continue;
      }

      // Validate the source file is in a safe directory (user's home or temp)
      const normalizedPath = join(filePath);
      const userHome = homedir();
      const tempDir = tmpdir();
      const isInHome = normalizedPath.startsWith(userHome);
      const isInTemp = normalizedPath.startsWith(tempDir);

      if (!isInHome && !isInTemp) {
        logger.warn('[File] File must be in home or temp directory:', filePath);
        continue;
      }

      const id = crypto.randomUUID();
      const ext = extname(filePath);
      const stagedPath = join(OUTBOUND_DIR, `${id}${ext}`);
      copyFileSync(filePath, stagedPath);

      const stat = statSync(stagedPath);
      const mimeType = getMimeType(ext);
      const fileName = basename(filePath);

      // Generate preview for images
      let preview: string | null = null;
      if (mimeType.startsWith('image/')) {
        preview = generateImagePreview(stagedPath, mimeType);
      }

      results.push({ id, fileName, mimeType, fileSize: stat.size, stagedPath, preview });
    }
    return results;
  });

  // Stage file from buffer (used for clipboard paste / drag-drop)
  ipcMain.handle('file:stageBuffer', async (_, payload: {
    base64: string;
    fileName: string;
    mimeType: string;
  }) => {
    mkdirSync(OUTBOUND_DIR, { recursive: true });

    const id = crypto.randomUUID();
    const ext = extname(payload.fileName) || mimeToExt(payload.mimeType);
    const stagedPath = join(OUTBOUND_DIR, `${id}${ext}`);
    const buffer = Buffer.from(payload.base64, 'base64');
    writeFileSync(stagedPath, buffer);

    const mimeType = payload.mimeType || getMimeType(ext);
    const fileSize = buffer.length;

    // Generate preview for images
    let preview: string | null = null;
    if (mimeType.startsWith('image/')) {
      preview = generateImagePreview(stagedPath, mimeType);
    }

    return { id, fileName: payload.fileName, mimeType, fileSize, stagedPath, preview };
  });

  // Load thumbnails for file paths on disk (used to restore previews in history)
  ipcMain.handle('media:getThumbnails', async (_, paths: Array<{ filePath: string; mimeType: string }>) => {
    const results: Record<string, { preview: string | null; fileSize: number }> = {};
    for (const { filePath, mimeType } of paths) {
      try {
        if (!existsSync(filePath)) {
          results[filePath] = { preview: null, fileSize: 0 };
          continue;
        }
        const stat = statSync(filePath);
        let preview: string | null = null;
        if (mimeType.startsWith('image/')) {
          preview = generateImagePreview(filePath, mimeType);
        }
        results[filePath] = { preview, fileSize: stat.size };
      } catch {
        results[filePath] = { preview: null, fileSize: 0 };
      }
    }
    return results;
  });

  // Save base64 data to file
  ipcMain.handle('file:saveBase64', async (_, params: {
    data: string;
    filePath: string;
  }) => {
    try {
      const buffer = Buffer.from(params.data, 'base64');
      writeFileSync(params.filePath, buffer);
      logger.info('[File] Saved base64 data to:', params.filePath);
      return { success: true };
    } catch (error) {
      logger.error('[File] Failed to save base64 data:', error);
      return { success: false, error: String(error) };
    }
  });
}

// ── Todo List handlers ──────────────────────────────────────────────

interface TodoItem {
  id: string;
  content: string;
  status: 'pending' | 'completed';
  created_at: string;
  updated_at: string;
}

interface TodoStorage {
  tasks: TodoItem[];
}

const TODO_STORAGE_DIR = join(homedir(), '.openclaw', 'data');
const TODO_STORAGE_PATH = join(TODO_STORAGE_DIR, 'todo_storage.json');

/**
 * Ensure todo storage directory exists
 */
function ensureTodoStorageDir(): void {
  if (!existsSync(TODO_STORAGE_DIR)) {
    mkdirSync(TODO_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Read todo storage from JSON file
 */
function readTodoStorage(): TodoStorage {
  ensureTodoStorageDir();
  if (!existsSync(TODO_STORAGE_PATH)) {
    return { tasks: [] };
  }
  try {
    const raw = readFileSync(TODO_STORAGE_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    logger.error('Failed to read todo storage:', err);
    return { tasks: [] };
  }
}

/**
 * Write todo storage to JSON file
 */
function writeTodoStorage(storage: TodoStorage): void {
  ensureTodoStorageDir();
  try {
    const json = JSON.stringify(storage, null, 2);
    writeFileSync(TODO_STORAGE_PATH, json, 'utf-8');
  } catch (err) {
    logger.error('Failed to write todo storage:', err);
    throw err;
  }
}

/**
 * Register Todo IPC handlers
 */
function registerTodoHandlers(gatewayManager: GatewayManager): void {
  // Get all todo items
  ipcMain.handle('todo:getAll', async () => {
    try {
      const storage = readTodoStorage();
      return { success: true, tasks: storage.tasks };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Add a new todo item
  ipcMain.handle('todo:add', async (_, content: string) => {
    try {
      const storage = readTodoStorage();
      const now = new Date().toISOString();
      const newTask: TodoItem = {
        id: crypto.randomUUID(),
        content,
        status: 'pending',
        created_at: now,
        updated_at: now,
      };
      storage.tasks.push(newTask);
      writeTodoStorage(storage);
      return { success: true, task: newTask };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Add multiple todo items (for bulk import from LLM)
  ipcMain.handle('todo:addMany', async (_, items: string[]) => {
    try {
      const storage = readTodoStorage();
      const now = new Date().toISOString();
      const newTasks: TodoItem[] = items.map((content) => ({
        id: crypto.randomUUID(),
        content,
        status: 'pending',
        created_at: now,
        updated_at: now,
      }));
      storage.tasks.push(...newTasks);
      writeTodoStorage(storage);
      return { success: true, tasks: newTasks };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Update a todo item (content or status)
  ipcMain.handle('todo:update', async (_, params: { id: string; content?: string; status?: 'pending' | 'completed' }) => {
    try {
      const storage = readTodoStorage();
      const taskIndex = storage.tasks.findIndex((t) => t.id === params.id);
      if (taskIndex === -1) {
        return { success: false, error: 'Task not found' };
      }
      const task = storage.tasks[taskIndex];
      if (params.content !== undefined) {
        task.content = params.content;
      }
      if (params.status !== undefined) {
        task.status = params.status;
      }
      task.updated_at = new Date().toISOString();
      storage.tasks[taskIndex] = task;
      writeTodoStorage(storage);
      return { success: true, task };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Delete a todo item
  ipcMain.handle('todo:delete', async (_, id: string) => {
    try {
      const storage = readTodoStorage();
      const initialLength = storage.tasks.length;
      storage.tasks = storage.tasks.filter((t) => t.id !== id);
      if (storage.tasks.length === initialLength) {
        return { success: false, error: 'Task not found' };
      }
      writeTodoStorage(storage);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Toggle todo status
  ipcMain.handle('todo:toggle', async (_, id: string) => {
    try {
      const storage = readTodoStorage();
      const task = storage.tasks.find((t) => t.id === id);
      if (!task) {
        return { success: false, error: 'Task not found' };
      }
      task.status = task.status === 'pending' ? 'completed' : 'pending';
      task.updated_at = new Date().toISOString();
      writeTodoStorage(storage);
      return { success: true, task };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Get todo storage path (for debugging)
  ipcMain.handle('todo:getStoragePath', async () => {
    return TODO_STORAGE_PATH;
  });

  // Extract todo items from file content
  ipcMain.handle('todo:extractFromContent', async (_, content: string) => {
    try {
      // Extract todo items using regex patterns
      const todoItems: string[] = [];

      // Pattern 1: Markdown checkbox format: - [ ] or - [x]
      const markdownPattern = /[-*]\s*\[([ xX])\]\s*(.+)/g;
      let match;
      while ((match = markdownPattern.exec(content)) !== null) {
        const item = match[2].trim();
        if (item && !todoItems.includes(item)) {
          todoItems.push(item);
        }
      }

      // Pattern 2: Numbered list: 1. Task, 2. Task
      const numberedPattern = /^\d+\.\s*(.+)$/gm;
      while ((match = numberedPattern.exec(content)) !== null) {
        const item = match[1].trim();
        if (item && !todoItems.includes(item)) {
          todoItems.push(item);
        }
      }

      // Pattern 3: TODO: or - TODO: format
      const todoFormatPattern = /(?:^|\n)\s*(?:TODO:|- TODO:)\s*(.+)/gim;
      while ((match = todoFormatPattern.exec(content)) !== null) {
        const item = match[1].trim();
        if (item && !todoItems.includes(item)) {
          todoItems.push(item);
        }
      }

      // Pattern 4: Plain text lines that look like tasks
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        // Skip empty lines and lines that are too long
        if (!trimmed || trimmed.length > 200) continue;
        // Skip lines that are headers or already captured
        if (/^#{1,3}\s/.test(trimmed)) continue;
        if (todoItems.includes(trimmed)) continue;
        // Check if it looks like a task (starts with verb or short phrase)
        if (/^(?:buy|cook|clean|write|send|call|fix|update|check|review|create|add|remove|complete|finish|start|do|make|get|prepare|organize|schedule|plan|review|verify|test|deploy|build|read|learn)/i.test(trimmed)) {
          todoItems.push(trimmed);
        }
      }

      return { success: true, items: todoItems };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Extract todo items from PDF file using Gateway (LLM)
  ipcMain.handle('todo:extractFromPdf', async (_, filePath: string) => {
    try {
      // Read PDF file
      if (!existsSync(filePath)) {
        return { success: false, error: 'File not found' };
      }

      // Extract text from PDF using PyPDF2
      const { execSync } = await import('node:child_process');
      let pdfText = '';
      try {
        // Write Python script to temp file and execute
        const tempScript = join(tmpdir(), `extract_pdf_${Date.now()}.py`);
        const pythonScript = `
import PyPDF2
import sys

def extract_text_from_pdf(pdf_path):
    try:
        with open(pdf_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ''
            for page in reader.pages:
                text += page.extract_text() + '\\n'
            return text
    except Exception as e:
        return str(e)

pdf_path = '${filePath.replace(/'/g, "'\\''")}'
print(extract_text_from_pdf(pdf_path))
`;
        writeFileSync(tempScript, pythonScript);
        pdfText = execSync(`python3 "${tempScript}"`, { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 });
        // Clean up temp file
        unlinkSync(tempScript);
        logger.info('[Todo] PDF text extracted, length:', pdfText.length);
      } catch (e) {
        logger.error('[Todo] Failed to extract PDF text:', e);
        return { success: false, error: 'Failed to extract text from PDF' };
      }

      // Truncate if too long
      const maxTextLength = 50000;
      const truncatedText = pdfText.length > maxTextLength
        ? pdfText.substring(0, maxTextLength) + '\n\n[...内容已截断...]'
        : pdfText;

      const fileName = basename(filePath);
      const prompt = `请从以下PDF文件 "${fileName}" 的文本内容中提取所有待办事项/行动项，并以以下JSON格式返回：
[TODO_LIST:["item1", "item2", "item3"]]

只返回JSON格式，不要有其他内容。如果文件中没有明确的待办事项，请返回空列表 [TODO_LIST:[]]。

PDF文本内容：
${truncatedText}`;

      // Use a fixed session key to reuse the same OpenClaw process
      const sessionKey = 'agent:main:translate-todo';

      // Call Gateway to extract todos from PDF text
      const sendResult = await gatewayManager.rpc<{ runId?: string }>('chat.send', {
        sessionKey,
        message: prompt,
        deliver: false,
        idempotencyKey: `todo-extract-${Date.now()}`,
      }, 120000);

      logger.info('[Todo] PDF extract send result:', JSON.stringify(sendResult));

      const runId = sendResult?.runId;
      if (!runId) {
        return { success: false, error: 'Failed to start extraction' };
      }

      // Wait for the run to complete and get chat history
      const maxRetries = 40; // 40 * 3000ms = 120 seconds timeout
      const retryDelay = 3000;

      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        try {
          const historyResult = await gatewayManager.rpc<{ sessions?: Record<string, unknown> }>('chat.history', { sessionKey, limit: 5 });

          const sessions = historyResult?.sessions as Record<string, unknown> | undefined;
          const sessionData = sessions?.[sessionKey] as { messages?: Array<{ role: string; content?: unknown }> } | undefined;
          const messages = sessionData?.messages || [];

          // Find the last assistant message
          const lastAssistantMsg = messages.filter((m: { role: string }) => m.role === 'assistant').pop();

          if (lastAssistantMsg?.content) {
            const contentStr = typeof lastAssistantMsg.content === 'string'
              ? lastAssistantMsg.content
              : JSON.stringify(lastAssistantMsg.content);

            // Extract todo list from response
            const todoMatch = contentStr.match(/\[TODO_LIST:(\[[\s\S]*?\])\]/);
            if (todoMatch) {
              const todoItems = JSON.parse(todoMatch[1]);
              return { success: true, items: todoItems };
            }
          }
        } catch {
          // Continue polling
        }
      }

      return { success: false, error: 'Timeout waiting for extraction result' };
    } catch (error) {
      logger.error('[Todo] PDF extraction error:', error);
      return { success: false, error: String(error) };
    }
  });
}

// ── Briefing (Daily AI Briefing) handlers ─────────────────────────────────

interface BriefingSettings {
  briefingTime: string; // HH:MM format
  focusTopics: string[]; // Array of topics
  obsidianVaultPath: string; // Local file path
  timezoneOffset: number; // User's timezone offset in minutes
  enabled: boolean; // Auto-generate enabled
  searchMode: 'knowledge' | 'web'; // 'knowledge' = use LLM knowledge, 'web' = try web search (requires browser)
}

interface BriefingData {
  lastGenerated: string | null;
  content: string;
  topics: string[];
}

const BRIEFING_STORAGE_DIR = join(homedir(), '.openclaw', 'data');
const BRIEFING_SETTINGS_PATH = join(BRIEFING_STORAGE_DIR, 'briefing_settings.json');
const BRIEFING_CONTENT_PATH = join(BRIEFING_STORAGE_DIR, 'briefing_latest.md');

/**
 * Ensure briefing storage directory exists
 */
function ensureBriefingStorageDir(): void {
  if (!existsSync(BRIEFING_STORAGE_DIR)) {
    mkdirSync(BRIEFING_STORAGE_DIR, { recursive: true });
  }
}

/**
 * Read briefing settings from JSON file
 */
function readBriefingSettings(): BriefingSettings {
  ensureBriefingStorageDir();
  const defaultSettings: BriefingSettings = {
    briefingTime: '08:00',
    focusTopics: ['AI News', 'Bitcoin'],
    obsidianVaultPath: '',
    timezoneOffset: -new Date().getTimezoneOffset(),
    enabled: true,
    searchMode: 'knowledge',
  };

  if (!existsSync(BRIEFING_SETTINGS_PATH)) {
    return defaultSettings;
  }

  try {
    const raw = readFileSync(BRIEFING_SETTINGS_PATH, 'utf-8');
    return { ...defaultSettings, ...JSON.parse(raw), enabled: true };
  } catch (err) {
    logger.error('Failed to read briefing settings:', err);
    return defaultSettings;
  }
}

/**
 * Write briefing settings to JSON file
 */
function writeBriefingSettings(settings: BriefingSettings): void {
  ensureBriefingStorageDir();
  try {
    const json = JSON.stringify(settings, null, 2);
    writeFileSync(BRIEFING_SETTINGS_PATH, json, 'utf-8');
  } catch (err) {
    logger.error('Failed to write briefing settings:', err);
    throw err;
  }
}

/**
 * Read latest briefing content
 */
function readBriefingContent(): BriefingData {
  ensureBriefingStorageDir();
  logger.info('[Briefing] Reading content from:', BRIEFING_CONTENT_PATH);
  const defaultData: BriefingData = {
    lastGenerated: null,
    content: '',
    topics: [],
  };

  if (!existsSync(BRIEFING_CONTENT_PATH)) {
    return defaultData;
  }

  try {
    const raw = readFileSync(BRIEFING_CONTENT_PATH, 'utf-8');
    // Parse frontmatter + content
    const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (match) {
      const frontmatter = match[1];
      const content = match[2];

      // Parse frontmatter
      const lastGeneratedMatch = frontmatter.match(/lastGenerated:\s*(.+)/);
      const topicsMatch = frontmatter.match(/topics:\s*\[(.*)\]/);

      const result = {
        lastGenerated: lastGeneratedMatch ? lastGeneratedMatch[1].trim() : null,
        content,
        topics: topicsMatch ? topicsMatch[1].split(',').map(t => t.trim().replace(/"/g, '')) : [],
      };
      logger.info('[Briefing] Read content, topics:', result.topics, 'content length:', result.content.length);
      return result;
    }
    const result = { ...defaultData, content: raw };
    logger.info('[Briefing] Read content (no frontmatter), length:', raw.length);
    return result;
  } catch (err) {
    logger.error('Failed to read briefing content:', err);
    return defaultData;
  }
}

/**
 * Write briefing content to file
 */
function writeBriefingContent(topics: string[], content: string): void {
  ensureBriefingStorageDir();
  logger.info('[Briefing] Writing content, topics:', topics, 'content length:', content.length);
  const now = new Date().toISOString();
  const frontmatter = `---
lastGenerated: ${now}
topics: [${topics.map(t => `"${t}"`).join(', ')}]
---

`;
  try {
    writeFileSync(BRIEFING_CONTENT_PATH, frontmatter + content, 'utf-8');
  } catch (err) {
    logger.error('Failed to write briefing content:', err);
    throw err;
  }
}

/**
 * Write briefing to Obsidian vault
 */
function writeToObsidian(vaultPath: string, content: string): { success: boolean; path?: string; error?: string } {
  if (!vaultPath || !existsSync(vaultPath)) {
    return { success: false, error: 'Obsidian vault path is invalid or does not exist' };
  }

  try {
    const date = new Date().toISOString().split('T')[0];
    const fileName = `Daily_Briefing_${date}.md`;
    const filePath = join(vaultPath, fileName);
    writeFileSync(filePath, content, 'utf-8');
    return { success: true, path: filePath };
  } catch (err) {
    logger.error('Failed to write to Obsidian:', err);
    return { success: false, error: String(err) };
  }
}

/**
 * Register Briefing IPC handlers
 */
function registerBriefingHandlers(gatewayManager: GatewayManager): void {
  // Get briefing settings
  ipcMain.handle('briefing:getSettings', async () => {
    try {
      const settings = readBriefingSettings();
      return { success: true, settings };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Save briefing settings
  ipcMain.handle('briefing:saveSettings', async (_, settings: BriefingSettings) => {
    try {
      writeBriefingSettings(settings);
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Get latest briefing content
  ipcMain.handle('briefing:getContent', async () => {
    try {
      const data = readBriefingContent();
      return { success: true, data };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Generate briefing (triggers Gateway RPC)
  ipcMain.handle('briefing:generate', async (_, args: {
    topics?: string[];
    obsidianVaultPath?: string;
    language?: string;
    searchMode?: 'knowledge' | 'web';
  }) => {
    try {
      // EXPLICIT PARAMETER PASSING: Use args.topics first, fallback to settings
      let topicsToSearch: string[];

      if (args.topics && args.topics.length > 0) {
        // Primary: Use explicitly passed topics from frontend
        topicsToSearch = args.topics;
        logger.info('[Briefing] Using explicitly passed topics:', topicsToSearch);
      } else {
        // Fallback: Read from local settings (for backward compatibility/scheduled tasks)
        const savedSettings = readBriefingSettings();
        topicsToSearch = savedSettings.focusTopics;
        logger.info('[Briefing] No topics in args, falling back to settings:', topicsToSearch);
      }

      logger.info('[Briefing] Starting briefing generation for topics:', topicsToSearch, 'mode:', args.searchMode);

      // Build language instruction
      const langInstruction = args.language === 'zh'
        ? '请用简体中文生成简报。'
        : args.language === 'ja'
        ? '日本語で生成してください。'
        : '';

      const topicsList = topicsToSearch.join(', ');

      // Server-side search (using duck-duck-scrape)
      let searchContext = '';
      if (args.searchMode === 'web') {
        logger.info('[Briefing] Performing server-side web search...');
        try {
          const searchResults: Array<{ title: string; url: string; snippet: string }> = [];

          // Search for each topic with delay to avoid rate limiting
          for (let i = 0; i < topicsToSearch.length; i++) {
            const topic = topicsToSearch[i];
            const searchQuery = `${topic} 今日新闻`;
            logger.info('[Briefing] Searching for:', searchQuery);

            // Add delay between requests to avoid rate limiting
            if (i > 0) {
              logger.info('[Briefing] Waiting before next search...');
              await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Use Google News RSS - more reliable for news
            const encodedQuery = encodeURIComponent(topic);
            const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=zh-CN&gl=CN&ceid=CN:zh`;

            logger.info('[Briefing] Fetching RSS from:', rssUrl);

            const response = await fetch(rssUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              }
            });

            const xml = await response.text();
            logger.info('[Briefing] RSS response length:', xml.length);

            // Parse RSS XML
            const results: Array<{ title: string; url: string; snippet: string }> = [];
            const itemRegex = /<item[^>]*>[\s\S]*?<\/item>/gi;
            const itemMatches = xml.match(itemRegex) || [];

            for (const item of itemMatches.slice(0, 10)) {
              const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
              const linkMatch = item.match(/<link>(.*?)<\/link>|<link><!\[CDATA\[(.*?)\]\]><\/link>/);
              const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);

              const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
              const link = linkMatch ? (linkMatch[1] || linkMatch[2] || '').trim() : '';
              const description = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '';

              if (title && link) {
                // Clean HTML from description
                const cleanDesc = description.replace(/<[^>]+>/g, '').substring(0, 200);
                results.push({ title, url: link, snippet: cleanDesc });
              }
            }

            logger.info('[Briefing] Parsed RSS results:', results.length);

            logger.info('[Briefing] HTML search results:', results.length);
            searchResults.push(...results);
          }

          // Format search results as context for LLM
          if (searchResults.length > 0) {
            searchContext = `\n\n## 搜索结果 (Web Search Results):\n\n`;
            for (const r of searchResults) {
              searchContext += `### ${r.title}\n${r.snippet}\n来源: ${r.url}\n\n`;
            }
            logger.info('[Briefing] Search completed, found', searchResults.length, 'results');
            logger.info('[Briefing] Search context length:', searchContext.length);
          } else {
            logger.warn('[Briefing] No search results found');
          }
        } catch (searchError) {
          logger.error('[Briefing] Search failed:', searchError);
          // Continue without search context
        }
      }

      // Build prompt for LLM
      let prompt: string;
      if (args.searchMode === 'web' && searchContext) {
        // Web search mode - use server-side search results
        prompt = `${langInstruction}

请基于以下搜索结果，总结以下话题的最新新闻：${topicsList}
${searchContext}

请以 Obsidian 友好的 Markdown 格式生成每日简报，包含：
1. 每个话题的标题
2. 简要摘要（2-3句话）
3. 相关链接列表

生成一份结构化的每日简报。`;

        logger.info('[Briefing] Using web search mode, prompt length:', prompt.length);
      } else {
        // Knowledge mode - use LLM's internal knowledge only
        prompt = `${langInstruction}

请基于你的知识，总结以下话题的最新动态和重要新闻：${topicsList}

重要提示：
1. 请直接使用你的知识生成简报，禁止使用任何工具或搜索
2. 如果某些话题你不太确定最新信息，请基于你训练数据中关于这些话题的最相关知识来生成
3. 尽量提供准确、客观的摘要
4. 绝对不要尝试调用任何工具

请以 Obsidian 友好的 Markdown 格式生成每日简报，包含：
1. 每个话题的标题
2. 简要摘要（2-3句话）
3. 如果有相关的官方链接或来源也可以列出

生成一份结构化的每日简报。`;
      }

      // Use a fixed session key to REUSE the same OpenClaw process
      // This prevents spawning multiple OpenClaw instances which would exhaust memory
      const sessionKey = 'agent:main:briefing';

      // Call Gateway to generate briefing
      // Use idempotencyKey to ensure the same prompt doesn't produce duplicate runs
      const sendResult = await gatewayManager.rpc<{ runId?: string }>('chat.send', {
        sessionKey,
        message: prompt,
        deliver: false,
        idempotencyKey: `briefing-${Date.now()}`,
      }, 120000);

      logger.info('[Briefing] Chat send result:', JSON.stringify(sendResult));

      // Extract runId from the result
      const runId = sendResult?.runId;
      const sendTimestamp = Date.now();
      logger.info('[Briefing] Run ID:', runId, 'sendTimestamp:', sendTimestamp);

      // Wait for the run to complete and get chat history
      // The chat.send is async, so we need to poll for results
      let briefingContent = '';
      const maxRetries = 20;
      const retryDelay = 3000;

      for (let i = 0; i < maxRetries; i++) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));

        // Try using run.result first (more reliable if runId is available)
        if (runId) {
          try {
            const runResult = await gatewayManager.rpc<{ result?: { content?: string } }>(
              'run.result',
              { runId }
            );
            logger.info(`[Briefing] Run result attempt ${i + 1}:`, JSON.stringify(runResult).substring(0, 300));

            if (runResult?.result?.content) {
              briefingContent = runResult.result.content;
              logger.info('[Briefing] Got content from run.result, length:', briefingContent.length);
              break;
            }
          } catch (e) {
            logger.info(`[Briefing] Run result attempt ${i + 1} failed:`, String(e));
          }
        }

        // Fallback: try chat.history - but ONLY get messages AFTER our sendTimestamp
        // This prevents reading old cached messages from previous briefings
        const historyResult = await gatewayManager.rpc<{
          messages?: Array<{
            role: string;
            content: unknown;
            timestamp?: number;
            createdAtMs?: number;
          }>
        }>(
          'chat.history',
          { sessionKey, limit: 50 }
        );

        logger.info(`[Briefing] History attempt ${i + 1}:`, historyResult ? Object.keys(historyResult) : 'null');
        logger.info(`[Briefing] History messages count:`, historyResult?.messages?.length || 0);

        if (historyResult && historyResult.messages && historyResult.messages.length > 0) {
          const messages = historyResult.messages as Array<{
            role: string;
            content: unknown;
            timestamp?: number;
            createdAtMs?: number;
          }>;

          // Find the newest user message (our prompt) - it should be after sendTimestamp
          const ourUserMsg = [...messages].reverse().find(m =>
            m.role === 'user' &&
            ((m.timestamp && m.timestamp >= sendTimestamp) || (m.createdAtMs && m.createdAtMs >= sendTimestamp))
          );

          // If we can't find our message yet, continue waiting
          if (!ourUserMsg) {
            logger.info(`[Briefing] Our message not found yet in history, waiting...`);
            continue;
          }

          // Now find the FIRST assistant message that comes AFTER our user message
          // This is the actual response to our current prompt
          const msgArray = [...messages];
          const ourUserIndex = msgArray.indexOf(ourUserMsg);

          // Look for assistant messages after our user message
          for (let j = ourUserIndex + 1; j < msgArray.length; j++) {
            const msg = msgArray[j];
            if (msg.role === 'assistant' && msg.content) {
              // Check if it's not an error message
              const contentStr = JSON.stringify(msg.content);
              if (!contentStr.includes('error') && !contentStr.includes('Error')) {
                briefingContent = typeof msg.content === 'string'
                  ? msg.content
                  : JSON.stringify(msg.content);

                if (briefingContent.trim().length > 0 && briefingContent.length > 50) {
                  logger.info('[Briefing] Got content from new assistant message, length:', briefingContent.length);
                  break;
                }
              }
            }
          }

          if (briefingContent) break;
        }
      }

      if (!briefingContent) {
        logger.error('[Briefing] Failed to get briefing content after retries');
        return { success: false, error: 'Failed to generate briefing content' };
      }

      // Save to local storage
      writeBriefingContent(topicsToSearch, briefingContent);

      // Write to Obsidian if path is provided
      let obsidianPath = '';
      if (args.obsidianVaultPath) {
        const obsidianResult = writeToObsidian(args.obsidianVaultPath, briefingContent);
        logger.info('[Briefing] Obsidian write result:', obsidianResult);
        obsidianPath = obsidianResult.path || '';
      }

      // Return content directly to avoid timing issues with file I/O
      return {
        success: true,
        content: briefingContent,
        obsidianPath,
        topics: topicsToSearch,
        lastGenerated: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('[Briefing] Generation failed:', error);
      return { success: false, error: String(error) };
    }
  });

  // Write to Obsidian manually
  ipcMain.handle('briefing:saveToObsidian', async (_, params: {
    vaultPath: string;
    content: string;
  }) => {
    try {
      const result = writeToObsidian(params.vaultPath, params.content);
      return result;
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Get briefing storage path
  ipcMain.handle('briefing:getStoragePath', async () => {
    return {
      settings: BRIEFING_SETTINGS_PATH,
      content: BRIEFING_CONTENT_PATH,
    };
  });

  // Select directory for Obsidian vault
  ipcMain.handle('briefing:selectDirectory', async () => {
    try {
      const result = await dialog.showOpenDialog({
        properties: ['openDirectory', 'createDirectory'],
        title: 'Select Save Folder',
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      return { success: true, path: result.filePaths[0] };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Print HTML to PDF
  ipcMain.handle('briefing:printToPDF', async (_, params: {
    html: string;
    filePath: string;
  }) => {
    try {
      const pdfWindow = new BrowserWindow({
        width: 900,
        height: 1200,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Write HTML to temp file
      const tempHtmlPath = join(tmpdir(), `briefing_${Date.now()}.html`);
      writeFileSync(tempHtmlPath, params.html, 'utf8');

      logger.info('[Briefing] Loading HTML from temp file for PDF');

      // Load HTML
      await pdfWindow.loadFile(tempHtmlPath);

      // Wait for render
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Generate PDF
      const pdfData = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: { marginType: 'custom', top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
        scale: 1.0,
      });

      // Save PDF
      writeFileSync(params.filePath, pdfData);

      // Clean up
      // eslint-disable-next-line no-empty
      try { unlinkSync(tempHtmlPath); } catch {}
      pdfWindow.close();

      logger.info('[Briefing] PDF saved:', params.filePath);
      return { success: true };
    } catch (error) {
      logger.error('[Briefing] PDF generation failed:', error);
      return { success: false, error: String(error) };
    }
  });

  // Generate PDF from HTML (legacy)
  ipcMain.handle('briefing:savePDF', async (_, params: {
    html: string;
    filePath: string;
  }) => {
    try {
      // Create a hidden BrowserWindow to render the HTML and print to PDF
      const pdfWindow = new BrowserWindow({
        width: 900,
        height: 1200,
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      });

      // Write HTML to a temporary file and load from file (more reliable for large content)
      const tempHtmlPath = join(tmpdir(), `briefing_pdf_${Date.now()}.html`);

      // Write HTML to temp file with proper BOM for encoding
      writeFileSync(tempHtmlPath, '\ufeff' + params.html, 'utf8');

      logger.info('[Briefing] Loading HTML from temp file:', tempHtmlPath);

      // Load HTML from file
      await pdfWindow.loadFile(tempHtmlPath);

      // Wait for content to fully render
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Generate PDF with better settings
      const pdfData = await pdfWindow.webContents.printToPDF({
        printBackground: true,
        pageSize: 'A4',
        margins: {
          marginType: 'custom',
          top: 0.4,
          bottom: 0.4,
          left: 0.4,
          right: 0.4,
        },
        scale: 1.0,
      });

      // Write PDF to file
      writeFileSync(params.filePath, pdfData);

      // Clean up temp file
      unlinkSync(tempHtmlPath);

      // Close the window
      pdfWindow.close();

      logger.info('[Briefing] PDF saved to:', params.filePath);
      return { success: true, path: params.filePath };
    } catch (error) {
      logger.error('[Briefing] Failed to save PDF:', error);
      return { success: false, error: String(error) };
    }
  });

  // ============================================================
  // Briefing Scheduled Auto-Generation
  // ============================================================

  let briefingSchedulerInterval: NodeJS.Timeout | null = null;
  let lastGeneratedDate: string | null = null;

  function startBriefingScheduler(gm: GatewayManager): void {
    if (briefingSchedulerInterval) return;

    logger.info('[Briefing Scheduler] Starting scheduler');

    briefingSchedulerInterval = setInterval(async () => {
      try {
        const settings = readBriefingSettings();

        // Check if auto-generation is enabled
        if (!settings.enabled) {
          return;
        }

        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Already generated today, skip
        if (lastGeneratedDate === today) {
          return;
        }

        // Check if it's time to generate (within 1 minute window)
        const [targetHour, targetMinute] = settings.briefingTime.split(':').map(Number);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();

        // Only trigger exactly at the scheduled time
        if (currentHour !== targetHour || currentMinute !== targetMinute) {
          return;
        }

        logger.info('[Briefing Scheduler] Triggering scheduled briefing generation for:', today);

        // Call the briefing:generate IPC handler logic directly
        // We'll invoke ourselves via ipcMain.handle breakdown
        try {
          const generateResult = await generateBriefingInternal(gm, {
            topics: settings.focusTopics,
            obsidianVaultPath: settings.obsidianVaultPath,
            language: 'en',
            searchMode: settings.searchMode || 'web',
          });

          if (generateResult.success) {
            lastGeneratedDate = today;
            logger.info('[Briefing Scheduler] Scheduled briefing generated successfully');
          } else {
            logger.error('[Briefing Scheduler] Failed:', generateResult.error);
          }
        } catch (genError) {
          logger.error('[Briefing Scheduler] Generation error:', genError);
        }
      } catch (error) {
        logger.error('[Briefing Scheduler] Error:', error);
      }
    }, 60000); // Check every minute
  }

  // Internal function to generate briefing (reused by scheduler)
  async function generateBriefingInternal(gm: GatewayManager, args: {
    topics: string[];
    obsidianVaultPath?: string;
    language?: string;
    searchMode?: 'knowledge' | 'web';
  }): Promise<{ success: boolean; content?: string; error?: string }> {
    try {
      const topicsToSearch = args.topics;
      logger.info('[Briefing Scheduler] Generating for topics:', topicsToSearch);

      // Build language instruction
      const langInstruction = args.language === 'zh'
        ? '请用简体中文生成简报。'
        : '';

      const topicsList = topicsToSearch.join(', ');

      // Server-side search
      let searchContext = '';
      if (args.searchMode === 'web') {
        try {
          const searchResults: Array<{ title: string; url: string; snippet: string }> = [];

          for (const topic of topicsToSearch) {
            const encodedQuery = encodeURIComponent(topic);
            const rssUrl = `https://news.google.com/rss/search?q=${encodedQuery}&hl=zh-CN&gl=CN&ceid=CN:zh`;

            const response = await fetch(rssUrl, {
              headers: { 'User-Agent': 'Mozilla/5.0' }
            });

            const xml = await response.text();
            const itemRegex = /<item[^>]*>[\s\S]*?<\/item>/gi;
            const itemMatches = xml.match(itemRegex) || [];

            for (const item of itemMatches.slice(0, 10)) {
              const titleMatch = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
              const linkMatch = item.match(/<link>(.*?)<\/link>|<link><!\[CDATA\[(.*?)\]\]><\/link>/);
              const descMatch = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/);

              const title = titleMatch ? (titleMatch[1] || titleMatch[2] || '').trim() : '';
              const link = linkMatch ? (linkMatch[1] || linkMatch[2] || '').trim() : '';
              const description = descMatch ? (descMatch[1] || descMatch[2] || '').trim() : '';

              if (title && link) {
                const cleanDesc = description.replace(/<[^>]+>/g, '').substring(0, 200);
                searchResults.push({ title, url: link, snippet: cleanDesc });
              }
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          if (searchResults.length > 0) {
            searchContext = '\n\n## 搜索结果:\n\n';
            for (const r of searchResults) {
              searchContext += `### ${r.title}\n${r.snippet}\n来源: ${r.url}\n\n`;
            }
          }
        } catch (searchError) {
          logger.error('[Briefing Scheduler] Search failed:', searchError);
        }
      }

      // Build prompt
      const prompt = `${langInstruction}

请基于以下搜索结果，总结以下话题的最新新闻：${topicsList}
${searchContext}

请以 Markdown 格式生成每日简报。`;

      // Use fixed session for scheduler
      const sessionKey = 'agent:main:briefing';

      // Send message and wait for response
      await gm.rpc('chat.send', {
        sessionKey,
        message: prompt,
        deliver: false,
        idempotencyKey: `scheduled-${Date.now()}`,
      }, 120000);

      // Wait for response
      let briefingContent = '';
      const sendTimestamp = Date.now();

      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 3000));

        const historyResult = await gm.rpc<{ messages: Array<{ role: string; content: unknown; timestamp?: number }> }>('chat.history', { sessionKey, limit: 50 });

        if (historyResult && historyResult.messages && historyResult.messages.length > 0) {
          const messages = historyResult.messages as Array<{ role: string; content: unknown; timestamp?: number }>;

          const ourUserMsg = [...messages].reverse().find(m =>
            m.role === 'user' && m.timestamp && m.timestamp >= sendTimestamp
          );

          if (!ourUserMsg) continue;

          const msgArray = [...messages];
          const ourUserIndex = msgArray.indexOf(ourUserMsg);

          for (let j = ourUserIndex + 1; j < msgArray.length; j++) {
            const msg = msgArray[j];
            if (msg.role === 'assistant' && msg.content) {
              const contentStr = JSON.stringify(msg.content);
              if (!contentStr.includes('error') && contentStr.length > 50) {
                briefingContent = typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content);
                break;
              }
            }
          }

          if (briefingContent) break;
        }
      }

      if (!briefingContent) {
        return { success: false, error: 'Failed to get content' };
      }

      // Save content
      writeBriefingContent(topicsToSearch, briefingContent);

      // Write to Obsidian if path is set
      if (args.obsidianVaultPath) {
        writeToObsidian(args.obsidianVaultPath, briefingContent);
      }

      return { success: true, content: briefingContent };
    } catch (error) {
      logger.error('[Briefing Scheduler] Internal error:', error);
      return { success: false, error: String(error) };
    }
  }

  // Start the scheduler when briefing handlers are registered
  startBriefingScheduler(gatewayManager);
}

// ── Usage (Token Usage Tracking) handlers ─────────────────────────────────

function registerUsageHandlers(): void {
  // Get usage records
  ipcMain.handle('usage:getRecords', async (_, params: { startTime: number; endTime: number }) => {
    try {
      const records = getUsageStats(params.startTime, params.endTime);
      return { success: true, data: records };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Get all usage records (for detailed view)
  ipcMain.handle('usage:getAllRecords', async (_, params?: { limit?: number }) => {
    try {
      const records = loadUsageRecords();
      const limited = params?.limit ? records.slice(-params.limit) : records;
      return { success: true, data: limited };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Clear usage records
  ipcMain.handle('usage:clear', async () => {
    try {
      clearUsageRecords();
      return { success: true };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  });

  // Get current model from settings
  ipcMain.handle('usage:getCurrentModel', async () => {
    try {
      const defaultProviderId = await getDefaultProvider();
      if (defaultProviderId) {
        const provider = await getProvider(defaultProviderId);
        if (provider?.model) {
          return { success: true, model: provider.model };
        }
        // Fall back to default model for this provider type
        const defaultModel = getProviderDefaultModel(defaultProviderId);
        if (defaultModel) {
          return { success: true, model: defaultModel };
        }
      }
      return { success: true, model: 'unknown' };
    } catch (error) {
      return { success: false, model: 'unknown', error: String(error) };
    }
  });
}

// Cache for current model (refreshed periodically)
let cachedModel: string = 'unknown';

async function getCurrentModel(): Promise<string> {
  try {
    const defaultProviderId = await getDefaultProvider();
    if (defaultProviderId) {
      const provider = await getProvider(defaultProviderId);
      if (provider?.model) {
        cachedModel = provider.model;
        return cachedModel;
      }
      // Fall back to default model for this provider type
      const defaultModel = getProviderDefaultModel(defaultProviderId);
      if (defaultModel) {
        cachedModel = defaultModel;
        return cachedModel;
      }
    }
  } catch {
    // Silent fail, use cached model
  }
  return cachedModel;
}
