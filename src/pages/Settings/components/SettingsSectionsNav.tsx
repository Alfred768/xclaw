import type { MouseEvent } from 'react';

type SettingsSectionItem = {
  id: string;
  label: string;
};

interface SettingsSectionsNavProps {
  sections: SettingsSectionItem[];
}

export function SettingsSectionsNav({ sections }: SettingsSectionsNavProps) {
  const handleAnchorClick = (event: MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    event.preventDefault();

    const target = document.getElementById(sectionId);
    if (!target) {
      return;
    }

    if (typeof target.scrollIntoView !== 'function') {
      return;
    }

    const prefersReducedMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    target.scrollIntoView({
      behavior: prefersReducedMotion ? 'auto' : 'smooth',
      block: 'start',
    });
  };

  return (
    <nav
      aria-label="Settings sections"
      className="sticky top-0 z-10 -mx-2 overflow-x-auto px-2 py-1"
    >
      <div className="inline-flex min-w-full gap-2 rounded-lg border bg-background/95 p-1 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            onClick={(event) => handleAnchorClick(event, section.id)}
            className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            {section.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

export type { SettingsSectionItem };
