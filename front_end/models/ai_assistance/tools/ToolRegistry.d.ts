import { ExecuteJavaScriptTool } from './ExecuteJavaScript.js';
import { GetLighthouseAuditsTool } from './GetLighthouseAudits.js';
import { GetNetworkRequestDetailsTool } from './GetNetworkRequestDetails.js';
import { GetStylesTool } from './GetStyles.js';
import { ListNetworkRequestsTool } from './ListNetworkRequests.js';
import { ResolveLighthousePathTool } from './ResolveLighthousePath.js';
import { type AllToolsContext, type Tool, type ToolArgs } from './Tool.js';
/**
 * Plain object registry containing concrete instantiated tools.
 *
 * This object is deliberately declared as a plain object without an explicit type annotation
 * (like `Record<ToolName, Tool>`) to preserve the exact concrete type of each registered tool.
 * This is required to support compile-time type safety and inference in the overloaded
 * `ToolRegistry.get()` method, which maps a literal `ToolName` key to its specific class type.
 */
export declare const TOOLS: {
    executeJavaScript: ExecuteJavaScriptTool;
    getStyles: GetStylesTool;
    listNetworkRequests: ListNetworkRequestsTool;
    getNetworkRequestDetails: GetNetworkRequestDetailsTool;
    getLighthouseAudits: GetLighthouseAuditsTool;
    resolveLighthousePath: ResolveLighthousePathTool;
};
/**
 * Registry class for registering and querying AI Assistance Tools.
 */
export declare class ToolRegistry {
    /**
     * Retrieves a tool by its literal name with 100% type safety.
     *
     * @template K - A key from the `TOOLS` registry.
     * @param name The literal name of the tool to retrieve.
     * @returns The concrete class type of the requested tool.
     */
    static get<K extends keyof typeof TOOLS>(name: K): typeof TOOLS[K];
    /**
     * Fallback retrieval signature for general or runtime string lookups.
     *
     * @param name The string name of the tool to retrieve, used when the tool name is only known at runtime.
     * @returns The generic Tool interface, or undefined if not found.
     */
    static get(name: string): Tool<ToolArgs, unknown, AllToolsContext> | undefined;
}
