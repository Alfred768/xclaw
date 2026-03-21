import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('unwraps fenced markdown blocks when enabled and preserves surrounding text', () => {
    const { container } = render(
      <MarkdownRenderer
        content={`Intro text

\`\`\`markdown
# Unwrapped heading

Some paragraph text.
\`\`\`

Outro text`}
        unwrapMarkdownCodeBlocks
      />
    );

    expect(screen.getByText('Intro text')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Unwrapped heading' })).toBeInTheDocument();
    expect(screen.getByText('Some paragraph text.')).toBeInTheDocument();
    expect(screen.getByText('Outro text')).toBeInTheDocument();
    expect(container.querySelector('code.language-markdown')).toBeNull();
  });

  it('keeps non-markdown code fences rendered as code', () => {
    const { container } = render(
      <MarkdownRenderer
        content={`Before

\`\`\`json
{"name":"ClawX"}
\`\`\`

After`}
        unwrapMarkdownCodeBlocks
      />
    );

    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(container.querySelector('code.language-json')).toBeInTheDocument();
  });

  it('does not unwrap markdown fences when the prop is omitted', () => {
    const { container } = render(
      <MarkdownRenderer
        content={`Before

\`\`\`markdown
# Wrapped heading
\`\`\`

After`}
      />
    );

    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(container.querySelector('code.language-markdown')).toBeInTheDocument();
  });
});
