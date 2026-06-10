import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type { ChangeManager } from './ChangeManager.js';
/**
 * Injects Freestyler extension functions in to the isolated world.
 */
export declare class ExtensionScope {
    #private;
    constructor(changes: ChangeManager, agentId: string, selectedNode: SDK.DOMModel.DOMNode | null);
    get target(): SDK.Target.Target;
    get frameId(): Protocol.Page.FrameId;
    install(): Promise<void>;
    uninstall(): Promise<void>;
    static getStyleRuleFromMatchesStyles(matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles): SDK.CSSRule.CSSStyleRule | undefined;
    static getSelectorsFromStyleRule(styleRule: SDK.CSSRule.CSSStyleRule, matchedStyles: SDK.CSSMatchedStyles.CSSMatchedStyles): string;
    static getSelectorForNode(node: SDK.DOMModel.DOMNode): string;
    static getSourceLocation(styleRule: SDK.CSSRule.CSSStyleRule): string | undefined;
    sanitizedStyleChanges(selector: string, styles: Record<string, string>): Promise<Record<string, string>>;
}
