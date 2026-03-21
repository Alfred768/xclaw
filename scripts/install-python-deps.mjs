#!/usr/bin/env node

/**
 * Install Python dependencies for XClaw
 * This script runs after pnpm install to set up required Python packages
 * Installs packages to the user's Python environment (pip3 --user)
 */

import { spawn } from 'child_process';

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      shell: process.platform === 'win32',
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function main() {
  console.log('Installing Python dependencies for XClaw...');

  try {
    // Install PyPDF2 to user site-packages using pip3
    console.log('Installing PyPDF2 using pip3 --user...');
    await runCommand('pip3', ['install', '--user', 'PyPDF2']);

    console.log('✅ Python dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install Python dependencies:', error.message);
    // Don't fail the installation, just warn
    console.warn('⚠️ Continuing without Python dependencies...');
  }
}

main();
