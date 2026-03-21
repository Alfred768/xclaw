# Briefing Markdown Unwrap (Design)

## Context
The Briefing page renders daily summaries with `MarkdownRenderer`. Current content frequently contains fenced code blocks labeled `markdown`, so ReactMarkdown treats them as code and shows a `<pre><code class="language-markdown">...` block instead of rendering the actual Markdown content. This is visible in the Briefing UI.

## Problem
Markdown content wrapped in fenced blocks with language `markdown`/`md` is not rendered as Markdown on the Briefing page.

## Goals
- Render fenced blocks labeled `markdown` or `md` as actual Markdown on the Briefing page.
- Preserve all other code fences as code blocks.
- Scope change to Briefing only.

## Non-Goals
- Global Markdown rendering changes across the app.
- Changing how non-`markdown` code fences render.

## Options Considered
1. **Briefing-only preprocessor**: unwrap fences before passing to the renderer. Simple, but duplicates parsing logic.
2. **Renderer opt-in prop (recommended)**: add `unwrapMarkdownCodeBlocks` to `MarkdownRenderer`, enable only in Briefing.
3. **Remark plugin**: more correct AST transform, but heavier for a single page.

## Decision
Implement option 2: add an optional prop to `MarkdownRenderer` to unwrap only `markdown`/`md` fenced blocks, and enable it only in Briefing.

## Behavior
- When `unwrapMarkdownCodeBlocks` is true, replace any fenced block with info string `markdown` or `md` (case-insensitive) with its inner content.
- This applies even when the fenced block appears inside other text.
- All other fenced blocks remain unchanged.
- Malformed fences (missing closing fence) remain untouched.

## Implementation Plan
1. **`MarkdownRenderer`**  
   - Add optional prop `unwrapMarkdownCodeBlocks?: boolean`.
   - After existing JSON extraction and outer wrapper stripping, apply a transform only when the prop is true.
   - Use a global, non-greedy regex to unwrap `markdown`/`md` fences.

2. **`Briefing` page**  
   - Pass `unwrapMarkdownCodeBlocks` to the renderer used in the Briefing content area.

## Parsing Rule (Draft)
- Regex: ```/(^|\n)```(?:markdown|md)\s*\n?([\s\S]*?)\n?```/gi```
- Replace with inner content, preserving surrounding newlines.

## Test Plan (Manual)
- Render the stored briefing content that includes a ` ```markdown ` block and confirm it renders as normal Markdown (no `language-markdown` code block).
- Confirm that other fences (e.g. ` ```json `) still render as code.

## Risks
- Over-unwrapping if `markdown`/`md` fences are used intentionally as code blocks. This is considered acceptable in Briefing because the model output is intended to be rendered Markdown.

## Rollout
- Briefing page only. No global behavior change.
