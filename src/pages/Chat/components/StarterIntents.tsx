import { Sparkle, ChatCircle, Wrench, type Icon } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';

export interface StarterIntent {
  title: string;
  description: string;
  prompt: string;
  icon: Icon;
}

interface StarterIntentsProps {
  intents: StarterIntent[];
  onSelect: (prompt: string) => void;
}

export function StarterIntents({ intents, onSelect }: StarterIntentsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3" data-testid="chat-starter-intents">
      {intents.map((intent, index) => (
        <Button
          key={intent.prompt}
          variant="outline"
          className="h-auto items-start justify-start gap-3 px-4 py-3 text-left"
          onClick={() => onSelect(intent.prompt)}
          data-testid={`chat-starter-intent-${index}`}
        >
          <intent.icon className="mt-0.5 h-4 w-4 shrink-0" weight="regular" />
          <span className="flex flex-col gap-1">
            <span className="text-sm font-medium">{intent.title}</span>
            <span className="text-xs text-muted-foreground">{intent.description}</span>
          </span>
        </Button>
      ))}
    </div>
  );
}

export function buildDefaultStarterIntents(t: (key: string) => string): StarterIntent[] {
  return [
    {
      icon: ChatCircle,
      title: t('welcome.askQuestions'),
      description: t('welcome.askQuestionsDesc'),
      prompt: t('welcome.askQuestions'),
    },
    {
      icon: Sparkle,
      title: t('welcome.creativeTasks'),
      description: t('welcome.creativeTasksDesc'),
      prompt: t('welcome.creativeTasks'),
    },
    {
      icon: Wrench,
      title: t('toolbar.refresh'),
      description: t('welcome.subtitle'),
      prompt: t('welcome.subtitle'),
    },
  ];
}
