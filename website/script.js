const STORAGE_KEY = 'xclaw-marketing-language';
const setupOrder = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6', 'step7'];
const storyDefaults = {
  start: 'chat',
  automate: 'mission',
  operate: 'skill',
};

const state = {
  lang: 'zh',
  chatState: 'welcome',
  setupStep: 'step1',
  setupSubstep: 'step2-1',
  pain: 'cli',
  storyCluster: 'start',
  storySurface: 'chat',
  plan: 'monthly',
  accountTab: 'profile',
};

const setupIcons = {
  step1: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 12h12" />
      <path d="M12 6v12" />
      <circle cx="12" cy="12" r="8" />
    </svg>
  `,
  step2: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 11V8a4 4 0 1 1 8 0v3" />
      <rect x="5" y="11" width="14" height="9" rx="2" />
    </svg>
  `,
  step3: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 13l4 4L19 7" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  `,
  step4: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3l7 4v5c0 5-3.5 7.5-7 9-3.5-1.5-7-4-7-9V7l7-4Z" />
      <path d="M9 12h6" />
    </svg>
  `,
  step5: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M8 7h8" />
      <path d="M8 12h8" />
      <path d="M8 17h8" />
      <circle cx="5" cy="7" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
      <circle cx="5" cy="17" r="1.5" />
    </svg>
  `,
  step6: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v10" />
      <path d="m8 9 4 4 4-4" />
      <path d="M5 17v2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-2" />
    </svg>
  `,
  step7: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 12.5 10.5 16 17 9.5" />
      <circle cx="12" cy="12" r="9" />
    </svg>
  `,
};

