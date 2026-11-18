// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { isOriginAllowedByLock, } from './Tool.js';
export class GetStylesTool {
    name = "getStyles" /* ToolName.GET_STYLES */;
    permissionPrompt = "never" /* PermissionPrompt.NEVER */;
    description = `Retrieves computed and authored CSS styles for one or more elements by their backend node IDs (uids).

**CRITICAL** An element uid is a number, not a selector.
**CRITICAL** Use selectors to refer to elements in the text output. Do not use uids.
**CRITICAL** Always provide the explanation argument to explain what and why you query.
**CRITICAL** You MUST provide a specific list of CSS property names. Do not use generic values like "all" or "*".`;
    parameters = {
        type: 6 /* Host.AidaClient.ParametersTypes.OBJECT */,
        description: '',
        nullable: false,
        properties: {
            explanation: {
                type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                description: 'Explain why you want to get styles',
                nullable: false,
            },
            elements: {
                type: 5 /* Host.AidaClient.ParametersTypes.ARRAY */,
                description: 'A list of element uids to get data for. These are numbers, not selectors.',
                items: { type: 3 /* Host.AidaClient.ParametersTypes.INTEGER */, description: 'An element uid.' },
                nullable: false,
            },
            styleProperties: {
                type: 5 /* Host.AidaClient.ParametersTypes.ARRAY */,
                description: 'One or more specific CSS style property names to fetch. Generic values like "all" or "*" are not supported.',
                nullable: false,
                items: {
                    type: 1 /* Host.AidaClient.ParametersTypes.STRING */,
                    description: 'A CSS style property name to retrieve. For example, \'background-color\'.',
                },
            },
        },
        required: ['explanation', 'elements', 'styleProperties'],
    };
    displayInfoFromArgs(params) {
        return {
            title: 'Reading computed and source styles',
            thought: params.explanation,
            action: `getStyles(${JSON.stringify(params.elements)}, ${JSON.stringify(params.styleProperties)})`,
        };
    }
    /**
     * Handles the request to retrieve computed and authored CSS styles for specified elements.
     *
     * Normalizes and expands shorthand property names, resolves element backend node IDs using the
     * primary page target, and verifies that each element's security origin matches the established
     * origin lock before querying CSS models.
     */
    async handler(params, context, _options) {
        const propertySets = this.#resolveStyleProperties(params.styleProperties);
        if ('error' in propertySets) {
            return propertySets;
        }
        const { expandedProperties, authoredProperties } = propertySets;
        const target = context.getTarget();
        if (!target) {
            return { error: 'Error: Could not find the inspected page.' };
        }
        const widgets = [];
        const result = {};
        for (const uid of params.elements) {
            const node = new SDK.DOMModel.DeferredDOMNode(target, uid);
            const resolved = await node.resolvePromise();
            if (!resolved) {
                return { error: 'Error: Could not find the element with uid=' + uid };
            }
            // Security check: Ensure the resolved element belongs to the locked origin.
            // Because getTarget() returns the primary page target to support resolving elements
            // across frames, origin validation must be enforced directly on the resolved node.
            if (!isOriginAllowedByLock(context.getOriginLock(), resolved.securityOrigin())) {
                return { error: 'Error: Node does not belong to the current origin.' };
            }
            const styles = await resolved.domModel().cssModel().getComputedStyle(resolved.id);
            if (!styles) {
                return { error: 'Error: Could not get computed styles.' };
            }
            const matchedStyles = await resolved.domModel().cssModel().getMatchedStyles(resolved.id);
            if (!matchedStyles) {
                return { error: 'Error: Could not get authored styles.' };
            }
            widgets.push({
                name: 'COMPUTED_STYLES',
                data: {
                    computedStyles: styles,
                    backendNodeId: node.backendNodeId(),
                    matchedCascade: matchedStyles,
                    properties: [...expandedProperties],
                },
            });
            const computed = {};
            for (const prop of expandedProperties) {
                computed[prop] = styles.get(prop);
            }
            result[uid] = {
                computed,
                authored: this.#collectAuthoredStyles(matchedStyles, authoredProperties),
            };
        }
        return {
            result: JSON.stringify(result, null, 2),
            widgets,
        };
    }
    /**
     * Normalizes requested CSS property names, rejects "all" and "*", and computes
     * separate property sets for computed-style lookups and authored-rule matching.
     */
    #resolveStyleProperties(styleProperties) {
        const cssMetadata = SDK.CSSMetadata.cssMetadata();
        const expandedProperties = new Set();
        for (const rawProperty of styleProperties) {
            const trimmed = rawProperty.trim();
            if (!trimmed) {
                continue;
            }
            const canonical = trimmed.startsWith('--') ? trimmed : trimmed.toLowerCase();
            if (canonical === 'all' || canonical === '*') {
                return {
                    error: 'Error: Generic values like "all" or "*" are not supported. Provide specific CSS property names.',
                };
            }
            expandedProperties.add(canonical);
            // getComputedStyle() returns only resolved longhands, so expand shorthands into longhands.
            for (const longhand of cssMetadata.getLonghands(canonical) ?? []) {
                expandedProperties.add(longhand);
            }
        }
        // Authored rules can set requested longhands through a parent shorthand, such as an unexpanded var() declaration.
        // Track parent shorthands separately from expandedProperties so computed and widget properties do not widen.
        const authoredProperties = new Set(expandedProperties);
        for (const prop of expandedProperties) {
            for (const shorthand of cssMetadata.getShorthands(prop) ?? []) {
                // CSSMetadata registers "all" as a parent shorthand for almost every standard CSS property.
                if (shorthand !== 'all') {
                    authoredProperties.add(shorthand);
                }
            }
        }
        return { expandedProperties, authoredProperties };
    }
    /**
     * Collects active, non-empty authored CSS declarations matching `authoredProperties`
     * across the element's matched style cascade.
     */
    #collectAuthoredStyles(matchedStyles, authoredProperties) {
        const authored = {};
        for (const style of matchedStyles.nodeStyles()) {
            for (const property of style.allProperties()) {
                if (!authoredProperties.has(property.name)) {
                    continue;
                }
                // Blink does not expand var() shorthands at parse time, so CSSProperty creates
                // active implicit longhands with empty values. Skip those empty longhands so
                // authored does not report "".
                if (property.implicit && !property.value) {
                    continue;
                }
                if (matchedStyles.propertyState(property) === "Active" /* SDK.CSSMatchedStyles.PropertyState.ACTIVE */) {
                    authored[property.name] = property.value;
                }
            }
        }
        return authored;
    }
}
//# sourceMappingURL=GetStyles.js.map