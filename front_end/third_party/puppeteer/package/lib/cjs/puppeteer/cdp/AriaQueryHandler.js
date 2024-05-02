"use strict";
/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ARIAQueryHandler = void 0;
const QueryHandler_js_1 = require("../common/QueryHandler.js");
const assert_js_1 = require("../util/assert.js");
const AsyncIterableUtil_js_1 = require("../util/AsyncIterableUtil.js");
const NON_ELEMENT_NODE_ROLES = new Set(['StaticText', 'InlineTextBox']);
const queryAXTree = async (client, element, accessibleName, role) => {
    const { nodes } = await client.send('Accessibility.queryAXTree', {
        objectId: element.id,
        accessibleName,
        role,
    });
    return nodes.filter((node) => {
        return !node.role || !NON_ELEMENT_NODE_ROLES.has(node.role.value);
    });
};
const isKnownAttribute = (attribute) => {
    return ['name', 'role'].includes(attribute);
};
const normalizeValue = (value) => {
    return value.replace(/ +/g, ' ').trim();
};
/**
 * The selectors consist of an accessible name to query for and optionally
 * further aria attributes on the form `[<attribute>=<value>]`.
 * Currently, we only support the `name` and `role` attribute.
 * The following examples showcase how the syntax works wrt. querying:
 *
 * - 'title[role="heading"]' queries for elements with name 'title' and role 'heading'.
 * - '[role="image"]' queries for elements with role 'image' and any name.
 * - 'label' queries for elements with name 'label' and any role.
 * - '[name=""][role="button"]' queries for elements with no name and role 'button'.
 */
const ATTRIBUTE_REGEXP = /\[\s*(?<attribute>\w+)\s*=\s*(?<quote>"|')(?<value>\\.|.*?(?=\k<quote>))\k<quote>\s*\]/g;
const parseARIASelector = (selector) => {
    const queryOptions = {};
    const defaultName = selector.replace(ATTRIBUTE_REGEXP, (_, attribute, __, value) => {
        attribute = attribute.trim();
        (0, assert_js_1.assert)(isKnownAttribute(attribute), `Unknown aria attribute "${attribute}" in selector`);
        queryOptions[attribute] = normalizeValue(value);
        return '';
    });
    if (defaultName && !queryOptions.name) {
        queryOptions.name = normalizeValue(defaultName);
    }
    return queryOptions;
};
/**
 * @internal
 */
class ARIAQueryHandler extends QueryHandler_js_1.QueryHandler {
    static querySelector = async (node, selector, { ariaQuerySelector }) => {
        return await ariaQuerySelector(node, selector);
    };
    static async *queryAll(element, selector) {
        const { name, role } = parseARIASelector(selector);
        const results = await queryAXTree(element.realm.environment.client, element, name, role);
        yield* AsyncIterableUtil_js_1.AsyncIterableUtil.map(results, node => {
            return element.realm.adoptBackendNode(node.backendDOMNodeId);
        });
    }
    static queryOne = async (element, selector) => {
        return ((await AsyncIterableUtil_js_1.AsyncIterableUtil.first(this.queryAll(element, selector))) ?? null);
    };
}
exports.ARIAQueryHandler = ARIAQueryHandler;
//# sourceMappingURL=AriaQueryHandler.js.map