import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

describe('form/input primitive contracts', () => {
  it('applies focus ring and border-input contracts', () => {
    render(
      <>
        <Button>Save</Button>
        <Input aria-label="api key" />
        <Textarea aria-label="notes" />
        <Select aria-label="provider" defaultValue="openai">
          <option value="openai">OpenAI</option>
        </Select>
      </>
    );

    const button = screen.getByRole('button', { name: /save/i });
    const input = screen.getByRole('textbox', { name: /api key/i });
    const textarea = screen.getByRole('textbox', { name: /notes/i });
    const select = screen.getByRole('combobox', { name: /provider/i });

    expect(button).toHaveClass('focus-visible:ring-2', 'focus-visible:ring-ring');
    expect(input).toHaveClass('border-input', 'focus-visible:ring-2');
    expect(textarea).toHaveClass('border-input', 'focus-visible:ring-2');
    expect(select).toHaveClass('border-input', 'focus-visible:ring-2');
  });

  it('keeps disabled controls readable', () => {
    render(
      <>
        <Button disabled>Disabled action</Button>
        <Input aria-label="disabled input" disabled />
        <Textarea aria-label="disabled textarea" disabled />
        <Select aria-label="disabled select" disabled defaultValue="openai">
          <option value="openai">OpenAI</option>
        </Select>
      </>
    );

    const button = screen.getByRole('button', { name: /disabled action/i });
    const input = screen.getByRole('textbox', { name: /disabled input/i });
    const textarea = screen.getByRole('textbox', { name: /disabled textarea/i });
    const select = screen.getByRole('combobox', { name: /disabled select/i });

    expect(button).toBeDisabled();
    expect(button).toHaveClass('disabled:text-muted-foreground');

    expect(input).toBeDisabled();
    expect(input).toHaveClass('disabled:text-muted-foreground', 'disabled:bg-muted/30');

    expect(textarea).toBeDisabled();
    expect(textarea).toHaveClass('disabled:text-muted-foreground', 'disabled:bg-muted/30');

    expect(select).toBeDisabled();
    expect(select).toHaveClass('disabled:text-muted-foreground', 'disabled:bg-muted/30');
  });

  it('keeps label association and legacy props compatibility', () => {
    const onSelectChange = vi.fn();

    render(
      <>
        <Label htmlFor="api-key">API Key</Label>
        <Input id="api-key" type="password" />

        <Button variant="outline" size="sm">
          Outline
        </Button>

        <Textarea aria-label="compat textarea" rows={4} defaultValue="x" />

        <Select
          aria-label="compat select"
          value="openai"
          onChange={(event) => onSelectChange(event.target.value)}
        >
          <option value="openai">OpenAI</option>
          <option value="claude">Claude</option>
        </Select>
      </>
    );

    expect(screen.getByText('API Key')).toHaveClass('text-sm');
    expect(screen.getByLabelText('API Key')).toHaveAttribute('type', 'password');

    const outlineButton = screen.getByRole('button', { name: /outline/i });
    expect(outlineButton).toHaveClass('border-input');

    const textarea = screen.getByRole('textbox', { name: /compat textarea/i });
    expect(textarea).toHaveAttribute('rows', '4');

    const select = screen.getByRole('combobox', { name: /compat select/i });
    expect(select).toHaveValue('openai');
    fireEvent.change(select, { target: { value: 'claude' } });
    expect(onSelectChange).toHaveBeenCalledWith('claude');
  });

  it('maps switch visual states and disabled contract', () => {
    render(
      <>
        <Switch aria-label="notifications" />
        <Switch aria-label="disabled switch" disabled defaultChecked />
      </>
    );

    const notifications = screen.getByRole('switch', { name: /notifications/i });
    expect(notifications).toHaveAttribute('data-state', 'unchecked');
    expect(notifications).toHaveClass(
      'data-[state=checked]:bg-primary',
      'data-[state=unchecked]:bg-input',
      'focus-visible:ring-2'
    );

    fireEvent.click(notifications);
    expect(notifications).toHaveAttribute('data-state', 'checked');

    const disabledSwitch = screen.getByRole('switch', { name: /disabled switch/i });
    expect(disabledSwitch).toBeDisabled();
    expect(disabledSwitch).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50');
  });

  it('exposes progressbar semantics and value-driven indicator state', () => {
    const { rerender } = render(<Progress aria-label="download progress" value={42} />);

    const progress = screen.getByRole('progressbar', { name: /download progress/i });
    expect(progress).toHaveAttribute('aria-valuemin', '0');
    expect(progress).toHaveAttribute('aria-valuemax', '100');
    expect(progress).toHaveAttribute('aria-valuenow', '42');

    const indicator = progress.firstElementChild as HTMLElement;
    expect(indicator).toHaveStyle({ transform: 'translateX(-58%)' });

    rerender(<Progress aria-label="download progress" value={85} />);
    expect(progress).toHaveAttribute('aria-valuenow', '85');
    expect(indicator).toHaveStyle({ transform: 'translateX(-15%)' });
  });
});
