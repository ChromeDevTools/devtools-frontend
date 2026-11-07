import * as Host from '../../../core/host/host.js';
import type { FunctionHandlerOptions } from '../agents/AiAgent.js';
import { type BaseToolCapability, type DataHandlerResult, type DataTool, type OriginLockCapability, PermissionPrompt, type StyleMutationCapability, type TargetCapability, type ToolArgs, ToolName } from './Tool.js';
export interface StylePropertyChange {
    name: string;
    value: string;
}
export interface SetElementStylesArgs extends ToolArgs {
    elements: number[];
    styleProperties: StylePropertyChange[];
    explanation: string;
}
/**
 * V2 SDK-based equivalent of the page-injected `setElementStyles` function
 * used by V1 `StylingAgent` (see `injected.ts` and
 * `ExtensionScope#bindingCalled`, tracked for removal in b/581814240).
 *
 * This tool is designed to be behaviorally identical to the V1 `execJs`
 * implementation—computing the element selector, sanitizing declarations,
 * assigning an `ai-style-change-<id>` class, stripping overridden inline
 * styles, registering the rule in `ChangeManager`, and adopting the stylesheet
 * in any enclosing `ShadowRoot`—while operating through `DOMModel`, `CSSModel`,
 * and `ChangeManager` without `execJs` or an `ExtensionScope` isolated world.
 * Any behavioral changes here must stay in sync with V1 until b/581814240
 * lands.
 */
export declare class SetElementStylesTool implements DataTool<SetElementStylesArgs, string, BaseToolCapability & TargetCapability & OriginLockCapability & StyleMutationCapability> {
    #private;
    readonly name: ToolName;
    readonly permissionPrompt: PermissionPrompt;
    readonly description: string;
    readonly parameters: Host.AidaClient.FunctionObjectParam<keyof SetElementStylesArgs>;
    displayInfoFromArgs(params: SetElementStylesArgs): {
        title: string;
        thought: string;
        action: string;
    };
    /**
     * Handles applying CSS style declarations to specified elements.
     *
     * Resolves element backend node IDs using the primary page target, verifies
     * security origin locks, sanitizes CSS declarations, and registers style
     * rules via ChangeManager and DOM/CSS SDK models.
     */
    handler(params: SetElementStylesArgs, context: BaseToolCapability & TargetCapability & OriginLockCapability & StyleMutationCapability, _options?: FunctionHandlerOptions): Promise<DataHandlerResult<string>>;
}
