// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { adoptStyleSheetInShadowRoot, removeInlineStyleProperties, sanitizeStyleChanges, } from '../DOMHelpers.js';
import { ExtensionScope } from '../ExtensionScope.js';
import { AI_ASSISTANCE_CSS_CLASS_NAME } from '../injected.js';
import { isOriginAllowedByLock, } from './Tool.js';
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
export class SetElementStylesTool {
    name = "setElementStyles" /* ToolName.SET_ELEMENT_STYLES */;
    permissionPrompt = "never" /* PermissionPrompt.NEVER */;
    description = 'Applies CSS style declarations to one or more elements on the inspected page identified by their backend node IDs (uids). Prefer this tool over executeJavaScript whenever modifying or testing CSS styles on elements.';
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: '',
        nullable: false,
        properties: {
            explanation: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'Explain why you want to apply these style changes to the elements.',
                nullable: false,
            },
            elements: {
                type: 5 /* Host.AidaClient.ParametersTypes.ARRAY */,
                description: 'A list of element uids (backend node IDs) to apply the styles to. These are numbers, not CSS selectors.',
                nullable: false,
                items: {
                    type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */,
                    description: 'An element uid.',
                },
            },
            styleProperties: {
                type: 5 /* Host.AidaClient.ParametersTypes.ARRAY */,
                description: 'One or more CSS style declarations (property name and value pairs) to apply to the specified elements.',
                nullable: false,
                items: {
                    type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
                    description: 'A CSS property name and value pair.',
                    properties: {
                        name: {
                            type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                            description: 'The CSS property name in kebab-case (for example, \'background-color\' or \'justify-content\').',
                            nullable: false,
                        },
                        value: {
                            type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                            description: 'The CSS property value to set (for example, \'flex\' or \'16px\').',
                            nullable: false,
                        },
                    },
                    required: ['name', 'value'],
                },
            },
        },
        required: ['explanation', 'elements', 'styleProperties'],
    };
    displayInfoFromArgs(params) {
        const styles = Object.fromEntries(params.styleProperties?.map(p => [p.name, p.value]) ?? []);
        return {
            title: 'Applying style changes',
            thought: params.explanation,
            action: `setElementStyles(${JSON.stringify(params.elements)}, ${JSON.stringify(styles)})`,
        };
    }
    /**
     * Handles applying CSS style declarations to specified elements.
     *
     * Resolves element backend node IDs using the primary page target, verifies
     * security origin locks, sanitizes CSS declarations, and registers style
     * rules via ChangeManager and DOM/CSS SDK models.
     */
    async handler(params, context, _options) {
        const target = context.getTarget();
        if (!target) {
            return { error: 'Error: Could not find the inspected page.' };
        }
        if (!params.elements?.length) {
            return { error: 'Error: No elements provided.' };
        }
        if (!params.styleProperties?.length) {
            return { error: 'Error: No style properties provided.' };
        }
        const styles = Platform.StringUtilities.toKebabCaseKeys(Object.fromEntries(params.styleProperties.map(p => [p.name, p.value])));
        const maybeResolvedNodes = await Promise.all(params.elements.map(uid => new SDK.DOMModel.DeferredDOMNode(target, uid).resolvePromise()));
        const resolvedNodes = [];
        for (let i = 0; i < params.elements.length; i++) {
            const resolved = maybeResolvedNodes[i];
            if (!resolved) {
                return { error: 'Error: Could not find the element with uid=' + params.elements[i] };
            }
            if (!isOriginAllowedByLock(context.getOriginLock(), resolved.securityOrigin())) {
                return { error: 'Error: Node does not belong to the current origin.' };
            }
            resolvedNodes.push(resolved);
        }
        const appliedProperties = new Set();
        const ignoredProperties = new Set();
        try {
            for (const resolvedNode of resolvedNodes) {
                const nodeResult = await this.#applyStyleChangesToNode(resolvedNode, styles, context.changeManager);
                if ('error' in nodeResult) {
                    return nodeResult;
                }
                for (const prop of nodeResult.applied) {
                    appliedProperties.add(prop);
                }
                for (const prop of nodeResult.ignored) {
                    ignoredProperties.add(prop);
                }
            }
        }
        catch (error) {
            return {
                error: error instanceof Error ? `Error: ${error.message}` : 'Error: Failed to apply element styles.',
            };
        }
        if (ignoredProperties.size > 0) {
            return {
                result: `Successfully updated styles (${[...appliedProperties].join(', ')}). The following properties were ignored because they are invalid CSS or contain disallowed URL functions (url(), image-set(), src()): ${[...ignoredProperties].join(', ')}.`,
            };
        }
        return { result: 'Successfully updated styles.' };
    }
    /**
     * Applies style changes to a single resolved DOMNode using the same steps as
     * `setElementStyles` (`injected.ts`) and `ExtensionScope#bindingCalled`.
     */
    async #applyStyleChangesToNode(resolvedNode, styles, changeManager) {
        const domModel = resolvedNode.domModel();
        const cssModel = domModel.cssModel();
        const frameId = resolvedNode.frameId() ?? domModel.target().model(SDK.ResourceTreeModel.ResourceTreeModel)?.mainFrame?.id;
        if (!frameId) {
            return { error: 'Error: Main frame is not found for applying styles.' };
        }
        // Prefer extracting a selector from the element's existing matched CSS
        // rules rather than a generic tag/class fallback so the injected nested
        // rule (`selector&`) matches the specificity context of the element's
        // primary existing rule.
        let matchedStyles = null;
        try {
            matchedStyles = await cssModel.getMatchedStyles(resolvedNode.id);
        }
        catch {
            // Leave matchedStyles as null so getSelectorForElement falls back to a
            // simple tag/id/class selector (`getSelectorForNode`).
        }
        const selector = ExtensionScope.getSelectorForElement(resolvedNode, matchedStyles);
        const sanitizedStyles = await sanitizeStyleChanges(selector, styles);
        const applied = Object.keys(sanitizedStyles);
        if (applied.length === 0) {
            return {
                error: 'Error: None of the suggested CSS properties or their values for selector were considered valid or permitted (URL functions such as url(), image-set(), and src() are not allowed). Please ensure property names are correct and values match the expected format for those properties.',
            };
        }
        const ignored = Object.keys(styles).filter(key => !(key in sanitizedStyles));
        // Reuse an existing AI style class if present to prevent appending
        // duplicates on successive tool calls against the same element.
        const existingClasses = (resolvedNode.getAttribute('class') ?? '').split(/\s+/).filter(Boolean);
        let className = existingClasses.find(cls => cls.startsWith(`${AI_ASSISTANCE_CSS_CLASS_NAME}-`));
        if (!className) {
            className = `${AI_ASSISTANCE_CSS_CLASS_NAME}-${resolvedNode.backendNodeId()}`;
            await resolvedNode.setAttributeValuePromise('class', [...existingClasses, className].join(' '));
        }
        // Inline styles have higher specificity than the stylesheet rules injected
        // by ChangeManager. Remove any inline properties being modified so the new
        // rules take effect.
        const inlineStyle = resolvedNode.getAttribute('style');
        if (inlineStyle) {
            const updatedInlineStyle = removeInlineStyleProperties(inlineStyle, sanitizedStyles);
            if (updatedInlineStyle !== inlineStyle) {
                await resolvedNode.setAttributeValuePromise('style', updatedInlineStyle);
            }
        }
        const styleChanges = await changeManager.addChange(cssModel, frameId, {
            selector,
            className,
            styles: sanitizedStyles,
        });
        // ChangeManager registers rules in the document-level inspector stylesheet,
        // which does not penetrate Shadow DOM. When the target element is inside a
        // shadow tree, adopt the generated stylesheet onto its enclosing ShadowRoot.
        if (resolvedNode.isInShadowTree()) {
            const remoteObject = await resolvedNode.resolveToObject('');
            if (remoteObject) {
                try {
                    await remoteObject.callFunction(adoptStyleSheetInShadowRoot, [
                        { value: AI_ASSISTANCE_CSS_CLASS_NAME },
                        { value: styleChanges },
                    ]);
                }
                finally {
                    remoteObject.release();
                }
            }
        }
        return { applied, ignored };
    }
}
//# sourceMappingURL=SetElementStyles.js.map