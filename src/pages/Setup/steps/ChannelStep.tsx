/**
 * ChannelStep Component
 * Channel connection setup
 */

import { useState, useEffect } from 'react';
import {
  Check,
  CaretLeft,
  CircleNotch,
  Eye,
  EyeSlash,
  XCircle,
  Book,
  ArrowSquareOut,
} from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  CHANNEL_META,
  getPrimaryChannels,
  type ChannelType,
  type ChannelMeta,
  type ChannelConfigField,
} from '@/types/channel';

export function ChannelStep() {
  const { t } = useTranslation(['setup', 'channels']);
  const [selectedChannel, setSelectedChannel] = useState<ChannelType | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [qrConnecting, setQrConnecting] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const meta: ChannelMeta | null = selectedChannel ? CHANNEL_META[selectedChannel] : null;
  const primaryChannels = getPrimaryChannels();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!selectedChannel) return;
      try {
        const result = await window.electron.ipcRenderer.invoke(
          'channel:getFormValues',
          selectedChannel
        ) as { success: boolean; values?: Record<string, string> };
        if (cancelled) return;
        if (result.success && result.values) {
          setConfigValues(result.values);
        } else {
          setConfigValues({});
        }
        setQrCode(null);
        setQrConnecting(false);
      } catch {
        if (!cancelled) {
          setConfigValues({});
          setQrCode(null);
          setQrConnecting(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [selectedChannel]);

  useEffect(() => {
    if (selectedChannel !== 'whatsapp') return;

    const onQr = (...args: unknown[]) => {
      const data = args[0] as { qr: string; raw: string };
      setQrCode(`data:image/png;base64,${data.qr}`);
      setQrConnecting(false);
    };

    const onSuccess = async () => {
      toast.success(t('channels:toast.whatsappConnected'));
      try {
        await window.electron.ipcRenderer.invoke('channel:saveConfig', 'whatsapp', { enabled: true });
      } catch {
        // ignore save failures here, user can still continue setup
      }
      setQrCode(null);
      setQrConnecting(false);
      setSaved(true);
    };

    const onError = (...args: unknown[]) => {
      const err = String(args[0] || 'Unknown error');
      toast.error(t('channels:toast.whatsappFailed', { error: err }));
      setValidationError(err);
      setQrCode(null);
      setQrConnecting(false);
    };

    const removeQrListener = window.electron.ipcRenderer.on('channel:whatsapp-qr', onQr);
    const removeSuccessListener = window.electron.ipcRenderer.on('channel:whatsapp-success', onSuccess);
    const removeErrorListener = window.electron.ipcRenderer.on('channel:whatsapp-error', onError);

    return () => {
      if (typeof removeQrListener === 'function') removeQrListener();
      if (typeof removeSuccessListener === 'function') removeSuccessListener();
      if (typeof removeErrorListener === 'function') removeErrorListener();
      window.electron.ipcRenderer.invoke('channel:cancelWhatsAppQr').catch(() => { });
    };
  }, [selectedChannel, t]);

  const handleRequestWhatsAppQr = async () => {
    if (selectedChannel !== 'whatsapp') return;

    setValidationError(null);
    setQrConnecting(true);
    setQrCode(null);

    try {
      const result = await window.electron.ipcRenderer.invoke(
        'channel:requestWhatsAppQr',
        'default'
      ) as { success?: boolean; error?: string };

      if (!result?.success) {
        throw new Error(result?.error || 'Failed to request WhatsApp QR');
      }
    } catch (error) {
      setValidationError(String(error));
      setQrConnecting(false);
    }
  };

  const isFormValid = () => {
    if (!meta) return false;
    return meta.configFields
      .filter((f: ChannelConfigField) => f.required)
      .every((f: ChannelConfigField) => configValues[f.key]?.trim());
  };

  const handleSave = async () => {
    if (!selectedChannel || !meta || !isFormValid()) return;

    setSaving(true);
    setValidationError(null);

    try {
      // Validate credentials first
      const validation = await window.electron.ipcRenderer.invoke(
        'channel:validateCredentials',
        selectedChannel,
        configValues
      ) as { success: boolean; valid?: boolean; errors?: string[]; details?: Record<string, string> };

      if (!validation.valid) {
        setValidationError((validation.errors || ['Validation failed']).join(', '));
        setSaving(false);
        return;
      }

      // Save config
      await window.electron.ipcRenderer.invoke('channel:saveConfig', selectedChannel, { ...configValues });

      const botName = validation.details?.botUsername ? ` (@${validation.details.botUsername})` : '';
      toast.success(`${meta.name} configured${botName}`);
      setSaved(true);
    } catch (error) {
      setValidationError(String(error));
    } finally {
      setSaving(false);
    }
  };

  // Already saved — show success
  if (saved) {
    return (
      <div className="text-center space-y-4">
        <div className="text-5xl">✅</div>
        <h2 className="text-xl font-semibold">
          {t('channel.connected', { name: meta?.name || 'Channel' })}
        </h2>
        <p className="text-muted-foreground">
          {t('channel.connectedDesc')}
        </p>
        <Button
          variant="ghost"
          className="text-muted-foreground"
          onClick={() => {
            setSaved(false);
            setSelectedChannel(null);
            setConfigValues({});
            setQrCode(null);
            setQrConnecting(false);
          }}
        >
          {t('channel.configureAnother')}
        </Button>
      </div>
    );
  }

  // Channel type not selected — show picker
  if (!selectedChannel) {
    return (
      <div className="space-y-4">
        <div className="text-center mb-2">
          <div className="text-4xl mb-3">📡</div>
          <h2 className="text-xl font-semibold">{t('channel.title')}</h2>
          <p className="text-muted-foreground text-sm mt-1">
            {t('channel.subtitle')}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {primaryChannels.map((type) => {
            const channelMeta = CHANNEL_META[type];
            if (channelMeta.connectionType !== 'token' && channelMeta.connectionType !== 'qr') return null;
            return (
              <button
                key={type}
                onClick={() => setSelectedChannel(type)}
                className="p-4 rounded-lg bg-muted/50 hover:bg-muted transition-all text-left"
              >
                <span className="text-3xl">{channelMeta.icon}</span>
                <p className="font-medium mt-2">{channelMeta.name}</p>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                  {t(channelMeta.description)}
                </p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // Channel selected — show config form
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <button
          onClick={() => {
            setSelectedChannel(null);
            setConfigValues({});
            setValidationError(null);
            setQrCode(null);
            setQrConnecting(false);
          }}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <CaretLeft className="h-5 w-5" weight="bold" />
        </button>
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <span>{meta?.icon}</span> {t('channel.configure', { name: meta?.name })}
          </h2>
          <p className="text-muted-foreground text-sm mt-1">{t(meta?.description || '')}</p>
        </div>
      </div>

      {/* Instructions */}
      <div className="p-3 rounded-lg bg-muted/50 text-sm">
        <div className="flex items-center justify-between mb-2">
          <p className="font-medium text-foreground">{t('channel.howTo')}</p>
          {meta?.docsUrl && (
            <button
              onClick={() => {
                try {
                  const url = t(meta.docsUrl!);
                  if (window.electron?.openExternal) {
                    window.electron.openExternal(url);
                  } else {
                    window.open(url, '_blank');
                  }
                } catch {
                  // ignore
                }
              }}
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <Book className="h-3 w-3" weight="regular" />
              {t('channel.viewDocs')}
              <ArrowSquareOut className="h-3 w-3" weight="regular" />
            </button>
          )}
        </div>
        <ol className="list-decimal list-inside text-muted-foreground space-y-1">
          {meta?.instructions.map((inst, i) => (
            <li key={i}>{t(inst)}</li>
          ))}
        </ol>
      </div>

      {/* Config fields */}
      {meta?.configFields.map((field: ChannelConfigField) => {
        const isPassword = field.type === 'password';
        return (
          <div key={field.key} className="space-y-1.5">
            <Label htmlFor={`setup-${field.key}`} className="text-foreground">
              {t(field.label)}
              {field.required && <span className="text-red-400 ml-1">*</span>}
            </Label>
            <div className="flex gap-2">
              <Input
                id={`setup-${field.key}`}
                type={isPassword && !showSecrets[field.key] ? 'password' : 'text'}
                placeholder={field.placeholder ? t(field.placeholder) : undefined}
                value={configValues[field.key] || ''}
                onChange={(e) => setConfigValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                autoComplete="off"
                className="font-mono text-sm bg-background border-input"
              />
              {isPassword && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="shrink-0"
                  onClick={() => setShowSecrets((prev) => ({ ...prev, [field.key]: !prev[field.key] }))}
                >
                  {showSecrets[field.key] ? <EyeSlash className="h-4 w-4" weight="regular" /> : <Eye className="h-4 w-4" weight="regular" />}
                </Button>
              )}
            </div>
            {field.description && (
              <p className="text-xs text-slate-500 mt-1">{t(field.description)}</p>
            )}
          </div>
        );
      })}

      {/* Validation error */}
      {validationError && (
        <div className="p-3 rounded-lg bg-red-900/30 border border-red-500/30 text-sm text-red-300 flex items-start gap-2">
          <XCircle className="h-4 w-4 mt-0.5 shrink-0" weight="fill" />
          <span>{validationError}</span>
        </div>
      )}

      {meta?.connectionType === 'qr' && qrCode && (
        <div className="rounded-lg border bg-muted/30 p-4 text-center space-y-3">
          <p className="text-sm text-muted-foreground">
            {t('channels:dialog.scanQR', { name: meta?.name || 'WhatsApp' })}
          </p>
          <img
            src={qrCode}
            alt="WhatsApp QR"
            className="mx-auto rounded-md bg-white p-2 w-52 h-52"
          />
        </div>
      )}

      {/* Save button */}
      {meta?.connectionType === 'qr' ? (
        <Button
          className="w-full"
          onClick={handleRequestWhatsAppQr}
          disabled={qrConnecting}
        >
          {qrConnecting ? (
            <>
              <CircleNotch className="h-4 w-4 mr-2 animate-spin" weight="bold" />
              {t('channels:dialog.generatingQR')}
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" weight="bold" />
              {t('channels:dialog.generateQRCode')}
            </>
          )}
        </Button>
      ) : (
        <Button
          className="w-full"
          onClick={handleSave}
          disabled={!isFormValid() || saving}
        >
          {saving ? (
            <>
              <CircleNotch className="h-4 w-4 mr-2 animate-spin" weight="bold" />
              {t('provider.validateSave')}
            </>
          ) : (
            <>
              <Check className="h-4 w-4 mr-2" weight="bold" />
              {t('provider.validateSave')}
            </>
          )}
        </Button>
      )}
    </div>
  );
}
