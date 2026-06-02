import * as Host from '../../core/host/host.js';
import { AiAgent, type ContextResponse, type ConversationContext, type RequestOptions } from './agents/AiAgent.js';
import type { SkillName } from './skills/Skill.js';
export declare class AiAgent2 extends AiAgent<unknown> {
    #private;
    readonly preamble = "You are a unified AI assistant in Chrome DevTools. You can learn skills to help the user.";
    readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_STYLING_AGENT;
    readonly userTier = "TESTERS";
    get options(): RequestOptions;
    handleContextDetails(_select: ConversationContext<unknown> | null): AsyncGenerator<ContextResponse, void, void>;
    learnSkill(names: SkillName[]): Promise<string>;
    get activeSkills(): Set<SkillName>;
}
