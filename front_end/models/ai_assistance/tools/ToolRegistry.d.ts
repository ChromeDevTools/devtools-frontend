import { ExecuteJavaScriptTool } from './ExecuteJavaScript.js';
import { GetStylesTool } from './GetStyles.js';
import { type Tool } from './Tool.js';
/**
 * Plain object registry containing concrete instantiated tools.
 * Keep this type concrete (no type-erasure) to preserve exact tool types.
 */
export declare const TOOLS: {
    executeJavaScript: ExecuteJavaScriptTool;
    getStyles: GetStylesTool;
};
/**
 * Registry class for registering and querying AI Assistance Tools.
 */
export declare class ToolRegistry {
    /**
     * Retrieves a tool by its literal name with 100% type safety.
     *
     * @template K - A key from the `TOOLS` registry.
     * @returns The concrete class type of the requested tool.
     */
    static get<K extends keyof typeof TOOLS>(name: K): typeof TOOLS[K];
    /**
     * Fallback retrieval signature for general or runtime string lookups.
     */
    static get(name: string): Tool | undefined;
}
