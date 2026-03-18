# XClaw Marketing Site Chat-First Polish Spec

**Date:** 2026-03-18
**Status:** Approved in conversation, ready for implementation planning

## Goal
Refocus the standalone XClaw marketing site around a stronger first-impression hook: a chat-first hero, a larger and easier-to-read setup experience, cleaner Chinese localization, and more memorable motion that increases the urge to download the desktop app.

## Why This Spec Exists
The previous refresh fixed the deployment structure and updated the image set, but it still misses the mark in four user-visible ways:

1. the Chinese page still mixes in English labels and section headings, which makes the page feel unfinished
2. the hero spreads attention too broadly and does not establish a clear visual protagonist
3. the setup section compresses the main screenshots too much and keeps the step-2 login substate controls visible across unrelated steps
4. the page has motion, but not a memorable visual highlight or a clear animation hierarchy

This spec corrects those issues without changing the product truth of the site.

## Design Context Alignment
This polish pass must still follow the existing `.impeccable.md` design context:

- easy to understand before it feels advanced
- screenshots used as evidence, not decoration
- product feeling stronger than marketing theatrics
- bilingual switching that feels complete rather than compromised

## Audience Priority
1. users who want automation but do not want to touch the command line
2. team or company decision-makers evaluating maturity and usability
3. AI developers or technical users evaluating capability depth

## Primary Outcome
A first-time visitor should:
- notice chat first
- understand setup second
- feel the product is already real and usable
- feel a stronger impulse to click `下载桌面版`

## Core Direction
This pass is explicitly:
- `Chat-first` in the hero
- `Setup-second` as the trust-building proof layer
- `scroll narrative third`, not the main hook

The hero should create desire. The setup section should remove fear. The rest of the page should validate the purchase or download instinct created above.

## Critical Fixes
### 1. Chinese Means Chinese
In Chinese mode, all section labels, feature labels, and CTA labels must be Chinese unless they are true brand or platform names.

Allowed to remain in English:
- `XClaw`
- `OpenClaw`
- `GitHub`
- `Discord`

Must not remain in English in Chinese mode:
- `Product walkthrough`
- `Setup walkthrough`
- `Dashboard`
- `Chat`
- `Subscription & API`
- `Account & security`
- `Why download now`
- `Download desktop app`

The Chinese version should read like a complete Chinese product page, not a half-localized prototype.

### 2. Hero Needs One Protagonist
The hero should no longer split attention between dashboard and chat at equal weight.

New hero rule:
- chat is the default and dominant visual surface
- dashboard becomes supporting proof later on the page
- the left column becomes much shorter and sharper

The hero should answer one question immediately:
> can I start using this product right now, without fighting the command line?

## Information Architecture
The revised page order should be:

1. Chat-first Hero
2. Setup filmstrip bridge
3. Giant Setup section
4. Pain -> XClaw Fix
5. Product Stories
6. Download CTA and footer

This preserves the existing setup-first trust logic, but changes the emotional order:
- first create interest
- then remove anxiety
- then prove completeness

## Section Design
### 1. Chat-First Hero
Purpose: make the chat surface the first memorable image on the site.

Content:
- one short headline
- one short supporting sentence
- primary and secondary CTA
- two or three short proof chips, not long proof cards
- one large chat demo stage

Hero content rules:
- reduce explanatory text significantly
- avoid long paragraphs or stacked justification blocks
- the hero should feel like a product launch frame, not a feature summary

Hero visual rules:
- right side is dominated by chat imagery
- default state is `chat-1`
- the hero can progress to `chat-2`
- this progression should feel like “starting a conversation and entering work”
- dashboard should not compete visually in the first screen

Recommended Chinese direction:
- headline: `不用先学命令行，也能把 AI agent 跑起来`
- support line: `从登录、配置到自动化，XClaw 把复杂流程做成了能直接开始的桌面产品。`
- short proof chips: `先从对话开始` / `7 步完成上手` / `不是 demo，是真正可用的桌面版`

English must be rewritten to match the same sharpness and hierarchy, not translated literally line-by-line.

### 2. Setup Filmstrip Bridge
Purpose: connect the emotional hero to the trust-building setup proof.

This is a thin transition strip directly under the hero, not the full setup section.

Content:
- a compact 7-step filmstrip or progress rail
- the currently emphasized step can highlight briefly
- copy stays minimal

The filmstrip exists to tell the user:
- this product has a visible onboarding path
- you will not be thrown into terminal-first setup chaos

