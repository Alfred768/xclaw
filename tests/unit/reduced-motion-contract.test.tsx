import fs from 'node:fs';
import path from 'node:path';

const TOKENS_PATH = path.resolve(process.cwd(), 'src/styles/tokens.css');
const GLOBALS_PATH = path.resolve(process.cwd(), 'src/styles/globals.css');

const readCss = (filePath: string) => fs.readFileSync(filePath, 'utf8');

const findVarValue = (css: string, selectorPattern: RegExp, varName: string) => {
  const selectorMatch = css.match(selectorPattern);
  if (!selectorMatch) return '';

  const block = selectorMatch[0];
  const varMatch = block.match(new RegExp(`${varName}\\s*:\\s*([^;]+);`));
  return varMatch?.[1]?.trim() ?? '';
};

describe('token, typography and reduced-motion contract', () => {
  it('exposes semantic token values for both themes', () => {
    const tokensCss = readCss(TOKENS_PATH);
    const globalsCss = readCss(GLOBALS_PATH);

    const rootBlockPattern = /:root\s*\{[\s\S]*?\n\s*\}/;
    const darkBlockPattern = /\.dark\s*\{[\s\S]*?\n\s*\}/;

    const lightBackground = findVarValue(globalsCss, rootBlockPattern, '--background');
    const darkBackground = findVarValue(globalsCss, darkBlockPattern, '--background');
    const lightForeground = findVarValue(globalsCss, rootBlockPattern, '--foreground');
    const darkForeground = findVarValue(globalsCss, darkBlockPattern, '--foreground');

    expect(lightBackground).not.toEqual('');
    expect(darkBackground).not.toEqual('');
    expect(lightForeground).not.toEqual('');
    expect(darkForeground).not.toEqual('');
    expect(findVarValue(globalsCss, rootBlockPattern, '--ring')).not.toEqual('');
    expect(tokensCss).toMatch(/--radius-md\s*:/);
    expect(tokensCss).toMatch(/--spacing-md\s*:/);
    expect(tokensCss).toMatch(/--shadow-sm\s*:/);
    expect(lightBackground).not.toEqual(darkBackground);
    expect(lightForeground).not.toEqual(darkForeground);
  });

  it('includes planned sans and mono fallback font stacks', () => {
    const tokensCss = readCss(TOKENS_PATH);
    const globalsCss = readCss(GLOBALS_PATH);

    expect(tokensCss).toMatch(/--font-sans\s*:\s*"IBM Plex Sans"/i);
    expect(tokensCss).toMatch(/"Noto Sans SC"/i);
    expect(tokensCss).toMatch(/"Segoe UI"/i);

    expect(tokensCss).toMatch(/--font-mono\s*:\s*"IBM Plex Mono"/i);
    expect(tokensCss).toMatch(/"SF Mono"/i);

    expect(globalsCss).toMatch(/body\s*\{[\s\S]*font-family:\s*var\(--font-sans\);/i);
  });

  it('falls back to non-custom fonts when custom fonts are unavailable', () => {
    const tokensCss = readCss(TOKENS_PATH);

    expect(tokensCss).toMatch(/--font-sans\s*:[^;]*"Segoe UI"[^;]*sans-serif/i);
    expect(tokensCss).toMatch(/--font-mono\s*:[^;]*"SF Mono"[^;]*monospace/i);
  });

  it('defines reduced-motion media override that zeros motion duration tokens', () => {
    const globalsCss = readCss(GLOBALS_PATH);

    expect(globalsCss).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(globalsCss).toMatch(/--duration-fast:\s*0ms/);
    expect(globalsCss).toMatch(/--duration-normal:\s*0ms/);
  });
});
