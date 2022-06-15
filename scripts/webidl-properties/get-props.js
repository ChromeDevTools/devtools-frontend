// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {APPLICABLE_MEMBERS, GLOBAL_ATTRIBUTES, SPECS} from './config.js';
import {merge} from './util.js';

/**
 * All the members relevant for generating the DOM pinned properties dataset
 * from WebIDL interfaces, mixins and dictionaries.
 */
const ACCEPTED_MEMBER_TYPES = new Set(['attribute', 'field']);

/**
 * Generates the DOM pinned properties dataset.
 *
 * @param {array} specs A list of specs. Each spec specifies its name and
 * all the idl definitions it contains.
 * @returns {object} output An object with WebIDL type names as keys and their
 * WebIDL properties and inheritance/include chains as values.
 */
export function getIDLProps(specs, output = {}) {
  for (const spec of specs) {
    transform(spec, output);
  }
  return output;
}

function transform({name, idls}, output = {}) {
  const makeEntry = () => ({
    inheritance: null,
    includes: [],
    props: {},
  });

  for (const idl of idls) {
    switch (idl.type) {
      case 'interface':
      case 'interface mixin':
      case 'dictionary': {
        output[idl.name] = output[idl.name] ?? makeEntry();
        let props = idl.members?.filter(member => ACCEPTED_MEMBER_TYPES.has(member.type));
        props = props?.map(member => [member.name, {specs: [name]}]);
        merge(output[idl.name], {
          inheritance: idl.inheritance,
          props: Object.fromEntries(props),
        });
        break;
      }
      case 'includes': {
        output[idl.target] = output[idl.target] ?? makeEntry();
        merge(output[idl.target], {
          includes: [idl.includes],
        });
        break;
      }
      case 'callback':
      case 'callback interface':
      case 'enum':
      case 'typedef':
      case 'namespace': {
        break;
      }
      default: {
        console.warn('Skipping unknown WebIDL type', idl.type);
      }
    }
  }
}

/**
 * Adds additional metadata to the DOM pinned properties dataset.
 *
 * Currently:
 * - Adds a field specifying whether a member is a global attribute or not.
 * - Adds information about which properties are "applicable" members for
 * certain "states" their parent WebIDL type can be in, such as for the
 * HTMLInputElement where the set of valid members are determined by the "type"
 * property. See `APPLICABLE_MEMBERS`.
 *
 * @param {*} output
 */
export function addMetadata(output) {
  for (const [key, value] of Object.entries(output)) {
    for (const [name, prop] of Object.entries(value.props)) {
      prop.global = GLOBAL_ATTRIBUTES.has(name);

      const rules = APPLICABLE_MEMBERS[key];
      if (!rules) {
        continue;
      }

      for (const {rule, members} of rules) {
        if (members.has(name.toLowerCase())) {
          merge(prop, {rules: [rule]});
        }
      }

      value.rules = rules.map(({rule}) => rule);
    }
  }
  return output;
}

/**
 * Minimizes the DOM pinned properties dataset to remove the bits of data that
 * don't contain information. For example, empty inheritance/includes chains.
 *
 * This should be done right at the end, before writing into the output file, to
 * allow for certain diagnostics (such as finding "missing types").
 *
 * @param {*} output
 * @returns {object}
 */
export function minimize(output) {
  for (const [key, value] of Object.entries(output)) {
    if (!value.inheritance) {
      // Remove empty inheritance chains.
      delete value.inheritance;
    }
    if (!value.includes.length) {
      // Remove empty include chains.
      delete value.includes;
    }
    const props = Object.entries(value.props);
    if (!props.length) {
      // Remove empty 'prop' lists.
      delete value.props;
    } else {
      for (const [, value] of props) {
        if (!value.global) {
          // Remove the 'global' flag if it's false.
          delete value.global;
        }
        if (value.specs.length === 1 && value.specs[0] === 'html') {
          // Remove the 'specs' list if it's just "html".
          delete value.specs;
        } else {
          // Combine multiple spec names into a single value.
          value.specs = value.specs.reduce((acc, name) => acc | SPECS[name], 0);
        }
      }
    }
    // Remove the entire entry if there's nothing left after the cleanup above.
    if (!Object.entries(value).length) {
      delete output[key];
    }
  }
  return output;
}
