/**
 * Security Section
 * Displays account bindings and logout option
 */
import { useTranslation } from 'react-i18next';
import { Shield, Check, LogOut, AlertTriangle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { initAuthSession } from '@/lib/supabase';
import { useEffect } from 'react';

export function SecuritySection() {
  const { t } = useTranslation('account');
  const { profile, fetchProfile } = useAccountStore();
  const { logout, user } = useAuthStore();
  const navigate = useNavigate();

  // Fetch latest profile data when component mounts
  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handle Alipay binding
  const handleBindAlipay = async () => {
    if (!user?.id) return;
    const result = await initAuthSession('alipay', user.id);
    if (result?.oauthUrl) {
      // Open in new window to avoid closing the app on Electron
      window.open(result.oauthUrl, '_blank', 'width=600,height=700');
    } else {
      toast.error(t('security.bindFailed', { defaultValue: 'Failed to initiate binding' }));
    }
  };

  const handleLogout = async () => {
    if (confirm(t('security.logoutConfirm'))) {
      await logout();
      toast.success(t('security.logoutSuccess', { defaultValue: 'Logged out successfully' }));
      navigate('/');
    }
  };

  return (
    <div className="space-y-6">
      {/* Account Bindings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            {t('security.bindings')}
          </CardTitle>
          <CardDescription>{t('security.description')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Alipay Binding */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-300 font-bold text-sm">A</span>
              </div>
              <div>
                <p className="font-medium">{t('security.alipay')}</p>
                <p className="text-sm text-muted-foreground">
                  {profile?.alipay_user_id
                    ? t('security.alipayBound')
                    : t('security.alipayNotBound')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {profile?.alipay_user_id ? (
                <Badge variant="default" className="bg-green-500">
                  <Check className="h-3 w-3 mr-1" />
                  {t('security.alipayBound')}
                </Badge>
              ) : (
                <Button variant="outline" size="sm" onClick={handleBindAlipay}>
                  <ExternalLink className="h-3 w-3 mr-1" />
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
            <AlertTriangle className="h-5 w-5" />
            {t('security.dangerZone', { defaultValue: 'Danger Zone' })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('security.logout')}</p>
              <p className="text-sm text-muted-foreground">
                {t('security.logoutDesc', { defaultValue: 'Sign out of your account on this device' })}
              </p>
            </div>
            <Button variant="destructive" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              {t('security.logout')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
