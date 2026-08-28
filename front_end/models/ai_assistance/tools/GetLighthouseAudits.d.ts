import * as Host from '../../../core/host/host.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type LighthouseReportCapability, type ToolArgs, ToolName } from './Tool.js';
export interface GetLighthouseAuditsArgs extends ToolArgs {
    categoryId: LHModel.RunTypes.CategoryId;
}
export declare class GetLighthouseAuditsTool implements DataTool<GetLighthouseAuditsArgs, {
    audits: string;
}, BaseToolCapability & LighthouseReportCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetLighthouseAuditsArgs>;
    displayInfoFromArgs(params: GetLighthouseAuditsArgs): {
        title: string;
        action: string;
    };
    handler(params: GetLighthouseAuditsArgs, context: BaseToolCapability & LighthouseReportCapability): Promise<DataHandlerResult<{
        audits: string;
    }>>;
}
