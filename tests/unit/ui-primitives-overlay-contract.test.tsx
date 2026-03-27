import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

describe('overlay primitive contracts', () => {
  it('keeps dialog overlay/content layering, focus-in, escape close, and trigger focus return', async () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button type="button">Open dialog</button>
        </DialogTrigger>
        <DialogContent
          {...({
            overlayClassName: 'legacy-overlay-class',
            contentClassName: 'legacy-dialog-content-class',
          } as unknown as Record<string, unknown>)}
        >
          <DialogTitle>Dialog Title</DialogTitle>
          <DialogDescription>Dialog Description</DialogDescription>
          <button type="button">Dialog action</button>
        </DialogContent>
      </Dialog>
    );

    const triggerButton = screen.getByRole('button', { name: /open dialog/i });
    fireEvent.click(triggerButton);

    const dialogContent = await screen.findByTestId('dialog-content');
    const dialogOverlay = screen.getByTestId('dialog-overlay');

    expect(dialogOverlay).toBeInTheDocument();
    expect(dialogOverlay).toHaveClass('z-50');
    expect(dialogOverlay).toHaveClass('legacy-overlay-class');
    expect(dialogContent).toHaveClass('z-50');
    expect(dialogContent).toHaveClass('legacy-dialog-content-class');

    await waitFor(() => {
      expect(dialogContent.contains(document.activeElement)).toBe(true);
    });

    fireEvent.keyDown(document, { key: 'Escape' });

    await waitFor(() => {
      expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
    });
    expect(triggerButton).toHaveFocus();
  });

  it('keeps tooltip layering and accepts legacy content class prop', async () => {
    render(
      <TooltipProvider>
        <Tooltip open>
          <TooltipTrigger asChild>
            <button type="button">Hover me</button>
          </TooltipTrigger>
          <TooltipContent
            {...({
              contentClassName: 'legacy-tooltip-content-class',
            } as unknown as Record<string, unknown>)}
          >
            Tooltip text
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );

    const tooltipContent = await screen.findByTestId('tooltip-content');
    expect(tooltipContent).toHaveClass('z-50');
    expect(tooltipContent).toHaveClass('legacy-tooltip-content-class');
  });
});
