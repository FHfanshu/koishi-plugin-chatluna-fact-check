import type { Context } from 'koishi';
import { Config } from './config';
import type { PluginConfig } from './types';
export declare const name = "chatluna-fact-check";
export declare const inject: {
    readonly required: readonly ["chatluna"];
    readonly optional: readonly ["console", "chatluna_character"];
};
export declare const usage = "\n## Chatluna Fact Check\n\n\u7528\u4E8E Chatluna \u5DE5\u5177\u5316\u8054\u7F51\u6838\u67E5\uFF0C\u6838\u5FC3\u5DE5\u5177\uFF1A\n- `fact_check`\uFF1A\u6309\u6765\u6E90\u5217\u8868\u5E76\u884C\u6267\u884C\u4E8B\u5B9E\u6838\u67E5\uFF08Chatluna \u6A21\u578B / Tavily\uFF09\n- `web_fetch`\uFF1A\u7F51\u9875\u6B63\u6587\u6293\u53D6\uFF08Chatluna + Jina \u56DE\u9000\uFF09\n\n\u914D\u7F6E\u8981\u70B9\uFF1A\n1. \u5728 `search.chatluna.models` \u4E2D\u914D\u7F6E Chatluna \u6A21\u578B\u6765\u6E90\u3002\n2. \u5728 `search.custom.sources` \u4E2D\u914D\u7F6E\u53EF\u6269\u5C55\u6765\u6E90\uFF08\u5F53\u524D\u5185\u7F6E Tavily\uFF09\u3002\n3. `timeoutSeconds` \u63A7\u5236 fact_check \u5FEB\u901F\u8FD4\u56DE\u6700\u5927\u7B49\u5F85\u65F6\u957F\u3002";
export declare function apply(ctx: Context, config: PluginConfig): void;
export { Config };
