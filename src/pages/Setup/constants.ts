/**
 * Constants for Setup page
 */

import type { SetupStep, DefaultSkill } from './types';

export const STEP = {
  WELCOME: 0,
  AUTH: 1,
  RUNTIME: 2,
  PROVIDER: 3,
  CHANNEL: 4,
  INSTALLING: 5,
  COMPLETE: 6,
} as const;

export const steps: SetupStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to XClaw',
    description: 'Your AI assistant is ready to be configured',
  },
  {
    id: 'auth',
    title: 'Sign In',
    description: 'Create or sign in to your account',
  },
  {
    id: 'runtime',
    title: 'Environment Check',
    description: 'Verifying system requirements',
  },
  {
    id: 'provider',
    title: 'AI Provider',
    description: 'Configure your AI service',
  },
  {
    id: 'channel',
    title: 'Connect a Channel',
    description: 'Connect a messaging platform (optional)',
  },
  {
    id: 'installing',
    title: 'Setting Up',
    description: 'Installing essential components',
  },
  {
    id: 'complete',
    title: 'All Set!',
    description: 'XClaw is ready to use',
  },
];

export const defaultSkills: DefaultSkill[] = [
  { id: 'opencode', name: 'OpenCode', description: 'AI coding assistant backend' },
  { id: 'python-env', name: 'Python Environment', description: 'Python runtime for skills' },
  { id: 'code-assist', name: 'Code Assist', description: 'Code analysis and suggestions' },
  { id: 'file-tools', name: 'File Tools', description: 'File operations and management' },
  { id: 'terminal', name: 'Terminal', description: 'Shell command execution' },
];
