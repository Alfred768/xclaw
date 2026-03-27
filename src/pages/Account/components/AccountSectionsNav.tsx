type AccountSectionItem = {
  id: string;
  label: string;
};

interface AccountSectionsNavProps {
  sections: AccountSectionItem[];
}

export function AccountSectionsNav({ sections }: AccountSectionsNavProps) {
  return (
    <nav
      aria-label="Account sections"
      className="rounded-lg border bg-background p-2"
    >
      <ul className="space-y-1">
        {sections.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className="block rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export type { AccountSectionItem };
