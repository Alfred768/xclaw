/**
 * Security Section
 * Displays account bindings and logout option
 */
import { useTranslation } from 'react-i18next';
import { Shield, Check, SignOut, Warning, ArrowSquareOut } from '@phosphor-icons/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useEffect, useRef } from 'react';
import { AccountStatePanel, type AccountState } from './components/AccountStatePanel';

export function SecuritySection() {
  const { t } = useTranslation('account');
  const { profile, fetchProfile } = useAccountStore();
  const bindingSubscribedRef = useRef(false);
  const bindSuccessMessage = t('security.bindSuccess', { defaultValue: 'Account bound successfully' });
  const bindExpiredMessage = t('security.bindExpired', { defaultValue: 'Binding session expired' });
  const bindFailedMessage = t('security.bindFailed', { defaultValue: 'Failed to bind account' });
  const logoutConfirmMessage = t('security.logoutConfirm');
  const logoutSuccessMessage = t('security.logoutSuccess', { defaultValue: 'Logged out successfully' });
  const {
    authStatus,
    initAuthFlow,
    loginToken,
    logout,
    oauthUrl,
    user,
  } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!oauthUrl || !loginToken || bindingSubscribedRef.current) {
      return;
    }

    bindingSubscribedRef.current = true;

    const unsubscribe = useAuthStore.getState().subscribeToAuth(async () => {
      const fullUser = await useAuthStore.getState().completeAuthFlow();

      if (!fullUser) {
        return;
      }

      await useAccountStore.getState().fetchProfile();
      toast.success(bindSuccessMessage);
      useAuthStore.getState().resetAuthFlow();
    });

    return () => {
      bindingSubscribedRef.current = false;
      unsubscribe?.();
    };
  }, [bindSuccessMessage, loginToken, oauthUrl]);

  useEffect(() => {
    if (authStatus === 'expired') {
      toast.error(bindExpiredMessage);
      useAuthStore.getState().resetAuthFlow();
    }

    if (authStatus === 'error') {
      toast.error(bindFailedMessage);
      useAuthStore.getState().resetAuthFlow();
    }
  }, [authStatus, bindExpiredMessage, bindFailedMessage]);

  // Handle Alipay binding
  const handleBindAlipay = async () => {
    if (!user?.id) return;
    const result = await initAuthFlow('alipay');
    if (result?.oauthUrl) {
      // Open in new window to avoid closing the app on Electron
      window.open(result.oauthUrl, '_blank', 'width=600,height=700');
    } else {
      toast.error(bindFailedMessage);
    }
  };

  const handleLogout = async () => {
    if (confirm(logoutConfirmMessage)) {
      await logout();
      toast.success(logoutSuccessMessage);
      navigate('/setup');
    }
  };

  const bindingState: AccountState = authStatus === 'pending' || authStatus === 'scanning'
    ? 'loading'
    : authStatus === 'error' || authStatus === 'expired'
      ? 'error'
      : profile?.alipay_user_id
        ? 'success'
        : 'empty';

  return (
    <div className="space-y-6">
      <AccountStatePanel
        state={bindingState}
        title={
          bindingState === 'loading'
            ? t('security.stateLoading', { defaultValue: 'Waiting for account binding result...' })
            : bindingState === 'error'
              ? t('security.stateError', { defaultValue: 'Binding failed or expired' })
              : bindingState === 'success'
                ? t('security.stateSuccess', { defaultValue: 'Your account is bound and ready' })
                : t('security.stateEmpty', { defaultValue: 'Bind an account to unlock linked features' })
        }
        description={
          bindingState === 'error'
            ? t('security.stateErrorDesc', { defaultValue: 'You can retry binding below.' })
            : t('security.description')
        }
      />

      {/* Account Bindings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" weight="regular" />
            {t('security.bindings')}
          </CardTitle>
          <CardDescription>{t('security.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alipay Binding */}
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-300 font-bold text-sm">A</span>
              </div>
              <div className="min-w-0">
                <p className="font-medium">{t('security.alipay')}</p>
                <p className="break-words text-sm text-muted-foreground">
                  {profile?.alipay_user_id
                    ? t('security.alipayBound')
                    : t('security.alipayNotBound')}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {profile?.alipay_user_id ? (
                <Badge variant="default" className="bg-green-500">
                  <Check className="h-3 w-3 mr-1" weight="bold" />
                  {t('security.alipayBound')}
                </Badge>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBindAlipay}
                  disabled={authStatus === 'pending' || authStatus === 'scanning'}
                >
                  <ArrowSquareOut className="h-3 w-3 mr-1" weight="regular" />
                  {t('security.bind')}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Warning className="h-5 w-5" weight="fill" />
            {t('security.dangerZone', { defaultValue: 'Danger Zone' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">{t('security.logout')}</p>
              <p className="break-words text-sm text-muted-foreground">
                {t('security.logoutDesc', { defaultValue: 'Sign out of your account on this device' })}
              </p>
            </div>
            <Button variant="destructive" onClick={handleLogout} className="shrink-0">
              <SignOut className="h-4 w-4 mr-2" weight="regular" />
              {t('security.logout')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
