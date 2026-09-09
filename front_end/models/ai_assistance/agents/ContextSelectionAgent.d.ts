import * as Host from '../../../core/host/host.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as Logs from '../../logs/logs.js';
import * as NetworkTimeCalculator from '../../network_time_calculator/network_time_calculator.js';
import type * as Trace from '../../trace/trace.js';
import * as Workspace from '../../workspace/workspace.js';
import { type AgentOptions, AiAgent, type ContextResponse, type RequestOptions } from './AiAgent.js';
export interface ContextSelectionAgentOptions extends AgentOptions {
    performanceRecordAndReload?: () => Promise<Trace.TraceModel.ParsedTrace>;
    onInspectElement?: () => Promise<SDK.DOMModel.DOMNode | null>;
    networkTimeCalculator?: NetworkTimeCalculator.NetworkTransferTimeCalculator;
    networkLog?: Logs.NetworkLog.NetworkLog;
    workspace?: Workspace.Workspace.WorkspaceImpl;
}
/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export declare class ContextSelectionAgent extends AiAgent<never> {
    #private;
    readonly preamble: string;
    readonly clientFeature: Host.AidaClient.ClientFeature;
    get userTier(): string | undefined;
    get options(): RequestOptions;
    constructor(opts: ContextSelectionAgentOptions);
    handleContextDetails(): AsyncGenerator<ContextResponse, void, void>;
    enhanceQuery(query: string): Promise<string>;
    static lastSourceId: number;
    static uiSourceCodeId: WeakMap<Workspace.UISourceCode.UISourceCode, number>;
    /**
     * This is a heuristic algorithm that gets all the source files coming from the
     * network and assigns unique ids to be linked from the LLM Markdown response.
     * Steps we do:
     * 1. Get all project that are coming from the Network. This scopes down
     * sources exposed to the LLM
     * 2. Remove all ignore listed source code. We further reduce thing that the
     * user most likely does not have interest in, from global setting.
     * 3.1. Source files don't have an uniqueId so we use the URL to differentiate
     * them.
     * 3.2. In cases where we encounter a duplicated URLs we prefer the latest one
     * coming from SourceMaps (usually only one) as that has simple code and
     * usually is what the user authored.
     */
    static getUISourceCodes(workspace?: Workspace.Workspace.WorkspaceImpl): Workspace.UISourceCode.UISourceCode[];
}
