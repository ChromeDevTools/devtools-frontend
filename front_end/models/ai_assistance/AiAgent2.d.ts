import * as Host from '../../core/host/host.js';
import type * as LHModel from '../lighthouse/lighthouse.js';
import type * as Trace from '../trace/trace.js';
import { AiAgent, type ContextResponse, type ConversationContext, type MultimodalInputType, type ParsedResponse, type RequestOptions } from './agents/AiAgent.js';
import { type ExecuteJsAgentOptions } from './agents/ExecuteJavascript.js';
import type { SkillName } from './skills/Skill.js';
import { type OriginLockState } from './tools/Tool.js';
export interface AiAgent2Options extends ExecuteJsAgentOptions {
    /**
     * Supplies the origin lock state for the conversation.
     */
    originLock: () => OriginLockState;
    lighthouseRecording?: (overrides?: LHModel.RunTypes.RunOverrides) => Promise<LHModel.RunTypes.RunResult>;
    performanceRecordAndReload?: () => Promise<Trace.TraceModel.ParsedTrace>;
}
export declare class AiAgent2 extends AiAgent<unknown> {
    #private;
    clearCache(): void;
    readonly preamble: string;
    readonly clientFeature: Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    protected preRun(): Promise<void>;
    constructor(opts: AiAgent2Options);
    enhanceQuery(query: string, selected?: ConversationContext<unknown> | null, _multimodalInputType?: MultimodalInputType): Promise<string>;
    /**
     * `AiAgent2` receives follow-up suggestions from `suggestFollowUps` tool
     * calls rather than text parsing. Overrides `AiAgent#parseTextResponse()` so
     * V2 responses do not inherit V1 `parseTextResponseForSuggestions()`.
     */
    parseTextResponse(response: string): ParsedResponse;
    handleContextDetails(selected: ConversationContext<unknown> | null): AsyncGenerator<ContextResponse, void, void>;
    learnSkill(names: SkillName[]): Promise<string>;
    get activeSkills(): Set<SkillName>;
}
