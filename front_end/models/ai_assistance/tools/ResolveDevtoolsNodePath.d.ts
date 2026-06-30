import * as Host from '../../../core/host/host.js';
import type { FunctionCallHandlerResult } from '../agents/AiAgent.js';
import { type BaseToolCapability, type OriginLockCapability, type TargetCapability, type Tool, type ToolArgs, ToolName } from './Tool.js';
/**
 * Arguments for resolving a DevTools node path to a backend node ID.
 */
export interface ResolveDevtoolsNodePathArgs extends ToolArgs {
    /**
     * A DevTools node path.
     * This is typically a comma-separated list of child indices and tag names
     * representing the path from the root to the target element (e.g., "1,HTML,1,BODY").
     */
    path: string;
    explanation: string;
}
/**
 * A tool that resolves a DevTools node path to a backend node ID.
 *
 * This is used by the AI assistant to identify specific DOM nodes referred to in
 * Lighthouse reports or other sources using node paths. It ensures the resolved node
 * belongs to the locked origin.
 */
export declare class ResolveDevtoolsNodePathTool implements Tool<ResolveDevtoolsNodePathArgs, {
    backendNodeId: number;
}, BaseToolCapability & TargetCapability & OriginLockCapability> {
    readonly name = ToolName.RESOLVE_DEVTOOLS_NODE_PATH;
    readonly description = "Resolves a DevTools node path to a backend node ID.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof ResolveDevtoolsNodePathArgs>;
    displayInfoFromArgs(params: ResolveDevtoolsNodePathArgs): {
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
    handler(params: ResolveDevtoolsNodePathArgs, context: BaseToolCapability & TargetCapability & OriginLockCapability): Promise<FunctionCallHandlerResult<{
        backendNodeId: number;
    }>>;
}
