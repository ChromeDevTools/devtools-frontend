import * as Host from '../../../core/host/host.js';
import type { FunctionCallHandlerResult } from '../agents/AiAgent.js';
import { type BaseToolCapability, type OriginLockCapability, type TargetCapability, type Tool, type ToolArgs, ToolName } from './Tool.js';
/**
 * Arguments for resolving a Lighthouse path to a backend node ID.
 */
export interface ResolveLighthousePathArgs extends ToolArgs {
    /**
     * A Lighthouse-style element path.
     * This is typically a comma-separated list of child indices and tag names
     * representing the path from the root to the target element (e.g., "1,HTML,1,BODY").
     */
    path: string;
    explanation: string;
}
/**
 * A tool that resolves a Lighthouse-style element path to a backend node ID.
 *
 * This is used by the AI assistant to identify specific DOM nodes referred to in
 * Lighthouse reports. It ensures the resolved node belongs to the locked origin.
 */
export declare class ResolveLighthousePathTool implements Tool<ResolveLighthousePathArgs, {
    backendNodeId: number;
}, BaseToolCapability & TargetCapability & OriginLockCapability> {
    readonly name = ToolName.RESOLVE_LIGHTHOUSE_PATH;
    readonly description = "Resolves a Lighthouse path to a backend node ID.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ResolveLighthousePathArgs>;
    displayInfoFromArgs(params: ResolveLighthousePathArgs): {
        title: string;
        thought: string;
        action: string;
    };
    /**
     * Handles the resolution request.
     *
     * It retrieves the node path using the target's DOMModel and verifies
     * that the node's origin matches the established origin lock to prevent
     * access to nodes from other origins.
     */
    handler(params: ResolveLighthousePathArgs, context: BaseToolCapability & TargetCapability & OriginLockCapability): Promise<FunctionCallHandlerResult<{
        backendNodeId: number;
    }>>;
}
