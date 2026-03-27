import { useEffect, useMemo, useState } from 'react';
import { ChatCircle, Gear, Plus, PuzzlePiece, Radio, Terminal } from '@phosphor-icons/react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useGatewayStore } from '@/stores/gateway';
import { useChannelsStore } from '@/stores/channels';
import { useSkillsStore } from '@/stores/skills';
import { useSettingsStore } from '@/stores/settings';
import { DashboardSummary } from './components/DashboardSummary';
import { DashboardStatePanel, type DashboardStateVariant } from './components/DashboardStatePanel';
import { useTranslation } from 'react-i18next';

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function Dashboard() {
  const { t } = useTranslation('dashboard');
  const gatewayStatus = useGatewayStore((state) => state.status);
  const channels = useChannelsStore((state) => state.channels);
  const fetchChannels = useChannelsStore((state) => state.fetchChannels);
  const skills = useSkillsStore((state) => state.skills);
  const fetchSkills = useSkillsStore((state) => state.fetchSkills);
  const devModeUnlocked = useSettingsStore((state) => state.devModeUnlocked);

  const isGatewayRunning = gatewayStatus.state === 'running';
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    if (isGatewayRunning) {
      void fetchChannels();
      void fetchSkills();
    }
  }, [isGatewayRunning, fetchChannels, fetchSkills]);

  useEffect(() => {
    const updateUptime = () => {
      if (gatewayStatus.connectedAt) {
        setUptime(Math.floor((Date.now() - gatewayStatus.connectedAt) / 1000));
      } else {
        setUptime(0);
      }
    };

    updateUptime();
    const interval = setInterval(updateUptime, 1000);
    return () => clearInterval(interval);
  }, [gatewayStatus.connectedAt]);

  const connectedChannels = useMemo(
    () => channels.filter((channel) => channel.status === 'connected').length,
    [channels]
  );
  const enabledSkills = useMemo(
    () => skills.filter((skill) => skill.enabled).length,
    [skills]
  );

  const stateVariant: DashboardStateVariant = useMemo(() => {
    if (gatewayStatus.state === 'starting' || gatewayStatus.state === 'reconnecting') return 'loading';
    if (gatewayStatus.state === 'error') return 'error';
    if (connectedChannels === 0 && enabledSkills === 0) return 'empty';
    return 'success';
  }, [gatewayStatus.state, connectedChannels, enabledSkills]);

  const handleRetry = () => {
    void fetchChannels();
    void fetchSkills();
  };

  const openDevConsole = async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('gateway:getControlUiUrl') as {
        success: boolean;
        url?: string;
        error?: string;
      };

      if (result.success && result.url) {
        window.electron.openExternal(result.url);
      } else {
        console.error('Failed to get Dev Console URL:', result.error);
      }
    } catch (error) {
      console.error('Error opening Dev Console:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <section className="space-y-4">
          <Card className="border-border/70">
            <CardHeader>
              <CardTitle>{t('quickActions.title')}</CardTitle>
              <CardDescription>{t('quickActions.description')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                  <Link to="/channels" data-testid="dashboard-quick-action-add-channel">
                    <Plus className="h-5 w-5" weight="bold" />
                    <span>{t('quickActions.addChannel')}</span>
                  </Link>
                </Button>

                <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                  <Link to="/skills" data-testid="dashboard-quick-action-browse-skills">
                    <PuzzlePiece className="h-5 w-5" weight="regular" />
                    <span>{t('quickActions.browseSkills')}</span>
                  </Link>
                </Button>

                <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                  <Link to="/" data-testid="dashboard-quick-action-open-chat">
                    <ChatCircle className="h-5 w-5" weight="regular" />
                    <span>{t('quickActions.openChat')}</span>
                  </Link>
                </Button>

                <Button variant="outline" className="h-auto flex-col gap-2 py-4" asChild>
                  <Link to="/settings" data-testid="dashboard-quick-action-settings">
                    <Gear className="h-5 w-5" weight="regular" />
                    <span>{t('quickActions.settings')}</span>
                  </Link>
                </Button>

                {devModeUnlocked && (
                  <Button
                    variant="outline"
                    className="h-auto flex-col gap-2 py-4"
                    onClick={openDevConsole}
                    data-testid="dashboard-quick-action-dev-console"
                  >
                    <Terminal className="h-5 w-5" weight="regular" />
                    <span>{t('quickActions.devConsole')}</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">{t('connectedChannels')}</CardTitle>
            </CardHeader>
            <CardContent>
              {channels.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Radio className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  <p>{t('noChannels')}</p>
                  <Button variant="link" asChild className="mt-1 h-auto p-0">
                    <Link to="/channels">{t('addFirst')}</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {channels.slice(0, 6).map((channel) => (
                    <div key={channel.id} className="flex items-center justify-between rounded-md border border-border/70 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{channel.name}</p>
                        <p className="text-xs text-muted-foreground capitalize">{channel.type}</p>
                      </div>
                      <Badge variant={channel.status === 'connected' ? 'default' : 'secondary'}>
                        {channel.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70">
            <CardHeader>
              <CardTitle className="text-lg">{t('activeSkills')}</CardTitle>
            </CardHeader>
            <CardContent>
              {enabledSkills === 0 ? (
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{t('noSkills')}</p>
                  <Button variant="link" asChild className="h-auto p-0 text-sm">
                    <Link to="/skills">{t('enableSome')}</Link>
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills
                    .filter((skill) => skill.enabled)
                    .slice(0, 12)
                    .map((skill) => (
                      <Badge key={skill.id} variant="secondary">
                        {skill.icon && <span className="mr-1">{skill.icon}</span>}
                        {skill.name}
                      </Badge>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <aside className="space-y-4">
          <DashboardSummary
            gatewayStatus={gatewayStatus}
            connectedChannels={connectedChannels}
            totalChannels={channels.length}
            enabledSkills={enabledSkills}
            totalSkills={skills.length}
            uptimeLabel={uptime > 0 ? formatUptime(uptime) : '--'}
          />
          <DashboardStatePanel
            variant={stateVariant}
            error={gatewayStatus.error}
            onRetry={handleRetry}
          />
        </aside>
      </div>
    </div>
  );
}

export default Dashboard;