const content = {
  zh: {
    pageTitle: 'XClaw | 不用先学命令行，也能把 AI agent 跑起来',
    pageDescription:
      'XClaw 把 OpenClaw 变成真正可下载、可配置、可持续使用的桌面 AI 工作台。无需命令行，也能完成登录、环境检查、模型配置、频道连接、技能安装和自动化工作流。',
    brand: {
      tag: 'OpenClaw 的桌面工作台',
    },
    nav: {
      github: '查看 GitHub',
      download: '下载桌面版',
    },
    hero: {
      eyebrow: '产品演示',
      title: '不用先学命令行，也能把 AI agent 跑起来',
      lead: 'XClaw 把 OpenClaw 变成真正可以下载、登录、配置并持续使用的桌面产品。先看对话怎么开始，再看它怎么一路带你进入工作。',
      primary: '下载桌面版',
      secondary: '查看 GitHub',
      stageLabel: '先从对话开始',
      stageNote: '点一次，就能开始第一段对话。',
      badges: ['先从对话开始', '7 步完成上手', '真正可用的桌面版'],
      proofs: [
        {
          label: '开始更轻',
          value: '点开先能聊，再继续配置',
        },
        {
          label: '流程更清',
          value: '登录、检查、模型、安装全都看得见',
        },
        {
          label: '闭环更完整',
          value: '账号、订阅、用量和设置都已经成型',
        },
      ],
      states: {
        welcome: {
          label: '开始对话',
          image: 'chat-1.png',
          alt: 'XClaw 对话欢迎页',
        },
        active: {
          label: '进入工作',
          image: 'chat-2.png',
          alt: 'XClaw 对话工作态',
        },
      },
    },
    setup: {
      eyebrow: '上手流程',
      title: '7 步完成上手',
      lead: '从欢迎页到完成页，整个流程都看得见。你不需要先懂 OpenClaw 的内部结构。',
      prev: '上一步',
      next: '下一步',
      steps: {
        step1: {
          railLabel: '欢迎',
          label: '欢迎',
          index: '01',
          title: '先把入口讲清楚，再带你往下走',
          summary: '欢迎页先告诉你这是什么、接下来会发生什么，而不是把你直接扔进复杂配置。',
          detail: '这一步解决第一次打开时最容易出现的陌生感和迟疑感。',
          image: 'step1.png',
          alt: 'XClaw 欢迎页',
        },
        step2: {
          railLabel: '登录',
          label: '登录',
          index: '02',
          title: '登录流程被做成了产品的一部分',
          summary: '账号接入不再藏在深层设置里，而是作为上手流程的自然一环。',
          detail: '这样后面的绑定、资料、试用和订阅都能自然接起来。',
          states: {
            'step2-1': {
              label: '选择方式',
              title: '先选登录方式，不需要自己拼认证流程',
              summary: '在向导里直接看到登录入口，知道下一步该怎么走。',
              detail: '普通用户最怕认证流程复杂，这一屏就是在消灭那种不确定感。',
              image: 'step2-1.png',
              alt: 'XClaw 登录方式选择页',
            },
            'step2-2': {
              label: '登录成功',
              title: '登录成功后，产品立刻进入已连接状态',
              summary: '成功不是一句提示，而是看得见的状态变化。',
              detail: '这一步直接把后续的绑定、订阅和个人资料页都串起来。',
              image: 'step2-2.png',
              alt: 'XClaw 登录成功状态',
            },
          },
        },
        step3: {
          railLabel: '环境检查',
          label: '环境检查',
          index: '03',
          title: '先确认运行环境，再继续往下配',
          summary: '最容易卡人的运行时问题会先被可视化检查，不用等到后面再回头排错。',
          detail: '这一步替你省掉“走到一半才发现环境不对”的返工。',
          image: 'step3.png',
          alt: 'XClaw 环境检查页',
        },
        step4: {
          railLabel: '模型配置',
          label: '模型配置',
          index: '04',
          title: '把模型配置从环境变量挪到可理解的界面里',
          summary: '服务商、密钥、地址和模型 ID 都在同一个地方完成。',
          detail: '这是普通用户最容易放弃的一步，XClaw 让它至少变成了可见、可改、可返回的界面。',
          image: 'step4.png',
          alt: 'XClaw 模型配置页',
        },
        step5: {
          railLabel: '频道接入',
          label: '频道接入',
          index: '05',
          title: '把外部消息接进来，而不是把工作留在一个窗口里',
          summary: '频道接入是可选的，但产品已经把它做成了明确的一步。',
          detail: '这说明 XClaw 从一开始就不是本地聊天壳，而是在设计真实工作流。',
          image: 'step5.png',
          alt: 'XClaw 频道接入页',
        },
        step6: {
          railLabel: '安装组件',
          label: '安装组件',
          index: '06',
          title: '把最容易劝退人的安装过程做成可见进度',
          summary: '必要组件和能力环境会自动安装，用户能看到过程，而不是只能等待。',
          detail: '这一步直击最现实的阻力：普通用户不想自己再装一堆运行环境。',
          image: 'step6.png',
          alt: 'XClaw 安装组件页',
        },
        step7: {
          railLabel: '完成',
          label: '完成',
          index: '07',
          title: '走完向导之后，真正进入可以开始工作的桌面产品',
          summary: '完成态不是一个空结束页，而是在明确告诉你：现在已经可以开始了。',
          detail: '到这里为止，安装、登录、配置和进入主流程已经形成完整闭环。',
          image: 'step7.png',
          alt: 'XClaw 完成页',
        },
      },
    },
    pain: {
      eyebrow: '为什么很多人最后没用起来',
      title: '真正劝退人的，不是能力不够，而是开始太难',
      lead: 'XClaw 把命令行门槛、分散配置和难以持续的自动化，收进可见的产品流程里。',
      beforeLabel: '没有 XClaw',
      afterLabel: '使用 XClaw',
      items: {
        cli: {
          label: '命令行门槛',
          beforeTitle: '价值还没出现，人先被终端和配置文件劝退',
          beforeBody: '很多人不是不想用 AI agent，而是不想先扮演运维。',
          afterTitle: '先进入产品，再进入真正工作',
          afterBody: '上手向导把登录、检查、模型配置和安装拉成一条看得见的路径。',
          proof: ['7 步引导', '登录结果可见', '模型配置界面化'],
        },
        config: {
          label: '配置分散',
          beforeTitle: '模型、频道、技能和设置散落在不同入口里',
          beforeBody: '一旦配置太分散，产品看起来就像需要用户自己拼装的系统。',
          afterTitle: '把关键能力收束进统一桌面工作台',
          afterBody: '仪表盘、频道、技能、设置和账号共同组成一个更容易理解的产品结构。',
          proof: ['统一入口', '状态可见', '更适合演示'],
        },
        automation: {
          label: '自动化难持续',
          beforeTitle: '自动化经常停留在脚本和想法层面',
          beforeBody: '定时任务、简报和待办提取一旦分散在脚本里，就很难持续使用和交接。',
          afterTitle: '把自动化变成看得见、能持续的日常流程',
          afterBody: '定时任务、每日简报、待办提取和使用分析让自动化不再是隐藏脚本。',
          proof: ['定时任务', '每日简报', '待办提取'],
        },
        team: {
          label: '团队难评估',
          beforeTitle: 'CLI 很难拿给决策者或同事直接看懂',
          beforeBody: '能运行不等于能评估，更不等于能交接。很多产品死在讲不清楚。',
          afterTitle: '真实界面让能力真正可展示、可传递',
          afterBody: '真实截图、明确流程和账号订阅闭环，让团队更容易判断它是否值得下载。',
          proof: ['真实界面', '订阅闭环', '更适合团队讨论'],
        },
      },
    },
    stories: {
      eyebrow: '真实工作流',
      title: '对话只是入口，后面还有一整套真正能工作的界面',
      lead: '先从开始工作看起，再看自动化和系统管理，最后补齐账号与订阅闭环。',
      clusters: {
        start: {
          label: '开始工作',
          surfaces: {
            chat: {
              label: '对话',
              title: '从自然语言开始，是最低摩擦的第一步',
              body: '对普通用户来说，对话是最好理解的入口；对技术用户来说，它只是开始，不是边界。',
              tags: ['建议卡片', '自然语言入口', '继续推进任务'],
              image: 'chat-2.png',
              alt: 'XClaw 对话页',
            },
            dashboard: {
              label: '仪表盘',
              title: '先看到全局状态，再决定下一步做什么',
              body: '网关状态、频道数量、技能数量和快捷入口都集中在首页。你不是从空白页摸索，而是从一个已经准备好的工作台开始。',
              tags: ['网关状态', '频道概览', '技能概览'],
              image: 'dashboard.png',
              alt: 'XClaw 仪表盘页',
            },
            channel: {
              label: '频道',
              title: '把外部渠道接进同一个工作台里',
              body: '频道页让多平台接入变成看得见、可管理、能向团队说明白的产品界面。',
              tags: ['统一接入', '状态管理', '可扩展入口'],
              image: 'channel.png',
              alt: 'XClaw 频道页',
            },
          },
        },
        automate: {
          label: '自动化工作',
          surfaces: {
            mission: {
              label: '定时任务',
              title: '把 AI 任务交给计划表，而不是交给记忆力',
              body: '任务数量、状态和创建动作都已经是桌面产品里的真实界面。',
              tags: ['定时运行', '状态可见', '新增任务'],
              image: 'mission.png',
              alt: 'XClaw 定时任务页',
            },
            briefing: {
              label: '每日简报',
              title: '每天自动生成你真正会看的简报',
              body: '简报不是概念功能，而是已经可见、可配置、可执行的日常工作流。',
              tags: ['日报摘要', '主题聚焦', '可配置'],
              image: 'briefing.png',
              alt: 'XClaw 每日简报页',
            },
            todo: {
              label: '待办事项',
              title: '把文档里的行动项抽出来，直接变成待办',
              body: '从文件输入到待办列表，这条链路能很快让人感受到它真的在帮你做事。',
              tags: ['拖入文件', '自动提取', '行动项管理'],
              image: 'todo.png',
              alt: 'XClaw 待办事项页',
            },
          },
        },
        operate: {
          label: '系统管理',
          surfaces: {
            skill: {
              label: '技能',
              title: '扩展能力不再靠命令安装和手动维护',
              body: '浏览、启用、禁用和配置技能都已经是一个完整的图形化管理体验。',
              tags: ['已安装与市场', '启停控制', '配置管理'],
              image: 'skill.png',
              alt: 'XClaw 技能页',
            },
            usage: {
              label: '使用分析',
              title: '把请求量和额度看得更明白',
              body: '当一个产品能把使用情况讲清楚，它才更像一个可长期管理的系统，而不是临时工具。',
              tags: ['额度趋势', '请求统计', '模型明细'],
              image: 'usage.png',
              alt: 'XClaw 使用分析页',
            },
            setting: {
              label: '设置',
              title: '把服务商和高级配置收进统一设置页',
              body: '设置页是产品成熟度最容易被忽略、但也最能说明问题的地方。XClaw 在这里已经是完整产品。',
              tags: ['服务商', '偏好设置', '开发者模式'],
              image: 'setting.png',
              alt: 'XClaw 设置页',
            },
          },
        },
      },
    },
    demos: {
      subscription: {
        kicker: '订阅与接口',
        title: '从试用到正式使用的闭环',
        lead: '切换套餐，看看额度、模型范围和适合人群如何变化。',
        plans: {
          free: {
            label: '免费试用',
            price: '免费',
            tokens: '100K 体验额度',
            models: '基础模型访问',
            audience: '先快速确认产品体验',
          },
          monthly: {
            label: '月度会员',
            price: '¥0.01 / 月（测试）',
            tokens: '1M 月度额度',
            models: '全部模型访问',
            audience: '适合开始稳定使用和团队试跑',
          },
          yearly: {
            label: '年度会员',
            price: '¥0.01 / 年（测试）',
            tokens: '100M 年度额度',
            models: '全部模型访问，更适合长期使用',
            audience: '适合把 XClaw 纳入持续工作流',
          },
        },
      },
      account: {
        kicker: '账号与安全',
        title: '账号、绑定和安全设置也已经产品化',
        lead: '资料、绑定、安全设置和订阅状态，都在同一个桌面里可见。',
        tabs: {
          profile: {
            label: '个人资料',
            avatar: 'A',
            name: 'Alfred',
            note: '显示名称、头像和用户标识都在同一个页面里清晰可见。',
            fields: [
              { label: '显示名称', value: 'Alfred' },
              { label: '用户标识', value: '可见的账号身份信息' },
              { label: '会员时间', value: '账户生命周期信息清晰可见' },
            ],
          },
          binding: {
            label: '账号绑定',
            avatar: '绑',
            name: '绑定状态',
            note: '绑定状态和安全设置不再是深层入口，而是可演示的产品界面。',
            fields: [
              { label: '支付宝绑定', value: '已连接' },
              { label: '微信绑定', value: '支持继续扩展' },
              { label: '退出登录', value: '退出后会直接回到 Setup' },
            ],
          },
          security: {
            label: '安全设置',
            avatar: '安',
            name: '安全与订阅',
            note: '试用、订阅、接口与安全状态都在一个产品闭环中。',
            fields: [
              { label: '当前计划', value: '试用和订阅状态可见' },
              { label: '接口状态', value: '模型与额度配置可管理' },
              { label: '安全入口', value: '资料与设置保持连通' },
            ],
          },
        },
      },
    },
    why: {
      eyebrow: '为什么现在下载',
      title: '为什么现在下载',
      lead: '不是概念页，不是单纯聊天壳，而是已经能把安装、配置和工作串起来的桌面产品。',
      stripEyebrow: '下载桌面版',
      stripTitle: '别再从配置文件开始，从工作开始。',
      stripLead: '如果你已经看懂它怎么安装、怎么登录、怎么工作，现在只差按下下载按钮。',
      primary: '下载桌面版',
      secondary: '查看 GitHub',
      bullets: [
        '点开就能开始第一段对话，不需要先学命令行。',
        '登录、检查、模型配置和安装都在同一条 7 步路径里。',
        '定时任务、每日简报、待办事项和技能让它不只是一个聊天窗口。',
        '账号、绑定、订阅和使用分析已经做好，下载后就能持续用下去。',
      ],
    },
    footer: {
      eyebrow: '准备好了就开始',
      title: '下载桌面版，直接开始。',
      lead: 'XClaw 已经把安装、配置、自动化和持续使用做成了产品流程。下一步就是把它装到你的桌面上。',
      primary: '下载桌面版',
      secondary: '加入 Discord',
    },
  },
  en: {
    pageTitle: 'XClaw | Start with a real AI workspace, not a terminal setup',
    pageDescription:
      'XClaw turns OpenClaw into a desktop AI workspace you can actually install, configure, and keep using. Sign in, verify runtime, connect a provider, wire channels, install essentials, and start automation without living in the terminal.',
    brand: {
      tag: 'Desktop workspace for OpenClaw',
    },
    nav: {
      github: 'View GitHub',
      download: 'Download the desktop app',
    },
    hero: {
      eyebrow: 'Product demo',
      title: 'Start with a real AI workspace, not a terminal setup',
      lead: 'XClaw turns OpenClaw into a desktop product you can actually download, sign into, configure, and keep using. Start with chat, then watch the product carry you into real work.',
      primary: 'Download the desktop app',
      secondary: 'View GitHub',
      stageLabel: 'Start from chat',
      stageNote: 'One click gets the first conversation moving.',
      badges: ['Start from chat', '7 visible steps to get going', 'Built like a real desktop product'],
      proofs: [
        {
          label: 'Lower friction',
          value: 'Start with the app, not the terminal',
        },
        {
          label: 'Clearer setup',
          value: 'Sign-in, checks, models, and install stay visible',
        },
        {
          label: 'Stronger loop',
          value: 'Account, plans, usage, and settings are already productized',
        },
      ],
      states: {
        welcome: {
          label: 'Start from chat',
          image: 'chat-1.png',
          alt: 'XClaw chat welcome state',
        },
        active: {
          label: 'Move into work',
          image: 'chat-2.png',
          alt: 'XClaw chat active state',
        },
      },
    },
    setup: {
      eyebrow: 'Setup walkthrough',
      title: '7 visible steps to get going',
      lead: 'From the welcome screen to the finished state, the full path stays visible. You do not need to understand OpenClaw internals before you begin.',
      prev: 'Previous step',
      next: 'Next step',
      steps: {
        step1: {
          railLabel: 'Welcome',
          label: 'Welcome',
          index: '01',
          title: 'Explain the starting point before asking users to configure anything',
          summary: 'The welcome screen frames the product and the path ahead instead of throwing users straight into complexity.',
          detail: 'That removes the uncertainty that usually appears the moment a new AI tool first opens.',
          image: 'step1.png',
          alt: 'XClaw welcome screen',
        },
        step2: {
          railLabel: 'Sign in',
          label: 'Sign in',
          index: '02',
          title: 'Account access is treated like part of the product, not a hidden utility flow',
          summary: 'Users sign in inside the onboarding sequence instead of hunting for account entry points later.',
          detail: 'That choice supports the later profile, binding, trial, and subscription experience.',
          states: {
            'step2-1': {
              label: 'Choose a method',
              title: 'Pick a sign-in path without stitching an auth flow together yourself',
              summary: 'The choice appears exactly where users need it: inside setup, in context.',
              detail: 'This is where trust is built for non-technical users. The next step feels obvious.',
              image: 'step2-1.png',
              alt: 'XClaw sign-in method selection',
            },
            'step2-2': {
              label: 'Signed in',
              title: 'The product visibly moves into a connected state',
              summary: 'Success is visible. People do not have to guess whether the sign-in worked.',
              detail: 'That clarity sets up the profile, binding, and subscription loop that follows.',
              image: 'step2-2.png',
              alt: 'XClaw sign-in success state',
            },
          },
        },
        step3: {
          railLabel: 'Checks',
          label: 'Checks',
          index: '03',
          title: 'Verify the runtime before users spend effort on deeper setup',
          summary: 'The setup flow surfaces runtime risks before people have to backtrack later.',
          detail: 'This is less about showing technical detail and more about preventing wasted effort.',
          image: 'step3.png',
          alt: 'XClaw runtime check screen',
        },
        step4: {
          railLabel: 'Models',
          label: 'Models',
          index: '04',
          title: 'Move model setup out of environment variables and into a usable interface',
          summary: 'Provider, API key, Base URL, and model ID are configured together in one visible step.',
          detail: 'That is one of the biggest friction points in AI tooling, and XClaw treats it like product design instead of infrastructure work.',
          image: 'step4.png',
          alt: 'XClaw model configuration screen',
        },
        step5: {
          railLabel: 'Channels',
          label: 'Channels',
          index: '05',
          title: 'Connect external channels instead of trapping the workflow in one window',
          summary: 'Channel setup is optional, but the product already frames it as a clear next move.',
          detail: 'That signals a tool designed for real operating workflows, not just local experimentation.',
          image: 'step5.png',
          alt: 'XClaw channel connection screen',
        },
        step6: {
          railLabel: 'Install',
          label: 'Install',
          index: '06',
          title: 'Turn the most intimidating install work into visible progress',
          summary: 'Required components and capability environments install with a visible progress state.',
          detail: 'This directly answers the biggest fear from non-technical users: having to do a lot of manual setup alone.',
          image: 'step6.png',
          alt: 'XClaw component installation screen',
        },
        step7: {
          railLabel: 'Ready',
          label: 'Ready',
          index: '07',
          title: 'Finish by landing inside a desktop product that is ready to use',
          summary: 'The final state is not an empty ending page. It is the handoff into actual use.',
          detail: 'By this point install, sign-in, configuration, and the entry into work form one clear loop.',
          image: 'step7.png',
          alt: 'XClaw setup completion screen',
        },
      },
    },
    pain: {
      eyebrow: 'Why adoption usually stalls',
      title: 'The problem is not lack of capability. It is that starting still feels too hard.',
      lead: 'XClaw pulls CLI friction, scattered setup, and hard-to-sustain automation back into a visible product flow.',
      beforeLabel: 'Without XClaw',
      afterLabel: 'With XClaw',
      items: {
        cli: {
          label: 'CLI friction',
          beforeTitle: 'The terminal wins before the value appears',
          beforeBody: 'People are forced to behave like operators before they ever get a useful result.',
          afterTitle: 'Enter the product first, then move into real work',
          afterBody: 'The setup flow turns sign-in, checks, models, and install into one visible path.',
          proof: ['7-step setup', 'Visible sign-in result', 'Model setup UI'],
        },
        config: {
          label: 'Scattered setup',
          beforeTitle: 'Models, channels, skills, and settings feel split across too many places',
          beforeBody: 'Once configuration feels fragmented, the whole tool starts to look self-assembled.',
          afterTitle: 'Pull the critical capabilities back into one desktop surface',
          afterBody: 'Dashboard, Channels, Skills, Settings, and Account create a structure teams can actually understand.',
          proof: ['Unified entry', 'Visible system state', 'Easier to present'],
        },
        automation: {
          label: 'Hard to sustain',
          beforeTitle: 'Automation often stays trapped in scripts and half-built ideas',
          beforeBody: 'Scheduled jobs, briefings, and task extraction become hard to maintain once they disappear into scripts.',
          afterTitle: 'Turn automation into a visible and sustainable daily flow',
          afterBody: 'Missions, briefings, todo extraction, and usage visibility make automation easier to trust over time.',
          proof: ['Scheduled missions', 'Daily briefings', 'Todo extraction'],
        },
        team: {
          label: 'Hard to evaluate',
          beforeTitle: 'CLI-heavy products are hard to show to teammates and decision-makers',
          beforeBody: 'Running is not the same as being explainable. Many tools stall because nobody can quickly understand how they fit into work.',
          afterTitle: 'A visible interface makes capability transferable',
          afterBody: 'Real screens, a clear sequence, and an account-plus-subscription loop make evaluation much easier.',
          proof: ['Real UI proof', 'Subscription loop', 'Better for internal discussion'],
        },
      },
    },
    stories: {
      eyebrow: 'Real workflow',
      title: 'Chat is only the entry point. The rest of the workspace is already here.',
      lead: 'Start with the working entry points, move into automation, then look at operational management and the account loop.',
      clusters: {
        start: {
          label: 'Start working',
          surfaces: {
            chat: {
              label: 'Chat',
              title: 'Natural language is still the lowest-friction first move',
              body: 'For ordinary users, chat is the easiest entry point. For technical users, it is the beginning, not the limit.',
              tags: ['Suggestion cards', 'Natural-language entry', 'Continue into work'],
              image: 'chat-2.png',
              alt: 'XClaw chat page',
            },
            dashboard: {
              label: 'Dashboard',
              title: 'See the operating picture first, then decide the next move',
              body: 'Gateway state, channels, skills, and quick actions all meet in one place, so the workspace never opens as a blank shell.',
              tags: ['Gateway state', 'Channel overview', 'Skill overview'],
              image: 'dashboard.png',
              alt: 'XClaw dashboard page',
            },
            channel: {
              label: 'Channels',
              title: 'Bring external channels into the same workspace',
              body: 'The channels surface turns cross-platform connection into something visible, manageable, and easier to explain to a team.',
              tags: ['Unified connection', 'Status management', 'Extensible entry'],
              image: 'channel.png',
              alt: 'XClaw channels page',
            },
          },
        },
        automate: {
          label: 'Automate work',
          surfaces: {
            mission: {
              label: 'Mission',
              title: 'Give recurring AI work to a schedule instead of your memory',
              body: 'Task counts, states, and job creation already exist as product surfaces, not hidden workflows.',
              tags: ['Scheduled runs', 'Visible status', 'Create jobs'],
              image: 'mission.png',
              alt: 'XClaw mission page',
            },
            briefing: {
              label: 'Briefing',
              title: 'Generate a daily briefing you would actually open',
              body: 'Briefings already feel like part of the product instead of a roadmap promise.',
              tags: ['Daily summary', 'Topic focus', 'Configurable'],
              image: 'briefing.png',
              alt: 'XClaw briefing page',
            },
            todo: {
              label: 'Todo',
              title: 'Pull action items out of documents and turn them into tasks',
              body: 'That path from file input to task list is one of the fastest ways users feel real product value.',
              tags: ['Drop files', 'Extract tasks', 'Action management'],
              image: 'todo.png',
              alt: 'XClaw todo page',
            },
          },
        },
        operate: {
          label: 'Operate the system',
          surfaces: {
            skill: {
              label: 'Skills',
              title: 'Extending capability no longer means living in install commands',
              body: 'Browsing, enabling, disabling, and configuring skills already feels like proper product management.',
              tags: ['Installed vs market', 'Toggle control', 'Configuration'],
              image: 'skill.png',
              alt: 'XClaw skills page',
            },
            usage: {
              label: 'Usage',
              title: 'See requests and allowance like a system you can manage',
              body: 'When the product makes usage visible, it stops feeling disposable and starts feeling operational.',
              tags: ['Allowance trend', 'Request stats', 'Model detail'],
              image: 'usage.png',
              alt: 'XClaw usage page',
            },
            setting: {
              label: 'Settings',
              title: 'Bring providers and advanced preferences back into one stable page',
              body: 'Settings pages are underrated maturity signals. XClaw already treats them like part of the product.',
              tags: ['Providers', 'Preferences', 'Developer mode'],
              image: 'setting.png',
              alt: 'XClaw settings page',
            },
          },
        },
      },
    },
    demos: {
      subscription: {
        kicker: 'Subscription and API',
        title: 'A complete path from trial to regular use',
        lead: 'Switch plans to see how allowance, model access, and intended use change.',
        plans: {
          free: {
            label: 'Free trial',
            price: 'Free',
            tokens: '100K starter allowance',
            models: 'Base model access',
            audience: 'Best for validating the product experience first',
          },
          monthly: {
            label: 'Monthly',
            price: '¥0.01 / month (test)',
            tokens: '1M monthly allowance',
            models: 'Access to all models',
            audience: 'Best for stable use and team trial runs',
          },
          yearly: {
            label: 'Yearly',
            price: '¥0.01 / year (test)',
            tokens: '100M yearly allowance',
            models: 'All models, better fit for long-term use',
            audience: 'Best for making XClaw part of a sustained workflow',
          },
        },
      },
      account: {
        kicker: 'Account and security',
        title: 'Account, binding, and security are product surfaces too',
        lead: 'Profile, bindings, security settings, and plan state stay visible inside the same desktop product.',
        tabs: {
          profile: {
            label: 'Profile',
            avatar: 'A',
            name: 'Alfred',
            note: 'Display name, avatar, and public identity stay visible together.',
            fields: [
              { label: 'Display name', value: 'Alfred' },
              { label: 'Public identity', value: 'Visible account identity' },
              { label: 'Member since', value: 'Lifecycle details shown clearly' },
            ],
          },
          binding: {
            label: 'Bindings',
            avatar: 'B',
            name: 'Binding state',
            note: 'Binding status and security settings become demoable parts of the product, not hidden flows.',
            fields: [
              { label: 'Alipay binding', value: 'Connected' },
              { label: 'WeChat binding', value: 'Ready for extension' },
              { label: 'Sign-out behavior', value: 'Returns users to Setup' },
            ],
          },
          security: {
            label: 'Security',
            avatar: 'S',
            name: 'Security and plan',
            note: 'Trial, subscription, API, and security state live inside one coherent loop.',
            fields: [
              { label: 'Current plan', value: 'Trial and subscription visible' },
              { label: 'API state', value: 'Models and allowance stay manageable' },
              { label: 'Security entry', value: 'Profile and settings stay linked' },
            ],
          },
        },
      },
    },
    why: {
      eyebrow: 'Why download now',
      title: 'Why download now',
      lead: 'This is not concept art and not just a chat shell. It is already a desktop product that connects install, configuration, and daily work.',
      stripEyebrow: 'Download the desktop app',
      stripTitle: 'Do not start from config files. Start from work.',
      stripLead: 'If you already understand how it installs, signs in, and works, the next step is simply to download it.',
      primary: 'Download the desktop app',
      secondary: 'View GitHub',
      bullets: [
        'Open it and start the first conversation without learning the terminal first.',
        'Sign-in, checks, model setup, and install stay inside one visible 7-step path.',
        'Mission, Briefing, Todo, Skills, Usage, and Settings make it feel like a product, not a shell.',
        'Account, bindings, plans, and usage are already mature enough for regular use after download.',
      ],
    },
    footer: {
      eyebrow: 'Ready when you are',
      title: 'Download the desktop app and start directly.',
      lead: 'XClaw already turns install, configuration, automation, and ongoing use into a product flow. The next move is putting it on your desktop.',
      primary: 'Download the desktop app',
      secondary: 'Join Discord',
    },
  },
};

