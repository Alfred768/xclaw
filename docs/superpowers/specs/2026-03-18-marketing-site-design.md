# XClaw Marketing Site Design Spec

**Date:** 2026-03-18
**Status:** Approved in conversation, written for review

## Goal
Create a standalone bilingual marketing site for XClaw that can be deployed to Vercel independently from the Electron app build output. The site should explain the product clearly to non-technical users first, while still signaling product maturity to decision-makers and technical depth to developers.

## Why This Exists
The current `dist/` directory is a build artifact and gets wiped by Vite builds. It is not a safe home for a hand-maintained marketing site. The new marketing site needs its own stable source directory and its own deployment target so it is not coupled to Electron renderer builds.

## Audience Priority
1. Users who want automation but do not want to touch the command line
2. Team / company decision-makers evaluating whether the product is real and usable
3. AI developers / technical users looking for extensibility and architecture signals

## Brand Direction
- Primary tone: warm, accessible, productized
- Secondary tone: reliable, structured, credible
- Tertiary tone: modern, forward-looking, but restrained

### Explicit Anti-Patterns
- Do not make it look like a documentation homepage
- Do not make it look like a glowing cyberpunk AI landing page
- Do not rely on generic AI marketing patterns: neon gradients, glowing glass cards, floating abstract orbs, meaningless metrics, badge spam

## Site Type
A standalone landing page in a dedicated `website/` directory, deployed separately from the Electron application.

## Information Architecture
The homepage should follow this reading order:

1. **Hero**
   - Clear product statement
   - Supporting explanation in plain language
   - Primary and secondary CTA buttons
   - Real product screenshots used as visual proof

2. **Proof Strip**
   - 3 to 4 short proof points
   - Focus on low-friction onboarding, automation, extensibility, and product completeness

3. **Feature Story Blocks**
   - Story 1: easy setup without CLI friction
   - Story 2: actual workflows through chat + automation
   - Story 3: scalable surfaces for teams and advanced users

4. **Product Surface Gallery**
   - Chat
   - Channels
   - Skills
   - Cron / automation
   - Dashboard / settings where useful

5. **Why XClaw**
   - Explain why a desktop interface matters when OpenClaw already exists
   - Position XClaw as the practical layer between powerful agent runtime and real people

6. **Footer CTA**
   - Download / releases
   - GitHub
   - Discord
   - language switch remains accessible

## Messaging Strategy
### Core Narrative
XClaw turns OpenClaw into a desktop AI workspace that ordinary users can actually use.

### Messaging Priorities
- First layer: easier to start, easier to manage, easier to use
- Second layer: credible product, not a prototype
- Third layer: built on OpenClaw with real extensibility

### Copy Rules
- Avoid inflated AI slogans
- Prefer concrete product language over hype
- Keep headings short and declarative
- Treat screenshots as evidence that supports the copy

## Bilingual Requirements
- Default language: Simplified Chinese
- Secondary language: English
- Language toggle available on the page
- Both languages must be complete, not partial
- Layout must handle both Chinese and English lengths gracefully

## Visual System
### Overall Look
- Light-first interface
- Large whitespace and stable structure
- Left-aligned reading rhythm, not center-stacked everything
- Real product UI should be the visual hero

### Color Direction
- Warm off-white or lightly tinted neutral background
- Cool gray-blue neutrals for structure
- One restrained accent family for actions and highlights
- No neon purple-blue AI palette

### Typography Direction
- Avoid Inter / Roboto / Arial defaults
- Use a more distinctive but readable display font for headings
- Use a clean, stable body font that handles Chinese and English well
- Chinese-first readability takes precedence over ornamental typography

### Layout Direction
- Do not use a generic grid of identical cards across the whole page
- Vary rhythm with story sections and screenshot-led compositions
- Use asymmetry carefully to make the page feel designed, not chaotic

### Motion Direction
- Minimal, meaningful motion only
- Small entrance transitions, hover responses, and language-switch polish
- No ambient glowing, floating, or theatrical hero animations

## Assets To Reuse
Primary product proof assets:
- `resources/screenshot/dashboard.png`
- `resources/screenshot/chat.png`
- `resources/screenshot/channels.png`
- `resources/screenshot/skills.png`
- `resources/screenshot/settings.png`

Secondary assets:
- icon / logo assets from `resources/icons/`
- selected messaging and structure from `README.md` and `README.zh-CN.md`

## File Strategy
Planned stable source area:
- `website/index.html`
- `website/styles.css`
- `website/script.js`
- `website/assets/...`
- `website/vercel.json`

Auth callback site should remain separate and not be mixed into the marketing site deployment target.

## Deployment Direction
- `clawx-static-5x7juzjzd-alfreds-projects-6240c1d2.vercel.app` continues to host the static auth callback page
- `dist-29esxheom-alfreds-projects-6240c1d2.vercel.app` should be repointed from `dist/` to the new stable website source directory after implementation
- The marketing site must no longer depend on `vite build` output

## Success Criteria
- A user landing on the page understands the product within one screen
- The page feels like a real software product site, not a docs shell or AI aesthetic template
- Chinese is the default experience, with complete English switching
- The site can be deployed independently from Electron builds
- Future app builds cannot destroy the marketing site source files

## Risks To Watch
- Overusing feature cards and drifting toward a docs-like page
- Overcompensating visually and drifting into cyber AI marketing style
- Treating bilingual support as a late add-on instead of a first-class layout constraint
- Coupling website assets or routing back into the app build pipeline

## Implementation Follow-Up
The implementation plan should cover:
- creating the standalone `website/` source tree
- selecting and wiring bilingual content structure
- copying or optimizing screenshot assets for the site
- creating safe Vercel config for the marketing site
- separating callback-page hosting from marketing-site hosting
