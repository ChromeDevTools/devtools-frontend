import * as Host from '../../core/host/host.js';
import { type AgentOptions, AiAgent, type ContextResponse, type ConversationContext, type MultimodalInputType, type RequestOptions } from './agents/AiAgent.js';
import type { Skill, SkillName } from './skills/Skill.js';
export declare class AiAgent2 extends AiAgent<unknown> {
    #private;
    readonly preamble = "You are a unified AI assistant in Chrome DevTools. You can learn skills to help the user.";
    readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_STYLING_AGENT;
    readonly userTier = "TESTERS";
    get options(): RequestOptions;
    constructor(opts: AgentOptions);
    enhanceQuery(query: string, selected?: ConversationContext<unknown> | null, _multimodalInputType?: MultimodalInputType): Promise<string>;
    handleContextDetails(selected: ConversationContext<unknown> | null): AsyncGenerator<ContextResponse, void, void>;
    getSkills(): Record<SkillName, Skill>;
    learnSkill(names: SkillName[]): Promise<string>;
    get activeSkills(): Set<SkillName>;
}
