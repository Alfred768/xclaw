# Lucide → Phosphor Icons 映射指南

## 安装

```bash
pnpm add @phosphor-icons/react
```

## 导入方式

```tsx
// 之前 (Lucide)
import { Home, Settings, User } from 'lucide-react';

// 之后 (Phosphor)
import { House, Gear, User } from '@phosphor-icons/react';
```

## 风格选择规则

| 上下文 | 使用风格 | 示例 |
|--------|---------|------|
| 侧边栏导航 | `weight="regular"` | House, Gear, ChatCircle |
| 按钮图标 | `weight="bold"` | Plus, Trash, Copy |
| 状态指示 | `weight="fill"` | CheckCircle, Warning, Spinner |
| 空状态/大图标 | `weight="thin"` | Empty 状态的插图 |
| 标题装饰 | `weight="duotone"` | 带有层次感的标题图标 |

## 完整图标映射表

### 导航类
| Lucide | Phosphor | 说明 |
|--------|----------|------|
| `Home` | `House` | 首页 |
| `MessageSquare` | `ChatCircle` | 聊天 |
| `Settings` | `Gear` | 设置 |
| `User` | `User` | 用户 |
| `Radio` | `Broadcast` | 频道 |
| `Puzzle` | `PuzzlePiece` | 技能 |
| `Clock` | `Clock` | 定时任务 |
| `ListTodo` | `CheckSquare` | 待办 |
| `Newspaper` | `NewspaperClipping` | 简报 |
| `BarChart2` | `ChartBar` | 统计 |
| `CreditCard` | `CreditCard` | 订阅 |
| `Terminal` | `Terminal` | 开发者 |

### 操作类
| Lucide | Phosphor | 说明 |
|--------|----------|------|
| `Plus` | `Plus` | 添加 |
| `Minus` | `Minus` | 减少 |
| `X` | `X` | 关闭 |
| `Check` | `Check` | 确认 |
| `Trash2` | `Trash` | 删除 |
| `Copy` | `Copy` | 复制 |
| `Send` | `PaperPlaneTilt` | 发送 |
| `Save` | `FloppyDisk` | 保存 |
| `Upload` | `UploadSimple` | 上传 |
| `Download` | `DownloadSimple` | 下载 |
| `Edit` | `PencilSimple` | 编辑 |
| `RefreshCw` | `ArrowClockwise` | 刷新 |
| `Square` | `Stop` / `Square` | 停止/方形 |
| `ChevronLeft` | `CaretLeft` | 左箭头 |
| `ChevronRight` | `CaretRight` | 右箭头 |
| `ChevronDown` | `CaretDown` | 下箭头 |
| `ChevronUp` | `CaretUp` | 上箭头 |
| `ArrowUpRight` | `ArrowUpRight` | 外链箭头 |
| `ExternalLink` | `ArrowSquareOut` | 外部链接 |
| `Menu` | `List` | 菜单/汉堡 |

### 状态类
| Lucide | Phosphor | 说明 |
|--------|----------|------|
| `Loader2` | `Spinner` (或 `CircleNotch`) | 加载中 |
| `AlertCircle` | `WarningCircle` | 错误提示 |
| `AlertTriangle` | `Warning` | 警告 |
| `CheckCircle2` | `CheckCircle` | 成功 |
| `Info` | `Info` | 信息 |
| `XCircle` | `XCircle` | 失败 |

### 功能类
| Lucide | Phosphor | 说明 |
|--------|----------|------|
| `Zap` | `Lightning` | 快速/闪电 |
| `Gift` | `Gift` | 礼物/试用 |
| `Crown` | `Crown` | 皇冠/会员 |
| `Building2` | `Buildings` | 企业 |
| `Shield` | `ShieldCheck` | 安全 |
| `Code` | `Code` | 代码 |
| `Key` | `Key` | 密钥 |
| `Lock` | `Lock` | 锁定 |
| `Unlock` | `LockOpen` | 解锁 |
| `Brain` | `Brain` | AI/大脑 |
| `Sparkles` | `Sparkle` | AI/魔法 |
| `Bot` | `Robot` | 机器人 |
| `Wrench` | `Wrench` | 工具 |

### 文件类
| Lucide | Phosphor | 说明 |
|--------|----------|------|
| `File` | `File` | 通用文件 |
| `FileText` | `FileText` | 文本文件 |
| `Film` | `FilmStrip` | 视频 |
| `Music` | `MusicNote` | 音频 |
| `FileArchive` | `FileZip` | 压缩文件 |
| `Paperclip` | `Paperclip` | 附件 |
| `Image` | `Image` | 图片 |
| `Folder` | `Folder` | 文件夹 |

### 界面类
| Lucide | Phosphor | 说明 |
|--------|----------|------|
| `Eye` | `Eye` | 显示 |
| `EyeOff` | `EyeSlash` | 隐藏 |
| `Search` | `MagnifyingGlass` | 搜索 |
| `Filter` | `Funnel` | 筛选 |
| `MoreHorizontal` | `DotsThree` | 更多选项 |
| `MoreVertical` | `DotsThreeVertical` | 更多选项(垂直) |

### 订阅/计划类
| Lucide | Phosphor | 说明 |
|--------|----------|------|
| `Clock` | `Clock` | 时间/到期 |
| `Rocket` | `Rocket` | 启动/升级 |
| `Settings2` | `GearSix` | 高级设置 |

## 默认图标配置

建议在项目中创建一个统一的图标配置：

```tsx
// src/components/icons/config.ts
export const ICON_CONFIG = {
  // 导航图标 - 常规粗细
  nav: { weight: 'regular' as const, size: 20 },

  // 按钮图标 - 粗体
  button: { weight: 'bold' as const, size: 16 },

  // 状态图标 - 填充
  status: { weight: 'fill' as const, size: 20 },

  // 空状态 - 细线
  empty: { weight: 'thin' as const, size: 48 },

  // 标题装饰 - 双色调
  decorative: { weight: 'duotone' as const, size: 24 },
};
```

## 颜色映射

Phosphor 图标会自动继承当前文本颜色，与 Tailwind 配合使用：

```tsx
// 主要操作
<Lightning className="text-primary" weight="bold" />

// 成功状态
<CheckCircle className="text-green-500" weight="fill" />

// 警告状态
<Warning className="text-amber-500" weight="fill" />

// 错误状态
<WarningCircle className="text-red-500" weight="fill" />

// 次要/禁用
<Gear className="text-muted-foreground" weight="regular" />
```

## 注意事项

1. **尺寸一致性**: 使用标准的 16/20/24/32px 尺寸
2. **weight 属性**: Phosphor 使用 `weight` 而不是 `strokeWidth`
3. **动画**: `Spinner` 图标自带旋转动画，其他图标需要手动添加
4. **深色模式**: 图标颜色通过 CSS 变量自动适配