let elements;
let initialized = false;
let heroAutoTimer = 0;
let heroAutoPlayed = false;

function getCopy() {
  return content[state.lang];
}

function assetPath(group, file) {
  const assetLang = state.lang === 'zh' ? 'cn' : 'en';
  return `./assets/Image/${group}/${assetLang}/${file}`;
}

function getValue(source, path) {
  return path.split('.').reduce((acc, key) => (acc == null ? undefined : acc[key]), source);
}

function setText(node, value) {
  if (node) {
    node.textContent = value;
  }
}

function renderTagRow(container, values) {
  container.innerHTML = values.map((value) => `<span class="tag-pill">${value}</span>`).join('');
}

function restartMotion(node, className) {
  if (!node) {
    return;
  }
  node.classList.remove(className);
  void node.offsetWidth;
  node.classList.add(className);
}

function stopHeroAutoplay(markAsPlayed = false) {
  if (heroAutoTimer) {
    window.clearTimeout(heroAutoTimer);
    heroAutoTimer = 0;
  }
  if (markAsPlayed) {
    heroAutoPlayed = true;
  }
}

function armHeroAutoplay() {
  stopHeroAutoplay(false);
  if (heroAutoPlayed || state.chatState !== 'welcome') {
    return;
  }
  heroAutoTimer = window.setTimeout(() => {
    heroAutoPlayed = true;
    state.chatState = 'active';
    renderHero();
  }, 1400);
}

