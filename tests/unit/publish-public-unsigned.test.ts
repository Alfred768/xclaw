import { accessSync, constants, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(__dirname, '..', '..');
const scriptPath = resolve(projectRoot, 'publish', 'publish-public-unsigned.sh');

function read(path: string) {
  return readFileSync(path, 'utf8');
}

describe('publish-public-unsigned script', () => {
  it('exists and wires unsigned mac build + xclaw release', () => {
    expect(existsSync(scriptPath)).toBe(true);
    expect(() => accessSync(scriptPath, constants.X_OK)).not.toThrow();

    const content = read(scriptPath);
    expect(content).toContain('publish-public-unsigned');
    expect(content).toContain('CSC_IDENTITY_AUTO_DISCOVERY=false');
    expect(content).toContain('--publish never');
    expect(content).toContain('--config');
    expect(content).toContain('Alfred768/xclaw');
    expect(content).toContain('latest');
  });
});
