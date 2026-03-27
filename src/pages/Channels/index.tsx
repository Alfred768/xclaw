/**
 * Channels Page
 * Manage messaging channel connections with configuration UI
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { CircleNotch } from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { useChannelsStore } from '@/stores/channels';
import { useGatewayStore } from '@/stores/gateway';
import { type Channel, type ChannelType } from '@/types/channel';
import { useTranslation } from 'react-i18next';
import { ChannelsHeader } from './components/ChannelsHeader';
import { ChannelsSnapshot } from './components/ChannelsSnapshot';
import { ChannelsNotice } from './components/ChannelsNotice';
import { ConfiguredChannelsSection } from './components/ConfiguredChannelsSection';
import { AvailableChannelsSection } from './components/AvailableChannelsSection';
import { AddChannelDialog } from './components/AddChannelDialog';

export function Channels() {
  const { t } = useTranslation('channels');
  const { channels, loading, error, fetchChannels, deleteChannel } = useChannelsStore();
  const gatewayStatus = useGatewayStore((state) => state.status);

  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedChannelType, setSelectedChannelType] = useState<ChannelType | null>(null);
  const [configuredTypes, setConfiguredTypes] = useState<string[]>([]);

  const fetchConfiguredTypes = useCallback(async () => {
    try {
      const result = await window.electron.ipcRenderer.invoke('channel:listConfigured') as {
        success: boolean;
        channels?: string[];
      };

      if (result.success && Array.isArray(result.channels)) {
        setConfiguredTypes(result.channels);
      }
    } catch {
      // Ignore local config read failures and keep the catalog usable.
    }
  }, []);

  useEffect(() => {
    void fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    void fetchConfiguredTypes();
  }, [fetchConfiguredTypes]);

  useEffect(() => {
    const unsubscribe = window.electron.ipcRenderer.on('gateway:channel-status', () => {
      void fetchChannels();
      void fetchConfiguredTypes();
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchChannels, fetchConfiguredTypes]);

  const connectedCount = useMemo(
    () => channels.filter((channel) => channel.status === 'connected').length,
    [channels]
  );

  const disconnectedCount = useMemo(
    () => channels.filter((channel) => channel.status !== 'connected').length,
    [channels]
  );

  const handleDeleteChannel = useCallback((channel: Channel) => {
    if (!confirm(t('deleteConfirm', { defaultValue: 'Delete this channel?' }))) {
      return;
    }

    void deleteChannel(channel.id);
  }, [deleteChannel, t]);

  const handleOpenAddDialog = useCallback(() => {
    setSelectedChannelType(null);
    setShowAddDialog(true);
  }, []);

  const handleSelectChannelType = useCallback((type: ChannelType) => {
    setSelectedChannelType(type);
    setShowAddDialog(true);
  }, []);

  const handleCloseDialog = useCallback(() => {
    setShowAddDialog(false);
    setSelectedChannelType(null);
  }, []);

  const handleChannelAdded = useCallback(() => {
    void fetchChannels();
    void fetchConfiguredTypes();
    handleCloseDialog();
  }, [fetchChannels, fetchConfiguredTypes, handleCloseDialog]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-6" data-testid="channels-loading-state">
        <Card className="w-full max-w-md border-border/70 bg-background/80 shadow-sm">
          <CardContent className="flex items-center gap-3 py-8 text-muted-foreground">
            <CircleNotch className="h-5 w-5 animate-spin" weight="bold" />
            <span>{t('loading', { defaultValue: 'Syncing channels...' })}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5" data-testid="channels-page-root">
      <ChannelsHeader onRefresh={() => void fetchChannels()} onAddChannel={handleOpenAddDialog} />

      <ChannelsSnapshot
        total={channels.length}
        connected={connectedCount}
        disconnected={disconnectedCount}
        configuredTypes={configuredTypes.length}
      />

      {gatewayStatus.state !== 'running' ? (
        <ChannelsNotice
          tone="warning"
          title={t('gatewayWarningTitle', { defaultValue: 'Gateway unavailable' })}
          description={t('gatewayWarning')}
        />
      ) : null}

      {error ? (
        <ChannelsNotice
          tone="error"
          title={t('errorTitle', { defaultValue: 'Channel sync failed' })}
          description={error}
          actionLabel={t('refresh')}
          onAction={() => void fetchChannels()}
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <ConfiguredChannelsSection
          channels={channels}
          onDelete={handleDeleteChannel}
          onAddChannel={handleOpenAddDialog}
        />

        <AvailableChannelsSection
          configuredTypes={configuredTypes}
          onSelectType={handleSelectChannelType}
        />
      </div>

      {showAddDialog ? (
        <AddChannelDialog
          selectedType={selectedChannelType}
          onSelectType={setSelectedChannelType}
          onClose={handleCloseDialog}
          onChannelAdded={handleChannelAdded}
        />
      ) : null}
    </div>
  );
}

export default Channels;
