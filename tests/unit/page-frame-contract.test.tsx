import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageBody, PageContextBar, PageFrame, PageHeader } from '@/components/layout/PageFrame';

describe('PageFrame contract', () => {
  it('renders frame semantics with header action zone, context bar, and body separation', () => {
    render(
      <PageFrame>
        <PageHeader title="Settings" actions={<button>Save</button>} />
        <PageContextBar>
          <button>Filter</button>
        </PageContextBar>
        <PageBody>
          <div>Body</div>
        </PageBody>
      </PageFrame>
    );

    const frame = screen.getByTestId('page-frame');
    const header = screen.getByTestId('page-header');
    const contextBar = screen.getByTestId('page-context-bar');
    const body = screen.getByTestId('page-body');

    expect(frame.tagName).toBe('SECTION');
    expect(frame).toHaveClass('flex', 'flex-col');

    expect(header.tagName).toBe('HEADER');
    expect(header).toHaveClass('items-start', 'justify-between');
    expect(screen.getByTestId('page-header-actions')).toBeInTheDocument();
    expect(within(screen.getByTestId('page-header-actions')).getByRole('button', { name: /save/i })).toBeInTheDocument();

    expect(contextBar).toHaveClass('flex', 'items-center');
    expect(within(contextBar).getByRole('button', { name: /filter/i })).toBeInTheDocument();

    expect(body.tagName).toBe('DIV');
    expect(within(body).queryByRole('button', { name: /filter/i })).toBeNull();
  });

  it('does not render context bar when omitted', () => {
    render(
      <PageFrame>
        <PageHeader title="No Filters Page" />
        <PageBody>
          <div>Body</div>
        </PageBody>
      </PageFrame>
    );

    expect(screen.queryByTestId('page-context-bar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('page-header-actions')).not.toBeInTheDocument();
  });
});