function renderHeroBadges() {
  const copy = getCopy();
  elements.heroBadges.innerHTML = copy.hero.badges
    .map((item) => `<span class="hero-badge">${item}</span>`)
    .join('');
}

function renderHeroProofs() {
  const copy = getCopy();
  elements.heroProofList.innerHTML = copy.hero.proofs
    .map(
      (item) => `
        <article>
          <span>${item.label}</span>
          <strong>${item.value}</strong>
        </article>
      `,
    )
    .join('');
}

function renderHero() {
  const copy = getCopy();
  const heroState = copy.hero.states[state.chatState];

  elements.chatStateList.innerHTML = Object.entries(copy.hero.states)
    .map(
      ([key, value]) => `
        <button type="button" class="control-pill control-pill--soft ${state.chatState === key ? 'is-active' : ''}" data-chat-state-option="${key}">
          ${value.label}
        </button>
      `,
    )
    .join('');

  elements.heroImage.src = assetPath('Function', heroState.image);
  elements.heroImage.alt = heroState.alt;
  elements.heroFrame.dataset.state = state.chatState;
  restartMotion(elements.heroFrame, 'is-swapping');

  elements.chatStateList.querySelectorAll('[data-chat-state-option]').forEach((button) => {
    button.addEventListener('click', () => {
      state.chatState = button.getAttribute('data-chat-state-option');
      stopHeroAutoplay(true);
      renderHero();
    });
  });
}

