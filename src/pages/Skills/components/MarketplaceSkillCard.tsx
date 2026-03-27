import { CircleNotch, Download, Globe, Star, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { MarketplaceSkill } from '@/types/skill';
import type { KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { getSkillsElectronBridge } from '../electronBridge';

interface MarketplaceSkillCardProps {
  skill: MarketplaceSkill;
  isInstalling: boolean;
  isInstalled: boolean;
  onInstall: () => void;
  onUninstall: () => void;
}

export function MarketplaceSkillCard({
  skill,
  isInstalling,
  isInstalled,
  onInstall,
  onUninstall,
}: MarketplaceSkillCardProps) {
  const { t } = useTranslation('skills');

  const openDocumentation = async () => {
    await getSkillsElectronBridge().ipcRenderer.invoke(
      'shell:openExternal',
      `https://clawhub.ai/s/${skill.slug}`
    );
  };

  const handleKeyboardOpen = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      void openDocumentation();
    }
  };

  return (
    <Card
      className={cn(
        'group cursor-pointer border-border/70 bg-card/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm'
      )}
      onClick={() => void openDocumentation()}
      onKeyDown={handleKeyboardOpen}
      role="link"
      tabIndex={0}
      data-testid={`skills-marketplace-card-${skill.slug}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/50 text-2xl">
            📦
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h3 className="text-base font-semibold leading-none text-foreground group-hover:text-primary">
                  {skill.name}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1">
                    <Globe className="h-3 w-3" weight="regular" />
                    ClawHub
                  </span>
                  {skill.version ? <span className="rounded-full border border-border/70 px-2.5 py-1">v{skill.version}</span> : null}
                  {skill.author ? <span className="rounded-full border border-border/70 px-2.5 py-1">{skill.author}</span> : null}
                </div>
              </div>

              <Button
                type="button"
                variant={isInstalled ? 'destructive' : 'default'}
                size="sm"
                className="shrink-0"
                disabled={isInstalling}
                onClick={(event) => {
                  event.stopPropagation();
                  if (isInstalled) {
                    onUninstall();
                  } else {
                    onInstall();
                  }
                }}
                data-testid={`skills-marketplace-${isInstalled ? 'uninstall' : 'install'}-${skill.slug}`}
              >
                {isInstalling ? (
                  <CircleNotch className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                ) : isInstalled ? (
                  <Trash className="mr-2 h-4 w-4" weight="regular" />
                ) : (
                  <Download className="mr-2 h-4 w-4" weight="regular" />
                )}
                {isInstalled ? t('common:actions.uninstall') : t('common:actions.install')}
              </Button>
            </div>

            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {skill.description}
            </p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {skill.downloads !== undefined ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1">
                  <Download className="h-3 w-3" weight="regular" />
                  {skill.downloads.toLocaleString()}
                </span>
              ) : null}
              {skill.stars !== undefined ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2.5 py-1">
                  <Star className="h-3 w-3" weight="regular" />
                  {skill.stars.toLocaleString()}
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
