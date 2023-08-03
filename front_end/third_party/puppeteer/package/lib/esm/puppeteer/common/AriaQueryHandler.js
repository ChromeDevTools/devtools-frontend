/**
 * Copyright 2020 Google Inc. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { assert } from '../util/assert.js';
import { AsyncIterableUtil } from '../util/AsyncIterableUtil.js';
import { QueryHandler } from './QueryHandler.js';
const queryAXTree = async (client, element, accessibleName, role) => {
    const { nodes } = await client.send('Accessibility.queryAXTree', {
        objectId: element.id,
        accessibleName,
        role,
    });
    return nodes.filter((node) => {
        return !node.role || node.role.value !== 'StaticText';
    });
};
const KNOWN_ATTRIBUTES = Object.freeze(['name', 'role']);
const isKnownAttribute = (attribute) => {
    return KNOWN_ATTRIBUTES.includes(attribute);
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
 * - '[role="img"]' queries for elements with role 'img' and any name.
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
        return ariaQuerySelector(node, selector);
    };
    static async *queryAll(element, selector) {
        const context = element.executionContext();
        const { name, role } = parseARIASelector(selector);
        const results = await queryAXTree(context._client, element, name, role);
        const world = context._world;
        yield* AsyncIterableUtil.map(results, node => {
            return world.adoptBackendNode(node.backendDOMNodeId);
        });
    }
    static queryOne = async (element, selector) => {
        return ((await AsyncIterableUtil.first(this.queryAll(element, selector))) ?? null);
    };
}
//# sourceMappingURL=AriaQueryHandler.js.map