function getActiveSetupContent() {
  const copy = getCopy();
  const step = copy.setup.steps[state.setupStep];

  if (state.setupStep === 'step2') {
    return {
      step,
      current: step.states[state.setupSubstep],
    };
  }

  return {
    step,
    current: step,
  };
}

function selectSetupStep(stepKey) {
  if (!setupOrder.includes(stepKey)) {
    return;
  }
  state.setupStep = stepKey;
  if (stepKey !== 'step2') {
    state.setupSubstep = 'step2-1';
  }
  renderSetup();
}

function renderSetup() {
  const copy = getCopy();

  elements.setupStepList.innerHTML = setupOrder
    .map((key) => {
      const step = copy.setup.steps[key];
      return `
        <button type="button" class="setup-rail-step ${state.setupStep === key ? 'is-active' : ''}" data-setup-step-button="${key}">
          <span class="setup-rail-step-icon" data-setup-step-icon aria-hidden="true">${setupIcons[key]}</span>
          <span class="setup-rail-step-index">${step.index}</span>
          <span class="setup-rail-step-label">${step.railLabel}</span>
        </button>
      `;
    })
    .join('');

  const { step, current } = getActiveSetupContent();
  elements.setupImage.src = assetPath('setup', current.image);
  elements.setupImage.alt = current.alt;
  setText(elements.setupIndex, `${step.index} / 07`);
  setText(elements.setupLabel, step.label);
  setText(elements.setupTitle, current.title || step.title);
  setText(elements.setupSummary, current.summary || step.summary);
  setText(elements.setupDetail, current.detail || step.detail);
  restartMotion(elements.setupFrame, 'is-swapping');

  if (state.setupStep === 'step2') {
    const loginStates = Object.entries(copy.setup.steps.step2.states);
    elements.setupSubstepList.hidden = false;
    elements.setupSubstepList.innerHTML = loginStates
      .map(
        ([key, value]) => `
          <button type="button" class="control-pill control-pill--soft ${state.setupSubstep === key ? 'is-active' : ''}" data-setup-substep-option="${key}">
            ${value.label}
          </button>
        `,
      )
      .join('');

    elements.setupSubstepList.querySelectorAll('[data-setup-substep-option]').forEach((button) => {
      button.addEventListener('click', () => {
        state.setupSubstep = button.getAttribute('data-setup-substep-option');
        renderSetup();
      });
    });
  } else {
    elements.setupSubstepList.hidden = true;
    elements.setupSubstepList.innerHTML = '';
  }

  const currentIndex = setupOrder.indexOf(state.setupStep);
  elements.setupPrev.disabled = currentIndex <= 0;
  elements.setupNext.disabled = currentIndex >= setupOrder.length - 1;

  elements.setupStepList.querySelectorAll('[data-setup-step-button]').forEach((button) => {
    button.addEventListener('click', () => {
      selectSetupStep(button.getAttribute('data-setup-step-button'));
    });
  });
}

