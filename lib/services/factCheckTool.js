"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerFactCheckTool = registerFactCheckTool;
const tools_1 = require("@langchain/core/tools");
const zod_1 = require("zod");
const subSearchAgent_1 = require("../agents/subSearchAgent");
const tavilySearch_1 = require("./tavilySearch");
const async_1 = require("../utils/async");
const model_1 = require("../utils/model");
const prompts_1 = require("../utils/prompts");
const summary_1 = require("../utils/summary");
const text_1 = require("../utils/text");
const url_1 = require("../utils/url");
const sources_1 = require("../utils/sources");
class FactCheckTool extends tools_1.StructuredTool {
    constructor(ctx, config, toolName, toolDescription) {
        super();
        this.ctx = ctx;
        this.config = config;
        this.schema = zod_1.z.object({
            input: zod_1.z.string().min(1).describe('待核查的文本。'),
        });
        this.backgroundTasks = new Set();
        this.name = sanitizeToolName(toolName, 'fact_check');
        this.description = sanitizeToolDescription(toolDescription, '联网事实核查与时效搜索。');
        this.logger = ctx.logger('chatluna-fact-check');
        this.subSearchAgent = new subSearchAgent_1.SubSearchAgent(ctx, config);
        this.tavilySearch = new tavilySearch_1.TavilySearchService(ctx, config);
    }
    unwrapInput(input) {
        if (typeof input === 'string') {
            return input;
        }
        if (input && typeof input === 'object' && 'input' in input) {
            const raw = input.input;
            return typeof raw === 'string' ? raw : '';
        }
        return '';
    }
    getConfiguredSources() {
        return (0, sources_1.collectSearchSources)(this.config);
    }
    getSourcePerspective(source, index) {
        if (source.kind === 'chatluna_model') {
            return (0, model_1.normalizeModelName)(source.model) || `ChatlunaSearch-${index + 1}`;
        }
        return index > 0 ? `TavilySearch-${index + 1}` : 'TavilySearch';
    }
    getSourceLogLabel(source, index) {
        if (source.kind === 'chatluna_model') {
            const model = (0, model_1.normalizeModelName)(source.model);
            return model ? `chatluna:${model}` : `chatluna:source-${index + 1}`;
        }
        return `tavily:${source.provider || `source-${index + 1}`}`;
    }
    createSourceTask(claim, source, index) {
        const perspective = this.getSourcePerspective(source, index);
        const task = source.kind === 'chatluna_model'
            ? this.subSearchAgent.deepSearchWithModel(claim, (0, model_1.normalizeModelName)(source.model), `fact-check-${index + 1}`, perspective, (0, prompts_1.buildFactCheckToolSearchPrompt)(claim), prompts_1.FACT_CHECK_TOOL_SEARCH_SYSTEM_PROMPT)
            : this.tavilySearch.search(claim, source.tavilyApiKey, perspective);
        return (0, async_1.withTimeout)(task, Math.max(5, this.config.search.perSourceTimeout || 45) * 1000, this.getSourceLogLabel(source, index))
            .then((value) => ({ index, source, status: 'fulfilled', value }))
            .catch((reason) => ({ index, source, status: 'rejected', reason }));
    }
    trackBackgroundTask(task, label) {
        this.backgroundTasks.add(task);
        task.then(() => {
            this.logger.info(`[FactCheckTool] 后台任务完成: ${label}`);
        }).catch((error) => {
            this.logger.info(`[FactCheckTool] 后台任务失败: ${label}: ${error?.message || error}`);
        }).finally(() => {
            this.backgroundTasks.delete(task);
        });
    }
    async waitNextOutcome(active, remainingMs) {
        if (active.size === 0 || remainingMs <= 0) {
            return { status: 'timeout' };
        }
        return Promise.race([
            ...active.values(),
            new Promise((resolve) => {
                setTimeout(() => resolve({ status: 'timeout' }), remainingMs);
            }),
        ]);
    }
    buildInternalContextPreamble() {
        return [
            '[INTERNAL_TOOL_CONTEXT]',
            'INTERNAL_TOOL_CONTEXT_DO_NOT_QUOTE_VERBATIM',
            '以下内容仅用于 Agent 内部推理，不要逐字转发给用户。',
            '对用户回复时请只输出结论、关键依据和必要来源链接。',
            '',
        ].join('\n');
    }
    formatFindingsForContext(text, maxChars) {
        const normalized = (text || '').trim();
        if (!normalized)
            return '无';
        return (0, text_1.truncate)(normalized, maxChars, '无');
    }
    formatSourcesForContext(sources, limit) {
        const items = (sources || []).filter(Boolean).slice(0, limit);
        if (items.length === 0)
            return '- 无';
        return items.map((item) => `- ${item}`).join('\n');
    }
    appendDirectSourcesBlock(output, sources) {
        if (!this.config.tool.forceExposeSources) {
            return output;
        }
        const directSources = [...new Set((sources || [])
                .flatMap((source) => (0, url_1.extractUrls)(String(source || '').trim()))
                .filter(Boolean))].slice(0, this.config.tool.maxSources);
        const sourceText = directSources.length > 0
            ? directSources.map((source) => `- ${source}`).join('\n')
            : '- 无';
        return `${output}\n\n[DirectSendSources]\n以下原始链接为直接发送给用户用，不要改写、补全或重写。\n${sourceText}`;
    }
    formatResults(results) {
        const lines = [this.buildInternalContextPreamble(), '[FactCheckContext]', '模式: multi-source'];
        const allSources = [];
        const maxFindingsChars = this.config.search.maxFindingsChars || 3000;
        results.forEach((result, index) => {
            const confidence = Number.isFinite(result.confidence)
                ? `${Math.round(result.confidence * 100)}%`
                : '未知';
            lines.push('');
            lines.push(`[Source ${index + 1}]`);
            lines.push(`来源: ${result.perspective}`);
            lines.push(`置信度: ${confidence}`);
            lines.push(`关键发现: ${this.formatFindingsForContext(result.findings, maxFindingsChars)}`);
            lines.push('[Sources]');
            lines.push(this.formatSourcesForContext(result.sources || [], this.config.tool.maxSources));
            allSources.push(...(result.sources || []));
        });
        return this.appendDirectSourcesBlock(lines.join('\n'), allSources);
    }
    async summarizeOutput(output, label) {
        const summaryEnabled = ['1', 'true', 'on'].includes(String(process.env.CHATLUNA_FACT_CHECK_ENABLE_SUMMARY || '').toLowerCase());
        return (0, summary_1.maybeSummarize)(this.ctx, this.config, output, label, {
            enabled: summaryEnabled,
            maxChars: this.config.search.maxFindingsChars,
        });
    }
    async _call(input) {
        const rawClaim = this.unwrapInput(input).trim();
        if (!rawClaim) {
            return '[FactCheck]\n输入为空，请提供需要检索的文本。';
        }
        const maxInputChars = this.config.tool.maxInputChars || 1200;
        const claim = rawClaim.slice(0, maxInputChars);
        if (rawClaim.length > maxInputChars) {
            this.logger.warn(`[FactCheckTool] 输入过长，已截断到 ${maxInputChars} 字符`);
        }
        const configuredSources = this.getConfiguredSources();
        if (configuredSources.length === 0) {
            return '[FactCheck]\n搜索失败: 未配置搜索来源。';
        }
        const failedLabels = [];
        const successResults = [];
        const active = new Map();
        const start = Date.now();
        const maxWaitMs = Math.max(1, this.config.timeoutSeconds || 120) * 1000;
        configuredSources.forEach((source, index) => {
            active.set(index, this.createSourceTask(claim, source, index));
        });
        while (active.size > 0) {
            const remainingMs = maxWaitMs - (Date.now() - start);
            const outcome = await this.waitNextOutcome(active, remainingMs);
            if (outcome.status === 'timeout') {
                this.logger.info(`[FactCheckTool] 达到快速返回等待上限 ${maxWaitMs}ms`);
                break;
            }
            active.delete(outcome.index);
            if (outcome.status === 'fulfilled') {
                if (outcome.value.failed) {
                    failedLabels.push(outcome.value.perspective || `source-${outcome.index + 1}`);
                }
                else {
                    successResults.push(outcome.value);
                    if (successResults.length >= 1) {
                        break;
                    }
                }
            }
            else {
                failedLabels.push(this.getSourcePerspective(outcome.source, outcome.index));
            }
        }
        if (active.size > 0) {
            active.forEach((task, index) => {
                const source = configuredSources[index];
                this.trackBackgroundTask(task, source ? this.getSourcePerspective(source, index) : `source-${index + 1}`);
            });
        }
        if (successResults.length === 0) {
            return `[FactCheck]\n搜索失败: ${failedLabels.join('、') || '全部来源不可用'}`;
        }
        const output = this.formatResults(successResults);
        if (failedLabels.length > 0) {
            return this.summarizeOutput(`${output}\n\n[Failed]\n- ${failedLabels.join('\n- ')}`, 'fact_check');
        }
        return this.summarizeOutput(output, 'fact_check');
    }
}
function registerFactCheckTool(ctx, config) {
    const logger = ctx.logger('chatluna-fact-check');
    if (!config.tool.enabled) {
        logger.info('[FactCheckTool] 已禁用工具注册');
        return;
    }
    const chatluna = ctx.chatluna;
    if (!chatluna?.platform?.registerTool) {
        logger.warn('[FactCheckTool] chatluna.platform.registerTool 不可用，跳过注册');
        return;
    }
    const toolName = sanitizeToolName(config.tool.name, 'fact_check');
    const toolDescription = sanitizeToolDescription(config.tool.description, '联网事实核查与时效搜索。');
    ctx.effect(() => {
        logger.info(`[FactCheckTool] 注册工具: ${toolName}`);
        const dispose = chatluna.platform.registerTool(toolName, {
            createTool() {
                return new FactCheckTool(ctx, config, toolName, toolDescription);
            },
            selector() {
                return true;
            },
        });
        return () => {
            if (typeof dispose === 'function') {
                dispose();
            }
        };
    });
}
function sanitizeToolName(value, fallback) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text) {
        return fallback;
    }
    const normalized = text
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_-]/g, '')
        .slice(0, 64);
    return normalized || fallback;
}
function sanitizeToolDescription(value, fallback) {
    const text = typeof value === 'string' ? value.trim() : '';
    return text || fallback;
}
