/**
 * Shared types for Setup page
 */

export interface SetupStep {
  id: string;
  title: string;
  description: string;
}

export interface DefaultSkill {
  id: string;
  name: string;
  description: string;
}

export type InstallStatus = 'pending' | 'installing' | 'completed' | 'failed';

export interface SkillInstallState {
  id: string;
  name: string;
  description: string;
  status: InstallStatus;
}
