# XClaw Marketing Site Redesign Spec

**Date:** 2026-03-18
**Status:** Approved in conversation, written for review

## Goal
Redesign the standalone XClaw marketing site so it reflects the current product, uses the newly provided screenshots, and feels like a product demo rather than a screenshot gallery. The site should make non-technical users feel they can get started quickly, while still signaling product maturity to decision-makers and real capability depth to technical users.

## Why This Redesign Exists
The current standalone marketing site solved the deployment problem, but it still reflects an earlier product snapshot and leans too heavily on static screenshot presentation. The product has moved forward materially:

- the setup flow is now a clear 7-step guided experience
- the desktop app now includes richer surfaces beyond chat, including briefing, todo extraction, usage analytics, account management, and subscription/API workflows
- the visual proof assets under `website/assets/Image/` are newer and more complete than the screenshots used in the previous site

The redesign should therefore shift from "here are some screenshots" to "here is how the product works, why it removes friction, and why you should download it now."

## Audience Priority
1. Users who want automation but do not want to touch the command line
2. Team or company decision-makers evaluating whether the product is real, usable, and adoptable
3. AI developers or technical users who care about extensibility and system depth

## Brand Direction
- Primary tone: warm, understandable, immediately approachable
- Secondary tone: reliable, complete, productized
- Tertiary tone: modern and forward-looking, but restrained

### Explicit Anti-Patterns
- Do not make it feel like a documentation homepage
- Do not make it feel like a glowing cyberpunk AI landing page
- Do not make it a wall of screenshots
- Do not use badge spam, fake metrics, meaningless AI slogans, or generic gradient-heavy marketing patterns

## Core Product Narrative
XClaw turns OpenClaw into a desktop AI workspace that people can actually download, configure, and use without living in the command line.

### Primary Promise
You can go from install to usable AI workspace through a visible, guided setup flow.

### Product Truths The Site Must Prove
- onboarding is guided, not CLI-driven
- the product is broader than chat
- automation is already built into the product
- the app has real account, subscription, configuration, and analytics surfaces
- this is a working desktop product, not a concept mockup

## Site Type
A standalone marketing site in `website/`, deployed independently from the Electron app build output.

## Primary CTA
`下载桌面版`

### Secondary CTA
`查看 GitHub`

The entire site should support that download decision. Every major section should reduce one reason to hesitate.

## Asset Inventory
### Setup Screenshots
Use the new setup assets as the backbone of the onboarding story:

- `website/assets/Image/setup/cn/step1.png`
- `website/assets/Image/setup/cn/step2.png`
- `website/assets/Image/setup/cn/step3.png`
- `website/assets/Image/setup/cn/step4.png`
- `website/assets/Image/setup/cn/step5.png`
- `website/assets/Image/setup/cn/step6.png`
- `website/assets/Image/setup/cn/step7.png`

### Function Screenshots
Use the new function screenshots as proof surfaces in the feature stories:

- `website/assets/Image/Function/cn/dashboard.png`
- `website/assets/Image/Function/cn/chat.png`
- `website/assets/Image/Function/cn/channel.png`
- `website/assets/Image/Function/cn/skill.png`
- `website/assets/Image/Function/cn/mission.png`
- `website/assets/Image/Function/cn/briefing.png`
- `website/assets/Image/Function/cn/todo.png`
- `website/assets/Image/Function/cn/usage.png`
- `website/assets/Image/Function/cn/account.png`
- `website/assets/Image/Function/cn/setting.png`

### Screenshot Language Constraint
The currently supplied product screenshots are Chinese-only. The website must still support a full Chinese/English toggle. In English mode:

- the surrounding marketing copy must be fully translated
- screenshot captions and labels must translate
- the screenshots themselves may remain Chinese until English screenshot assets exist

This is acceptable because the screenshots serve as visual proof, not as the only content carrier.

### Hybrid Proof Strategy
The redesign should not rely on screenshots alone. Where a feature is better explained through state changes or where a dedicated screenshot is missing or visually insufficient, the site may use lightweight product-demo UI modules derived from the real product structure.

Priority order:

1. use real screenshots when they strongly prove the surface
2. use interactive UI demo states when the value is about progression, comparison, or configuration
3. never invent capabilities that do not exist in the product

This is especially relevant for:
- subscription plan comparison
- API or model configuration explanation
- account binding and account management cues
- before/after pain resolution states

