import type * as LHModel from '../../lighthouse/lighthouse.js';
import { type ContextDetail, ConversationContext } from '../agents/AiAgent.js';
export declare class AccessibilityContext extends ConversationContext<LHModel.ReporterTypes.ReportJSON> {
    #private;
    constructor(report: LHModel.ReporterTypes.ReportJSON);
    getURL(): string;
    getItem(): LHModel.ReporterTypes.ReportJSON;
    getTitle(): string;
    getPromptDetails(): Promise<string | null>;
    getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]] | null>;
}
