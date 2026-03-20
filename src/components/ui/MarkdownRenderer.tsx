import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

/**
 * Custom link component that opens in external browser
 */
function LinkComponent(props: React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  const { href, children, ...rest } = props;

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (href) {
      // Use Electron's shell to open in external browser
      try {
        if (window.electron?.ipcRenderer) {
          await window.electron.ipcRenderer.invoke('shell:openExternal', href);
        } else {
          // Fallback: open in new window
          window.open(href, '_blank');
        }
      } catch (err) {
        console.error('Failed to open external link:', err);
        // Fallback
        window.open(href, '_blank');
      }
    }
  };

  return (
    <a href={href} onClick={handleClick} className="text-blue-400 hover:underline cursor-pointer" {...rest}>
      {children}
    </a>
  );
}

/**
 * MarkdownRenderer - Parses JSON content and renders Markdown
 *
 * Handles backend response formats:
 * 1. [{"type":"thinking","thinking":"..."}, {"type":"text","text":"# 每日简报\n..."}]
 * 2. [{"type":"toolCall","name":"write","arguments":{"content":"# 每日简报\n..."}}]
 * 3. Plain markdown text
 *
 * Links are opened in external browser instead of in-app
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  let parsedContent = content;

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      const textParts: string[] = [];

      for (const item of parsed) {
        if (item.type === 'text' && item.text) {
          // Standard text content
          textParts.push(item.text);
        } else if (item.type === 'toolCall' && item.arguments?.content) {
          // Tool call with content (e.g., write tool with markdown content)
          textParts.push(item.arguments.content);
        }
      }

      parsedContent = textParts.join('\n') || content;
    }
  } catch {
    // Not JSON, use original content as-is
    parsedContent = content;
  }

  return (
    <div className="prose max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-blue-400 prose-ul:list-disc prose-ol:list-decimal">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: LinkComponent,
        }}
      >
        {parsedContent}
      </ReactMarkdown>
    </div>
  );
}
