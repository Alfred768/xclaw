/**
 * Account Page
 * Main account management page with section-first navigation for profile/security/developer/usage
 */
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowClockwise } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';
import { ProfileSection } from './ProfileSection';
import { SecuritySection } from './SecuritySection';
import { DeveloperSection } from './DeveloperSection';
import { UsageSection } from './UsageSection';
import { AccountSectionsNav } from './components/AccountSectionsNav';
import { AccountStatePanel, type AccountState } from './components/AccountStatePanel';
import { AccountUsageSummary } from './components/AccountUsageSummary';

export function Account() {
  const { t } = useTranslation('account');
  const navigate = useNavigate();
  const { fetchProfile, fetchQuota, fetchApiKeys, profile, quota, isLoading } = useAccountStore();
  const { isAuthenticated, user, authStatus } = useAuthStore();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!isAuthenticated || !userId) {
      return;
    }

    fetchProfile();
    fetchQuota();
    fetchApiKeys();
  }, [fetchApiKeys, fetchProfile, fetchQuota, isAuthenticated, userId]);

  const sections = [
    { id: 'account-profile', label: t('tabs.profile') },
    { id: 'account-security', label: t('tabs.security') },
    { id: 'account-developer', label: t('tabs.developer') },
    { id: 'account-usage', label: t('tabs.usage', { defaultValue: 'Usage' }) },
  ];

  const accountState: AccountState = !profile && isLoading
    ? 'loading'
    : authStatus === 'error' || authStatus === 'expired'
      ? 'error'
      : profile
        ? 'success'
        : 'empty';

  const usagePercentage = quota?.total_tokens_quota
    ? Math.min((quota.tokens_used / quota.total_tokens_quota) * 100, 100)
    : 0;

  const planLabel = profile?.subscription_tier || t('usage.free', { defaultValue: 'free' });

  const handleRefresh = () => {
    void fetchProfile();
    void fetchQuota();
    void fetchApiKeys();
  };

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
      <div>
        <h1 className="text-2xl font-bold">{t('title')}</h1>
        <p className="text-muted-foreground">{t('subtitle')}</p>
      </div>

      <AccountStatePanel
        state={accountState}
        title={
          accountState === 'loading'
            ? t('state.loadingTitle', { defaultValue: 'Loading your account data...' })
            : accountState === 'error'
              ? t('state.errorTitle', { defaultValue: 'Account status needs attention' })
              : accountState === 'empty'
                ? t('state.emptyTitle', { defaultValue: 'No account data available yet' })
                : t('state.successTitle', { defaultValue: 'Account data is up to date' })
        }
        description={
          accountState === 'error'
            ? t('state.errorDescription', { defaultValue: 'There was a problem during the latest account sync.' })
            : accountState === 'empty'
              ? t('state.emptyDescription', { defaultValue: 'Use refresh to load your profile and quota details.' })
              : t('state.defaultDescription', { defaultValue: 'All account sections remain available below.' })
        }
        action={
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <ArrowClockwise className="mr-2 h-4 w-4" weight="bold" />
            {t('common:actions.refresh', { defaultValue: 'Refresh' })}
          </Button>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-20">
          <AccountSectionsNav sections={sections} />
        </aside>

        <div className="space-y-6">
          <section id="account-overview" className="scroll-mt-24">
            <AccountUsageSummary
              planLabel={planLabel}
              usagePercentage={usagePercentage}
              usedTokens={quota?.tokens_used || 0}
              totalTokens={quota?.total_tokens_quota || 0}
            />
          </section>

          <section
            id="account-profile"
            data-testid="account-section-profile"
            className="scroll-mt-24"
          >
            <ProfileSection />
          </section>

          <section
            id="account-security"
            data-testid="account-section-security"
            className="scroll-mt-24"
          >
            <SecuritySection />
          </section>

          <section
            id="account-developer"
            data-testid="account-section-developer"
            className="scroll-mt-24"
          >
            <DeveloperSection />
          </section>

          <section
            id="account-usage"
            data-testid="account-section-usage"
            className="scroll-mt-24"
          >
            <UsageSection />
          </section>
        </div>
      </div>
    </div>
  );
}

export default Account;
