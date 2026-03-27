import { Gear, Lock, Trash } from '@phosphor-icons/react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Skill } from '@/types/skill';
import { useTranslation } from 'react-i18next';

interface SkillCardProps {
  skill: Skill;
  onOpen: () => void;
  onToggle: (enabled: boolean) => void;
  onUninstall: () => void;
}

export function SkillCard({ skill, onOpen, onToggle, onUninstall }: SkillCardProps) {
  const { t } = useTranslation('skills');
  const canUninstall = !skill.isBundled && !skill.isCore;

  const sourceLabel = skill.isCore
    ? t('detail.coreSystem')
    : skill.isBundled
      ? t('detail.bundled')
      : t('detail.userInstalled');

  return (
    <Card
      className={cn(
        'group cursor-pointer border-border/70 bg-card/80 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-sm',
        skill.enabled && 'border-primary/30 bg-primary/[0.03]'
      )}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onOpen();
        }
      }}
      data-testid={`skills-card-${skill.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/50 text-2xl">
            {skill.icon || '🧩'}
          </div>

          <div className="min-w-0 flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="min-w-0 text-base font-semibold leading-none text-foreground">
                {skill.name}
              </h3>
              <Badge variant={skill.enabled ? 'default' : 'secondary'}>
                {skill.enabled ? t('detail.enabled') : t('detail.disabled')}
              </Badge>
              <Badge variant="outline">{sourceLabel}</Badge>
              {skill.version ? <Badge variant="outline">v{skill.version}</Badge> : null}
            </div>

            <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
              {skill.description}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              {skill.configurable ? (
                <Badge variant="secondary" className="gap-1">
                  <Gear className="h-3 w-3" weight="regular" />
                  {t('detail.configurable')}
                </Badge>
              ) : null}
              {skill.isCore ? (
                <Badge variant="secondary" className="gap-1">
                  <Lock className="h-3 w-3" weight="regular" />
                  {t('detail.coreSystem')}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 items-start gap-2">
            {canUninstall ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 text-destructive hover:text-destructive"
                onClick={(event) => {
                  event.stopPropagation();
                  onUninstall();
                }}
                data-testid={`skills-uninstall-${skill.id}`}
                aria-label={t('common:actions.uninstall')}
              >
                <Trash className="h-4 w-4" weight="regular" />
              </Button>
            ) : null}

            <div onClick={(event) => event.stopPropagation()}>
              <Switch
                checked={skill.enabled}
                onCheckedChange={(enabled) => onToggle(enabled)}
                disabled={skill.isCore}
                data-testid={`skills-toggle-${skill.id}`}
                aria-label={`${skill.name} ${skill.enabled ? t('detail.enabled') : t('detail.disabled')}`}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
