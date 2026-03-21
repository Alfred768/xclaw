/**
 * Account Page
 * Main account management page with tabs for profile, security, usage, and developer settings
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Shield, Code } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';
import { ProfileSection } from './ProfileSection';
import { SecuritySection } from './SecuritySection';
import { DeveloperSection } from './DeveloperSection';

export function Account() {
  const { t } = useTranslation('account');
  const navigate = useNavigate();
  const { fetchProfile, fetchQuota, fetchApiKeys } = useAccountStore();
  const { isAuthenticated, user } = useAuthStore();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return;
    }

    fetchProfile();
    fetchQuota();
    fetchApiKeys();
  }, [fetchApiKeys, fetchProfile, fetchQuota, isAuthenticated, userId]);

  if (!isAuthenticated || !userId) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">{t('subtitle')}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('unauthenticated.title', { defaultValue: 'Please sign in to manage your account' })}</CardTitle>
            <CardDescription>
              {t('unauthenticated.description', {
                defaultValue: 'Account bindings, profile editing, and API keys require an active sign-in session.',
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate('/setup')}>
              {t('unauthenticated.action', { defaultValue: 'Go to Sign In' })}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" weight="regular" />
            <span className="hidden sm:inline">{t('tabs.profile')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" weight="regular" />
            <span className="hidden sm:inline">{t('tabs.security')}</span>
          </TabsTrigger>
          <TabsTrigger value="developer" className="flex items-center gap-2">
            <Code className="h-4 w-4" weight="regular" />
            <span className="hidden sm:inline">{t('tabs.developer')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSection />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySection />
        </TabsContent>

        <TabsContent value="developer" className="mt-6">
          <DeveloperSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Account;
