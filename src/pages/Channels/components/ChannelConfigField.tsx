import { Eye, EyeSlash } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ChannelConfigField as ChannelConfigFieldType } from '@/types/channel';
import { useTranslation } from 'react-i18next';

interface ChannelConfigFieldProps {
  field: ChannelConfigFieldType;
  value: string;
  showSecret: boolean;
  onChange: (value: string) => void;
  onToggleSecret: () => void;
}

export function ChannelConfigField({
  field,
  value,
  showSecret,
  onChange,
  onToggleSecret,
}: ChannelConfigFieldProps) {
  const { t } = useTranslation('channels');
  const isPassword = field.type === 'password';

  return (
    <div className="space-y-2" data-testid={`channel-config-field-${field.key}`}>
      <Label htmlFor={field.key} className="text-sm font-medium">
        {t(field.label)}
        {field.required ? <span className="ml-1 text-destructive">*</span> : null}
      </Label>
      <div className="flex gap-2">
        <Input
          id={field.key}
          type={isPassword && !showSecret ? 'password' : 'text'}
          placeholder={field.placeholder ? t(field.placeholder) : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="font-mono text-sm"
          data-testid={`channel-config-input-${field.key}`}
        />
        {isPassword ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={onToggleSecret}
            data-testid={`channel-toggle-secret-${field.key}`}
          >
            {showSecret ? <EyeSlash className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>
      {field.description ? (
        <p className="text-xs leading-5 text-muted-foreground">{t(field.description)}</p>
      ) : null}
      {field.envVar ? (
        <p className="text-xs text-muted-foreground">
          {t('dialog.envVar', { var: field.envVar })}
        </p>
      ) : null}
    </div>
  );
}