function renderPain() {
  const copy = getCopy();
  const painEntries = Object.entries(copy.pain.items);

  elements.painOptionList.innerHTML = painEntries
    .map(
      ([key, value]) => `
        <button type="button" class="control-pill ${state.pain === key ? 'is-active' : ''}" data-pain-option="${key}">
          ${value.label}
        </button>
      `,
    )
    .join('');

  const current = copy.pain.items[state.pain];
  setText(elements.painBeforeTitle, current.beforeTitle);
  setText(elements.painBeforeBody, current.beforeBody);
  setText(elements.painAfterTitle, current.afterTitle);
  setText(elements.painAfterBody, current.afterBody);
  renderTagRow(elements.painProof, current.proof);

  elements.painOptionList.querySelectorAll('[data-pain-option]').forEach((button) => {
    button.addEventListener('click', () => {
      state.pain = button.getAttribute('data-pain-option');
      renderPain();
    });
  });
}

function ensureStorySurface() {
  const copy = getCopy();
  const cluster = copy.stories.clusters[state.storyCluster];
  if (!cluster.surfaces[state.storySurface]) {
    state.storySurface = storyDefaults[state.storyCluster];
  }
}

function renderStories() {
  const copy = getCopy();

  elements.storyClusterList.innerHTML = Object.entries(copy.stories.clusters)
    .map(
      ([key, value]) => `
        <button type="button" class="control-pill ${state.storyCluster === key ? 'is-active' : ''}" data-story-cluster-option="${key}">
          ${value.label}
        </button>
      `,
    )
    .join('');

  ensureStorySurface();
  const cluster = copy.stories.clusters[state.storyCluster];
  elements.storySurfaceList.innerHTML = Object.entries(cluster.surfaces)
    .map(
      ([key, value]) => `
        <button type="button" class="control-pill control-pill--soft ${state.storySurface === key ? 'is-active' : ''}" data-story-surface-option="${key}">
          ${value.label}
        </button>
      `,
    )
    .join('');

  const surface = cluster.surfaces[state.storySurface];
  elements.storyImage.src = assetPath('Function', surface.image);
  elements.storyImage.alt = surface.alt;
  setText(elements.storyClusterLabel, cluster.label);
  setText(elements.storyTitle, surface.title);
  setText(elements.storyBody, surface.body);
  renderTagRow(elements.storyTags, surface.tags);
  restartMotion(elements.storyFrame, 'is-swapping');

  elements.storyClusterList.querySelectorAll('[data-story-cluster-option]').forEach((button) => {
    button.addEventListener('click', () => {
      state.storyCluster = button.getAttribute('data-story-cluster-option');
      state.storySurface = storyDefaults[state.storyCluster];
      renderStories();
    });
  });

  elements.storySurfaceList.querySelectorAll('[data-story-surface-option]').forEach((button) => {
    button.addEventListener('click', () => {
      state.storySurface = button.getAttribute('data-story-surface-option');
      renderStories();
    });
  });
}

