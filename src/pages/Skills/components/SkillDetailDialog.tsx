import { useEffect, useMemo, useState } from 'react';
import {
  CaretDown,
  CaretRight,
  CheckCircle,
  CircleNotch,
  FileCode,
  FloppyDisk,
  Globe,
  Key,
  Lock,
  Plus,
  Trash,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Skill } from '@/types/skill';
import { useSkillsStore } from '@/stores/skills';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { getSkillsElectronBridge } from '../electronBridge';

interface SkillDetailDialogProps {
  skill: Skill;
  onClose: () => void;
  onToggle: (enabled: boolean) => void;
}

export function SkillDetailDialog({ skill, onClose, onToggle }: SkillDetailDialogProps) {
  const { t } = useTranslation('skills');
  const fetchSkills = useSkillsStore((state) => state.fetchSkills);
  const [activeTab, setActiveTab] = useState<'info' | 'config'>('info');
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);
  const [apiKey, setApiKey] = useState('');
  const [isEnvExpanded, setIsEnvExpanded] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setActiveTab('info');
    setIsEnvExpanded(true);
    setApiKey(skill.config?.apiKey ? String(skill.config.apiKey) : '');
    setEnvVars(
      skill.config?.env
        ? Object.entries(skill.config.env).map(([key, value]) => ({ key, value: String(value) }))
        : []
    );
  }, [skill.id, skill.config]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const sourceLabel = useMemo(() => {
    if (skill.isCore) return t('detail.coreSystem');
    if (skill.isBundled) return t('detail.bundled');
    return t('detail.userInstalled');
  }, [skill.isBundled, skill.isCore, t]);

  const handleOpenClawhub = async () => {
    if (!skill.slug) return;
    await getSkillsElectronBridge().ipcRenderer.invoke('shell:openExternal', `https://clawhub.ai/s/${skill.slug}`);
  };

  const handleOpenEditor = async () => {
    if (!skill.slug) return;

    try {
      const result = await getSkillsElectronBridge().ipcRenderer.invoke('clawhub:openSkillReadme', skill.slug) as { success: boolean; error?: string };
      if (result.success) {
        toast.success(t('toast.openedEditor'));
      } else {
        toast.error(result.error || t('toast.failedEditor'));
      }
    } catch (error) {
      toast.error(`${t('toast.failedEditor')}: ${String(error)}`);
    }
  };

  const handleAddEnv = () => {
    setEnvVars((current) => [...current, { key: '', value: '' }]);
  };

  const handleUpdateEnv = (index: number, field: 'key' | 'value', value: string) => {
    setEnvVars((current) => {
      const next = [...current];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleRemoveEnv = (index: number) => {
    setEnvVars((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const handleSaveConfig = async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const env = envVars.reduce((acc, curr) => {
        const key = curr.key.trim();
        const value = curr.value.trim();
        if (key) {
          acc[key] = value;
        }
        return acc;
      }, {} as Record<string, string>);

      const result = await getSkillsElectronBridge().ipcRenderer.invoke('skill:updateConfig', {
        skillKey: skill.id,
        apiKey: apiKey || '',
        env,
      }) as { success: boolean; error?: string };

      if (!result.success) {
        throw new Error(result.error || 'Unknown error');
      }

      await fetchSkills();
      toast.success(t('detail.configSaved'));
    } catch (error) {
      toast.error(`${t('toast.failedSave')}: ${String(error)}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]" onClick={onClose}>
      <Card
        className="flex w-full max-w-3xl max-h-[min(88vh,840px)] flex-col overflow-hidden border-border/70 bg-background/95 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        data-testid="skills-detail-dialog"
      >
        <CardHeader className="flex flex-row items-start justify-between gap-4 border-b border-border/70 pb-4">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/50 text-3xl">
              {skill.icon || '🔧'}
            </div>
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-2xl tracking-tight">{skill.name}</CardTitle>
                {skill.isCore ? (
                  <Badge variant="secondary" className="gap-1">
                    <Lock className="h-3 w-3" weight="regular" />
                    {t('detail.coreSystem')}
                  </Badge>
                ) : null}
                <Badge variant="outline">{sourceLabel}</Badge>
                {skill.version ? <Badge variant="outline">v{skill.version}</Badge> : null}
              </div>
              <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{skill.description}</p>
              {skill.slug && !skill.isBundled && !skill.isCore ? (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenClawhub}>
                    <Globe className="h-4 w-4" weight="regular" />
                    ClawHub
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" onClick={handleOpenEditor}>
                    <FileCode className="h-4 w-4" weight="regular" />
                    {t('detail.openManual')}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <Button variant="ghost" size="icon" onClick={onClose} data-testid="skills-detail-close">
            <X className="h-4 w-4" weight="regular" />
          </Button>
        </CardHeader>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'info' | 'config')} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border/70 px-6 py-3">
            <TabsList className="grid w-full grid-cols-2 bg-muted/40 p-1">
              <TabsTrigger value="info">{t('detail.info')}</TabsTrigger>
              <TabsTrigger value="config" disabled={skill.isCore}>
                {t('detail.config')}
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <TabsContent value="info" className="mt-0 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Card className="border-border/70 bg-muted/20">
                  <CardContent className="space-y-1 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('detail.description')}</p>
                    <p className="text-sm leading-6 text-foreground">{skill.description}</p>
                  </CardContent>
                </Card>
                <Card className="border-border/70 bg-muted/20">
                  <CardContent className="space-y-3 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('detail.version')}</p>
                      <p className="text-sm font-medium text-foreground">{skill.version}</p>
                    </div>
                    {skill.author ? (
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('detail.author')}</p>
                        <p className="text-sm font-medium text-foreground">{skill.author}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              </div>

              <Card className="border-border/70 bg-card/80">
                <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t('detail.source')}</p>
                    <p className="text-sm font-medium text-foreground">{sourceLabel}</p>
                  </div>
                  <Badge variant="secondary">{skill.enabled ? t('detail.enabled') : t('detail.disabled')}</Badge>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="config" className="mt-0 space-y-4">
              <Card className="border-border/70 bg-muted/20">
                <CardContent className="space-y-3 p-4">
                  <Label htmlFor="skill-api-key" className="flex items-center gap-2 text-sm font-medium">
                    <Key className="h-4 w-4 text-primary" />
                    {t('detail.apiKey')}
                  </Label>
                  <Input
                    id="skill-api-key"
                    placeholder={t('detail.apiKeyPlaceholder')}
                    value={apiKey}
                    onChange={(event) => setApiKey(event.target.value)}
                    type="password"
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">{t('detail.apiKeyDesc')}</p>
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/80">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      className="flex min-w-0 items-center gap-2 text-left text-sm font-medium text-foreground hover:text-primary"
                      onClick={() => setIsEnvExpanded((current) => !current)}
                    >
                      {isEnvExpanded ? (
                        <CaretDown className="h-4 w-4 shrink-0" weight="regular" />
                      ) : (
                        <CaretRight className="h-4 w-4 shrink-0" weight="regular" />
                      )}
                      <span>{t('detail.envVars')}</span>
                      <Badge variant="secondary" className="ml-1 px-2 py-0 text-[10px]">
                        {envVars.length}
                      </Badge>
                    </button>

                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        setIsEnvExpanded(true);
                        handleAddEnv();
                      }}
                    >
                      <Plus className="h-4 w-4" weight="bold" />
                      {t('detail.addVariable')}
                    </Button>
                  </div>
                </CardHeader>

                {isEnvExpanded ? (
                  <CardContent className="space-y-3 border-t border-border/70 px-4 py-4">
                    {envVars.length === 0 ? (
                      <p className="text-sm italic text-muted-foreground">{t('detail.noEnvVars')}</p>
                    ) : null}

                    {envVars.map((env, index) => (
                      <div key={`${env.key}-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto] md:items-center">
                        <Input
                          value={env.key}
                          onChange={(event) => handleUpdateEnv(index, 'key', event.target.value)}
                          className="font-mono text-sm"
                          placeholder={t('detail.keyPlaceholder')}
                        />
                        <span className="hidden text-center text-muted-foreground md:block">=</span>
                        <Input
                          value={env.value}
                          onChange={(event) => handleUpdateEnv(index, 'value', event.target.value)}
                          className="font-mono text-sm"
                          placeholder={t('detail.valuePlaceholder')}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveEnv(index)}
                          aria-label={t('common:actions.delete')}
                        >
                          <Trash className="h-4 w-4" weight="regular" />
                        </Button>
                      </div>
                    ))}

                    {envVars.length > 0 ? (
                      <p className="pt-1 text-xs text-muted-foreground">{t('detail.envNote')}</p>
                    ) : null}
                  </CardContent>
                ) : null}
              </Card>

              <div className="flex justify-end">
                <Button onClick={handleSaveConfig} disabled={isSaving} className="min-w-[160px] gap-2" data-testid="skills-detail-save">
                  {isSaving ? (
                    <CircleNotch className="h-4 w-4 animate-spin" weight="bold" />
                  ) : (
                    <FloppyDisk className="h-4 w-4" weight="regular" />
                  )}
                  {isSaving ? t('detail.saving') : t('detail.saveConfig')}
                </Button>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <div className="flex items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-6 py-4">
          <div className="flex items-center gap-3">
            {skill.enabled ? (
              <>
                <CheckCircle className="h-5 w-5 text-green-600" weight="fill" />
                <span className="text-sm font-medium text-foreground">{t('detail.enabled')}</span>
              </>
            ) : (
              <>
                <WarningCircle className="h-5 w-5 text-muted-foreground" weight="regular" />
                <span className="text-sm font-medium text-muted-foreground">{t('detail.disabled')}</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{t('detail.enabled')}</span>
            <Switch
              checked={skill.enabled}
              onCheckedChange={() => onToggle(!skill.enabled)}
              disabled={skill.isCore}
              data-testid="skills-detail-enabled-toggle"
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
