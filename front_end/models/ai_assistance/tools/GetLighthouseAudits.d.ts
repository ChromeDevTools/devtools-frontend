import * as Host from '../../../core/host/host.js';
import { type LighthouseCategoryArg } from '../data_formatters/LighthouseFormatter.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type LighthouseReportCapability, PermissionPrompt, type ToolArgs, ToolName } from './Tool.js';
export interface GetLighthouseAuditsArgs extends ToolArgs {
    categoryId: LighthouseCategoryArg;
}
export declare class GetLighthouseAuditsTool implements DataTool<GetLighthouseAuditsArgs, {
    audits: string;
}, BaseToolCapability & LighthouseReportCapability> {
    readonly name: ToolName;
    readonly permissionPrompt: PermissionPrompt;
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
