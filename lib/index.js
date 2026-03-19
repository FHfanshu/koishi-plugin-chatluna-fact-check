"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Config = exports.usage = exports.inject = exports.name = void 0;
exports.apply = apply;
const node_path_1 = __importDefault(require("node:path"));
const config_1 = require("./config");
Object.defineProperty(exports, "Config", { enumerable: true, get: function () { return config_1.Config; } });
const factCheckTool_1 = require("./services/factCheckTool");
const webFetchTool_1 = require("./services/webFetchTool");
exports.name = 'chatluna-fact-check';
exports.inject = {
    required: ['chatluna'],
    optional: ['console', 'chatluna_character'],
};
exports.usage = `
## Chatluna Fact Check

用于 Chatluna 工具化联网核查，核心工具：
- \`fact_check\`：按来源列表并行执行事实核查（Chatluna 模型 / Tavily）
- \`web_fetch\`：网页正文抓取（Chatluna + Jina 回退）

配置要点：
1. 在 \`search.sources\` 中手动添加来源（默认空列表）。
2. \`chatluna_model\` 用于模型搜索，\`tavily\` 用于 API 搜索。
3. \`timeoutSeconds\` 控制 fact_check 快速返回最大等待时长。`;
function apply(ctx, config) {
    const logger = ctx.logger('chatluna-fact-check');
    if (!config || typeof config !== 'object') {
        logger.error('插件配置为空或无效，已跳过加载。请在 koishi.yml 中检查 chatluna-fact-check 配置。');
        return;
    }
    (0, factCheckTool_1.registerFactCheckTool)(ctx, config);
    (0, webFetchTool_1.registerWebFetchTool)(ctx, config);
    ctx.inject(['console'], (innerCtx) => {
        const packageBase = node_path_1.default.resolve(ctx.baseDir, 'node_modules/koishi-plugin-chatluna-fact-check');
        const entry = process.env.KOISHI_BASE
            ? [`${process.env.KOISHI_BASE}/dist/index.js`]
            : process.env.KOISHI_ENV === 'browser'
                ? [node_path_1.default.resolve(__dirname, '../client/index.ts')]
                : {
                    dev: node_path_1.default.resolve(packageBase, 'client/index.ts'),
                    prod: node_path_1.default.resolve(packageBase, 'dist'),
                };
        innerCtx.console?.addEntry?.(entry);
    });
    logger.info('chatluna-fact-check 插件已加载');
}
