import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowSquareOut,
  Book,
  Check,
  CheckCircle,
  CircleNotch,
  QrCode,
  ShieldCheck,
  WarningCircle,
  X,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useChannelsStore } from '@/stores/channels';
import {
  CHANNEL_ICONS,
  CHANNEL_NAMES,
  CHANNEL_META,
  getPrimaryChannels,
  type ChannelType,
  type ChannelMeta,
  type ChannelConfigField,
} from '@/types/channel';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { ChannelConfigField as ChannelConfigFieldInput } from './ChannelConfigField';
import { cn } from '@/lib/utils';

interface AddChannelDialogProps {
  selectedType: ChannelType | null;
  onSelectType: (type: ChannelType | null) => void;
  onClose: () => void;
  onChannelAdded: () => void;
}

export function AddChannelDialog({
  selectedType,
  onSelectType,
  onClose,
  onChannelAdded,
}: AddChannelDialogProps) {
  const { t } = useTranslation('channels');
  const { addChannel } = useChannelsStore();
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [channelName, setChannelName] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isExistingConfig, setIsExistingConfig] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  const meta: ChannelMeta | null = selectedType ? CHANNEL_META[selectedType] : null;
  const primaryTypes = useMemo(() => getPrimaryChannels(), []);

  const resetConnectionState = useCallback(() => {
    setConfigValues({});
    setChannelName('');
    setShowSecrets({});
    setQrCode(null);
    setLoadingConfig(false);
    setIsExistingConfig(false);
    setValidationResult(null);
    setValidating(false);
    setConnecting(false);
    window.electron.ipcRenderer.invoke('channel:cancelWhatsAppQr').catch(() => {});
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!selectedType) {
      resetConnectionState();
      return;
    }

    let cancelled = false;
    setLoadingConfig(true);
    setQrCode(null);
    setValidationResult(null);

    (async () => {
      try {
        const result = await window.electron.ipcRenderer.invoke(
          'channel:getFormValues',
          selectedType
        ) as { success: boolean; values?: Record<string, string> };

        if (cancelled) return;

        if (result.success && result.values && Object.keys(result.values).length > 0) {
          setConfigValues(result.values);
          setIsExistingConfig(true);
        } else {
          setConfigValues({});
          setIsExistingConfig(false);
        }
      } catch {
        if (!cancelled) {
          setConfigValues({});
          setIsExistingConfig(false);
        }
      } finally {
        if (!cancelled) setLoadingConfig(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedType, resetConnectionState]);

  useEffect(() => {
    if (selectedType !== 'whatsapp') return;

    const onQr = (...args: unknown[]) => {
      const data = args[0] as { qr: string; raw: string };
      setQrCode(`data:image/png;base64,${data.qr}`);
    };

    const onSuccess = async (...args: unknown[]) => {
      const data = args[0] as { accountId?: string } | undefined;
      const accountId = data?.accountId || channelName.trim() || 'default';

      toast.success(t('toast.whatsappConnected'));
      try {
        const saveResult = await window.electron.ipcRenderer.invoke(
          'channel:saveConfig',
          'whatsapp',
          { enabled: true }
        ) as { success?: boolean; error?: string };

        if (!saveResult?.success) {
          console.error('Failed to save WhatsApp config:', saveResult?.error);
        } else {
          console.info('Saved WhatsApp config for account:', accountId);
        }
      } catch (error) {
        console.error('Failed to save WhatsApp config:', error);
      }

      addChannel({
        type: 'whatsapp',
        name: channelName || 'WhatsApp',
      }).then(() => {
        window.electron.ipcRenderer.invoke('gateway:restart').catch(console.error);
        onChannelAdded();
      });
    };

    const onError = (...args: unknown[]) => {
      const err = args[0] as string;
      console.error('WhatsApp Login Error:', err);
      toast.error(t('toast.whatsappFailed', { error: err }));
      setQrCode(null);
      setConnecting(false);
    };

    const removeQrListener = window.electron.ipcRenderer.on('channel:whatsapp-qr', onQr);
    const removeSuccessListener = window.electron.ipcRenderer.on('channel:whatsapp-success', onSuccess);
    const removeErrorListener = window.electron.ipcRenderer.on('channel:whatsapp-error', onError);

    return () => {
      if (typeof removeQrListener === 'function') removeQrListener();
      if (typeof removeSuccessListener === 'function') removeSuccessListener();
      if (typeof removeErrorListener === 'function') removeErrorListener();
      window.electron.ipcRenderer.invoke('channel:cancelWhatsAppQr').catch(() => {});
    };
  }, [selectedType, addChannel, channelName, onChannelAdded, t]);

  const selectedTypeName = selectedType ? CHANNEL_NAMES[selectedType] : '';

  const isFormValid = () => {
    if (!meta) return false;
    return meta.configFields
      .filter((field) => field.required)
      .every((field) => configValues[field.key]?.trim());
  };

  const updateConfigValue = (key: string, value: string) => {
    setConfigValues((prev) => ({ ...prev, [key]: value }));
  };

  const toggleSecretVisibility = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const openDocs = () => {
    if (!meta?.docsUrl) return;

    const url = t(meta.docsUrl);
    try {
      if (window.electron?.openExternal) {
        window.electron.openExternal(url);
      } else {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Failed to open docs:', error);
      window.open(url, '_blank');
    }
  };

  const handleValidate = async () => {
    if (!selectedType) return;

    setValidating(true);
    setValidationResult(null);

    try {
      const result = await window.electron.ipcRenderer.invoke(
        'channel:validateCredentials',
        selectedType,
        configValues
      ) as {
        success: boolean;
        valid?: boolean;
        errors?: string[];
        warnings?: string[];
        details?: Record<string, string>;
      };

      const warnings = result.warnings || [];
      if (result.valid && result.details) {
        const details = result.details;
        if (details.botUsername) warnings.push(`Bot: @${details.botUsername}`);
        if (details.guildName) warnings.push(`Server: ${details.guildName}`);
        if (details.channelName) warnings.push(`Channel: #${details.channelName}`);
      }

      setValidationResult({
        valid: result.valid || false,
        errors: result.errors || [],
        warnings,
      });
    } catch (error) {
      setValidationResult({
        valid: false,
        errors: [String(error)],
        warnings: [],
      });
    } finally {
      setValidating(false);
    }
  };

  const handleConnect = async () => {
    if (!selectedType || !meta) return;

    setConnecting(true);
    setValidationResult(null);

    try {
      if (meta.connectionType === 'qr') {
        const accountId = channelName.trim() || 'default';
        await window.electron.ipcRenderer.invoke('channel:requestWhatsAppQr', accountId);
        return;
      }

      if (meta.connectionType === 'token') {
        const validationResponse = await window.electron.ipcRenderer.invoke(
          'channel:validateCredentials',
          selectedType,
          configValues
        ) as {
          success: boolean;
          valid?: boolean;
          errors?: string[];
          warnings?: string[];
          details?: Record<string, string>;
        };

        if (!validationResponse.valid) {
          setValidationResult({
            valid: false,
            errors: validationResponse.errors || ['Validation failed'],
            warnings: validationResponse.warnings || [],
          });
          setConnecting(false);
          return;
        }

        const warnings = validationResponse.warnings || [];
        if (validationResponse.details) {
          const details = validationResponse.details;
          if (details.botUsername) warnings.push(`Bot: @${details.botUsername}`);
          if (details.guildName) warnings.push(`Server: ${details.guildName}`);
          if (details.channelName) warnings.push(`Channel: #${details.channelName}`);
        }

        setValidationResult({
          valid: true,
          errors: [],
          warnings,
        });
      }

      const config: Record<string, unknown> = { ...configValues };
      await window.electron.ipcRenderer.invoke('channel:saveConfig', selectedType, config);

      await addChannel({
        type: selectedType,
        name: channelName || CHANNEL_NAMES[selectedType],
        token: configValues[meta.configFields[0]?.key] || undefined,
      });

      toast.success(t('toast.channelSaved', { name: meta.name }));

      try {
        await window.electron.ipcRenderer.invoke('gateway:restart');
        toast.success(t('toast.channelConnecting', { name: meta.name }));
      } catch (restartError) {
        console.warn('Gateway restart after channel config:', restartError);
        toast.info(t('toast.restartManual'));
      }

      await new Promise((resolve) => setTimeout(resolve, 800));
      onChannelAdded();
    } catch (error) {
      toast.error(t('toast.configFailed', { error }));
      setConnecting(false);
    }
  };

  const dialogTitle = selectedType
    ? isExistingConfig
      ? t('dialog.updateTitle', { name: selectedTypeName })
      : t('dialog.configureTitle', { name: selectedTypeName })
    : t('dialog.addTitle');

  const dialogDescription = selectedType
    ? isExistingConfig
      ? t('dialog.existingDesc')
      : meta
        ? t(meta.description)
        : t('dialog.selectDesc')
    : t('dialog.selectDesc');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/55 p-4 backdrop-blur-sm"
      role="presentation"
      data-testid="channel-dialog-root"
      onClick={onClose}
    >
      <div className="mx-auto flex h-full w-full max-w-6xl items-center justify-center">
        <Card
          className="max-h-[92vh] w-full overflow-hidden border-border/70 shadow-2xl"
          onClick={(event) => event.stopPropagation()}
        >
          <CardHeader className="border-b border-border/70 bg-muted/20">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1">
                <CardTitle className="text-2xl tracking-tight">{dialogTitle}</CardTitle>
                <CardDescription className="max-w-2xl">{dialogDescription}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose} data-testid="channel-dialog-close">
                <X className="h-4 w-4" weight="regular" />
              </Button>
            </div>
          </CardHeader>

          <CardContent className="max-h-[calc(92vh-5.5rem)] overflow-y-auto p-5">
            {!selectedType ? (
              <div className="space-y-4" data-testid="channel-dialog-type-grid">
                <div className="grid gap-3 sm:grid-cols-2">
                  {primaryTypes.map((type) => {
                    const channelMeta = CHANNEL_META[type];

                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => onSelectType(type)}
                        className={cn(
                          'rounded-2xl border border-border/70 bg-background/70 p-4 text-left transition-all',
                          'hover:-translate-y-0.5 hover:border-border hover:bg-accent/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                        )}
                        data-testid={`channel-dialog-type-${type}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-muted/30 text-xl">
                            {CHANNEL_ICONS[type]}
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="text-sm font-medium text-foreground">{channelMeta.name}</p>
                            <p className="text-xs leading-5 text-muted-foreground">
                              {t(channelMeta.connectionType === 'qr' ? 'dialog.qrCode' : 'dialog.token')}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : qrCode ? (
              <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-xl">
                        {meta?.icon}
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">{meta?.name}</p>
                        <Badge variant="secondary">
                          {t('dialog.qrCode')}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {t('dialog.scanQR', { name: meta?.name })}
                    </p>
                    <Button variant="outline" size="sm" onClick={openDocs} data-testid="channel-dialog-open-docs">
                      <Book className="mr-2 h-4 w-4" weight="regular" />
                      {t('dialog.viewDocs')}
                      <ArrowSquareOut className="ml-2 h-3.5 w-3.5" weight="regular" />
                    </Button>
                  </div>
                </aside>

                <section className="space-y-4" data-testid="channel-dialog-qr">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{t('dialog.generateQRCode')}</p>
                      <p className="text-sm text-muted-foreground">
                        {t('dialog.generatingQR')}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setQrCode(null);
                        handleConnect();
                      }}
                      data-testid="channel-dialog-refresh-qr"
                    >
                      {t('dialog.refreshCode')}
                    </Button>
                  </div>

                  <div className="rounded-3xl border border-border/70 bg-background p-6 text-center">
                    <div className="inline-flex rounded-2xl border border-border/70 bg-white p-4 shadow-sm">
                      {qrCode.startsWith('data:image') ? (
                        <img src={qrCode} alt="Scan QR Code" className="h-64 w-64 object-contain" />
                      ) : (
                        <div className="flex h-64 w-64 items-center justify-center">
                          <QrCode className="h-28 w-28 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <p className="mt-4 text-sm text-muted-foreground">
                      {t('dialog.scanQR', { name: meta?.name })}
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <Button variant="outline" onClick={() => onSelectType(null)}>
                        {t('dialog.back')}
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            ) : loadingConfig ? (
              <div className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
                <CircleNotch className="h-5 w-5 animate-spin" weight="bold" />
                <span>{t('dialog.loadingConfig')}</span>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="space-y-4">
                  <div className="rounded-2xl border border-border/70 bg-muted/20 p-4">
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/70 bg-background/80 text-xl">
                          {meta?.icon}
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-foreground">{meta?.name}</p>
                          <Badge variant="secondary">
                            {meta?.connectionType === 'qr' ? t('dialog.qrCode') : t('dialog.token')}
                          </Badge>
                        </div>
                      </div>

                      {isExistingConfig ? (
                        <div className="flex items-start gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.05] p-3 text-sm text-foreground">
                          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" weight="fill" />
                          <span>{t('dialog.existingHint')}</span>
                        </div>
                      ) : null}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">{t('dialog.howToConnect')}</p>
                          <Button
                            variant="link"
                            className="h-auto p-0 text-sm"
                            onClick={openDocs}
                            data-testid="channel-dialog-open-docs"
                          >
                            <Book className="mr-1 h-3.5 w-3.5" />
                            {t('dialog.viewDocs')}
                            <ArrowSquareOut className="ml-1 h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <ol className="space-y-2 text-sm leading-6 text-muted-foreground">
                          {meta?.instructions.map((instruction, index) => (
                            <li key={instruction} className="flex gap-2">
                              <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-border/70 text-[11px] font-medium text-foreground">
                                {index + 1}
                              </span>
                              <span>{t(instruction)}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">{t('dialog.channelName')}</p>
                    <p className="mt-1 leading-6">
                      {t('dialog.channelNamePlaceholder', { name: meta?.name })}
                    </p>
                  </div>
                </aside>

                <section className="space-y-4">
                  <div className="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">{t('dialog.channelName')}</Label>
                      <Input
                        id="name"
                        placeholder={t('dialog.channelNamePlaceholder', { name: meta?.name })}
                        value={channelName}
                        onChange={(event) => setChannelName(event.target.value)}
                        data-testid="channel-dialog-name"
                      />
                    </div>

                    {meta?.configFields.map((field: ChannelConfigField) => (
                      <ChannelConfigFieldInput
                        key={field.key}
                        field={field}
                        value={configValues[field.key] || ''}
                        onChange={(value) => updateConfigValue(field.key, value)}
                        showSecret={showSecrets[field.key] || false}
                        onToggleSecret={() => toggleSecretVisibility(field.key)}
                      />
                    ))}

                    {validationResult ? (
                      <div
                        className={cn(
                          'rounded-2xl border p-4 text-sm',
                          validationResult.valid
                            ? 'border-emerald-500/30 bg-emerald-500/[0.05] text-emerald-700 dark:text-emerald-300'
                            : 'border-destructive/30 bg-destructive/[0.05] text-destructive'
                        )}
                        data-testid="channel-dialog-validation-result"
                      >
                        <div className="flex items-start gap-2">
                          {validationResult.valid ? (
                            <CheckCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
                          ) : (
                            <WarningCircle className="mt-0.5 h-4 w-4 shrink-0" weight="fill" />
                          )}
                          <div className="min-w-0 space-y-2">
                            <p className="font-medium">
                              {validationResult.valid
                                ? t('dialog.credentialsVerified')
                                : t('dialog.validationFailed')}
                            </p>

                            {validationResult.errors.length > 0 ? (
                              <ul className="list-disc space-y-1 pl-5">
                                {validationResult.errors.map((err) => (
                                  <li key={err}>{err}</li>
                                ))}
                              </ul>
                            ) : null}

                            {validationResult.warnings.length > 0 ? (
                              <div className="space-y-1">
                                <p className="text-xs font-medium uppercase tracking-[0.2em]">
                                  {t('dialog.warnings')}
                                </p>
                                {validationResult.warnings.map((warn) => (
                                  <p key={warn} className="text-xs leading-5 opacity-90">
                                    {warn}
                                  </p>
                                ))}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <Separator />

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Button variant="outline" onClick={() => onSelectType(null)} data-testid="channel-dialog-back">
                      {t('dialog.back')}
                    </Button>

                    <div className="flex flex-wrap items-center justify-end gap-2">
                      {meta?.connectionType === 'token' ? (
                        <Button
                          variant="secondary"
                          onClick={handleValidate}
                          disabled={validating}
                          data-testid="channel-dialog-validate"
                        >
                          {validating ? (
                            <>
                              <CircleNotch className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                              {t('dialog.validating')}
                            </>
                          ) : (
                            <>
                              <ShieldCheck className="mr-2 h-4 w-4" weight="regular" />
                              {t('dialog.validateConfig')}
                            </>
                          )}
                        </Button>
                      ) : null}

                      <Button
                        onClick={handleConnect}
                        disabled={connecting || !isFormValid()}
                        data-testid="channel-dialog-connect"
                      >
                        {connecting ? (
                          <>
                            <CircleNotch className="mr-2 h-4 w-4 animate-spin" weight="bold" />
                            {meta?.connectionType === 'qr'
                              ? t('dialog.generatingQR')
                              : t('dialog.validatingAndSaving')}
                          </>
                        ) : meta?.connectionType === 'qr' ? (
                          t('dialog.generateQRCode')
                        ) : (
                          <>
                            <Check className="mr-2 h-4 w-4" weight="bold" />
                            {isExistingConfig
                              ? t('dialog.updateAndReconnect')
                              : t('dialog.saveAndConnect')}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
