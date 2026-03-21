# Agent Team PUA 配置
所有 teammate 开工前必须加载 pua skill。
teammate 失败 2 次以上时向 Leader 发送 [PUA-REPORT] 格式汇报。
Leader 负责全局压力等级管理和跨 teammate 失败传递。

---

## Design Context

### Users
**普通消费者 (Regular Consumers)**: 非技术背景的普通用户，使用 AI 助手来完成日常任务。他们需要简洁直观的界面，不需要复杂的配置就能上手使用。注重易用性、响应速度和视觉愉悦感。

### Brand Personality
**Voice & Tone**:
- 专业但不晦涩 - 让 AI 技术亲民易用
- 简洁高效 - 减少认知负担，快速达成目标
- 温暖友好 - 消除对 AI 的恐惧感

**3-Word Personality**: 简洁 · 智能 · 亲和

### Aesthetic Direction
**Visual Tone**: 现代技术风 (Modern Tech)
- 类似于 Claude Code、Warp、Linear 的设计语言
- 简洁的界面元素，明确的视觉层次
- 注重内容而非装饰，形式服务于功能

**Theme**: 支持明暗主题 (Light/Dark Mode)
- 主色调: 多色彩系统，根据功能场景使用不同颜色
- 中性灰色作为基础，确保内容清晰可读
- 品牌色使用蓝色作为主色，辅以功能色（成功绿、警告黄、错误红）

**Anti-References**:
- 避免过度花哨的动画和装饰
- 避免复杂的多层嵌套界面
- 避免技术术语堆砌，保持用户友好

### Design Principles

1. **简洁优先 (Simplicity First)**
   - 每个界面只展示必要信息
   - 隐藏高级选项，不干扰新手用户
   - 使用渐进式披露 (Progressive Disclosure)

2. **一致性 (Consistency)**
   - 统一的图标风格 (Phosphor Icons)
   - 统一的间距和排版系统
   - 统一的交互模式

3. **响应式 (Responsive)**
   - 适配桌面端使用场景
   - 保持窗口大小时界面自适应
   - 注重触控友好性

4. **可访问性 (Accessibility)**
   - 符合 WCAG 2.1 AA 标准
   - 支持键盘导航
   - 清晰的焦点状态

5. **愉悦感 (Delight)**
   - 适当的微交互反馈
   - 流畅的过渡动画
   - 友好的空状态和加载状态

---

## Technical Stack

- **Framework**: Electron 40+ / React 19 / TypeScript
- **UI Library**: Radix UI + shadcn/ui patterns
- **Styling**: Tailwind CSS with custom design tokens
- **Icons**: Phosphor Icons (@phosphor-icons/react)
- **Animation**: Framer Motion
- **State Management**: Zustand

## Design Tokens Reference

- **Primary Color**: Blue (primary-500: 221.2 83.2% 53.3%)
- **Semantic Colors**: Success (green), Warning (yellow), Error (red)
- **Border Radius**: sm (4px), md (6px), lg (8px)
- **Spacing Scale**: xs (4px), sm (8px), md (16px), lg (24px), xl (32px)
