/**
 * Developer Section
 * API Key management for programmatic access
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Code, Plus, Copy, Check, Trash, Key, Warning } from '@phosphor-icons/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAccountStore } from '@/stores/account';
import { toast } from 'sonner';

export function DeveloperSection() {
  const { t } = useTranslation('account');
  const { apiKeys, createApiKey, revokeApiKey, isLoading } = useAccountStore();

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedCreatedKey, setCopiedCreatedKey] = useState(false);

  const handleCreateKey = async () => {
    setIsCreating(true);
    const key = await createApiKey(newKeyName || undefined);
    setIsCreating(false);

    if (key) {
      setCreatedKey(key);
      setNewKeyName('');
      toast.success(t('developer.keyCreated'));
    } else {
      toast.error(t('errors.keyCreateFailed'));
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (confirm(t('developer.revokeConfirm'))) {
      await revokeApiKey(keyId);
      toast.success(t('developer.keyRevoked', { defaultValue: 'API key revoked' }));
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedCreatedKey(true);
    toast.success(t('developer.keyCopied'));
    setTimeout(() => setCopiedCreatedKey(false), 2000);
  };

  const copyKeyPrefix = async (prefix: string) => {
    await navigator.clipboard.writeText(prefix);
    setCopiedKey(true);
    toast.success(t('developer.keyCopied'));
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return t('developer.never');
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" weight="regular" />
                {t('developer.title')}
              </CardTitle>
              <CardDescription>{t('developer.description')}</CardDescription>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" weight="bold" />
              {t('developer.createKey')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* API Keys List */}
          {apiKeys.length > 0 ? (
            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <Key className="h-5 w-5 text-muted-foreground" weight="regular" />
                    <div>
                      <p className="font-medium">{key.name || 'API Key'}</p>
                      <p className="text-sm text-muted-foreground font-mono">
                        {key.key_prefix}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground text-right">
                      <p>{t('developer.created')}: {formatDate(key.created_at)}</p>
                      <p>{t('developer.lastUsed')}: {formatDate(key.last_used_at)}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleRevokeKey(key.id)}
                    >
                      <Trash className="h-4 w-4" weight="regular" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" weight="thin" />
              <p className="text-muted-foreground font-medium">{t('developer.noKeys')}</p>
              <p className="text-sm text-muted-foreground mt-1">{t('developer.noKeysDesc')}</p>
              <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" weight="bold" />
                {t('developer.createKey')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Key Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('developer.createKey')}</DialogTitle>
            <DialogDescription>
              {t('developer.createKeyDesc', { defaultValue: 'Create a new API key for programmatic access' })}
            </DialogDescription>
          </DialogHeader>

          {!createdKey ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="keyName">{t('developer.keyName')} (optional)</Label>
                <Input
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={t('developer.keyNamePlaceholder')}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {t('common:actions.cancel', { defaultValue: 'Cancel' })}
                </Button>
                <Button onClick={handleCreateKey} disabled={isCreating}>
                  {isCreating ? t('common:status.loading', { defaultValue: 'Loading...' }) : t('developer.createKey')}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                  <Check className="h-4 w-4" weight="bold" />
                  <span className="font-medium">{t('developer.keyCreated')}</span>
                </div>
                <p className="text-sm text-green-600 dark:text-green-300 mb-3">
                  {t('developer.keyCreatedDesc')}
                </p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-white dark:bg-gray-800 px-3 py-2 text-sm font-mono break-all">
                    {createdKey}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(createdKey)}
                  >
                    {copiedCreatedKey ? <Check className="h-4 w-4 text-green-500" weight="bold" /> : <Copy className="h-4 w-4" weight="regular" />}
                  </Button>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => {
                    setCreatedKey(null);
                    setIsCreateDialogOpen(false);
                  }}
                >
                  {t('common:actions.close', { defaultValue: 'Close' })}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