## Current Product Surface Inventory
The redesign must reflect the current product footprint rather than an older reduced subset.

### Guided Setup
- welcome and language selection
- sign-in and account binding
- runtime or environment check
- provider configuration
- optional channel connection
- component or skill environment installation
- completion state

### Core Workspace
- dashboard
- chat
- channels
- skills

### Automation and Ongoing Value
- scheduled tasks / mission automation
- AI daily briefing
- todo extraction from files

### Product Maturity Signals
- usage analytics
- account profile and security
- settings
- subscription, trial, API token, models, and provider configuration

### Lower-Priority Surfaces
- developer-specific controls
- low-level implementation details

These can inform copy, but they should not dominate the story.

## Information Architecture
The homepage should follow this reading order:

1. **Hero**
2. **7-Step Setup Demo**
3. **Pain -> XClaw Fix Section**
4. **Interactive Product Stories**
5. **Why Download Now**
6. **Footer CTA**

This is intentionally `setup-first`, because the highest-value user segment is blocked by perceived complexity, not by lack of features.

## Section Design
### 1. Hero
Purpose: make the product understandable in one screen and trigger immediate download intent.

Content:
- short, declarative headline
- plain-language supporting copy
- primary and secondary CTA
- 3 short proof statements
- an interactive hero demo panel

Hero demo behavior:
- user can switch between `Dashboard`, `Chat`, and `Channels`
- when the active surface changes, the screenshot, supporting label, and proof copy update together
- the demo should feel like a product preview, not a slideshow

### 2. 7-Step Setup Demo
Purpose: remove fear of setup and prove that onboarding is guided.

Content structure:
- a section title focused on speed and clarity
- step navigation for 1-7
- a large active screenshot
- one short explanation for what the user completes in that step
- forward/back controls or direct step selection

Setup steps to represent:
1. welcome and language choice
2. sign-in and account connection
3. environment check
4. AI provider setup
5. channel connection
6. component installation
7. completion and ready state

This section should read like "I can see exactly how I would get started."

### 3. Pain -> XClaw Fix Section
Purpose: turn product capabilities into reasons to switch.

This section should not be a static comparison table. It should behave like a lightweight interactive before/after explainer.

Suggested pain themes:
- powerful AI tools are trapped behind CLI setup
- automation is fragmented across tools and scripts
- teams cannot evaluate or hand off a CLI-centric workflow easily
- many AI apps stop at chat and never become an operational workspace

Interaction pattern:
- each pain point can be selected
- the UI swaps between the "before" state and the XClaw answer
- copy stays short, outcome-focused, and concrete

### 4. Interactive Product Stories
Purpose: show breadth without turning the page into a feature dump.

The site should group the product into three story clusters:

#### Start Working
- dashboard
- chat
- account

#### Automate Work
- mission / cron
- briefing
- todo

#### Operate and Extend
- skills
- usage
- subscription / API
- settings

Interaction pattern:
- each cluster has one highlighted primary surface at a time
- clicking tabs or labels swaps the active screenshot and supporting UI state
- supporting copy explains what job the user gets done, not just what the page is called

This section should feel closer to trying a software product than reading a brochure.

### 5. Why Download Now
Purpose: create the final push from interest to action.

This section should focus on immediacy and product completeness:

- it is already a full desktop product
- onboarding is visible and structured
- automation is built in, not bolted on later
- the product is useful for individuals, presentable for teams, and deep enough for technical users

This can include a compact recap of what the user has just seen, followed by a strong CTA.

### 6. Footer CTA
Purpose: close the page cleanly without feeling repetitive.

Content:
- primary download CTA
- GitHub link
- Discord link
- bilingual support remains accessible

## Interaction Model
The site should be primarily `product-demo-driven`, with a secondary layer of `marketing narrative`.

### Product-Demo-Driven Interactions
- hero surface switcher
- interactive setup steps
- feature cluster tabs
- before/after pain switcher
- subscription or plan switcher
- one lightweight mini-demo for automation value

### Marketing-Narrative Interactions
- scroll-triggered section reveals
- polished transitions between active states
- repeated but contextualized CTA placement

### Important Constraints
- no autoplay carousels
- no excessive looping animation
- no fake chat typing gimmicks everywhere
- no modal-heavy storytelling
- no interactions that hide core information behind cleverness

