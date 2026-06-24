import * as Host from '../../../core/host/host.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import type { FunctionCallHandlerResult } from '../agents/AiAgent.js';
import { type BaseToolCapability, type Tool, type ToolArgs, ToolName } from './Tool.js';
export interface GetLighthouseAuditsArgs extends ToolArgs {
    categoryId: LHModel.RunTypes.CategoryId;
}
export declare class GetLighthouseAuditsTool implements Tool<GetLighthouseAuditsArgs, {
    audits: string;
}, BaseToolCapability> {
    readonly name = ToolName.GET_LIGHTHOUSE_AUDITS;
    readonly description = "Returns the audits for a specific Lighthouse category.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetLighthouseAuditsArgs>;
    displayInfoFromArgs(params: GetLighthouseAuditsArgs): {
        title: string;
        action: string;
    };
    handler(params: GetLighthouseAuditsArgs, context: BaseToolCapability): Promise<FunctionCallHandlerResult<{
        audits: string;
    }>>;
}
