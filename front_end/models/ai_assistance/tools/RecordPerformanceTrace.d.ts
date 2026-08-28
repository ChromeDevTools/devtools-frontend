import * as Host from '../../../core/host/host.js';
import type { AgentFocus } from '../performance/AIContext.js';
import { type BaseToolCapability, type ContextHandlerResult, type ContextTool, type PerformanceRecordingCapability, ToolName } from './Tool.js';
export declare class RecordPerformanceTraceTool implements ContextTool<Record<string, never>, AgentFocus, BaseToolCapability & PerformanceRecordingCapability> {
    readonly name: ToolName;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<never>;
    displayInfoFromArgs(): {
        title: string;
        action: string;
    };
    handler(_params: Record<string, never>, capabilities: BaseToolCapability & PerformanceRecordingCapability): Promise<ContextHandlerResult<AgentFocus>>;
}
