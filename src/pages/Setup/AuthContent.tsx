/**
 * AuthContent Component
 * QR code login component for WeChat/Alipay
 */
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCodeSVG } from 'qrcode.react';
import {
  CheckCircle2,
  Loader2,
  RefreshCw,
  Smartphone,
  Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from 'react-i18next';

interface AuthContentProps {
  onComplete: () => void;
}

type Provider = 'wechat' | 'alipay';

const providerConfig: Record<Provider, {
  id: Provider;
  icon: typeof Smartphone;
  color: string;
  bgColor: string;
}> = {
  wechat: {
    id: 'wechat',
    icon: Smartphone,
    color: 'text-green-600',
    bgColor: 'bg-green-500 hover:bg-green-600',
  },
  alipay: {
    id: 'alipay',
    icon: Wallet,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500 hover:bg-blue-600',
  },
};

export function AuthContent({ onComplete }: AuthContentProps) {
  const { t } = useTranslation('setup');
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    authStatus,
    oauthUrl,
    loginToken,
    user,
    initAuthFlow,
    subscribeToAuth,
    completeAuthFlow,
    resetAuthFlow,
  } = useAuthStore();

  const handleProviderSelect = async (provider: Provider) => {
    setSelectedProvider(provider);
    setIsGenerating(true);

    await initAuthFlow(provider);

    // 不需要手动调用 startWatching，useEffect 会根据 oauthUrl 变化自动处理
    setIsGenerating(false);
  };

  // 监听 oauthUrl 和 loginToken 变化，自动开始订阅
  // 注意：不依赖 authStatus，避免 race condition
  useEffect(() => {
    if (!oauthUrl || !loginToken) return;

    console.log('[AuthContent] Starting subscription for loginToken:', loginToken?.substring(0, 8) + '...');

    const unsubscribe = subscribeToAuth(async (_authUser) => {
      console.log('[AuthContent] Auth callback triggered');
      // Auth completed, fetch full user data
      const fullUser = await completeAuthFlow();

      if (fullUser) {
        console.log('[AuthContent] Full user data fetched, calling onComplete');
        onComplete();
      }
    });

    return () => {
      console.log('[AuthContent] Cleaning up subscription');
      unsubscribe?.();
    };
  }, [oauthUrl, loginToken, subscribeToAuth, completeAuthFlow, onComplete]);

  const handleRefresh = () => {
    resetAuthFlow();
    if (selectedProvider) {
      handleProviderSelect(selectedProvider);
    }
  };

  // Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      resetAuthFlow();
    };
  }, [resetAuthFlow]);

  const renderProviderSelection = () => {
    const provider: Provider = 'alipay';
    const config = providerConfig[provider];
    const Icon = config.icon;

    return (
      <div className="space-y-6">
        <p className="text-center text-muted-foreground">
          {t('auth.selectProvider')}
        </p>

        <div className="flex justify-center">
          <button
            onClick={() => handleProviderSelect(provider)}
            disabled={isGenerating}
            className={cn(
              'flex flex-col items-center gap-3 rounded-xl p-6 transition-all',
              'border-2 border-transparent hover:border-primary/30',
              'bg-muted/50 hover:bg-muted',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <div className={cn('rounded-full p-4', config.bgColor, 'text-white')}>
              <Icon className="h-8 w-8" />
            </div>
            <span className="font-medium">{t(`auth.${provider}`)}</span>
          </button>
        </div>
      </div>
    );
  };

  const renderQRCode = () => {
    if (!oauthUrl || !selectedProvider) return null;

    const isExpired = authStatus === 'expired';
    const isError = authStatus === 'error';

    return (
      <div className="flex flex-col items-center space-y-4">
        <p className="text-center text-muted-foreground">
          {t('auth.scanQR', { provider: t(`auth.${selectedProvider}`) })}
        </p>

        <div className="relative">
          <div
            className={cn(
              'rounded-xl bg-white p-4 shadow-lg',
              (isExpired || isError) && 'opacity-50'
            )}
          >
            <QRCodeSVG
              value={oauthUrl}
              size={200}
              level="H"
              includeMargin={false}
            />

            {(isExpired || isError) && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                <div className="text-center">
                  {isExpired ? (
                    <p className="text-white font-medium">{t('auth.expired')}</p>
                  ) : (
                    <p className="text-white font-medium">{t('auth.error')}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {authStatus === 'scanning' && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">{t('auth.scanning')}</span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          {t('auth.refreshQR')}
        </Button>
      </div>
    );
  };

  const renderSuccess = () => {
    if (!user) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center space-y-4"
      >
        <div className="flex items-center justify-center rounded-full bg-green-100 p-3">
          <CheckCircle2 className="h-8 w-8 text-green-600" />
        </div>

        <h3 className="text-xl font-semibold">{t('auth.loginSuccess')}</h3>

        <p className="text-muted-foreground">
          {t('auth.welcomeUser', { user: user.displayName || 'User' })}
        </p>

        {user.avatarUrl && (
          <img
            src={user.avatarUrl}
            alt={user.displayName || 'Avatar'}
            className="h-16 w-16 rounded-full"
          />
        )}
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{t('auth.title')}</h2>
        <p className="text-muted-foreground">{t('auth.description')}</p>
      </div>

      <AnimatePresence mode="wait">
        {authStatus === 'completed' ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderSuccess()}
          </motion.div>
        ) : !selectedProvider || authStatus === 'idle' ? (
          <motion.div
            key="select"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderProviderSelection()}
          </motion.div>
        ) : (
          <motion.div
            key="qrcode"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {renderQRCode()}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
