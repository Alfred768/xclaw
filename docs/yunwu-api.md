# 云雾 AI API 令牌集成

## 概述

当用户订阅成功后，系统会自动调用云雾 AI API 创建 API 令牌。

## API 端点

```
POST https://yunwu.ai/api/token/
```

## 环境变量配置

在 Supabase Dashboard → Settings → Edge Functions 中配置：

```bash
NEW_API_USER=272180
NEW_API_AUTHORIZATION=cbK4Uax94U4PhTnovEg9razLoaC6Z2M=
NEW_API_BASE_URL=https://yunwu.ai
```

## 请求参数

### Headers

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| content-type | string | 是 | `application/json` |
| new-api-user | string | 是 | 用户 ID：`272180` |
| Authorization | string | 是 | 系统令牌 |

### Body

| 参数 | 类型 | 必需 | 说明 |
|------|------|------|------|
| name | string | 是 | 令牌名字（使用用户 ID） |
| remain_quota | integer | 是 | 配额（50w = 1刀） |
| expired_time | integer | 是 | 到期时间戳（秒），-1 表示永不过期 |
| unlimited_quota | boolean | 是 | 无限额度设置 |
| model_limits_enabled | boolean | 是 | 可用模型限制设置 |
| model_limits | string | 是 | 可用模型列表，按 `,` 分割 |
| allow_ips | string | 是 | 白名单 IP，按 `\n` 分割 |
| group | string | 是 | 支持分组，按 `,` 分割 |
| selected_groups | array | 否 | 选中的分组 |
| mj_image_mode | string | 否 | MJ 图片模式 |
| mj_custom_proxy | string | 否 | MJ 自定义代理 |

## 配额计算

| 订阅类型 | remain_quota | expired_time |
|----------|-------------|--------------|
| 月度会员 | 1,000,000 | 当前时间 + 1个月 |
| 年度会员 | 100,000,000 | 当前时间 + 1年 |

## 示例请求

```bash
curl --location --request POST 'https://yunwu.ai/api/token/' \
--header 'Content-Type: application/json' \
--header 'new-api-user: 272180' \
--header 'Authorization: cbK4Uax94U4PhTnovEg9razLoaC6Z2M=' \
--data-raw '{
  "name": "user_abc123",
  "remain_quota": 1000000,
  "expired_time": 1743436800,
  "unlimited_quota": false,
  "model_limits_enabled": false,
  "model_limits": "",
  "allow_ips": "",
  "group": "",
  "selected_groups": [],
  "mj_image_mode": "default",
  "mj_custom_proxy": ""
}'
```

## 响应示例

```json
{
  "success": true,
  "message": "令牌创建成功",
  "data": {
    "key": "sk-xxx",
    "name": "user_abc123",
    "remain_quota": 1000000,
    "expired_time": 1743436800
  }
}
```

## 错误处理

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 参数错误 |
| 401 | 认证失败 |
| 500 | 服务器错误 |

## 集成位置

- **创建令牌**: `zpay-notify` Edge Function（支付成功回调）
- **查询令牌**: `yunwu-token-status` Edge Function
