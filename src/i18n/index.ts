import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// EN
import enCommon from './locales/en/common.json';
import enSettings from './locales/en/settings.json';
import enDashboard from './locales/en/dashboard.json';
import enChat from './locales/en/chat.json';
import enChannels from './locales/en/channels.json';
import enSkills from './locales/en/skills.json';
import enCron from './locales/en/cron.json';
import enSetup from './locales/en/setup.json';
import enTodo from './locales/en/todo.json';
import enBriefing from './locales/en/briefing.json';
import enUsage from './locales/en/usage.json';
import enAccount from './locales/en/account.json';
import enSubscription from './locales/en/subscription.json';

// ZH
import zhCommon from './locales/zh/common.json';
import zhSettings from './locales/zh/settings.json';
import zhDashboard from './locales/zh/dashboard.json';
import zhChat from './locales/zh/chat.json';
import zhChannels from './locales/zh/channels.json';
import zhSkills from './locales/zh/skills.json';
import zhCron from './locales/zh/cron.json';
import zhSetup from './locales/zh/setup.json';
import zhTodo from './locales/zh/todo.json';
import zhBriefing from './locales/zh/briefing.json';
import zhUsage from './locales/zh/usage.json';
import zhAccount from './locales/zh/account.json';
import zhSubscription from './locales/zh/subscription.json';

// JA
import jaCommon from './locales/ja/common.json';
import jaSettings from './locales/ja/settings.json';
import jaDashboard from './locales/ja/dashboard.json';
import jaChat from './locales/ja/chat.json';
import jaChannels from './locales/ja/channels.json';
import jaSkills from './locales/ja/skills.json';
import jaCron from './locales/ja/cron.json';
import jaSetup from './locales/ja/setup.json';
import jaTodo from './locales/ja/todo.json';
import jaBriefing from './locales/ja/briefing.json';
import jaUsage from './locales/ja/usage.json';
import jaAccount from './locales/ja/account.json';
import jaSubscription from './locales/ja/subscription.json';

export const SUPPORTED_LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'zh', label: '中文' },
    { code: 'ja', label: '日本語' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const resources = {
    en: {
        common: enCommon,
        settings: enSettings,
        dashboard: enDashboard,
        chat: enChat,
        channels: enChannels,
        skills: enSkills,
        cron: enCron,
        setup: enSetup,
        todo: enTodo,
        briefing: enBriefing,
        usage: enUsage,
        account: enAccount,
        subscription: enSubscription,
    },
    zh: {
        common: zhCommon,
        settings: zhSettings,
        dashboard: zhDashboard,
        chat: zhChat,
        channels: zhChannels,
        skills: zhSkills,
        cron: zhCron,
        setup: zhSetup,
        todo: zhTodo,
        briefing: zhBriefing,
        usage: zhUsage,
        account: zhAccount,
        subscription: zhSubscription,
    },
    ja: {
        common: jaCommon,
        settings: jaSettings,
        dashboard: jaDashboard,
        chat: jaChat,
        channels: jaChannels,
        skills: jaSkills,
        cron: jaCron,
        setup: jaSetup,
        todo: jaTodo,
        briefing: jaBriefing,
        usage: jaUsage,
        account: jaAccount,
        subscription: jaSubscription,
    },
};

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: 'en', // will be overridden by settings store
        fallbackLng: 'en',
        defaultNS: 'common',
        ns: ['common', 'settings', 'dashboard', 'chat', 'channels', 'skills', 'cron', 'setup', 'todo', 'briefing', 'usage', 'account', 'subscription'],
        interpolation: {
            escapeValue: false, // React already escapes
        },
        react: {
            useSuspense: false,
        },
    });

export default i18n;