## Feature Mapping To Site Story
### Onboarding Story
Use setup screenshots and copy to tell:
"You do not need to understand the internals before you can start."

### Daily Work Story
Use dashboard, chat, and channels to tell:
"This is where work starts and stays visible."

### Automation Story
Use mission, briefing, and todo to tell:
"XClaw is not just for conversation; it helps work continue without manual babysitting."

### Product Maturity Story
Use skills, usage, account, account binding, settings, and subscription-adjacent UI to tell:
"This product already has the operational surfaces people expect from software they keep using."

### Hybrid Demo Story
Where screenshots are not the strongest storytelling tool, use interactive UI demonstrations based on the existing product:

- a subscription plan switcher showing tier, tokens, and model access changes
- an API configuration state showing token, model, and provider setup cues
- an account card showing profile and binding/security signals

These demos must feel like truthful product abstractions, not fictional mockups.

## Copy Direction
### Writing Rules
- keep headings short
- prefer verbs and outcomes over abstractions
- do not use inflated AI claims
- avoid repeating information already visible in the UI
- make every section answer: "why should I care?"

### Hero Copy Direction
Headline direction:
`把 OpenClaw 变成人人都能上手的桌面 AI 工作台`

Supporting copy direction:
Explain that login, environment checks, provider setup, channels, skills, and automation can all be reached without terminal-first workflows.

### Setup Section Copy Direction
Speak in completed outcomes:
- choose your language
- sign in and connect your account
- verify your environment
- connect a provider
- connect a channel
- install essentials
- start using XClaw

### Automation Section Copy Direction
Focus on value people can imagine immediately:
- scheduled tasks that keep running
- daily briefings generated for you
- extracting actions from files instead of rewriting them manually

### Subscription and API Copy Direction
Keep this compact and trust-building:
- trial exists
- plans exist
- API and model setup are visible
- the product supports a path from evaluation to regular use

## Visual Direction
### Overall Tone
- light-first
- screenshot-led
- more dynamic than the current site
- still warm and readable rather than flashy

### Layout Language
- asymmetrical but stable
- fewer repetitive cards
- larger proof surfaces
- sections should feel editorial and productized, not templated

### Background Strategy
- warm off-white base
- tinted neutrals for structure
- restrained blue family for accents
- soft shape and layer treatment to build depth without glow aesthetics

### Typography
- Chinese-first readability
- distinctive display font for headlines
- stable body font for mixed Chinese/English content
- avoid generic SaaS default feeling

## Motion Direction
- meaningful transitions between active demo states
- subtle reveal on section entry
- strong but short CTA hover feedback
- setup navigation transitions should reinforce progress

No decorative motion that does not help understanding.

## Bilingual Requirements
- default to Simplified Chinese
- full English copy toggle
- interaction labels and captions must translate
- the site must stay visually balanced in both languages

## Technical Direction
The redesign should stay in the standalone `website/` source tree and preserve the deployment separation already established.

Planned files remain:
- `website/index.html`
- `website/styles.css`
- `website/script.js`
- `website/assets/...`
- `website/vercel.json`

The redesign may add more structured content in the JavaScript layer for:
- localized copy
- interactive section state
- per-feature metadata
- setup step metadata

But it should remain a simple static site rather than becoming coupled back to the Electron or Vite app build.

## Success Criteria
- a new visitor understands the product within one screen
- the first big objection, "this looks too technical," gets neutralized by the setup demo
- the page feels like a software product demo, not a screenshot archive
- the new screenshots are treated as evidence inside interactions, not dumped in a grid
- the page creates a stronger impulse to click `下载桌面版`
- the site still deploys independently from the app

## Risks To Watch
- drifting back into a screenshot wall
- overcomplicating interactions until the page becomes noisy
- letting feature breadth dilute the core message
- turning the automation story into vague marketing instead of concrete examples
- using too many UI demos and making the page feel like a fake app shell instead of a marketing site

## Implementation Follow-Up
The implementation plan should cover:

- replacing the current homepage structure with the new setup-first architecture
- wiring the new screenshot assets from `website/assets/Image/`
- implementing interactive hero, setup, pain/fix, and feature-story sections
- restructuring bilingual copy around product stories rather than generic feature cards
- preserving static deployment simplicity and safe Vercel configuration
