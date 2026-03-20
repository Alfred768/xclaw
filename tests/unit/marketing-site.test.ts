import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

const projectRoot = resolve(__dirname, '..', '..');
const websiteDir = resolve(projectRoot, 'website');
const authSiteDir = resolve(projectRoot, 'auth-site');

function read(path: string) {
  return readFileSync(path, 'utf8');
}

function loadMarketingSite() {
  const htmlPath = resolve(websiteDir, 'index.html');
  const scriptPath = resolve(websiteDir, 'script.js');
  const html = read(htmlPath);
  const script = read(scriptPath);

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://example.test/',
  });

  dom.window.eval(script);
  dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));

  return dom;
}

function readJson(path: string) {
  return JSON.parse(read(path)) as {
    headers?: Array<{
      source: string;
      headers: Array<{ key: string; value: string }>;
    }>;
  };
}

describe('marketing site polish regression', () => {
  it('ships a Chinese-first homepage without repeated setup sections or exposed script-like copy', () => {
    expect(existsSync(resolve(websiteDir, 'index.html'))).toBe(true);
    expect(existsSync(resolve(websiteDir, 'styles.css'))).toBe(true);
    expect(existsSync(resolve(websiteDir, 'script.js'))).toBe(true);

    const dom = loadMarketingSite();
    const { document } = dom.window;
    const bodyText = document.body.textContent ?? '';

    expect(document.documentElement.lang).toBe('zh-CN');
    expect(document.querySelector('[data-section="hero"]')).not.toBeNull();
    expect(document.querySelector('[data-section="setup-filmstrip"]')).toBeNull();
    expect(document.querySelector('[data-section="setup-demo"]')).not.toBeNull();
    expect(document.querySelector('[data-section="pain-fix"]')).not.toBeNull();
    expect(document.querySelector('[data-section="product-stories"]')).not.toBeNull();
    expect(document.querySelector('[data-section="why-download"]')).not.toBeNull();

    expect(bodyText).toContain('不用先学命令行，也能把 AI agent 跑起来');
    expect(bodyText).toContain('7 步完成上手');
    expect(bodyText).toContain('为什么现在下载');

    expect(bodyText).not.toContain('先让用户看到自己从哪里开始');
    expect(bodyText).not.toContain('对话入口清晰');
    expect(bodyText).not.toContain('建议卡片直接可点');
    expect(bodyText).not.toContain('一眼就知道怎么开始');
    expect(bodyText).not.toContain('主镜头先展示对话怎么开始');
    expect(bodyText).not.toContain('上手节奏');

    expect(document.querySelectorAll('[data-chat-state-option]')).toHaveLength(2);
    expect(document.querySelectorAll('[data-setup-step-button]')).toHaveLength(7);
    expect(document.querySelectorAll('[data-setup-step-icon]')).toHaveLength(7);
    expect(document.querySelector('[data-hero-mode="chat-first"]')).not.toBeNull();
    expect(document.querySelector('[data-setup-layout="giant"]')).not.toBeNull();

    const heroImage = document.querySelector<HTMLImageElement>('[data-hero-image]');
    const setupImage = document.querySelector<HTMLImageElement>('[data-setup-image]');
    expect(heroImage?.getAttribute('src')).toBe('./assets/Image/Function/cn/chat-1.png');
    expect(setupImage?.getAttribute('src')).toBe('./assets/Image/setup/cn/step1.png');
  });

  it('switches copy and image paths to English without reloading the page', () => {
    const dom = loadMarketingSite();
    const { document } = dom.window;
    const englishButton = document.querySelector<HTMLButtonElement>('[data-language-option="en"]');

    englishButton?.click();

    const bodyText = document.body.textContent ?? '';
    expect(document.documentElement.lang).toBe('en');
    expect(bodyText).toContain('Start with a real AI workspace, not a terminal setup');
    expect(bodyText).toContain('7 visible steps to get going');
    expect(bodyText).toContain('Why download now');
    expect(bodyText).not.toContain('Show people where they begin before you explain everything else');
    expect(bodyText).not.toContain('Hero moment');

    const heroImage = document.querySelector<HTMLImageElement>('[data-hero-image]');
    const setupImage = document.querySelector<HTMLImageElement>('[data-setup-image]');
    expect(heroImage?.getAttribute('src')).toBe('./assets/Image/Function/en/chat-1.png');
    expect(setupImage?.getAttribute('src')).toBe('./assets/Image/setup/en/step1.png');
  });

  it('switches only chat states in the hero while keeping the image proof in sync', () => {
    const dom = loadMarketingSite();
    const { document } = dom.window;
    const activeChatStateButton = document.querySelector<HTMLButtonElement>('[data-chat-state-option="active"]');

    activeChatStateButton?.click();

    const heroImage = document.querySelector<HTMLImageElement>('[data-hero-image]');
    expect(heroImage?.getAttribute('src')).toBe('./assets/Image/Function/cn/chat-2.png');
  });

  it('shows setup login substates only in step 2 and removes them on other steps', () => {
    const dom = loadMarketingSite();
    const { document } = dom.window;
    const substepList = document.querySelector<HTMLElement>('[data-setup-substep-list]');

    expect(substepList?.hidden).toBe(true);
    expect(substepList?.children.length).toBe(0);

    const loginStepButton = document.querySelector<HTMLButtonElement>('[data-setup-step-button="step2"]');
    loginStepButton?.click();

    const setupImage = document.querySelector<HTMLImageElement>('[data-setup-image]');
    expect(substepList?.hidden).toBe(false);
    expect(document.querySelector('[data-setup-substep-option="step2-1"]')).not.toBeNull();
    expect(document.querySelector('[data-setup-substep-option="step2-2"]')).not.toBeNull();
    expect(setupImage?.getAttribute('src')).toBe('./assets/Image/setup/cn/step2-1.png');

    const loginSuccessButton = document.querySelector<HTMLButtonElement>('[data-setup-substep-option="step2-2"]');
    loginSuccessButton?.click();
    expect(setupImage?.getAttribute('src')).toBe('./assets/Image/setup/cn/step2-2.png');

    const providerStepButton = document.querySelector<HTMLButtonElement>('[data-setup-step-button="step4"]');
    providerStepButton?.click();
    expect(substepList?.hidden).toBe(true);
    expect(substepList?.children.length).toBe(0);
    expect(setupImage?.getAttribute('src')).toBe('./assets/Image/setup/cn/step4.png');
  });

  it('still updates pain states, product stories, and plan demo content through interaction state', () => {
    const dom = loadMarketingSite();
    const { document } = dom.window;

    const automationPainButton = document.querySelector<HTMLButtonElement>('[data-pain-option="automation"]');
    automationPainButton?.click();

    const painAfterTitle = document.querySelector<HTMLElement>('[data-pain-after-title]');
    expect(painAfterTitle?.textContent).toContain('自动化');

    const beforeCard = document.querySelector<HTMLElement>('.before-card');
    expect(beforeCard?.getAttribute('data-tone')).toBe('muted');

    const automateClusterButton = document.querySelector<HTMLButtonElement>('[data-story-cluster-option="automate"]');
    automateClusterButton?.click();

    const todoSurfaceButton = document.querySelector<HTMLButtonElement>('[data-story-surface-option="todo"]');
    todoSurfaceButton?.click();

    const storyImage = document.querySelector<HTMLImageElement>('[data-story-image]');
    const storyTitle = document.querySelector<HTMLElement>('[data-story-title]');
    expect(storyImage?.getAttribute('src')).toBe('./assets/Image/Function/cn/todo.png');
    expect(storyTitle?.textContent).toContain('待办');

    const yearlyButton = document.querySelector<HTMLButtonElement>('[data-plan-option="yearly"]');
    yearlyButton?.click();

    const tokenLabel = document.querySelector<HTMLElement>('[data-plan-tokens]');
    expect(tokenLabel?.textContent).toContain('100M');
  });

  it('uses a safe Vercel config for the standalone marketing site', () => {
    const configPath = resolve(websiteDir, 'vercel.json');
    expect(existsSync(configPath)).toBe(true);

    const config = readJson(configPath);
    const unsafeRule = config.headers?.find((rule) =>
      rule.source === '/(.*)' &&
      rule.headers.some((header) => header.key === 'Content-Type' && header.value.includes('text/html'))
    );

    expect(unsafeRule).toBeUndefined();
  });
});

describe('auth callback site', () => {
  it('ships auth callback assets in a dedicated static directory', () => {
    const htmlPath = resolve(authSiteDir, 'auth-result.html');
    const logoPath = resolve(authSiteDir, 'logo.png');

    expect(existsSync(htmlPath)).toBe(true);
    expect(existsSync(logoPath)).toBe(true);
    expect(read(htmlPath)).toContain('logo.png');
  });

  it('uses a safe Vercel config for auth callback hosting', () => {
    const configPath = resolve(authSiteDir, 'vercel.json');
    expect(existsSync(configPath)).toBe(true);

    const config = readJson(configPath);
    const unsafeRule = config.headers?.find((rule) =>
      rule.source === '/(.*)' &&
      rule.headers.some((header) => header.key === 'Content-Type' && header.value.includes('text/html'))
    );

    expect(unsafeRule).toBeUndefined();
  });
});
