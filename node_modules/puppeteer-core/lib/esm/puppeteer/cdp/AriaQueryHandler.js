/**
 * @license
 * Copyright 2020 Google Inc.
 * SPDX-License-Identifier: Apache-2.0
 */
import { QueryHandler } from '../common/QueryHandler.js';
import { assert } from '../util/assert.js';
import { AsyncIterableUtil } from '../util/AsyncIterableUtil.js';
const NON_ELEMENT_NODE_ROLES = new Set(['StaticText', 'InlineTextBox']);
const queryAXTree = async (client, element, accessibleName, role) => {
    const { nodes } = await client.send('Accessibility.queryAXTree', {
        objectId: element.id,
        accessibleName,
        role,
    });
    return nodes.filter((node) => {
        if (node.ignored) {
            return false;
        }
        if (!node.role) {
            return false;
        }
        if (NON_ELEMENT_NODE_ROLES.has(node.role.value)) {
            return false;
        }
        return true;
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
        assert(isKnownAttribute(attribute), `Unknown aria attribute "${attribute}" in selector`);
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
export class ARIAQueryHandler extends QueryHandler {
    static querySelector = async (node, selector, { ariaQuerySelector }) => {
        return await ariaQuerySelector(node, selector);
    };
    static async *queryAll(element, selector) {
        const { name, role } = parseARIASelector(selector);
        const results = await queryAXTree(element.realm.environment.client, element, name, role);
        yield* AsyncIterableUtil.map(results, node => {
            return element.realm.adoptBackendNode(node.backendDOMNodeId);
        });
    }
    static queryOne = async (element, selector) => {
        return ((await AsyncIterableUtil.first(this.queryAll(element, selector))) ?? null);
    };
}
//# sourceMappingURL=AriaQueryHandler.js.map