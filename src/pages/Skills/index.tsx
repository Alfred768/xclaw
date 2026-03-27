/**
 * Skills Page
 * Browse and manage AI skills
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowClockwise, FolderOpen, MagnifyingGlass, Package, PuzzlePiece, ShieldCheck, WarningCircle, X } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSkillsStore } from '@/stores/skills';
import { useGatewayStore } from '@/stores/gateway';
import { toast } from 'sonner';
import type { FormEvent } from 'react';
import type { Skill } from '@/types/skill';
import { useTranslation } from 'react-i18next';
import { SkillCard } from './components/SkillCard';
import { MarketplaceSkillCard } from './components/MarketplaceSkillCard';
import { SkillDetailDialog } from './components/SkillDetailDialog';
import { SkillsStateCard } from './components/SkillsStateCard';
import { getSkillsElectronBridge } from './electronBridge';

const SOURCE_FILTERS = ['all', 'built-in', 'marketplace'] as const;

type SourceFilter = (typeof SOURCE_FILTERS)[number];

function sortSkills(a: Skill, b: Skill) {
  if (a.enabled && !b.enabled) return -1;
  if (!a.enabled && b.enabled) return 1;
  if (a.isCore && !b.isCore) return -1;
  if (!a.isCore && b.isCore) return 1;
  return a.name.localeCompare(b.name);
}

function formatCountLabel(label: string, count: number) {
  return `${label}: ${count}`;
}

export function Skills() {
  const {
    skills,
    loading,
    error,
    fetchSkills,
    enableSkill,
    disableSkill,
    searchResults,
    searchSkills,
    installSkill,
    uninstallSkill,
    searching,
    searchError,
    installing,
  } = useSkillsStore();
  const { t } = useTranslation('skills');
  const gatewayStatus = useGatewayStore((state) => state.status);
  const [searchQuery, setSearchQuery] = useState('');
  const [marketplaceQuery, setMarketplaceQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [activeTab, setActiveTab] = useState<'installed' | 'marketplace'>('installed');
  const [selectedSource, setSelectedSource] = useState<SourceFilter>('all');
  const marketplaceDiscoveryAttemptedRef = useRef(false);
  const [showGatewayWarning, setShowGatewayWarning] = useState(false);

  const isGatewayRunning = gatewayStatus.state === 'running';

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    if (!isGatewayRunning) {
      timer = setTimeout(() => {
        setShowGatewayWarning(true);
      }, 1500);
    } else {
      timer = setTimeout(() => {
        setShowGatewayWarning(false);
      }, 0);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isGatewayRunning]);

  useEffect(() => {
    if (isGatewayRunning) {
      void fetchSkills();
    }
  }, [fetchSkills, isGatewayRunning]);

  useEffect(() => {
    if (activeTab !== 'marketplace') return;
    if (marketplaceQuery.trim()) return;
    if (searching) return;
    if (marketplaceDiscoveryAttemptedRef.current) return;

    marketplaceDiscoveryAttemptedRef.current = true;
    void searchSkills('');
  }, [activeTab, marketplaceQuery, searching, searchSkills]);

  useEffect(() => {
    if (activeTab === 'marketplace' && marketplaceQuery === '' && marketplaceDiscoveryAttemptedRef.current) {
      void searchSkills('');
    }
  }, [activeTab, marketplaceQuery, searchSkills]);

  const hasInstalledSkills = useMemo(
    () => skills.some((skill) => !skill.isBundled),
    [skills]
  );

  const sourceStats = useMemo(() => ({
    all: skills.length,
    builtIn: skills.filter((skill) => skill.isBundled).length,
    marketplace: skills.filter((skill) => !skill.isBundled).length,
    enabled: skills.filter((skill) => skill.enabled).length,
  }), [skills]);

  const filteredSkills = useMemo(() => {
    return skills
      .filter((skill) => {
        const matchesSearch = skill.name.toLowerCase().includes(searchQuery.toLowerCase())
          || skill.description.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesSource = true;
        if (selectedSource === 'built-in') {
          matchesSource = !!skill.isBundled;
        } else if (selectedSource === 'marketplace') {
          matchesSource = !skill.isBundled;
        }

        return matchesSearch && matchesSource;
      })
      .sort(sortSkills);
  }, [searchQuery, selectedSource, skills]);

  const handleToggle = useCallback(async (skillId: string, enable: boolean) => {
    try {
      if (enable) {
        await enableSkill(skillId);
        toast.success(t('toast.enabled'));
      } else {
        await disableSkill(skillId);
        toast.success(t('toast.disabled'));
      }
    } catch (error) {
      toast.error(String(error));
    }
  }, [disableSkill, enableSkill, t]);

  const handleOpenSkillsFolder = useCallback(async () => {
    try {
      const bridge = getSkillsElectronBridge();
      const skillsDir = await bridge.ipcRenderer.invoke('openclaw:getSkillsDir') as string;
      if (!skillsDir) {
        throw new Error('Skills directory not available');
      }

      const result = await bridge.ipcRenderer.invoke('shell:openPath', skillsDir) as string;
      if (result) {
        if (
          result.toLowerCase().includes('no such file')
          || result.toLowerCase().includes('not found')
          || result.toLowerCase().includes('failed to open')
        ) {
          toast.error(t('toast.failedFolderNotFound'));
        } else {
          throw new Error(result);
        }
      }
    } catch (error) {
      toast.error(`${t('toast.failedOpenFolder')}: ${String(error)}`);
    }
  }, [t]);

  const handleMarketplaceSearch = useCallback((event: FormEvent) => {
    event.preventDefault();
    marketplaceDiscoveryAttemptedRef.current = true;
    void searchSkills(marketplaceQuery);
  }, [marketplaceQuery, searchSkills]);

  const handleInstall = useCallback(async (slug: string) => {
    try {
      await installSkill(slug);
      await enableSkill(slug);
      toast.success(t('toast.installed'));
    } catch (error) {
      toast.error(`${t('toast.failedInstall')}: ${String(error)}`);
    }
  }, [enableSkill, installSkill, t]);

  const handleUninstall = useCallback(async (slug: string) => {
    try {
      await uninstallSkill(slug);
      toast.success(t('toast.uninstalled'));
    } catch (error) {
      toast.error(`${t('toast.failedUninstall')}: ${String(error)}`);
    }
  }, [t, uninstallSkill]);

  const openSkillDetail = (skill: Skill) => {
    setSelectedSkill(skill);
  };

  const installedEmptyTitle = searchQuery ? t('noSkills') : t('noSkillsAvailable');
  const installedEmptyDescription = searchQuery ? t('noSkillsSearch') : t('marketplace.emptyPrompt');

  const marketplaceCount = searchResults.length;

  if (loading) {
    return (
      <div className="space-y-6" data-testid="skills-page-root">
        <Card className="border-border/70 bg-card/80 shadow-sm" data-testid="skills-state-loading">
          <CardContent className="flex items-center gap-3 p-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/70 bg-muted/50">
              <ArrowClockwise className="h-5 w-5 animate-spin text-muted-foreground" weight="bold" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">{t('title')}</p>
              <p className="text-sm text-muted-foreground">{t('loading', { defaultValue: 'Loading skills...' })}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="skills-page-root">
      <Card className="overflow-hidden border-border/70 bg-card/80 shadow-sm">
        <CardContent className="space-y-5 p-5 lg:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">
                {formatCountLabel(t('detail.enabled'), sourceStats.enabled)}
              </p>
              <div className="space-y-1">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">{t('title')}</h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{t('subtitle')}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={() => void fetchSkills()} disabled={!isGatewayRunning} data-testid="skills-refresh-action">
                <ArrowClockwise className="mr-2 h-4 w-4" weight="regular" />
                {t('refresh')}
              </Button>
              {hasInstalledSkills ? (
                <Button variant="outline" onClick={handleOpenSkillsFolder} data-testid="skills-open-folder-action">
                  <FolderOpen className="mr-2 h-4 w-4" weight="regular" />
                  {t('openFolder')}
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              {t('filter.all', { count: sourceStats.all })}
            </span>
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              {t('detail.enabled')}: {sourceStats.enabled}
            </span>
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              {t('filter.builtIn', { count: sourceStats.builtIn })}
            </span>
            <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
              {t('filter.marketplace', { count: sourceStats.marketplace })}
            </span>
          </div>
        </CardContent>
      </Card>

      {showGatewayWarning ? (
        <Card className="border-yellow-500/40 bg-yellow-50/70 dark:bg-yellow-900/10">
          <CardContent className="flex items-start gap-3 px-4 py-4 text-sm text-yellow-800 dark:text-yellow-200">
            <WarningCircle className="mt-0.5 h-5 w-5 shrink-0" weight="fill" />
            <p>{t('gatewayWarning')}</p>
          </CardContent>
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'installed' | 'marketplace')} className="space-y-4">
        <div className="rounded-2xl border border-border/70 bg-background/75 p-2 shadow-sm">
          <TabsList className="grid w-full grid-cols-2 bg-transparent p-0">
            <TabsTrigger value="installed" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <PuzzlePiece className="h-4 w-4" weight="regular" />
              {t('tabs.installed')}
            </TabsTrigger>
            <TabsTrigger value="marketplace" className="gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
              <Package className="h-4 w-4" weight="regular" />
              {t('tabs.marketplace')}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="installed" className="space-y-4">
          <Card className="border-border/70 bg-card/80 shadow-sm">
            <CardContent className="space-y-4 p-4 lg:p-5">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="relative">
                  <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('search')}
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="h-11 pl-9 pr-9"
                    data-testid="skills-search-input"
                  />
                  {searchQuery ? (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setSearchQuery('')}
                      aria-label={t('common:actions.close')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {SOURCE_FILTERS.map((filter) => (
                    <Button
                      key={filter}
                      type="button"
                      variant={selectedSource === filter ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setSelectedSource(filter)}
                      className="gap-2"
                      data-testid={`skills-source-${filter}`}
                    >
                      {filter === 'all' ? t('filter.all', { count: sourceStats.all }) : null}
                      {filter === 'built-in' ? t('filter.builtIn', { count: sourceStats.builtIn }) : null}
                      {filter === 'marketplace' ? t('filter.marketplace', { count: sourceStats.marketplace }) : null}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {error ? (
            <SkillsStateCard
              variant="error"
              title={t('title')}
              description={error}
              testId="skills-state-error"
            />
          ) : null}

          {filteredSkills.length === 0 ? (
            <SkillsStateCard
              variant="empty"
              title={installedEmptyTitle}
              description={installedEmptyDescription}
              action={!searchQuery && !hasInstalledSkills ? (
                <Button variant="outline" onClick={() => setActiveTab('marketplace')}>
                  {t('tabs.marketplace')}
                </Button>
              ) : null}
              testId="skills-state-empty"
            />
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill.id}
                  skill={skill}
                  onOpen={() => openSkillDetail(skill)}
                  onToggle={(enabled) => {
                    void handleToggle(skill.id, enabled);
                  }}
                  onUninstall={() => {
                    void handleUninstall(skill.slug || skill.id);
                  }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="marketplace" className="space-y-4">
          <Card className="border-muted/60 bg-muted/20 shadow-sm">
            <CardContent className="flex items-start gap-3 p-4">
              <ShieldCheck className="mt-0.5 h-5 w-5 text-muted-foreground" weight="regular" />
              <p className="text-sm leading-6 text-muted-foreground">
                {t('marketplace.securityNote')}
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/70 bg-card/80 shadow-sm">
            <CardContent className="p-4 lg:p-5">
              <form onSubmit={handleMarketplaceSearch} className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="relative">
                  <MagnifyingGlass className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={t('searchMarketplace')}
                    value={marketplaceQuery}
                    onChange={(event) => setMarketplaceQuery(event.target.value)}
                    className="h-11 pl-9 pr-9"
                    data-testid="skills-marketplace-search-input"
                  />
                  {marketplaceQuery ? (
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                      onClick={() => setMarketplaceQuery('')}
                      aria-label={t('common:actions.close')}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>

                <Button type="submit" disabled={searching} className="h-11 min-w-[120px] gap-2" data-testid="skills-marketplace-search-submit">
                  {searching ? <ArrowClockwise className="h-4 w-4 animate-spin" weight="bold" /> : null}
                  {searching ? t('marketplace.searching') : t('searchButton')}
                </Button>
              </form>
            </CardContent>
          </Card>

          {searchError ? (
            <SkillsStateCard
              variant="error"
              title={t('marketplace.title')}
              description={t('marketplace.searchError')}
              testId="skills-marketplace-error"
            />
          ) : null}

          {marketplaceCount > 0 ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {searchResults.map((skill) => {
                const isInstalled = skills.some((item) => item.id === skill.slug || item.name === skill.name);
                return (
                  <MarketplaceSkillCard
                    key={skill.slug}
                    skill={skill}
                    isInstalling={!!installing[skill.slug]}
                    isInstalled={isInstalled}
                    onInstall={() => {
                      void handleInstall(skill.slug);
                    }}
                    onUninstall={() => {
                      void handleUninstall(skill.slug);
                    }}
                  />
                );
              })}
            </div>
          ) : (
            <SkillsStateCard
              variant="empty"
              title={t('marketplace.title')}
              description={searching ? t('marketplace.searching') : t('marketplace.emptyPrompt')}
              action={!searching && marketplaceQuery ? (
                <Button variant="outline" onClick={() => {
                  setMarketplaceQuery('');
                  marketplaceDiscoveryAttemptedRef.current = false;
                  void searchSkills('');
                }}>
                  {t('common:actions.clear', { defaultValue: 'Clear search' })}
                </Button>
              ) : null}
              testId="skills-marketplace-empty"
            />
          )}
        </TabsContent>
      </Tabs>

      {selectedSkill ? (
        <SkillDetailDialog
          skill={selectedSkill}
          onClose={() => setSelectedSkill(null)}
          onToggle={(enabled) => {
            void handleToggle(selectedSkill.id, enabled);
            setSelectedSkill({ ...selectedSkill, enabled });
          }}
        />
      ) : null}
    </div>
  );
}

export default Skills;