### 3. Giant Setup Section
Purpose: make the onboarding proof easier to see and easier to trust.

Current problem:
- the screenshots are too small
- the right-side text column competes too hard with the image
- the step-2 login substates appear like global UI instead of step-specific detail

New structure:
- the setup screenshot becomes the visual center
- the screenshot is much larger than before
- the right-side text becomes a narrow support rail
- text is reduced to three layers:
  - step name
  - what happens in this step
  - what friction this step removes

Step 2 rule:
- `选择方式 / 登录成功` appears only when step 2 is active
- it fully disappears on steps 1 and 3-7
- it must not reserve space or feel like a global persistent control

Reading goal:
- the setup section should feel like watching an installation journey, not reading a step list beside a thumbnail

### 4. Pain -> XClaw Fix
Purpose: sharpen why the product matters after setup confidence is established.

Copy should become more direct and less generic.

Avoid overly broad language like:
- “AI agents are powerful, but most people stop before they begin”

Prefer user-internal language like:
- `还没开始用，就先被命令行劝退`
- `能跑起来，但很难一直用下去`
- `想给团队试，但根本讲不清楚`

The XClaw answer should also become more direct:
- `先进产品，再配细节`
- `把自动化放进可见流程`
- `让团队一眼看懂它怎么工作`

### 5. Product Stories
Purpose: prove the app is complete without stealing focus from the hero and setup sections.

This section remains useful, but it is no longer the emotional center of the page.

Rules:
- lighter hierarchy than the hero and setup sections
- shorter copy
- Chinese labels in Chinese mode
- real screenshots continue to anchor the proof

Suggested cluster order remains:
- 开始工作
- 自动化工作
- 系统管理

### 6. Download CTA
Purpose: convert confidence into action.

The CTA language should feel more immediate and more forceful than the current version, while avoiding fake urgency.

Recommended Chinese direction:
- `下载桌面版，直接开始`
- `先装起来，再决定要不要深入`
- `今天就把你的 AI agent 跑起来`

The English version should match the same push level and concision.

## Motion Direction
### Motion Hierarchy
This pass needs a clearer animation hierarchy:

1. strongest motion: hero chat progression
2. second strongest motion: setup step progression
3. lighter motion: pain switches and story switches
4. subtle CTA emphasis on hover

Not every section should compete for attention.

### Hero Motion
The hero should have one memorable camera moment:
- headline enters with short upward fade
- chat window enters slightly later with scale + fade
- chat suggestions appear with small stagger
- after settling, `chat-1 -> chat-2` transitions once automatically
- then the hero rests in a stable end state

The goal is not spectacle. The goal is a single memorable product moment.

### Setup Motion
Setup motion should reinforce progress:
- active step highlight moves clearly
- screenshot transitions use subtle fade and slide
- the setup filmstrip and giant setup section should feel connected

### Motion Anti-Patterns
Do not add:
- cyber glow
- floating screenshot chaos
- aggressive looping
- decorative parallax that weakens readability
- generic “AI website” micro-animations with no narrative purpose

## Localization Rules
### Chinese Version
- pure Chinese UI and section language
- concise and action-oriented copy
- less explanation, more outcome
- no accidental English leakage outside real brand names

### English Version
- same structure, same punch, same emotional order
- not literal translation
- shorter, sharper, more product-led copy
- must feel like a first-class version, not fallback text

## Visual Direction
### Hero Visual Character
The hero should feel more intentional and more cinematic than the current version, but still clean and product-led.

Desired feeling:
- calm confidence
- immediate usability
- one clear focal point

### Setup Visual Character
The setup section should feel like a large proof surface.

Desired feeling:
- readable
- reassuring
- visibly guided

## Functional Requirements
- Chinese mode defaults to Chinese-only section labels and UI terms
- English mode receives corresponding rewritten copy and matching image paths
- hero defaults to chat-first state
- setup substep controls render only for step 2
- layout changes remain responsive on desktop and mobile
- motion remains CSS/vanilla-JS friendly inside the static `website/` architecture

## Acceptance Criteria
This polish pass is successful when:
- the Chinese homepage no longer looks mixed-language
- the hero clearly centers chat, not dashboard
- the setup screenshot is visibly larger and easier to read
- step-2 login substates are only visible in step 2
- the page has one strong visual highlight and a clear motion hierarchy
- the English version is upgraded in parallel, not left behind
- the overall page feels more download-driven and less like a screenshot explainer
