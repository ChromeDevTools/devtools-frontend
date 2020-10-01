// Copyright (c) 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ARIAProperties from '../generated/ARIAProperties.js';

/**
 * @typedef {{
 *   name: string,
 *   type: string,
 *   enum: (!Array<string>|undefined),
 * }}
 */
// @ts-ignore typedef
export let AttributeConfig;

/**
 * @typedef {{
 *   name: string,
 * }}
 */
// @ts-ignore typedef
export let RoleConfig;

/**
 * @typedef {{
 *   attributes: !Array<!AttributeConfig>,
 *   roles: !Array<!RoleConfig>
 * }}
 */
// @ts-ignore typedef
export let Config;

/**
 * @unrestricted
 */
export class ARIAMetadata {
  /**
   * @param {?Config} config
   */
  constructor(config) {
    /** @type {!Map<string, !Attribute>} */
    this._attributes = new Map();
    /** @type {!Array<string>} */
    this._roleNames = [];

    if (config) {
      this._initialize(config);
    }
  }

  /**
   * @param {!Config} config
   */
  _initialize(config) {
    const attributes = config['attributes'];

    const booleanEnum = ['true', 'false'];
    for (const attributeConfig of attributes) {
      if (attributeConfig.type === 'boolean') {
        attributeConfig.enum = booleanEnum;
      }
      this._attributes.set(attributeConfig.name, new Attribute(attributeConfig));
    }

    /** @type {!Array<string>} */
    this._roleNames = config['roles'].map(roleConfig => roleConfig.name);
  }

  /**
   * @param {string} property
   * @return {!Array<string>}
   */
  valuesForProperty(property) {
    const attribute = this._attributes.get(property);
    if (attribute) {
      return attribute.getEnum();
    }

    if (property === 'role') {
      return this._roleNames;
    }

    return [];
  }
}

/**
 * @type {!ARIAMetadata | undefined}
 */
let _instance;

/**
 * @return {!ARIAMetadata}
 */
export function ariaMetadata() {
  if (!_instance) {
    _instance = new ARIAMetadata(/** @type {!Config} */ (ARIAProperties.config) || null);
  }
  return _instance;
}

/**
 * @unrestricted
 */
export class Attribute {
  /**
   * @param {!AttributeConfig} config
   */
  constructor(config) {
    /** @type {!Array<string>} */
    this._enum = [];

    if (config.enum) {
      this._enum = config.enum;
    }
  }

  /**
   * @return {!Array<string>}
   */
  getEnum() {
    return this._enum;
  }
}
