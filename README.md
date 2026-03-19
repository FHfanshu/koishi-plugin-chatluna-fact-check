# koishi-plugin-chatluna-fact-check

[![npm](https://img.shields.io/npm/v/koishi-plugin-chatluna-fact-check?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-chatluna-fact-check)

为 ChatLuna 注册多源网络搜索与事实核查工具，支持并行多来源搜索、快速返回与网页抓取。

## 核心工具

| 工具名 | 功能 | 说明 |
|--------|------|------|
| `fact_check` | 联网事实核查 | 按来源列表并行执行搜索，首个成功即快速返回 |
| `web_fetch` | 网页内容抓取 | 获取指定 URL 的结构化 Markdown 内容 |

## 安装

```bash
npm install koishi-plugin-chatluna-fact-check
```

## 依赖

- **必需**: `koishi-plugin-chatluna` (ChatLuna 核心)
- **可选**: `@koishijs/plugin-console` (控制台配置界面)

## 最小配置

```yaml
chatluna-fact-check:
  timeoutSeconds: 120
  tool:
    enabled: true
    name: fact_check
  search:
    chatluna:
      models:
        - your-search-model
  web_fetch:
    enabled: true
    providerOrder: grok-first
```

## 配置详解

### 基础设置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `timeoutSeconds` | number | 120 | 快速返回最大等待秒数 (5-600) |
| `debug` | boolean | false | 输出调试日志 |

### 工具设置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `tool.enabled` | boolean | true | 启用工具注册 |
| `tool.name` | string | fact_check | 工具名称 |
| `tool.description` | string | 联网事实核查与时效搜索 | 工具描述 |
| `tool.maxInputChars` | number | 1200 | 工具输入最大字符数 |
| `tool.maxSources` | number | 20 | 来源输出最大数量 |
| `tool.forceExposeSources` | boolean | true | 强制附带原始来源链接 |

### 搜索设置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `search.chatluna.models` | string[] | [] | Chatluna 搜索模型列表 |
| `search.custom.sources` | object[] | [] | 可扩展来源列表 |
| `search.perSourceTimeout` | number | 45 | 单来源超时秒数 |
| `search.maxFindingsChars` | number | 3000 | 单来源结论最大字符数 |

#### 可扩展来源配置

```yaml
search:
  custom:
    sources:
      - provider: chatluna
        model: your-model
      - provider: tavily
        tavilyApiKey: your-api-key
```

### 网页抓取设置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `web_fetch.enabled` | boolean | true | 启用网页抓取工具 |
| `web_fetch.name` | string | web_fetch | 工具名称 |
| `web_fetch.maxContentChars` | number | 8000 | 返回内容最大字符数 |
| `web_fetch.providerOrder` | string | grok-first | 抓取来源优先级 (grok-first / jina-first) |

### Jina 设置

| 配置项 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `jina.apiKey` | string | - | Jina API Key |
| `jina.timeout` | number | 30 | Jina 超时秒数 |

## 搜索来源

插件支持两种搜索来源类型：

1. **Chatluna 模型来源**: 通过 `search.chatluna.models` 配置，使用 Chatluna 已注册的搜索模型
2. **可扩展来源**: 通过 `search.custom.sources` 配置，支持：
   - `chatluna`: 使用指定 Chatluna 模型
   - `tavily`: 使用 Tavily 搜索 API（需配置 API Key）

## 工作原理

1. `fact_check` 收到查询后，按配置的来源列表并行发起搜索
2. 每个来源独立超时控制（`search.perSourceTimeout`）
3. 首个成功返回的来源结果将触发快速返回
4. 结果自动附带原始来源链接（`tool.forceExposeSources`）
5. `web_fetch` 按优先级尝试抓取网页内容（Grok → Jina 或 Jina → Grok）

## 调试与排障

- 开启 `debug: true` 输出详细搜索过程日志
- 若搜索超时，适当增大 `timeoutSeconds` 或 `search.perSourceTimeout`
- 若 Tavily 来源失败，检查 `tavilyApiKey` 是否正确配置

## License

MIT