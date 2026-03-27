import { render, screen } from '@testing-library/react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';

describe('structure primitive contracts', () => {
  it('keeps card structure classes and legacy prop compatibility', () => {
    render(
      <Card data-testid="card" className="legacy-card-class">
        <CardHeader>
          <CardTitle>Card Title</CardTitle>
          <CardDescription>Card Description</CardDescription>
        </CardHeader>
        <CardContent>Card Body</CardContent>
        <CardFooter>Card Footer</CardFooter>
      </Card>
    );

    const card = screen.getByTestId('card');

    expect(card).toHaveClass('rounded-lg', 'border', 'bg-card', 'text-card-foreground', 'shadow-sm');
    expect(card).toHaveClass('legacy-card-class');
    expect(screen.getByText('Card Title')).toBeInTheDocument();
    expect(screen.getByText('Card Description')).toBeInTheDocument();
    expect(screen.getByText('Card Body')).toBeInTheDocument();
    expect(screen.getByText('Card Footer')).toBeInTheDocument();
  });

  it('keeps badge shape and variant contracts with legacy props', () => {
    render(
      <>
        <Badge data-testid="badge-default" className="legacy-badge-class">
          Default
        </Badge>
        <Badge data-testid="badge-secondary" variant="secondary">
          Secondary
        </Badge>
      </>
    );

    const defaultBadge = screen.getByTestId('badge-default');
    const secondaryBadge = screen.getByTestId('badge-secondary');

    expect(defaultBadge).toHaveClass('inline-flex', 'rounded', 'border', 'legacy-badge-class');
    expect(secondaryBadge).toHaveClass('bg-secondary', 'text-secondary-foreground');
  });

  it('keeps tabs state semantics and trigger/list class contracts', () => {
    render(
      <Tabs defaultValue="general">
        <TabsList aria-label="settings tabs" data-testid="tabs-list" className="legacy-tabs-list">
          <TabsTrigger value="general" className="legacy-tab-trigger">
            General
          </TabsTrigger>
          <TabsTrigger value="advanced">Advanced</TabsTrigger>
        </TabsList>

        <TabsContent value="general">General content</TabsContent>
        <TabsContent value="advanced">Advanced content</TabsContent>
      </Tabs>
    );

    const tabsList = screen.getByTestId('tabs-list');
    const generalTab = screen.getByRole('tab', { name: /general/i });
    const advancedTab = screen.getByRole('tab', { name: /advanced/i });

    expect(tabsList).toHaveClass('inline-flex', 'bg-muted', 'legacy-tabs-list');
    expect(generalTab).toHaveClass(
      'legacy-tab-trigger',
      'data-[state=active]:bg-background',
      'data-[state=active]:text-foreground'
    );

    expect(generalTab).toHaveAttribute('data-state', 'active');
    expect(advancedTab).toHaveAttribute('data-state', 'inactive');
  });

  it('keeps separator role/orientation and pixel-size contracts', () => {
    render(
      <>
        <Separator data-testid="horizontal-separator" className="legacy-separator" />
        <Separator data-testid="vertical-separator" orientation="vertical" decorative={false} />
      </>
    );

    const horizontal = screen.getByTestId('horizontal-separator');
    const vertical = screen.getByTestId('vertical-separator');

    expect(horizontal).toHaveAttribute('role', 'separator');
    expect(horizontal).toHaveAttribute('data-orientation', 'horizontal');
    expect(horizontal).toHaveClass('shrink-0', 'bg-border', 'h-px', 'w-full', 'legacy-separator');

    expect(vertical).toHaveAttribute('role', 'separator');
    expect(vertical).toHaveAttribute('data-orientation', 'vertical');
    expect(vertical).toHaveClass('shrink-0', 'bg-border', 'h-full', 'w-px');
  });
});
