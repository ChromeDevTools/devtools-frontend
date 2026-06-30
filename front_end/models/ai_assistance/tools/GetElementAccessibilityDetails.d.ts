import * as Host from '../../../core/host/host.js';
import type { FunctionCallHandlerResult } from '../agents/AiAgent.js';
import { type BaseToolCapability, type OriginLockCapability, type TargetCapability, type Tool, type ToolArgs, ToolName } from './Tool.js';
/**
 * Arguments for getting accessibility details of an element.
 */
export interface GetElementAccessibilityDetailsArgs extends ToolArgs {
    /**
     * The backend node ID of the element to inspect.
     */
    element: number;
    explanation: string;
}
/**
 * A tool that retrieves fine-grained accessibility properties (role, name, ARIA properties, focus state)
 * for a resolved element backend node ID. It also returns a DOM snapshot of the element's subtree.
 */
export declare class GetElementAccessibilityDetailsTool implements Tool<GetElementAccessibilityDetailsArgs, string, BaseToolCapability & TargetCapability & OriginLockCapability> {
    readonly name = ToolName.GET_ELEMENT_ACCESSIBILITY_DETAILS;
    readonly description = "Get detailed accessibility information for an element on the inspected page by its backend node ID.";
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof GetElementAccessibilityDetailsArgs>;
    displayInfoFromArgs(params: GetElementAccessibilityDetailsArgs): {
        title: string;
        thought: string;
        action: string;
    };
    /**
     * Handles the request to retrieve accessibility details.
     *
     * Resolves the element backend node ID, validates its origin against the locked origin,
     * requests the AX subtree via AccessibilityModel, and maps the relevant attributes.
     */
    handler(params: GetElementAccessibilityDetailsArgs, context: BaseToolCapability & TargetCapability & OriginLockCapability): Promise<FunctionCallHandlerResult<string>>;
}