function renderPlanDemo() {
  const copy = getCopy();
  elements.planList.innerHTML = Object.entries(copy.demos.subscription.plans)
    .map(
      ([key, value]) => `
        <button type="button" class="control-pill plan-pill ${state.plan === key ? 'is-active' : ''}" data-plan-option="${key}">
          ${value.label}
        </button>
      `,
    )
    .join('');

  const current = copy.demos.subscription.plans[state.plan];
  setText(elements.planPrice, current.price);
  setText(elements.planTokens, current.tokens);
  setText(elements.planModels, current.models);
  setText(elements.planAudience, current.audience);

  elements.planList.querySelectorAll('[data-plan-option]').forEach((button) => {
    button.addEventListener('click', () => {
      state.plan = button.getAttribute('data-plan-option');
      renderPlanDemo();
    });
  });
}

function renderAccountDemo() {
  const copy = getCopy();
  elements.accountTabs.innerHTML = Object.entries(copy.demos.account.tabs)
    .map(
      ([key, value]) => `
        <button type="button" class="control-pill control-pill--soft ${state.accountTab === key ? 'is-active' : ''}" data-account-tab="${key}">
          ${value.label}
        </button>
      `,
    )
    .join('');

  const current = copy.demos.account.tabs[state.accountTab];
  setText(elements.accountAvatar, current.avatar);
  setText(elements.accountName, current.name);
  setText(elements.accountNote, current.note);
  elements.accountFields.innerHTML = current.fields
    .map(
      (field) => `
        <div class="account-field">
          <span>${field.label}</span>
          <strong>${field.value}</strong>
        </div>
      `,
    )
    .join('');

  elements.accountTabs.querySelectorAll('[data-account-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      state.accountTab = button.getAttribute('data-account-tab');
      renderAccountDemo();
    });
  });
}

