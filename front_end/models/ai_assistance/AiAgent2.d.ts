import * as Host from '../../core/host/host.js';
import type * as LHModel from '../lighthouse/lighthouse.js';
import type * as Trace from '../trace/trace.js';
import { AiAgent, type ContextResponse, type ConversationContext, type MultimodalInputType, type RequestOptions } from './agents/AiAgent.js';
import { type ExecuteJsAgentOptions } from './agents/ExecuteJavascript.js';
import type { Skill, SkillName } from './skills/Skill.js';
export interface AiAgent2Options extends ExecuteJsAgentOptions {
    lighthouseRecording?: (overrides?: LHModel.RunTypes.RunOverrides) => Promise<LHModel.ReporterTypes.ReportJSON | null>;
    performanceRecordAndReload?: () => Promise<Trace.TraceModel.ParsedTrace>;
}
export declare class AiAgent2 extends AiAgent<unknown> {
    #private;
    readonly preamble: string;
    readonly clientFeature: Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    protected preRun(): Promise<void>;
    constructor(opts: AiAgent2Options);
    enhanceQuery(query: string, selected?: ConversationContext<unknown> | null, _multimodalInputType?: MultimodalInputType): Promise<string>;
    handleContextDetails(selected: ConversationContext<unknown> | null): AsyncGenerator<ContextResponse, void, void>;
    getSkills(): Record<SkillName, Skill>;
    learnSkill(names: SkillName[]): Promise<string>;
    get activeSkills(): Set<SkillName>;
}
