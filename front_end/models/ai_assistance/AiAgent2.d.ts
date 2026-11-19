import * as Host from '../../core/host/host.js';
import type * as LHModel from '../lighthouse/lighthouse.js';
import type * as Trace from '../trace/trace.js';
import { AiAgent, type ContextResponse, type ConversationContext, type MultimodalInput, type MultimodalInputType, type ParsedResponse, type RequestOptions, type ResponseData } from './agents/AiAgent.js';
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
    /**
     * `#commitRun()` and `#createErrorResponse()` clear `#runDraft` on committed
     * and error paths, while `finally` rolls back uncommitted drafts on early
     * consumer `break` or empty-query returns.
     */
    run(initialQuery: string, options: {
        selected: ConversationContext<unknown> | null;
        signal?: AbortSignal;
    }, multimodalInput?: MultimodalInput): AsyncGenerator<ResponseData, void, void>;
    /**
     * Discards the active `#runDraft` so uncommitted `skills`, `sentFacts`, and
     * `lastSentPromptDetails` from a failed run roll back while committed state
     * from earlier turns remains intact.
     */
    clearCache(): void;
    readonly preamble: string;
    readonly clientFeature: Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    protected preRun(): Promise<void>;
    constructor(opts: AiAgent2Options);
    /**
     * Promotes the completed `#runDraft` into `#committedState`.
     */
    protected onRunCommitted(): void;
    enhanceQuery(query: string, selected?: ConversationContext<unknown> | null, _multimodalInputType?: MultimodalInputType): Promise<string>;
    /**
     * `AiAgent2` receives follow-up suggestions from `suggestFollowUps` tool
     * calls rather than text parsing. Overrides `AiAgent#parseTextResponse()` so
     * V2 responses do not inherit V1 `parseTextResponseForSuggestions()`.
     */
    parseTextResponse(response: string): ParsedResponse;
    handleContextDetails(selected: ConversationContext<unknown> | null): AsyncGenerator<ContextResponse, void, void>;
    learnSkill(names: SkillName[]): Promise<string>;
    /**
     * Returns the active draft's skills during `run()`, or `#committedState.skills` when idle.
     */
    get activeSkills(): Set<SkillName>;
}
