import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';

const repoRoot = join(__dirname, '..', '..');
const scriptPath = join(repoRoot, 'scripts', 'export-public-repo.sh');
const isWindows = process.platform === 'win32';
const describeIfPosix = isWindows ? describe.skip : describe;

describeIfPosix('export-public-repo.sh', () => {
  it('refuses unsafe target paths', () => {
    expect(() => execFileSync(scriptPath, [repoRoot], { stdio: 'pipe' })).toThrow();
  });

  it('exports allow-listed content and excludes private paths', () => {
    const privateDir = mkdtempSync(join(tmpdir(), 'xclaw-private-'));
    const publicDir = mkdtempSync(join(tmpdir(), 'xclaw-public-'));

    mkdirSync(join(privateDir, 'src'), { recursive: true });
    writeFileSync(join(privateDir, 'src', 'ok.txt'), 'ok');
    mkdirSync(join(privateDir, 'supabase'), { recursive: true });
    writeFileSync(join(privateDir, 'supabase', 'secret.txt'), 'no');

    execFileSync(scriptPath, ['--source', privateDir, publicDir], { stdio: 'pipe' });

    expect(existsSync(join(publicDir, 'src', 'ok.txt'))).toBe(true);
    expect(existsSync(join(publicDir, 'supabase'))).toBe(false);
  });
});
