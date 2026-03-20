/**
 * Profile Section
 * Displays and allows editing of basic profile information
 */
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Copy, Check, Save, Upload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccountStore } from '@/stores/account';
import { useAuthStore } from '@/stores/auth';
import { toast } from 'sonner';

export function ProfileSection() {
  const { t } = useTranslation('account');
  const { profile, updateProfile, uploadAvatar, isLoading } = useAccountStore();
  const { user } = useAuthStore();

  const [displayName, setDisplayName] = useState(profile?.display_name || '');
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync displayName with profile when it loads
  useEffect(() => {
    if (profile?.display_name != null) {
      setDisplayName(profile.display_name);
    }
  }, [profile]);

  const handleSave = async () => {
    setIsSaving(true);
    await updateProfile({ display_name: displayName });
    setIsSaving(false);
    toast.success(t('profile.saved'));
  };

  const copyUserId = async () => {
    if (user?.id) {
      await navigator.clipboard.writeText(user.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
      return;
    }

    // Validate file size (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB.');
      return;
    }

    const result = await uploadAvatar(file);
    if (result) {
      toast.success(t('profile.avatarUpdated', { defaultValue: 'Avatar updated successfully' }));
    } else {
      toast.error(t('profile.avatarUploadFailed', { defaultValue: 'Failed to upload avatar' }));
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5" />
          {t('profile.title')}
        </CardTitle>
        <CardDescription>{t('profile.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt={profile.display_name || 'User'}
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-10 w-10 text-muted-foreground" />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{t('profile.avatar')}</p>
            <p className="text-xs text-muted-foreground mb-2">{t('profile.changeAvatar')}</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="h-4 w-4 mr-2" />
              {t('profile.upload', { defaultValue: 'Upload' })}
            </Button>
          </div>
        </div>

        {/* Display Name */}
        <div className="space-y-2">
          <Label htmlFor="displayName">{t('profile.displayName')}</Label>
          <div className="flex gap-2">
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t('profile.displayNamePlaceholder')}
            />
            <Button onClick={handleSave} disabled={isSaving || isLoading}>
              {isSaving ? (
                <>{t('profile.saving')}</>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {t('common:actions.save', { defaultValue: 'Save' })}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* User ID */}
        <div className="space-y-2">
          <Label>{t('profile.userId')}</Label>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 text-sm font-mono">
              {user?.id}
            </code>
            <Button variant="outline" size="icon" onClick={copyUserId}>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Member Since */}
        {profile?.created_at && (
          <div className="space-y-2">
            <Label>{t('profile.memberSince')}</Label>
            <p className="text-sm text-muted-foreground">
              {formatDate(profile.created_at)}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
