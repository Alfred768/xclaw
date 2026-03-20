/**
 * Account Page
 * Main account management page with tabs for profile, security, usage, and developer settings
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Shield, BarChart2, Code } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAccountStore } from '@/stores/account';
import { ProfileSection } from './ProfileSection';
import { SecuritySection } from './SecuritySection';
import { UsageSection } from './UsageSection';
import { DeveloperSection } from './DeveloperSection';

export function Account() {
  const { t } = useTranslation('account');
  const { fetchProfile, fetchQuota, fetchApiKeys, isLoading } = useAccountStore();

  useEffect(() => {
    fetchProfile();
    fetchQuota();
    fetchApiKeys();
  }, [fetchProfile, fetchQuota, fetchApiKeys]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="profile" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.profile')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.security')}</span>
          </TabsTrigger>
          <TabsTrigger value="usage" className="flex items-center gap-2">
            <BarChart2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.usage')}</span>
          </TabsTrigger>
          <TabsTrigger value="developer" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span className="hidden sm:inline">{t('tabs.developer')}</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileSection />
        </TabsContent>

        <TabsContent value="security" className="mt-6">
          <SecuritySection />
        </TabsContent>

        <TabsContent value="usage" className="mt-6">
          <UsageSection />
        </TabsContent>

        <TabsContent value="developer" className="mt-6">
          <DeveloperSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Account;
