import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
}

/**
 * MarkdownRenderer - Parses JSON content and renders Markdown
 *
 * Handles backend response format:
 * [{"type":"thinking","thinking":"..."}, {"type":"text","text":"# 每日简报\n..."}]
 */
export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  let parsedContent = content;

  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed)) {
      // Filter out thinking and extract text content
      const textParts = parsed
        .filter((item) => item.type === 'text')
        .map((item) => item.text)
        .join('\n');
      parsedContent = textParts || content;
    }
  } catch {
    // Not JSON, use original content as-is
    parsedContent = content;
  }

  return (
    <div className="prose max-w-none dark:prose-invert prose-headings:font-semibold prose-a:text-blue-400 prose-ul:list-disc prose-ol:list-decimal">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {parsedContent}
      </ReactMarkdown>
    </div>
  );
}