function renderWhyBullets() {
  const copy = getCopy();
  elements.whyBullets.innerHTML = copy.why.bullets
    .map(
      (item) => `
        <article>
          <span class="bullet-icon"></span>
          <p>${item}</p>
        </article>
      `,
    )
    .join('');
}

function applyStaticCopy() {
  const copy = getCopy();
  document.title = copy.pageTitle;
  const description = document.querySelector('meta[name="description"]');
  if (description) {
    description.setAttribute('content', copy.pageDescription);
  }
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';

  document.querySelectorAll('[data-copy]').forEach((node) => {
    const key = node.getAttribute('data-copy');
    const value = key ? getValue(copy, key) : '';
    if (typeof value === 'string') {
      node.textContent = value;
    }
  });

  elements.languageToggle.querySelectorAll('[data-language-option]').forEach((button) => {
    button.classList.toggle('is-active', button.getAttribute('data-language-option') === state.lang);
  });
}

function saveLanguage() {
  try {
    window.localStorage.setItem(STORAGE_KEY, state.lang);
  } catch {
    // ignore storage failures in static preview contexts
  }
}

function loadLanguage() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === 'zh' || stored === 'en') {
      state.lang = stored;
    }
  } catch {
    state.lang = 'zh';
  }
}

function renderPage() {
  applyStaticCopy();
  renderHeroBadges();
  renderHeroProofs();
  renderHero();
  renderSetup();
  renderPain();
  renderStories();
  renderPlanDemo();
  renderAccountDemo();
  renderWhyBullets();
  armHeroAutoplay();
}

function initElements() {
  elements = {
    languageToggle: document.querySelector('[data-language-toggle]'),
    heroBadges: document.querySelector('[data-hero-badges]'),
    heroProofList: document.querySelector('[data-hero-proof-list]'),
    chatStateList: document.querySelector('[data-chat-state-list]'),
    heroFrame: document.querySelector('[data-hero-frame]'),
    heroImage: document.querySelector('[data-hero-image]'),
    setupStepList: document.querySelector('[data-setup-step-list]'),
    setupFrame: document.querySelector('[data-setup-frame]'),
    setupImage: document.querySelector('[data-setup-image]'),
    setupIndex: document.querySelector('[data-setup-index]'),
    setupLabel: document.querySelector('[data-setup-label]'),
    setupTitle: document.querySelector('[data-setup-title]'),
    setupSummary: document.querySelector('[data-setup-summary]'),
    setupDetail: document.querySelector('[data-setup-detail]'),
    setupSubstepList: document.querySelector('[data-setup-substep-list]'),
    setupPrev: document.querySelector('[data-setup-nav="prev"]'),
    setupNext: document.querySelector('[data-setup-nav="next"]'),
    painOptionList: document.querySelector('[data-pain-option-list]'),
    painBeforeTitle: document.querySelector('[data-pain-before-title]'),
    painBeforeBody: document.querySelector('[data-pain-before-body]'),
    painAfterTitle: document.querySelector('[data-pain-after-title]'),
    painAfterBody: document.querySelector('[data-pain-after-body]'),
    painProof: document.querySelector('[data-pain-proof]'),
    storyClusterList: document.querySelector('[data-story-cluster-list]'),
    storySurfaceList: document.querySelector('[data-story-surface-list]'),
    storyFrame: document.querySelector('[data-story-frame]'),
    storyImage: document.querySelector('[data-story-image]'),
    storyClusterLabel: document.querySelector('[data-story-cluster-label]'),
    storyTitle: document.querySelector('[data-story-title]'),
    storyBody: document.querySelector('[data-story-body]'),
    storyTags: document.querySelector('[data-story-tags]'),
    planList: document.querySelector('[data-plan-list]'),
    planPrice: document.querySelector('[data-plan-price]'),
    planTokens: document.querySelector('[data-plan-tokens]'),
    planModels: document.querySelector('[data-plan-models]'),
    planAudience: document.querySelector('[data-plan-audience]'),
    accountTabs: document.querySelector('[data-account-tabs]'),
    accountAvatar: document.querySelector('[data-account-avatar]'),
    accountName: document.querySelector('[data-account-name]'),
    accountNote: document.querySelector('[data-account-note]'),
    accountFields: document.querySelector('[data-account-fields]'),
    whyBullets: document.querySelector('[data-why-bullets]'),
  };
}

function bindStaticEvents() {
  elements.languageToggle.querySelectorAll('[data-language-option]').forEach((button) => {
    button.addEventListener('click', () => {
      const lang = button.getAttribute('data-language-option');
      if (lang !== 'zh' && lang !== 'en') {
        return;
      }
      state.lang = lang;
      saveLanguage();
      renderPage();
    });
  });

  elements.setupPrev.addEventListener('click', () => {
    const currentIndex = setupOrder.indexOf(state.setupStep);
    if (currentIndex > 0) {
      selectSetupStep(setupOrder[currentIndex - 1]);
    }
  });

  elements.setupNext.addEventListener('click', () => {
    const currentIndex = setupOrder.indexOf(state.setupStep);
    if (currentIndex < setupOrder.length - 1) {
      selectSetupStep(setupOrder[currentIndex + 1]);
    }
  });
}

function init() {
  if (initialized) {
    return;
  }
  initialized = true;

  initElements();
  loadLanguage();
  bindStaticEvents();
  renderPage();
  const scheduleFrame = typeof window.requestAnimationFrame === 'function' ? window.requestAnimationFrame.bind(window) : (callback) => window.setTimeout(callback, 0);
  scheduleFrame(() => {
    document.body.classList.add('is-ready');
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
